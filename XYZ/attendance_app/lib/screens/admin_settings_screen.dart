import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/security_service.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';

class AdminSettingsScreen extends StatefulWidget {
  const AdminSettingsScreen({super.key});

  @override
  State<AdminSettingsScreen> createState() => _AdminSettingsScreenState();
}

class _AdminSettingsScreenState extends State<AdminSettingsScreen> {
  final SecurityService _securityService = SecurityService();
  bool _isLoading = false;
  bool _isBiometricsRegistered = false;

  @override
  void initState() {
    super.initState();
    _checkBiometricStatus();
  }

  Future<void> _checkBiometricStatus() async {
    final registered = await _securityService.isBiometricsRegistered();
    if (mounted) setState(() => _isBiometricsRegistered = registered);
  }

  Future<void> _registerBiometrics() async {
    // Check if available
    if (!await _securityService.isBiometricAvailable()) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No biometrics available on this device.')));
      return;
    }

    // Authenticate to Confirm
    final authenticated = await _securityService.authenticateWithBiometrics();
    if (authenticated) {
      await _securityService.setBiometricsRegistered(true);
      await _checkBiometricStatus();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Face ID / Biometrics Registered Successfully!')));
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to capture Face ID.')));
    }
  }

  Future<void> _unregisterBiometrics() async {
    await _securityService.setBiometricsRegistered(false);
    await _checkBiometricStatus();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Face ID disconnected.')));
  }

  Future<void> _changeAdminPassword() async {
    // 1. Authenticate first
    bool authenticated = false;
    
    // Check biometrics IF registered
    if (_isBiometricsRegistered && await _securityService.isBiometricAvailable()) {
       authenticated = await _securityService.authenticateWithBiometrics();
    } 

    // If biometric failed, not registered, or user cancelled, fallback to Secret Key if set
    if (!authenticated) {
      // If biometrics were expected but failed, warn user? 
      // Or just fall through to secret key.
      if (!mounted) return;
      bool hasSecret = await _securityService.isSecretKeySet();
      if (hasSecret) {
         authenticated = await _showSecretKeyDialog();
      } else {
         if (_isBiometricsRegistered) {
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Face ID failed and no Secret Key set.')));
           return;
         } else {
           // No security set up at all? Allow? Or Block?
           // Ideally, block. But for now, let's warn.
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please set up a Secret Key or Face ID first.')));
           return;
         }
      }
    }

    if (!authenticated) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Authentication failed or cancelled')),
      );
      return;
    }

    // 2. If authenticated, show Change Password Dialog
    if (!mounted) return;
    _showChangePasswordDialog();
  }

  Future<bool> _showSecretKeyDialog() async {
    // ... (Same as before)
    final controller = TextEditingController();
    return await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Enter Secret Key'),
        content: TextField(
          controller: controller,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Secret Key'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final isValid = await _securityService.verifySecretKey(controller.text);
              if (isValid) {
                Navigator.pop(ctx, true);
              } else {
                ScaffoldMessenger.of(ctx).showSnackBar(
                   const SnackBar(content: Text('Invalid Secret Key')),
                );
              }
            },
            child: const Text('Verify'),
          ),
        ],
      ),
    ) ?? false;
  }

  Future<void> _showChangePasswordDialog() async {
    final passController = TextEditingController();
    final confirmPassController = TextEditingController();

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change Admin Password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: passController,
              decoration: const InputDecoration(labelText: 'New Password'),
              obscureText: true,
            ),
            TextField(
              controller: confirmPassController,
              decoration: const InputDecoration(labelText: 'Confirm Password'),
              obscureText: true,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (passController.text != confirmPassController.text) {
                ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Passwords do not match')));
                return;
              }
              if (passController.text.length < 6) {
                ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Password too short')));
                return;
              }
              
              Navigator.pop(ctx);
              _performPasswordChange(passController.text);
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  Future<void> _performPasswordChange(String newPassword) async {
    setState(() => _isLoading = true);
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.user == null) return;
      await ApiService().resetPassword(auth.token!, auth.user!.id, newPassword);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Password updated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }



  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Admin Settings')),
      body: _isLoading 
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Enrollment Section
                Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading: Icon(
                          _isBiometricsRegistered ? Icons.face : Icons.face_retouching_off,
                          color: _isBiometricsRegistered ? Colors.green : Colors.grey,
                          size: 30,
                        ),
                        title: const Text('Face ID / Biometrics'),
                        subtitle: Text(_isBiometricsRegistered 
                            ? 'Your Face ID is registered from this PC.' 
                            : 'Face ID not registered.'),
                        trailing: Switch(
                          value: _isBiometricsRegistered,
                          onChanged: (val) {
                            if (val) {
                              _registerBiometrics();
                            } else {
                              _unregisterBiometrics();
                            }
                          },
                        ),
                      ),
                      if (!_isBiometricsRegistered)
                        Padding(
                          padding: const EdgeInsets.all(8.0),
                          child: Text(
                            'Turn on to "Take" your Face ID from this PC and use it for security.',
                            style: TextStyle(color: Colors.grey[600], fontSize: 12),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.password, color: Colors.red),
                  title: const Text('Change Admin Password'),
                  subtitle: const Text('Requires Face ID or Secret Key'),
                  onTap: _changeAdminPassword,
                  trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                ),
              ],
            ),
    );
  }
}
