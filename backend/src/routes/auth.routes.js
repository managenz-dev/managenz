// backend/src/routes/auth.routes.js
const express = require("express");
const router = express.Router();
const { signup, login, logout, getMe } = require("../controllers/userAuth.controller");

// Simple rate limiter (remove if you don't have it set up yet)
const limiter = (req, res, next) => next();

// ✅ PUBLIC ROUTES (No auth required)
router.post("/signup", limiter, signup);
router.post("/login", limiter, login);

// ✅ PROTECTED ROUTES (Auth required - handled inside controller or middleware)
router.post("/logout", logout);
router.get("/me", getMe);

module.exports = router;