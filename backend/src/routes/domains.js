// backend/src/routes/domains.js
// Student-facing domain routes — mounted at /api/domains in server.js
const express          = require("express");
const router           = express.Router();
const ctrl             = require("../controllers/domain.controller");
const { authenticate } = require("../middleware/auth");

// ── Public: list all active domains (used by select-domain page after signup)
// No auth required — page is shown before user is fully set up
router.get("/", ctrl.getAllDomains);

// ── Authenticated routes below ────────────────────────────────────────────────
router.use(authenticate);

// GET /api/domains/:slug          — single domain info
router.get("/:slug", ctrl.getDomainBySlug);

// GET /api/domains/:slug/use-cases — all simulations for that domain
router.get("/:slug/use-cases", ctrl.getUseCasesForDomain);

module.exports = router;