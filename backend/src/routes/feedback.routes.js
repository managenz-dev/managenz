// backend/src/routes/feedback.routes.js
const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedback.controller");
const { authenticate } = require("../middleware/auth");

// Public/Student: Get feedback
router.post("/simulation/:simulationId/act/:actNumber", authenticate, feedbackController.getActFeedback);

// Admin/Intern: Save content
router.post("/content/save", authenticate, feedbackController.saveActFeedback);

module.exports = router;