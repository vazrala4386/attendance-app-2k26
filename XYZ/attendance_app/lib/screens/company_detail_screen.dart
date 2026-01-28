import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class CompanyDetailScreen extends StatefulWidget {
  final String companyName;

  const CompanyDetailScreen({super.key, required this.companyName});

  @override
  State<CompanyDetailScreen> createState() => _CompanyDetailScreenState();
}

class _CompanyDetailScreenState extends State<CompanyDetailScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _analytics;

  @override
  void initState() {
    super.initState();
    _fetchCompanyAnalytics();
  }

  Future<void> _fetchCompanyAnalytics() async {
    setState(() => _isLoading = true);
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token!;
      final data = await ApiService().getAnalytics(token, company: widget.companyName);
      
      setState(() {
        _analytics = data;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(widget.companyName),
        elevation: 0,
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
      ),
      body: _isLoading 
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchCompanyAnalytics,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _buildSummaryHeader(),
                  const SizedBox(height: 24),
                  _buildBranchStats(),
                ],
              ),
            ),
    );
  }

  Widget _buildSummaryHeader() {
    int getCount(String key) {
      try {
        if (_analytics![key] is List && (_analytics![key] as List).isNotEmpty) {
           return (_analytics![key] as List)[0]['count'] ?? 0;
        }
      } catch (e) { /* ignore */ }
      return 0;
    }

    final totalDrives = getCount('totalFiles');
    final totalAttendance = getCount('totalAttendanceRecords');

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Colors.indigo, Colors.blue]),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.indigo.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 5))],
      ),
      child: Column(
        children: [
          const Text("Drive Performance", style: TextStyle(color: Colors.white70, fontSize: 16)),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _headerStat("Drives", totalDrives.toString()),
              Container(width: 1, height: 40, color: Colors.white24),
              _headerStat("Attendees", totalAttendance.toString()),
            ],
          ),
        ],
      ),
    );
  }

  Widget _headerStat(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 14)),
      ],
    );
  }

  Widget _buildBranchStats() {
    final List branchStats = _analytics?['attendanceByBranch'] ?? [];
    if (branchStats.isEmpty) {
      return const Center(child: Padding(padding: EdgeInsets.all(40), child: Text("No records for this company yet.")));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Branch Breakdown", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),
        ...branchStats.map((stat) => _branchCard(stat as Map<String, dynamic>)),
      ],
    );
  }

  Widget _branchCard(Map<String, dynamic> stat) {
    final branch = stat['branch'] ?? 'Unknown';
    final present = stat['present_count'] ?? 0;
    final absent = stat['absent_count'] ?? 0;
    final rate = double.tryParse(stat['attendance_rate'].toString()) ?? 0.0;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(branch, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: rate > 70 ? Colors.green.withValues(alpha: 0.1) : Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text("$rate%", style: TextStyle(color: rate > 70 ? Colors.green : Colors.orange, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: LinearProgressIndicator(
                value: rate / 100,
                backgroundColor: Colors.grey[200],
                valueColor: AlwaysStoppedAnimation<Color>(rate > 70 ? Colors.green : Colors.orange),
                minHeight: 8,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _miniStat("Present", present.toString(), Colors.green),
                _miniStat("Absent", absent.toString(), Colors.red),
                _miniStat("Total", (present + absent).toString(), Colors.blue),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _miniStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}
