const prisma = require("../utils/prisma");

// ── GET /api/users/profile ──────────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        subscription: true,
        badges: { include: { badge: true } },
        sessions: {
          where: { status: "COMPLETED" },
          include: {
            useCase: { select: { title: true, domain: { select: { name: true } } } },
            score: true,
          },
          orderBy: { completedAt: "desc" },
          take: 5,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const completedSessions = await prisma.simulationSession.count({
      where: { userId: req.user.id, status: "COMPLETED" },
    });

    const scores = await prisma.score.findMany({
      where: { session: { userId: req.user.id } },
      select: { overallScore: true },
    });

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length)
      : 0;

    const bestScore = scores.length > 0
      ? Math.round(Math.max(...scores.map((s) => s.overallScore)))
      : 0;

    res.json({
      success: true,
      data: {
        user: {
          id:            user.id,
          name:          user.name,
          email:         user.email,
          role:          user.role,
          avatarUrl:     user.avatarUrl,
          bio:           user.bio,
          emailVerified: user.emailVerified,
          createdAt:     user.createdAt,
          subscription:  user.subscription,
        },
        stats: {
          completedSessions,
          avgScore,
          bestScore,
          totalBadges: user.badges.length,
        },
        recentSessions: user.sessions,
        badges: user.badges.map((ub) => ub.badge),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/users/profile ──────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio, avatarUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name      && { name }),
        ...(bio       !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      include: { subscription: true },
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id:           updated.id,
          name:         updated.name,
          email:        updated.email,
          role:         updated.role,
          avatarUrl:    updated.avatarUrl,
          bio:          updated.bio,
          subscription: updated.subscription,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/users/dashboard ──────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [user, completedCount, scores, recentSessions, domains] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
      }),
      prisma.simulationSession.count({
        where: { userId, status: "COMPLETED" },
      }),
      prisma.score.findMany({
        where: { session: { userId } },
        select: { overallScore: true },
      }),
      prisma.simulationSession.findMany({
        where: { userId, status: "COMPLETED" },
        include: {
          useCase: {
            select: {
              title: true,
              difficulty: true,
              domain: { select: { name: true } },
            },
          },
          score: { select: { overallScore: true } },
        },
        orderBy: { completedAt: "desc" },
        take: 5,
      }),
      prisma.domain.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          useCases: {
            where: { isPublished: true },
            select: { id: true, isPremium: true },
          },
        },
      }),
    ]);

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length)
      : 0;

    const bestScore = scores.length > 0
      ? Math.round(Math.max(...scores.map((s) => s.overallScore)))
      : 0;

    const badges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    });

    res.json({
      success: true,
      data: {
        user: {
          id:           user.id,
          name:         user.name,
          email:        user.email,
          avatarUrl:    user.avatarUrl,
          subscription: user.subscription,
        },
        stats: {
          completedSessions: completedCount,
          avgScore,
          bestScore,
          totalBadges: badges.length,
        },
        recentSessions,
        domains,
        badges: badges.map((ub) => ub.badge),
      },
    });
  } catch (error) {
    next(error);
  }
};