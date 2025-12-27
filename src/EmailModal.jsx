import { useState } from 'react';
import { X, Send, Loader2, CheckCircle, AlertTriangle, Settings } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================
// EMAILJS SETUP INSTRUCTIONS:
// 1. Go to https://www.emailjs.com/ and create FREE account
// 2. Create a new Email Service (Gmail, Outlook, etc.)
// 3. Create an Email Template with these variables:
//    - {{to_email}} - recipient email
//    - {{from_name}} - sender name
//    - {{message}} - email body with summary
//    - {{file_name}} - attachment filename
// 4. Copy your Service ID, Template ID, and Public Key below
// ============================================

// REPLACE THESE WITH YOUR EMAILJS CREDENTIALS
// You can set these in the .env file in the project root
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

function EmailModal({ isOpen, onClose, pdfBase64, fileName, stats, attendees, companyName }) {
    const [recipientEmail, setRecipientEmail] = useState('');
    const [senderName, setSenderName] = useState('udayavazrala@gmail.com');
    const [additionalMessage, setAdditionalMessage] = useState('');
    const [status, setStatus] = useState('idle'); // idle, sending, success, error
    const [errorMessage, setErrorMessage] = useState('');
    const [showSetup, setShowSetup] = useState(false);

    // Generate PDF as base64
    const generatePDFBase64 = () => {
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

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`File: ${fileName}  |  Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, companyName ? 38 : 26, { align: "center" });

        // Summary Box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, companyName ? 44 : 32, pageWidth - 28, 28, 3, 3, 'F');

        const boxY = companyName ? 54 : 42;
        const boxCenterY = companyName ? 62 : 50;

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("TOTAL", 35, boxY);
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text(String(stats.total), 35, boxCenterY);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("PRESENT", 80, boxY);
        doc.setFontSize(18);
        doc.setTextColor(16, 185, 129);
        doc.text(String(stats.present), 80, boxCenterY);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("ABSENT", 130, boxY);
        doc.setFontSize(18);
        doc.setTextColor(239, 68, 68);
        doc.text(String(stats.absent), 130, boxCenterY);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("RATE", 175, boxY);
        doc.setFontSize(18);
        doc.setTextColor(99, 102, 241);
        doc.text(`${attendanceRate}%`, 175, boxCenterY);

        // Tables
        const tableStartY = companyName ? 80 : 68;
        const tableWidth = (pageWidth - 36) / 2;

        // Presentees Table
        doc.setFontSize(12);
        doc.setTextColor(16, 185, 129);
        doc.text(`PRESENTEES (${presentees.length})`, 14, tableStartY);

        autoTable(doc, {
            startY: tableStartY + 4,
            margin: { left: 14, right: pageWidth / 2 + 4 },
            tableWidth: tableWidth,
            head: [['Roll No', 'Name', 'Branch']],
            body: presentees.length > 0
                ? presentees.map(p => [p.roll, p.name, p.branch])
                : [['--', 'No presentees', '--']],
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129], fontSize: 9, halign: 'center' },
            bodyStyles: { fontSize: 8, cellPadding: 2 }
        });

        // Absentees Table
        doc.setFontSize(12);
        doc.setTextColor(239, 68, 68);
        doc.text(`ABSENTEES (${absentees.length})`, pageWidth / 2 + 4, tableStartY);

        autoTable(doc, {
            startY: tableStartY + 4,
            margin: { left: pageWidth / 2 + 4, right: 14 },
            tableWidth: tableWidth,
            head: [['Roll No', 'Name', 'Branch']],
            body: absentees.length > 0
                ? absentees.map(p => [p.roll, p.name, p.branch])
                : [['--', 'No absentees', '--']],
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68], fontSize: 9, halign: 'center' },
            bodyStyles: { fontSize: 8, cellPadding: 2 }
        });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Generated by Attendance Kit`, pageWidth / 2, pageHeight - 10, { align: 'center' });

        return doc.output('datauristring').split(',')[1]; // Return base64 only
    };

    const handleSendEmail = async () => {
        if (!recipientEmail) {
            setErrorMessage('Please enter recipient email');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
            setErrorMessage('Please enter a valid email address');
            return;
        }

        // Use local server for SMTP
        setStatus('sending');
        setErrorMessage('');

        try {
            const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
            const pdfBase64Data = generatePDFBase64();

            const subject = `${companyName ? `${companyName}: ` : ''}Attendance Report - ${fileName}`;
            const message = `
ATTENDANCE SUMMARY
${companyName ? `Organization: ${companyName}` : ''}
━━━━━━━━━━━━━━━━━━━━━━
Total Students: ${stats.total}
Present: ${stats.present}
Absent: ${stats.absent}
Attendance Rate: ${attendanceRate}%
━━━━━━━━━━━━━━━━━━━━━━
${additionalMessage ? `\nNote: ${additionalMessage}` : ''}

Please find the detailed Attendance Report PDF attached.
        `;

            // Ensure filename ends in .pdf
            const pdfFileName = fileName
                ? fileName.replace(/\.[^/.]+$/, "") + ".pdf"
                : 'Attendance_Report.pdf';

            const response = await fetch('http://localhost:3001/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientEmail,
                    subject,
                    message,
                    pdfBase64: pdfBase64Data,
                    fileName: pdfFileName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Server error');
            }

            setStatus('success');
            setTimeout(() => {
                onClose();
                setStatus('idle');
                setRecipientEmail('');
                setSenderName('');
                setAdditionalMessage('');
            }, 2500);

        } catch (error) {
            console.error('Email error:', error);
            setStatus('error');
            setErrorMessage(`Failed to send: ${error.message}. Is "node server.js" running?`);
        }
    };

    // Fallback: Download PDF and open mailto
    const handleFallbackEmail = () => {
        // Generate and download PDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const absentees = attendees.filter(p => p.status === 'absent');
        const presentees = attendees.filter(p => p.status === 'present');
        const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

        doc.setFontSize(22);
        doc.setTextColor(99, 102, 241);
        doc.text("ATTENDANCE REPORT", pageWidth / 2, 18, { align: "center" });

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`File: ${fileName}  |  Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, 26, { align: "center" });

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 32, pageWidth - 28, 28, 3, 3, 'F');

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("TOTAL", 35, 42);
        doc.setFontSize(18);
        doc.setTextColor(15, 23, 42);
        doc.text(String(stats.total), 35, 50);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("PRESENT", 80, 42);
        doc.setFontSize(18);
        doc.setTextColor(16, 185, 129);
        doc.text(String(stats.present), 80, 50);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("ABSENT", 130, 42);
        doc.setFontSize(18);
        doc.setTextColor(239, 68, 68);
        doc.text(String(stats.absent), 130, 50);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("RATE", 175, 42);
        doc.setFontSize(18);
        doc.setTextColor(99, 102, 241);
        doc.text(`${attendanceRate}%`, 175, 50);

        const tableStartY = 68;
        const tableWidth = (pageWidth - 36) / 2;

        doc.setFontSize(12);
        doc.setTextColor(16, 185, 129);
        doc.text(`PRESENTEES (${presentees.length})`, 14, tableStartY);

        autoTable(doc, {
            startY: tableStartY + 4,
            margin: { left: 14, right: pageWidth / 2 + 4 },
            tableWidth: tableWidth,
            head: [['Roll No', 'Name', 'Branch']],
            body: presentees.length > 0 ? presentees.map(p => [p.roll, p.name, p.branch]) : [['--', 'None', '--']],
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129], fontSize: 9, halign: 'center' },
            bodyStyles: { fontSize: 8 }
        });

        doc.setFontSize(12);
        doc.setTextColor(239, 68, 68);
        doc.text(`ABSENTEES (${absentees.length})`, pageWidth / 2 + 4, tableStartY);

        autoTable(doc, {
            startY: tableStartY + 4,
            margin: { left: pageWidth / 2 + 4, right: 14 },
            tableWidth: tableWidth,
            head: [['Roll No', 'Name', 'Branch']],
            body: absentees.length > 0 ? absentees.map(p => [p.roll, p.name, p.branch]) : [['--', 'None', '--']],
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68], fontSize: 9, halign: 'center' },
            bodyStyles: { fontSize: 8 }
        });

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Generated by Attendance Kit`, pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Download PDF
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');

        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = 'Attendance_Report.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Open email
        const subject = encodeURIComponent(`Attendance Report - ${fileName}`);
        const body = encodeURIComponent(
            `Hi,\n\nPlease find the Attendance Report attached.\n\n` +
            `Summary:\n- Total: ${stats.total}\n- Present: ${stats.present}\n- Absent: ${stats.absent}\n- Rate: ${attendanceRate}%\n\n` +
            `${additionalMessage ? `Note: ${additionalMessage}\n\n` : ''}` +
            `Please attach the downloaded PDF "Attendance_Report.pdf".\n\n` +
            `Best regards,\n${senderName || 'Attendance Kit'}`
        );

        setTimeout(() => {
            window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
        }, 500);

        setStatus('success');
        setTimeout(() => {
            onClose();
            setStatus('idle');
        }, 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Send Attendance Report</h3>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {status === 'success' ? (
                    <div className="modal-success">
                        <CheckCircle size={48} color="#10b981" />
                        <p>Email Sent Successfully!</p>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                            The recipient will receive the attendance report.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="modal-body">
                            {showSetup && (
                                <div style={{
                                    background: '#fef3c7',
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    marginBottom: '1rem',
                                    fontSize: '0.8rem'
                                }}>
                                    <strong>📧 EmailJS Setup (FREE):</strong>
                                    <ol style={{ margin: '0.5rem 0 0 1rem', lineHeight: 1.6 }}>
                                        <li>Go to <a href="https://www.emailjs.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1' }}>emailjs.com</a></li>
                                        <li>Create free account & Email Service</li>
                                        <li>Create Email Template</li>
                                        <li>Update EmailModal.jsx with your IDs</li>
                                    </ol>
                                    <p style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>Or use "Download & Email" button below.</p>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Recipient Email *</label>
                                <input
                                    type="email"
                                    placeholder="example@email.com"
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    className="modal-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Your Name</label>
                                <input
                                    type="text"
                                    placeholder="Optional"
                                    value={senderName}
                                    onChange={(e) => setSenderName(e.target.value)}
                                    className="modal-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Additional Message</label>
                                <textarea
                                    placeholder="Add a note..."
                                    value={additionalMessage}
                                    onChange={(e) => setAdditionalMessage(e.target.value)}
                                    className="modal-textarea"
                                    rows={2}
                                />
                            </div>

                            {errorMessage && (
                                <div className="error-message">
                                    <AlertTriangle size={16} />
                                    {errorMessage}
                                </div>
                            )}

                            <div className="email-preview">
                                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Report Summary:</p>
                                <div className="preview-stats">
                                    <span>📊 Total: {stats.total}</span>
                                    <span>✅ Present: {stats.present}</span>
                                    <span>❌ Absent: {stats.absent}</span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleSendEmail}
                                disabled={status === 'sending'}
                                style={{ width: '100%' }}
                            >
                                {status === 'sending' ? (
                                    <>
                                        <Loader2 size={18} className="spin" />
                                        Sending Email...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Send Email with PDF
                                    </>
                                )}
                            </button>

                            <button
                                className="btn btn-secondary"
                                onClick={handleFallbackEmail}
                                style={{ width: '100%' }}
                            >
                                Download PDF & Open Email Client
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default EmailModal;
