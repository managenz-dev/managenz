// File: backend/src/controllers/adminAuth.controller.js
// Admin authentication — credentials are stored in environment variables only.
// No admin user exists in the database. This keeps admin access completely
// separate from the student auth system.

const jwt = require("jsonwebtoken");

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_SECRET   = process.env.ADMIN_SECRET;
const COOKIE_NAME    = "admin_token";

// ── Login ─────────────────────────────────────────────────────────────────────
exports.adminLogin = (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_SECRET) {
      console.error("❌ ADMIN_EMAIL, ADMIN_PASSWORD, or ADMIN_SECRET missing from .env");
      return res.status(500).json({ success: false, message: "Admin credentials not configured on server." });
    }

    const emailMatch    = email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase();
    const passwordMatch = password === ADMIN_PASSWORD;

    if (!emailMatch || !passwordMatch) {
      console.log(`Admin login failed — email match: ${emailMatch}, password match: ${passwordMatch}`);
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { role: "admin", email: ADMIN_EMAIL },
      ADMIN_SECRET,
      { expiresIn: "8h" }
    );

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   8 * 60 * 60 * 1000, // 8 hours
    });

    return res.json({ success: true, message: "Admin logged in." });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
exports.adminLogout = (req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax" });
  return res.json({ success: true, message: "Admin logged out." });
};

// ── Middleware: verify admin JWT ──────────────────────────────────────────────
exports.verifyAdmin = (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authenticated." });
    }

    const decoded = jwt.verify(token, ADMIN_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired session." });
  }
};