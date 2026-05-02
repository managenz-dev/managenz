const prisma = require("../utils/prisma");

// ─────────────────────────────────────────────────────────────────────────────
// Helper: clamp value between 0 and 100
// ─────────────────────────────────────────────────────────────────────────────
const clamp = (val) => Math.min(100, Math.max(0, val));

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build variable state object from session
// ─────────────────────────────────────────────────────────────────────────────
const getVariableState = async (sessionId) => {
  const states = await prisma.sessionVariableState.findMany({
    where: { sessionId },
    include: { variable: true },
  });
  const result = {};
  for (const s of states) {
    result[s.variable.variableName] = {
      id: s.variableId,
      displayName: s.variable.displayName,
      currentValue: s.currentValue,
      startingValue: s.variable.startingValue,
      unit: s.variable.unit,
      higherIsBetter: s.variable.higherIsBetter,
      scoringDimension: s.variable.scoringDimension,
      dimensionWeight: s.variable.dimensionWeight,
      sortOrder: s.variable.sortOrder,
    };
  }
  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: calculate scores from final variable state
// ─────────────────────────────────────────────────────────────────────────────
const calculateScores = async (sessionId, useCaseId) => {
  const states = await prisma.sessionVariableState.findMany({
    where: { sessionId },
    include: { variable: true },
  });

  const dimensionConfigs = await prisma.scoringDimensionConfig.findMany({
    where: { useCaseId },
    orderBy: { sortOrder: "asc" },
  });

  const dimensionGroups = {};
  for (const state of states) {
    const dim = state.variable.scoringDimension;
    if (dim === "CUSTOM") continue;
    if (!dimensionGroups[dim]) dimensionGroups[dim] = [];
    dimensionGroups[dim].push(state);
  }

  const dimensionScores = {};
  for (const [dim, varStates] of Object.entries(dimensionGroups)) {
    let totalWeightedScore = 0;
    let totalWeight = 0;
    for (const state of varStates) {
      const v = state.variable;
      const weight = v.dimensionWeight || 1.0;
      const score = v.higherIsBetter
        ? clamp(state.currentValue)
        : clamp(100 - state.currentValue);
      totalWeightedScore += score * weight;
      totalWeight += weight;
    }
    dimensionScores[dim] =
      totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 50;
  }

  const customScores = {};
  for (const config of dimensionConfigs) {
    const score = dimensionScores[config.dimensionKey] || 50;
    customScores[config.dimensionKey] = {
      displayName: config.displayName,
      description: config.description,
      score,
    };
  }

  const allScores = Object.values(dimensionScores);
  const overallScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((sum, s) => sum + s, 0) / allScores.length)
      : 50;

  return {
    overallScore,
    financialPrudence: dimensionScores["FINANCIAL_PRUDENCE"] || null,
    stakeholderAlignment: dimensionScores["STAKEHOLDER_ALIGNMENT"] || null,
    riskManagement: dimensionScores["RISK_MANAGEMENT"] || null,
    leadershipCredibility: dimensionScores["LEADERSHIP_CREDIBILITY"] || null,
    teamMorale: dimensionScores["TEAM_MORALE"] || null,
    strategicClarity: dimensionScores["STRATEGIC_CLARITY"] || null,
    customScores,
    dimensionConfigs,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/start
//
// ONE ATTEMPT PER USER RULE:
//   1. If user has a COMPLETED session for this use case → return alreadyCompleted: true
//      with the existing sessionId so the frontend can show their old result.
//   2. If user has an IN_PROGRESS session → resume it (original behaviour).
//   3. Otherwise → create a new session.
// ─────────────────────────────────────────────────────────────────────────────
exports.startSession = async (req, res, next) => {
  try {
    const { useCaseId, useCaseSlug } = req.body;
    const userId = req.user.id;

    // Validate: need at least one identifier
    if (!useCaseId && !useCaseSlug) {
      return res.status(400).json({
        success: false,
        message: "useCaseId or useCaseSlug is required",
      });
    }

    // Look up the use case by id OR slug
    const useCase = await prisma.useCase.findFirst({
      where: useCaseId ? { id: useCaseId } : { slug: useCaseSlug },
      include: {
        story: true,
        characters: { orderBy: { sortOrder: "asc" } },
        dialogues: {
          orderBy: { sortOrder: "asc" },
          include: { character: true },
        },
        variables: { orderBy: { sortOrder: "asc" } },
        questions: { orderBy: { questionNumber: "asc" } },
      },
    });

    if (!useCase) {
      return res.status(404).json({ success: false, message: "Simulation not found" });
    }

    if (!useCase.isPublished) {
      return res.status(403).json({ success: false, message: "Simulation not available" });
    }

    // Check premium access
    if (useCase.isPremium) {
      const subscription = await prisma.subscription.findUnique({ where: { userId } });
      if (!subscription || subscription.plan !== "PREMIUM") {
        return res.status(403).json({
          success: false,
          message: "Premium subscription required",
        });
      }
    }

    // ── ONE ATTEMPT RULE ─────────────────────────────────────────────────────
    // Check for an already COMPLETED session first
    const completedSession = await prisma.simulationSession.findFirst({
      where: { userId, useCaseId: useCase.id, status: "COMPLETED" },
      include: { score: true },
    });

    if (completedSession) {
      // User has already finished this simulation. Block them and send back
      // the existing session ID so the frontend can display their old result.
      return res.status(200).json({
        success: true,
        data: {
          alreadyCompleted: true,
          sessionId: completedSession.id,
          completedAt: completedSession.completedAt,
          overallScore: completedSession.score?.overallScore || 0,
          useCase: {
            id: useCase.id,
            title: useCase.title,
            slug: useCase.slug,
          },
        },
      });
    }
    // ── END ONE ATTEMPT RULE ─────────────────────────────────────────────────

    // Check for an existing IN_PROGRESS session → resume
    const existingSession = await prisma.simulationSession.findFirst({
      where: { userId, useCaseId: useCase.id, status: "IN_PROGRESS" },
    });

    if (existingSession) {
      const variableState = await getVariableState(existingSession.id);
      return res.json({
        success: true,
        data: {
          alreadyCompleted: false,
          sessionId: existingSession.id,
          currentQuestionNumber: existingSession.currentQuestionNumber,
          isResumed: true,
          variableState,
          useCase: {
            id: useCase.id,
            title: useCase.title,
            slug: useCase.slug,
            totalQuestions: useCase.totalQuestions,
            estimatedMinutes: useCase.estimatedMinutes,
            story: useCase.story,
            characters: useCase.characters,
            dialogues: useCase.dialogues,
            variables: useCase.variables,
          },
        },
      });
    }

    // Create brand new session
    const session = await prisma.simulationSession.create({
      data: {
        userId,
        useCaseId: useCase.id,
        status: "IN_PROGRESS",
        currentQuestionNumber: 1,
      },
    });

    // Initialise variable states
    for (const variable of useCase.variables) {
      await prisma.sessionVariableState.create({
        data: {
          sessionId: session.id,
          variableId: variable.id,
          currentValue: variable.startingValue,
        },
      });
    }

    const variableState = await getVariableState(session.id);

    // Increment play count
    await prisma.useCase.update({
      where: { id: useCase.id },
      data: { playCount: { increment: 1 } },
    });

    return res.json({
      success: true,
      data: {
        alreadyCompleted: false,
        sessionId: session.id,
        currentQuestionNumber: 1,
        isResumed: false,
        variableState,
        useCase: {
          id: useCase.id,
          title: useCase.title,
          slug: useCase.slug,
          totalQuestions: useCase.totalQuestions,
          estimatedMinutes: useCase.estimatedMinutes,
          story: useCase.story,
          characters: useCase.characters,
          dialogues: useCase.dialogues,
          variables: useCase.variables,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/:sessionId/question
// ─────────────────────────────────────────────────────────────────────────────
exports.getCurrentQuestion = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const session = await prisma.simulationSession.findUnique({
      where: { id: sessionId },
      include: {
        useCase: {
          include: {
            questions: {
              orderBy: { questionNumber: "asc" },
              include: {
                options: {
                  include: {
                    impacts: { include: { variable: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    if (session.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (session.status === "COMPLETED") {
      return res.status(400).json({ success: false, message: "Session already completed" });
    }

    const question = session.useCase.questions.find(
      (q) => q.questionNumber === session.currentQuestionNumber
    );

    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const variableState = await getVariableState(sessionId);

    const formattedOptions = question.options.map((opt) => ({
      id: opt.id,
      optionLabel: opt.optionLabel,
      title: opt.title,
      description: opt.description,
      strategyTag: opt.strategyTag,
    }));

    return res.json({
      success: true,
      data: {
        question: {
          id: question.id,
          questionNumber: question.questionNumber,
          tag: question.tag,
          situationUpdate: question.situationUpdate,
          questionText: question.questionText,
          context: question.context,
          options: formattedOptions,
        },
        totalQuestions: session.useCase.questions.length,
        variableState,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/:sessionId/decide
// ─────────────────────────────────────────────────────────────────────────────
exports.submitDecision = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { optionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }
    if (!optionId) {
      return res.status(400).json({ success: false, message: "optionId is required" });
    }

    const session = await prisma.simulationSession.findUnique({
      where: { id: sessionId },
      include: {
        useCase: {
          include: {
            questions: {
              orderBy: { questionNumber: "asc" },
              include: {
                options: {
                  include: {
                    impacts: { include: { variable: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (session.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (session.status === "COMPLETED") {
      return res.status(400).json({ success: false, message: "Session already completed" });
    }

    const currentQuestion = session.useCase.questions.find(
      (q) => q.questionNumber === session.currentQuestionNumber
    );
    if (!currentQuestion) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const selectedOption = currentQuestion.options.find((o) => o.id === optionId);
    if (!selectedOption) {
      return res.status(404).json({ success: false, message: "Option not found" });
    }

    const currentStates = await prisma.sessionVariableState.findMany({
      where: { sessionId },
      include: { variable: true },
    });

    const impactSummary = [];
    for (const impact of selectedOption.impacts) {
      const state = currentStates.find((s) => s.variableId === impact.variableId);
      if (!state) continue;
      const newValue = clamp(state.currentValue + impact.delta);
      await prisma.sessionVariableState.update({
        where: { id: state.id },
        data: { currentValue: newValue },
      });
      impactSummary.push({
        variableName: impact.variable.variableName,
        displayName: impact.variable.displayName,
        delta: impact.delta,
        oldValue: state.currentValue,
        newValue,
        unit: impact.variable.unit,
      });
    }

    await prisma.decisionLog.create({
      data: {
        sessionId,
        questionId: currentQuestion.id,
        optionId,
        questionNumber: session.currentQuestionNumber,
      },
    });

    const totalQuestions = session.useCase.questions.length;
    const isLastQuestion = session.currentQuestionNumber >= totalQuestions;

    if (isLastQuestion) {
      await prisma.simulationSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          currentQuestionNumber: totalQuestions,
          completedAt: new Date(),
        },
      });

      const scores = await calculateScores(sessionId, session.useCaseId);
      await prisma.score.create({
        data: {
          sessionId,
          overallScore: scores.overallScore,
          financialPrudence: scores.financialPrudence,
          stakeholderAlignment: scores.stakeholderAlignment,
          riskManagement: scores.riskManagement,
          leadershipCredibility: scores.leadershipCredibility,
          teamMorale: scores.teamMorale,
          strategicClarity: scores.strategicClarity,
          customScores: scores.customScores,
        },
      });

      const newVariableState = await getVariableState(sessionId);
      return res.json({
        success: true,
        data: { completed: true, impact: impactSummary, newVariableState },
      });
    }

    await prisma.simulationSession.update({
      where: { id: sessionId },
      data: { currentQuestionNumber: session.currentQuestionNumber + 1 },
    });

    const newVariableState = await getVariableState(sessionId);
    return res.json({
      success: true,
      data: {
        completed: false,
        nextQuestionNumber: session.currentQuestionNumber + 1,
        impact: impactSummary,
        newVariableState,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/:sessionId/result
// ─────────────────────────────────────────────────────────────────────────────
exports.getResult = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const session = await prisma.simulationSession.findUnique({
      where: { id: sessionId },
      include: {
        score: true,
        useCase: {
          include: { variables: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }
    if (session.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    if (session.status !== "COMPLETED") {
      return res.status(400).json({ success: false, message: "Session not completed yet" });
    }

    const variableState = await getVariableState(sessionId);
    const dimensionConfigs = await prisma.scoringDimensionConfig.findMany({
      where: { useCaseId: session.useCaseId },
      orderBy: { sortOrder: "asc" },
    });

    return res.json({
      success: true,
      data: {
        sessionId,
        overallScore: session.score?.overallScore || 0,
        customScores: session.score?.customScores || {},
        dimensionConfigs,
        variableState,
        completedAt: session.completedAt,
        useCase: {
          id: session.useCase.id,
          title: session.useCase.title,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};