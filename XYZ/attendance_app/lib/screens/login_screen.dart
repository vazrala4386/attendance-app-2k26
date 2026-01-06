import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'package:fluttertoast/fluttertoast.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  String _loginType = ''; // '', 'admin', 'student'
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  String? _selectedBranch;
  String? _selectedGender;

  void _selectLoginType(String type) {
    setState(() {
      _loginType = type;
      _usernameController.clear();
      _passwordController.clear();
      _selectedBranch = null;
      _selectedGender = null;
      
      if (type == 'admin') {
        _usernameController.text = 'admin';
      } else if (type == 'student') {
        _passwordController.text = 'student123';
      }
    });
  }

  void _updateStudentLogin() {
    if (_selectedBranch != null && _selectedGender != null) {
      _usernameController.text = "${_selectedBranch}_${_selectedGender!.toUpperCase()}_2K26";
    } else {
      _usernameController.clear();
    }
    setState(() {});
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    // For student login, ensure user and pass are set
    if (_loginType == 'student') {
       if (_usernameController.text.isEmpty) {
          Fluttertoast.showToast(msg: "Please select both Branch and Gender");
          return;
       }
    }

    try {
      await Provider.of<AuthProvider>(context, listen: false).login(
        _usernameController.text,
        _passwordController.text,
      );
      // Navigation is handled by MainWrapper based on auth state
    } catch (e) {
      Fluttertoast.showToast(
          msg: e.toString().replaceAll('Exception: ', ''),
          backgroundColor: Colors.red,
          textColor: Colors.white);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loginType.isEmpty) {
      return _buildTypeSelection();
    }
    return _buildLoginForm();
  }

  Widget _buildTypeSelection() {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF667eea), Color(0xFF764ba2)],
          ),
        ),
        child: Center(
          child: Card(
            margin: const EdgeInsets.all(20),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(32.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF6366f1), Color(0xFFa855f7)]),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.login, color: Colors.white, size: 30),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Attendance System',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text('Choose your login type', style: TextStyle(color: Colors.grey)),
                  const SizedBox(height: 32),
                  _buildTypeButton('Admin Login', Icons.admin_panel_settings,
                      const Color(0xFF6366f1), () => _selectLoginType('admin')),
                  const SizedBox(height: 16),
                  _buildTypeButton('Student Login', Icons.school,
                      const Color(0xFF10b981), () => _selectLoginType('student')),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTypeButton(String text, IconData icon, Color color, VoidCallback onTap) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        icon: Icon(icon, color: Colors.white),
        label: Text(text),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        onPressed: onTap,
      ),
    );
  }

  Widget _buildLoginForm() {
    return Scaffold(
      appBar: AppBar(
        title: Text(_loginType == 'admin' ? 'Admin Login' : 'Student Login'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => setState(() => _loginType = ''),
        ),
      ),
      body: Container(
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF667eea), Color(0xFF764ba2)],
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                       if (_loginType == 'student') ...[
                        const Text("Select Branch", style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          alignment: WrapAlignment.center,
                          children: [
                            _buildSelectionChip('CSE', Colors.indigo, isGender: false),
                            _buildSelectionChip('AIML', Colors.deepPurple, isGender: false),
                            _buildSelectionChip('CSD', Colors.cyan, isGender: false),
                            _buildSelectionChip('ECE', Colors.teal, isGender: false),
                            _buildSelectionChip('MCA', Colors.amber, isGender: false),
                          ],
                        ),
                        const SizedBox(height: 20),
                        const Text("Select Gender", style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _buildSelectionChip('Male', Colors.blue, isGender: true),
                            const SizedBox(width: 20),
                            _buildSelectionChip('Female', Colors.pink, isGender: true),
                          ],
                        ),
                        const SizedBox(height: 20),
                      ],
                      if (_loginType == 'admin')
                        TextFormField(
                          controller: _usernameController,
                          decoration: const InputDecoration(
                            labelText: 'Username',
                            prefixIcon: Icon(Icons.person),
                            border: OutlineInputBorder(),
                          ),
                          validator: (value) => value!.isEmpty ? 'Required' : null,
                        ),
                      if (_loginType == 'admin') const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordController,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                          prefixIcon: Icon(Icons.lock),
                          border: OutlineInputBorder(),
                        ),
                        obscureText: true,
                        validator: (value) => value!.isEmpty ? 'Required' : null,
                      ),
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: Consumer<AuthProvider>(
                          builder: (context, auth, _) {
                            return ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                backgroundColor: _loginType == 'admin' ? const Color(0xFF6366f1) : const Color(0xFF10b981),
                                foregroundColor: Colors.white,
                              ),
                              onPressed: auth.isLoading ? null : _submit,
                              child: auth.isLoading
                                  ? const CircularProgressIndicator(color: Colors.white)
                                  : const Text('Sign In'),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
  
  Widget _buildSelectionChip(String label, Color color, {required bool isGender}) {
    final isSelected = isGender ? _selectedGender == label : _selectedBranch == label;
    
    return InkWell(
      onTap: () {
        setState(() {
          if (isGender) {
            _selectedGender = label;
          } else {
            _selectedBranch = label;
          }
          _updateStudentLogin();
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 20),
        decoration: BoxDecoration(
          color: isSelected ? color : Colors.white,
          border: Border.all(color: color, width: 2),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : color,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
