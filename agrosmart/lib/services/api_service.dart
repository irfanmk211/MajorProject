import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:geolocator/geolocator.dart';

class ApiService {
  static const String baseUrl = "https://agrosmart-of05.onrender.com";

  // 1. Crop Recommendation
  static Future<List<dynamic>> predictCrop(List<double> features) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/predict-crop'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({"input": features}),
      ).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        try {
          final errJson = jsonDecode(response.body);
          throw Exception(errJson['error'] ?? 'Crop recommendation failed');
        } catch (_) {
          throw Exception('Crop recommendation server error');
        }
      }
    } catch (e) {
      throw Exception(e.toString().replaceAll('Exception: ', ''));
    }
  }

  // 2. Plant Disease Prediction (Safe Error Message Extraction)
  static Future<Map<String, dynamic>> predictDisease({
    File? imageFile,
    Uint8List? imageBytes,
    String? fileName,
  }) async {
    try {
      var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/predict-disease'));

      if (kIsWeb && imageBytes != null) {
        request.files.add(http.MultipartFile.fromBytes(
          'image',
          imageBytes,
          filename: fileName ?? 'upload.jpg',
          contentType: MediaType('image', 'jpeg'),
        ));
      } else if (imageFile != null) {
        request.files.add(await http.MultipartFile.fromPath(
          'image',
          imageFile.path,
          contentType: MediaType('image', 'jpeg'),
        ));
      } else {
        throw Exception('No image provided for prediction');
      }

      var streamedResponse = await request.send().timeout(const Duration(seconds: 25));
      var response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded['success'] == false) {
          throw Exception(decoded['error'] ?? 'Disease detection rejected');
        }
        return decoded;
      } else {
        try {
          final errJson = jsonDecode(response.body);
          if (errJson is Map && errJson.containsKey('error')) {
            throw Exception(errJson['error']);
          }
        } catch (_) {}
        throw Exception('Failed to detect disease (Server returned status ${response.statusCode})');
      }
    } catch (e) {
      String msg = e.toString().replaceAll('Exception: ', '');
      if (msg.contains('<!DOCTYPE html>') || msg.contains('502')) {
        msg = 'Server is busy processing image or waking up. Please try again in a moment.';
      }
      throw Exception(msg);
    }
  }

  // 3. Get Device GPS Coordinates
  static Future<Position?> getDeviceLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return null;

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) return null;
      }
      if (permission == LocationPermission.deniedForever) return null;

      return await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.medium);
    } catch (_) {
      return null;
    }
  }

  // 4. Fetch Telemetry
  static Future<Map<String, dynamic>> getSensorData({String? esp32Ip}) async {
    if (esp32Ip != null && esp32Ip.trim().isNotEmpty) {
      try {
        final localUri = Uri.parse('http://$esp32Ip/api/data');
        final response = await http.get(localUri).timeout(const Duration(seconds: 2));
        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          data['source'] = 'esp32_hotspot';
          return data;
        }
      } catch (_) {}
    }

    try {
      final response = await http.get(Uri.parse('$baseUrl/get_sensor')).timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        data['source'] = 'cloud_backend';
        return data;
      }
    } catch (_) {}

    return {
      "temperature": 0,
      "humidity": 0,
      "soil": 0,
      "ldr": 0,
      "irrigation": "OFF",
      "source": "offline"
    };
  }

  // 5. Toggle Pump
  static Future<void> togglePump({required String esp32Ip, required bool turnOn}) async {
    final stateVal = turnOn ? 1 : 0;
    
    if (esp32Ip.trim().isNotEmpty) {
      try {
        final uri = Uri.parse('http://$esp32Ip/api/pump?state=$stateVal');
        await http.get(uri).timeout(const Duration(seconds: 2));
      } catch (_) {}
    }

    try {
      await http.post(
        Uri.parse('$baseUrl/predict'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          "soil_moisture": 0,
          "temperature": 0,
          "humidity": 0,
          "pump_override": stateVal,
        }),
      );
    } catch (_) {}
  }

  // 6. Irrigation Prediction
  static Future<Map<String, dynamic>> predictIrrigation({
    required double soilMoisture,
    required double temperature,
    required double humidity,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/predict'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          "soil_moisture": soilMoisture,
          "temperature": temperature,
          "humidity": humidity,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to predict irrigation');
      }
    } catch (e) {
      throw Exception('Irrigation prediction error: $e');
    }
  }

  // 7. Weather Data from Backend Server (Handles GPS or City Name)
  static Future<Map<String, dynamic>> getWeather({String city = "Udupi", double? lat, double? lon}) async {
    try {
      String url = "$baseUrl/weather?city=${Uri.encodeComponent(city)}";
      if (lat != null && lon != null) {
        url = "$baseUrl/weather?lat=$lat&lon=$lon";
      }
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}

    return {"temperature": 0, "humidity": 0, "city": city, "description": "", "wind": 0};
  }
}
