import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for PDF attachments

// Email sending endpoint
app.post('/send-email', async (req, res) => {
    const { recipientEmail, subject, message, pdfBase64, fileName } = req.body;

    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        return res.status(500).json({
            error: 'Server credentials not configured. Please check .env file.'
        });
    }

    try {
        // Create Transporter (using Gmail or generic SMTP)
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Built-in support for Gmail
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD // Must be an App Password, not login password
            }
        });

        // Email Options
        const mailOptions = {
            from: process.env.SMTP_EMAIL,
            to: recipientEmail,
            subject: subject,
            text: message,
            attachments: [
                {
                    filename: fileName || 'Attendance_Report.pdf',
                    content: pdfBase64,
                    encoding: 'base64'
                }
            ]
        };

        // Send Email
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

app.listen(PORT, () => {
    console.log(`\n🚀 Local Email Server running at http://localhost:${PORT}`);
    console.log(`📧 Configure your credentials in .env file`);
});
