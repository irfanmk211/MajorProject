import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HistoryProvider with ChangeNotifier {
  List<Map<String, dynamic>> _cropHistory = [];
  List<Map<String, dynamic>> _diseaseHistory = [];
  List<Map<String, dynamic>> _alerts = [];

  List<Map<String, dynamic>> get cropHistory => _cropHistory;
  List<Map<String, dynamic>> get diseaseHistory => _diseaseHistory;
  List<Map<String, dynamic>> get alerts => _alerts;

  HistoryProvider() {
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final cropStr = prefs.getString('cropHistory');
    if (cropStr != null) {
      _cropHistory = List<Map<String, dynamic>>.from(jsonDecode(cropStr));
    }
    final diseaseStr = prefs.getString('diseaseHistory');
    if (diseaseStr != null) {
      _diseaseHistory = List<Map<String, dynamic>>.from(jsonDecode(diseaseStr));
    }
    final alertsStr = prefs.getString('alertsHistory');
    if (alertsStr != null) {
      _alerts = List<Map<String, dynamic>>.from(jsonDecode(alertsStr));
    } else {
      _alerts = []; // No fake default alerts
    }
    notifyListeners();
  }

  Future<void> addCropRecord(String cropName, double confidence) async {
    _cropHistory.insert(0, {
      'crop': cropName,
      'confidence': confidence,
      'date': DateTime.now().toString().split('.')[0],
    });
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('cropHistory', jsonEncode(_cropHistory));
    notifyListeners();
  }

  Future<void> addDiseaseRecord(String diseaseLabel, double confidence, String treatment) async {
    _diseaseHistory.insert(0, {
      'disease': diseaseLabel,
      'confidence': confidence,
      'treatment': treatment,
      'date': DateTime.now().toString().split('.')[0],
    });
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('diseaseHistory', jsonEncode(_diseaseHistory));
    notifyListeners();
  }

  Future<void> addAlert(String title, String body, String type) async {
    _alerts.insert(0, {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'title': title,
      'body': body,
      'type': type,
      'time': 'Just now',
    });
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('alertsHistory', jsonEncode(_alerts));
    notifyListeners();
  }

  Future<void> clearHistory() async {
    _cropHistory.clear();
    _diseaseHistory.clear();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('cropHistory');
    await prefs.remove('diseaseHistory');
    notifyListeners();
  }
}
