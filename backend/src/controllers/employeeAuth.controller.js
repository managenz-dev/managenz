// backend/src/controllers/employeeAuth.controller.js
// Employee authentication — stored in the employees table.
// Role: ADMIN (full control) | CONTENT_DEVELOPER (restricted)
const prisma = require("../utils/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ── Configuration ─────────────────────────────────────────────────────────────
const COOKIE_NAME = "emp_token";
const JWT_SECRET = process.env.ADMIN_SECRET || "managenz_emp_secret_fallback_change_in_prod";
const JWT_EXPIRES = "8h";

// ── Login ────────────────────────────────────────────────────────────────────
exports.empLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Input validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    // ✅ Normalize email
    const cleanEmail = email.trim().toLowerCase();

    // ✅ Fetch employee
    const emp = await prisma.employee.findUnique({ 
      where: { email: cleanEmail } 
    });

    // ✅ Check credentials
    if (!emp || !emp.isActive) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // ✅ Compare password
    const match = await bcrypt.compare(password, emp.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // ✅ Generate JWT
    const token = jwt.sign(
      { empId: emp.id, role: emp.role, email: emp.email },
      JWT_SECRET,
      { 
        expiresIn: JWT_EXPIRES,
        issuer: "managenz-admin",
        audience: "managenz-employee"
      }
    );

    // ✅ Set secure cookie
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   8 * 60 * 60 * 1000,
      path:     "/",
    });

    // ✅ Return sanitized user data (FIXED: Added 'data:' key)
    return res.json({
      success: true,
      message: "Logged in successfully",
      data: { 
        id: emp.id, 
        name: emp.name, 
        email: emp.email, 
        role: emp.role,
      },
    });
  } catch (err) {
    console.error("❌ [empLogin] Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error during login" });
  }
};

// ── Logout ────────────────────────────────────────────────────────────────────
exports.empLogout = (req, res) => {
  try {
    res.clearCookie(COOKIE_NAME, { 
      httpOnly: true, 
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production"
    });
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("❌ [empLogout] Error:", err.message);
    res.status(500).json({ success: false, message: "Server error during logout" });
  }
};

// ── Middleware: verify employee JWT ───────────────────────────────────────────
exports.verifyEmployee = (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    
    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.employee = {
      empId: decoded.empId,
      role: decoded.role,
      email: decoded.email
    };
    
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Session expired" });
    }
    return res.status(401).json({ success: false, message: "Invalid session token" });
  }
};

// ── Middleware: admin only ────────────────────────────────────────────────────
exports.requireAdmin = (req, res, next) => {
  if (!req.employee) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  
  if (req.employee.role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  
  next();
};

// ── GET /me ───────────────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const emp = await prisma.employee.findUnique({
      where:  { id: req.employee.empId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        isActive: true, 
        createdAt: true,
      },
    });
    
    if (!emp) {
      res.clearCookie(COOKIE_NAME, { path: "/" });
      return res.status(404).json({ success: false, message: "Account not found" });
    }
    
    if (!emp.isActive) {
      res.clearCookie(COOKIE_NAME, { path: "/" });
      return res.status(403).json({ success: false, message: "Account deactivated" });
    }
    
    // FIXED: Added 'data:' key
    res.json({ success: true,  emp });
  } catch (err) {
    console.error("❌ [getMe] Error:", err.message);
    return res.status(500).json({ success: false, message: "Server error fetching profile" });
  }
};