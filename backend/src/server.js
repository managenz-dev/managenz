// backend/src/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const app = express();

// ── Security & Middleware ──────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // ✅ MUST be true for cookies to work
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Rate Limiters ─────────────────────────────────────────────────────────────
const limiter = rateLimit({ 
  windowMs: 60_000, 
  max: 500, 
  standardHeaders: true, 
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." }
});

const authLimiter = rateLimit({ 
  windowMs: 60_000, 
  max: 20, 
  standardHeaders: true, 
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts, please try again later." }
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "ManaGenz API running", timestamp: new Date().toISOString() });
});

// ── Safe Route Loader (prevents crashes if file missing) ───────────────────────
function safeRoute(path) {
  try { 
    return require(path); 
  } catch (e) {
    console.warn(`⚠️ Route file not found: ${path} — ${e.message}`);
    const r = require("express").Router();
    r.all("*", (req, res) => res.status(501).json({ success: false, message: `Route ${path} not implemented` }));
    return r;
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────
// ✅ Auth routes (with rate limiter) - ONLY ONE mounting
app.use("/api/auth", authLimiter, require("./routes/auth"));

// ✅ OTP routes (for email verification)
app.use("/api/otp", limiter, safeRoute("./routes/otp.routes"));

// ✅ Domain selection routes
app.use("/api/domains", limiter, require("./routes/domains"));

// ✅ Onboarding routes
app.use("/api/onboarding", limiter, require("./routes/onboarding.routes"));

// ✅ Admin routes
app.use("/api/admin", limiter, require("./routes/admin"));

// ✅ Employee routes
app.use("/api/emp", limiter, require("./routes/employee.routes"));

// ✅ Simulation routes
app.use("/api/simulations", limiter, require("./routes/simulation-player.routes"));

// ✅ Optional routes (won't crash if missing)
app.use("/api/badges", limiter, safeRoute("./routes/badge.routes"));
app.use("/api", limiter, safeRoute("./routes/leaderboard-analytics"));
app.use("/api/feedback", limiter, safeRoute("./routes/feedback.routes"));

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `${req.method} ${req.path} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌", err.message);
  if (process.env.NODE_ENV === "development") console.error(err.stack);

  let message = err.message || "Internal server error";
  let status = err.status || 500;

  if (err.code === "P2002") {
    const field = err.meta?.target?.[0] || "field";
    message = `This ${field} is already taken`;
    status = 409;
  } else if (err.code === "P2025") {
    message = "Resource not found";
    status = 404;
  } else if (err.name === "ValidationError") {
    message = err.errors?.[0]?.msg || message;
    status = 400;
  } else if (err.name === "JsonWebTokenError") {
    message = "Invalid authentication token";
    status = 401;
  } else if (err.name === "TokenExpiredError") {
    message = "Session expired, please log in again";
    status = 401;
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { 
      stack: err.stack,
      code: err.code,
      meta: err.meta 
    }),
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
// ✅ Use PORT 10000 for Render compatibility, fallback to 5000 for local
const PORT = process.env.PORT || 10000;

const startServer = async () => {
  try {
    const prisma = require("./utils/prisma");
    await prisma.$connect();
    console.log("✅ Database connected");
    
    app.listen(PORT, () => {
      console.log(`🚀 ManaGenz API on port ${PORT}`);
      console.log(`📡 Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};
startServer();

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
process.on("beforeExit", async () => {
  console.log("\n🔄 Process exiting, disconnecting database...");
  const prisma = require("./utils/prisma");
  await prisma.$disconnect();
});

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    const prisma = require("./utils/prisma");
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 Unhandled Rejection at:", promise, "reason:", reason);
});