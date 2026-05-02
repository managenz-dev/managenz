const prisma = require("../utils/prisma");

// GET /api/analytics/me — personal analytics
exports.getMyAnalytics = async (req, res, next) => {
  try {
    const sessions = await prisma.simulationSession.findMany({
      where: { userId: req.user.id, status: "COMPLETED" },
      include: {
        score: true,
        useCase: {
          include: { domain: true },
        },
      },
      orderBy: { completedAt: "asc" },
    });

    if (sessions.length === 0) {
      return res.json({
        success: true,
        data: {
          totalCompleted: 0,
          avgScore: 0,
          bestScore: 0,
          scoreHistory: [],
          dimensionAverages: {
            strategicThinking: 0,
            financialDiscipline: 0,
            stakeholderMgmt: 0,
            riskManagement: 0,
            leadershipStability: 0,
          },
          domainBreakdown: [],
          variableFinalAverages: {},
        },
      });
    }

    const scores = sessions.map((s) => s.score).filter(Boolean);

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s.overallScore, 0) / scores.length)
      : 0;

    const bestScore = scores.length > 0
      ? Math.round(Math.max(...scores.map((s) => s.overallScore)))
      : 0;

    const scoreHistory = sessions
      .filter((s) => s.score)
      .map((s, i) => ({
        index: i + 1,
        score: Math.round(s.score.overallScore),
        title: s.useCase.title,
        domain: s.useCase.domain.name,
        completedAt: s.completedAt,
      }));

    const dimensionAverages = {
      strategicThinking:  Math.round(scores.reduce((sum, s) => sum + (s.strategicThinking || 0), 0) / (scores.length || 1)),
      financialDiscipline: Math.round(scores.reduce((sum, s) => sum + (s.financialDiscipline || 0), 0) / (scores.length || 1)),
      stakeholderMgmt:    Math.round(scores.reduce((sum, s) => sum + (s.stakeholderMgmt || 0), 0) / (scores.length || 1)),
      riskManagement:     Math.round(scores.reduce((sum, s) => sum + (s.riskManagement || 0), 0) / (scores.length || 1)),
      leadershipStability: Math.round(scores.reduce((sum, s) => sum + (s.leadershipStability || 0), 0) / (scores.length || 1)),
    };

    // Domain breakdown
    const domainMap = {};
    sessions.forEach((s) => {
      const domainName = s.useCase.domain.name;
      if (!domainMap[domainName]) {
        domainMap[domainName] = { domain: domainName, count: 0, totalScore: 0 };
      }
      domainMap[domainName].count++;
      if (s.score) domainMap[domainName].totalScore += s.score.overallScore;
    });

    const domainBreakdown = Object.values(domainMap).map((d) => ({
      domain: d.domain,
      count: d.count,
      avgScore: Math.round(d.totalScore / d.count),
    }));

    // Variable final averages
    const variableFinalAverages = {
      Revenue:              Math.round(sessions.reduce((sum, s) => sum + (s.varRevenue || 50), 0) / sessions.length),
      Budget:               Math.round(sessions.reduce((sum, s) => sum + (s.varBudget || 70), 0) / sessions.length),
      TeamMorale:           Math.round(sessions.reduce((sum, s) => sum + (s.varTeamMorale || 65), 0) / sessions.length),
      InvestorConfidence:   Math.round(sessions.reduce((sum, s) => sum + (s.varInvestorConfidence || 60), 0) / sessions.length),
      RiskExposure:         Math.round(sessions.reduce((sum, s) => sum + (s.varRiskExposure || 30), 0) / sessions.length),
      CustomerSatisfaction: Math.round(sessions.reduce((sum, s) => sum + (s.varCustomerSatisfaction || 55), 0) / sessions.length),
      BrandPerception:      Math.round(sessions.reduce((sum, s) => sum + (s.varBrandPerception || 50), 0) / sessions.length),
      StakeholderTrust:     Math.round(sessions.reduce((sum, s) => sum + (s.varStakeholderTrust || 60), 0) / sessions.length),
    };

    res.json({
      success: true,
      data: {
        totalCompleted: sessions.length,
        avgScore,
        bestScore,
        scoreHistory,
        dimensionAverages,
        domainBreakdown,
        variableFinalAverages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/analytics/leaderboard — top scores
exports.getLeaderboard = async (req, res, next) => {
  try {
    const topScores = await prisma.score.findMany({
      orderBy: { overallScore: "desc" },
      take: 20,
      include: {
        session: {
          include: {
            user: { select: { id: true, name: true } },
            useCase: {
              include: { domain: { select: { name: true, slug: true } } },
            },
          },
        },
      },
    });

    const leaderboard = topScores.map((score, i) => ({
      rank: i + 1,
      userName: score.session.user.name,
      userId: score.session.user.id,
      score: Math.round(score.overallScore),
      simulationTitle: score.session.useCase.title,
      domain: score.session.useCase.domain.name,
      completedAt: score.session.completedAt,
      isCurrentUser: score.session.user.id === req.user.id,
    }));

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    next(error);
  }
};