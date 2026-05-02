// backend/src/controllers/userAuth.controller.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");

const JWT_SECRET = process.env.JWT_SECRET || "managenz-secret-key";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
exports.signup = async (req, res) => {
  try {
    const { firstName, middleName, lastName, phone, email, password, gender } = req.body;

    if (!firstName || !lastName || !phone || !email || !password) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const phoneRegex = /^\+91\d{10}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
      return res.status(400).json({ success: false, message: "Phone must be valid Indian format: +91XXXXXXXXXX" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ success: false, message: "Password must be 8+ chars with 1 uppercase, 1 number, 1 special char" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // ✅ FIXED: Added 'data:' key explicitly
    await prisma.user.create({
      data: {
        firstName,
        middleName: middleName?.trim() || null,
        lastName,
        phone: phone.replace(/\s/g, ""),
        email: email.toLowerCase().trim(),
        passwordHash,
        gender: gender || null,
        isPhoneVerified: false,
        isEmailVerified: false,
      },
    });

    res.status(201).json({ success: true, message: "Account created successfully. Please verify your email." });
  } catch (err) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] || "field";
      return res.status(409).json({ success: false, message: `${field === "email" ? "Email" : "Phone"} already registered` });
    }
    console.error("signup error:", err);
    res.status(500).json({ success: false, message: "Signup failed" });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "Identifier and password required" });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier.toLowerCase().trim() }, { phone: identifier.replace(/\s/g, "") }] },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, passwordHash: true, userType: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("managenz_token", token, COOKIE_OPTIONS);

    const { passwordHash, ...safeUser } = user;
    // ✅ FIXED: Added 'data:' key explicitly
    res.json({ success: true, message: "Login successful", data: { user: safeUser } });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  res.clearCookie("managenz_token", COOKIE_OPTIONS);
  res.json({ success: true, message: "Logged out" });
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const token = req.cookies?.managenz_token;
    if (!token) return res.status(401).json({ success: false, message: "Not authenticated" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, firstName: true, middleName: true, lastName: true, email: true, phone: true, 
        gender: true, userType: true, isEmailVerified: true, isPhoneVerified: true, 
        plan: true, selectedDomainId: true, createdAt: true 
      },
    });

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    // ✅ FIXED: Added 'data:' key explicitly
    res.json({ success: true, data: { user } });
  } catch (err) {
    console.error("getMe error:", err);
    res.status(401).json({ success: false, message: "Invalid session" });
  }
};