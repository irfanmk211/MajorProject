import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/history_provider.dart';
import '../providers/settings_provider.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final history = Provider.of<HistoryProvider>(context);
    final settings = Provider.of<SettingsProvider>(context);

    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: TabBar(
              indicatorColor: const Color(0xFF10B981),
              indicatorWeight: 3,
              labelColor: const Color(0xFF10B981),
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              unselectedLabelColor: const Color(0xFF64748B),
              tabs: [
                Tab(text: settings.getText('crops')),
                Tab(text: settings.getText('disease')),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                // Crop History Tab
                history.cropHistory.isEmpty
                    ? Center(child: Text(settings.getText('no_data'), style: const TextStyle(color: Color(0xFF64748B))))
                    : ListView.builder(
                        padding: const EdgeInsets.all(24),
                        itemCount: history.cropHistory.length,
                        itemBuilder: (context, index) {
                          final item = history.cropHistory[index];
                          return Card(
                            elevation: 1,
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                            ),
                            child: ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                              leading: CircleAvatar(
                                backgroundColor: const Color(0x2210B981),
                                child: const Icon(Icons.grass, color: Color(0xFF10B981)),
                              ),
                              title: Text(item['crop'].toString().toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                              subtitle: Text('Date: ${item['date']}', style: const TextStyle(color: Color(0xFF64748B))),
                              trailing: Text('${item['confidence']}%', style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 15)),
                            ),
                          );
                        },
                      ),

                // Disease History Tab
                history.diseaseHistory.isEmpty
                    ? Center(child: Text(settings.getText('no_data'), style: const TextStyle(color: Color(0xFF64748B))))
                    : ListView.builder(
                        padding: const EdgeInsets.all(24),
                        itemCount: history.diseaseHistory.length,
                        itemBuilder: (context, index) {
                          final item = history.diseaseHistory[index];
                          return Card(
                            elevation: 1,
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                            ),
                            child: ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                              leading: CircleAvatar(
                                backgroundColor: const Color(0x220284C7),
                                child: const Icon(Icons.bug_report, color: Color(0xFF0284C7)),
                              ),
                              title: Text(item['disease'].toString(), style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                              subtitle: Text('${item['treatment']}\nDate: ${item['date']}', style: const TextStyle(color: Color(0xFF64748B))),
                              isThreeLine: true,
                              trailing: Text('${item['confidence']}%', style: const TextStyle(color: Color(0xFF0284C7), fontWeight: FontWeight.bold, fontSize: 15)),
                            ),
                          );
                        },
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
