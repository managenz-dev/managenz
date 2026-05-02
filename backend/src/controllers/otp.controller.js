// backend/src/controllers/otp.controller.js
const prisma = require("../utils/prisma");

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to database
    await prisma.emailVerification.upsert({
      where: { email },
      update: {
        otpCode,
        expiresAt,
        isVerified: false,
      },
      create: {
        email,
        otpCode,
        expiresAt,
        isVerified: false,
      },
    });

    // ✅ DEVELOPMENT MODE: Log OTP to console
    console.log(`\n🔐 OTP for ${email}: ${otpCode}\n`);
    
    // TODO: In production, send email using SendGrid/AWS SES/etc.
    // await sendEmail({ to: email, subject: "Verify your account", text: `Your OTP is: ${otpCode}` });

    res.json({ 
      success: true, 
      message: "OTP sent successfully. Check console for development code.",
      debugOTP: process.env.NODE_ENV === "development" ? otpCode : undefined 
    });
  } catch (err) {
    console.error("sendOTP error:", err);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
exports.verifyOTP = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: "Email and code required" });
    }

    // Find OTP record
    const verification = await prisma.emailVerification.findFirst({
      where: { email, otpCode: code },
    });

    if (!verification) {
      return res.status(400).json({ success: false, message: "Invalid OTP code" });
    }

    // Check if expired
    if (new Date() > verification.expiresAt) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    // Mark as verified
    await prisma.emailVerification.update({
      where: { id: verification.id },
       { isVerified: true },
    });

    // Update user's email verification status
    await prisma.user.update({
      where: { email },
       { isEmailVerified: true },
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

    // Just call sendOTP again
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailVerification.upsert({
      where: { email },
      update: { otpCode, expiresAt, isVerified: false },
      create: { email, otpCode, expiresAt, isVerified: false },
    });

    console.log(`\n🔐 New OTP for ${email}: ${otpCode}\n`);

    res.json({ 
      success: true, 
      message: "New OTP sent. Check console for development code.",
      debugOTP: process.env.NODE_ENV === "development" ? otpCode : undefined 
    });
  } catch (err) {
    console.error("resendOTP error:", err);
    res.status(500).json({ success: false, message: "Failed to resend OTP" });
  }
};