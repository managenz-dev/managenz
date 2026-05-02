// backend/src/routes/admin.js
const express = require("express");
const router  = express.Router();
const c       = require("../controllers/admin.controller");
const { adminLogin, adminLogout, verifyAdmin } = require("../controllers/adminAuth.controller");

// Analytics controller loaded safely — missing file won't crash startup
let ac = null;
try { ac = require("../controllers/admin-analytics.controller"); } catch {}

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/login",  adminLogin);
router.post("/logout", adminLogout);
router.get ("/verify", verifyAdmin, (req, res) => res.json({ success: true }));

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get("/stats", verifyAdmin, c.getStats);

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get("/analytics", verifyAdmin, (req, res, next) => {
  if (ac && typeof ac.getAnalytics === "function") return ac.getAnalytics(req, res, next);
  res.status(501).json({ success: false, message: "Analytics not yet available" });
});

// ── Domains ───────────────────────────────────────────────────────────────────
router.get   ("/domains",       verifyAdmin, c.getAllDomains);
router.post  ("/domains",       verifyAdmin, c.createDomain);
router.patch ("/domains/:id",   verifyAdmin, c.updateDomain);
router.delete("/domains/:id",   verifyAdmin, c.deleteDomain);

// ── Simulations (admin panel calls these as /usecases for backwards compat) ───
router.get   ("/domains/:domainId/usecases", verifyAdmin, c.getUseCasesByDomain);
router.get   ("/usecases",                   verifyAdmin, c.getAllUseCases);
router.get   ("/usecases/:id",               verifyAdmin, c.getUseCaseFull);
router.post  ("/usecases",                   verifyAdmin, c.createUseCase);
router.patch ("/usecases/:id",               verifyAdmin, c.updateUseCase);
router.delete("/usecases/:id",               verifyAdmin, c.deleteUseCase);
router.patch ("/usecases/:id/restore",       verifyAdmin, c.restoreUseCase);
router.post  ("/usecases/:id/approve",       verifyAdmin, c.approveSimulation);
router.post  ("/usecases/:id/reject",        verifyAdmin, c.rejectSimulation);

// ── Story ─────────────────────────────────────────────────────────────────────
router.post("/usecases/:useCaseId/story",        verifyAdmin, c.saveStory);
router.post("/usecases/:useCaseId/opening-scene",verifyAdmin, c.saveOpeningScene);

// ── Characters ────────────────────────────────────────────────────────────────
router.get   ("/usecases/:useCaseId/characters", verifyAdmin, c.getCharacters);
router.post  ("/usecases/:useCaseId/characters", verifyAdmin, c.createCharacter);
router.patch ("/characters/:characterId",        verifyAdmin, c.updateCharacter);
router.delete("/characters/:characterId",        verifyAdmin, c.deleteCharacter);

// ── Dialogues (legacy) ────────────────────────────────────────────────────────
router.post("/usecases/:useCaseId/dialogues", verifyAdmin, c.saveDialogues);

// ── Variables ─────────────────────────────────────────────────────────────────
router.get   ("/usecases/:useCaseId/variables", verifyAdmin, c.getVariables);
router.post  ("/usecases/:useCaseId/variables", verifyAdmin, c.createVariable);
router.patch ("/variables/:variableId",         verifyAdmin, c.updateVariable);
router.delete("/variables/:variableId",         verifyAdmin, c.deleteVariable);

// ── Scoring Dimensions ────────────────────────────────────────────────────────
router.get   ("/usecases/:useCaseId/scoring", verifyAdmin, c.getScoringDimensions);
router.post  ("/usecases/:useCaseId/scoring", verifyAdmin, c.createScoringDimension);
router.patch ("/scoring/:dimId",              verifyAdmin, c.updateScoringDimension);
router.delete("/scoring/:dimId",              verifyAdmin, c.deleteScoringDimension);

// ── Endings ───────────────────────────────────────────────────────────────────
router.post  ("/usecases/:useCaseId/endings", verifyAdmin, c.createEnding);
router.patch ("/endings/:endingId",           verifyAdmin, c.updateEnding);
router.delete("/endings/:endingId",           verifyAdmin, c.deleteEnding);

// ── Pre-Decision Conversations ────────────────────────────────────────────────
router.post  ("/usecases/:useCaseId/pre-decision", verifyAdmin, c.createPreDecision);
router.patch ("/pre-decision/:convoId",            verifyAdmin, c.updatePreDecision);
router.delete("/pre-decision/:convoId",            verifyAdmin, c.deletePreDecision);

// ── Questions / Decisions ─────────────────────────────────────────────────────
router.get   ("/usecases/:useCaseId/questions", verifyAdmin, c.getQuestions);
router.post  ("/usecases/:useCaseId/questions", verifyAdmin, c.createQuestion);
router.patch ("/questions/:questionId",         verifyAdmin, c.updateQuestion);
router.delete("/questions/:questionId",         verifyAdmin, c.deleteQuestion);

// ── Options ───────────────────────────────────────────────────────────────────
router.post  ("/questions/:questionId/options", verifyAdmin, c.createOption);
router.patch ("/options/:optionId",             verifyAdmin, c.updateOption);
router.delete("/options/:optionId",             verifyAdmin, c.deleteOption);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get  ("/users",                  verifyAdmin, c.getAllUsers);
router.patch("/users/:userId/upgrade",  verifyAdmin, c.upgradeToPremium);

// ── Employee Management (Admin panel → /admin/employees) ──────────────────────
router.get   ("/employees",          verifyAdmin, c.getEmployees);
router.post  ("/employees",          verifyAdmin, c.createEmployee);
router.patch ("/employees/:empId",   verifyAdmin, c.updateEmployee);
router.delete("/employees/:empId",   verifyAdmin, c.deleteEmployee);

// ── Results tab helpers ───────────────────────────────────────────────────────
router.post("/usecases/:useCaseId/grade-descriptions", verifyAdmin, c.saveGradeDescriptions);
router.post("/usecases/:useCaseId/dimension-bands",    verifyAdmin, c.saveDimensionBands);
router.post("/usecases/:useCaseId/reports",            verifyAdmin, c.saveReports);
router.post("/usecases/:useCaseId/senior-perspective", verifyAdmin, c.saveSeniorPerspective);

module.exports = router;