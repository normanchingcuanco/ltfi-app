const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendPasswordResetEmail = async (to, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: `"LTFI" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your LTFI password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #F77E2D;">Reset your password</h2>
        <p>Click the button below to reset your LTFI password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #F77E2D; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
        <p style="color: #999; margin-top: 24px; font-size: 12px;">If you didn't request this, ignore this email.</p>
      </div>
    `
  });
};

module.exports = { sendPasswordResetEmail };