// backend/src/routes/auth.js
const express = require("express");
const router = express.Router();
const { signup, login, logout, getMe } = require("../controllers/userAuth.controller");

// ✅ PUBLIC ROUTES (No authentication required)
router.post("/signup", signup);
router.post("/login", login);

// ✅ PROTECTED ROUTES (Authentication required)
router.post("/logout", logout);
router.get("/me", getMe);

module.exports = router;