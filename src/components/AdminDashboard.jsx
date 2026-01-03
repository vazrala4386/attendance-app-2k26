import { useState, useEffect } from 'react';
import { 
    Upload, 
    FileText, 
    Users, 
    BarChart3, 
    LogOut, 
    Trash2,
    TrendingUp,
    Download,
    Mail,
    FileSpreadsheet
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { API_BASE_URL } from '../config.js';

const AdminDashboard = ({ user, token, onLogout }) => {
    const [activeTab, setActiveTab] = useState('analytics');
    const [files, setFiles] = useState([]);
    const [analytics, setAnalytics] = useState({});
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState('all');
    const [companies, setCompanies] = useState([]);
    const [uploadForm, setUploadForm] = useState({
        file: null,
        companyName: ''
    });
    const [emailModal, setEmailModal] = useState({
        open: false,
        fileId: null,
        reportData: null
    });
    const [passwordModal, setPasswordModal] = useState({
        open: false,
        user: null,
        newPassword: '',
        confirmPassword: '',
        loading: false
    });
    const [bulkPasswordModal, setBulkPasswordModal] = useState({
        open: false,
        userType: 'students',
        newPassword: '',
        confirmPassword: '',
        loading: false
    });

    useEffect(() => {
        fetchCompanies();
        fetchAnalytics();
        fetchFiles();
        fetchUsers();
        
        // Set up auto-refresh for real-time updates every 30 seconds
        const interval = setInterval(() => {
            if (activeTab === 'analytics') {
                fetchAnalytics();
            }
            fetchFiles(); // Always refresh files for real-time status updates
        }, 30000);

        return () => clearInterval(interval);
    }, [activeTab, selectedCompany]);

    const fetchCompanies = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/companies`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setCompanies(data);
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const url = selectedCompany === 'all' 
                ? `${API_BASE_URL}/admin/analytics`
                : `${API_BASE_URL}/admin/analytics?company=${encodeURIComponent(selectedCompany)}`;
                
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    };

    const fetchFiles = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/files`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setFiles(data);
            }
        } catch (error) {
            console.error('Error fetching files:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        
        console.log('Upload form data:', uploadForm);
        
        if (!uploadForm.file) {
            alert('Please select a file');
            return;
        }

        if (!uploadForm.companyName.trim()) {
            alert('Please enter company name');
            return;
        }

        setLoading(true);
        
        try {
            const formData = new FormData();
            formData.append('file', uploadForm.file);
            formData.append('company_name', uploadForm.companyName.trim());

            console.log('Sending upload request...');
            
            const response = await fetch(`${API_BASE_URL}/upload-file`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            console.log('Upload response status:', response.status);

            if (!response.ok) {
                const error = await response.json();
                console.error('Upload error:', error);
                throw new Error(`Upload failed: ${error.error}`);
            }

            const result = await response.json();
            console.log('Upload successful:', result);
            
            alert('File uploaded successfully! All branches can now mark attendance.');
            setUploadForm({ file: null, companyName: '' });
            // Reset the file input
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.value = '';
            }
            fetchFiles();
            fetchAnalytics();
        } catch (error) {
            console.error('Upload error:', error);
            alert(error.message || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFile = async (fileId) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                alert('File deleted successfully!');
                fetchFiles();
                fetchAnalytics();
            } else {
                const error = await response.json();
                alert(error.error || 'Delete failed');
            }
        } catch (error) {
            alert('Network error during delete');
        }
    };
    const generateComprehensivePDF = async (fileId) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/admin/report/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch report data');
            }

            const reportData = await response.json();
            
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            let currentY = 20;

            // Header
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(99, 102, 241);
            doc.text('ATTENDANCE REPORT', pageWidth / 2, currentY, { align: "center" });
            currentY += 12;

            // File Information
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(0, 0, 0);
            doc.text(`File: ${reportData.file.original_name}`, 15, currentY);
            currentY += 6;
            doc.text(`Company: ${reportData.file.company_name || 'N/A'}`, 15, currentY);
            currentY += 6;
            doc.text(`Generated: ${new Date(reportData.generatedAt).toLocaleDateString()}`, 15, currentY);
            currentY += 6;
            doc.text(`Uploaded by: ${reportData.file.uploaded_by_name}`, 15, currentY);
            currentY += 12;

            // Overall Statistics
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text('OVERALL STATISTICS', 15, currentY);
            currentY += 8;

            const overallStats = [
                ['Total Students', reportData.overallStats.totalStudents.toString()],
                ['Present', reportData.overallStats.totalPresent.toString()],
                ['Absent', reportData.overallStats.totalAbsent.toString()],
                ['Attendance Rate', `${reportData.overallStats.overallAttendanceRate}%`]
            ];

            autoTable(doc, {
                startY: currentY,
                head: [['Metric', 'Value']],
                body: overallStats,
                theme: 'grid',
                headStyles: { 
                    fillColor: [99, 102, 241],
                    fontSize: 10,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 9
                },
                margin: { left: 15, right: 15 },
                tableWidth: 'auto'
            });

            currentY = doc.lastAutoTable.finalY + 12;

            // Branch-wise Analysis
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text('BRANCH-WISE ANALYSIS', 15, currentY);
            currentY += 8;

            Object.entries(reportData.branchData).forEach(([branch, data]) => {
                if (currentY > pageHeight - 60) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(99, 102, 241);
                doc.text(`${branch} Branch`, 15, currentY);
                currentY += 6;

                const branchStats = [
                    ['Total Students', data.total.toString()],
                    ['Present', data.present.toString()],
                    ['Absent', data.absent.toString()],
                    ['Attendance Rate', `${Math.round((data.present / data.total) * 100)}%`]
                ];

                autoTable(doc, {
                    startY: currentY,
                    head: [['Metric', 'Count']],
                    body: branchStats,
                    theme: 'striped',
                    headStyles: { 
                        fillColor: [16, 185, 129],
                        fontSize: 9,
                        fontStyle: 'bold'
                    },
                    bodyStyles: {
                        fontSize: 8
                    },
                    margin: { left: 15, right: pageWidth / 2 + 5 },
                    tableWidth: 'auto'
                });

                currentY = doc.lastAutoTable.finalY + 4;

                // Student Details with segregation - Show ALL students
                if (data.students.length > 0) {
                    const studentsToShow = data.students;
                    const presentStudents = studentsToShow.filter(s => s.status === 'present');
                    const absentStudents = studentsToShow.filter(s => s.status === 'absent');

                    // Present Students Section
                    if (presentStudents.length > 0) {
                        if (currentY > pageHeight - 40) {
                            doc.addPage();
                            currentY = 20;
                        }

                        doc.setFontSize(10);
                        doc.setFont("helvetica", "bold");
                        doc.setTextColor(16, 185, 129);
                        doc.text('PRESENT STUDENTS', 15, currentY);
                        currentY += 6;

                        const presentData = presentStudents.map(student => [
                            student.student_roll || 'N/A',
                            student.student_name || 'N/A',
                            student.student_branch || 'N/A'
                        ]);

                        autoTable(doc, {
                            startY: currentY,
                            head: [['Roll No', 'Name', 'Branch']],
                            body: presentData,
                            theme: 'striped',
                            headStyles: { 
                                fillColor: [16, 185, 129],
                                fontSize: 8,
                                fontStyle: 'bold'
                            },
                            bodyStyles: { 
                                fontSize: 7,
                                cellPadding: 2
                            },
                            columnStyles: {
                                0: { cellWidth: 25 },
                                1: { cellWidth: 'auto' },
                                2: { cellWidth: 20 }
                            },
                            margin: { left: 15, right: 15 },
                            showHead: 'everyPage',
                            pageBreak: 'auto'
                        });

                        currentY = doc.lastAutoTable.finalY + 8;
                    }

                    // Absent Students Section
                    if (absentStudents.length > 0) {
                        if (currentY > pageHeight - 40) {
                            doc.addPage();
                            currentY = 20;
                        }

                        doc.setFontSize(10);
                        doc.setFont("helvetica", "bold");
                        doc.setTextColor(239, 68, 68);
                        doc.text('ABSENT STUDENTS', 15, currentY);
                        currentY += 6;

                        const absentData = absentStudents.map(student => [
                            student.student_roll || 'N/A',
                            student.student_name || 'N/A',
                            student.student_branch || 'N/A'
                        ]);

                        autoTable(doc, {
                            startY: currentY,
                            head: [['Roll No', 'Name', 'Branch']],
                            body: absentData,
                            theme: 'striped',
                            headStyles: { 
                                fillColor: [239, 68, 68],
                                fontSize: 8,
                                fontStyle: 'bold'
                            },
                            bodyStyles: { 
                                fontSize: 7,
                                cellPadding: 2
                            },
                            columnStyles: {
                                0: { cellWidth: 25 },
                                1: { cellWidth: 'auto' },
                                2: { cellWidth: 20 }
                            },
                            margin: { left: 15, right: 15 },
                            showHead: 'everyPage',
                            pageBreak: 'auto'
                        });

                        currentY = doc.lastAutoTable.finalY + 8;
                    }
                }
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text(
                    `Generated by Attendance Management System | Page ${i} of ${pageCount}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }

            // Generate PDF with mobile compatibility
            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `Attendance_Report_${reportData.file.original_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            link.type = 'application/pdf';
            
            if (navigator.userAgent.match(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile/i)) {
                const newWindow = window.open(pdfUrl, '_blank');
                if (newWindow) {
                    setTimeout(() => {
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }, 1000);
                } else {
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            } else {
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            setTimeout(() => {
                URL.revokeObjectURL(pdfUrl);
            }, 10000);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF report: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const generateExcelReport = async (fileId) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/admin/export-excel/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to generate Excel report');
            }

            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'Attendance_Report.xlsx';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error generating Excel report:', error);
            alert('Error generating Excel report: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const openEmailModal = async (fileId) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/admin/report/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const reportData = await response.json();
                setEmailModal({
                    open: true,
                    fileId,
                    reportData
                });
            }
        } catch (error) {
            alert('Error loading report data');
        } finally {
            setLoading(false);
        }
    };

    const openPasswordModal = (user) => {
        setPasswordModal({
            open: true,
            user,
            newPassword: '',
            confirmPassword: '',
            loading: false
        });
    };

    const handlePasswordChange = async () => {
        if (!passwordModal.newPassword) {
            alert('Please enter a new password');
            return;
        }

        if (passwordModal.newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        if (passwordModal.newPassword !== passwordModal.confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        setPasswordModal(prev => ({ ...prev, loading: true }));

        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${passwordModal.user.id}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    newPassword: passwordModal.newPassword
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message);
                setPasswordModal({
                    open: false,
                    user: null,
                    newPassword: '',
                    confirmPassword: '',
                    loading: false
                });
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to change password');
            }
        } catch (error) {
            alert('Network error while changing password');
        } finally {
            setPasswordModal(prev => ({ ...prev, loading: false }));
        }
    };

    const openBulkPasswordModal = () => {
        setBulkPasswordModal({
            open: true,
            userType: 'students',
            newPassword: '',
            confirmPassword: '',
            loading: false
        });
    };

    const handleBulkPasswordReset = async () => {
        if (!bulkPasswordModal.newPassword) {
            alert('Please enter a new password');
            return;
        }

        if (bulkPasswordModal.newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        if (bulkPasswordModal.newPassword !== bulkPasswordModal.confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (!confirm(`Are you sure you want to reset passwords for all ${bulkPasswordModal.userType} users?`)) {
            return;
        }

        setBulkPasswordModal(prev => ({ ...prev, loading: true }));

        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/bulk/reset-passwords`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userType: bulkPasswordModal.userType,
                    newPassword: bulkPasswordModal.newPassword
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message);
                setBulkPasswordModal({
                    open: false,
                    userType: 'students',
                    newPassword: '',
                    confirmPassword: '',
                    loading: false
                });
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to reset passwords');
            }
        } catch (error) {
            alert('Network error while resetting passwords');
        } finally {
            setBulkPasswordModal(prev => ({ ...prev, loading: false }));
        }
    };
    const renderAnalytics = () => (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                    Analytics Dashboard
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => {
                            fetchAnalytics();
                            fetchFiles();
                        }}
                        disabled={loading}
                        style={{
                            background: loading ? '#9ca3af' : '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            padding: '0.5rem 1rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: '500'
                        }}
                    >
                        {loading ? 'Refreshing...' : '🔄 Refresh'}
                    </button>
                    <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                        Filter by Company:
                    </label>
                    <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            background: 'white',
                            minWidth: '200px'
                        }}
                    >
                        <option value="all">All Companies</option>
                        {companies.map(company => (
                            <option key={company} value={company}>
                                {company}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            
            {selectedCompany !== 'all' && (
                <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #0ea5e9',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem',
                    color: '#0c4a6e'
                }}>
                    📊 Showing analytics for: <strong>{selectedCompany}</strong>
                </div>
            )}
            
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <FileText size={32} color="#6366f1" style={{ margin: '0 auto 0.5rem' }} />
                    <h3 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>
                        {analytics.totalFiles?.[0]?.count || 0}
                    </h3>
                    <p style={{ color: '#6b7280' }}>Total Files</p>
                </div>
                
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <Users size={32} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                    <h3 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>
                        {analytics.totalStudents?.[0]?.count || 0}
                    </h3>
                    <p style={{ color: '#6b7280' }}>Students</p>
                </div>
                
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <TrendingUp size={32} color="#f59e0b" style={{ margin: '0 auto 0.5rem' }} />
                    <h3 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>
                        {analytics.totalAttendanceRecords?.[0]?.count || 0}
                    </h3>
                    <p style={{ color: '#6b7280' }}>Attendance Records</p>
                </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    Branch-wise Performance
                </h3>
                {analytics.attendanceByBranch && analytics.attendanceByBranch.length > 0 ? (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {analytics.attendanceByBranch.map((item, index) => (
                            <div key={index} style={{
                                padding: '0.75rem',
                                background: '#f8fafc',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <span style={{ fontWeight: '500' }}>{item.branch} Branch</span>
                                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                        Present: {item.present_count} | Absent: {item.absent_count} | Total: {item.total_records}
                                    </div>
                                </div>
                                <span style={{ 
                                    background: item.attendance_rate >= 75 ? '#10b981' : item.attendance_rate >= 50 ? '#f59e0b' : '#ef4444',
                                    color: 'white', 
                                    padding: '0.25rem 0.75rem', 
                                    borderRadius: '1rem', 
                                    fontSize: '0.875rem' 
                                }}>
                                    {item.attendance_rate}%
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                        No attendance data available
                    </p>
                )}
            </div>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    Branch File Status
                </h3>
                {analytics.branchFileStatus && analytics.branchFileStatus.length > 0 ? (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {analytics.branchFileStatus.map((item, index) => (
                            <div key={index} style={{
                                padding: '0.75rem',
                                background: '#f8fafc',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <span style={{ fontWeight: '500' }}>{item.branch_login}</span>
                                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                        Total Files: {item.total_files} | Completed: {item.completed_files} | Pending: {item.pending_files}
                                    </div>
                                </div>
                                <span style={{ 
                                    background: item.completed_files === item.total_files && item.total_files > 0 ? '#10b981' : '#f59e0b',
                                    color: 'white', 
                                    padding: '0.25rem 0.75rem', 
                                    borderRadius: '1rem', 
                                    fontSize: '0.875rem' 
                                }}>
                                    {item.total_files > 0 ? Math.round((item.completed_files / item.total_files) * 100) : 0}%
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                        No branch file status data available
                    </p>
                )}
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    Files with Attendance Data
                </h3>
                {analytics.fileAttendanceSummary && analytics.fileAttendanceSummary.length > 0 ? (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {analytics.fileAttendanceSummary.map(file => (
                            <div key={file.file_id} style={{
                                padding: '1rem',
                                background: '#f8fafc',
                                borderRadius: '0.75rem',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <div>
                                        <h4 style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{file.original_name}</h4>
                                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                            Company: {file.company_name || 'N/A'} • Uploaded: {new Date(file.upload_date).toLocaleDateString()}
                                        </p>
                                        <p style={{ fontSize: '0.875rem', color: file.is_completed ? '#10b981' : '#f59e0b' }}>
                                            Status: {file.is_completed ? '✅ All branches completed' : '⏳ Pending submissions'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => generateComprehensivePDF(file.file_id)}
                                            disabled={loading}
                                            style={{
                                                background: '#6366f1',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.375rem',
                                                padding: '0.5rem',
                                                cursor: loading ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}
                                            title="Download PDF Report"
                                        >
                                            <Download size={16} />
                                        </button>
                                        <button
                                            onClick={() => openEmailModal(file.file_id)}
                                            disabled={loading}
                                            style={{
                                                background: '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.375rem',
                                                padding: '0.5rem',
                                                cursor: loading ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}
                                            title="Send Email Report"
                                        >
                                            <Mail size={16} />
                                        </button>
                                        <button
                                            onClick={() => generateExcelReport(file.file_id)}
                                            disabled={loading}
                                            style={{
                                                background: '#059669',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.375rem',
                                                padding: '0.5rem',
                                                cursor: loading ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}
                                            title="Download Excel Report"
                                        >
                                            <FileSpreadsheet size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937' }}>
                                            {file.total_records || 0}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Records</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                                            {file.present_count || 0}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Present</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>
                                            {file.absent_count || 0}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Absent</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#6366f1' }}>
                                            {file.attendance_rate || 0}%
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Rate</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                        No files with attendance data yet
                    </p>
                )}
            </div>
        </div>
    );
    const renderUpload = () => (
        <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                Upload Attendance File
            </h2>
            
            <div className="card" style={{ padding: '2rem', maxWidth: '600px' }}>
                <form onSubmit={handleFileUpload}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ 
                            display: 'block', 
                            fontSize: '0.875rem', 
                            fontWeight: '500', 
                            marginBottom: '0.5rem' 
                        }}>
                            Company Name *
                        </label>
                        <input
                            type="text"
                            value={uploadForm.companyName}
                            onChange={(e) => setUploadForm({ ...uploadForm, companyName: e.target.value })}
                            placeholder="Enter company name"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                fontSize: '1rem'
                            }}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ 
                            display: 'block', 
                            fontSize: '0.875rem', 
                            fontWeight: '500', 
                            marginBottom: '0.5rem' 
                        }}>
                            Excel File (.xlsx, .xls)
                        </label>
                        <input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={(e) => {
                                console.log('File selected:', e.target.files[0]);
                                setUploadForm({ ...uploadForm, file: e.target.files[0] });
                            }}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                fontSize: '1rem'
                            }}
                        />
                        {uploadForm.file && (
                            <div style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                color: '#166534'
                            }}>
                                ✓ Selected: {uploadForm.file.name}
                            </div>
                        )}
                        <p style={{ 
                            fontSize: '0.75rem', 
                            color: '#6b7280', 
                            marginTop: '0.5rem' 
                        }}>
                            File will be available to all branches (CSE, AIML, CSD, ECE, MCA) for attendance marking
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            background: loading ? '#9ca3af' : '#6366f1',
                            color: 'white',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            fontSize: '1rem',
                            fontWeight: '500',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Upload size={20} />
                        {loading ? 'Uploading...' : 'Upload File for All Branches'}
                    </button>
                </form>
            </div>
        </div>
    );
    const renderFiles = () => (
        <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                Manage Files
            </h2>
            
            {files.length > 0 ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {files.map(file => (
                        <div key={file.id} className="card" style={{ 
                            padding: '1.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    {file.original_name}
                                </h3>
                                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                    Company: {file.company_name || 'N/A'} • Uploaded: {new Date(file.upload_date).toLocaleDateString()}
                                </p>
                                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                    By: {file.uploaded_by_name} • Status: {file.is_completed ? '✅ All branches completed' : '⏳ Pending submissions'}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => handleDeleteFile(file.id)}
                                    style={{
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        padding: '0.5rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <FileText size={48} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: '#6b7280' }}>No files uploaded yet</p>
                </div>
            )}
        </div>
    );

    const renderUsers = () => (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                    User Management
                </h2>
                <button
                    onClick={openBulkPasswordModal}
                    style={{
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    🔑 Bulk Password Reset
                </button>
            </div>
            
            {users.length > 0 ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {users.map(user => (
                        <div key={user.id} className="card" style={{ 
                            padding: '1.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    {user.username}
                                </h3>
                                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                    Role: {user.role} {user.branch && `• Branch: ${user.branch}`}
                                </p>
                                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                    Email: {user.email} • Created: {new Date(user.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <button
                                    onClick={() => openPasswordModal(user)}
                                    style={{
                                        background: '#6366f1',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        padding: '0.5rem 0.75rem',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}
                                >
                                    🔑 Change Password
                                </button>
                                <div style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '1rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    background: user.role === 'admin' ? '#dbeafe' : '#dcfce7',
                                    color: user.role === 'admin' ? '#1d4ed8' : '#166534'
                                }}>
                                    {user.role.toUpperCase()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                    <Users size={48} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: '#6b7280' }}>No users found</p>
                </div>
            )}
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            <header style={{
                background: 'white',
                borderBottom: '1px solid #e5e7eb',
                padding: '1rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                        Admin Dashboard
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                        Welcome back, {user.username}
                    </p>
                </div>
                <button
                    onClick={onLogout}
                    style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </header>

            <div style={{ display: 'flex' }}>
                <nav style={{
                    width: '250px',
                    background: 'white',
                    borderRight: '1px solid #e5e7eb',
                    minHeight: 'calc(100vh - 73px)',
                    padding: '1rem'
                }}>
                    {[
                        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                        { id: 'upload', label: 'Upload Files', icon: Upload },
                        { id: 'files', label: 'Manage Files', icon: FileText },
                        { id: 'users', label: 'Users', icon: Users }
                    ].map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    marginBottom: '0.5rem',
                                    background: activeTab === tab.id ? '#f3f4f6' : 'transparent',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    fontSize: '0.875rem',
                                    fontWeight: activeTab === tab.id ? '500' : 'normal',
                                    color: activeTab === tab.id ? '#1f2937' : '#6b7280'
                                }}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                <main style={{ flex: 1, padding: '2rem' }}>
                    {activeTab === 'analytics' && renderAnalytics()}
                    {activeTab === 'upload' && renderUpload()}
                    {activeTab === 'files' && renderFiles()}
                    {activeTab === 'users' && renderUsers()}
                </main>
            </div>

            {emailModal.open && (
                <EmailModal 
                    reportData={emailModal.reportData}
                    onClose={() => setEmailModal({ open: false, fileId: null, reportData: null })}
                />
            )}

            {passwordModal.open && (
                <PasswordChangeModal 
                    user={passwordModal.user}
                    newPassword={passwordModal.newPassword}
                    confirmPassword={passwordModal.confirmPassword}
                    loading={passwordModal.loading}
                    onPasswordChange={(field, value) => setPasswordModal(prev => ({ ...prev, [field]: value }))}
                    onSubmit={handlePasswordChange}
                    onClose={() => setPasswordModal({ open: false, user: null, newPassword: '', confirmPassword: '', loading: false })}
                />
            )}

            {bulkPasswordModal.open && (
                <BulkPasswordResetModal 
                    userType={bulkPasswordModal.userType}
                    newPassword={bulkPasswordModal.newPassword}
                    confirmPassword={bulkPasswordModal.confirmPassword}
                    loading={bulkPasswordModal.loading}
                    onFieldChange={(field, value) => setBulkPasswordModal(prev => ({ ...prev, [field]: value }))}
                    onSubmit={handleBulkPasswordReset}
                    onClose={() => setBulkPasswordModal({ open: false, userType: 'students', newPassword: '', confirmPassword: '', loading: false })}
                />
            )}
        </div>
    );
};
// Email Modal Component
const EmailModal = ({ reportData, onClose }) => {
    const [emailData, setEmailData] = useState({
        recipientEmail: '',
        subject: `Attendance Report - ${reportData?.file?.original_name || 'Report'}`,
        message: `Please find attached the comprehensive attendance report for ${reportData?.file?.original_name || 'the file'}.\n\nCompany: ${reportData?.file?.company_name || 'N/A'}\n\nOverall Statistics:\n- Total Students: ${reportData?.overallStats?.totalStudents || 0}\n- Present: ${reportData?.overallStats?.totalPresent || 0}\n- Absent: ${reportData?.overallStats?.totalAbsent || 0}\n- Attendance Rate: ${reportData?.overallStats?.overallAttendanceRate || 0}%\n\nBest regards,\nAttendance Management System`
    });
    const [sending, setSending] = useState(false);

    const generatePDFForEmail = () => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let currentY = 20;

        // Header
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(99, 102, 241);
        doc.text('ATTENDANCE REPORT', pageWidth / 2, currentY, { align: "center" });
        currentY += 12;

        // File Information
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(`File: ${reportData.file.original_name}`, 15, currentY);
        currentY += 6;
        doc.text(`Company: ${reportData.file.company_name || 'N/A'}`, 15, currentY);
        currentY += 6;
        doc.text(`Generated: ${new Date(reportData.generatedAt).toLocaleDateString()}`, 15, currentY);
        currentY += 12;

        // Overall Statistics
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('OVERALL STATISTICS', 15, currentY);
        currentY += 8;

        const overallStats = [
            ['Total Students', reportData.overallStats.totalStudents.toString()],
            ['Present', reportData.overallStats.totalPresent.toString()],
            ['Absent', reportData.overallStats.totalAbsent.toString()],
            ['Attendance Rate', `${reportData.overallStats.overallAttendanceRate}%`]
        ];

        autoTable(doc, {
            startY: currentY,
            head: [['Metric', 'Value']],
            body: overallStats,
            theme: 'grid',
            headStyles: { 
                fillColor: [99, 102, 241],
                fontSize: 10,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 9
            },
            margin: { left: 15, right: 15 },
            tableWidth: 'auto'
        });

        currentY = doc.lastAutoTable.finalY + 12;

        // Branch-wise Analysis
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('BRANCH-WISE ANALYSIS', 15, currentY);
        currentY += 8;

        Object.entries(reportData.branchData).forEach(([branch, data]) => {
            if (currentY > pageHeight - 60) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(99, 102, 241);
            doc.text(`${branch} Branch`, 15, currentY);
            currentY += 6;

            const branchStats = [
                ['Total Students', data.total.toString()],
                ['Present', data.present.toString()],
                ['Absent', data.absent.toString()],
                ['Attendance Rate', `${Math.round((data.present / data.total) * 100)}%`]
            ];

            autoTable(doc, {
                startY: currentY,
                head: [['Metric', 'Count']],
                body: branchStats,
                theme: 'striped',
                headStyles: { 
                    fillColor: [16, 185, 129],
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                bodyStyles: {
                    fontSize: 8
                },
                margin: { left: 15, right: pageWidth / 2 + 5 },
                tableWidth: 'auto'
            });

            currentY = doc.lastAutoTable.finalY + 4;

            // Student Details with segregation - Show ALL students
            if (data.students.length > 0) {
                const studentsToShow = data.students;
                const presentStudents = studentsToShow.filter(s => s.status === 'present');
                const absentStudents = studentsToShow.filter(s => s.status === 'absent');

                // Present Students Section
                if (presentStudents.length > 0) {
                    if (currentY > pageHeight - 40) {
                        doc.addPage();
                        currentY = 20;
                    }

                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(16, 185, 129);
                    doc.text('PRESENT STUDENTS', 15, currentY);
                    currentY += 6;

                    const presentData = presentStudents.map(student => [
                        student.student_roll || 'N/A',
                        student.student_name || 'N/A',
                        student.student_branch || 'N/A'
                    ]);

                    autoTable(doc, {
                        startY: currentY,
                        head: [['Roll No', 'Name', 'Branch']],
                        body: presentData,
                        theme: 'striped',
                        headStyles: { 
                            fillColor: [16, 185, 129],
                            fontSize: 8,
                            fontStyle: 'bold'
                        },
                        bodyStyles: { 
                            fontSize: 7,
                            cellPadding: 2
                        },
                        columnStyles: {
                            0: { cellWidth: 25 },
                            1: { cellWidth: 'auto' },
                            2: { cellWidth: 20 }
                        },
                        margin: { left: 15, right: 15 },
                        showHead: 'everyPage',
                        pageBreak: 'auto'
                    });

                    currentY = doc.lastAutoTable.finalY + 6;
                }

                // Absent Students Section
                if (absentStudents.length > 0) {
                    if (currentY > pageHeight - 40) {
                        doc.addPage();
                        currentY = 20;
                    }

                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(239, 68, 68);
                    doc.text('ABSENT STUDENTS', 15, currentY);
                    currentY += 6;

                    const absentData = absentStudents.map(student => [
                        student.student_roll || 'N/A',
                        student.student_name || 'N/A',
                        student.student_branch || 'N/A'
                    ]);

                    autoTable(doc, {
                        startY: currentY,
                        head: [['Roll No', 'Name', 'Branch']],
                        body: absentData,
                        theme: 'striped',
                        headStyles: { 
                            fillColor: [239, 68, 68],
                            fontSize: 8,
                            fontStyle: 'bold'
                        },
                        bodyStyles: { 
                            fontSize: 7,
                            cellPadding: 2
                        },
                        columnStyles: {
                            0: { cellWidth: 25 },
                            1: { cellWidth: 'auto' },
                            2: { cellWidth: 20 }
                        },
                        margin: { left: 15, right: 15 },
                        showHead: 'everyPage',
                        pageBreak: 'auto'
                    });

                    currentY = doc.lastAutoTable.finalY + 6;
                }
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(
                `Generated by Attendance Management System | Page ${i} of ${pageCount}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
        }

        return doc.output('datauristring').split(',')[1];
    };

    const handleSendEmail = async () => {
        if (!emailData.recipientEmail) {
            alert('Please enter recipient email');
            return;
        }

        setSending(true);
        try {
            const pdfBase64 = generatePDFForEmail();
            
            const response = await fetch(`${API_BASE_URL}/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipientEmail: emailData.recipientEmail,
                    subject: emailData.subject,
                    message: emailData.message,
                    pdfBase64: pdfBase64,
                    fileName: `Comprehensive_Report_${reportData.file.original_name}.pdf`
                }),
            });

            if (response.ok) {
                alert('Email sent successfully!');
                onClose();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to send email');
            }
        } catch (error) {
            alert('Network error while sending email');
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '0.75rem',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflow: 'auto'
            }}>
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                        Send Attendance Report
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: '#6b7280'
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
                            Recipient Email
                        </label>
                        <input
                            type="email"
                            value={emailData.recipientEmail}
                            onChange={(e) => setEmailData({ ...emailData, recipientEmail: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                fontSize: '1rem',
                                boxSizing: 'border-box'
                            }}
                            placeholder="Enter recipient email"
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
                            Subject
                        </label>
                        <input
                            type="text"
                            value={emailData.subject}
                            onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                fontSize: '1rem',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
                            Message
                        </label>
                        <textarea
                            value={emailData.message}
                            onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                            rows={6}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                fontSize: '1rem',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                background: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSendEmail}
                            disabled={sending}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                background: sending ? '#9ca3af' : '#6366f1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: sending ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Mail size={16} />
                            {sending ? 'Sending...' : 'Send Email'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Password Change Modal Component
const PasswordChangeModal = ({ user, newPassword, confirmPassword, loading, onPasswordChange, onSubmit, onClose }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '0.75rem',
                width: '100%',
                maxWidth: '400px',
                padding: '1.5rem'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                        Change Password
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: '#6b7280'
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                        Changing password for: <strong>{user?.username}</strong> ({user?.role})
                    </p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
                        New Password
                    </label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => onPasswordChange('newPassword', e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            fontSize: '1rem',
                            boxSizing: 'border-box'
                        }}
                        placeholder="Enter new password (min 6 characters)"
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => onPasswordChange('confirmPassword', e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            fontSize: '1rem',
                            boxSizing: 'border-box'
                        }}
                        placeholder="Confirm new password"
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: loading ? '#9ca3af' : '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Changing...' : 'Change Password'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Bulk Password Reset Modal Component
const BulkPasswordResetModal = ({ userType, newPassword, confirmPassword, loading, onFieldChange, onSubmit, onClose }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '0.75rem',
                width: '100%',
                maxWidth: '400px',
                padding: '1.5rem'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                        Bulk Password Reset
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: '#6b7280'
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
                        Reset passwords for:
                    </label>
                    <select
                        value={userType}
                        onChange={(e) => onFieldChange('userType', e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            fontSize: '1rem',
                            boxSizing: 'border-box'
                        }}
                    >
                        <option value="students">All Student Users (5 users)</option>
                        <option value="all">All Users (Admin + Students)</option>
                    </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
                        New Password
                    </label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => onFieldChange('newPassword', e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            fontSize: '1rem',
                            boxSizing: 'border-box'
                        }}
                        placeholder="Enter new password (min 6 characters)"
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => onFieldChange('confirmPassword', e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            fontSize: '1rem',
                            boxSizing: 'border-box'
                        }}
                        placeholder="Confirm new password"
                    />
                </div>

                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '0.5rem',
                    padding: '0.75rem',
                    marginBottom: '1.5rem'
                }}>
                    <p style={{ fontSize: '0.875rem', color: '#dc2626', margin: 0 }}>
                        ⚠️ This will change passwords for {userType === 'students' ? 'all 5 student users' : 'all users including admin'}. This action cannot be undone.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: loading ? '#9ca3af' : '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Resetting...' : 'Reset Passwords'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;