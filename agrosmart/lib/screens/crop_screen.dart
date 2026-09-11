import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/translation_service.dart';
import '../providers/history_provider.dart';
import '../providers/settings_provider.dart';

class CropScreen extends StatefulWidget {
  const CropScreen({super.key});

  @override
  State<CropScreen> createState() => _CropScreenState();
}

class _CropScreenState extends State<CropScreen> {
  final _formKey = GlobalKey<FormState>();

  final TextEditingController _nController = TextEditingController(text: '90');
  final TextEditingController _pController = TextEditingController(text: '42');
  final TextEditingController _kController = TextEditingController(text: '43');
  final TextEditingController _tempController = TextEditingController(text: '20.8');
  final TextEditingController _humidityController = TextEditingController(text: '82.0');
  final TextEditingController _phController = TextEditingController(text: '6.5');
  final TextEditingController _rainfallController = TextEditingController(text: '202.9');

  double _nValue = 90;
  double _pValue = 42;
  double _kValue = 43;
  double _tempValue = 20.8;
  double _humidityValue = 82.0;
  double _phValue = 6.5;
  double _rainfallValue = 202.9;

  bool _isLoading = false;
  List<dynamic> _recommendations = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _syncTextToSliders();
  }

  void _syncTextToSliders() {
    _nController.addListener(() {
      final val = double.tryParse(_nController.text);
      if (val != null && val >= 0 && val <= 140) setState(() => _nValue = val);
    });
    _pController.addListener(() {
      final val = double.tryParse(_pController.text);
      if (val != null && val >= 0 && val <= 145) setState(() => _pValue = val);
    });
    _kController.addListener(() {
      final val = double.tryParse(_kController.text);
      if (val != null && val >= 0 && val <= 205) setState(() => _kValue = val);
    });
    _tempController.addListener(() {
      final val = double.tryParse(_tempController.text);
      if (val != null && val >= 0 && val <= 50) setState(() => _tempValue = val);
    });
    _humidityController.addListener(() {
      final val = double.tryParse(_humidityController.text);
      if (val != null && val >= 0 && val <= 100) setState(() => _humidityValue = val);
    });
    _phController.addListener(() {
      final val = double.tryParse(_phController.text);
      if (val != null && val >= 0 && val <= 14) setState(() => _phValue = val);
    });
    _rainfallController.addListener(() {
      final val = double.tryParse(_rainfallController.text);
      if (val != null && val >= 0 && val <= 300) setState(() => _rainfallValue = val);
    });
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _recommendations = [];
    });

    try {
      final features = [
        double.parse(_nController.text),
        double.parse(_pController.text),
        double.parse(_kController.text),
        double.parse(_tempController.text),
        double.parse(_humidityController.text),
        double.parse(_phController.text),
        double.parse(_rainfallController.text),
      ];

      final results = await ApiService.predictCrop(features);
      setState(() {
        _recommendations = results;
      });

      if (results.isNotEmpty && mounted) {
        final top = results.first;
        final history = Provider.of<HistoryProvider>(context, listen: false);
        history.addCropRecord(top['crop'] ?? 'Unknown', (top['prob'] as num).toDouble());
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
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

    Widget formCard = Container(
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
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              settings.getText('enter_params'),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            _buildParamSliderField(
              label: settings.getText('lbl_n'),
              controller: _nController,
              value: _nValue,
              min: 0,
              max: 140,
              color: Colors.green.shade700,
              onChanged: (val) {
                setState(() {
                  _nValue = val;
                  _nController.text = val.round().toString();
                });
              },
            ),
            _buildParamSliderField(
              label: settings.getText('lbl_p'),
              controller: _pController,
              value: _pValue,
              min: 0,
              max: 145,
              color: Colors.teal.shade700,
              onChanged: (val) {
                setState(() {
                  _pValue = val;
                  _pController.text = val.round().toString();
                });
              },
            ),
            _buildParamSliderField(
              label: settings.getText('lbl_k'),
              controller: _kController,
              value: _kValue,
              min: 0,
              max: 205,
              color: Colors.green.shade800,
              onChanged: (val) {
                setState(() {
                  _kValue = val;
                  _kController.text = val.round().toString();
                });
              },
            ),
            _buildParamSliderField(
              label: settings.getText('lbl_temp'),
              controller: _tempController,
              value: _tempValue,
              min: 0,
              max: 50,
              color: Colors.orange.shade700,
              isDecimal: true,
              onChanged: (val) {
                setState(() {
                  _tempValue = val;
                  _tempController.text = val.toStringAsFixed(1);
                });
              },
            ),
            _buildParamSliderField(
              label: settings.getText('lbl_humidity'),
              controller: _humidityController,
              value: _humidityValue,
              min: 0,
              max: 100,
              color: Colors.blue.shade700,
              isDecimal: true,
              onChanged: (val) {
                setState(() {
                  _humidityValue = val;
                  _humidityController.text = val.toStringAsFixed(1);
                });
              },
            ),
            _buildParamSliderField(
              label: settings.getText('lbl_ph'),
              controller: _phController,
              value: _phValue,
              min: 0,
              max: 14,
              color: Colors.purple.shade700,
              isDecimal: true,
              onChanged: (val) {
                setState(() {
                  _phValue = val;
                  _phController.text = val.toStringAsFixed(1);
                });
              },
            ),
            _buildParamSliderField(
              label: settings.getText('lbl_rainfall'),
              controller: _rainfallController,
              value: _rainfallValue,
              min: 0,
              max: 300,
              color: Colors.indigo.shade700,
              isDecimal: true,
              onChanged: (val) {
                setState(() {
                  _rainfallValue = val;
                  _rainfallController.text = val.toStringAsFixed(1);
                });
              },
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _submit,
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
                label: Text(_isLoading ? settings.getText('voice_listening') : settings.getText('recommend_crop'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );

    Widget resultsCard = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_errorMessage != null)
          Container(
            padding: const EdgeInsets.all(14),
            margin: const EdgeInsets.only(bottom: 20),
            decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(12)),
            child: Text(_errorMessage!, style: const TextStyle(color: Colors.red)),
          ),
        if (_recommendations.isNotEmpty) ...[
          const Text('Top Recommendations', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _recommendations.length,
            itemBuilder: (context, index) {
              final item = _recommendations[index];
              final rawCropName = item['crop'] ?? '';
              final translatedCrop = TranslationService.translateCrop(rawCropName, settings.languageCode);
              final prob = item['prob'] ?? 0.0;
              return Card(
                elevation: 3,
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: Colors.green.shade100,
                        child: Text('${index + 1}', style: TextStyle(color: Colors.green.shade800, fontWeight: FontWeight.bold, fontSize: 16)),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(translatedCrop, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: LinearProgressIndicator(
                                value: (prob as num) / 100,
                                backgroundColor: Colors.grey.shade200,
                                color: Colors.green.shade700,
                                minHeight: 8,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Text('$prob%', style: TextStyle(color: Colors.green.shade800, fontWeight: FontWeight.bold, fontSize: 18)),
                    ],
                  ),
                ),
              );
            },
          ),
        ] else if (isWide)
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.green.shade200),
            ),
            child: Column(
              children: [
                Icon(Icons.grass, size: 64, color: Colors.green.shade700),
                const SizedBox(height: 16),
                const Text('AI Crop Advisor Ready', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text(
                  'Adjust the soil and weather parameters on the left and click "Recommend Best Crop" to see instant ML predictions.',
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
                Expanded(flex: 5, child: formCard),
                const SizedBox(width: 24),
                Expanded(flex: 5, child: resultsCard),
              ],
            )
          else ...[
            formCard,
            const SizedBox(height: 24),
            resultsCard,
          ],
          const SizedBox(height: 100),
        ],
      ),
    );
  }

  Widget _buildParamSliderField({
    required String label,
    required TextEditingController controller,
    required double value,
    required double min,
    required double max,
    required Color color,
    required ValueChanged<double> onChanged,
    bool isDecimal = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 18.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.black87),
              ),
              SizedBox(
                width: 80,
                height: 38,
                child: TextFormField(
                  controller: controller,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  validator: (val) {
                    if (val == null || val.isEmpty || double.tryParse(val) == null) {
                      return '!';
                    }
                    return null;
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: SliderTheme(
                  data: SliderThemeData(
                    activeTrackColor: color,
                    inactiveTrackColor: color.withValues(alpha: 0.15),
                    thumbColor: color,
                    trackHeight: 6,
                  ),
                  child: Slider(
                    value: value.clamp(min, max),
                    min: min,
                    max: max,
                    onChanged: onChanged,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
