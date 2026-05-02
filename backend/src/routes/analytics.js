const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.controller");
const { authenticate } = require("../middleware/auth");

router.get("/me", authenticate, analyticsController.getMyAnalytics);
router.get("/leaderboard", authenticate, analyticsController.getLeaderboard);

module.exports = router;