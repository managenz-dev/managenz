// backend/src/routes/onboarding.routes.js
const express = require("express");
const router = express.Router();
const { setUserType, selectDomains } = require("../controllers/userOnboarding.controller");
const { authenticate } = require("../middleware/auth");

router.use(authenticate); // All onboarding routes require auth
router.post("/set-user-type", setUserType);
router.post("/select-domains", selectDomains);

module.exports = router;