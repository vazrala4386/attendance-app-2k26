import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecurityService {
  final LocalAuthentication auth = LocalAuthentication();

  Future<bool> isBiometricAvailable() async {
    final bool canAuthenticateWithBiometrics = await auth.canCheckBiometrics;
    final bool canAuthenticate = canAuthenticateWithBiometrics || await auth.isDeviceSupported();
    return canAuthenticate;
  }

  Future<bool> authenticateWithBiometrics() async {
    try {
      if (!await isBiometricAvailable()) return false;

      return await auth.authenticate(
        localizedReason: 'Verify your identity',
      );
    } catch (e) {
      // print('Biometric Error: $e');
      return false;
    }
  }

  // Hardcoded Secret Key (Permanent)
  static const String _permanentSecretKey = 'TPO_2K26';

  Future<bool> verifySecretKey(String inputKey) async {
    return inputKey == _permanentSecretKey;
  }

  Future<bool> isSecretKeySet() async {
    return true; // Always available
  }

  // Enrollment / Registration Features
  Future<void> setBiometricsRegistered(bool registered) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('biometrics_registered', registered);
  }

  Future<bool> isBiometricsRegistered() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool('biometrics_registered') ?? false;
  }
}
