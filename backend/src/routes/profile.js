const express          = require("express");
const router           = express.Router();
const profileCtrl      = require("../controllers/profile.controller");
const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/profile",         profileCtrl.getProfile);
router.get("/check-username",  profileCtrl.checkUsername);
router.patch("/profile",       profileCtrl.updateProfile);
router.patch("/change-password", profileCtrl.changePassword);

module.exports = router;