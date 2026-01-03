class User {
  final int id;
  final String username;
  final String role;
  final String branch;
  final String? email;

  User({
    required this.id,
    required this.username,
    required this.role,
    required this.branch,
    this.email,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      username: json['username'],
      role: json['role'],
      branch: json['branch'] ?? '',
      email: json['email'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'role': role,
      'branch': branch,
      'email': email,
    };
  }
}

class AttendanceFile {
  final int id;
  final String filename;
  final String originalName;
  final String branch;
  final String companyName;
  final String uploadDate;
  final bool isCompleted;
  final List<String> pendingBranches;

  AttendanceFile({
    required this.id,
    required this.filename,
    required this.originalName,
    required this.branch,
    required this.companyName,
    required this.uploadDate,
    required this.isCompleted,
    this.pendingBranches = const [],
  });

  factory AttendanceFile.fromJson(Map<String, dynamic> json) {
    return AttendanceFile(
      id: json['id'],
      filename: json['filename'],
      originalName: json['original_name'],
      branch: json['branch'],
      companyName: json['company_name'] ?? 'Unknown',
      uploadDate: json['upload_date'],
      isCompleted: json['is_completed'] == 1 || json['is_completed'] == true,
      pendingBranches: (json['pending_branches'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }
}

class Student {
  final int id; // ID in the list/excel
  final String name;
  final dynamic roll; // Can be string or int
  final String branch;
  final String normalizedBranch;
  final String mobile;
  String status;

  Student({
    required this.id,
    required this.name,
    required this.roll,
    required this.branch,
    required this.mobile,
    this.normalizedBranch = 'UNKNOWN',
    this.status = 'absent',
  });

  factory Student.fromJson(Map<String, dynamic> json) {
    return Student(
      id: json['id'],
      name: json['name'],
      roll: json['roll'],
      branch: json['branch'],
      normalizedBranch: json['normalized_branch'] ?? 'UNKNOWN',
      mobile: json['mobile'].toString(),
      status: json['status'] ?? 'absent',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'roll': roll,
      'branch': branch,
      'normalized_branch': normalizedBranch,
      'mobile': mobile,
      'status': status,
    };
  }
}
