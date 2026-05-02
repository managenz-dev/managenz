// backend/src/controllers/auth.controller.js
const prisma = require("../utils/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "managenz-secret-key";
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || "7d";

// ── Shape user for frontend responses ─────────────────────────────────────────
function fmt(user, domain) {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    emailVerified: user.isEmailVerified,
    plan: user.plan || "FREE",
    userType: user.userType || null,
    selectedDomain: domain || null,
    mobileNumber: user.mobileNumber || null,
    username: user.username || null,
    bio: user.bio || null,
    createdAt: user.createdAt,
  };
}

// ── Generate 6-digit OTP ───────────────────────────────────────────────────────
function makeOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Send OTP email ─────────────────────────────────────────────────────────────
async function sendOTPEmail(email, otp) {
  try {
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    });
    await transporter.sendMail({
      from: `"ManaGenz" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your ManaGenz verification code",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#5a7f2e;margin-bottom:8px">ManaGenz</h2>
          <p style="color:#374151;margin-bottom:24px">Your email verification code:</p>
          <div style="background:#f0f7ec;border:1px solid #5a7f2e30;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#5a7f2e;font-family:monospace">${otp}</span>
          </div>
          <p style="color:#6b7280;font-size:14px">This code expires in 10 minutes.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("❌ OTP email failed:", err.message);
    return false;
  }
}

// ── Cookie helper for student token ───────────────────────────────────────────
function setStudentTokenCookie(res, token) {
  res.cookie("managenz_token", token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

// ── POST /api/auth/register ────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { firstName, middleName, lastName, phone, dob, email, userType, password } = req.body;

    if (!firstName || !lastName || !email || !password || !userType)
      return res.status(400).json({ success: false, message: "First name, last name, email, password and user type are required" });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });

    const cleanEmail = email.toLowerCase().trim();
    const fullName = [firstName.trim(), middleName?.trim(), lastName.trim()].filter(Boolean).join(' ').trim();
    const cleanPhone = phone?.trim() || undefined;

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing)
      return res.status(409).json({ success: false, message: "Email already registered" });

    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        fullName,
        email: cleanEmail,
        passwordHash: hash,
        mobileNumber: cleanPhone,
        userType,
        isEmailVerified: false,
        plan: "FREE",
      },
    });

    const otp = makeOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.emailVerification.deleteMany({ where: { email: cleanEmail } });
    await prisma.emailVerification.create({
      data: { email: cleanEmail, otpCode: otp, expiresAt, isVerified: false },
    });

    const sent = await sendOTPEmail(cleanEmail, otp);
    if (!sent) console.log(`⚠️ OTP for ${cleanEmail}: ${otp} (email not sent)`);

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    setStudentTokenCookie(res, token);

    return res.status(201).json({
      success: true,
      message: sent ? "Account created. Check your email for the 6-digit code." : "Account created.",
      data: { user: fmt(user, null) },
    });
  } catch (error) { next(error); }
};

// ── POST /api/auth/verify-email ────────────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ success: false, message: "Email and OTP required" });

    const cleanEmail = email.toLowerCase().trim();
    const record = await prisma.emailVerification.findFirst({
      where: { email: cleanEmail, isVerified: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record)
      return res.status(400).json({ success: false, message: "No pending verification found. Please request a new code." });
    if (new Date() > record.expiresAt)
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
    if (record.otpCode !== String(otp).trim())
      return res.status(400).json({ success: false, message: "Incorrect code. Please check and try again." });

    await prisma.emailVerification.update({ 
      where: { id: record.id }, 
      data: { isVerified: true } 
    });
    
    const user = await prisma.user.update({
      where: { email: cleanEmail },
      data: { isEmailVerified: true },
      include: { selectedDomain: { select: { id: true, slug: true, name: true, colorHex: true } } },
    });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    setStudentTokenCookie(res, token);

    return res.json({
      success: true,
      message: "Email verified successfully",
      data: { user: fmt(user, user.selectedDomain) },
    });
  } catch (error) { next(error); }
};

// ── POST /api/auth/resend-otp ──────────────────────────────────────────────────
exports.resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email required" });

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user)
      return res.status(404).json({ success: false, message: "No account found with this email" });
    if (user.isEmailVerified)
      return res.status(400).json({ success: false, message: "Email already verified" });

    const otp = makeOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.emailVerification.deleteMany({ where: { email: cleanEmail } });
    await prisma.emailVerification.create({
      data: { email: cleanEmail, otpCode: otp, expiresAt, isVerified: false },
    });

    const sent = await sendOTPEmail(cleanEmail, otp);
    if (!sent) console.log(`⚠️ Resend OTP for ${cleanEmail}: ${otp}`);

    return res.json({ success: true, message: sent ? "New code sent to your email" : "Code generated (email not configured)" });
  } catch (error) { next(error); }
};

// ── POST /api/auth/login ───────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        selectedDomain: { select: { id: true, slug: true, name: true, colorHex: true } },
        subscription: { select: { planType: true, status: true } },
      },
    });

    if (!user)
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    if (!user.isActive)
      return res.status(401).json({ success: false, message: "Account is deactivated" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    setStudentTokenCookie(res, token);

    return res.json({
      success: true,
      data: { user: fmt(user, user.selectedDomain) },
    });
  } catch (error) { next(error); }
};

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        selectedDomain: { select: { id: true, slug: true, name: true, colorHex: true } },
        profile: { select: { avatarUrl: true, bio: true, collegeName: true, city: true } },
        subscription: { select: { planType: true, status: true } },
      },
    });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    return res.json({
      success: true,
      data: {
        user: {
          ...fmt(user, user.selectedDomain),
          avatarUrl: user.profile?.avatarUrl || null,
          bio: user.profile?.bio || null,
          collegeName: user.profile?.collegeName || null,
        },
      },
    });
  } catch (error) { next(error); }
};

// ── GET /api/users/profile ─────────────────────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        selectedDomain: { select: { id: true, slug: true, name: true, colorHex: true } },
      },
    });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const stats = {
      total: 0,
      completed: 0,
      avgScore: null,
      bestScore: null,
    };

    return res.json({
      success: true,
      data: { user: fmt(user, user.selectedDomain), stats },
    });
  } catch (error) { next(error); }
};

// ── PATCH /api/users/profile ──────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, username, bio, mobileNumber } = req.body;

    const updateData = {};
    
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ success: false, message: "Name cannot be empty" });
      updateData.fullName = name.trim();
    }
    
    if (username !== undefined) {
      if (username && username.trim().length < 3) {
        return res.status(400).json({ success: false, message: "Username must be at least 3 characters" });
      }
      if (username && username.trim()) {
        const existing = await prisma.user.findFirst({
          where: { username: username.trim(), NOT: { id: userId } }
        });
        if (existing) {
          return res.status(409).json({ success: false, message: "Username already taken" });
        }
      }
      updateData.username = username.trim() || null;
    }
    
    if (bio !== undefined) {
      updateData.bio = bio.trim() || null;
    }
    
    if (mobileNumber !== undefined) {
      if (mobileNumber && !/^\d{10}$/.test(mobileNumber.replace(/\s/g, ""))) {
        return res.status(400).json({ success: false, message: "Invalid phone number format" });
      }
      updateData.mobileNumber = mobileNumber.trim() || null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        selectedDomain: { select: { id: true, slug: true, name: true, colorHex: true } },
      },
    });

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user: fmt(updatedUser, updatedUser.selectedDomain) },
    });
  } catch (error) {
    console.error("❌ Profile update error:", error);
    next(error);
  }
};

// ── PATCH /api/users/change-password ─────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: "New password must be different from current password" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("❌ Password change error:", error);
    next(error);
  }
};

// ── POST /api/auth/select-domain ───────────────────────────────────────────────
exports.selectDomain = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { domainSlug } = req.body;
    if (!domainSlug)
      return res.status(400).json({ success: false, message: "domainSlug required" });

    const domain = await prisma.domain.findFirst({
      where: { slug: domainSlug, isActive: true },
      select: { id: true, slug: true, name: true, colorHex: true },
    });
    if (!domain)
      return res.status(404).json({ success: false, message: "Domain not found" });

    const cur = await prisma.user.findUnique({ where: { id: userId }, select: { selectedDomainId: true } });
    if (cur?.selectedDomainId) {
      const existing = await prisma.domain.findUnique({
        where: { id: cur.selectedDomainId },
        select: { id: true, slug: true, name: true, colorHex: true },
      });
      return res.json({ success: true, data: { selectedDomain: existing, alreadySelected: true } });
    }

    await prisma.user.update({ where: { id: userId }, data: { selectedDomainId: domain.id } });
    return res.json({ success: true, data: { selectedDomain: domain, alreadySelected: false } });
  } catch (error) { next(error); }
};

// ── GET /api/auth/domain-status ────────────────────────────────────────────────
exports.getDomainStatus = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { selectedDomain: { select: { id: true, slug: true, name: true } } },
    });
    return res.json({
      success: true,
      data: { hasSelectedDomain: !!user?.selectedDomainId, selectedDomain: user?.selectedDomain || null },
    });
  } catch (error) { next(error); }
};

// ── POST /api/auth/logout ──────────────────────────────────────────────────────
exports.logout = (req, res) => {
  res.clearCookie("managenz_token", { path: "/" });
  res.json({ success: true, message: "Logged out" });
};