// backend/src/controllers/simulation.controller.js
// Handles ALL simulation CRUD — used by both Admin and Employee routes.
// Schema: Simulation → Decision → Option → OptionImpact
//         Simulation → SimulationVariable (→ Variable global)
//         Simulation → SimulationCharacter (→ Character global)
//         Simulation → Conversation → Message
//         Simulation → StorySection
const prisma = require("../utils/prisma");

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 80);
}

async function uniqueSlug(base) {
  let slug = slugify(base);
  let exists = await prisma.simulation.findUnique({ where: { slug } });
  let i = 2;
  while (exists) {
    slug = `${slugify(base)}-${i++}`;
    exists = await prisma.simulation.findUnique({ where: { slug } });
  }
  return slug;
}

// Full include for builder — returns everything needed to populate all tabs
const FULL_INCLUDE = {
  domain:     { select: { id: true, name: true, slug: true, colorHex: true } },
  story:      true,
  characters: {
    include: { character: true },
    orderBy: { introOrder: "asc" },
  },
  variables:  { orderBy: { sortOrder: "asc" } },
  conversations: {
    orderBy: { sequenceOrder: "asc" },
    include: {
      messages: {
        orderBy: { sequenceOrder: "asc" },
        include: { character: { select: { id: true, name: true, role: true } } },
      },
    },
  },
  decisions: {
    orderBy: { sequenceOrder: "asc" },
    include: {
      options: {
        orderBy: { optionLabel: "asc" },
        include: { impacts: { include: { simulationVariable: true } } },
      },
    },
  },
  endings:    { orderBy: { sortOrder: "asc" } },
  scoringDimensions: { orderBy: { sortOrder: "asc" } },
  gradeBands: true,
  tags:       true,
};

// ─────────────────────────────────────────────────────────────────────────────
// LIST & DETAIL
// ─────────────────────────────────────────────────────────────────────────────

exports.listSimulations = async (req, res, next) => {
  try {
    const { domainId, status, difficulty, search, page = "1", limit = "20" } = req.query;
    const emp    = req.employee;
    const where  = { isDeleted: false };

    // Employees only see their own simulations
    if (emp.role === "CONTENT_DEVELOPER") where.createdBy = emp.empId;

    if (domainId)   where.domainId      = domainId;
    if (status)     where.status        = status;
    if (difficulty) where.difficultyLevel = difficulty;
    if (search)     where.title = { contains: search, mode: "insensitive" };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const take  = parseInt(limit);

    const [sims, total] = await Promise.all([
      prisma.simulation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          domain:   { select: { id: true, name: true, colorHex: true } },
          creator:  { select: { id: true, name: true } },
          _count:   { select: { decisions: true, sessions: true } },
        },
      }),
      prisma.simulation.count({ where }),
    ]);

    res.json({ success: true, data: { simulations: sims, total, page: parseInt(page), limit: take } });
  } catch (err) { next(err); }
};

exports.getSimulationFull = async (req, res, next) => {
  try {
    const { id } = req.params;
    const emp    = req.employee;

    const sim = await prisma.simulation.findFirst({
      where: {
        id,
        isDeleted: false,
        ...(emp.role === "CONTENT_DEVELOPER" && { createdBy: emp.empId }),
      },
      include: FULL_INCLUDE,
    });

    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });
    res.json({ success: true, data: sim });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE SIMULATION
// ─────────────────────────────────────────────────────────────────────────────

exports.createSimulation = async (req, res, next) => {
  try {
    const {
      domainId, title, description, difficultyLevel, userTypeTarget,
      estimatedMinutes, isPremium, openingScene,
    } = req.body;
    const emp = req.employee;

    if (!domainId || !title || !description)
      return res.status(400).json({ success: false, message: "domainId, title, description are required" });

    const domain = await prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) return res.status(404).json({ success: false, message: "Domain not found" });

    const slug = await uniqueSlug(title);
    const sim  = await prisma.simulation.create({
      data: {
        domainId,
        createdBy:       emp.empId,
        title,
        slug,
        description,
        difficultyLevel: difficultyLevel  || "FOUNDATIONAL",
        userTypeTarget:  userTypeTarget   || null,
        estimatedMinutes: parseInt(estimatedMinutes) || 30,
        isPremium:       !!isPremium,
        openingScene:    openingScene     || null,
        status:          "DRAFT",
      },
      include: { domain: { select: { id: true, name: true } } },
    });

    res.json({ success: true, message: "Simulation created", data: sim });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE SIMULATION METADATA
// ─────────────────────────────────────────────────────────────────────────────

exports.updateSimulation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const emp    = req.employee;
    const {
      title, description, difficultyLevel, userTypeTarget,
      estimatedMinutes, isPremium, openingScene, sortOrder, sequenceOrder,
    } = req.body;

    const sim = await prisma.simulation.findFirst({
      where: { id, isDeleted: false },
    });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    // Employees cannot edit after submission
    if (emp.role === "CONTENT_DEVELOPER") {
      if (sim.createdBy !== emp.empId)
        return res.status(403).json({ success: false, message: "Access denied" });
      if (sim.status !== "DRAFT")
        return res.status(403).json({ success: false, message: "Cannot edit after submission" });
    }

    const data = {};
    if (title            !== undefined) { data.title = title; data.slug = await uniqueSlug(title); }
    if (description      !== undefined) data.description      = description;
    if (difficultyLevel  !== undefined) data.difficultyLevel  = difficultyLevel;
    if (userTypeTarget   !== undefined) data.userTypeTarget   = userTypeTarget || null;
    if (estimatedMinutes !== undefined) data.estimatedMinutes = parseInt(estimatedMinutes);
    if (isPremium        !== undefined) data.isPremium        = !!isPremium;
    if (openingScene     !== undefined) data.openingScene     = openingScene;
    if (sortOrder        !== undefined) data.sortOrder        = parseInt(sortOrder);
    if (sequenceOrder    !== undefined) data.sequenceOrder    = sequenceOrder ? parseInt(sequenceOrder) : null;

    const updated = await prisma.simulation.update({ where: { id }, data });
    res.json({ success: true, message: "Simulation updated", data: updated });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBMIT FOR REVIEW (Employee action)
// ─────────────────────────────────────────────────────────────────────────────

exports.submitSimulation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const emp    = req.employee;

    const sim = await prisma.simulation.findFirst({
      where:   { id, isDeleted: false },
      include: {
        variables:  { take: 1 },
        decisions:  {
          include: {
            options: {
              include: { impacts: { take: 1 } },
            },
          },
        },
      },
    });

    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });
    if (emp.role === "CONTENT_DEVELOPER" && sim.createdBy !== emp.empId)
      return res.status(403).json({ success: false, message: "Access denied" });
    if (sim.status !== "DRAFT")
      return res.status(400).json({ success: false, message: `Already ${sim.status}` });

    // Validation
    const errors = [];
    if (sim.variables.length === 0) errors.push("Add at least one variable");
    if (sim.decisions.length === 0) errors.push("Add at least one decision");
    for (const d of sim.decisions) {
      if (d.options.length !== 6) errors.push(`Decision ${d.sequenceOrder}: must have exactly 6 options (has ${d.options.length})`);
      for (const o of d.options) {
        if (o.impacts.length === 0) errors.push(`Decision ${d.sequenceOrder}, Option ${o.optionLabel}: must have ≥1 variable impact`);
        if (!o.consequenceText) errors.push(`Decision ${d.sequenceOrder}, Option ${o.optionLabel}: consequence text required`);
      }
    }
    if (errors.length > 0)
      return res.status(422).json({ success: false, message: "Validation failed", errors });

    const updated = await prisma.simulation.update({
      where: { id },
      data:  { status: "SUBMITTED" },
    });
    res.json({ success: true, message: "Submitted for review", data: updated });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// APPROVE / REJECT (Admin only)
// ─────────────────────────────────────────────────────────────────────────────

exports.approveSimulation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sim = await prisma.simulation.findFirst({ where: { id, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Not found" });
    if (sim.status !== "SUBMITTED")
      return res.status(400).json({ success: false, message: "Only SUBMITTED simulations can be approved" });

    const updated = await prisma.simulation.update({
      where: { id },
      data:  { status: "APPROVED", isPublished: true },
    });
    res.json({ success: true, message: "Simulation approved and published", data: updated });
  } catch (err) { next(err); }
};

exports.rejectSimulation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: "Rejection reason required" });

    const sim = await prisma.simulation.findFirst({ where: { id, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Not found" });

    // Store reason in openingScene field as JSON metadata (simple approach)
    const meta = { rejectionReason: reason, rejectedAt: new Date().toISOString() };
    const updated = await prisma.simulation.update({
      where: { id },
      data:  { status: "REJECTED", openingScene: JSON.stringify(meta) },
    });
    res.json({ success: true, message: "Simulation rejected", data: updated });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// SOFT DELETE + PERMANENT DELETE (Admin only)
// ─────────────────────────────────────────────────────────────────────────────

exports.softDeleteSimulation = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.simulation.update({
      where: { id },
      data:  { isDeleted: true, deletedAt: new Date(), isPublished: false },
    });
    res.json({ success: true, message: "Simulation soft-deleted" });
  } catch (err) { next(err); }
};

exports.permanentDeleteSimulation = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.simulation.delete({ where: { id } });
    res.json({ success: true, message: "Simulation permanently deleted" });
  } catch (err) { next(err); }
};

exports.restoreSimulation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await prisma.simulation.update({
      where: { id },
      data:  { isDeleted: false, deletedAt: null },
    });
    res.json({ success: true, message: "Simulation restored", data: updated });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// STORY SECTION
// ─────────────────────────────────────────────────────────────────────────────

exports.saveStory = async (req, res, next) => {
  try {
    const { simulationId } = req.params;
    const { companyBackground, closingChallenge, howItWorks,
            arrivalContext, incomingMessages, seniorStatement } = req.body;

    const story = await prisma.storySection.upsert({
      where:  { simulationId },
      update: { companyBackground: companyBackground || "", closingChallenge, howItWorks,
                arrivalContext, incomingMessages, seniorStatement },
      create: { simulationId, companyBackground: companyBackground || "", closingChallenge, howItWorks,
                arrivalContext, incomingMessages, seniorStatement },
    });
    res.json({ success: true, message: "Story saved", data: story });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// VARIABLES (SimulationVariable — linked to global Variable)
// ─────────────────────────────────────────────────────────────────────────────

exports.getVariables = async (req, res, next) => {
  try {
    const vars = await prisma.simulationVariable.findMany({
      where:   { simulationId: req.params.simulationId },
      orderBy: { sortOrder: "asc" },
      include: { variable: true },
    });
    res.json({ success: true, data: vars });
  } catch (err) { next(err); }
};

exports.createVariable = async (req, res, next) => {
  try {
    const { simulationId } = req.params;
    const { variableName, displayName, startingValue, unit, higherIsBetter,
            isVisible, scoringDimension, dimensionWeight, sortOrder } = req.body;

    if (!variableName || !displayName)
      return res.status(400).json({ success: false, message: "variableName and displayName required" });

    // Upsert global variable
    const globalVar = await prisma.variable.upsert({
      where:  { name: variableName.toUpperCase() },
      update: { displayName, unit: unit || "%" },
      create: { name: variableName.toUpperCase(), displayName, unit: unit || "%" },
    });

    const simVar = await prisma.simulationVariable.create({
      data: {
        simulationId,
        variableId:      globalVar.id,
        variableName:    variableName.toUpperCase(),
        displayName,
        startingValue:   parseFloat(startingValue) || 50,
        unit:            unit || "%",
        higherIsBetter:  higherIsBetter !== false,
        isVisible:       isVisible !== false,
        scoringDimension: scoringDimension || "CUSTOM",
        dimensionWeight:  parseFloat(dimensionWeight) || 1.0,
        sortOrder:        parseInt(sortOrder) || 0,
      },
      include: { variable: true },
    });
    res.json({ success: true, message: "Variable created", data: simVar });
  } catch (err) { next(err); }
};

exports.updateVariable = async (req, res, next) => {
  try {
    const { variableId } = req.params;
    const { displayName, startingValue, unit, higherIsBetter,
            isVisible, scoringDimension, dimensionWeight } = req.body;

    const updated = await prisma.simulationVariable.update({
      where: { id: variableId },
      data:  {
        ...(displayName      !== undefined && { displayName }),
        ...(startingValue    !== undefined && { startingValue: parseFloat(startingValue) }),
        ...(unit             !== undefined && { unit }),
        ...(higherIsBetter   !== undefined && { higherIsBetter: !!higherIsBetter }),
        ...(isVisible        !== undefined && { isVisible: !!isVisible }),
        ...(scoringDimension !== undefined && { scoringDimension }),
        ...(dimensionWeight  !== undefined && { dimensionWeight: parseFloat(dimensionWeight) }),
      },
      include: { variable: true },
    });
    res.json({ success: true, message: "Variable updated", data: updated });
  } catch (err) { next(err); }
};

exports.deleteVariable = async (req, res, next) => {
  try {
    await prisma.simulationVariable.delete({ where: { id: req.params.variableId } });
    res.json({ success: true, message: "Variable deleted" });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CHARACTERS (SimulationCharacter — linked to global Character)
// ─────────────────────────────────────────────────────────────────────────────

exports.getCharacters = async (req, res, next) => {
  try {
    const chars = await prisma.simulationCharacter.findMany({
      where:   { simulationId: req.params.simulationId },
      orderBy: { introOrder: "asc" },
      include: { character: true },
    });
    res.json({ success: true, data: chars });
  } catch (err) { next(err); }
};

exports.createCharacter = async (req, res, next) => {
  try {
    const { simulationId } = req.params;
    const { name, role, description, trustLevel, emotionalState, keyConcern,
            introText, isPlayer, introOrder } = req.body;

    if (!name) return res.status(400).json({ success: false, message: "name required" });

    // Create global character entry
    const globalChar = await prisma.character.create({
      data: { name, role: role || "", description: description || "", isPlayer: !!isPlayer },
    });

    const simChar = await prisma.simulationCharacter.create({
      data: {
        simulationId,
        characterId:   globalChar.id,
        trustLevel:    trustLevel !== undefined ? parseInt(trustLevel) : null,
        emotionalState: emotionalState || null,
        keyConcern:    keyConcern     || null,
        introText:     introText      || null,
        isPlayer:      !!isPlayer,
        introOrder:    parseInt(introOrder) || 0,
      },
      include: { character: true },
    });
    res.json({ success: true, message: "Character created", data: simChar });
  } catch (err) { next(err); }
};

exports.updateCharacter = async (req, res, next) => {
  try {
    const { charId } = req.params;
    const { name, role, description, trustLevel, emotionalState, keyConcern,
            introText, isPlayer, introOrder } = req.body;

    const simChar = await prisma.simulationCharacter.findUnique({
      where: { id: charId },
      include: { character: true },
    });
    if (!simChar) return res.status(404).json({ success: false, message: "Character not found" });

    // Update global character
    if (name || role || description !== undefined) {
      await prisma.character.update({
        where: { id: simChar.characterId },
        data:  {
          ...(name        && { name }),
          ...(role        && { role }),
          ...(description !== undefined && { description }),
        },
      });
    }

    const updated = await prisma.simulationCharacter.update({
      where: { id: charId },
      data:  {
        ...(trustLevel    !== undefined && { trustLevel: trustLevel !== null ? parseInt(trustLevel) : null }),
        ...(emotionalState!== undefined && { emotionalState }),
        ...(keyConcern    !== undefined && { keyConcern }),
        ...(introText     !== undefined && { introText }),
        ...(isPlayer      !== undefined && { isPlayer: !!isPlayer }),
        ...(introOrder    !== undefined && { introOrder: parseInt(introOrder) }),
      },
      include: { character: true },
    });
    res.json({ success: true, message: "Character updated", data: updated });
  } catch (err) { next(err); }
};

exports.deleteCharacter = async (req, res, next) => {
  try {
    const sc = await prisma.simulationCharacter.delete({ where: { id: req.params.charId } });
    // Optionally delete orphaned global character
    await prisma.character.deleteMany({
      where: { id: sc.characterId, simulationCharacters: { none: {} } },
    }).catch(() => {});
    res.json({ success: true, message: "Character deleted" });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATIONS & MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

exports.getConversations = async (req, res, next) => {
  try {
    const convos = await prisma.conversation.findMany({
      where:   { simulationId: req.params.simulationId },
      orderBy: { sequenceOrder: "asc" },
      include: {
        messages: {
          orderBy: { sequenceOrder: "asc" },
          include: { character: { select: { id: true, name: true, role: true } } },
        },
      },
    });
    res.json({ success: true, data: convos });
  } catch (err) { next(err); }
};

exports.createConversation = async (req, res, next) => {
  try {
    const { simulationId } = req.params;
    const { title, userTypeTarget, sequenceOrder } = req.body;
    const convo = await prisma.conversation.create({
      data: {
        simulationId,
        title:         title          || null,
        userTypeTarget: userTypeTarget || null,
        sequenceOrder: parseInt(sequenceOrder) || 1,
      },
      include: { messages: true },
    });
    res.json({ success: true, message: "Conversation created", data: convo });
  } catch (err) { next(err); }
};

exports.updateConversation = async (req, res, next) => {
  try {
    const { convoId } = req.params;
    const { title, userTypeTarget, sequenceOrder } = req.body;
    const updated = await prisma.conversation.update({
      where: { id: convoId },
      data:  {
        ...(title          !== undefined && { title }),
        ...(userTypeTarget !== undefined && { userTypeTarget: userTypeTarget || null }),
        ...(sequenceOrder  !== undefined && { sequenceOrder: parseInt(sequenceOrder) }),
      },
    });
    res.json({ success: true, message: "Conversation updated", data: updated });
  } catch (err) { next(err); }
};

exports.deleteConversation = async (req, res, next) => {
  try {
    await prisma.conversation.delete({ where: { id: req.params.convoId } });
    res.json({ success: true, message: "Conversation deleted" });
  } catch (err) { next(err); }
};

exports.createMessage = async (req, res, next) => {
  try {
    const { convoId } = req.params;
    const { characterId, messageType, content, timestamp, metadata, sequenceOrder } = req.body;
    if (!content) return res.status(400).json({ success: false, message: "content required" });
    const msg = await prisma.message.create({
      data: {
        conversationId: convoId,
        characterId:    characterId || null,
        messageType:    messageType || "CHAT",
        content,
        timestamp:      timestamp   || null,
        metadata:       metadata    || null,
        sequenceOrder:  parseInt(sequenceOrder) || 0,
      },
      include: { character: { select: { id: true, name: true, role: true } } },
    });
    res.json({ success: true, message: "Message created", data: msg });
  } catch (err) { next(err); }
};

exports.updateMessage = async (req, res, next) => {
  try {
    const { msgId } = req.params;
    const { characterId, messageType, content, timestamp, sequenceOrder } = req.body;
    const updated = await prisma.message.update({
      where: { id: msgId },
      data:  {
        ...(characterId   !== undefined && { characterId: characterId || null }),
        ...(messageType   !== undefined && { messageType }),
        ...(content       !== undefined && { content }),
        ...(timestamp     !== undefined && { timestamp }),
        ...(sequenceOrder !== undefined && { sequenceOrder: parseInt(sequenceOrder) }),
      },
      include: { character: { select: { id: true, name: true, role: true } } },
    });
    res.json({ success: true, message: "Message updated", data: updated });
  } catch (err) { next(err); }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    await prisma.message.delete({ where: { id: req.params.msgId } });
    res.json({ success: true, message: "Message deleted" });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DECISIONS
// ─────────────────────────────────────────────────────────────────────────────

exports.getDecisions = async (req, res, next) => {
  try {
    const decisions = await prisma.decision.findMany({
      where:   { simulationId: req.params.simulationId },
      orderBy: { sequenceOrder: "asc" },
      include: {
        options: {
          orderBy: { optionLabel: "asc" },
          include: { impacts: { include: { simulationVariable: { select: { id: true, displayName: true, variableName: true } } } } },
        },
      },
    });
    res.json({ success: true, data: decisions });
  } catch (err) { next(err); }
};

exports.createDecision = async (req, res, next) => {
  try {
    const { simulationId } = req.params;
    const { sequenceOrder, tag, weekLabel, charactersPresent,
            situationUpdate, questionText, contextNote,
            isDiagnostic, diagnosticOrder } = req.body;

    if (!questionText)
      return res.status(400).json({ success: false, message: "questionText required" });

    // Auto-assign sequenceOrder if not provided
    let order = parseInt(sequenceOrder);
    if (!order) {
      const last = await prisma.decision.findFirst({
        where:   { simulationId },
        orderBy: { sequenceOrder: "desc" },
        select:  { sequenceOrder: true },
      });
      order = (last?.sequenceOrder || 0) + 1;
    }

    const decision = await prisma.decision.create({
      data: {
        simulationId,
        sequenceOrder:    order,
        tag:              tag              || null,
        weekLabel:        weekLabel        || null,
        charactersPresent: Array.isArray(charactersPresent) ? charactersPresent : [],
        situationUpdate:  situationUpdate  || null,
        questionText,
        contextNote:      contextNote      || null,
        isDiagnostic:     !!isDiagnostic,
        diagnosticOrder:  diagnosticOrder ? parseInt(diagnosticOrder) : null,
      },
      include: { options: { include: { impacts: true } } },
    });

    // Update totalQuestions
    const count = await prisma.decision.count({ where: { simulationId } });
    await prisma.simulation.update({ where: { id: simulationId }, data: { totalQuestions: count } });

    res.json({ success: true, message: "Decision created", data: decision });
  } catch (err) { next(err); }
};

exports.updateDecision = async (req, res, next) => {
  try {
    const { decisionId } = req.params;
    const { sequenceOrder, tag, weekLabel, charactersPresent,
            situationUpdate, questionText, contextNote,
            isDiagnostic, diagnosticOrder } = req.body;

    const updated = await prisma.decision.update({
      where: { id: decisionId },
      data:  {
        ...(sequenceOrder    !== undefined && { sequenceOrder: parseInt(sequenceOrder) }),
        ...(tag              !== undefined && { tag }),
        ...(weekLabel        !== undefined && { weekLabel }),
        ...(charactersPresent!== undefined && { charactersPresent: Array.isArray(charactersPresent) ? charactersPresent : [] }),
        ...(situationUpdate  !== undefined && { situationUpdate }),
        ...(questionText     !== undefined && { questionText }),
        ...(contextNote      !== undefined && { contextNote }),
        ...(isDiagnostic     !== undefined && { isDiagnostic: !!isDiagnostic }),
        ...(diagnosticOrder  !== undefined && { diagnosticOrder: diagnosticOrder ? parseInt(diagnosticOrder) : null }),
      },
      include: {
        options: {
          orderBy: { optionLabel: "asc" },
          include: { impacts: { include: { simulationVariable: true } } },
        },
      },
    });
    res.json({ success: true, message: "Decision updated", data: updated });
  } catch (err) { next(err); }
};

exports.deleteDecision = async (req, res, next) => {
  try {
    const d = await prisma.decision.findUnique({ where: { id: req.params.decisionId }, select: { simulationId: true } });
    await prisma.decision.delete({ where: { id: req.params.decisionId } });
    if (d) {
      const count = await prisma.decision.count({ where: { simulationId: d.simulationId } });
      await prisma.simulation.update({ where: { id: d.simulationId }, data: { totalQuestions: count } });
    }
    res.json({ success: true, message: "Decision deleted" });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// OPTIONS
// ─────────────────────────────────────────────────────────────────────────────

exports.createOption = async (req, res, next) => {
  try {
    const { decisionId } = req.params;
    const { optionLabel, title, description, strategyTag, consequenceText, impacts } = req.body;

    if (!optionLabel || !title || !consequenceText)
      return res.status(400).json({ success: false, message: "optionLabel, title, consequenceText required" });

    // Enforce max 6
    const existing = await prisma.option.count({ where: { decisionId } });
    if (existing >= 6)
      return res.status(400).json({ success: false, message: "Maximum 6 options per decision" });

    const opt = await prisma.option.create({
      data: {
        decisionId,
        optionLabel:    optionLabel.toUpperCase(),
        title,
        description:    description    || "",
        strategyTag:    strategyTag    || null,
        consequenceText,
      },
    });

    // Create impacts in transaction
    if (Array.isArray(impacts) && impacts.length > 0) {
      const validImpacts = impacts.filter(i => i.simulationVariableId && i.delta !== undefined);
      if (validImpacts.length > 0) {
        await prisma.optionImpact.createMany({
          data: validImpacts.map(i => ({
            optionId:            opt.id,
            simulationVariableId: i.simulationVariableId,
            delta:               parseFloat(i.delta),
          })),
          skipDuplicates: true,
        });
      }
    }

    const full = await prisma.option.findUnique({
      where:   { id: opt.id },
      include: { impacts: { include: { simulationVariable: true } } },
    });
    res.json({ success: true, message: "Option created", data: full });
  } catch (err) { next(err); }
};

exports.updateOption = async (req, res, next) => {
  try {
    const { optionId } = req.params;
    const { title, description, strategyTag, consequenceText, impacts } = req.body;

    await prisma.option.update({
      where: { id: optionId },
      data:  {
        ...(title           !== undefined && { title }),
        ...(description     !== undefined && { description }),
        ...(strategyTag     !== undefined && { strategyTag: strategyTag || null }),
        ...(consequenceText !== undefined && { consequenceText }),
      },
    });

    // Replace impacts
    if (Array.isArray(impacts)) {
      await prisma.optionImpact.deleteMany({ where: { optionId } });
      const valid = impacts.filter(i => i.simulationVariableId && i.delta !== undefined);
      if (valid.length > 0) {
        await prisma.optionImpact.createMany({
          data: valid.map(i => ({
            optionId,
            simulationVariableId: i.simulationVariableId,
            delta: parseFloat(i.delta),
          })),
          skipDuplicates: true,
        });
      }
    }

    const full = await prisma.option.findUnique({
      where:   { id: optionId },
      include: { impacts: { include: { simulationVariable: true } } },
    });
    res.json({ success: true, message: "Option updated", data: full });
  } catch (err) { next(err); }
};

exports.deleteOption = async (req, res, next) => {
  try {
    await prisma.option.delete({ where: { id: req.params.optionId } });
    res.json({ success: true, message: "Option deleted" });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// TAGS
// ─────────────────────────────────────────────────────────────────────────────

exports.saveTags = async (req, res, next) => {
  try {
    const { simulationId } = req.params;
    const { tags } = req.body; // string[]
    if (!Array.isArray(tags)) return res.status(400).json({ success: false, message: "tags must be an array" });

    await prisma.simulationTag.deleteMany({ where: { simulationId } });
    if (tags.length > 0) {
      await prisma.simulationTag.createMany({
        data: tags.map(tag => ({ simulationId, tag: tag.trim() })),
        skipDuplicates: true,
      });
    }
    const saved = await prisma.simulationTag.findMany({ where: { simulationId } });
    res.json({ success: true, message: "Tags saved", data: saved });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: EMPLOYEE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

exports.listEmployees = async (req, res, next) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      select:  {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        _count: { select: { createdSimulations: true } },
      },
    });
    res.json({ success: true, data: employees });
  } catch (err) { next(err); }
};

exports.createEmployee = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "name, email, password required" });

    const exists = await prisma.employee.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ success: false, message: "Email already registered" });

    const bcrypt = require("bcryptjs");
    const hash   = await bcrypt.hash(password, 12);
    const emp    = await prisma.employee.create({
      data: { name, email: email.toLowerCase(), password: hash, role: role || "CONTENT_DEVELOPER" },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    res.json({ success: true, message: "Employee created", data: emp });
  } catch (err) { next(err); }
};

exports.updateEmployee = async (req, res, next) => {
  try {
    const { empId } = req.params;
    const { name, role, isActive } = req.body;
    const updated = await prisma.employee.update({
      where: { id: empId },
      data:  {
        ...(name     && { name }),
        ...(role     && { role }),
        ...(isActive !== undefined && { isActive: !!isActive }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.json({ success: true, message: "Employee updated", data: updated });
  } catch (err) { next(err); }
};

exports.deleteEmployee = async (req, res, next) => {
  try {
    await prisma.employee.update({ where: { id: req.params.empId }, data: { isActive: false } });
    res.json({ success: true, message: "Employee deactivated" });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: STATS
// ─────────────────────────────────────────────────────────────────────────────

exports.getAdminStats = async (req, res, next) => {
  try {
    const [
      totalUsers, totalSimulations, pendingApproval,
      approvedSims, activeSubscriptions, totalEmployees,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.simulation.count({ where: { isDeleted: false } }),
      prisma.simulation.count({ where: { status: "SUBMITTED", isDeleted: false } }),
      prisma.simulation.count({ where: { status: "APPROVED", isDeleted: false } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.employee.count({ where: { isActive: true } }),
    ]);

    res.json({
      success: true,
      data: { totalUsers, totalSimulations, pendingApproval, approvedSims, activeSubscriptions, totalEmployees },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: USER MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

exports.listUsers = async (req, res, next) => {
  try {
    const { domainId, userType, plan, search, page = "1", limit = "30" } = req.query;
    const where = {};
    if (domainId)  where.selectedDomainId = domainId;
    if (userType)  where.userType         = userType;
    if (plan)      where.plan             = plan;
    if (search)    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email:    { contains: search, mode: "insensitive" } },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          selectedDomain: { select: { id: true, name: true } },
          subscription:   { select: { planType: true, status: true, endDate: true } },
          _count:         { select: { sessions: true, badges: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ success: true, data: { users, total, page: parseInt(page) } });
  } catch (err) { next(err); }
};

exports.getUserDetail = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where:   { id: req.params.userId },
      include: {
        selectedDomain: true,
        profile:        true,
        subscription:   true,
        sessions: {
          include: { result: true, simulation: { select: { id: true, title: true } } },
          orderBy: { createdAt: "desc" },
          take:    10,
        },
        badges: { orderBy: { earnedAt: "desc" } },
      },
    });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// DOMAINS (admin: full CRUD)
// ─────────────────────────────────────────────────────────────────────────────

exports.listDomains = async (req, res, next) => {
  try {
    const domains = await prisma.domain.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { simulations: true, users: true } } },
    });
    res.json({ success: true, data: domains });
  } catch (err) { next(err); }
};

exports.createDomain = async (req, res, next) => {
  try {
    const { name, slug, description, iconName, colorHex, sortOrder } = req.body;
    if (!name || !slug) return res.status(400).json({ success: false, message: "name and slug required" });
    const domain = await prisma.domain.create({
      data: { name, slug, description, iconName: iconName || "BookOpen", colorHex: colorHex || "#5a7f2e", sortOrder: parseInt(sortOrder) || 0 },
    });
    res.json({ success: true, message: "Domain created", data: domain });
  } catch (err) { next(err); }
};

exports.updateDomain = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, description, iconName, colorHex, sortOrder, isActive } = req.body;
    const updated = await prisma.domain.update({
      where: { id },
      data: {
        ...(name        && { name }),
        ...(slug        && { slug }),
        ...(description !== undefined && { description }),
        ...(iconName    && { iconName }),
        ...(colorHex    && { colorHex }),
        ...(sortOrder   !== undefined && { sortOrder: parseInt(sortOrder) }),
        ...(isActive    !== undefined && { isActive: !!isActive }),
      },
    });
    res.json({ success: true, message: "Domain updated", data: updated });
  } catch (err) { next(err); }
};

exports.deleteDomain = async (req, res, next) => {
  try {
    await prisma.domain.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Domain deleted" });
  } catch (err) { next(err); }
};