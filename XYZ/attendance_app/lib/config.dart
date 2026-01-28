import 'package:flutter/foundation.dart';

class Config {
  // Use 10.0.2.2 for Android Emulator to access localhost
  // Use 10.0.2.2 for Android Emulator to access localhost
  // Use 10.0.2.2 for Android Emulator to access localhost
  // Use http://172.16.25.17:3001 for Physical Device (LAN)
  static String get baseUrl {
    if (kIsWeb) {
      // In Debug mode (flutter run), pointing to separate backend server
      if (kDebugMode) return 'http://localhost:3001';
      // In Release mode (built), expecting to be served BY the backend
      return ''; 
    }
    return 'http://172.16.25.17:3001'; 
  }
}
