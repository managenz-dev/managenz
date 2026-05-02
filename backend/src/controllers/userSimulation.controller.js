// backend/src/controllers/userSimulation.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ── Helper: Clamp value between 0-100 ────────────────────────────────────────
const clamp = (val) => Math.max(0, Math.min(100, Math.round(val)));

// ── GET /domains ─────────────────────────────────────────────────────────────
exports.listPublicDomains = async (req, res) => {
  try {
    const domains = await prisma.domain.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        iconName: true,
        colorHex: true,
        _count: { select: { simulations: { where: { isPublished: true, status: "PUBLISHED" } } } },
      },
      orderBy: { sortOrder: "asc" },
    });
    res.json({ success: true, data: domains });
  } catch (err) {
    console.error("listPublicDomains error:", err);
    res.status(500).json({ success: false, message: "Failed to load domains" });
  }
};

// ── GET /domains/:slug ───────────────────────────────────────────────────────
exports.getDomainDetail = async (req, res) => {
  try {
    const { slug } = req.params;
    const domain = await prisma.domain.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        iconName: true,
        colorHex: true,
      },
    });
    if (!domain) return res.status(404).json({ success: false, message: "Domain not found" });
    res.json({ success: true, data: domain });
  } catch (err) {
    console.error("getDomainDetail error:", err);
    res.status(500).json({ success: false, message: "Failed to load domain" });
  }
};

// ── GET /simulations/:slug ───────────────────────────────────────────────────
exports.getSimulationOverview = async (req, res) => {
  try {
    const { slug } = req.params;
    const sim = await prisma.simulation.findFirst({
      where: {
        slug,
        isPublished: true,
        status: "PUBLISHED",
        isDeleted: false,
      },
      include: {
        domain: { select: { id: true, name: true, slug: true, colorHex: true } },
        variables: {
          select: {
            id: true,
            variableName: true,
            displayName: true,
            startingValue: true,
            unit: true,
            higherIsBetter: true,
            scoringDimension: true,
          },
        },
        story: {
          select: {
            companyBackground: true,
            howItWorks: true,
            closingChallenge: true,
          },
        },
      },
    });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    // Map variables to frontend format
    const variables = sim.variables.map((v) => ({
      id: v.id,
      variableName: v.variableName,
      displayName: v.displayName,
      startingValue: v.startingValue,
      unit: v.unit,
      higherIsBetter: v.higherIsBetter,
    }));

    res.json({
      success: true,
      data: {
        simulation: {
          id: sim.id,
          title: sim.title,
          slug: sim.slug,
          difficulty: sim.difficultyLevel,
          difficultyLabel: sim.difficultyLabel,
          userTypeTarget: sim.userTypeTarget,
          estimatedMinutes: sim.estimatedMinutes,
          totalQuestions: sim.totalQuestions,
          isPremium: sim.isPremium,
          domain: sim.domain,
          story: sim.story,
          variables,
        },
      },
    });
  } catch (err) {
    console.error("getSimulationOverview error:", err);
    res.status(500).json({ success: false, message: "Failed to load simulation" });
  }
};

// ── POST /simulations/:slug/start ────────────────────────────────────────────
exports.startUserSession = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id; // From verifyUser middleware

    // Find simulation
    const sim = await prisma.simulation.findFirst({
      where: {
        slug,
        isPublished: true,
        status: "PUBLISHED",
        isDeleted: false,
      },
      include: { variables: true },
    });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    // Check for existing active session
    const existing = await prisma.simulationSession.findFirst({
      where: {
        userId: userId || null, // Allow null for anonymous
        simulationId: sim.id,
        status: "IN_PROGRESS",
      },
    });

    let session;
    if (existing) {
      session = existing;
    } else {
      // Create new session
      const variableStates = sim.variables.map((v) => ({
        simulationVariableId: v.id,
        currentValue: v.startingValue, // Integer, clamped 0-100
      }));

      session = await prisma.simulationSession.create({
        data: {
          userId: userId || null,
          simulationId: sim.id,
          status: "IN_PROGRESS",
          currentDecision: 1,
          variableStates: { create: variableStates },
        },
        include: { variableStates: { include: { simulationVariable: true } } },
      });
    }

    // Get first question
    const firstDecision = await prisma.decision.findFirst({
      where: { simulationId: sim.id, sequenceOrder: 1 },
      include: {
        options: {
          select: {
            id: true,
            optionLabel: true,
            title: true,
            description: true,
            strategyTag: true,
          },
        },
      },
      orderBy: { sequenceOrder: "asc" },
    });

    // Build variable values map for frontend
    const variableValues = {};
    session.variableStates.forEach((vs) => {
      variableValues[vs.simulationVariable.variableName] = vs.currentValue;
    });

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        currentQuestionIndex: session.currentDecision - 1,
        totalQuestions: sim.totalQuestions,
        variables: sim.variables.map((v) => ({
          id: v.id,
          variableName: v.variableName,
          displayName: v.displayName,
          startingValue: v.startingValue,
          unit: v.unit,
          higherIsBetter: v.higherIsBetter,
        })),
        variableValues,
        question: firstDecision
          ? {
              id: firstDecision.id,
              orderIndex: firstDecision.sequenceOrder,
              tag: firstDecision.tag,
              situationUpdate: firstDecision.situationUpdate,
              questionText: firstDecision.questionText,
              context: firstDecision.contextNote,
              options: firstDecision.options,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("startUserSession error:", err);
    res.status(500).json({ success: false, message: "Failed to start session" });
  }
};

// ── POST /sessions/:sessionId/answer ─────────────────────────────────────────
exports.submitUserAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { questionId, optionId } = req.body;
    const userId = req.user?.id;

    // Verify session ownership
    const session = await prisma.simulationSession.findUnique({
      where: { id: sessionId, userId: userId || null, status: "IN_PROGRESS" },
      include: {
        simulation: { include: { variables: true } },
        variableStates: { include: { simulationVariable: true } },
      },
    });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Get decision and selected option
    const decision = await prisma.decision.findUnique({
      where: { id: questionId, simulationId: session.simulationId },
      include: {
        options: {
          where: { id: optionId },
          include: {
            impacts: { include: { simulationVariable: true } },
          },
        },
      },
    });
    if (!decision || decision.options.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid option" });
    }
    const selectedOption = decision.options[0];

    // Capture variable states BEFORE applying impacts
    const variablesBefore = {};
    session.variableStates.forEach((vs) => {
      variablesBefore[vs.simulationVariable.variableName] = vs.currentValue;
    });

    // Apply impacts (integer-only, clamped 0-100)
    const updates = [];
    const variableChanges = [];

    for (const impact of selectedOption.impacts) {
      const currentState = session.variableStates.find(
        (vs) => vs.simulationVariableId === impact.simulationVariableId
      );
      if (!currentState) continue;

      const newValue = clamp(currentState.currentValue + impact.delta); // Integer delta
      updates.push({
        where: { id: currentState.id },
        data: { currentValue: newValue },
      });

      variableChanges.push({
        variableName: impact.simulationVariable.variableName,
        displayName: impact.simulationVariable.displayName,
        delta: impact.delta,
        oldValue: currentState.currentValue,
        newValue,
      });
    }

    // Update variable states in DB
    if (updates.length > 0) {
      await prisma.sessionVariableState.updateMany({ data: updates });
    }

    // Log the decision
    await prisma.decisionLog.create({
      data: {
        sessionId: session.id,
        decisionId: decision.id,
        optionId: selectedOption.id,
        decisionNumber: decision.sequenceOrder,
        variablesBefore,
        variablesAfter: variableChanges.reduce((acc, c) => {
          acc[c.variableName] = c.newValue;
          return acc;
        }, {}),
      },
    });

    // Update session progress
    const nextDecisionNumber = session.currentDecision + 1;
    const isLastQuestion = nextDecisionNumber > session.simulation.totalQuestions;

    await prisma.simulationSession.update({
      where: { id: session.id },
      data: {
        currentDecision: isLastQuestion ? session.simulation.totalQuestions : nextDecisionNumber,
        status: isLastQuestion ? "COMPLETED" : "IN_PROGRESS",
        completedAt: isLastQuestion ? new Date() : null,
      },
    });

    // Get next question (if not last)
    let nextQuestion = null;
    if (!isLastQuestion) {
      const nextDecision = await prisma.decision.findFirst({
        where: {
          simulationId: session.simulationId,
          sequenceOrder: nextDecisionNumber,
        },
        include: {
          options: {
            select: {
              id: true,
              optionLabel: true,
              title: true,
              description: true,
              strategyTag: true,
            },
          },
        },
        orderBy: { sequenceOrder: "asc" },
      });
      if (nextDecision) {
        nextQuestion = {
          id: nextDecision.id,
          orderIndex: nextDecision.sequenceOrder,
          tag: nextDecision.tag,
          situationUpdate: nextDecision.situationUpdate,
          questionText: nextDecision.questionText,
          context: nextDecision.contextNote,
          options: nextDecision.options,
        };
      }
    }

    // Build updated variable values
    const updatedVariableValues = {};
    const updatedStates = await prisma.sessionVariableState.findMany({
      where: { sessionId: session.id },
      include: { simulationVariable: true },
    });
    updatedStates.forEach((vs) => {
      updatedVariableValues[vs.simulationVariable.variableName] = vs.currentValue;
    });

    res.json({
      success: true,
      data: {
        consequence: selectedOption.consequenceText,
        variableChanges,
        variableValues: updatedVariableValues,
        isLastQuestion,
        nextQuestion,
        answeredCount: session.currentDecision,
      },
    });
  } catch (err) {
    console.error("submitUserAnswer error:", err);
    res.status(500).json({ success: false, message: "Failed to submit answer" });
  }
};

// ── POST /sessions/:sessionId/complete ───────────────────────────────────────
exports.completeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    const session = await prisma.simulationSession.findUnique({
      where: { id: sessionId, userId: userId || null },
      include: { simulation: true },
    });
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    // Mark as completed if not already
    if (session.status !== "COMPLETED") {
      await prisma.simulationSession.update({
        where: { id: sessionId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    // Trigger scoring (simplified for now - full scoring engine in separate service)
    // For now, just return success
    res.json({ success: true, message: "Session completed" });
  } catch (err) {
    console.error("completeSession error:", err);
    res.status(500).json({ success: false, message: "Failed to complete session" });
  }
};

// ── GET /sessions/:sessionId/result ──────────────────────────────────────────
exports.getSessionResult = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    const session = await prisma.simulationSession.findUnique({
      where: { id: sessionId, userId: userId || null, status: "COMPLETED" },
      include: {
        simulation: {
          include: {
            variables: true,
            scoringDimensions: true,
          },
        },
        variableStates: { include: { simulationVariable: true } },
        logs: { include: { option: true, decision: true } },
      },
    });
    if (!session) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    // Calculate dimension scores (simplified)
    const dimensionScores = {};
    session.simulation.scoringDimensions.forEach((dim) => {
      const taggedVars = session.simulation.variables.filter(
        (v) => v.scoringDimension === dim.dimensionKey
      );
      if (taggedVars.length === 0) {
        dimensionScores[dim.displayName] = { score: 50, grade: "C" }; // Default
        return;
      }

      let total = 0;
      taggedVars.forEach((v) => {
        const state = session.variableStates.find((vs) => vs.simulationVariableId === v.id);
        let value = state?.currentValue ?? v.startingValue;
        // Invert if higherIsBetter is false
        if (!v.higherIsBetter) value = 100 - value;
        total += value;
      });
      const avg = Math.round(total / taggedVars.length);
      const grade = calculateGrade(avg); // Helper function below
      dimensionScores[dim.displayName] = { score: avg, grade };
    });

    // Calculate overall grade (point conversion)
    const gradePoints = { "A+": 10, A: 9, "B+": 8, B: 7, "C+": 6, C: 5, "D+": 4, D: 3, E: 2, F: 1 };
    const points = Object.values(dimensionScores).map((d) => gradePoints[d.grade]);
    const avgPoints = Math.round(points.reduce((a, b) => a + b, 0) / points.length);
    const overallGrade = Object.keys(gradePoints).find((g) => gradePoints[g] === avgPoints) || "C";

    // Determine ending profile (simplified)
    const endingProfile = determineEndingProfile(dimensionScores, session.simulation.userTypeTarget);

    res.json({
      success: true,
      data: {
        overallGrade,
        overallScore: Math.round(points.reduce((a, b) => a + b, 0) / points.length * 10),
        dimensions: Object.entries(dimensionScores).map(([name, data]) => ({
          name,
          score: data.score,
          grade: data.grade,
        })),
        endingProfile,
        decisionLog: session.logs.map((log) => ({
          decisionNumber: log.decisionNumber,
          question: log.decision.questionText,
          selectedOption: log.option.title,
          strategyTag: log.option.strategyTag,
        })),
      },
    });
  } catch (err) {
    console.error("getSessionResult error:", err);
    res.status(500).json({ success: false, message: "Failed to load result" });
  }
};

// ── Helper: Calculate letter grade from score ────────────────────────────────
function calculateGrade(score) {
  if (score >= 91) return "A+";
  if (score >= 81) return "A";
  if (score >= 71) return "B+";
  if (score >= 61) return "B";
  if (score >= 51) return "C+";
  if (score >= 41) return "C";
  if (score >= 31) return "D+";
  if (score >= 21) return "D";
  if (score >= 11) return "E";
  return "F";
}

// ── Helper: Determine ending profile ─────────────────────────────────────────
function determineEndingProfile(dimensionScores, userType) {
  const scores = Object.values(dimensionScores).map((d) => d.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (avg >= 80) return { type: "COMPLETE", title: "The Complete Leader" };
  if (avg >= 60) return { type: "STRATEGIC", title: "The Strategic Thinker" };
  if (avg >= 40) return { type: "FIREFIGHTER", title: "The Adaptive Problem-Solver" };
  return { type: "LEARNING", title: "The Emerging Leader" };
}

// ── Additional endpoints (getUserProfile, listPublicSimulations, etc.) ───────
// ... [Implement similarly with proper Prisma queries]