const express = require("express");
const router = express.Router();
const useCaseController = require("../controllers/usecase.controller");

router.get("/", useCaseController.getUseCases);
router.get("/:slug", useCaseController.getUseCaseBySlug);

module.exports = router;
