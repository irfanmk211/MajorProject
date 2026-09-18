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
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Clean User Profile Header Card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: const Color(0xFF10B981),
                  child: const Icon(Icons.person, size: 36, color: Colors.white),
                ),
                const SizedBox(width: 18),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Farmer User', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                      SizedBox(height: 4),
                      Text('AgroSmart Member', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Language Selection
          Text(settings.getText('language'), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                ListTile(
                  title: const Text('English 🇬🇧', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                  trailing: settings.languageCode == 'en' ? const Icon(Icons.check_circle, color: Color(0xFF10B981)) : null,
                  onTap: () => settings.setLanguage('en'),
                ),
                const Divider(height: 1, color: Color(0xFFE2E8F0)),
                ListTile(
                  title: const Text('ಕನ್ನಡ (Kannada) 🇮🇳', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                  trailing: settings.languageCode == 'kn' ? const Icon(Icons.check_circle, color: Color(0xFF10B981)) : null,
                  onTap: () => settings.setLanguage('kn'),
                ),
                const Divider(height: 1, color: Color(0xFFE2E8F0)),
                ListTile(
                  title: const Text('हिंदी (Hindi) 🇮🇳', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                  trailing: settings.languageCode == 'hi' ? const Icon(Icons.check_circle, color: Color(0xFF10B981)) : null,
                  onTap: () => settings.setLanguage('hi'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Voice & Notification Toggles
          const Text('Preferences', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.mic, color: Color(0xFF10B981)),
                  title: Text(settings.getText('voice_assistant'), style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                  subtitle: Text(settings.getText('voice_commands'), style: const TextStyle(color: Color(0xFF64748B))),
                  value: settings.voiceEnabled,
                  onChanged: (val) => settings.setVoiceEnabled(val),
                  activeThumbColor: const Color(0xFF10B981),
                ),
                const Divider(height: 1, color: Color(0xFFE2E8F0)),
                SwitchListTile(
                  secondary: const Icon(Icons.notifications_active, color: Color(0xFF10B981)),
                  title: Text(settings.getText('notifications'), style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                  subtitle: const Text('Low moisture & weather alerts', style: TextStyle(color: Color(0xFF64748B))),
                  value: settings.notificationsEnabled,
                  onChanged: (val) => settings.setNotificationsEnabled(val),
                  activeThumbColor: const Color(0xFF10B981),
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
                side: const BorderSide(color: Color(0xFFEF4444)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.logout, color: Color(0xFFEF4444)),
              label: Text(settings.getText('logout'), style: const TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }
}
