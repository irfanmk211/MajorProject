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
            color: Colors.green.shade700,
            child: TabBar(
              indicatorColor: Colors.white,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white70,
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
                    ? Center(child: Text(settings.getText('no_data')))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: history.cropHistory.length,
                        itemBuilder: (context, index) {
                          final item = history.cropHistory[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Colors.green.shade100,
                                child: Icon(Icons.grass, color: Colors.green.shade800),
                              ),
                              title: Text(item['crop'].toString().toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Text('Date: ${item['date']}'),
                              trailing: Text('${item['confidence']}%', style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.bold)),
                            ),
                          );
                        },
                      ),

                // Disease History Tab
                history.diseaseHistory.isEmpty
                    ? Center(child: Text(settings.getText('no_data')))
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: history.diseaseHistory.length,
                        itemBuilder: (context, index) {
                          final item = history.diseaseHistory[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Colors.orange.shade100,
                                child: Icon(Icons.bug_report, color: Colors.orange.shade800),
                              ),
                              title: Text(item['disease'].toString(), style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Text('${item['treatment']}\nDate: ${item['date']}'),
                              isThreeLine: true,
                              trailing: Text('${item['confidence']}%', style: TextStyle(color: Colors.orange.shade800, fontWeight: FontWeight.bold)),
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
