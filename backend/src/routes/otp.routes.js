// backend/src/routes/otp.routes.js
const express = require("express");
const router = express.Router();
const { sendOTP, verifyOTP, resendOTP } = require("../controllers/otp.controller");

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

module.exports = router;