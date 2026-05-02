const express          = require("express");
const router           = express.Router();
const ctrl             = require("../controllers/leaderboard-analytics.controller");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

// Leaderboard
router.get("/leaderboard/domains", ctrl.getDomainList);   // must be before /leaderboard
router.get("/leaderboard",         ctrl.getLeaderboard);

// Analytics
router.get("/analytics/me",        ctrl.getMyAnalytics);

module.exports = router;