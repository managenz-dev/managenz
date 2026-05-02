// backend/src/controllers/otp.controller.js
const prisma = require("../utils/prisma");
const { Resend } = require("resend");

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create OTP email HTML
function createOTPHTML(otp) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .content { padding: 40px 30px; }
        .otp-box { background: #f0fdf4; border: 2px dashed #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-size: 36px; font-weight: bold; color: #059669; letter-spacing: 8px; font-family: monospace; }
        .text { color: #374151; line-height: 1.6; margin: 15px 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Verify Your Account</h1>
        </div>
        <div class="content">
          <p class="text">Hi there,</p>
          <p class="text">Thank you for signing up with <strong>ManaGenz</strong>! To complete your registration, please use the following One-Time Password (OTP):</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">This code expires in 10 minutes</p>
          </div>
          
          <p class="text">If you didn't request this code, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ManaGenz. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email required" });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP to database
    await prisma.emailVerification.upsert({
      where: { email },
      update: { otpCode, expiresAt, isVerified: false },
      create: { email, otpCode, expiresAt, isVerified: false },
    });

    // ✅ SEND EMAIL VIA RESEND
    const html = createOTPHTML(otpCode);
    
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "ManaGenz <onboarding@resend.dev>",
      to: [email],
      subject: "🔐 Verify Your ManaGenz Account",
      html,
    });

    console.log(`✅ OTP email sent to ${email}`);
    console.log(`🔐 OTP for ${email}: ${otpCode}`);

    res.json({ success: true, message: "OTP sent successfully to your email" });
  } catch (err) {
    console.error("sendOTP error:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
  }
};

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
exports.verifyOTP = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: "Email and code required" });
    }

    const verification = await prisma.emailVerification.findFirst({
      where: { email, otpCode: code },
    });

    if (!verification) {
      return res.status(400).json({ success: false, message: "Invalid OTP code" });
    }

    if (new Date() > verification.expiresAt) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    const updateVerificationData = { isVerified: true };
    await prisma.emailVerification.update({
      where: { id: verification.id },
       updateVerificationData,
    });

    const updateUserEmailData = { isEmailVerified: true };
    await prisma.user.update({
      where: { email },
       updateUserEmailData,
    });

    res.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    console.error("verifyOTP error:", err);
    res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
};

// ── POST /api/auth/resend-otp ────────────────────────────────────────────────
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email required" });
    }

    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailVerification.upsert({
      where: { email },
      update: { otpCode, expiresAt, isVerified: false },
      create: { email, otpCode, expiresAt, isVerified: false },
    });

    const html = createOTPHTML(otpCode);
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "ManaGenz <onboarding@resend.dev>",
      to: [email],
      subject: "🔐 Your New ManaGenz Verification Code",
      html,
    });

    console.log(`✅ OTP email resent to ${email}`);
    console.log(`🔐 New OTP for ${email}: ${otpCode}`);

    res.json({ success: true, message: "New OTP sent to your email" });
  } catch (err) {
    console.error("resendOTP error:", err);
    res.status(500).json({ success: false, message: "Failed to resend OTP" });
  }
};