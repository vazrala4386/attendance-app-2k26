import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import EmailModal from './EmailModal';
import {
  FolderUp,
  Check,
  X,
  Download,
  Mail,
  Users,
  ChevronLeft,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  History,
  Trash2,
  UserCheck,
  UserX,
  FileText,
  Send,
  ChevronRight
} from 'lucide-react';

function App() {
  const [view, setView] = useState('upload'); // upload, list, report, history
  const [attendees, setAttendees] = useState([]);
  const [fileName, setFileName] = useState('');
  const [stats, setStats] = useState({ present: 0, absent: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [reportType, setReportType] = useState('absent'); // 'absent', 'present', 'all'
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [currentPdfBase64, setCurrentPdfBase64] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(null);

  // Load History from local storage on init
  useEffect(() => {
    const saved = localStorage.getItem('attendance_history');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  // Save History
  const saveToHistory = (currentAttendees, currentFileName, currentStats) => {
    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      fileName: currentFileName,
      stats: currentStats,
      attendees: currentAttendees
    };

    const updatedHistory = [newEntry, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('attendance_history', JSON.stringify(updatedHistory));
  };

  const loadFromHistory = (session) => {
    setAttendees(session.attendees);
    setFileName(session.fileName);
    setStats(session.stats);
    setView('list');
  };

  const deleteHistoryItem = (id, e) => {
    e.stopPropagation();
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('attendance_history', JSON.stringify(updated));
  };

  // Handle File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

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
        .map((row, index) => ({
          id: index,
          name: row[nameIndex],
          roll: rollIndex !== -1 ? row[rollIndex] : 'N/A',
          branch: branchIndex !== -1 ? row[branchIndex] : 'N/A',
          mobile: mobileIndex !== -1 ? row[mobileIndex] : 'N/A',
          status: 'absent'
        }));

      setAttendees(extracted);
      setStats({
        present: 0,
        absent: extracted.length,
        total: extracted.length
      });
      setView('list');
    };
    reader.readAsBinaryString(file);
  };

  // Toggle Attendance
  const toggleStatus = (id) => {
    const updated = attendees.map(p => {
      if (p.id === id) {
        return { ...p, status: p.status === 'present' ? 'absent' : 'present' };
      }
      return p;
    });
    setAttendees(updated);

    // Update stats
    const present = updated.filter(p => p.status === 'present').length;
    const newStats = {
      present,
      absent: updated.length - present,
      total: updated.length
    };
    setStats(newStats);
  };

  // Save specific session to history
  const saveSession = () => {
    saveToHistory(attendees, fileName, stats);
    alert("Session saved to History!");
  };

  // Generate PDF with side-by-side layout
  const generatePDF = (type = reportType, download = true) => {
    try {
      console.log('generatePDF called');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Helper to sort by Branch then Roll
      const sorter = (a, b) => {
        if (a.branch < b.branch) return -1;
        if (a.branch > b.branch) return 1;
        return a.roll.toString().localeCompare(b.roll.toString(), undefined, { numeric: true });
      };

      const absentees = attendees.filter(p => p.status === 'absent').sort(sorter);
      const presentees = attendees.filter(p => p.status === 'present').sort(sorter);
      const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

      // ============ HEADER ============
      // Company Name (Bold & Large)
      if (companyName) {
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(99, 102, 241); // Primary Color
        doc.text(companyName.toUpperCase(), pageWidth / 2, 20, { align: "center" });
      }

      // Report Title
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text("ATTENDANCE REPORT", pageWidth / 2, companyName ? 30 : 18, { align: "center" });

      // File name and date
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`File: ${fileName}  |  Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, companyName ? 38 : 26, { align: "center" });

      // ============ ANALYSIS SUMMARY BOX ============
      // Background box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, companyName ? 44 : 32, pageWidth - 28, 28, 3, 3, 'F');

      // Summary stats in a row
      const boxY = companyName ? 54 : 42;
      const boxCenterY = companyName ? 62 : 50;

      // Total
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL", 35, boxY);
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text(String(stats.total), 35, boxCenterY);

      // Present
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("PRESENT", 80, boxY);
      doc.setFontSize(18);
      doc.setTextColor(16, 185, 129); // Green
      doc.text(String(stats.present), 80, boxCenterY);

      // Absent
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("ABSENT", 130, boxY);
      doc.setFontSize(18);
      doc.setTextColor(239, 68, 68); // Red
      doc.text(String(stats.absent), 130, boxCenterY);

      // Attendance Rate
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text("RATE", 175, boxY);
      doc.setFontSize(18);
      doc.setTextColor(99, 102, 241); // Indigo
      doc.text(`${attendanceRate}%`, 175, boxCenterY);

      // ============ HELPER: GROUP BY BRANCH ============
      const groupByBranch = (list) => {
        return list.reduce((groups, item) => {
          const branch = item.branch || 'Unknown';
          if (!groups[branch]) groups[branch] = [];
          groups[branch].push(item);
          return groups;
        }, {});
      };

      const renderSection = (title, list, startY, color, emptyMsg) => {
        if (list.length === 0) return startY;

        let currentY = startY;

        // Section Title
        doc.setFontSize(14);
        doc.setTextColor(...color);
        doc.text(title, 14, currentY);
        currentY += 8;

        const grouped = groupByBranch(list);
        const branches = Object.keys(grouped).sort();

        branches.forEach(branch => {
          // Branch Subheader
          doc.setFontSize(11);
          doc.setTextColor(100, 116, 139);
          doc.text(`Branch: ${branch} (${grouped[branch].length})`, 14, currentY);
          currentY += 4;

          autoTable(doc, {
            startY: currentY,
            margin: { left: 14, right: 14 },
            head: [['Roll No', 'Name', 'Mobile']],
            body: grouped[branch].map(p => [p.roll, p.name, p.mobile]),
            theme: 'striped',
            headStyles: {
              fillColor: color,
              fontSize: 10,
              fontStyle: 'bold',
              halign: 'left'
            },
            bodyStyles: {
              fontSize: 9,
              cellPadding: 3
            },
            columnStyles: {
              0: { cellWidth: 40 },
              1: { cellWidth: 'auto' },
              2: { cellWidth: 50 }
            },
            didDrawPage: (data) => {
              // Return Y position for next element
            }
          });

          currentY = doc.lastAutoTable.finalY + 10;
        });

        return currentY;
      };

      // ============ SIDE BY SIDE TABLES ============
      const tableStartY = companyName ? 80 : 68;
      const leftTableX = 14;
      const rightTableX = pageWidth / 2 + 4;
      const tableWidth = (pageWidth - 36) / 2;

      // Left Table - PRESENTEES (Green)
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129);
      doc.text(`PRESENTEES (${presentees.length})`, leftTableX, tableStartY);

      autoTable(doc, {
        startY: tableStartY + 4,
        margin: { left: leftTableX, right: pageWidth / 2 + 4 },
        tableWidth: tableWidth,
        head: [['Roll No', 'Name', 'Branch']],
        body: presentees.length > 0
          ? presentees.map(p => [p.roll, p.name, p.branch])
          : [['--', 'No presentees', '--']],
        theme: 'striped',
        headStyles: {
          fillColor: [16, 185, 129],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.25 },
          1: { cellWidth: tableWidth * 0.45 },
          2: { cellWidth: tableWidth * 0.30 }
        },
        alternateRowStyles: {
          fillColor: [240, 253, 244]
        }
      });

      // Right Table - ABSENTEES (Red)
      doc.setFontSize(12);
      doc.setTextColor(239, 68, 68);
      doc.text(`ABSENTEES (${absentees.length})`, rightTableX, tableStartY);

      autoTable(doc, {
        startY: tableStartY + 4,
        margin: { left: rightTableX, right: 14 },
        tableWidth: tableWidth,
        head: [['Roll No', 'Name', 'Branch']],
        body: absentees.length > 0
          ? absentees.map(p => [p.roll, p.name, p.branch])
          : [['--', 'No absentees', '--']],
        theme: 'striped',
        headStyles: {
          fillColor: [239, 68, 68],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: tableWidth * 0.25 },
          1: { cellWidth: tableWidth * 0.45 },
          2: { cellWidth: tableWidth * 0.30 }
        },
        alternateRowStyles: {
          fillColor: [254, 242, 242]
        }
      });

      // ============ FOOTER ============
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Generated by Attendance Kit | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save PDF - using reliable download method
      if (download) {
        console.log('Generating PDF for download...');

        // Generate PDF as blob
        const pdfBlob = doc.output('blob');

        // Create URL for the PDF
        const pdfUrl = URL.createObjectURL(pdfBlob);

        // OPTION 1: Open PDF in new tab for viewing
        window.open(pdfUrl, '_blank');

        // OPTION 2: Also trigger download
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = 'Attendance_Report.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up after a delay
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);

        console.log('PDF opened in new tab and download triggered!');
      }

      return doc.output('datauristring');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Error generating PDF: ' + error.message);
      return null;
    }
  };

  // Open email modal with PDF
  const openEmailModal = () => {
    try {
      console.log('openEmailModal called');
      const pdfBase64 = generatePDF(reportType, false);
      console.log('PDF generated, opening modal');
      setCurrentPdfBase64(pdfBase64);
      setEmailModalOpen(true);
      console.log('emailModalOpen set to true');
    } catch (error) {
      console.error('Email Modal Error:', error);
      alert('Error opening email modal: ' + error.message);
    }
  };

  // Views
  if (view === 'upload') {
    return (
      <div className="fade-in" style={{ padding: '2rem 1.5rem', paddingBottom: '100px' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)'
          }}>
            <Users size={40} color="white" />
          </div>
          <h1>Attendance Kit</h1>
          <p>Seamless attendance tracking</p>
        </div>

        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>New Session</h2>
          <div className="file-upload-wrapper">
            <FileSpreadsheet size={48} color="#6366f1" style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ fontWeight: 600, color: '#4b5563' }}>Upload Excel File</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>.xlsx or .xls</p>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="file-upload-input"
            />
          </div>
        </div>

        {history.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1rem', margin: '1.5rem 0 1rem', color: '#64748b' }}>Recent History</h3>
            {history.map(session => (
              <div key={session.id} className="card" onClick={() => loadFromHistory(session)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                <div>
                  <p style={{ fontWeight: 600, color: '#0f172a' }}>{session.fileName}</p>
                  <p style={{ fontSize: '0.75rem' }}>{session.date}</p>
                  <p style={{ fontSize: '0.75rem', color: '#6366f1' }}>{session.stats.present} P / {session.stats.absent} A</p>
                </div>
                <button onClick={(e) => deleteHistoryItem(session.id, e)} style={{ background: 'none', border: 'none', color: '#ef4444' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }



  // ...

  if (view === 'list') {
    // Extract unique branches
    const uniqueBranches = ['All', ...new Set(attendees.map(p => p.branch))].sort();

    // BRANCH SELECTION MODE
    if (!selectedBranch) {
      return (
        <div className="fade-in" style={{ paddingBottom: '100px' }}>
          <header className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setView('upload')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
              >
                <ChevronLeft size={24} />
              </button>
              <div>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Select Branch</h2>
                <p style={{ fontSize: '0.75rem', margin: 0 }}>{stats.present} / {stats.total} Marked</p>
              </div>
            </div>
          </header>

          <div style={{ padding: '2rem 1.5rem' }}>
            <p style={{ marginBottom: '1.5rem', color: '#64748b', textAlign: 'center' }}>
              Choose a branch to mark attendance:
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '1rem'
            }}>
              {uniqueBranches.map(branch => (
                <button
                  key={branch}
                  onClick={() => setSelectedBranch(branch)}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    border: 'none',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'transform 0.2s',
                    minHeight: '120px'
                  }}
                >
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: '#e0e7ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <Users size={24} color="#6366f1" />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '1.1rem', color: '#1e293b' }}>{branch}</span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {branch === 'All' ? attendees.length : attendees.filter(a => a.branch === branch).length} Candidates
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="floating-bottom">
            <button className="btn btn-secondary" onClick={() => setView('report')}>
              Review Analysis <ChevronRight size={20} />
            </button>
          </div>
        </div>
      );
    }

    // MARKING MODE (Selected Branch)
    return (
      <div className="fade-in" style={{ paddingBottom: '100px' }}>
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setSelectedBranch(null)} // Go back to Branch Selection
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{selectedBranch}</h2>
              <p style={{ fontSize: '0.75rem', margin: 0 }}>Marking Attendance</p>
            </div>
          </div>
        </header>

        <div style={{ padding: '1rem 1.5rem 0.5rem' }}>
          <input
            type="text"
            placeholder="Search student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
              marginBottom: '1rem'
            }}
          />
          <button
            onClick={() => {
              const updated = attendees.map(p => {
                const matchesBranch = selectedBranch === 'All' || p.branch === selectedBranch;
                if (matchesBranch) {
                  return { ...p, status: 'present' };
                }
                return p;
              });
              setAttendees(updated);

              // Update stats
              const present = updated.filter(p => p.status === 'present').length;
              setStats({
                present,
                absent: updated.length - present,
                total: updated.length
              });
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: '1px solid #16a34a',
              background: '#dcfce7',
              color: '#166534',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <CheckCircle2 size={18} /> Mark All {selectedBranch === 'All' ? '' : selectedBranch} Present
          </button>
        </div>

        <div style={{
          padding: '0 1.5rem 1.5rem',
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
        }}>
          {attendees.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.roll.toString().toLowerCase().includes(searchQuery.toLowerCase());
            const matchesBranch = selectedBranch === 'All' || p.branch === selectedBranch;
            return matchesSearch && matchesBranch;
          }).map((person) => (
            <div
              key={person.id}
              className={`attendance-item ${person.status}`}
              onClick={() => toggleStatus(person.id)}
              style={{ marginBottom: 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  flexShrink: 0,
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
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{person.name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{person.branch}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{person.roll} • {person.mobile}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="floating-bottom">
          <button
            className="btn btn-primary"
            onClick={() => {
              saveSession();
              // Optional: setSelectedBranch(null); // Uncomment if Update should take you back
            }}
          >
            Update Attendance <Check size={20} />
          </button>
        </div>
      </div>
    );
  }

  if (view === 'report') {
    return (
      <div className="fade-in">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setView('list')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
            >
              <ChevronLeft size={24} />
            </button>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Analysis</h2>
          </div>
        </header>

        <div style={{ padding: '1.5rem' }}>

          {/* Company Name Input */}
          <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>
              Company / Organization Name
            </label>
            <input
              type="text"
              placeholder="Enter Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #e2e8f0',
                fontSize: '1rem',
                fontWeight: 600,
                color: '#0f172a'
              }}
            />
          </div>

          {/* Stats Circle */}
          <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Attendance Rate</p>
            <div style={{ fontSize: '3rem', fontWeight: 700, color: '#6366f1', lineHeight: 1 }}>
              {Math.round((stats.present / stats.total) * 100)}%
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1rem', textAlign: 'center', marginBottom: 0 }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{stats.present}</p>
              <p style={{ fontSize: '0.75rem' }}>Present</p>
            </div>
            <div className="card" style={{ padding: '1rem', textAlign: 'center', marginBottom: 0 }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{stats.absent}</p>
              <p style={{ fontSize: '0.75rem' }}>Absent</p>
            </div>
          </div>

          {/* Actions */}
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Actions</h3>

          {/* Download PDF Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              console.log('Download clicked');
              generatePDF();
            }}
            style={{ marginBottom: '1rem' }}
          >
            <Download size={20} />
            Download Attendance PDF
          </button>

          {/* Email Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              console.log('Email clicked');
              openEmailModal();
            }}
            style={{ marginBottom: '1rem' }}
          >
            <Mail size={20} />
            Send via Email
          </button>

          {/* Save to History Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              console.log('Save clicked');
              saveSession();
            }}
          >
            <History size={20} />
            Save to History
          </button>
        </div>

        {/* Email Modal */}
        <EmailModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          pdfBase64={currentPdfBase64}
          fileName={fileName}
          stats={stats}
          attendees={attendees}
          companyName={companyName}
        />
      </div>
    );
  }

  return <div>Loading...</div>;
}

export default App;
