import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../providers/history_provider.dart';
import '../providers/settings_provider.dart';

class DiseaseScreen extends StatefulWidget {
  const DiseaseScreen({super.key});

  @override
  State<DiseaseScreen> createState() => _DiseaseScreenState();
}

class _DiseaseScreenState extends State<DiseaseScreen> {
  File? _imageFile;
  Uint8List? _imageBytes;
  String? _fileName;
  bool _isLoading = false;
  Map<String, dynamic>? _result;
  String? _errorMessage;

  final ImagePicker _picker = ImagePicker();

  Future<void> _pickImage(ImageSource source) async {
    final XFile? pickedFile = await _picker.pickImage(source: source, imageQuality: 85);
    if (pickedFile != null) {
      if (kIsWeb) {
        final bytes = await pickedFile.readAsBytes();
        setState(() {
          _imageBytes = bytes;
          _fileName = pickedFile.name;
          _imageFile = null;
          _result = null;
          _errorMessage = null;
        });
      } else {
        setState(() {
          _imageFile = File(pickedFile.path);
          _imageBytes = null;
          _fileName = pickedFile.name;
          _result = null;
          _errorMessage = null;
        });
      }
    }
  }

  void _analyzeImage() async {
    if (_imageFile == null && _imageBytes == null) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _result = null;
    });

    try {
      final res = await ApiService.predictDisease(
        imageFile: _imageFile,
        imageBytes: _imageBytes,
        fileName: _fileName,
      );
      setState(() {
        _result = res;
      });

      if (res['success'] == true && mounted) {
        final history = Provider.of<HistoryProvider>(context, listen: false);
        final label = res['label'] ?? 'Unknown';
        final confidence = (res['confidence'] as num).toDouble();
        final treatment = (res['disease_info'] != null && (res['disease_info'] as Map).isNotEmpty)
            ? res['disease_info']['description'] ?? 'No treatment info'
            : 'No treatment info';
        history.addDiseaseRecord(label, confidence, treatment);
      }
    } catch (e) {
      String cleanErr = e.toString();
      if (cleanErr.startsWith('Exception: ')) {
        cleanErr = cleanErr.replaceFirst('Exception: ', '');
      }
      if (cleanErr.startsWith('Disease prediction error: ')) {
        cleanErr = cleanErr.replaceFirst('Disease prediction error: ', '');
      }
      if (cleanErr.startsWith('Exception: ')) {
        cleanErr = cleanErr.replaceFirst('Exception: ', '');
      }
      setState(() {
        _errorMessage = cleanErr;
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = Provider.of<SettingsProvider>(context);
    final isWide = MediaQuery.of(context).size.width >= 900;

    Widget uploadCard = Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            settings.getText('upload_prompt'),
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          Container(
            height: 260,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.green.shade200, width: 2),
            ),
            child: _imageBytes != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: Image.memory(_imageBytes!, fit: BoxFit.cover),
                  )
                : _imageFile != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: Image.file(_imageFile!, fit: BoxFit.cover),
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_a_photo_rounded, size: 64, color: Colors.green.shade400),
                          const SizedBox(height: 12),
                          Text(settings.getText('no_image'), style: TextStyle(color: Colors.grey.shade600, fontSize: 15)),
                        ],
                      ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _pickImage(ImageSource.gallery),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal.shade600,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: const Icon(Icons.photo_library),
                  label: Text(settings.getText('gallery'), style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              if (!kIsWeb) ...[
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _pickImage(ImageSource.camera),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green.shade600,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: const Icon(Icons.camera_alt),
                    label: Text(settings.getText('camera'), style: const TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 20),
          if (_imageFile != null || _imageBytes != null)
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _analyzeImage,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green.shade800,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                icon: _isLoading
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Icon(Icons.search),
                label: Text(_isLoading ? settings.getText('voice_listening') : settings.getText('analyze_leaf'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
        ],
      ),
    );

    Widget resultsCard = Column(
      children: [
        if (_errorMessage != null)
          Container(
            padding: const EdgeInsets.all(14),
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(12)),
            child: Text(_errorMessage!, style: const TextStyle(color: Colors.red)),
          ),
        if (_result != null)
          Container(
            padding: const EdgeInsets.all(24.0),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 15,
                  offset: const Offset(0, 5),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(settings.getText('detection_result'), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const Divider(height: 24),
                Text(settings.getText('disease_condition'), style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                const SizedBox(height: 4),
                Text(
                  _result!['label'] ?? 'Unknown',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.green.shade800),
                ),
                const SizedBox(height: 14),
                Text(settings.getText('confidence'), style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                const SizedBox(height: 4),
                Text(
                  '${_result!['confidence']}%',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                if (_result!['disease_info'] != null && (_result!['disease_info'] as Map).isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text(settings.getText('treatment'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 8),
                  Text(_result!['disease_info']['description'] ?? 'No description available.', style: TextStyle(color: Colors.grey.shade800, height: 1.4)),
                ],
              ],
            ),
          )
        else if (isWide)
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.blue.shade200),
            ),
            child: Column(
              children: [
                Icon(Icons.bug_report, size: 64, color: Colors.blue.shade700),
                const SizedBox(height: 16),
                const Text('AI Leaf Diagnosis Ready', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(
                  'Upload or select a plant leaf image on the left and click "Analyze Plant Leaf" to run deep learning classification.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 14),
                ),
              ],
            ),
          ),
      ],
    );

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        children: [
          if (isWide)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 5, child: uploadCard),
                const SizedBox(width: 24),
                Expanded(flex: 5, child: resultsCard),
              ],
            )
          else ...[
            uploadCard,
            const SizedBox(height: 24),
            resultsCard,
          ],
          const SizedBox(height: 100),
        ],
      ),
    );
  }
}
