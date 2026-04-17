// Port 587 = STARTTLS; use 465 + secure:true for SMTPS.
// Registration still completes if email can't send

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_USER;

async function sendMail(to, subject, html) {
    try {
        await transporter.sendMail({ from: FROM_EMAIL, to, subject, html });
        return { sent: true, error: '' };
    } catch(e) {
        console.error('sendMail failed:', e.toString());
        return { sent: false, error: e.toString() };
    }
}

module.exports = { sendMail };
