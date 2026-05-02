const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/session.controller");
const { authenticate } = require("../middleware/auth");

router.post("/start", authenticate, sessionController.startSession);
router.get("/:sessionId/question", authenticate, sessionController.getCurrentQuestion);
router.post("/:sessionId/decide", authenticate, sessionController.submitDecision);
router.get("/:sessionId/result", authenticate, sessionController.getResult);

module.exports = router;