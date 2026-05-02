const prisma = require("../utils/prisma");

exports.getUseCases = async (req, res, next) => {
  try {
    const { domain, difficulty, premium } = req.query;
    const where = { isPublished: true };

    if (domain) {
      const d = await prisma.domain.findUnique({ where: { slug: domain } });
      if (d) where.domainId = d.id;
    }
    if (difficulty) where.difficulty = difficulty.toUpperCase();
    if (premium !== undefined) where.isPremium = premium === "true";

    const useCases = await prisma.useCase.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        domain: { select: { name: true, slug: true, colorHex: true, iconName: true } },
        _count: { select: { sessions: true } },
      },
    });

    const formatted = useCases.map((uc) => ({
      id: uc.id,
      title: uc.title,
      slug: uc.slug,
      shortDescription: uc.shortDescription,
      difficulty: uc.difficulty,
      estimatedMinutes: uc.estimatedMinutes,
      isPremium: uc.isPremium,
      totalQuestions: uc.totalQuestions,
      playCount: uc._count.sessions,
      domain: uc.domain,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

exports.getUseCaseBySlug = async (req, res, next) => {
  try {
    const useCase = await prisma.useCase.findUnique({
      where: { slug: req.params.slug },
      include: {
        domain: true,
        _count: { select: { sessions: true, questions: true } },
      },
    });

    if (!useCase) {
      return res.status(404).json({ success: false, message: "Use case not found" });
    }

    if (useCase.isPremium && req.user) {
      const sub = req.user.subscription;
      const isPremium = sub && sub.plan !== "FREE" && sub.status === "ACTIVE";
      if (!isPremium) {
        return res.json({
          success: true,
          data: {
            id: useCase.id,
            title: useCase.title,
            slug: useCase.slug,
            shortDescription: useCase.shortDescription,
            difficulty: useCase.difficulty,
            estimatedMinutes: useCase.estimatedMinutes,
            isPremium: true,
            locked: true,
            domain: useCase.domain,
          },
        });
      }
    }

    res.json({ success: true, data: { ...useCase, playCount: useCase._count.sessions } });
  } catch (error) {
    next(error);
  }
};