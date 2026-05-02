// backend/src/controllers/domain.controller.js
// Student-facing domain controller — aligned to new Neon schema
// New schema: Simulation (not UseCase), AttemptResult (not Score), sessions relation
const prisma = require("../utils/prisma");

// GET /api/domains  — public, no auth needed
exports.getAllDomains = async (req, res, next) => {
  try {
    const domains = await prisma.domain.findMany({
      where:   { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, slug: true, name: true,
        description: true, colorHex: true, iconName: true,
        _count: {
          select: { simulations: { where: { isPublished: true, isDeleted: false } } },
        },
      },
    });
    return res.json({ success: true, data: domains });
  } catch (err) { next(err); }
};

// GET /api/domains/:slug
exports.getDomainBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const domain = await prisma.domain.findFirst({
      where:  { slug, isActive: true },
      select: { id: true, slug: true, name: true, description: true, colorHex: true, iconName: true },
    });
    if (!domain) return res.status(404).json({ success: false, message: "Domain not found" });
    return res.json({ success: true, data: { domain } });
  } catch (err) { next(err); }
};

// GET /api/domains/:slug/use-cases
exports.getUseCasesForDomain = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const userId   = req.user?.id;

    const domain = await prisma.domain.findFirst({
      where:  { slug, isActive: true },
      select: { id: true },
    });
    if (!domain) return res.status(404).json({ success: false, message: "Domain not found" });

    const simulations = await prisma.simulation.findMany({
      where:   { domainId: domain.id, isPublished: true, isDeleted: false },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true, slug: true, title: true, description: true,
        difficultyLevel: true, totalQuestions: true,
        estimatedMinutes: true, isPremium: true, sequenceOrder: true,
        story: { select: { companyBackground: true } },
        ...(userId && {
          sessions: {
            where:   { userId },
            select:  { id: true, status: true, result: { select: { overallScore: true } } },
            orderBy: { createdAt: "desc" },
            take:    1,
          },
        }),
      },
    });

    const formatted = simulations.map(sim => {
      const session = (sim.sessions || [])[0] || null;
      return {
        id: sim.id, slug: sim.slug, title: sim.title,
        description: sim.description, difficulty: sim.difficultyLevel,
        totalQuestions: sim.totalQuestions, estimatedMinutes: sim.estimatedMinutes,
        isPremium: sim.isPremium, sequenceOrder: sim.sequenceOrder, story: sim.story,
        session: session
          ? { id: session.id, status: session.status, score: session.result?.overallScore ?? null }
          : null,
      };
    });

    return res.json({ success: true, data: { simulations: formatted } });
  } catch (err) { next(err); }
};