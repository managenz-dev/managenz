// backend/src/controllers/simulation-player.controller.js
// ✅ FIXED: Handles both authenticated users AND guest/diagnostic mode
const prisma = require("../utils/prisma");

// ── Sanitise decision before sending to client (hides impact deltas) ──────────
function sanitizeDecision(d) {
  return {
    id:                d.id,
    questionNumber:    d.sequenceOrder,
    sequenceOrder:     d.sequenceOrder,
    tag:               d.tag              || null,
    weekLabel:         d.weekLabel        || null,
    charactersPresent: d.charactersPresent || [],
    situationUpdate:   d.situationUpdate  || null,
    questionText:      d.questionText,
    context:           d.contextNote      || null,
    options: (d.options || []).map(o => ({
      id:              o.id,
      optionLabel:     o.optionLabel,
      title:           o.title,
      description:     o.description,
      strategyTag:     o.strategyTag || null,
    })),
  };
}

// ── Weighted overall score ─────────────────────────────────────────────────────
function calcOverallScore(variables, varStates) {
  let wSum = 0, wTotal = 0;
  variables.forEach(v => {
    const state = varStates.find(s => s.simulationVariableId === v.id);
    const val   = state?.currentValue ?? v.startingValue;
    const w     = parseFloat(String(v.dimensionWeight)) || 1.0;
    wSum   += (v.higherIsBetter ? val : 100 - val) * w;
    wTotal += w;
  });
  return wTotal > 0 ? Math.round(wSum / wTotal) : 50;
}

// ── Per-dimension scores ───────────────────────────────────────────────────────
const DIM_GROUPS = {
  FINANCIAL:   ["FINANCIAL_PRUDENCE"],
  STAKEHOLDER: ["STAKEHOLDER_ALIGNMENT"],
  RISK:        ["RISK_MANAGEMENT"],
  STRATEGY:    ["STRATEGIC_CLARITY"],
  LEADERSHIP:  ["LEADERSHIP_CREDIBILITY", "TEAM_MORALE"],
};

function calcDimensionScores(variables, varStates) {
  const display = {};
  for (const [key, dims] of Object.entries(DIM_GROUPS)) {
    const dVars = variables.filter(v => dims.includes(v.scoringDimension));
    if (!dVars.length) continue;
    let wSum = 0, wTotal = 0;
    dVars.forEach(v => {
      const state = varStates.find(s => s.simulationVariableId === v.id);
      const val   = state?.currentValue ?? v.startingValue;
      const w     = parseFloat(String(v.dimensionWeight)) || 1.0;
      wSum   += (v.higherIsBetter ? val : 100 - val) * w;
      wTotal += w;
    });
    display[key] = wTotal > 0 ? Math.round(wSum / wTotal) : 50;
  }

  const fieldMap = {
    FINANCIAL_PRUDENCE:     "financialPrudence",
    STAKEHOLDER_ALIGNMENT:  "stakeholderAlignment",
    RISK_MANAGEMENT:        "riskManagement",
    LEADERSHIP_CREDIBILITY: "leadershipCredibility",
    TEAM_MORALE:            "teamMorale",
    STRATEGIC_CLARITY:      "strategicClarity",
  };
  const fields = {};
  variables.forEach(v => {
    const field = fieldMap[v.scoringDimension];
    if (!field) return;
    const state = varStates.find(s => s.simulationVariableId === v.id);
    const val   = state?.currentValue ?? v.startingValue;
    if (!fields[field]) fields[field] = { sum: 0, weight: 0 };
    const w = parseFloat(String(v.dimensionWeight)) || 1.0;
    fields[field].sum    += (v.higherIsBetter ? val : 100 - val) * w;
    fields[field].weight += w;
  });
  const scoreFields = {};
  for (const [f, { sum, weight }] of Object.entries(fields)) {
    scoreFields[f] = weight > 0 ? Math.round(sum / weight) : 50;
  }

  return { display, scoreFields };
}

// ── GET /api/simulations/:slug ─────────────────────────────────────────────────
// ✅ PUBLIC: Works for guests AND authenticated users
exports.getSimulation = async (req, res, next) => {
  try {
    const { slug } = req.params;
    // ✅ Safe access: userId is undefined for guests
    const userId = req.user?.id;

    const sim = await prisma.simulation.findFirst({
      where:   { slug, isPublished: true, isDeleted: false },
      include: {
        domain:    { select: { id: true, slug: true, name: true, colorHex: true } },
        story:     true,
        variables: { where: { isVisible: true }, orderBy: { sortOrder: "asc" } },
        characters: {
          include: { character: true },
          orderBy: { introOrder: "asc" },
        },
        conversations: {
          where:   { sequenceOrder: 0 },
          include: {
            messages: {
              orderBy: { sequenceOrder: "asc" },
              include: { character: { select: { id: true, name: true, role: true } } },
            },
          },
        },
        // ✅ Only fetch sessions if user is authenticated
        sessions: userId ? {
          where:   { userId },
          include: {
            variableStates: true,
            logs:           { select: { decisionId: true } },
            result:         { select: { overallScore: true } },
          },
          orderBy: { createdAt: "desc" },
          take:    1,
        } : false,
        _count: { select: { decisions: true } },
      },
    });

    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    const session = sim.sessions?.[0] || null;

    // Build variable values map
    const variableValues = {};
    sim.variables.forEach(v => {
      if (session?.variableStates?.length) {
        const state = session.variableStates.find(s => s.simulationVariableId === v.id);
        variableValues[v.variableName] = state?.currentValue ?? v.startingValue;
      } else {
        variableValues[v.variableName] = v.startingValue;
      }
    });

    // Build opening dialogues
    const openingDialogues = [];
    (sim.conversations[0]?.messages || []).forEach(m => {
      openingDialogues.push({
        id:            m.id,
        characterId:   m.character?.id   || null,
        characterName: m.character?.name || (m.metadata?.characterName) || "Narrator",
        characterRole: m.character?.role || (m.metadata?.characterRole) || "",
        isPlayer:      false,
        text:          m.content,
        sortOrder:     m.sequenceOrder,
        messageType:   m.messageType,
      });
    });

    return res.json({
      success: true,
      data: {
        simulation: {
          id:               sim.id,
          slug:             sim.slug,
          title:            sim.title,
          description:      sim.description,
          difficulty:       sim.difficultyLevel,
          totalQuestions:   sim.totalQuestions || sim._count.decisions,
          estimatedMinutes: sim.estimatedMinutes,
          isPremium:        sim.isPremium,
          story:            sim.story,
          domain:           sim.domain,
          variables:        sim.variables,
          characters:       sim.characters.map(sc => ({
            id:             sc.id,
            name:           sc.character.name,
            role:           sc.character.role,
            isPlayer:       sc.isPlayer,
            trustLevel:     sc.trustLevel,
            emotionalState: sc.emotionalState,
            keyConcern:     sc.keyConcern,
          })),
          dialogues: openingDialogues,
        },
        // ✅ Only include session if user is authenticated
        session: session ? {
          id:                   session.id,
          status:               session.status,
          answeredCount:        session.logs?.length || 0,
          currentQuestionIndex: session.logs?.length || 0,
          variableValues,
          score:                session.result?.overallScore ?? null,
        } : null,
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/simulations/:slug/start ──────────────────────────────────────────
// ✅ PROTECTED: Requires authentication (user or guest token)
exports.startSession = async (req, res, next) => {
  try {
    const { slug } = req.params;
    // ✅ Require auth for session start
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Authentication required to start simulation" });
    }
    const userId = req.user.id;

    const sim = await prisma.simulation.findFirst({
      where:   { slug, isPublished: true, isDeleted: false },
      include: {
        variables: { orderBy: { sortOrder: "asc" } },
        decisions: {
          orderBy: { sequenceOrder: "asc" },
          include: { options: { orderBy: { optionLabel: "asc" } } },
        },
        sessions: {
          where:   { userId, status: "IN_PROGRESS" },
          include: {
            logs:           { orderBy: { createdAt: "asc" } },
            variableStates: true,
          },
          take: 1,
        },
      },
    });

    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    let session = sim.sessions[0] || null;

    if (!session) {
      session = await prisma.simulationSession.create({
        data: {
          userId,
          simulationId: sim.id,
          status:       "IN_PROGRESS",
          variableStates: {
            create: sim.variables.map(v => ({
              simulationVariableId: v.id,
              currentValue:         v.startingValue,
            })),
          },
        },
        include: { logs: true, variableStates: true },
      });
    }

    const answeredIds   = new Set(session.logs.map(l => l.decisionId));
    const nextDecision  = sim.decisions.find(d => !answeredIds.has(d.id));

    const variableValues = {};
    sim.variables.forEach(v => {
      const state = session.variableStates.find(s => s.simulationVariableId === v.id);
      variableValues[v.variableName] = state?.currentValue ?? v.startingValue;
    });

    return res.json({
      success: true,
      data: {
        sessionId:            session.id,
        currentQuestionIndex: session.logs.length,
        totalQuestions:       sim.decisions.length,
        variables:            sim.variables,
        variableValues,
        question:             nextDecision ? sanitizeDecision(nextDecision) : null,
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/simulations/:slug/answer ─────────────────────────────────────────
// ✅ PROTECTED: Requires authentication
exports.submitAnswer = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { sessionId, questionId, optionId } = req.body;
    const decisionId = questionId;
    
    // ✅ Require auth for answer submission
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const userId = req.user.id;

    if (!sessionId || !decisionId || !optionId)
      return res.status(400).json({ success: false, message: "sessionId, questionId, optionId required" });

    const session = await prisma.simulationSession.findFirst({
      where:   { id: sessionId, userId, status: { in: ["IN_PROGRESS", "ABANDONED"] } },
      include: { variableStates: true },
    });
    if (!session) return res.status(403).json({ success: false, message: "Invalid or expired session. Please restart." });

    const already = await prisma.decisionLog.findFirst({ where: { sessionId, decisionId } });
    if (already) return res.status(400).json({ success: false, message: "Question already answered" });

    const option = await prisma.option.findFirst({
      where:   { id: optionId, decisionId },
      include: { impacts: { include: { simulationVariable: true } } },
    });
    if (!option) return res.status(404).json({ success: false, message: "Option not found" });

    const existingCount = await prisma.decisionLog.count({ where: { sessionId } });

    const variableChanges = [];
    for (const impact of option.impacts) {
      const state = session.variableStates.find(s => s.simulationVariableId === impact.simulationVariableId);
      if (!state) continue;
      const newValue = Math.max(0, Math.min(100, state.currentValue + impact.delta));
      await prisma.sessionVariableState.update({
        where: { id: state.id },
        data:  { currentValue: newValue },
      });
      variableChanges.push({
        variableId:   impact.simulationVariableId,
        variableName: impact.simulationVariable.variableName,
        displayName:  impact.simulationVariable.displayName,
        delta:        impact.delta,
        oldValue:     state.currentValue,
        newValue,
      });
    }

    await prisma.decisionLog.create({
      data: { sessionId, decisionId, optionId, decisionNumber: existingCount + 1 },
    });

    const updatedStates = await prisma.sessionVariableState.findMany({
      where:   { sessionId },
      include: { simulationVariable: true },
    });
    const variableValues = {};
    updatedStates.forEach(s => { variableValues[s.simulationVariable.variableName] = s.currentValue; });

    const allLogs    = await prisma.decisionLog.findMany({ where: { sessionId } });
    const answeredIds= new Set(allLogs.map(l => l.decisionId));
    const sim        = await prisma.simulation.findFirst({
      where:   { slug, isDeleted: false },
      include: {
        decisions: {
          orderBy: { sequenceOrder: "asc" },
          include: { options: { orderBy: { optionLabel: "asc" } } },
        },
      },
    });
    const nextDecision = sim.decisions.find(d => !answeredIds.has(d.id));

    return res.json({
      success: true,
      data: {
        consequence:    option.consequenceText,
        variableChanges,
        variableValues,
        answeredCount:  allLogs.length,
        totalQuestions: sim.decisions.length,
        isLastQuestion: !nextDecision,
        nextQuestion:   nextDecision ? sanitizeDecision(nextDecision) : null,
      },
    });
  } catch (err) { next(err); }
};

// ── POST /api/simulations/:slug/complete ───────────────────────────────────────
// ✅ PROTECTED: Requires authentication
exports.completeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    
    // ✅ Require auth for completion
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const userId = req.user.id;

    const session = await prisma.simulationSession.findFirst({
      where:   { id: sessionId, userId, status: { in: ["IN_PROGRESS", "ABANDONED"] } },
      include: {
        variableStates: { include: { simulationVariable: true } },
        simulation:     { include: { variables: true } },
      },
    });
    if (!session) return res.status(403).json({ success: false, message: "Invalid session" });

    const vars         = session.simulation.variables;
    const overallScore = calcOverallScore(vars, session.variableStates);
    const { display, scoreFields } = calcDimensionScores(vars, session.variableStates);

    const customScores = { _dimensions: display };
    session.variableStates.forEach(s => {
      customScores[s.simulationVariable.variableName] = s.currentValue;
    });

    const existingResult = await prisma.attemptResult.findUnique({ where: { sessionId } });
    if (existingResult) {
      await prisma.simulationSession.update({
        where: { id: sessionId },
        data:  { status: "COMPLETED", completedAt: new Date() },
      });
    } else {
      const perf = overallScore >= 90 ? "EXCELLENT"
                 : overallScore >= 80 ? "GREAT"
                 : overallScore >= 70 ? "GOOD"
                 : overallScore >= 60 ? "AVERAGE"
                 : "BELOW_PAR";

      await prisma.simulationSession.update({
        where: { id: sessionId },
        data:  {
          status:      "COMPLETED",
          completedAt: new Date(),
          result: {
            create: {
              overallScore,
              performanceLevel: perf,
              customScores,
              ...scoreFields,
            },
          },
        },
      });
    }

    return res.json({ success: true, data: { overallScore, dimensionScores: display } });
  } catch (err) { next(err); }
};

// ── GET /api/simulations/:slug/result ──────────────────────────────────────────
// ✅ PROTECTED: Requires authentication
exports.getResult = async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    // ✅ Require auth for results
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const userId = req.user.id;

    const resultInclude = {
      result:         true,
      variableStates: { include: { simulationVariable: true } },
      logs: {
        orderBy: { decisionNumber: "asc" },
        include: {
          option:   {
            include: { impacts: { include: { simulationVariable: { select: { displayName: true } } } } },
          },
          decision: {
            select: { id: true, sequenceOrder: true, questionText: true, tag: true, situationUpdate: true },
          },
        },
      },
      simulation: {
        include: {
          story:     true,
          variables: true,
          domain:    { select: { slug: true, name: true } },
        },
      },
    };

    let session = await prisma.simulationSession.findFirst({
      where:   { userId, status: "COMPLETED", simulation: { slug } },
      include: resultInclude,
      orderBy: { completedAt: "desc" },
      take:    1,
    });

    if (!session) {
      const inProg = await prisma.simulationSession.findFirst({
        where:   { userId, status: { in: ["IN_PROGRESS", "ABANDONED"] }, simulation: { slug } },
        include: {
          variableStates: { include: { simulationVariable: true } },
          simulation:     { include: { variables: true } },
        },
        orderBy: { createdAt: "desc" },
        take:    1,
      });

      if (!inProg) return res.status(404).json({ success: false, message: "No session found for this simulation" });

      const vars         = inProg.simulation.variables;
      const overallScore = calcOverallScore(vars, inProg.variableStates);
      const { display, scoreFields } = calcDimensionScores(vars, inProg.variableStates);
      const customScores = { _dimensions: display };
      inProg.variableStates.forEach(s => { customScores[s.simulationVariable.variableName] = s.currentValue; });

      const perf = overallScore >= 90 ? "EXCELLENT"
                 : overallScore >= 80 ? "GREAT"
                 : overallScore >= 70 ? "GOOD"
                 : overallScore >= 60 ? "AVERAGE"
                 : "BELOW_PAR";

      const hasResult = await prisma.attemptResult.findUnique({ where: { sessionId: inProg.id } });
      if (!hasResult) {
        await prisma.simulationSession.update({
          where: { id: inProg.id },
          data:  {
            status: "COMPLETED", completedAt: new Date(),
            result: { create: { overallScore, performanceLevel: perf, customScores, ...scoreFields } },
          },
        });
      } else {
        await prisma.simulationSession.update({
          where: { id: inProg.id },
          data:  { status: "COMPLETED", completedAt: new Date() },
        });
      }

      session = await prisma.simulationSession.findUnique({
        where:   { id: inProg.id },
        include: resultInclude,
      });
    }

    if (!session) return res.status(404).json({ success: false, message: "No session found" });

    return res.json({
      success: true,
      data: {
        sessionId: session.id,
        result:    session.result,
        variables: session.variableStates.map(s => ({
          variableId:     s.simulationVariableId,
          variableName:   s.simulationVariable.variableName,
          displayName:    s.simulationVariable.displayName,
          unit:           s.simulationVariable.unit,
          startingValue:  s.simulationVariable.startingValue,
          finalValue:     Math.round(s.currentValue),
          delta:          Math.round(s.currentValue - s.simulationVariable.startingValue),
          higherIsBetter: s.simulationVariable.higherIsBetter,
        })),
        answers: session.logs.map((l, i) => ({
          questionNumber:  l.decisionNumber || i + 1,
          questionText:    l.decision.questionText,
          questionTag:     l.decision.tag,
          situationUpdate: l.decision.situationUpdate,
          chosenOption: {
            label:       l.option.optionLabel,
            title:       l.option.title,
            description: l.option.description,
            strategyTag: l.option.strategyTag,
            consequence: l.option.consequenceText,
            impacts:     l.option.impacts.map(imp => ({
              displayName: imp.simulationVariable.displayName,
              delta:       imp.delta,
            })),
          },
        })),
        simulation: {
          title:  session.simulation.title,
          slug,
          story:  session.simulation.story,
          domain: session.simulation.domain,
        },
      },
    });
  } catch (err) { next(err); }
};