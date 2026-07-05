const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTPEmail = async (email, username, otp, type = 'verify') => {
  const isVerify = type === 'verify';
  const subject = isVerify
    ? '🔐 Verify Your SnapGram Account'
    : '🔑 Reset Your SnapGram Password';

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px;">
      <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:32px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:28px;">📸 SnapGram</h1>
          <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px;">
            ${isVerify ? 'Verify your account' : 'Reset your password'}
          </p>
        </div>
        <div style="padding:32px;text-align:center;">
          <p style="color:#374151;font-size:16px;">Hello <strong>${username}</strong>!</p>
          <p style="color:#6b7280;font-size:14px;margin-bottom:24px;">
            ${isVerify ? 'Use this OTP to verify your SnapGram account:' : 'Use this OTP to reset your password:'}
          </p>
          <div style="background:linear-gradient(135deg,#7c3aed,#ec4899);border-radius:12px;padding:20px;margin:24px 0;">
            <span style="color:white;font-size:40px;font-weight:900;letter-spacing:12px;">${otp}</span>
          </div>
          <p style="color:#9ca3af;font-size:13px;">⏱️ Valid for <strong>10 minutes</strong></p>
          <p style="color:#ef4444;font-size:12px;margin-top:16px;">Never share this OTP with anyone.</p>
        </div>
        <div style="background:#f9fafb;padding:16px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">© 2024 SnapGram. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"SnapGram" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email error:', err.message);
  }
};

module.exports = { sendOTPEmail };