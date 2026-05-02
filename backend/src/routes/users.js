const express = require("express");
const router = express.Router();
const usersController = require("../controllers/user.controller");
const { authenticate } = require("../middleware/auth");

router.get("/profile",   authenticate, usersController.getProfile);
router.put("/profile",   authenticate, usersController.updateProfile);
router.get("/dashboard", authenticate, usersController.getDashboard);

module.exports = router;