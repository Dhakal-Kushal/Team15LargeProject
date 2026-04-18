// Uses Resend's HTTP API (port 443) instead of SMTP. DigitalOcean blocks
// outbound ports 25/465/587, so Nodemailer + Gmail SMTP cannot be used here.
// Errors are logged and returned so an email failure doesn't halt registration.

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

async function sendMail(to, subject, html) {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html,
        });
        if (error) {
            console.error('sendMail Resend error:', error);
            return { sent: false, error: error.message || String(error) };
        }
        return { sent: true, error: '', id: data?.id };
    } catch (e) {
        console.error('sendMail threw:', e.toString());
        return { sent: false, error: e.toString() };
    }
}

module.exports = { sendMail };
