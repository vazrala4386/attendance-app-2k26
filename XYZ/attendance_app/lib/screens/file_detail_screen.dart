import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:file_picker/file_picker.dart';
import '../models.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class FileDetailScreen extends StatefulWidget {
  final AttendanceFile file;
  final VoidCallback onFileDeleted;

  const FileDetailScreen({super.key, required this.file, required this.onFileDeleted});

  @override
  State<FileDetailScreen> createState() => _FileDetailScreenState();
}

class _FileDetailScreenState extends State<FileDetailScreen> {
  bool _isLoading = false;
  Map<String, dynamic>? _reportData;

  // View Report (Generate PDF)
  Future<void> _viewReport() async {
    setState(() => _isLoading = true);
    try {
      final token = Provider.of<AuthProvider>(context, listen: false).token!;
      final data = await ApiService().getReportData(token, widget.file.id);
      
      setState(() {
        _reportData = data;
        _isLoading = false;
      });

      // Generate PDF
      await _generateAndShowPdf(data);

    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }



  // Email Report
  Future<void> _emailReport() async {
    // Show dialog to get email
    final emailController = TextEditingController();
    
    final proceed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Send Report via Email'),
        content: TextField(
          controller: emailController,
          decoration: const InputDecoration(labelText: 'Recipient Email'),
          keyboardType: TextInputType.emailAddress,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Send')),
        ],
      ),
    );

    if (proceed == true && emailController.text.isNotEmpty) {
      setState(() => _isLoading = true);
      try {
        final token = Provider.of<AuthProvider>(context, listen: false).token!;
        
        // Fetch data if not already
        var data = _reportData;
        if (data == null) {
          data = await ApiService().getReportData(token, widget.file.id);
          setState(() => _reportData = data);
        }

        // Generate PDF bytes
        final pdf = pw.Document();
        final records = (data!['records'] as List).map((e) => e as Map<String, dynamic>).toList();
        
        pdf.addPage(
           pw.MultiPage(
            pageFormat: PdfPageFormat.a4,
            build: (pw.Context context) {
              return [
                pw.Header(level: 0, child: pw.Text('Attendance Report: ${widget.file.companyName}')),
                pw.TableHelper.fromTextArray(
                  headers: ['Roll', 'Name', 'Branch', 'Status'],
                  data: records.map((r) => [
                    r['student_roll'] ?? '',
                    r['student_name'] ?? '',
                    r['student_branch'] ?? '',
                    r['status']?.toString().toUpperCase() ?? ''
                  ]).toList(),
                )
              ];
            }
          )
        );
        
        final pdfBytes = await pdf.save();
        final base64Pdf = base64Encode(pdfBytes);

        await ApiService().sendEmailWithPDF(
          token, 
          emailController.text.trim(), 
          'Attendance Report: ${widget.file.companyName}', 
          'Please find the attached attendance report.', 
          base64Pdf, 
          'Report_${widget.file.originalName}.pdf'
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Email sent successfully!')));
        }

      } catch (e) {
        if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error sending email: $e')));
        }
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }

  // Delete File
  Future<void> _deleteFile() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete File'),
        content: const Text('Are you sure you want to delete this file? This will delete all attendance records associated with it.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true), 
            child: const Text('Delete')
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isLoading = true);
      try {
        final token = Provider.of<AuthProvider>(context, listen: false).token!;
        await ApiService().deleteFile(token, widget.file.id);
        
        if (mounted) {
          Navigator.pop(context); // Close details
          widget.onFileDeleted(); // Refresh parent list
        }
      } catch (e) {
        if (mounted) {
           setState(() => _isLoading = false);
           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error deleting file: $e')));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.file.companyName),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Overview'),
              Tab(text: 'Present'),
              Tab(text: 'Absent'),
            ],
          ),
          actions: [
             IconButton(
            icon: const Icon(Icons.delete),
            onPressed: _isLoading ? null : _deleteFile,
          )
          ],
        ),
        body: _isLoading 
            ? const Center(child: CircularProgressIndicator())
            : FutureBuilder<Map<String, dynamic>>(
                future: _reportData == null ? ApiService().getReportData(Provider.of<AuthProvider>(context, listen: false).token!, widget.file.id) : Future.value(_reportData),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting && _reportData == null) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text("Error: ${snapshot.error}"));
                  }
                  
                  final data = snapshot.data!;
                  _reportData = data; // Cache it
                  final records = (data['records'] as List).map((e) => e as Map<String, dynamic>).toList();
                  final present = records.where((r) => r['status'] == 'present').toList();
                  final absent = records.where((r) => r['status'] == 'absent').toList();
                  
                  return TabBarView(
                    children: [
                      // Overview Tab
                      _buildOverviewTab(data, present.length, absent.length),
                      // Present Tab
                      _buildStudentList(present, true),
                      // Absent Tab
                      _buildStudentList(absent, false),
                    ],
                  );
                },
              ),
      ),
    );
  }

  Widget _buildOverviewTab(Map<String, dynamic> data, int presentCount, int absentCount) {
    final total = presentCount + absentCount;
    final presentPct = total == 0 ? 0 : (presentCount / total * 100).toStringAsFixed(1);
    final absentPct = total == 0 ? 0 : (absentCount / total * 100).toStringAsFixed(1);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
             padding: const EdgeInsets.all(16),
             child: Column(
                children: [
                  Text("Attendance Summary", style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatCircle("Present", presentCount, "$presentPct%", Colors.green),
                      _buildStatCircle("Absent", absentCount, "$absentPct%", Colors.red),
                    ],
                  ),
                  const SizedBox(height: 20),
                   Text("Total Students: $total", style: const TextStyle(fontWeight: FontWeight.bold)),
                ],
             ),
          ),
        ),
        const SizedBox(height: 20),
        ElevatedButton.icon(
          onPressed: () => _generateAndShowPdf(data), 
          icon: const Icon(Icons.picture_as_pdf),
          label: const Text('Download Detailed PDF Report'),
          style: ElevatedButton.styleFrom(padding: const EdgeInsets.all(16)),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _emailReport, 
          icon: const Icon(Icons.email),
          label: const Text('Email PDF Report'),
          style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16)),
        ),
      ],
    );
  }

  Widget _buildStatCircle(String label, int count, String pct, Color color) {
    return Column(
      children: [
        Container(
          width: 80, height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 4),
          ),
          child: Center(child: Text(pct, style: TextStyle(fontWeight: FontWeight.bold, color: color))),
        ),
        const SizedBox(height: 8),
        Text("$label: $count", style: const TextStyle(fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildStudentList(List<Map<String, dynamic>> students, bool isPresent) {
    if (students.isEmpty) return const Center(child: Text("No students found."));
    return ListView.separated(
      itemCount: students.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (ctx, i) {
        final s = students[i];
        return ListTile(
          leading: Icon(isPresent ? Icons.check_circle : Icons.cancel, color: isPresent ? Colors.green : Colors.red),
          title: Text(s['student_name'] ?? 'Unknown'),
          subtitle: Text("${s['student_roll']} • ${s['student_branch']}"),
        );
      },
    );
  }

  Future<void> _generateAndShowPdf(Map<String, dynamic> data) async {
    final pdf = pw.Document();
    final records = (data['records'] as List).map((e) => e as Map<String, dynamic>).toList();
    
    // Split Data
    final present = records.where((r) => r['status'] == 'present').toList();
    final absent = records.where((r) => r['status'] == 'absent').toList();

    // Summary Page
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            mainAxisAlignment: pw.MainAxisAlignment.center,
            children: [
              pw.Header(level: 0, child: pw.Text("Placement Attendance Report")),
              pw.SizedBox(height: 20),
              pw.Text("Company: ${widget.file.companyName}", style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
              pw.Text("Date: ${widget.file.uploadDate.substring(0, 10)}"),
              pw.SizedBox(height: 40),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
                children: [
                   _pdfStatBlock("Total", records.length.toString(), PdfColors.blue),
                   _pdfStatBlock("Present", present.length.toString(), PdfColors.green),
                   _pdfStatBlock("Absent", absent.length.toString(), PdfColors.red),
                ]
              ),
              pw.SizedBox(height: 40),
              pw.Text("Detailed lists pending on next pages."),
            ],
          );
        },
      ),
    );

    // Present List Page
    if (present.isNotEmpty) {
      pdf.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          build: (context) => [
            pw.Header(level: 1, child: pw.Text("Present Candidates (${present.length})", style: pw.TextStyle(color: PdfColors.green, fontWeight: pw.FontWeight.bold))),
            _buildPdfTable(present),
          ]
        )
      );
    }

    // Absent List Page
    if (absent.isNotEmpty) {
      pdf.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          build: (context) => [
            pw.Header(level: 1, child: pw.Text("Absent Candidates (${absent.length})", style: pw.TextStyle(color: PdfColors.red, fontWeight: pw.FontWeight.bold))),
            _buildPdfTable(absent),
          ]
        )
      );
    }

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Report_${widget.file.companyName}.pdf',
    );
  }

  pw.Widget _pdfStatBlock(String label, String value, PdfColor color) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(20),
      decoration: pw.BoxDecoration(
        border: pw.Border.all(color: color, width: 2),
        borderRadius: pw.BorderRadius.circular(10),
      ),
      child: pw.Column(
        children: [
          pw.Text(value, style: pw.TextStyle(fontSize: 24, fontWeight: pw.FontWeight.bold, color: color)),
          pw.Text(label),
        ]
      )
    );
  }

  pw.Widget _buildPdfTable(List<Map<String, dynamic>> records) {
    return pw.TableHelper.fromTextArray(
      headers: ['Roll No', 'Name', 'Branch'],
      data: records.map((r) => [
        r['student_roll']?.toString() ?? '',
        r['student_name']?.toString() ?? '',
        r['student_branch']?.toString() ?? '',
      ]).toList(),
      headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
      headerDecoration: const pw.BoxDecoration(color: PdfColors.grey300),
      cellAlignment: pw.Alignment.centerLeft,
    );
  }
}
