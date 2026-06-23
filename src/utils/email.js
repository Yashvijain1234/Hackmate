import nodemailer from "nodemailer";

let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    return transporter;
};

/**
 * Sends an email. If SMTP is not configured, it logs to the console instead so
 * the app keeps working in development without credentials.
 */
export const sendEmail = async ({ to, subject, text, html }) => {
    const tx = getTransporter();
    const from = process.env.EMAIL_FROM || "HackMate <no-reply@hackmate.dev>";

    if (!tx) {
        console.log("📧 [email disabled] would send:", { to, subject, text });
        return { skipped: true };
    }

    try {
        const info = await tx.sendMail({ from, to, subject, text, html });
        return { messageId: info.messageId };
    } catch (error) {
        // Never let email failures break the main request flow.
        console.error("Email send failed:", error.message);
        return { error: error.message };
    }
};
