// backend/src/routes/user.routes.js
// Mounts at: /api (public user endpoints)
// Handles regular users (students, professionals) via User JWT

const express = require("express");
const router = express.Router();
const {
  verifyUser,           // Middleware to verify regular user JWT
  optionalAuth,         // Middleware for optional auth (diagnostic mode)
} = require("../controllers/userAuth.controller");
const c = require("../controllers/userSimulation.controller"); // New controller

// ── Public Endpoints (No Auth Required) ──────────────────────────────────────
// Domain browsing
router.get("/domains", c.listPublicDomains);
router.get("/domains/:slug", c.getDomainDetail);

// Simulation browsing (published only)
router.get("/simulations", c.listPublicSimulations);
router.get("/simulations/:slug", c.getSimulationOverview);

// Diagnostic mode (anonymous, no account required)
router.post("/simulations/:slug/diagnostic/start", c.startDiagnosticSession);
router.post("/diagnostic/:sessionId/answer", c.submitDiagnosticAnswer);

// ── Authenticated User Endpoints ─────────────────────────────────────────────
router.use(verifyUser); // All routes below require valid user JWT

// User profile
router.get("/me", c.getUserProfile);
router.patch("/me", c.updateUserProfile);

// Simulation sessions
router.post("/simulations/:slug/start", c.startUserSession);
router.get("/sessions/:sessionId", c.getSessionState);
router.post("/sessions/:sessionId/answer", c.submitUserAnswer);
router.post("/sessions/:sessionId/complete", c.completeSession);
router.get("/sessions/:sessionId/result", c.getSessionResult);

// User history & progress
router.get("/my-simulations", c.getUserSimulations);
router.get("/my-progress/:domainSlug", c.getUserProgress);

// Badges & sharing
router.post("/badges/:badgeId/share-linkedin", c.shareBadgeLinkedIn);
router.get("/badges/:badgeId/pdf", c.generateBadgePDF);

module.exports = router;