import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/translation_service.dart';

class SettingsProvider with ChangeNotifier {
  String _languageCode = 'en'; // 'en', 'kn', 'hi'
  bool _voiceEnabled = true;
  bool _notificationsEnabled = true;
  String _esp32Ip = '192.168.43.1'; // Default mobile hotspot IP for ESP32

  String get languageCode => _languageCode;
  bool get voiceEnabled => _voiceEnabled;
  bool get notificationsEnabled => _notificationsEnabled;
  String get esp32Ip => _esp32Ip;

  SettingsProvider() {
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _languageCode = prefs.getString('languageCode') ?? 'en';
    _voiceEnabled = prefs.getBool('voiceEnabled') ?? true;
    _notificationsEnabled = prefs.getBool('notificationsEnabled') ?? true;
    _esp32Ip = prefs.getString('esp32Ip') ?? '192.168.43.1';
    notifyListeners();
  }

  Future<void> setLanguage(String code) async {
    _languageCode = code;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('languageCode', code);
    notifyListeners();
  }

  Future<void> setVoiceEnabled(bool value) async {
    _voiceEnabled = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('voiceEnabled', value);
    notifyListeners();
  }

  Future<void> setNotificationsEnabled(bool value) async {
    _notificationsEnabled = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notificationsEnabled', value);
    notifyListeners();
  }

  Future<void> setEsp32Ip(String ip) async {
    _esp32Ip = ip;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('esp32Ip', ip);
    notifyListeners();
  }

  String getText(String key) {
    return TranslationService.translate(key, _languageCode);
  }
}
