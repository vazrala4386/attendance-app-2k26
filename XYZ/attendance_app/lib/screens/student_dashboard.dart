import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../models.dart';
import '../services/api_service.dart';
import 'attendance_marking_screen.dart';

class StudentDashboard extends StatefulWidget {
  const StudentDashboard({super.key});

  @override
  State<StudentDashboard> createState() => _StudentDashboardState();
}

class _StudentDashboardState extends State<StudentDashboard> {
  List<AttendanceFile> _files = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchFiles();
  }

  Future<void> _fetchFiles() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token!;
      final files = await ApiService().getFiles(token);
      setState(() {
        _files = files;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  void _logout(BuildContext context) {
    Provider.of<AuthProvider>(context, listen: false).logout();
  }

  void _openFile(AttendanceFile file) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AttendanceMarkingScreen(file: file),
      ),
    );

    // Refresh if attendance was marked
    if (result == true) {
      _fetchFiles();
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthProvider>(context).user!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => _logout(context),
          )
        ],
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            color: Colors.blue.shade50,
            width: double.infinity,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Welcome, ${user.username}',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Branch: ${user.branch}',
                  style: TextStyle(color: Colors.grey.shade700),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(
              'Available Files',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(child: Text('Error: $_error'))
                    : _files.isEmpty
                        ? const Center(child: Text('No files available for your branch.'))
                        : RefreshIndicator(
                            onRefresh: _fetchFiles,
                            child: ListView.builder(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              itemCount: _files.length,
                              itemBuilder: (context, index) {
                                final file = _files[index];
                                return Card(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  child: ListTile(
                                    contentPadding: const EdgeInsets.all(16),
                                    leading: Container(
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color: Colors.blue.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Icon(Icons.insert_drive_file, color: Colors.blue),
                                    ),
                                    title: Text(
                                      file.originalName,
                                      style: const TextStyle(fontWeight: FontWeight.bold),
                                    ),
                                    subtitle: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const SizedBox(height: 4),
                                        Text('Company: ${file.companyName}'),
                                        Text(
                                          'Uploaded: ${DateFormat('MMM dd, yyyy').format(DateTime.parse(file.uploadDate))}',
                                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                        ),
                                      ],
                                    ),
                                    trailing: ElevatedButton(
                                      onPressed: () => _openFile(file),
                                      child: const Text('Open'),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
