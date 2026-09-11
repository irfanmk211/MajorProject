import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../providers/settings_provider.dart';
import '../services/voice_service.dart';
import '../services/translation_service.dart';
import 'crop_screen.dart';
import 'disease_screen.dart';
import 'irrigation_screen.dart';
import 'weather_screen.dart';
import 'history_screen.dart';
import 'profile_screen.dart';
import 'alerts_screen.dart';
import 'login_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  int _currentIndex = 0;
  bool _isListening = false;
  String _spokenText = '';

  final List<Widget> _screens = [
    const DashboardTab(),
    const CropScreen(),
    const DiseaseScreen(),
    const IrrigationScreen(),
    const WeatherScreen(),
    const HistoryScreen(),
    const ProfileScreen(),
  ];

  void _navigateToTab(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  void _triggerVoiceAssistant(SettingsProvider settings) async {
    if (!settings.voiceEnabled) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Voice Assistant disabled in settings.')),
      );
      return;
    }

    if (!kIsWeb) {
      final status = await Permission.microphone.request();
      if (!status.isGranted) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Microphone permission is required for Voice Assistant.')),
          );
        }
        return;
      }
    }

    if (_isListening) {
      setState(() {
        _isListening = false;
        _spokenText = '';
      });
      VoiceService.stop();
      return;
    }

    setState(() {
      _isListening = true;
      _spokenText = settings.getText('voice_listening');
    });

    VoiceService.listen(
      langCode: settings.languageCode,
      onListeningComplete: () {
        if (mounted && _isListening) {
          setState(() {
            _isListening = false;
          });
        }
      },
      onResult: (text) {
        if (!mounted) return;
        setState(() {
          _spokenText = text;
        });

        final lower = text.toLowerCase();
        int? targetTab;
        String? responseKey;

        if (lower.contains('crop') || lower.contains('ಬೆಳೆ') || lower.contains('फसल')) {
          targetTab = 1;
          responseKey = 'nav_crops';
        } else if (lower.contains('disease') || lower.contains('ರೋಗ') || lower.contains('बीमारी') || lower.contains('पहचान')) {
          targetTab = 2;
          responseKey = 'nav_disease';
        } else if (lower.contains('irrigation') || lower.contains('ನೀರಾವರಿ') || lower.contains('सिंचाई') || lower.contains('पानी')) {
          targetTab = 3;
          responseKey = 'nav_irrigation';
        } else if (lower.contains('weather') || lower.contains('ಹವಾಮಾನ') || lower.contains('मौसम')) {
          targetTab = 4;
          responseKey = 'nav_weather';
        } else if (lower.contains('history') || lower.contains('ಇತಿಹಾಸ') || lower.contains('इतिहास')) {
          targetTab = 5;
          responseKey = 'nav_history';
        } else if (lower.contains('profile') || lower.contains('ಪ್ರೊಫೈಲ್') || lower.contains('प्रोफाइल')) {
          targetTab = 6;
          responseKey = 'nav_profile';
        }

        if (targetTab != null && responseKey != null) {
          setState(() {
            _currentIndex = targetTab!;
            _isListening = false;
          });
          VoiceService.stop();
          final speechMsg = TranslationService.translate(responseKey, settings.languageCode);
          VoiceService.speak(speechMsg, settings.languageCode);
        }
      },
    );
  }

  String _getPageTitle(SettingsProvider settings) {
    switch (_currentIndex) {
      case 1:
        return 'Crop Recommendation';
      case 2:
        return 'Disease Detection';
      case 3:
        return 'Smart Irrigation & Soil';
      case 4:
        return 'Weather Forecast';
      case 5:
        return 'History Log';
      case 6:
        return 'Profile & Settings';
      default:
        return 'Dashboard Overview';
    }
  }

  Widget _buildWebSidebarItem(int index, IconData icon, String label) {
    final isSelected = _currentIndex == index;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 3),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0x3310B981) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        border: isSelected
            ? const Border(left: BorderSide(color: Color(0xFF10B981), width: 4))
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: ListTile(
          dense: true,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
          leading: Icon(
            icon,
            color: isSelected ? const Color(0xFF10B981) : const TextStyle(color: Color(0xFF94A3B8)).color,
            size: 20,
          ),
          title: Text(
            label,
            style: TextStyle(
              color: isSelected ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              fontSize: 14,
            ),
          ),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          onTap: () => setState(() => _currentIndex = index),
        ),
      ),
    );
  }

  Widget _buildNavTab(int index, IconData icon, String label) {
    final isSelected = _currentIndex == index;
    final color = isSelected ? Colors.green.shade800 : Colors.grey.shade600;

    return InkWell(
      onTap: () => setState(() => _currentIndex = index),
      borderRadius: BorderRadius.circular(12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: isSelected ? 26 : 22),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final settings = Provider.of<SettingsProvider>(context);
    final isWide = MediaQuery.of(context).size.width >= 900;

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: isWide ? const Color(0xFFF8FAFC) : null,
      extendBody: true,
      appBar: isWide
          ? null // Web Layout has modern clean top header inside body
          : AppBar(
              leading: IconButton(
                icon: const Icon(Icons.menu),
                tooltip: 'Workspace Menu',
                onPressed: () {
                  _scaffoldKey.currentState?.openDrawer();
                },
              ),
              title: Text(_getPageTitle(settings), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
              backgroundColor: Colors.green.shade800,
              foregroundColor: Colors.white,
              elevation: 0,
              actions: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: settings.languageCode,
                      dropdownColor: Colors.green.shade800,
                      icon: const Icon(Icons.language, color: Colors.white, size: 20),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                      items: const [
                        DropdownMenuItem(value: 'en', child: Text('English')),
                        DropdownMenuItem(value: 'kn', child: Text('ಕನ್ನಡ')),
                        DropdownMenuItem(value: 'hi', child: Text('हिंदी')),
                      ],
                      onChanged: (code) {
                        if (code != null) settings.setLanguage(code);
                      },
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.history_rounded),
                  tooltip: settings.getText('history'),
                  onPressed: () {
                    setState(() => _currentIndex = 5);
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.notifications_active_outlined),
                  tooltip: settings.getText('alerts'),
                  onPressed: () {
                    Navigator.push(context, MaterialPageRoute(builder: (context) => const AlertsScreen()));
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.person_outline),
                  tooltip: settings.getText('profile'),
                  onPressed: () {
                    setState(() => _currentIndex = 6);
                  },
                ),
                const SizedBox(width: 8),
              ],
            ),
      drawer: !isWide
          ? Drawer(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  DrawerHeader(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [Colors.green.shade800, Colors.teal.shade800]),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: const BoxDecoration(color: Colors.white24, shape: BoxShape.circle),
                              child: const Icon(Icons.eco, color: Colors.white, size: 30),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  settings.getText('app_title'),
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                                ),
                                const Text(
                                  'AgroSmart Workspace',
                                  style: TextStyle(color: Colors.white70, fontSize: 12),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8.0),
                    child: Column(
                      children: [
                        ListTile(
                          leading: const Icon(Icons.dashboard_rounded),
                          title: Text(settings.getText('dashboard')),
                          onTap: () {
                            Navigator.pop(context);
                            setState(() => _currentIndex = 0);
                          },
                        ),
                        ListTile(
                          leading: const Icon(Icons.grass_rounded),
                          title: Text(settings.getText('crops')),
                          onTap: () {
                            Navigator.pop(context);
                            setState(() => _currentIndex = 1);
                          },
                        ),
                        ListTile(
                          leading: const Icon(Icons.bug_report_rounded),
                          title: Text(settings.getText('disease')),
                          onTap: () {
                            Navigator.pop(context);
                            setState(() => _currentIndex = 2);
                          },
                        ),
                        ListTile(
                          leading: const Icon(Icons.water_drop_rounded),
                          title: Text(settings.getText('irrigation')),
                          onTap: () {
                            Navigator.pop(context);
                            setState(() => _currentIndex = 3);
                          },
                        ),
                        ListTile(
                          leading: const Icon(Icons.wb_sunny_rounded),
                          title: Text(settings.getText('weather')),
                          onTap: () {
                            Navigator.pop(context);
                            setState(() => _currentIndex = 4);
                          },
                        ),
                        ListTile(
                          leading: const Icon(Icons.history_rounded),
                          title: Text(settings.getText('history')),
                          onTap: () {
                            Navigator.pop(context);
                            setState(() => _currentIndex = 5);
                          },
                        ),
                        ListTile(
                          leading: const Icon(Icons.person_rounded),
                          title: Text(settings.getText('profile')),
                          onTap: () {
                            Navigator.pop(context);
                            setState(() => _currentIndex = 6);
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            )
          : null,
      body: Provider.value(
        value: this,
        child: Row(
          children: [
            // High-End Web Navy Sidebar (#0F172A)
            if (isWide)
              Container(
                width: 260,
                color: const Color(0xFF0F172A),
                child: Column(
                  children: [
                    const SizedBox(height: 28),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.eco, color: Colors.white, size: 24),
                          ),
                          const SizedBox(width: 12),
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'AgroSmart',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                              ),
                              Text(
                                'AI Farming Platform',
                                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    Expanded(
                      child: ListView(
                        children: [
                          _buildWebSidebarItem(0, Icons.dashboard_rounded, 'Home'),
                          _buildWebSidebarItem(1, Icons.grass_rounded, 'Crop Recommendation'),
                          _buildWebSidebarItem(2, Icons.bug_report_rounded, 'Disease Detection'),
                          _buildWebSidebarItem(3, Icons.water_drop_rounded, 'Smart Irrigation'),
                          _buildWebSidebarItem(4, Icons.wb_sunny_rounded, 'Weather'),
                          _buildWebSidebarItem(5, Icons.history_rounded, 'History Log'),
                          _buildWebSidebarItem(6, Icons.person_rounded, 'Profile'),
                        ],
                      ),
                    ),
                    // Logout Item at bottom
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Material(
                        color: Colors.transparent,
                        child: ListTile(
                          leading: const Icon(Icons.logout, color: Color(0xFFEF4444), size: 20),
                          title: const Text('Logout', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold, fontSize: 14)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          onTap: () {
                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(builder: (context) => const LoginScreen()),
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Right Workspace Body with Modern Clean White Header on Web
            Expanded(
              child: Column(
                children: [
                  // Modern Clean Web Top Header
                  if (isWide)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _getPageTitle(settings),
                                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                              ),
                              const SizedBox(height: 2),
                              const Text('Welcome back, Guest Farmer', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                            ],
                          ),
                          Row(
                            children: [
                              // Search Input Bar
                              Container(
                                width: 220,
                                height: 40,
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Row(
                                  children: [
                                    Icon(Icons.search, color: Color(0xFF94A3B8), size: 18),
                                    SizedBox(width: 8),
                                    Text('Search...', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16),
                              // Language Selector
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: DropdownButtonHideUnderline(
                                  child: DropdownButton<String>(
                                    value: settings.languageCode,
                                    dropdownColor: Colors.white,
                                    icon: const Icon(Icons.language, color: Color(0xFF0F172A), size: 18),
                                    style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 13),
                                    items: const [
                                      DropdownMenuItem(value: 'en', child: Text('English 🇬🇧')),
                                      DropdownMenuItem(value: 'kn', child: Text('ಕನ್ನಡ 🇮🇳')),
                                      DropdownMenuItem(value: 'hi', child: Text('हिंदी 🇮🇳')),
                                    ],
                                    onChanged: (code) {
                                      if (code != null) settings.setLanguage(code);
                                    },
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              IconButton(
                                icon: const Icon(Icons.notifications_active_outlined, color: Color(0xFF0F172A)),
                                tooltip: settings.getText('alerts'),
                                onPressed: () {
                                  Navigator.push(context, MaterialPageRoute(builder: (context) => const AlertsScreen()));
                                },
                              ),
                              const SizedBox(width: 12),
                              // Guest Avatar Circle ('G')
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: const Color(0xFF10B981),
                                child: const Text('G', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                  if (_isListening)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                      color: Colors.red.shade700,
                      child: Row(
                        children: [
                          const Icon(Icons.mic, color: Colors.white, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _spokenText,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.white, size: 20),
                            onPressed: () {
                              setState(() {
                                _isListening = false;
                              });
                              VoiceService.stop();
                            },
                          ),
                        ],
                      ),
                    ),
                  Expanded(child: _screens[_currentIndex]),
                ],
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: isWide
          ? Padding(
              padding: const EdgeInsets.all(16.0),
              child: FloatingActionButton.extended(
                onPressed: () => _triggerVoiceAssistant(settings),
                backgroundColor: _isListening ? Colors.red.shade700 : const Color(0xFF10B981),
                foregroundColor: Colors.white,
                elevation: 4,
                icon: Icon(_isListening ? Icons.mic : Icons.mic_none),
                label: Text(_isListening ? _spokenText : settings.getText('voice_assistant')),
              ),
            )
          : Container(
              height: 64,
              width: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: _isListening
                      ? [Colors.red.shade600, Colors.red.shade800]
                      : [Colors.green.shade700, Colors.teal.shade800],
                ),
                boxShadow: [
                  BoxShadow(
                    color: (_isListening ? Colors.red : Colors.green).withValues(alpha: 0.4),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: FloatingActionButton(
                onPressed: () => _triggerVoiceAssistant(settings),
                backgroundColor: Colors.transparent,
                elevation: 0,
                shape: const CircleBorder(),
                child: Icon(
                  _isListening ? Icons.mic : Icons.mic_none,
                  size: 30,
                  color: Colors.white,
                ),
              ),
            ),
      floatingActionButtonLocation: isWide ? FloatingActionButtonLocation.endFloat : FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: isWide
          ? null
          : BottomAppBar(
              shape: const CircularNotchedRectangle(),
              notchMargin: 8.0,
              color: Colors.white,
              elevation: 12,
              child: SizedBox(
                height: 60,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildNavTab(0, Icons.dashboard_rounded, settings.getText('tab_home')),
                    _buildNavTab(1, Icons.grass_rounded, settings.getText('tab_crops')),
                    const SizedBox(width: 48), // Notch space for Center Voice AI
                    _buildNavTab(2, Icons.bug_report_rounded, settings.getText('tab_disease')),
                    _buildNavTab(3, Icons.water_drop_rounded, settings.getText('tab_irrigation')),
                  ],
                ),
              ),
            ),
    );
  }
}

class DashboardTab extends StatelessWidget {
  const DashboardTab({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = Provider.of<SettingsProvider>(context);
    final parentState = context.findAncestorStateOfType<_HomeScreenState>();
    final isWide = MediaQuery.of(context).size.width >= 900;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hero Banner
          Container(
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [const Color(0xFF047857), const Color(0xFF0F766E), const Color(0xFF065F46)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF047857).withValues(alpha: 0.25),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        settings.getText('welcome'),
                        style: TextStyle(fontSize: isWide ? 30 : 22, fontWeight: FontWeight.w800, color: Colors.white),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        settings.getText('subtitle'),
                        style: TextStyle(fontSize: isWide ? 15 : 13, color: Colors.white70, height: 1.4),
                      ),
                      const SizedBox(height: 20),
                      Wrap(
                        spacing: 14,
                        runSpacing: 10,
                        children: [
                          ElevatedButton.icon(
                            onPressed: () => parentState?._navigateToTab(1),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: const Color(0xFF065F46),
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.grass),
                            label: Text(settings.getText('crops'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          ),
                          OutlinedButton.icon(
                            onPressed: () => parentState?._navigateToTab(2),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white,
                              side: const BorderSide(color: Colors.white70, width: 1.5),
                              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.bug_report),
                            label: Text(settings.getText('disease'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (isWide) ...[
                  const SizedBox(width: 32),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.15), shape: BoxShape.circle),
                    child: const Icon(Icons.eco, size: 70, color: Colors.white),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 32),
          const Text('Platform Modules', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: isWide ? 3 : 1,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 20,
            mainAxisSpacing: 20,
            childAspectRatio: isWide ? 1.4 : 1.5,
            children: [
              FeatureCard(
                title: settings.getText('crops'),
                subtitle: 'Soil NPK & climate-based crop recommendation',
                icon: Icons.grass,
                color: const Color(0xFF10B981),
                onTap: () => parentState?._navigateToTab(1),
              ),
              FeatureCard(
                title: settings.getText('disease'),
                subtitle: 'AI leaf image scan & disease diagnosis',
                icon: Icons.bug_report,
                color: const Color(0xFF0284C7),
                onTap: () => parentState?._navigateToTab(2),
              ),
              FeatureCard(
                title: settings.getText('irrigation'),
                subtitle: 'IoT soil moisture telemetry & pump control',
                icon: Icons.water_drop,
                color: const Color(0xFF0D9488),
                onTap: () => parentState?._navigateToTab(3),
              ),
              FeatureCard(
                title: settings.getText('weather'),
                subtitle: 'Climate forecast & weather telemetry',
                icon: Icons.wb_sunny,
                color: const Color(0xFF7C3AED),
                onTap: () => parentState?._navigateToTab(4),
              ),
              FeatureCard(
                title: settings.getText('history'),
                subtitle: 'View saved crop advice & disease records',
                icon: Icons.history,
                color: const Color(0xFFD97706),
                onTap: () => parentState?._navigateToTab(5),
              ),
              FeatureCard(
                title: settings.getText('profile'),
                subtitle: 'Language, voice assistant & settings',
                icon: Icons.person,
                color: const Color(0xFFDB2777),
                onTap: () => parentState?._navigateToTab(6),
              ),
            ],
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }
}

class FeatureCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const FeatureCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(22.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: color.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(14)),
                    child: Icon(icon, color: color, size: 28),
                  ),
                  Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey.shade400),
                ],
              ),
              const SizedBox(height: 16),
              Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
              const SizedBox(height: 6),
              Text(subtitle, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.3)),
            ],
          ),
        ),
      ),
    );
  }
}
