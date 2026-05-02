// backend/src/middleware/auth.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "managenz-secret-key";

// ── Required Authentication (for protected routes) ───────────────────────────
exports.authenticate = (req, res, next) => {
  try {
    // ✅ Student auth: token from cookie only
    const token = req.cookies?.["managenz_token"];

    if (!token)
      return res.status(401).json({ success: false, message: "Authentication required" });

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// ── Optional Authentication (for routes that work for guests OR users) ───────
exports.optionalAuth = (req, res, next) => {
  try {
    const token = req.cookies?.["managenz_token"];
    
    if (token) {
      // If token exists, try to verify it
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { id: decoded.userId, email: decoded.email };
      // User is authenticated — continue
    }
    // If no token or invalid token, continue anyway (req.user stays undefined)
    // Controller can check: if (req.user) { ... } else { // guest mode }
    next();
  } catch (err) {
    // Token invalid/expired — continue as guest (don't block the request)
    console.warn("Optional auth: invalid token, continuing as guest");
    next();
  }
};