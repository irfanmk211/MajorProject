import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:flutter_tts/flutter_tts.dart';

class VoiceService {
  static final stt.SpeechToText _speech = stt.SpeechToText();
  static final FlutterTts _tts = FlutterTts();
  static bool _isInitialized = false;

  static Future<void> init() async {
    if (!_isInitialized) {
      await _speech.initialize();
      await _tts.setLanguage("en-US");
      await _tts.setPitch(1.0);
      await _tts.setSpeechRate(0.5);
      _isInitialized = true;
    }
  }

  static Future<void> speak(String text, String langCode) async {
    await init();
    if (langCode == 'kn') {
      await _tts.setLanguage("kn-IN");
    } else if (langCode == 'hi') {
      await _tts.setLanguage("hi-IN");
    } else {
      await _tts.setLanguage("en-US");
    }
    await _tts.speak(text);
  }

  static Future<void> listen({
    required Function(String text) onResult,
    required Function() onListeningComplete,
    required String langCode,
  }) async {
    await init();
    String localeId = "en_US";
    if (langCode == 'kn') localeId = "kn_IN";
    if (langCode == 'hi') localeId = "hi_IN";

    if (_speech.isAvailable) {
      _speech.statusListener = (status) {
        if (status == 'notListening' || status == 'done') {
          onListeningComplete();
        }
      };

      await _speech.listen(
        onResult: (result) {
          onResult(result.recognizedWords);
        },
        listenOptions: stt.SpeechListenOptions(
          localeId: localeId,
          partialResults: true,
          cancelOnError: true,
          listenMode: stt.ListenMode.confirmation,
          listenFor: const Duration(seconds: 8),
          pauseFor: const Duration(seconds: 3),
        ),
      );
    } else {
      onListeningComplete();
    }
  }

  static Future<void> stop() async {
    if (_speech.isListening) {
      await _speech.stop();
    }
    await _tts.stop();
  }
}
