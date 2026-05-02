// ─────────────────────────────────────────────────────────────────────────────
// Badge Controller
// File: backend/src/controllers/badge.controller.js
//
// Uses the SimulationBadge model — a per-session earned certificate.
// Each badge has a publicId UUID used as the shareable certificate URL.
// ─────────────────────────────────────────────────────────────────────────────
const prisma = require("../utils/prisma");

// ── Tier logic ────────────────────────────────────────────────────────────────
function getTier(score) {
  if (score >= 90) return "ELITE";
  if (score >= 75) return "STRONG";
  if (score >= 55) return "DEVELOPING";
  return "HIGH_RISK";
}

function getTierLabel(tier) {
  return {
    ELITE:      "Elite Strategist",
    STRONG:     "Strong Leader",
    DEVELOPING: "Developing Manager",
    HIGH_RISK:  "High Risk Manager",
  }[tier] || "Manager";
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/badges/create
// Idempotent — if a badge already exists for this session, returns it.
// ─────────────────────────────────────────────────────────────────────────────
exports.createBadge = async (req, res, next) => {
  try {
    const userId      = req.user.id;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId required" });
    }

    // Return existing badge if already created (idempotent)
    const existing = await prisma.simulationBadge.findFirst({
      where: { sessionId, userId },
    });
    if (existing) {
      return res.json({ success: true, data: existing });
    }

    // Fetch session + score + useCase + domain + user
    const session = await prisma.simulationSession.findFirst({
      where:   { id: sessionId, userId, status: "COMPLETED" },
      include: {
        score:   true,
        useCase: { include: { domain: true } },
        user:    { select: { name: true } },
      },
    });

    if (!session || !session.score) {
      return res.status(404).json({
        success: false,
        message: "Completed session with score not found",
      });
    }

    const score     = Math.round(session.score.overallScore);
    const tier      = getTier(score);
    const tierLabel = getTierLabel(tier);

    const badge = await prisma.simulationBadge.create({
      data: {
        userId,
        sessionId,
        useCaseId:  session.useCaseId,
        domainId:   session.useCase.domainId   || null,
        score,
        tier,
        tierLabel,
        simTitle:   session.useCase.title,
        domainName: session.useCase.domain?.name || "",
        userName:   session.user?.name           || "Student",
      },
    });

    return res.json({ success: true, data: badge });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/badges
// Returns all badges earned by the logged-in user, newest first.
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyBadges = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const badges = await prisma.simulationBadge.findMany({
      where:   { userId },
      orderBy: { earnedAt: "desc" },
    });

    return res.json({ success: true, data: badges });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/badges/:publicId
// PUBLIC — no auth required. Powers the shareable certificate page.
// ─────────────────────────────────────────────────────────────────────────────
exports.getPublicBadge = async (req, res, next) => {
  try {
    const { publicId } = req.params;

    const badge = await prisma.simulationBadge.findFirst({
      where: { publicId },
      select: {
        publicId:   true,
        score:      true,
        tier:       true,
        tierLabel:  true,
        simTitle:   true,
        domainName: true,
        userName:   true,
        earnedAt:   true,
      },
    });

    if (!badge) {
      return res.status(404).json({ success: false, message: "Certificate not found" });
    }

    return res.json({ success: true, data: badge });
  } catch (err) { next(err); }
};