import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../providers/settings_provider.dart';

class IrrigationScreen extends StatefulWidget {
  const IrrigationScreen({super.key});

  @override
  State<IrrigationScreen> createState() => _IrrigationScreenState();
}

class _IrrigationScreenState extends State<IrrigationScreen> {
  Map<String, dynamic> _sensorData = {
    "temperature": 0,
    "humidity": 0,
    "soil": 0,
    "ldr": 0,
    "irrigation": "OFF",
    "source": "offline"
  };
  bool _isLoading = true;
  bool _isAutoMode = true;
  bool _isPumpOn = false;
  final TextEditingController _ipController = TextEditingController();
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _fetchSensor();
    _timer = Timer.periodic(const Duration(seconds: 4), (timer) {
      _fetchSensor();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _ipController.dispose();
    super.dispose();
  }

  void _fetchSensor() async {
    final settings = Provider.of<SettingsProvider>(context, listen: false);
    final data = await ApiService.getSensorData(esp32Ip: settings.esp32Ip);
    if (mounted) {
      setState(() {
        _sensorData = data;
        if (_isAutoMode) {
          _isPumpOn = data['irrigation'] == 'ON' || (data['soil'] != null && (data['soil'] as num) < 35 && (data['soil'] as num) > 0);
        }
        _isLoading = false;
      });
    }
  }

  void _togglePump(bool value) async {
    final settings = Provider.of<SettingsProvider>(context, listen: false);
    setState(() {
      _isPumpOn = value;
      _sensorData['irrigation'] = value ? 'ON' : 'OFF';
    });
    await ApiService.togglePump(esp32Ip: settings.esp32Ip, turnOn: value);
  }

  @override
  Widget build(BuildContext context) {
    final settings = Provider.of<SettingsProvider>(context);

    String sourceLabel = 'Offline';
    Color sourceColor = Colors.grey;

    if (_sensorData['source'] == 'esp32_hotspot') {
      sourceLabel = 'ESP32 Hotspot (${settings.esp32Ip})';
      sourceColor = Colors.green.shade800;
    } else if (_sensorData['source'] == 'cloud_backend') {
      sourceLabel = 'Cloud Backend Fallback';
      sourceColor = Colors.orange.shade800;
    }

    return _isLoading
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ESP32 Connection Status & Config Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                CircleAvatar(backgroundColor: sourceColor, radius: 6),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    sourceLabel,
                                    style: TextStyle(color: sourceColor, fontWeight: FontWeight.bold, fontSize: 13),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () {
                              _showIpDialog(settings);
                            },
                            icon: const Icon(Icons.wifi_tethering, size: 18),
                            label: const Text('Edit Hotspot IP', style: TextStyle(fontSize: 12)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                GridView.count(
                  crossAxisCount: MediaQuery.of(context).size.width > 600 ? 4 : 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.3,
                  children: [
                    SensorCard(title: settings.getText('temperature'), value: '${_sensorData['temperature']} °C', icon: Icons.thermostat, color: Colors.red),
                    SensorCard(title: settings.getText('humidity'), value: '${_sensorData['humidity']} %', icon: Icons.water, color: Colors.blue),
                    SensorCard(title: settings.getText('soil_moisture'), value: '${_sensorData['soil']} %', icon: Icons.opacity, color: Colors.green),
                    SensorCard(title: settings.getText('light_ldr'), value: '${_sensorData['ldr']} lx', icon: Icons.wb_sunny, color: Colors.amber),
                  ],
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(20.0),
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
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(settings.getText('auto_mode'), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                Text(
                                  _isAutoMode ? settings.getText('auto_desc') : settings.getText('manual_desc'),
                                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: _isAutoMode,
                            onChanged: (val) => setState(() => _isAutoMode = val),
                            activeTrackColor: Colors.green.shade700,
                          ),
                        ],
                      ),
                      const Divider(height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(settings.getText('water_pump'), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                                const SizedBox(height: 4),
                                Text(
                                  _isPumpOn ? settings.getText('pumping') : settings.getText('idle'),
                                  style: TextStyle(color: _isPumpOn ? Colors.green.shade700 : Colors.grey.shade600, fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: _isPumpOn,
                            onChanged: _isAutoMode ? null : _togglePump,
                            activeTrackColor: Colors.green.shade700,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
  }

  void _showIpDialog(SettingsProvider settings) {
    _ipController.text = settings.esp32Ip;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('ESP32 Hotspot IP Config'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Enter the IP address assigned to ESP32 on your Phone Hotspot (Default: 192.168.43.1):', style: TextStyle(fontSize: 13)),
            const SizedBox(height: 12),
            TextField(
              controller: _ipController,
              decoration: const InputDecoration(
                labelText: 'ESP32 Hotspot IP',
                hintText: '192.168.43.1',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              settings.setEsp32Ip(_ipController.text.trim());
              Navigator.pop(context);
              _fetchSensor();
            },
            child: const Text('Save IP'),
          ),
        ],
      ),
    );
  }
}

class SensorCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const SensorCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(title, style: TextStyle(color: Colors.grey.shade600, fontSize: 11), overflow: TextOverflow.ellipsis),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}
