import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

class ApiService {
  static const String baseUrl = "https://agrosmart-of05.onrender.com";
  static const String openWeatherApiKey = String.fromEnvironment('OPENWEATHER_API_KEY', defaultValue: '');


  // 1. Crop Recommendation
  static Future<List<dynamic>> predictCrop(List<double> features) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/predict-crop'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({"input": features}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to get crop recommendation: ${response.body}');
      }
    } catch (e) {
      throw Exception('Crop recommendation error: $e');
    }
  }

  // 2. Plant Disease Prediction
  static Future<Map<String, dynamic>> predictDisease({
    File? imageFile,
    Uint8List? imageBytes,
    String? fileName,
  }) async {
    int maxRetries = 2;
    for (int attempt = 0; attempt <= maxRetries; attempt++) {
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
          final data = jsonDecode(response.body);
          return data;
        } else if (response.statusCode == 502 || response.statusCode == 503) {
          if (attempt < maxRetries) {
            await Future.delayed(const Duration(seconds: 3));
            continue;
          }
          throw Exception('Cloud server is waking up from sleep. Please tap Analyze again in a few seconds.');
        } else {
          try {
            final errData = jsonDecode(response.body);
            if (errData is Map && errData.containsKey('error')) {
              throw Exception(errData['error']);
            }
          } catch (jsonErr) {
            if (jsonErr is Exception && jsonErr.toString().contains('Human') || jsonErr.toString().contains('leaf')) {
              rethrow;
            }
          }
          throw Exception('Unable to analyze image. Please ensure a clear photo of a plant leaf is uploaded.');
        }
      } catch (e) {
        if (attempt == maxRetries || e.toString().contains('No image provided') || e.toString().contains('Human') || e.toString().contains('leaf') || e.toString().contains('Cloud server')) {
          String msg = e.toString();
          if (msg.startsWith('Exception: ')) {
            msg = msg.replaceFirst('Exception: ', '');
          }
          throw Exception(msg);
        }
        await Future.delayed(const Duration(seconds: 2));
      }
    }
    throw Exception('Cloud server is currently busy. Please try again in a moment.');
  }

  // 3. Fetch Telemetry: Tries Local ESP32 Hotspot IP first, falls back to Flask Cloud Backend
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
      } catch (_) {
        // Hotspot connection failed, fall through to cloud backend
      }
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

  // 4. Toggle Pump (Local ESP32 Hotspot or Cloud Backend)
  static Future<void> togglePump({required String esp32Ip, required bool turnOn}) async {
    final stateVal = turnOn ? 1 : 0;
    
    // Try local ESP32 Hotspot first
    if (esp32Ip.trim().isNotEmpty) {
      try {
        final uri = Uri.parse('http://$esp32Ip/api/pump?state=$stateVal');
        await http.get(uri).timeout(const Duration(seconds: 2));
      } catch (_) {}
    }

    // Sync state with cloud backend
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

  // 5. Irrigation Prediction
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

  // 6. Real Live OpenWeatherMap Data with User API Key
  static Future<Map<String, dynamic>> getWeather({String city = "Udupi"}) async {
    try {
      final url = "https://api.openweathermap.org/data/2.5/weather?q=$city&appid=$openWeatherApiKey&units=metric";
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final main = data['main'] ?? {};
        final weatherArr = (data['weather'] as List?) ?? [];
        final desc = weatherArr.isNotEmpty ? weatherArr[0]['description'] ?? '' : '';
        return {
          "temperature": (main['temp'] as num?)?.round() ?? 0,
          "humidity": main['humidity'] ?? 0,
          "city": data['name'] ?? city,
          "description": desc,
          "wind": (data['wind']?['speed'] as num?)?.round() ?? 0,
        };
      }
    } catch (_) {}

    // Fallback to cloud backend weather endpoint
    try {
      final response = await http.get(Uri.parse('$baseUrl/weather')).timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}

    return {"temperature": 0, "humidity": 0, "city": city, "description": "", "wind": 0};
  }

  // 7. Live 5-Day Weather Forecast via OpenWeatherMap API
  static Future<List<Map<String, dynamic>>> getWeatherForecast({String city = "Udupi"}) async {
    try {
      final url = "https://api.openweathermap.org/data/2.5/forecast?q=$city&appid=$openWeatherApiKey&units=metric";
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final list = (data['list'] as List?) ?? [];
        final List<Map<String, dynamic>> forecast = [];
        
        // Pick one forecast per day at 12:00:00
        for (var item in list) {
          final txt = item['dt_txt']?.toString() ?? '';
          if (txt.contains("12:00:00")) {
            final main = item['main'] ?? {};
            final weatherArr = (item['weather'] as List?) ?? [];
            final desc = weatherArr.isNotEmpty ? weatherArr[0]['main'] ?? '' : '';
            final dt = item['dt_txt']?.toString().split(' ')[0] ?? '';
            forecast.add({
              'day': dt,
              'temp': '${(main['temp'] as num?)?.round() ?? 0}°C',
              'humidity': '${main['humidity'] ?? 0}%',
              'desc': desc,
            });
          }
        }
        return forecast;
      }
    } catch (_) {}
    return [];
  }
}
