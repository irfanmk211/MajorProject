import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/history_provider.dart';
import '../providers/settings_provider.dart';

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final history = Provider.of<HistoryProvider>(context);
    final settings = Provider.of<SettingsProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(settings.getText('alerts')),
        backgroundColor: Colors.green.shade700,
        foregroundColor: Colors.white,
      ),
      body: history.alerts.isEmpty
          ? const Center(child: Text('No alerts at this time.'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: history.alerts.length,
              itemBuilder: (context, index) {
                final alert = history.alerts[index];
                IconData icon = Icons.notifications;
                Color color = Colors.blue;

                if (alert['type'] == 'warning') {
                  icon = Icons.warning_amber;
                  color = Colors.orange;
                } else if (alert['type'] == 'success') {
                  icon = Icons.check_circle_outline;
                  color = Colors.green;
                }

                return Card(
                  elevation: 2,
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(color: color.withValues(alpha: 0.15), shape: BoxShape.circle),
                          child: Icon(icon, color: color),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(alert['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                  Text(alert['time'] ?? '', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(alert['body'] ?? '', style: TextStyle(color: Colors.grey.shade700, fontSize: 13)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
