import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../providers/settings_provider.dart';

class WeatherScreen extends StatefulWidget {
  const WeatherScreen({super.key});

  @override
  State<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends State<WeatherScreen> {
  Map<String, dynamic> _weather = {"temperature": 0, "humidity": 0, "city": "Udupi", "description": "", "wind_speed": 0};
  bool _isLoading = true;
  final TextEditingController _cityController = TextEditingController(text: "Udupi");

  @override
  void initState() {
    super.initState();
    _fetchGpsWeather();
  }

  void _fetchGpsWeather() async {
    final pos = await ApiService.getDeviceLocation();
    if (pos != null) {
      _loadWeatherByGps(pos.latitude, pos.longitude);
    } else {
      _loadWeather("Udupi");
    }
  }

  void _loadWeatherByGps(double lat, double lon) async {
    setState(() => _isLoading = true);
    final data = await ApiService.getWeather(lat: lat, lon: lon);
    if (mounted) {
      setState(() {
        _weather = data;
        if (data['city'] != null && data['city'].toString().isNotEmpty) {
          _cityController.text = data['city'].toString();
        }
        _isLoading = false;
      });
    }
  }

  void _loadWeather(String city) async {
    setState(() => _isLoading = true);
    final data = await ApiService.getWeather(city: city);
    if (mounted) {
      setState(() {
        _weather = data;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final settings = Provider.of<SettingsProvider>(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Search City Bar
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _cityController,
                    decoration: const InputDecoration(
                      hintText: 'Search city weather...',
                      prefixIcon: Icon(Icons.search),
                      border: InputBorder.none,
                    ),
                    onSubmitted: (val) {
                      if (val.trim().isNotEmpty) _loadWeather(val.trim());
                    },
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.my_location, color: Colors.green),
                  tooltip: 'Use GPS Location',
                  onPressed: _fetchGpsWeather,
                ),
                ElevatedButton(
                  onPressed: () {
                    if (_cityController.text.trim().isNotEmpty) {
                      _loadWeather(_cityController.text.trim());
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green.shade800,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Search'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          _isLoading
              ? const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Main Weather Display Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [Colors.blue.shade700, Colors.indigo.shade800]),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.blue.withValues(alpha: 0.25),
                            blurRadius: 15,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  _weather['city']?.toString().isNotEmpty == true ? _weather['city'] : 'Weather Forecast',
                                  style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const Icon(Icons.wb_sunny, color: Colors.amber, size: 44),
                            ],
                          ),
                          if (_weather['description']?.toString().isNotEmpty == true) ...[
                            const SizedBox(height: 4),
                            Text(
                              _weather['description'].toString().toUpperCase(),
                              style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ],
                          const SizedBox(height: 16),
                          Text(
                            '${_weather['temperature']} °C',
                            style: const TextStyle(fontSize: 44, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 14),
                          Wrap(
                            spacing: 16,
                            runSpacing: 8,
                            children: [
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.water_drop, color: Colors.blue.shade200, size: 18),
                                  const SizedBox(width: 4),
                                  Text('${settings.getText('humidity')}: ${_weather['humidity']}%', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                                ],
                              ),
                              if (_weather['wind_speed'] != null)
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.air, color: Colors.blue.shade200, size: 18),
                                    const SizedBox(width: 4),
                                    Text('Wind: ${_weather['wind_speed']} km/h', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                                  ],
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
          const SizedBox(height: 100),
        ],
      ),
    );
  }
}
