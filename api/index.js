import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import fs from 'fs';
import XLSX from 'xlsx';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const BUCKET_NAME = 'attendance-files';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads directory exists (Use /tmp for Vercel)
const isVercel = process.env.VERCEL === '1';
const uploadsDir = isVercel ? join('/tmp', 'uploads') : join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Using Supabase for database');

// Multer configuration for file uploads
// Multer configuration for file uploads (Use MemoryStorage for Serverless)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        console.log('File filter check:', {
            mimetype: file.mimetype,
            originalname: file.originalname
        });

        if (file.mimetype.includes('spreadsheet') ||
            file.mimetype.includes('csv') ||
            file.originalname.endsWith('.xlsx') ||
            file.originalname.endsWith('.xls') ||
            file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed!'), false);
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Admin middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Authentication Routes

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    console.log(`Login attempt for username: ${username}`);

    // Handle both admin and student login with database lookup
    supabase.from('users').select('*').eq('username', username).single()
        .then(({ data: user, error }) => {
            if (error) {
                console.error(`Login error for ${username}:`, error.message);
                if (error.code === 'PGRST116') return res.status(401).json({ error: 'Invalid credentials' });
                return res.status(500).json({ error: 'Database error: ' + error.message });
            }

            if (!user) {
                console.log(`User not found: ${username}`);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const isMatch = bcrypt.compareSync(password, user.password);
            if (!isMatch) {
                console.log(`Invalid password for user: ${username}`);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            console.log(`Login successful for user: ${username}`);

            const token = jwt.sign(
                {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    branch: user.branch
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    branch: user.branch,
                    email: user.email
                }
            });
        });
});

// Register endpoint (for creating new users)
app.post('/register', authenticateToken, requireAdmin, (req, res) => {
    const { username, password, role, branch, email } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Username, password, and role required' });
    }

    if (role === 'student' && !branch) {
        return res.status(400).json({ error: 'Branch required for student accounts' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    supabase.from('users').insert([
        { username, password: hashedPassword, role, branch, email }
    ]).select().single()
        .then(({ data, error }) => {
            if (error) {
                if (error.code === '23505') {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Database error: ' + error.message });
            }

            res.json({
                message: 'User created successfully',
                userId: data.id
            });
        });
});

// File Management Routes

// Test endpoint for debugging
app.get('/test-upload', authenticateToken, requireAdmin, (req, res) => {
    res.json({
        message: 'Upload endpoint is accessible',
        user: req.user.username,
        timestamp: new Date().toISOString()
    });
});

// Upload file (Admin only)
// Upload file (Admin only)
app.post('/upload-file', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
    console.log('Upload request received');

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { company_name } = req.body;
    if (!company_name) {
        return res.status(400).json({ error: 'Company name is required' });
    }

    try {
        const uniqueFilename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '-' + req.file.originalname;

        // 1. Upload to Supabase Storage (From Memory)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(uniqueFilename, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error('Supabase Storage Error:', uploadError);
            return res.status(500).json({ error: 'Storage error: ' + uploadError.message });
        }

        // 2. Save metadata to Database
        const { data, error: dbError } = await supabase.from('files').insert([
            {
                filename: uniqueFilename, // Use the generated filename
                original_name: req.file.originalname,
                branch: 'ALL',
                company_name: company_name,
                uploaded_by: req.user.id
            }
        ]).select().single();

        if (dbError) {
            console.error('Database error:', dbError);
            // Optional: try to delete the uploaded file if DB fails
            return res.status(500).json({ error: 'Database error: ' + dbError.message });
        }

        res.json({
            message: 'File uploaded successfully',
            fileId: data.id,
            filename: uniqueFilename,
            originalName: req.file.originalname,
            companyName: company_name
        });
    } catch (err) {
        console.error('Upload process error:', err);
        res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
});

// Helper: Standard Branches
const ALL_BRANCHES = ['CSE', 'AIML', 'CSD', 'ECE', 'MCA'];

// Helper: Branch Matching Logic
const getNormalizedBranch = (rawBranch) => {
    if (!rawBranch) return 'UNKNOWN';
    const branch = rawBranch.toString().toUpperCase().trim();

    // Specific checks first (AIML, CSD, MCA) to avoid "Computer Science" catching them

    // AIML
    if (branch.includes('AIML') ||
        branch.includes('AI&ML') ||
        branch.includes('AI & ML') ||
        branch.includes('AI-ML') ||
        branch.includes('CSM') ||
        branch.includes('MACHINE LEARNING') ||
        (branch.includes('ARTIFICIAL') && branch.includes('INTELLIGENCE')) ||
        (branch.includes('CSE') && (branch.includes('AI') || branch.includes('ML')))) {
        return 'AIML';
    }

    // CSD (Data Science)
    if (branch.includes('CSD') ||
        branch.includes('DATA SCIENCE') ||
        branch.includes('CSE-DS') ||
        branch.includes('CSE DS') ||
        (branch.includes('CSE') && branch.includes('DATA'))) {
        return 'CSD';
    }

    // MCA
    if (branch.includes('MCA') || branch.includes('MASTER') || branch.includes('APPLICATION')) {
        return 'MCA';
    }

    // ECE
    if (branch === 'ECE' || branch.includes('ELECTRONICS') || branch.includes('COMMUNICATION')) {
        return 'ECE';
    }

    // CSE (General) - Check this LAST to act as fallback for "Computer Science"
    if (branch === 'CSE' ||
        branch.includes('COMPUTER SCIENCE') ||
        branch.includes('CSE')) {
        return 'CSE';
    }

    return 'UNKNOWN'; // Or keep original if needed, but normalizing helps
};

// Get files (Admin sees all with pending info, Students see relevant)
app.get('/files', authenticateToken, async (req, res) => {
    try {
        let filesQuery = supabase.from('files').select('*, users!uploaded_by(username)');

        if (req.user.role === 'student') {
            // Students only see files they haven't marked attendance for yet
            const { data: markedFiles, error: markedError } = await supabase
                .from('attendance_records')
                .select('file_id')
                .eq('student_id', req.user.id)
                .eq('student_branch', req.user.branch);

            if (markedError) throw markedError;

            const markedIds = markedFiles.map(m => m.file_id);
            if (markedIds.length > 0) {
                filesQuery = filesQuery.not('id', 'in', `(${markedIds.join(',')})`);
            }
        }

        const { data: files, error: filesError } = await filesQuery.order('upload_date', { ascending: false });
        if (filesError) throw filesError;

        // If Student, just return files
        if (req.user.role === 'student') {
            return res.json(files.map(f => ({ ...f, uploaded_by_name: f.users?.username })));
        }

        // If Admin, calculate pending branches for each file
        const filesWithPending = await Promise.all(files.map(async (file) => {
            const { data: records, error: recordsError } = await supabase
                .from('attendance_records')
                .select('student_branch')
                .eq('file_id', file.id);

            const submitted = records ? [...new Set(records.map(r => r.student_branch))] : [];
            const pending = ALL_BRANCHES.filter(b => !submitted.includes(b));

            return {
                ...file,
                uploaded_by_name: file.users?.username,
                pending_branches: pending,
                submitted_branches: submitted
            };
        }));

        res.json(filesWithPending);
    } catch (err) {
        console.error('Error fetching files:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Get specific file details
app.get('/files/:id', authenticateToken, async (req, res) => {
    const fileId = req.params.id;

    try {
        let query = supabase.from('files').select('*, users!uploaded_by(username)').eq('id', fileId);

        // Students can only access files from their branch
        if (req.user.role === 'student') {
            query = query.eq('branch', req.user.branch);
        }

        const { data: file, error } = await query.single();

        if (error) {
            if (error.code === 'PGRST116') return res.status(404).json({ error: 'File not found or access denied' });
            throw error;
        }

        res.json({ ...file, uploaded_by_name: file.users?.username });
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Parse and return file contents (Helper for Mobile App)
app.get('/files/:id/contents', authenticateToken, async (req, res) => {
    const fileId = req.params.id;

    try {
        const { data: file, error } = await supabase.from('files').select('*').eq('id', fileId).single();
        if (error) return res.status(500).json({ error: 'Database error: ' + error.message });
        if (!file) return res.status(404).json({ error: 'File not found' });

        // Download from Supabase Storage
        const { data: fileBuffer, error: downloadError } = await supabase.storage
            .from(BUCKET_NAME)
            .download(file.filename);

        if (downloadError) {
            console.error('Storage Download Error:', downloadError);
            return res.status(404).json({ error: 'Physical file not found in storage' });
        }

        const arrayBuffer = await fileBuffer.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Headers analysis
        const headers = data[0] || [];
        const lowerHeaders = headers.map(h => (h || '').toString().toLowerCase());

        const getIndex = (keywords) => lowerHeaders.findIndex(h => keywords.some(k => h.includes(k)));

        const nameIndex = getIndex(['name', 'student', 'employee']);
        const rollIndex = getIndex(['roll', 'id', 'reg', 'usn']);
        const branchIndex = getIndex(['branch', 'dept', 'department', 'stream']);
        const mobileIndex = getIndex(['mobile', 'phone', 'contact']);

        if (nameIndex === -1) {
            return res.status(400).json({ error: "Could not find a 'Name' column" });
        }

        // Extract and filter students
        let students = data.slice(1)
            .filter(row => row[nameIndex])
            .map((row, index) => {
                const rawBranch = branchIndex !== -1 ? row[branchIndex] : (req.user.branch || 'Unknown');
                return {
                    id: index,
                    name: row[nameIndex],
                    roll: rollIndex !== -1 ? row[rollIndex] : 'N/A',
                    branch: rawBranch,
                    normalized_branch: getNormalizedBranch(rawBranch),
                    mobile: mobileIndex !== -1 ? row[mobileIndex] : 'N/A',
                    status: 'absent'
                };
            });

        if (req.user.role === 'student') {
            const userBranch = req.user.branch;
            students = students.filter(student => student.normalized_branch === userBranch);
        }

        res.json(students);

    } catch (parseError) {
        console.error('Error processing file contents:', parseError);
        res.status(500).json({ error: 'Failed to process file contents' });
    }
});

// Delete file (Admin only)
app.delete('/files/:id', authenticateToken, requireAdmin, async (req, res) => {
    const fileId = req.params.id;

    try {
        const { data: file, error: fetchError } = await supabase.from('files').select('filename').eq('id', fileId).single();
        if (fetchError || !file) return res.status(404).json({ error: 'File not found' });

        // Delete from Supabase Storage
        await supabase.storage.from(BUCKET_NAME).remove([file.filename]);

        // Cleanup local file if it exists (legacy)
        const filePath = join(uploadsDir, file.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database
        await supabase.from('attendance_records').delete().eq('file_id', fileId);
        const { error: deleteError } = await supabase.from('files').delete().eq('id', fileId);

        if (deleteError) throw deleteError;

        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Check if student has already marked attendance for a file
app.get('/attendance-status/:fileId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Only students can check attendance status' });
    }

    const fileId = req.params.fileId;

    const { count, error } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .eq('file_id', fileId)
        .eq('student_id', req.user.id)
        .eq('student_branch', req.user.branch);

    if (error) {
        return res.status(500).json({ error: 'Database error: ' + error.message });
    }

    res.json({
        hasMarkedAttendance: (count || 0) > 0,
        fileId: fileId,
        studentBranch: req.user.branch
    });
});

// Attendance Management Routes

// Save attendance (Students only)
app.post('/attendance/:fileId', authenticateToken, async (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Only students can mark attendance' });
    }

    const fileId = req.params.fileId;
    const { attendanceData } = req.body;

    if (!attendanceData || !Array.isArray(attendanceData)) {
        return res.status(400).json({ error: 'Invalid attendance data' });
    }

    try {
        const { data: file, error: fileError } = await supabase.from('files').select('*').eq('id', fileId).single();
        if (fileError || !file) return res.status(404).json({ error: 'File not found' });

        const recordsToSave = attendanceData.filter(r => {
            const branch = r.normalized_branch || getNormalizedBranch(r.branch);
            return branch === req.user.branch;
        });

        if (recordsToSave.length === 0) {
            return res.json({
                message: 'No relevant records to save for your branch.',
                branch: req.user.branch,
                fileRemoved: true
            });
        }

        // Delete existing records for this student and file
        await supabase.from('attendance_records').delete().eq('file_id', fileId).eq('student_id', req.user.id);

        // Bulk insert records
        const { error: insertError } = await supabase.from('attendance_records').insert(
            recordsToSave.map(record => ({
                file_id: fileId,
                student_id: req.user.id,
                student_name: record.name,
                student_roll: record.roll,
                student_branch: req.user.branch,
                status: record.status
            }))
        );

        if (insertError) throw insertError;

        // Check completion
        const { data: branches, error: branchError } = await supabase
            .from('attendance_records')
            .select('student_branch')
            .eq('file_id', fileId);

        if (branchError) throw branchError;

        const uniqueBranches = [...new Set(branches.map(b => b.student_branch))];
        if (uniqueBranches.length >= 5) {
            await supabase.from('files').update({ is_completed: true }).eq('id', fileId);
        }

        res.json({
            message: `Attendance saved successfully for ${req.user.branch}`,
            branch: req.user.branch,
            recordsSaved: recordsToSave.length,
            fileRemoved: true
        });
    } catch (err) {
        console.error('Error saving attendance:', err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Get attendance records for a file (Admin sees all, Students see only their own)
app.get('/attendance/:fileId', authenticateToken, async (req, res) => {
    const fileId = req.params.fileId;

    try {
        let query = supabase
            .from('attendance_records')
            .select('*, files!file_id(original_name, branch)')
            .eq('file_id', fileId);

        if (req.user.role === 'student') {
            query = query.eq('student_id', req.user.id);
        }

        const { data: records, error } = await query.order('marked_at', { ascending: false });

        if (error) throw error;

        res.json(records.map(r => ({
            ...r,
            original_name: r.files?.original_name,
            file_branch: r.files?.branch
        })));
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Get list of companies (Admin only)
app.get('/admin/companies', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.from('files').select('company_name');
        if (error) throw error;

        const uniqueCompanies = [...new Set(data.map(c => c.company_name))].sort();
        res.json(uniqueCompanies);
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Get comprehensive admin analytics with branch segregation
app.get('/admin/analytics', authenticateToken, requireAdmin, async (req, res) => {
    const { company } = req.query;

    try {
        const analytics = {};

        // 1. Total Files
        let filesQuery = supabase.from('files').select('id', { count: 'exact', head: true });
        if (company) filesQuery = filesQuery.eq('company_name', company);
        const { count: totalFiles } = await filesQuery;
        analytics.totalFiles = [{ count: totalFiles || 0 }];

        // 2. Total Students
        const { count: totalStudents } = await supabase.from('users')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'student')
            .in('username', ['CSE_2K26', 'AIML_2K26', 'CSD_2K26', 'ECE_2K26', 'MCA_2K26']);
        analytics.totalStudents = [{ count: totalStudents || 0 }];

        // 3. Attendance Records
        let recordsQuery = supabase.from('attendance_records').select('id', { count: 'exact', head: true });
        if (company) {
            // Need to join with files to filter by company
            const { data: fileIds } = await supabase.from('files').select('id').eq('company_name', company);
            const ids = fileIds.map(f => f.id);
            if (ids.length > 0) recordsQuery = recordsQuery.in('file_id', ids);
            else recordsQuery = recordsQuery.eq('file_id', -1); // Force empty
        }
        const { count: totalAttendanceRecords } = await recordsQuery;
        analytics.totalAttendanceRecords = [{ count: totalAttendanceRecords || 0 }];

        // 4. Attendance by Branch
        let branchStatsQuery = supabase.from('attendance_records').select('student_branch, status');
        if (company) {
            const { data: fileIds } = await supabase.from('files').select('id').eq('company_name', company);
            branchStatsQuery = branchStatsQuery.in('file_id', fileIds.map(f => f.id));
        }
        const { data: branchRecords } = await branchStatsQuery;

        const branchMap = {};
        (branchRecords || []).forEach(r => {
            if (!branchMap[r.student_branch]) branchMap[r.student_branch] = { total: 0, present: 0, absent: 0 };
            branchMap[r.student_branch].total++;
            if (r.status === 'present') branchMap[r.student_branch].present++;
            else branchMap[r.student_branch].absent++;
        });
        analytics.attendanceByBranch = Object.entries(branchMap).map(([branch, stats]) => ({
            branch,
            total_records: stats.total,
            present_count: stats.present,
            absent_count: stats.absent,
            attendance_rate: stats.total > 0 ? (stats.present * 100 / stats.total).toFixed(2) : 0
        }));

        // 5. Recent Activity & File Summary
        let recentFilesQuery = supabase.from('files').select('*, users!uploaded_by(username)');
        if (company) recentFilesQuery = recentFilesQuery.eq('company_name', company);
        const { data: files } = await recentFilesQuery.order('upload_date', { ascending: false }).limit(20);

        analytics.recentActivity = await Promise.all((files || []).map(async f => {
            const { data: recs } = await supabase.from('attendance_records').select('student_branch').eq('file_id', f.id);
            const branches = [...new Set(recs.map(r => r.student_branch))];
            return {
                ...f,
                uploaded_by: f.users?.username,
                attendance_submissions: recs.length,
                branches_submitted: branches.join(',')
            };
        }));

        analytics.fileAttendanceSummary = await Promise.all((files || []).map(async f => {
            const { data: recs } = await supabase.from('attendance_records').select('student_branch, status').eq('file_id', f.id);
            const branches = [...new Set(recs.map(r => r.student_branch))];
            const present = recs.filter(r => r.status === 'present').length;
            const absent = recs.filter(r => r.status === 'absent').length;
            return {
                ...f,
                branches_submitted: branches.length,
                total_records: recs.length,
                present_count: present,
                absent_count: absent,
                attendance_rate: recs.length > 0 ? (present * 100 / recs.length).toFixed(2) : 0
            };
        }));

        res.json(analytics);
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Analytics error: ' + err.message });
    }
});

// Get detailed attendance data for a specific file (Admin view)
app.get('/admin/file-attendance/:fileId', authenticateToken, requireAdmin, async (req, res) => {
    const fileId = req.params.id;

    try {
        const { data: records, error } = await supabase
            .from('attendance_records')
            .select('*, files!file_id(original_name, branch), users!student_id(username)')
            .eq('file_id', fileId)
            .order('student_branch')
            .order('student_roll');

        if (error) throw error;

        // Group by branch for better organization
        const groupedByBranch = records.reduce((acc, record) => {
            const branch = record.student_branch || 'Unknown';
            if (!acc[branch]) acc[branch] = [];
            acc[branch].push(record);
            return acc;
        }, {});

        res.json({
            records: records.map(r => ({
                ...r,
                original_name: r.files?.original_name,
                file_branch: r.files?.branch,
                marked_by_student: r.users?.username
            })),
            groupedByBranch,
            summary: {
                totalRecords: records.length,
                presentCount: records.filter(r => r.status === 'present').length,
                absentCount: records.filter(r => r.status === 'absent').length,
                branches: Object.keys(groupedByBranch)
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Generate comprehensive report data for PDF/Email
app.get('/admin/report/:fileId', authenticateToken, requireAdmin, async (req, res) => {
    const fileId = req.params.fileId;

    try {
        const { data: file, error: fileError } = await supabase.from('files').select('*, users!uploaded_by(username)').eq('id', fileId).single();
        if (fileError || !file) return res.status(404).json({ error: 'File not found' });

        const { data: records, error: recordsError } = await supabase.from('attendance_records').select('*').eq('file_id', fileId).order('student_branch').order('student_roll');
        if (recordsError) throw recordsError;

        const branchData = {};
        records.forEach(record => {
            const branch = record.student_branch || 'Unknown';
            if (!branchData[branch]) {
                branchData[branch] = { students: [], present: 0, absent: 0, total: 0 };
            }
            branchData[branch].students.push(record);
            branchData[branch].total++;
            if (record.status === 'present') branchData[branch].present++;
            else branchData[branch].absent++;
        });

        const overallStats = {
            totalStudents: records.length,
            totalPresent: records.filter(r => r.status === 'present').length,
            totalAbsent: records.filter(r => r.status === 'absent').length,
            overallAttendanceRate: records.length > 0 ? Math.round((records.filter(r => r.status === 'present').length / records.length) * 100) : 0
        };

        res.json({
            file: { ...file, uploaded_by_name: file.users?.username },
            branchData,
            overallStats,
            records,
            generatedAt: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Excel export endpoint
app.get('/admin/export-excel/:fileId', authenticateToken, requireAdmin, async (req, res) => {
    const fileId = req.params.fileId;

    try {
        const { data: file, error: fileError } = await supabase.from('files').select('*, users!uploaded_by(username)').eq('id', fileId).single();
        if (fileError || !file) return res.status(404).json({ error: 'File not found' });

        const { data: records, error: recordsError } = await supabase.from('attendance_records').select('*').eq('file_id', fileId).order('student_branch').order('student_roll');
        if (recordsError) throw recordsError;

        const workbook = XLSX.utils.book_new();
        const excelData = records.map(record => ({
            'Roll No': record.student_roll || 'N/A',
            'Student Name': record.student_name || 'N/A',
            'Branch': record.student_branch || 'N/A',
            'Status': record.status ? record.status.toUpperCase() : 'ABSENT',
            'Company': file.company_name || 'N/A',
            'File Name': file.original_name || 'N/A',
            'Date': new Date(record.marked_at).toLocaleDateString()
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Attendance_Report_${file.original_name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx"`);
        res.send(excelBuffer);
    } catch (err) {
        console.error('Excel export error:', err);
        res.status(500).json({ error: 'Error generating Excel file' });
    }
});

// Get all users (Admin only)
app.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, role, branch, email, created_at')
            .not('username', 'in', '("student_cse", "student_ece", "student_mech", "student_aiml", "student_csd", "student_mca")')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

// Change user password (Admin only)
app.put('/admin/users/:userId/password', authenticateToken, requireAdmin, async (req, res) => {
    const userId = req.params.userId;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    try {
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        const { data: user, error } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', userId)
            .select('username, role')
            .single();

        if (error) throw error;
        res.json({ message: `Password updated successfully for ${user.username}`, username: user.username, role: user.role });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// Bulk password reset (Admin only)
app.put('/admin/users/bulk/reset-passwords', authenticateToken, requireAdmin, async (req, res) => {
    const { userType, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    try {
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        let query = supabase.from('users').update({ password: hashedPassword });

        if (userType === 'students') {
            query = query.eq('role', 'student').in('username', ['CSE_2K26', 'AIML_2K26', 'CSD_2K26', 'ECE_2K26', 'MCA_2K26']);
        } else if (userType === 'all') {
            query = query.not('username', 'in', '("student_cse", "student_ece", "student_mech", "student_aiml", "student_csd", "student_mca")');
        } else {
            return res.status(400).json({ error: 'Invalid user type' });
        }

        const { data, error, count } = await query.select('id', { count: 'exact' });
        if (error) throw error;

        res.json({ message: `Password updated successfully for ${count} ${userType} users`, usersUpdated: count });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update passwords' });
    }
});

// Email sending endpoint (existing functionality with mobile-friendly PDF handling)
app.post('/send-email', async (req, res) => {
    const { recipientEmail, subject, message, pdfBase64, fileName } = req.body;

    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        return res.status(500).json({
            error: 'Server credentials not configured. Please check .env file.'
        });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD
            }
        });

        const cleanFileName = fileName ? fileName.replace(/[^a-zA-Z0-9._-]/g, '_') : 'Attendance_Report.pdf';

        const mailOptions = {
            from: process.env.SMTP_EMAIL,
            to: recipientEmail,
            subject: subject,
            text: message,
            attachments: [
                {
                    filename: cleanFileName,
                    content: pdfBase64,
                    encoding: 'base64',
                    contentType: 'application/pdf',
                    contentDisposition: 'attachment'
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        res.status(200).json({ success: true, message: 'Email sent successfully!' });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({
            error: 'Failed to send email. ' + error.message,
            details: error
        });
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 Enhanced Attendance Server running at:`);
        console.log(`   Local: http://localhost:${PORT}`);
        console.log(`   Network: http://0.0.0.0:${PORT}`);
        console.log(`📧 Configure your credentials in .env file`);
        console.log(`\n👤 Login Credentials:`);
        console.log(`   Admin: username=admin, password=admin123`);
        console.log(`\n🎓 Student Logins (password: student123):`);
        console.log(`   CSE Branch: username=CSE_2K26`);
        console.log(`   AIML Branch: username=AIML_2K26`);
        console.log(`   CSD Branch: username=CSD_2K26`);
        console.log(`   ECE Branch: username=ECE_2K26`);
        console.log(`   MCA Branch: username=MCA_2K26`);
        console.log(`\n📋 System Features:`);
        console.log(`   • All branches can mark attendance on the same files`);
        console.log(`   • Files are completed when all 5 branches submit attendance`);
        console.log(`   • Admin sees consolidated view of all branch activities`);
        console.log(`   • PDF reports show ALL students data with branch segregation`);
        console.log(`   • Excel export includes present and absent students with branches`);
        console.log(`\n📱 Mobile App: Use your computer's IP address instead of localhost`);
    });
}

export default app;
