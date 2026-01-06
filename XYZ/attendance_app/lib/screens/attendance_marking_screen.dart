import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../models.dart';
import '../services/api_service.dart';
import '../providers/auth_provider.dart';

class AttendanceMarkingScreen extends StatefulWidget {
  final AttendanceFile file;
  final bool isAdminMode;

  const AttendanceMarkingScreen({super.key, required this.file, this.isAdminMode = false});

  @override
  State<AttendanceMarkingScreen> createState() => _AttendanceMarkingScreenState();
}

class _AttendanceMarkingScreenState extends State<AttendanceMarkingScreen> {
  // ... (previous variables)
  List<Student> _students = [];
  List<Student> _filteredStudents = [];
  bool _isLoading = true;
  bool _isSaving = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token!;
      final api = ApiService();
      final user = Provider.of<AuthProvider>(context, listen: false).user!;

      // 1. Get Students from File Content
      final students = await api.getFileContents(widget.file.id, token);
      
      // 2. Get Existing Attendance
      final existingRecords = await api.getExistingAttendance(widget.file.id, token);

      // 3. Merge Data
      if (existingRecords.isNotEmpty) {
        // If Admin, use ALL records. If Student, filter by their branch.
        final relevantRecords = widget.isAdminMode 
            ? existingRecords 
            : existingRecords.where((r) => r['student_branch'] == user.branch).toList();
        
        for (var student in students) {
          final record = relevantRecords.firstWhere(
            (r) => r['student_roll'].toString() == student.roll.toString(),
            orElse: () => {},
          );
          
          if (record.isNotEmpty) {
            student.status = record['status'];
          }
        }
      } 
      
      // 4. Initial Filter for Display (Students only see their branch)
      // Admins see everything by default
      List<Student> displayStudents = students;
      if (!widget.isAdminMode) {
         displayStudents = students.where((s) => s.normalizedBranch == user.branch).toList();
      }

      setState(() {
        _students = displayStudents;
        _filteredStudents = displayStudents;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        Fluttertoast.showToast(msg: "Error loading data: $e");
        Navigator.pop(context);
      }
    }
  }

  void _filterStudents(String query) {
    setState(() {
      _searchQuery = query;
      if (query.isEmpty) {
        _filteredStudents = _students;
      } else {
        _filteredStudents = _students.where((s) => 
          s.name.toLowerCase().contains(query.toLowerCase()) || 
          s.roll.toString().toLowerCase().contains(query.toLowerCase())
        ).toList();
      }
    });
  }

  void _toggleStatus(Student student) {
    setState(() {
      student.status = student.status == 'present' ? 'absent' : 'present';
    });
  }

  void _markAllPresent() {
    setState(() {
      for (var s in _students) {
        s.status = 'present';
      }
    });
    Fluttertoast.showToast(msg: "Marked all as present");
  }

  Future<void> _saveAttendance() async {
    setState(() => _isSaving = true);
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token!;
      
      await ApiService().saveAttendance(widget.file.id, _students, token);
      
      if (mounted) {
        Fluttertoast.showToast(msg: "Attendance saved successfully!");
        Navigator.pop(context, true); // Return true to trigger refresh
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        Fluttertoast.showToast(msg: "Error saving: $e");
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final presentCount = _students.where((s) => s.status == 'present').length;
    final totalCount = _students.length;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.file.originalName),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.all(8.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by name or roll number...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              onChanged: _filterStudents,
            ),
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Stats Bar
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Colors.white,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatItem('Total', totalCount.toString(), Colors.black),
                      _buildStatItem('Present', presentCount.toString(), Colors.green),
                      _buildStatItem('Absent', (totalCount - presentCount).toString(), Colors.red),
                    ],
                  ),
                ),
                const Divider(height: 1),
                
                // Student List
                Expanded(
                  child: _filteredStudents.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.search_off, size: 48, color: Colors.grey.shade400),
                              const SizedBox(height: 16),
                              Text(
                                _searchQuery.isEmpty ? "No students found in this file." : "No results for '$_searchQuery'",
                                style: TextStyle(color: Colors.grey.shade600),
                              ),
                              if (_searchQuery.isEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(top: 8.0),
                                  child: Text("Ensure the file contains valid student data.", style: TextStyle(fontSize: 12, color: Colors.grey.shade400)),
                                )
                            ],
                          ),
                        )
                      : ListView.separated(
                          itemCount: _filteredStudents.length,
                          separatorBuilder: (c, i) => const Divider(height: 1),
                          itemBuilder: (context, index) {
                            final student = _filteredStudents[index];
                            final isPresent = student.status == 'present';
                            
                            return ListTile(
                              onTap: () => _toggleStatus(student),
                              leading: CircleAvatar(
                                backgroundColor: isPresent ? Colors.green.shade100 : Colors.red.shade100,
                                child: Icon(
                                  isPresent ? Icons.check : Icons.close,
                                  color: isPresent ? Colors.green : Colors.red,
                                ),
                              ),
                              title: Text(student.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Text('${student.roll} • ${student.mobile}'),
                              trailing: Switch(
                                value: isPresent,
                                activeColor: Colors.green,
                                onChanged: (val) => _toggleStatus(student),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
      bottomNavigationBar: BottomAppBar(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text('Mark All'),
                  onPressed: _isLoading ? null : _markAllPresent,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton.icon(
                  icon: _isSaving 
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                      : const Icon(Icons.save),
                  label: Text(_isSaving ? 'Saving...' : 'Save'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.indigo,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: (_isLoading || _isSaving) ? null : _saveAttendance,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}
