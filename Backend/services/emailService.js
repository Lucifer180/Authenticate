const nodemailer = require("nodemailer");

const getTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD ? process.env.SMTP_PASSWORD.replace(/\s+/g, "") : undefined,
        },
    });
};

const sendPasswordResetEmail = async (email, resetUrl) => {
    const transporter = getTransporter();
    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Reset your Password",

        text: `
    You requested a password reset.

   Click the link below to reset your password:

   ${resetUrl}
This link will expire in 15 minutes.

If you did not request this, you can safely ignore this email.
    `,
        html: `
      <h2>Password Reset</h2>

      <p>You requested a password reset.</p>

      <p>
        Click the button below to create a new password.
      </p>

      <p>
        <a href="${resetUrl}">
          Reset Password
        </a>
      </p>

      <p>This link will expire in 15 minutes.</p>

      <p>
        If you did not request this, you can safely ignore this email.
      </p>
    `
    })
};

module.exports ={
    sendPasswordResetEmail
}