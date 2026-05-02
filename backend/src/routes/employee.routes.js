// backend/src/routes/employee.routes.js
// Mounts at: /api/emp
// Handles both Admin and Content Developer roles via the Employee JWT

const express = require("express");
const router  = express.Router();
const c       = require("../controllers/simulation.controller");
const {
  empLogin, empLogout, getMe,
  verifyEmployee, requireAdmin,
} = require("../controllers/employeeAuth.controller");

// ✅ Import rate limiters for security
const { loginLimiter, apiLimiter } = require("../middleware/rateLimit");

// ── Auth (public) ─────────────────────────────────────────────────────────────
// 🔐 Apply strict login limiter to prevent brute-force attacks
router.post("/login",  loginLimiter, empLogin);

// 🔐 Apply general API limiter to other auth routes
router.post("/logout", apiLimiter, verifyEmployee, empLogout);
router.get ("/me",     apiLimiter, verifyEmployee, getMe);

// From here all routes require a valid employee session
router.use(verifyEmployee);

// ── Admin Stats ───────────────────────────────────────────────────────────────
router.get("/stats", requireAdmin, c.getAdminStats);

// ── Domains (All employees can VIEW, Admin only can MODIFY) ──────────────────
router.get("/domains", apiLimiter, c.listDomains);  // ✅ No requireAdmin - allows all employees to view

// Admin-only domain management
router.post  ("/domains",       requireAdmin, apiLimiter, c.createDomain);
router.patch ("/domains/:id",   requireAdmin, apiLimiter, c.updateDomain);
router.delete("/domains/:id",   requireAdmin, apiLimiter, c.deleteDomain);

// ── Employee Management (Admin only) ─────────────────────────────────────────
router.get   ("/employees",          requireAdmin, apiLimiter, c.listEmployees);
router.post  ("/employees",          requireAdmin, apiLimiter, c.createEmployee);
router.patch ("/employees/:empId",   requireAdmin, apiLimiter, c.updateEmployee);
router.delete("/employees/:empId",   requireAdmin, apiLimiter, c.deleteEmployee);

// ── User Management (Admin only) ──────────────────────────────────────────────
router.get("/users",           requireAdmin, apiLimiter, c.listUsers);
router.get("/users/:userId",   requireAdmin, apiLimiter, c.getUserDetail);

// ── Simulations (All employees, with role-based filters) ──────────────────────
router.get  ("/simulations",      apiLimiter, c.listSimulations);
router.post ("/simulations",      requireAdmin, apiLimiter, c.createSimulation);
router.get  ("/simulations/:id",  apiLimiter, c.getSimulationFull);
router.patch("/simulations/:id",  requireAdmin, apiLimiter, c.updateSimulation);

// Admin-only simulation actions
router.post  ("/simulations/:id/approve",           requireAdmin, apiLimiter, c.approveSimulation);
router.post  ("/simulations/:id/reject",            requireAdmin, apiLimiter, c.rejectSimulation);
router.patch ("/simulations/:id/soft-delete",       requireAdmin, apiLimiter, c.softDeleteSimulation);
router.delete("/simulations/:id",                   requireAdmin, apiLimiter, c.permanentDeleteSimulation);
router.patch ("/simulations/:id/restore",           requireAdmin, apiLimiter, c.restoreSimulation);

// Employee action: submit for review
router.post("/simulations/:id/submit", apiLimiter, c.submitSimulation);

// ── Story (meta tab) ─────────────────────────────────────────────────────────
router.post("/simulations/:simulationId/story", requireAdmin, apiLimiter, c.saveStory);

// ── Variables ─────────────────────────────────────────────────────────────────
router.get   ("/simulations/:simulationId/variables", apiLimiter, c.getVariables);
router.post  ("/simulations/:simulationId/variables", requireAdmin, apiLimiter, c.createVariable);
router.patch ("/variables/:variableId",               requireAdmin, apiLimiter, c.updateVariable);
router.delete("/variables/:variableId",               requireAdmin, apiLimiter, c.deleteVariable);

// ── Characters ────────────────────────────────────────────────────────────────
router.get   ("/simulations/:simulationId/characters", apiLimiter, c.getCharacters);
router.post  ("/simulations/:simulationId/characters", requireAdmin, apiLimiter, c.createCharacter);
router.patch ("/characters/:charId",                   requireAdmin, apiLimiter, c.updateCharacter);
router.delete("/characters/:charId",                   requireAdmin, apiLimiter, c.deleteCharacter);

// ── Conversations & Messages ──────────────────────────────────────────────────
router.get   ("/simulations/:simulationId/conversations", apiLimiter, c.getConversations);
router.post  ("/simulations/:simulationId/conversations", requireAdmin, apiLimiter, c.createConversation);
router.patch ("/conversations/:convoId",                  requireAdmin, apiLimiter, c.updateConversation);
router.delete("/conversations/:convoId",                  requireAdmin, apiLimiter, c.deleteConversation);

router.post  ("/conversations/:convoId/messages", requireAdmin, apiLimiter, c.createMessage);
router.patch ("/messages/:msgId",                 requireAdmin, apiLimiter, c.updateMessage);
router.delete("/messages/:msgId",                 requireAdmin, apiLimiter, c.deleteMessage);

// ── Decisions ─────────────────────────────────────────────────────────────────
router.get   ("/simulations/:simulationId/decisions", apiLimiter, c.getDecisions);
router.post  ("/simulations/:simulationId/decisions", requireAdmin, apiLimiter, c.createDecision);
router.patch ("/decisions/:decisionId",               requireAdmin, apiLimiter, c.updateDecision);
router.delete("/decisions/:decisionId",               requireAdmin, apiLimiter, c.deleteDecision);

// ── Options ───────────────────────────────────────────────────────────────────
router.post  ("/decisions/:decisionId/options", requireAdmin, apiLimiter, c.createOption);
router.patch ("/options/:optionId",             requireAdmin, apiLimiter, c.updateOption);
router.delete("/options/:optionId",             requireAdmin, apiLimiter, c.deleteOption);

// ── Tags ─────────────────────────────────────────────────────────────────────
router.post("/simulations/:simulationId/tags", requireAdmin, apiLimiter, c.saveTags);

module.exports = router;