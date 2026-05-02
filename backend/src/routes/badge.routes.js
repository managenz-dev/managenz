// File: backend/src/routes/badge.routes.js
const express          = require("express");
const router           = express.Router();
const c                = require("../controllers/badge.controller");
const { authenticate } = require("../middleware/auth");

// Public — no auth
router.get("/:publicId", c.getPublicBadge);

// Protected
router.use(authenticate);
router.get ("/",       c.getMyBadges);
router.post("/create", c.createBadge);

module.exports = router;