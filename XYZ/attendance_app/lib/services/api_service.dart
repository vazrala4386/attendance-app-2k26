import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as sb hide User;
import '../config.dart';
import '../models.dart';

class ApiService {
  final String baseUrl = Config.baseUrl;
  final sb.SupabaseClient supabase = sb.Supabase.instance.client;

  // Login
  Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(jsonDecode(response.body)['error'] ?? 'Login failed');
      }
    } catch (e) {
      throw Exception('Network Error: $e');
    }
  }

  // Get Files
  Future<List<AttendanceFile>> getFiles(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/files'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => AttendanceFile.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load files');
    }
  }

  // Upload File (Mobile)
  Future<void> uploadFile(String token, String filePath, String companyName) async {
    var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/upload-file'));
    request.headers['Authorization'] = 'Bearer $token';
    request.fields['company_name'] = companyName;

    MediaType? mimeType;
    if (filePath.endsWith('.xlsx')) {
        mimeType = MediaType('application', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else if (filePath.endsWith('.csv')) {
        mimeType = MediaType('text', 'csv');
    } else {
        mimeType = MediaType('application', 'octet-stream');
    }

    request.files.add(await http.MultipartFile.fromPath(
      'file', 
      filePath, 
      contentType: mimeType
    ));

    await _sendRequest(request);
  }

  // Upload File (Web)
  Future<void> uploadFileBytes(String token, List<int> fileBytes, String filename, String companyName) async {
    var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/upload-file'));
    request.headers['Authorization'] = 'Bearer $token';
    request.fields['company_name'] = companyName;

    MediaType? mimeType;
    if (filename.endsWith('.xlsx')) {
        mimeType = MediaType('application', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else if (filename.endsWith('.csv')) {
        mimeType = MediaType('text', 'csv');
    } else {
        mimeType = MediaType('application', 'octet-stream');
    }

    request.files.add(http.MultipartFile.fromBytes(
      'file', 
      fileBytes,
      filename: filename,
      contentType: mimeType
    ));

    await _sendRequest(request);
  }

  Future<void> _sendRequest(http.MultipartRequest request) async {
    var response = await request.send();
    if (response.statusCode != 200) {
      final respStr = await response.stream.bytesToString();
      print("SERVER ERROR BODY: $respStr"); // Log to console
      try {
        final json = jsonDecode(respStr);
        throw Exception(json['error'] ?? 'Upload failed with status ${response.statusCode}');
      } catch (e) {
        // If JSON parse fails, throw the raw string to see what happened
        throw Exception('Upload failed (${response.statusCode}): $respStr');
      }
    }
  }

  // Delete File (Admin only)
  Future<void> deleteFile(String token, int fileId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/files/$fileId'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to delete file');
    }
  }

  // Get Analytics (Admin only)
  Future<Map<String, dynamic>> getAnalytics(String token, {String? company}) async {
    final url = company != null 
        ? '$baseUrl/admin/analytics?company=${Uri.encodeComponent(company)}'
        : '$baseUrl/admin/analytics';
        
    final response = await http.get(
      Uri.parse(url),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load analytics');
    }
  }

  // Get Users (Admin only)
  Future<List<User>> getUsers(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/admin/users'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => User.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load users');
    }
  }

  // Reset Password (Admin only)
  Future<void> resetPassword(String token, int userId, String newPassword) async {
    final response = await http.put(
      Uri.parse('$baseUrl/admin/users/$userId/password'),
      headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json'
      },
      body: jsonEncode({'newPassword': newPassword}),
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['error'] ?? 'Failed to reset password');
    }
  }

  // Bulk Reset Password (Admin only)
  Future<void> bulkResetPassword(String token, String userType, String newPassword) async {
    final response = await http.put(
      Uri.parse('$baseUrl/admin/users/bulk/reset-passwords'),
      headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json'
      },
      body: jsonEncode({
        'userType': userType,
        'newPassword': newPassword
      }),
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['error'] ?? 'Failed to bulk reset passwords');
    }
  }

  // Get Report Data (for generating PDF)
  Future<Map<String, dynamic>> getReportData(String token, int fileId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/admin/report/$fileId'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load report data');
    }
  }

  // Send Email with PDF
  Future<void> sendEmailWithPDF(String token, String email, String subject, String message, String base64Pdf, String filename) async {
    final response = await http.post(
      Uri.parse('$baseUrl/send-email'),
      headers: {
        'Authorization': 'Bearer $token', // Assuming endpoint might benefit from auth even if open
        'Content-Type': 'application/json'
      },
      body: jsonEncode({
        'recipientEmail': email,
        'subject': subject,
        'message': message,
        'pdfBase64': base64Pdf,
        'fileName': filename
      }),
    );

    if (response.statusCode != 200) {
        throw Exception('Failed to send email');
    }
  }

  // Get Students for a File (Using new Server Helper)
  Future<List<Student>> getFileContents(int fileId, String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/files/$fileId/contents'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Student.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load students: ${response.statusCode}');
    }
  }
  
  // Check Existing Attendance
  Future<List<Map<String, dynamic>>> getExistingAttendance(int fileId, String token) async {
     final response = await http.get(
      Uri.parse('$baseUrl/attendance/$fileId'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

     if (response.statusCode == 200) {
      List<dynamic> data = jsonDecode(response.body);
      return data.map((e) => e as Map<String, dynamic>).toList();
    } else {
      return [];
    }
  }

  // Save Attendance
  Future<Map<String, dynamic>> saveAttendance(int fileId, List<Student> students, String token) async {
    try {
      // Convert students to JSON structure expected by backend
      final attendanceData = students.map((s) => s.toJson()).toList();

      final response = await http.post(
        Uri.parse('$baseUrl/attendance/$fileId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'attendanceData': attendanceData,
        }),
      ).timeout(const Duration(seconds: 60)); // Increased timeout to 60s for large files

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Server Error ${response.statusCode}: ${jsonDecode(response.body)['error'] ?? response.body}');
      }
    } catch (e) {
      // Pass the specific error up
      throw Exception('Connection Error: $e');
    }
  }
}
