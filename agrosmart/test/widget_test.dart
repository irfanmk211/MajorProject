import 'package:flutter_test/flutter_test.dart';

import 'package:agrosmart/main.dart';

void main() {
  testWidgets('AgroSmartApp smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const AgroSmartApp());

    // Verify that AgroSmart Dashboard loads.
    expect(find.text('🌱 AgroSmart Dashboard'), findsOneWidget);
  });
}
