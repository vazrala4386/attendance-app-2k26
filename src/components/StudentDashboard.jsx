import { useState, useEffect } from 'react';
import { 
    FileText, 
    LogOut, 
    CheckCircle2,
    AlertCircle,
    Download,
    Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../config.js';

const StudentDashboard = ({ user, token, onLogout }) => {
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [attendees, setAttendees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({ present: 0, absent: 0, total: 0 });

    useEffect(() => {
        fetchFiles();
    }, []);

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

    const loadFileForAttendance = async (file) => {
        setLoading(true);
        try {
            // Download and parse the Excel file
            const response = await fetch(`${API_BASE_URL}/uploads/${file.filename}`);
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const headers = data[0] || [];
            const lowerHeaders = headers.map(h => (h || '').toString().toLowerCase());

            const getIndex = (keywords) => lowerHeaders.findIndex(h => keywords.some(k => h.includes(k)));

            const nameIndex = getIndex(['name', 'student', 'employee']);
            const rollIndex = getIndex(['roll', 'id', 'reg']);
            const branchIndex = getIndex(['branch', 'dept', 'department']);
            const mobileIndex = getIndex(['mobile', 'phone', 'contact']);

            if (nameIndex === -1) {
                alert("Could not find a 'Name' column in the Excel file.");
                return;
            }

            const extracted = data.slice(1)
                .filter(row => row[nameIndex]) // Filter empty rows
                .filter(row => {
                    // Only show students from the same branch as the logged-in user
                    const studentBranch = branchIndex !== -1 ? row[branchIndex] : 'N/A';
                    const userBranch = user.branch.toUpperCase();
                    const fileBranch = studentBranch.toString().toUpperCase().trim();
                    
                    // Precise branch matching with specialization handling
                    switch (userBranch) {
                        case 'CSE':
                            // CSE should only match pure CSE, not CSE-AIML or CSE-DS
                            return fileBranch === 'CSE' || 
                                   (fileBranch.includes('COMPUTER') && 
                                    !fileBranch.includes('AIML') && 
                                    !fileBranch.includes('AI') && 
                                    !fileBranch.includes('ML') && 
                                    !fileBranch.includes('DATA') && 
                                    !fileBranch.includes('DS'));
                        
                        case 'AIML':
                            // AIML should match AIML, CSE-AIML, AI, ML variations
                            return fileBranch.includes('AIML') || 
                                   fileBranch.includes('CSE-AIML') ||
                                   fileBranch.includes('CSE AIML') ||
                                   (fileBranch.includes('AI') && fileBranch.includes('ML')) ||
                                   fileBranch === 'AI' || 
                                   fileBranch === 'ML' ||
                                   fileBranch.includes('ARTIFICIAL INTELLIGENCE') ||
                                   fileBranch.includes('MACHINE LEARNING');
                        
                        case 'CSD':
                            // CSD should match CSD, CSE-DS, Data Science variations
                            return fileBranch.includes('CSD') || 
                                   fileBranch.includes('CSE-DS') ||
                                   fileBranch.includes('CSE DS') ||
                                   fileBranch.includes('DATA SCIENCE') ||
                                   fileBranch.includes('DATA') ||
                                   fileBranch === 'DS';
                        
                        case 'ECE':
                            // ECE should match ECE, Electronics variations
                            return fileBranch === 'ECE' || 
                                   fileBranch.includes('ELECTRONICS') ||
                                   fileBranch.includes('ELECTRICAL') ||
                                   fileBranch.includes('COMMUNICATION');
                        
                        case 'MCA':
                            // MCA should match MCA, Master variations
                            return fileBranch === 'MCA' || 
                                   fileBranch.includes('MASTER') ||
                                   fileBranch.includes('COMPUTER APPLICATION');
                        
                        default:
                            // Fallback to exact match
                            return fileBranch === userBranch;
                    }
                })
                .map((row, index) => ({
                    id: index,
                    name: row[nameIndex],
                    roll: rollIndex !== -1 ? row[rollIndex] : 'N/A',
                    branch: branchIndex !== -1 ? row[branchIndex] : user.branch, // Use user's branch if not found
                    mobile: mobileIndex !== -1 ? row[mobileIndex] : 'N/A',
                    status: 'absent'
                }));

            if (extracted.length === 0) {
                alert(`No students found for ${user.branch} branch in this file. Please contact your administrator.`);
                return;
            }

            setAttendees(extracted);
            setStats({
                present: 0,
                absent: extracted.length,
                total: extracted.length
            });
            setSelectedFile(file);

            // Load existing attendance if any
            loadExistingAttendance(file.id);
        } catch (error) {
            console.error('Error loading file:', error);
            alert('Error loading file. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const loadExistingAttendance = async (fileId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/attendance/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const records = await response.json();
                if (records.length > 0) {
                    // Filter records to only show the current user's branch
                    const branchRecords = records.filter(r => r.student_branch === user.branch);
                    
                    // Update attendees with existing attendance data
                    setAttendees(prev => prev.map(attendee => {
                        const record = branchRecords.find(r => r.student_roll === attendee.roll);
                        return record ? { ...attendee, status: record.status } : attendee;
                    }));

                    // Update stats based on branch-specific records
                    const present = branchRecords.filter(r => r.status === 'present').length;
                    const total = attendees.filter(a => a.branch.toUpperCase() === user.branch.toUpperCase()).length;
                    setStats({
                        present,
                        absent: total - present,
                        total
                    });
                }
            }
        } catch (error) {
            console.error('Error loading existing attendance:', error);
        }
    };

    const toggleAttendance = (id) => {
        const updated = attendees.map(person => {
            if (person.id === id) {
                return { ...person, status: person.status === 'present' ? 'absent' : 'present' };
            }
            return person;
        });
        setAttendees(updated);

        // Update stats
        const present = updated.filter(p => p.status === 'present').length;
        setStats({
            present,
            absent: updated.length - present,
            total: updated.length
        });
    };

    const saveAttendance = async () => {
        if (!selectedFile) return;

        console.log('Saving attendance for:', user.branch);
        console.log('Attendees data:', attendees);
        console.log('Selected file:', selectedFile);

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/attendance/${selectedFile.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    attendanceData: attendees
                })
            });

            console.log('Attendance save response status:', response.status);

            if (response.ok) {
                const result = await response.json();
                console.log('Attendance save result:', result);
                
                // Show success message with file removal info
                alert(`${result.message}`);
                
                // Clear the selected file and go back to file list
                setSelectedFile(null);
                setAttendees([]);
                setStats({ present: 0, absent: 0, total: 0 });
                
                // Refresh the file list to remove the completed file
                fetchFiles();
            } else {
                const error = await response.json();
                console.error('Attendance save error:', error);
                alert(error.error || 'Failed to save attendance');
            }
        } catch (error) {
            console.error('Network error while saving attendance:', error);
            alert('Network error while saving attendance');
        } finally {
            setLoading(false);
        }
    };

    const markAllPresent = () => {
        const updated = attendees.map(person => ({ ...person, status: 'present' }));
        setAttendees(updated);
        setStats({
            present: updated.length,
            absent: 0,
            total: updated.length
        });
    };

    const filteredAttendees = attendees.filter(person =>
        person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.roll.toString().toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedFile) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
                {/* Header */}
                <header style={{
                    background: 'white',
                    borderBottom: '1px solid #e5e7eb',
                    padding: '1rem 2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                            {selectedFile.original_name}
                        </h1>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                            Company: {selectedFile.company_name || 'N/A'} • {user.branch} Branch Students Only
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button
                            onClick={() => setSelectedFile(null)}
                            style={{
                                background: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                padding: '0.5rem 1rem',
                                cursor: 'pointer'
                            }}
                        >
                            Back to Files
                        </button>
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
                    </div>
                </header>

                <div style={{ padding: '2rem' }}>
                    {/* Stats */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                        gap: '1rem',
                        marginBottom: '2rem'
                    }}>
                        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>
                                {stats.total}
                            </h3>
                            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total</p>
                        </div>
                        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
                                {stats.present}
                            </h3>
                            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Present</p>
                        </div>
                        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                                {stats.absent}
                            </h3>
                            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Absent</p>
                        </div>
                        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6366f1' }}>
                                {Math.round((stats.present / stats.total) * 100) || 0}%
                            </h3>
                            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Rate</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                flex: 1,
                                minWidth: '200px',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.5rem',
                                fontSize: '1rem'
                            }}
                        />
                        <button
                            onClick={markAllPresent}
                            style={{
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                padding: '0.75rem 1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <CheckCircle2 size={16} />
                            Mark All Present
                        </button>
                        <button
                            onClick={saveAttendance}
                            disabled={loading}
                            style={{
                                background: loading ? '#9ca3af' : '#6366f1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.5rem',
                                padding: '0.75rem 1rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Download size={16} />
                            {loading ? 'Saving...' : 'Save Attendance'}
                        </button>
                    </div>

                    {/* Attendance List */}
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {filteredAttendees.map(person => (
                            <div
                                key={person.id}
                                onClick={() => toggleAttendance(person.id)}
                                style={{
                                    background: 'white',
                                    border: `2px solid ${person.status === 'present' ? '#10b981' : '#e5e7eb'}`,
                                    borderRadius: '0.75rem',
                                    padding: '1rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}
                            >
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: person.status === 'present' ? '#dcfce7' : '#f1f5f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {person.status === 'present' ? 
                                        <CheckCircle2 size={20} color="#16a34a" /> :
                                        <AlertCircle size={20} color="#94a3b8" />
                                    }
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontWeight: 'bold', margin: 0, marginBottom: '0.25rem' }}>
                                        {person.name}
                                    </h3>
                                    <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                                        Roll: {person.roll} • Branch: {person.branch} • Mobile: {person.mobile}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '1rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    background: person.status === 'present' ? '#dcfce7' : '#fef2f2',
                                    color: person.status === 'present' ? '#166534' : '#dc2626'
                                }}>
                                    {person.status.toUpperCase()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
            {/* Header */}
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
                        Student Dashboard
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                        Welcome, {user.username} • Branch: {user.branch}
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

            <div style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                    Available Files for Attendance - {user.branch} Branch
                </h2>
                
                <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #0ea5e9',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem',
                    color: '#0c4a6e'
                }}>
                    📋 <strong>Note:</strong> Once you mark and save attendance for a file, it will be removed from your dashboard and cannot be modified.
                </div>

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
                                        Status: {file.is_completed ? 'Completed' : 'Pending'} • You will mark attendance for {user.branch} branch students
                                    </p>
                                </div>
                                <button
                                    onClick={() => loadFileForAttendance(file)}
                                    disabled={loading}
                                    style={{
                                        background: loading ? '#9ca3af' : '#6366f1',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        padding: '0.75rem 1rem',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <Eye size={16} />
                                    {loading ? 'Loading...' : 'Mark Attendance'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                        <FileText size={64} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            No Files Available
                        </h3>
                        <p style={{ color: '#6b7280' }}>
                            No new attendance files are available for your branch ({user.branch}).
                        </p>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            You have either completed all available files or no files have been uploaded yet.
                        </p>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            Contact your administrator if you need to modify previously submitted attendance.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;