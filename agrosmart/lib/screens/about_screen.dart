import 'package:flutter/material.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  final List<Map<String, dynamic>> _sections = const [
    {
      'icon': Icons.track_changes,
      'title': 'Project Overview',
      'content': 'AgroSmart is an AI-powered smart agriculture platform that helps farmers make data-driven decisions. It combines machine learning for crop recommendation and deep learning for plant disease detection into a unified, user-friendly application.',
    },
    {
      'icon': Icons.lightbulb,
      'title': 'Problem Statement',
      'content': 'Farmers face challenges in selecting optimal crops based on soil conditions and identifying plant diseases early. Manual diagnosis is slow, error-prone, and leads to significant crop losses and reduced yields.',
    },
    {
      'icon': Icons.memory,
      'title': 'Solution',
      'content': 'Our platform uses trained ML/DL models to recommend the top 5 suitable crops based on NPK levels, temperature, humidity, pH, and rainfall. The disease detection module analyzes leaf images and provides detailed treatment recommendations.',
    },
    {
      'icon': Icons.storage,
      'title': 'Dataset',
      'content': 'Crop recommendation uses a dataset with 2200+ samples across 22 crop types. Disease detection uses the PlantVillage dataset with 38 classes across 14 plant species, trained with MobileNetV2 architecture.',
    },
    {
      'icon': Icons.rocket_launch,
      'title': 'Future Scope',
      'content': 'IoT sensor integration, real-time weather API, multi-language voice assistant, marketplace for agricultural products, and federated learning for continuous model improvement.',
    },
  ];

  final List<Map<String, String>> _techStack = const [
    {'name': 'Flutter', 'desc': 'Cross-platform UI framework'},
    {'name': 'Flask Python', 'desc': 'REST API backend server'},
    {'name': 'TensorFlow / TFLite', 'desc': 'Deep learning disease inference'},
    {'name': 'Scikit-learn', 'desc': 'Random Forest crop recommendation'},
    {'name': 'OpenCV', 'desc': 'Image preprocessing & validation'},
    {'name': 'ESP32 IoT Station', 'desc': 'Soil moisture & climate telemetry'},
    {'name': 'Speech-to-Text', 'desc': 'Multi-lingual voice command assistant'},
    {'name': 'OpenWeatherMap', 'desc': 'Live weather & forecast telemetry'},
  ];

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width >= 900;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('About AgroSmart AI', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
          const SizedBox(height: 6),
          const Text('A smart agriculture platform bridging AI and farming for better yield decisions.', style: TextStyle(color: Color(0xFF64748B), fontSize: 14)),
          const SizedBox(height: 24),

          // Overview Sections
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _sections.length,
            itemBuilder: (context, index) {
              final sec = _sections[index];
              return Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10),
                  ],
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: const Color(0x2210B981), borderRadius: BorderRadius.circular(14)),
                      child: Icon(sec['icon'] as IconData, color: const Color(0xFF10B981), size: 26),
                    ),
                    const SizedBox(width: 18),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(sec['title'].toString(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: Color(0xFF0F172A))),
                          const SizedBox(height: 6),
                          Text(sec['content'].toString(), style: const TextStyle(color: Color(0xFF475569), height: 1.4, fontSize: 14)),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 28),

          const Text('Technology Stack', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
          const SizedBox(height: 16),
          GridView.count(
            crossAxisCount: isWide ? 4 : 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 14,
            mainAxisSpacing: 14,
            childAspectRatio: 1.6,
            children: _techStack.map((tech) {
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(tech['name']!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
                    const SizedBox(height: 4),
                    Text(tech['desc']!, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                  ],
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 100),
        ],
      ),
    );
  }
}
