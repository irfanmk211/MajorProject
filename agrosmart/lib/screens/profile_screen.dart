import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/settings_provider.dart';
import 'login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final settings = Provider.of<SettingsProvider>(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // User Header Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [Colors.green.shade700, Colors.teal.shade800]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: Colors.white24,
                  child: Icon(Icons.person, size: 36, color: Colors.white),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Farmer User', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                      SizedBox(height: 4),
                      Text('AgroSmart Member', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Language Selection
          Text(settings.getText('language'), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: Column(
              children: [
                ListTile(
                  title: const Text('English 🇬🇧'),
                  trailing: settings.languageCode == 'en' ? const Icon(Icons.check_circle, color: Colors.green) : null,
                  onTap: () => settings.setLanguage('en'),
                ),
                const Divider(height: 1),
                ListTile(
                  title: const Text('ಕನ್ನಡ (Kannada) 🇮🇳'),
                  trailing: settings.languageCode == 'kn' ? const Icon(Icons.check_circle, color: Colors.green) : null,
                  onTap: () => settings.setLanguage('kn'),
                ),
                const Divider(height: 1),
                ListTile(
                  title: const Text('हिंदी (Hindi) 🇮🇳'),
                  trailing: settings.languageCode == 'hi' ? const Icon(Icons.check_circle, color: Colors.green) : null,
                  onTap: () => settings.setLanguage('hi'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Voice & Notification Toggles
          const Text('Preferences', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: Column(
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.mic, color: Colors.green),
                  title: Text(settings.getText('voice_assistant')),
                  subtitle: Text(settings.getText('voice_commands')),
                  value: settings.voiceEnabled,
                  onChanged: (val) => settings.setVoiceEnabled(val),
                  activeTrackColor: Colors.green.shade700,
                ),
                const Divider(height: 1),
                SwitchListTile(
                  secondary: const Icon(Icons.notifications_active, color: Colors.green),
                  title: Text(settings.getText('notifications')),
                  subtitle: const Text('Low moisture & weather alerts'),
                  value: settings.notificationsEnabled,
                  onChanged: (val) => settings.setNotificationsEnabled(val),
                  activeTrackColor: Colors.green.shade700,
                ),
              ],
            ),
          ),
          const SizedBox(height: 28),

          // Logout Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (context) => const LoginScreen()),
                );
              },
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Colors.red),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.logout, color: Colors.red),
              label: Text(settings.getText('logout'), style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }
}
