# Enhanced Attendance Management System

A comprehensive dual-login attendance management system with admin and student portals, built with React, Node.js, and SQLite.

## 🚀 Features

### Admin Portal
- **File Management**: Upload Excel attendance files for specific branches
- **Dashboard Analytics**: View statistics and recent activity
- **User Management**: Manage student and admin accounts
- **Branch-based Organization**: Organize files by academic branches
- **Real-time Monitoring**: Track attendance submissions and statistics

### Student Portal
- **Branch-specific Access**: Students only see files for their branch
- **Interactive Attendance Marking**: Easy-to-use interface for marking attendance
- **Real-time Updates**: Instant feedback and statistics
- **Attendance History**: View and modify previously marked attendance
- **Excel File Processing**: Automatic parsing of uploaded Excel files

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin and student role separation
- **Branch-level Security**: Students can only access their branch data
- **Password Hashing**: Secure bcrypt password storage

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Lucide Icons
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Authentication**: JWT, bcrypt
- **File Processing**: XLSX, Multer
- **Email**: Nodemailer
- **PDF Generation**: jsPDF

## 📋 Prerequisites

- Node.js (v20.16.0 or higher)
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/uday4386/Attendance_Placements_2K26.git
cd Attendance_Placements_2K26
npm install
```

### 2. Environment Setup
The `.env` file is already configured with default settings. For production, update:
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production-2024
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 3. Start the Servers

**Backend Server (Terminal 1):**
```bash
node server.js
```

**Frontend Server (Terminal 2):**
```bash
npm run dev
```

### 4. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 👥 Default Login Credentials

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Capabilities**: Upload files, manage users, view all data

### Student Accounts
- **CSE Student**: `student_cse` / `student123`
- **ECE Student**: `student_ece` / `student123`
- **MECH Student**: `student_mech` / `student123`

## 📊 How It Works

### Admin Workflow
1. **Login** with admin credentials
2. **Upload Excel Files** with student data for specific branches
3. **Monitor Dashboard** for statistics and activity
4. **Manage Users** and view attendance records

### Student Workflow
1. **Login** with student credentials
2. **View Available Files** for their branch
3. **Mark Attendance** by clicking on students in the list
4. **Save Attendance** data to the system
5. **Review Statistics** and attendance rates

### Excel File Format
Your Excel files should contain these columns (case-insensitive):
- **Name** (required): Student names
- **Roll/ID/Registration**: Student roll numbers
- **Branch/Department**: Academic branch
- **Mobile/Phone/Contact**: Contact numbers

Example:
```
Name          | Roll Number | Branch | Mobile
John Doe      | CSE001     | CSE    | 9876543210
Jane Smith    | CSE002     | CSE    | 9876543211
```

## 🔧 API Endpoints

### Authentication
- `POST /login` - User login
- `POST /register` - Create new user (Admin only)

### File Management
- `GET /files` - Get files (filtered by user role)
- `POST /upload-file` - Upload Excel file (Admin only)
- `DELETE /files/:id` - Delete file (Admin only)

### Attendance
- `POST /attendance/:fileId` - Save attendance (Students only)
- `GET /attendance/:fileId` - Get attendance records

### Admin
- `GET /admin/stats` - Dashboard statistics
- `GET /admin/users` - User management

## 🗄️ Database Schema

### Users Table
- `id`: Primary key
- `username`: Unique username
- `password`: Hashed password
- `role`: 'admin' or 'student'
- `branch`: Student's branch (for students)
- `email`: User email

### Files Table
- `id`: Primary key
- `filename`: Stored filename
- `original_name`: Original filename
- `branch`: Target branch
- `uploaded_by`: Admin user ID
- `upload_date`: Upload timestamp

### Attendance Records Table
- `id`: Primary key
- `file_id`: Reference to files table
- `student_id`: Reference to users table
- `student_name`: Student name from Excel
- `student_roll`: Student roll number
- `student_branch`: Student branch
- `status`: 'present' or 'absent'
- `marked_at`: Timestamp

## 🔒 Security Features

1. **JWT Authentication**: All API endpoints are protected
2. **Role-based Access**: Different permissions for admin/student
3. **Branch Isolation**: Students only access their branch data
4. **Input Validation**: Server-side validation for all inputs
5. **File Type Validation**: Only Excel files allowed for upload
6. **SQL Injection Protection**: Parameterized queries

## 📱 Mobile-Responsive Design

The application is fully responsive and optimized for:
- Desktop computers
- Tablets
- Mobile phones
- Touch interfaces

## 🚀 Deployment

### Production Setup
1. Update environment variables in `.env`
2. Change JWT_SECRET to a secure random string
3. Configure proper SMTP credentials
4. Set up a production database (PostgreSQL/MySQL)
5. Use PM2 or similar for process management

### Docker Deployment (Optional)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001 5173
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section below

## 🔧 Troubleshooting

### Common Issues

**1. "Network error" on login**
- Ensure backend server is running on port 3001
- Check if CORS is properly configured

**2. "File upload failed"**
- Verify Excel file format matches expected columns
- Check file size limits (10MB max)
- Ensure admin permissions

**3. "Database error"**
- Delete `attendance.db` file to reset database
- Restart the server to recreate tables

**4. "Token expired" errors**
- Logout and login again
- Check system clock synchronization

### Development Tips

1. **Hot Reload**: Frontend changes auto-reload
2. **Database Reset**: Delete `attendance.db` to start fresh
3. **Logs**: Check console for detailed error messages
4. **API Testing**: Use Postman or similar tools for API testing

## 🎯 Future Enhancements

- [ ] Email notifications for attendance
- [ ] Bulk user import/export
- [ ] Advanced reporting and analytics
- [ ] Mobile app version
- [ ] Integration with existing LMS systems
- [ ] Biometric attendance integration
- [ ] Real-time notifications
- [ ] Advanced user roles and permissions

---

**Built with ❤️ for educational institutions and organizations**