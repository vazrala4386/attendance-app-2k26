import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../providers/auth_provider.dart';
import '../models.dart';
import '../services/api_service.dart';
import 'file_detail_screen.dart';
import 'company_detail_screen.dart';
import 'admin_settings_screen.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        actions: [
          IconButton(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const AdminSettingsScreen()),
            ),
            icon: const Icon(Icons.settings),
            tooltip: 'Settings',
          ),
          IconButton(
            onPressed: () => Provider.of<AuthProvider>(context, listen: false).logout(),
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
          )
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: const [
          DashboardTab(),
          CompaniesTab(),
          UsersTab(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.business), label: 'Companies'),
          BottomNavigationBarItem(icon: Icon(Icons.people), label: 'Users'),
        ],
      ),
    );
  }
}

// ---------------- DASHBOARD TAB ----------------
class DashboardTab extends StatefulWidget {
  const DashboardTab({super.key});

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  bool _isLoading = true;
  List<AttendanceFile> _files = [];
  Map<String, dynamic>? _analytics;

  @override
  void initState() {
    super.initState();
    _refreshData();
  }

  Future<void> _refreshData() async {
    setState(() => _isLoading = true);
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token!;
      final api = ApiService();
      
      final futures = await Future.wait([
        api.getFiles(token),
        api.getAnalytics(token)
      ]);

      if (mounted) {
        setState(() {
          _files = futures[0] as List<AttendanceFile>;
          _analytics = futures[1] as Map<String, dynamic>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        // Use a less intrusive error reporting for refresh
      }
    }
  }

  Future<void> _uploadFile() async {
    try {
      FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['xlsx', 'xls', 'csv'],
      );

      if (result != null) {
        if (!mounted) return;
        // Prompt for Company Name
        final companyController = TextEditingController();
        final shouldUpload = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Enter Company Name'),
            content: TextField(
              controller: companyController,
              decoration: const InputDecoration(hintText: 'e.g. Google, Microsoft'),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
              ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Upload')),
            ],
          ),
        );

        if (shouldUpload == true && companyController.text.isNotEmpty) {
          if (!mounted) return;
          
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Uploading file...')));
          
          final token = Provider.of<AuthProvider>(context, listen: false).token!;
          
          if (result.files.single.bytes != null) {
             // Web
             await ApiService().uploadFileBytes(token, result.files.single.bytes!, result.files.single.name, companyController.text.trim());
          } else {
             // Mobile
             await ApiService().uploadFile(token, result.files.single.path!, companyController.text.trim());
          }
          
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('File uploaded successfully!')));
          _refreshData();
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error uploading: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _refreshData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Analytics Section
          if (_analytics != null) ...[
             _buildAnalyticsCards(),
             const SizedBox(height: 20),
          ],

          // Files Section header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Recent Files', style: Theme.of(context).textTheme.titleLarge),
              ElevatedButton.icon(
                onPressed: _uploadFile,
                icon: const Icon(Icons.upload_file),
                label: const Text('Upload'),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // File List
          if (_files.isEmpty)
            const Center(child: Padding(padding: EdgeInsets.all(20), child: Text("No files uploaded yet.")))
          else
            ..._files.map((file) => Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: file.isCompleted ? Colors.green.shade100 : Colors.red.shade100,
                  child: Icon(
                    file.isCompleted ? Icons.check : Icons.access_time,
                    color: file.isCompleted ? Colors.green : Colors.red,
                  ),
                ),
                title: Text(file.originalName, style: const TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Company: ${file.companyName}'),
                    if (!file.isCompleted && file.pendingBranches.isNotEmpty)
                       Text('Pending: ${file.pendingBranches.join(", ")}', style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                     if (file.isCompleted)
                       const Text('Status: Completed', style: TextStyle(color: Colors.green)),
                    Text('Date: ${file.uploadDate.substring(0, 10)}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
                trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                onTap: () {
                  Navigator.push(
                    context, 
                    MaterialPageRoute(builder: (_) => FileDetailScreen(
                      file: file,
                      onFileDeleted: _refreshData,
                    ))
                  );
                },
              ),
            )),
        ],
      ),
    );
  }

  Widget _buildAnalyticsCards() {
    // Check structure based on API response
    // Server returns: { totalFiles: [...], totalStudents: [...], ... }
    // These are arrays of objects.
    
    int getCount(String key) {
      try {
        if (_analytics![key] is List && (_analytics![key] as List).isNotEmpty) {
           return (_analytics![key] as List)[0]['count'] ?? 0;
        }
      } catch (e) {
        // Ignored
      }
      return 0;
    }

    final totalFiles = getCount('totalFiles');
    final totalStudents = getCount('totalStudents');
    // For simple display
    
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard('Total Files', '$totalFiles', Icons.folder, Colors.blue),
        _buildStatCard('Total Students', '$totalStudents', Icons.people, Colors.purple),
        // Add more if needed
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 30, color: color),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
          Text(title, style: TextStyle(color: Colors.grey[700], fontSize: 12)),
        ],
      ),
    );
  }
}

// ---------------- COMPANIES TAB ----------------
class CompaniesTab extends StatefulWidget {
  const CompaniesTab({super.key});

  @override
  State<CompaniesTab> createState() => _CompaniesTabState();
}

class _CompaniesTabState extends State<CompaniesTab> {
  bool _isLoading = true;
  List<AttendanceFile> _files = [];

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token!;
      final files = await ApiService().getFiles(token);
      if (mounted) {
        setState(() {
          _files = files;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    
    // Group files by company name
    final companies = <String, List<AttendanceFile>>{};
    for (var f in _files) {
      if (!companies.containsKey(f.companyName)) companies[f.companyName] = [];
      companies[f.companyName]!.add(f);
    }

    if (companies.isEmpty) {
      return const Center(child: Text('No companies found'));
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: companies.entries.map((entry) {
        final company = entry.key;
        final companyFiles = entry.value;
        final totalFiles = companyFiles.length;
        final pendingFiles = companyFiles.where((f) => !f.isCompleted).length;

        return Card(
           margin: const EdgeInsets.only(bottom: 10),
           child: ExpansionTile(
             leading: CircleAvatar(child: Text(company[0].toUpperCase())),
             title: Row(
               mainAxisAlignment: MainAxisAlignment.spaceBetween,
               children: [
                 Text(company, style: const TextStyle(fontWeight: FontWeight.bold)),
                 IconButton(
                    icon: const Icon(Icons.analytics_outlined, color: Colors.indigo),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => CompanyDetailScreen(companyName: company)),
                      );
                    },
                    tooltip: 'View Analytics',
                 )
               ],
             ),
             subtitle: Text('$totalFiles Drives • $pendingFiles Pending'),
             children: companyFiles.map((file) => ListTile(
               title: Text(file.originalName),
               subtitle: Text(file.uploadDate.substring(0, 10)),
               trailing: Icon(file.isCompleted ? Icons.check_circle : Icons.warning, 
                  color: file.isCompleted ? Colors.green : Colors.red),
               onTap: () {
                 Navigator.push(
                    context, 
                    MaterialPageRoute(builder: (_) => FileDetailScreen(
                      file: file,
                      onFileDeleted: _fetchData,
                    ))
                  );
               },
             )).toList(),
           ),
        );
      }).toList(),
    );
  }
}

// ---------------- USERS TAB ----------------
class UsersTab extends StatefulWidget {
  const UsersTab({super.key});

  @override
  State<UsersTab> createState() => _UsersTabState();
}

class _UsersTabState extends State<UsersTab> {
  bool _isLoading = true;
  List<User> _users = [];

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  Future<void> _fetchUsers() async {
    setState(() => _isLoading = true);
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token!;
      final users = await ApiService().getUsers(token);
      if (mounted) {
        setState(() {
          _users = users;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _resetPassword(User user) async {
    final passController = TextEditingController();
    final confirmPassController = TextEditingController();

    final success = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Reset Password: ${user.username}'),
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
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
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
              Navigator.pop(ctx, true);
            }, 
            child: const Text('Reset')
          ),
        ],
      ),
    );

    if (success == true) {
      if (!mounted) return;
      setState(() => _isLoading = true);
      try {
        final token = Provider.of<AuthProvider>(context, listen: false).token!;
        await ApiService().resetPassword(token, user.id, passController.text);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Password reset for ${user.username}')));
      } catch (e) {
         if (!mounted) return;
         ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _bulkReset() async {
    // Show dialog for bulk reset choices
      final passController = TextEditingController();
      String userType = 'students'; // Default

      final success = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            title: const Text('Bulk Password Reset'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButton<String>(
                  value: userType,
                  isExpanded: true,
                  items: const [
                    DropdownMenuItem(value: 'students', child: Text('All Student Accounts (Branch Logins)')),
                    // DropdownMenuItem(value: 'all', child: Text('All Users (Except Admin)')),
                  ],
                  onChanged: (v) => setState(() => userType = v!),
                ),
                TextField(
                  controller: passController,
                  decoration: const InputDecoration(labelText: 'New Password'),
                  obscureText: true,
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
                onPressed: () => Navigator.pop(ctx, true), 
                child: const Text('RESET ALL')
              ),
            ],
          );
        }
      ),
    );

    if (success == true && passController.text.isNotEmpty) {
       if (!mounted) return;
      setState(() => _isLoading = true);
       try {
        final token = Provider.of<AuthProvider>(context, listen: false).token!;
        await ApiService().bulkResetPassword(token, userType, passController.text);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Bulk password reset successful')));
      } catch (e) {
         if (!mounted) return;
         ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: ElevatedButton(
            onPressed: _bulkReset,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade100, 
              foregroundColor: Colors.red,
              minimumSize: const Size(double.infinity, 50)
            ),
            child: const Text('Bulk Reset Student Passwords'),
          ),
        ),
        Expanded(
          child: ListView.builder(
            itemCount: _users.length,
            itemBuilder: (context, index) {
              final user = _users[index];
              return ListTile(
                leading: CircleAvatar(child: Text(user.username[0].toUpperCase())),
                title: Text(user.username),
                subtitle: Text('Role: ${user.role}'),
                trailing: user.role == 'admin' 
                  ? const Chip(label: Text('Protected', style: TextStyle(fontSize: 10))) 
                  : IconButton(
                      icon: const Icon(Icons.lock_reset),
                      onPressed: () => _resetPassword(user),
                      tooltip: 'Reset Password',
                    ),
              );
            },
          ),
        ),
      ],
    );
  }
}
