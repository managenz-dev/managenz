// ─────────────────────────────────────────────────────────────────────────────
// Simulation Player Routes
// File: backend/src/routes/simulation-player.routes.js
// ─────────────────────────────────────────────────────────────────────────────
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/simulation-player.controller");
const { authenticate, optionalAuth } = require("../middleware/auth");

// ✅ PUBLIC: Anyone can view simulation overview (no login required)
router.get("/:slug", ctrl.getSimulation);

// ✅ PROTECTED: These require authentication (login or guest token)
// Use optionalAuth to support both authenticated users AND diagnostic guests
router.use(optionalAuth);

router.post("/:slug/start", ctrl.startSession);    // create/resume session
router.post("/:slug/answer", ctrl.submitAnswer);   // submit answer → get consequence
router.post("/:slug/complete", ctrl.completeSession); // finalise + calculate score
router.get("/:slug/result", ctrl.getResult);       // full breakdown for result page

module.exports = router;