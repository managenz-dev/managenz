// backend/src/controllers/admin.controller.js
// All prisma calls use NEW schema model names:
//   Simulation (was UseCase), Decision (was Question), Option (was Option),
//   OptionImpact (was ImpactValue), ScoringDimensionConfig, SimulationVariable,
//   SimulationCharacter + Character, SimulationSession, DecisionLog,
//   SessionVariableState, SimulationBadge, AttemptResult, StorySection
const prisma = require("../utils/prisma");

function slugify(t) {
  return t.toLowerCase().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").trim().slice(0,80);
}

async function uniqueSlug(base, excludeId) {
  let slug = slugify(base), i = 2;
  while (true) {
    const ex = await prisma.simulation.findUnique({ where: { slug } });
    if (!ex || ex.id === excludeId) break;
    slug = `${slugify(base)}-${i++}`;
  }
  return slug;
}

// ── Stats ──────────────────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const [totalUsers, totalSimulations, totalSessions, totalDomains, pendingApproval, totalEmployees] = await Promise.all([
      prisma.user.count(),
      prisma.simulation.count({ where: { isDeleted: false } }),
      prisma.simulationSession.count({ where: { status: "COMPLETED" } }),
      prisma.domain.count(),
      prisma.simulation.count({ where: { status: "SUBMITTED", isDeleted: false } }),
      prisma.employee.count({ where: { isActive: true } }),
    ]);
    res.json({ success: true, data: { totalUsers, totalSimulations, totalSessions, totalDomains, pendingApproval, totalEmployees } });
  } catch (error) { next(error); }
};

// ── Domains ────────────────────────────────────────────────────────────────
exports.getAllDomains = async (req, res, next) => {
  try {
    const domains = await prisma.domain.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { simulations: true, users: true } } },
    });
    res.json({ success: true, data: domains });
  } catch (error) { next(error); }
};

exports.createDomain = async (req, res, next) => {
  try {
    const { name, slug, description, iconName, colorHex, sortOrder } = req.body;
    if (!name || !slug) return res.status(400).json({ success: false, message: "Name and slug are required" });

    const domain = await prisma.domain.create({
      data: { 
        name, 
        slug, 
        description, 
        iconName: iconName || "BookOpen", 
        colorHex: colorHex || "#5a7f2e", 
        sortOrder: parseInt(sortOrder) || 0, 
        isActive: true 
      },
    });
    res.json({ success: true, message: "Domain created", data: domain });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ success: false, message: "Domain with this slug already exists" });
    next(error);
  }
};

exports.updateDomain = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, description, iconName, colorHex, sortOrder, isActive } = req.body;
    
    const domain = await prisma.domain.update({
      where: { id },
      data: {
        ...(name       !== undefined && { name }),
        ...(slug       !== undefined && { slug }),
        ...(description!== undefined && { description }),
        ...(iconName   !== undefined && { iconName }),
        ...(colorHex   !== undefined && { colorHex }),
        ...(sortOrder  !== undefined && { sortOrder: parseInt(sortOrder) }),
        ...(isActive   !== undefined && { isActive: !!isActive }),
      },
    });
    res.json({ success: true, message: "Domain updated", data: domain });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Domain not found" });
    if (error.code === "P2002") return res.status(409).json({ success: false, message: "Slug already taken" });
    next(error);
  }
};

exports.deleteDomain = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Check if domain has simulations before deleting
    const count = await prisma.simulation.count({ where: { domainId: id, isDeleted: false } });
    if (count > 0) return res.status(400).json({ success: false, message: "Cannot delete domain with active simulations" });

    await prisma.domain.delete({ where: { id } });
    res.json({ success: true, message: "Domain deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Domain not found" });
    next(error);
  }
};

// ── Use Cases / Simulations ────────────────────────────────────────────────
exports.getUseCasesByDomain = async (req, res, next) => {
  try {
    const { domainId } = req.params;
    // Validate domain exists
    const domain = await prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) return res.status(404).json({ success: false, message: "Domain not found" });

    const simulations = await prisma.simulation.findMany({
      where:   { domainId, isDeleted: false },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { decisions: true } },
        story:  { select: { id: true } },
        creator:{ select: { id: true, name: true } },
      },
    });
    res.json({ success: true, data: simulations });
  } catch (error) { next(error); }
};

exports.getAllUseCases = async (req, res, next) => {
  try {
    const { domainId, status, search } = req.query;
    const where = { isDeleted: false };
    if (domainId) where.domainId = domainId;
    if (status)   where.status   = status;
    if (search)   where.title    = { contains: search, mode: "insensitive" };

    const simulations = await prisma.simulation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        domain:  { select: { id: true, name: true, colorHex: true } },
        creator: { select: { id: true, name: true } },
        _count:  { select: { decisions: true, sessions: true } },
      },
    });
    res.json({ success: true, data: simulations });
  } catch (error) { next(error); }
};

exports.getUseCaseFull = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sim = await prisma.simulation.findFirst({
      where:   { id, isDeleted: false },
      include: {
        domain:     true,
        story:      true,
        creator:    { select: { id: true, name: true, email: true } },
        characters: { include: { character: true }, orderBy: { introOrder: "asc" } },
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
        endings:          { orderBy: { sortOrder: "asc" } },
        scoringDimensions:{ orderBy: { sortOrder: "asc" } },
        gradeBands:       true,
        tags:             true,
      },
    });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    // Shape openingScene from story for frontend compatibility
    const openingScene = sim.story ? {
      arrivalContext:   sim.story.arrivalContext   || "",
      incomingMessages: sim.story.incomingMessages || "",
      seniorStatement:  sim.story.seniorStatement  || "",
    } : null;

    // Alias scoringDimensions as scoringConfigs for old admin panel
    res.json({
      success: true,
      data: {
        ...sim,
        scoringConfigs:  sim.scoringDimensions,
        dimensionConfigs:sim.scoringDimensions,
        openingScene,
        preDecisionConversations: sim.conversations, // old name alias
      },
    });
  } catch (error) { next(error); }
};

exports.createUseCase = async (req, res, next) => {
  try {
    const { domainId, title, slug: reqSlug, shortDescription, description,
            difficulty, difficultyLevel, estimatedMinutes, isPremium,
            isPublished, sortOrder, targetUserType, userTypeTarget } = req.body;

    // ✅ Validation
    if (!domainId || !title || !description) {
      return res.status(400).json({ success: false, message: "Domain, title, and description are required" });
    }

    // ✅ Check domain exists
    const domain = await prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain) {
      return res.status(404).json({ success: false, message: "Domain not found" });
    }

    // Get or create admin employee record
    const adminEmail = req.admin?.email || process.env.ADMIN_EMAIL || "admin@managenz.com";
    let creator = await prisma.employee.findUnique({ where: { email: adminEmail } });
    if (!creator) {
      const bcrypt = require("bcryptjs");
      const hash   = await bcrypt.hash(process.env.ADMIN_PASSWORD || "adminpass", 12);
      creator = await prisma.employee.create({
        data: { name: "Admin", email: adminEmail, password: hash, role: "ADMIN" },
      });
    }
    const creatorId = creator.id;

    const slug = await uniqueSlug(reqSlug || title);
    
    // ✅ Create simulation with validated data
    const sim  = await prisma.simulation.create({
      data: {
        domainId,
        createdBy:       creatorId,
        title,
        slug,
        description,
        difficultyLevel: (function(diff) {
  const map = {
    "EASY": "FOUNDATIONAL",
    "INTERMEDIATE": "INTERMEDIATE", 
    "ADVANCED": "ADVANCED",
    "FOUNDATIONAL": "FOUNDATIONAL"
  };
  return map[difficultyLevel] || map[difficulty] || "FOUNDATIONAL";
})(),
        userTypeTarget:  userTypeTarget  || targetUserType || null,
        estimatedMinutes: parseInt(estimatedMinutes) || 30,
        isPremium:       !!isPremium,
        isPublished:     !!isPublished,
        sortOrder:       parseInt(sortOrder) || 0,
        status:          "DRAFT",
      },
      include: { domain: { select: { id: true, name: true } } },
    });
    res.json({ success: true, message: "Simulation created", data: sim });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ success: false, message: "A simulation with this slug already exists" });
    if (error.code === "P2003") return res.status(400).json({ success: false, message: "Invalid domain reference" });
    next(error);
  }
};

exports.updateUseCase = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, slug: reqSlug, shortDescription, description,
            difficulty, difficultyLevel, estimatedMinutes,
            isPremium, isPublished, sortOrder, targetUserType, userTypeTarget,
            status } = req.body;
    const desc = description || shortDescription;

    // ✅ Check simulation exists and is not deleted
    const existing = await prisma.simulation.findUnique({ where: { id, isDeleted: false } });
    if (!existing) return res.status(404).json({ success: false, message: "Simulation not found" });

    // ✅ Status guard: Can't edit published simulations via this endpoint
    if (existing.status === "APPROVED" && status !== "APPROVED") {
      return res.status(403).json({ success: false, message: "Cannot edit approved simulation" });
    }

    const data = {};
    if (title            !== undefined) { data.title = title; if (!reqSlug) data.slug = await uniqueSlug(title, id); }
    if (reqSlug          !== undefined) data.slug            = await uniqueSlug(reqSlug, id);
    if (desc             !== undefined) data.description     = desc;
    if (difficultyLevel || difficulty)  data.difficultyLevel = difficultyLevel || difficulty;
    if (estimatedMinutes !== undefined) data.estimatedMinutes= parseInt(estimatedMinutes);
    if (isPremium        !== undefined) data.isPremium       = !!isPremium;
    if (isPublished      !== undefined) data.isPublished     = !!isPublished;
    if (sortOrder        !== undefined) data.sortOrder       = parseInt(sortOrder);
    if (userTypeTarget || targetUserType) data.userTypeTarget = userTypeTarget || targetUserType || null;
    if (status           !== undefined) data.status          = status;

    const sim = await prisma.simulation.update({ where: { id }, data });
    res.json({ success: true, message: "Simulation updated", data: sim });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Simulation not found" });
    if (error.code === "P2002") return res.status(409).json({ success: false, message: "Slug already taken" });
    next(error);
  }
};

exports.deleteUseCase = async (req, res, next) => {
  try {
    const { id } = req.params;
    // ✅ Soft delete — cascade happens via isDeleted flag
    await prisma.simulation.update({
      where: { id, isDeleted: false },
      data:  { isDeleted: true, deletedAt: new Date(), isPublished: false },
    });
    res.json({ success: true, message: "Simulation archived" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Simulation not found" });
    next(error);
  }
};

// Restore soft-deleted
exports.restoreUseCase = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.simulation.update({ where: { id, isDeleted: true }, data: { isDeleted: false, deletedAt: null } });
    res.json({ success: true, message: "Simulation restored" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Simulation not found" });
    next(error);
  }
};

// Approve / Reject
exports.approveSimulation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sim = await prisma.simulation.update({
      where: { id, status: { in: ["DRAFT", "SUBMITTED"] }, isDeleted: false },
      data:  { status: "APPROVED", isPublished: true },
    });
    res.json({ success: true, message: "Simulation approved and published", data: sim });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Simulation not found or already published" });
    next(error);
  }
};

exports.rejectSimulation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ success: false, message: "Rejection reason required" });
    
    const sim = await prisma.simulation.update({
      where: { id, isDeleted: false },
      data:  { status: "REJECTED" },
    });
    res.json({ success: true, message: "Simulation rejected", data: sim });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Simulation not found" });
    next(error);
  }
};

// ── Story ──────────────────────────────────────────────────────────────────
exports.saveStory = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    const { companyBackground, closingChallenge, howItWorks } = req.body;
    
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    const story = await prisma.storySection.upsert({
      where:  { simulationId: useCaseId },
      update: { companyBackground: companyBackground || "", closingChallenge, howItWorks },
      create: { simulationId: useCaseId, companyBackground: companyBackground || "", closingChallenge: closingChallenge || "", howItWorks: howItWorks || "" },
    });
    res.json({ success: true, message: "Story saved", data: story });
  } catch (error) { next(error); }
};

exports.saveOpeningScene = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    const { arrivalContext, incomingMessages, seniorStatement } = req.body;
    
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    const story = await prisma.storySection.upsert({
      where:  { simulationId: useCaseId },
      update: { arrivalContext: arrivalContext || null, incomingMessages: incomingMessages || null, seniorStatement: seniorStatement || null },
      create: { simulationId: useCaseId, companyBackground: "", closingChallenge: "", howItWorks: "", arrivalContext: arrivalContext || null, incomingMessages: incomingMessages || null, seniorStatement: seniorStatement || null },
    });
    res.json({ success: true, message: "Opening scene saved", data: { arrivalContext: story.arrivalContext, incomingMessages: story.incomingMessages, seniorStatement: story.seniorStatement } });
  } catch (error) { next(error); }
};

// ── Characters ─────────────────────────────────────────────────────────────
exports.getCharacters = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    const chars = await prisma.simulationCharacter.findMany({
      where:   { simulationId: useCaseId },
      orderBy: { introOrder: "asc" },
      include: { character: true },
    });
    // Flatten for old admin panel format
    const flat = chars.map(sc => ({
      id:             sc.id,
      simulationId:   sc.simulationId,
      characterId:    sc.characterId,
      name:           sc.character.name,
      role:           sc.character.role,
      isPlayer:       sc.isPlayer,
      trustLevel:     sc.trustLevel,
      emotionalState: sc.emotionalState,
      keyConcern:     sc.keyConcern,
      sortOrder:      sc.introOrder,
    }));
    res.json({ success: true, data: flat });
  } catch (error) { next(error); }
};

exports.createCharacter = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    const { name, role, isPlayer, trustLevel, emotionalState, keyConcern, sortOrder } = req.body;
    
    // ✅ Validation
    if (!name) return res.status(400).json({ success: false, message: "Name required" });
    
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    const globalChar = await prisma.character.create({
      data: { name, role: role || "", isPlayer: !!isPlayer },
    });
    const sc = await prisma.simulationCharacter.create({
      data: {
        simulationId:   useCaseId,
        characterId:    globalChar.id,
        isPlayer:       !!isPlayer,
        trustLevel:     trustLevel !== undefined ? parseInt(trustLevel) : null,
        emotionalState: emotionalState || null,
        keyConcern:     keyConcern     || null,
        introOrder:     parseInt(sortOrder) || 0,
      },
      include: { character: true },
    });
    res.json({ success: true, message: "Character created", data: {
      id: sc.id, simulationId: sc.simulationId, characterId: sc.characterId,
      name: sc.character.name, role: sc.character.role, isPlayer: sc.isPlayer,
      trustLevel: sc.trustLevel, emotionalState: sc.emotionalState,
      keyConcern: sc.keyConcern, sortOrder: sc.introOrder,
    }});
  } catch (error) { next(error); }
};

exports.updateCharacter = async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const { name, role, isPlayer, trustLevel, emotionalState, keyConcern, sortOrder } = req.body;

    const sc = await prisma.simulationCharacter.findUnique({ where: { id: characterId }, include: { character: true } });
    if (!sc) return res.status(404).json({ success: false, message: "Not found" });

    if (name || role) {
      await prisma.character.update({
        where: { id: sc.characterId },
        data:  { ...(name && { name }), ...(role !== undefined && { role }) },
      });
    }
    const updated = await prisma.simulationCharacter.update({
      where: { id: characterId },
      data:  {
        ...(isPlayer       !== undefined && { isPlayer: !!isPlayer }),
        ...(trustLevel     !== undefined && { trustLevel: trustLevel !== null ? parseInt(trustLevel) : null }),
        ...(emotionalState !== undefined && { emotionalState }),
        ...(keyConcern     !== undefined && { keyConcern }),
        ...(sortOrder      !== undefined && { introOrder: parseInt(sortOrder) }),
      },
      include: { character: true },
    });
    res.json({ success: true, message: "Character updated", data: {
      id: updated.id, name: updated.character.name, role: updated.character.role,
      isPlayer: updated.isPlayer, trustLevel: updated.trustLevel,
      emotionalState: updated.emotionalState, keyConcern: updated.keyConcern,
    }});
  } catch (error) { next(error); }
};

exports.deleteCharacter = async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const sc = await prisma.simulationCharacter.delete({ where: { id: characterId } });
    await prisma.character.deleteMany({ where: { id: sc.characterId, simulationCharacters: { none: {} } } }).catch(() => {});
    res.json({ success: true, message: "Character deleted" });
  } catch (error) { next(error); }
};

// ── Dialogues (legacy — admin panel uses this for opening scene messages)
exports.saveDialogues = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    const { dialogues } = req.body;
    if (!Array.isArray(dialogues)) return res.status(400).json({ success: false, message: "dialogues must be array" });
    
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    // Store as messages in a Conversation tied to this simulation
    let convo = await prisma.conversation.findFirst({ where: { simulationId: useCaseId, sequenceOrder: 0 } });
    if (!convo) {
      convo = await prisma.conversation.create({ data: { simulationId: useCaseId, title: "Opening Dialogues", sequenceOrder: 0 } });
    }
    // Clear existing messages
    await prisma.message.deleteMany({ where: { conversationId: convo.id } });
    const created = [];
    for (let i = 0; i < dialogues.length; i++) {
      const d = dialogues[i];
      if (!d.text) continue;
      const msg = await prisma.message.create({
        data: { conversationId: convo.id, characterId: null, messageType: "CHAT", content: d.text, sequenceOrder: i },
      });
      created.push(msg);
    }
    res.json({ success: true, message: "Dialogues saved", data: created });
  } catch (error) { next(error); }
};

// ── Variables ──────────────────────────────────────────────────────────────
exports.getVariables = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    const variables = await prisma.simulationVariable.findMany({
      where:   { simulationId: useCaseId },
      orderBy: { sortOrder: "asc" },
    });
    res.json({ success: true, data: variables });
  } catch (error) { next(error); }
};

exports.createVariable = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    const { variableName, displayName, startingValue, unit, higherIsBetter, scoringDimension, sortOrder } = req.body;
    
    // ✅ Validation
    if (!variableName || !displayName) return res.status(400).json({ success: false, message: "variableName and displayName required" });
    
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    // Upsert global variable
    const globalVar = await prisma.variable.upsert({
      where:  { name: variableName.toUpperCase() },
      update: { displayName, unit: unit || "%" },
      create: { name: variableName.toUpperCase(), displayName, unit: unit || "%" },
    });

    const variable = await prisma.simulationVariable.create({
      data: {
        simulationId:    useCaseId,
        variableId:      globalVar.id,
        variableName:    variableName.toUpperCase(),
        displayName,
        startingValue:   parseFloat(startingValue) || 50,
        unit:            unit || "%",
        higherIsBetter:  higherIsBetter !== false,
        isVisible:       true,
        scoringDimension: scoringDimension || "CUSTOM",
        sortOrder:       parseInt(sortOrder) || 0,
      },
    });
    res.json({ success: true, message: "Variable created", data: variable });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ success: false, message: "Variable already exists for this simulation" });
    next(error);
  }
};

exports.updateVariable = async (req, res, next) => {
  try {
    const { variableId } = req.params;
    const { variableName, displayName, startingValue, unit, higherIsBetter, scoringDimension, sortOrder } = req.body;
    
    // ✅ Check variable exists
    const existing = await prisma.simulationVariable.findUnique({ where: { id: variableId } });
    if (!existing) return res.status(404).json({ success: false, message: "Variable not found" });

    const variable = await prisma.simulationVariable.update({
      where: { id: variableId },
      data:  {
        ...(variableName     !== undefined && { variableName }),
        ...(displayName      !== undefined && { displayName }),
        ...(startingValue    !== undefined && { startingValue: parseFloat(startingValue) }),
        ...(unit             !== undefined && { unit }),
        ...(higherIsBetter   !== undefined && { higherIsBetter: !!higherIsBetter }),
        ...(scoringDimension !== undefined && { scoringDimension }),
        ...(sortOrder        !== undefined && { sortOrder: parseInt(sortOrder) }),
      },
    });
    res.json({ success: true, message: "Variable updated", data: variable });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Variable not found" });
    next(error);
  }
};

exports.deleteVariable = async (req, res, next) => {
  try {
    const { variableId } = req.params;
    // ✅ Check variable exists
    const existing = await prisma.simulationVariable.findUnique({ where: { id: variableId } });
    if (!existing) return res.status(404).json({ success: false, message: "Variable not found" });

    await prisma.simulationVariable.delete({ where: { id: variableId } });
    res.json({ success: true, message: "Variable deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Variable not found" });
    next(error);
  }
};

// ── Scoring Dimensions ─────────────────────────────────────────────────────
exports.getScoringDimensions = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    const dims = await prisma.scoringDimensionConfig.findMany({
      where:   { simulationId: useCaseId },
      orderBy: { sortOrder: "asc" },
    });
    res.json({ success: true, data: dims });
  } catch (error) { next(error); }
};

exports.createScoringDimension = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    const { dimensionKey, displayName, description, weight, sortOrder } = req.body;
    
    // ✅ Validation
    if (!dimensionKey || !displayName) return res.status(400).json({ success: false, message: "dimensionKey and displayName required" });
    
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    const dim = await prisma.scoringDimensionConfig.create({
      data: { simulationId: useCaseId, dimensionKey, displayName, description: description || "", weight: parseFloat(weight) || 1.0, sortOrder: parseInt(sortOrder) || 0 },
    });
    res.json({ success: true, message: "Scoring dimension created", data: dim });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ success: false, message: "Dimension key already exists" });
    next(error);
  }
};

exports.updateScoringDimension = async (req, res, next) => {
  try {
    const { dimId } = req.params;
    const { dimensionKey, displayName, description, weight } = req.body;
    
    // ✅ Check dimension exists
    const existing = await prisma.scoringDimensionConfig.findUnique({ where: { id: dimId } });
    if (!existing) return res.status(404).json({ success: false, message: "Dimension not found" });

    const dim = await prisma.scoringDimensionConfig.update({
      where: { id: dimId },
      data:  {
        ...(dimensionKey !== undefined && { dimensionKey }),
        ...(displayName  !== undefined && { displayName }),
        ...(description  !== undefined && { description }),
        ...(weight       !== undefined && { weight: parseFloat(weight) }),
      },
    });
    res.json({ success: true, message: "Updated", data: dim });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Dimension not found" });
    next(error);
  }
};

exports.deleteScoringDimension = async (req, res, next) => {
  try {
    const { dimId } = req.params;
    // ✅ Check dimension exists
    const existing = await prisma.scoringDimensionConfig.findUnique({ where: { id: dimId } });
    if (!existing) return res.status(404).json({ success: false, message: "Dimension not found" });

    await prisma.scoringDimensionConfig.delete({ where: { id: dimId } });
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Dimension not found" });
    next(error);
  }
};

// ── Endings ────────────────────────────────────────────────────────────────
exports.createEnding = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    const { endingKey, title, condition, narrative, userType, sortOrder } = req.body;
    
    // ✅ Validation
    if (!endingKey || !title || !narrative) return res.status(400).json({ success: false, message: "endingKey, title, narrative required" });
    
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    const ending = await prisma.simulationEnding.create({
      data: { simulationId: useCaseId, endingKey, title, condition: condition || "", narrative, userTypeTarget: userType || null, sortOrder: parseInt(sortOrder) || 0 },
    });
    res.json({ success: true, message: "Ending created", data: ending });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ success: false, message: "Ending key already exists" });
    next(error);
  }
};

exports.updateEnding = async (req, res, next) => {
  try {
    const { endingId } = req.params;
    const { endingKey, title, condition, narrative, userType } = req.body;
    
    // ✅ Check ending exists
    const existing = await prisma.simulationEnding.findUnique({ where: { id: endingId } });
    if (!existing) return res.status(404).json({ success: false, message: "Ending not found" });

    const ending = await prisma.simulationEnding.update({
      where: { id: endingId },
      data:  {
        ...(endingKey  !== undefined && { endingKey }),
        ...(title      !== undefined && { title }),
        ...(condition  !== undefined && { condition }),
        ...(narrative  !== undefined && { narrative }),
        ...(userType   !== undefined && { userTypeTarget: userType || null }),
      },
    });
    res.json({ success: true, message: "Updated", data: ending });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Ending not found" });
    next(error);
  }
};

exports.deleteEnding = async (req, res, next) => {
  try {
    const { endingId } = req.params;
    // ✅ Check ending exists
    const existing = await prisma.simulationEnding.findUnique({ where: { id: endingId } });
    if (!existing) return res.status(404).json({ success: false, message: "Ending not found" });

    await prisma.simulationEnding.delete({ where: { id: endingId } });
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Ending not found" });
    next(error);
  }
};

// ── Pre-Decision Conversations ─────────────────────────────────────────────
exports.createPreDecision = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    const { userType, messages, sortOrder } = req.body;
    
    // ✅ Validation
    if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ success: false, message: "messages array required" });
    
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    const convo = await prisma.conversation.create({
      data: {
        simulationId:   useCaseId,
        userTypeTarget: userType || null,
        sequenceOrder:  parseInt(sortOrder) || 1,
        title:          `Pre-decision ${sortOrder || 1}`,
        messages: {
          create: messages.filter(m => m.text).map((m, i) => ({
            characterId:   null,
            messageType:   m.channel === "Email" ? "EMAIL" : m.channel === "Slack" ? "SLACK" : m.channel === "WhatsApp" ? "WHATSAPP" : "CHAT",
            content:       m.text,
            timestamp:     m.timestamp || null,
            sequenceOrder: i,
            metadata:      { characterName: m.characterName || "", characterRole: m.characterRole || "", channel: m.channel || "Slack" },
          })),
        },
      },
      include: { messages: true },
    });
    // Format for old admin panel
    res.json({ success: true, message: "Pre-decision conversation created", data: {
      id:        convo.id,
      useCaseId: convo.simulationId,
      userType:  convo.userTypeTarget,
      sortOrder: convo.sequenceOrder,
      messages:  convo.messages.map(m => ({
        channel:       m.metadata?.channel || "Slack",
        characterName: m.metadata?.characterName || "",
        characterRole: m.metadata?.characterRole || "",
        timestamp:     m.timestamp,
        text:          m.content,
      })),
    }});
  } catch (error) { next(error); }
};

exports.updatePreDecision = async (req, res, next) => {
  try {
    const { convoId } = req.params;
    const { userType, messages } = req.body;
    
    // ✅ Check conversation exists
    const convo = await prisma.conversation.findUnique({ where: { id: convoId } });
    if (!convo) return res.status(404).json({ success: false, message: "Conversation not found" });

    if (userType !== undefined) {
      await prisma.conversation.update({ where: { id: convoId }, data: { userTypeTarget: userType || null } });
    }
    if (Array.isArray(messages)) {
      await prisma.message.deleteMany({ where: { conversationId: convoId } });
      await prisma.message.createMany({
        data: messages.filter(m => m.text).map((m, i) => ({
          conversationId: convoId,
          characterId:    null,
          messageType:    m.channel === "Email" ? "EMAIL" : m.channel === "Slack" ? "SLACK" : m.channel === "WhatsApp" ? "WHATSAPP" : "CHAT",
          content:        m.text,
          timestamp:      m.timestamp || null,
          sequenceOrder:  i,
          metadata:       { characterName: m.characterName || "", characterRole: m.characterRole || "", channel: m.channel || "Slack" },
        })),
      });
    }
    res.json({ success: true, message: "Updated" });
  } catch (error) { next(error); }
};

exports.deletePreDecision = async (req, res, next) => {
  try {
    const { convoId } = req.params;
    // ✅ Check conversation exists
    const convo = await prisma.conversation.findUnique({ where: { id: convoId } });
    if (!convo) return res.status(404).json({ success: false, message: "Conversation not found" });

    await prisma.conversation.delete({ where: { id: convoId } });
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Conversation not found" });
    next(error);
  }
};

// ── Questions / Decisions ──────────────────────────────────────────────────
exports.getQuestions = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    const decisions = await prisma.decision.findMany({
      where:   { simulationId: useCaseId },
      orderBy: { sequenceOrder: "asc" },
      include: {
        options: {
          orderBy: { optionLabel: "asc" },
          include: { impacts: { include: { simulationVariable: true } } },
        },
      },
    });
    // Alias for old admin panel (questionNumber → sequenceOrder)
    const mapped = decisions.map(d => ({
      ...d,
      questionNumber:   d.sequenceOrder,
      tag:              d.tag,
      weekLabel:        d.weekLabel,
      situationUpdate:  d.situationUpdate,
      questionText:     d.questionText,
      context:          d.contextNote,
      options:          d.options.map(o => ({
        ...o,
        description:    o.description,
        strategyTag:    o.strategyTag,
        consequenceText:o.consequenceText,
        impacts:        o.impacts.map(i => ({
          id:         i.id,
          optionId:   i.optionId,
          variableId: i.simulationVariableId,
          delta:      i.delta,
          variable:   i.simulationVariable,
        })),
      })),
    }));
    res.json({ success: true, data: mapped });
  } catch (error) { next(error); }
};

exports.createQuestion = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    const { questionNumber, tag, weekLabel, charactersPresent, situationUpdate, questionText, context, isDiagnostic, diagnosticOrder } = req.body;
    
    // ✅ Validation
    if (!questionText) return res.status(400).json({ success: false, message: "questionText required" });
    
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });

    let order = parseInt(questionNumber);
    if (!order) {
      const last = await prisma.decision.findFirst({ where: { simulationId: useCaseId }, orderBy: { sequenceOrder: "desc" }, select: { sequenceOrder: true } });
      order = (last?.sequenceOrder || 0) + 1;
    }

    const decision = await prisma.decision.create({
      data: {
        simulationId:     useCaseId,
        sequenceOrder:    order,
        tag:              tag              || null,
        weekLabel:        weekLabel        || null,
        charactersPresent:Array.isArray(charactersPresent) ? charactersPresent : [],
        situationUpdate:  situationUpdate  || null,
        questionText,
        contextNote:      context          || null,
        isDiagnostic:     !!isDiagnostic,
        diagnosticOrder:  diagnosticOrder ? parseInt(diagnosticOrder) : null,
      },
      include: { options: true },
    });

    const count = await prisma.decision.count({ where: { simulationId: useCaseId } });
    await prisma.simulation.update({ where: { id: useCaseId }, data: { totalQuestions: count } });

    res.json({ success: true, message: "Decision created", data: { ...decision, questionNumber: decision.sequenceOrder, context: decision.contextNote, options: [] } });
  } catch (error) { next(error); }
};

exports.updateQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    const { questionNumber, tag, weekLabel, charactersPresent, situationUpdate, questionText, context, isDiagnostic, diagnosticOrder } = req.body;
    
    // ✅ Check decision exists
    const existing = await prisma.decision.findUnique({ where: { id: questionId } });
    if (!existing) return res.status(404).json({ success: false, message: "Decision not found" });

    const decision = await prisma.decision.update({
      where: { id: questionId },
      data:  {
        ...(questionNumber    !== undefined && { sequenceOrder: parseInt(questionNumber) }),
        ...(tag               !== undefined && { tag }),
        ...(weekLabel         !== undefined && { weekLabel }),
        ...(charactersPresent !== undefined && { charactersPresent: Array.isArray(charactersPresent) ? charactersPresent : [] }),
        ...(situationUpdate   !== undefined && { situationUpdate }),
        ...(questionText      !== undefined && { questionText }),
        ...(context           !== undefined && { contextNote: context }),
        ...(isDiagnostic      !== undefined && { isDiagnostic: !!isDiagnostic }),
        ...(diagnosticOrder   !== undefined && { diagnosticOrder: diagnosticOrder ? parseInt(diagnosticOrder) : null }),
      },
      include: { options: { include: { impacts: { include: { simulationVariable: true } } } } },
    });
    res.json({ success: true, message: "Updated", data: { ...decision, questionNumber: decision.sequenceOrder, context: decision.contextNote } });
  } catch (error) { next(error); }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    // ✅ Check decision exists
    const d = await prisma.decision.findUnique({ where: { id: questionId }, select: { simulationId: true } });
    if (!d) return res.status(404).json({ success: false, message: "Decision not found" });

    await prisma.decision.delete({ where: { id: questionId } });
    
    // Update totalQuestions count
    const count = await prisma.decision.count({ where: { simulationId: d.simulationId } });
    await prisma.simulation.update({ where: { id: d.simulationId }, data: { totalQuestions: count } });
    
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Decision not found" });
    next(error);
  }
};

// ── Options ────────────────────────────────────────────────────────────────
exports.createOption = async (req, res, next) => {
  try {
    const { questionId } = req.params;  // questionId = decisionId
    const { optionLabel, title, description, strategyTag, consequenceText, impacts } = req.body;
    
    // ✅ Validation
    if (!optionLabel || !title || !consequenceText) return res.status(400).json({ success: false, message: "optionLabel, title, consequenceText required" });
    
    // ✅ Check decision exists
    const decision = await prisma.decision.findUnique({ where: { id: questionId } });
    if (!decision) return res.status(404).json({ success: false, message: "Decision not found" });

    const existing = await prisma.option.count({ where: { decisionId: questionId } });
    if (existing >= 6) return res.status(400).json({ success: false, message: "Maximum 6 options per decision" });

    const opt = await prisma.option.create({
      data: { decisionId: questionId, optionLabel: optionLabel.toUpperCase(), title, description: description || "", strategyTag: strategyTag || null, consequenceText },
    });

    if (Array.isArray(impacts) && impacts.length > 0) {
      const valid = impacts.filter(i => (i.variableId || i.simulationVariableId) && i.delta !== undefined && parseFloat(i.delta) !== 0);
      if (valid.length > 0) {
        await prisma.optionImpact.createMany({
          data: valid.map(i => ({
            optionId:            opt.id,
            simulationVariableId: i.variableId || i.simulationVariableId,
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
    // Shape impacts for old admin panel (variableId alias)
    const shaped = {
      ...full,
      impacts: full.impacts.map(i => ({ id: i.id, optionId: i.optionId, variableId: i.simulationVariableId, delta: i.delta, variable: i.simulationVariable })),
    };
    res.json({ success: true, message: "Option created", data: shaped });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ success: false, message: "Option label already exists" });
    next(error);
  }
};

exports.updateOption = async (req, res, next) => {
  try {
    const { optionId } = req.params;
    const { title, description, strategyTag, consequenceText, impacts } = req.body;
    
    // ✅ Check option exists
    const existing = await prisma.option.findUnique({ where: { id: optionId } });
    if (!existing) return res.status(404).json({ success: false, message: "Option not found" });

    await prisma.option.update({
      where: { id: optionId },
      data:  {
        ...(title           !== undefined && { title }),
        ...(description     !== undefined && { description }),
        ...(strategyTag     !== undefined && { strategyTag: strategyTag || null }),
        ...(consequenceText !== undefined && { consequenceText }),
      },
    });
    if (Array.isArray(impacts)) {
      await prisma.optionImpact.deleteMany({ where: { optionId } });
      const valid = impacts.filter(i => (i.variableId || i.simulationVariableId) && i.delta !== undefined && parseFloat(i.delta) !== 0);
      if (valid.length > 0) {
        await prisma.optionImpact.createMany({
          data: valid.map(i => ({ optionId, simulationVariableId: i.variableId || i.simulationVariableId, delta: parseFloat(i.delta) })),
          skipDuplicates: true,
        });
      }
    }
    const full = await prisma.option.findUnique({
      where:   { id: optionId },
      include: { impacts: { include: { simulationVariable: true } } },
    });
    res.json({ success: true, message: "Updated", data: {
      ...full,
      impacts: full.impacts.map(i => ({ id: i.id, optionId: i.optionId, variableId: i.simulationVariableId, delta: i.delta, variable: i.simulationVariable })),
    }});
  } catch (error) { next(error); }
};

exports.deleteOption = async (req, res, next) => {
  try {
    const { optionId } = req.params;
    // ✅ Check option exists
    const existing = await prisma.option.findUnique({ where: { id: optionId } });
    if (!existing) return res.status(404).json({ success: false, message: "Option not found" });

    await prisma.option.delete({ where: { id: optionId } });
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Option not found" });
    next(error);
  }
};

// ── Users ──────────────────────────────────────────────────────────────────
exports.getAllUsers = async (req, res, next) => {
  try {
    const { search, userType, plan } = req.query;
    const where = {};
    if (userType) where.userType = userType;
    if (plan)     where.plan     = plan;
    if (search)   where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email:    { contains: search, mode: "insensitive" } },
    ];
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take:    200,
      include: {
        selectedDomain: { select: { id: true, name: true } },
        subscription:   { select: { planType: true, status: true } },
        _count:         { select: { sessions: true } },
      },
    });
    res.json({ success: true, data: users });
  } catch (error) { next(error); }
};

exports.upgradeToPremium = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // ✅ Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    
    const updated = await prisma.user.update({
      where: { id: userId },
      data:  { plan: user.plan === "PREMIUM" ? "FREE" : "PREMIUM" },
    });
    res.json({ success: true, message: `User ${updated.plan}`, data: updated });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "User not found" });
    next(error);
  }
};

// ── Employee Management (Admin panel) ─────────────────────────────────────
exports.getEmployees = async (req, res, next) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      select:  {
        id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
        _count: { select: { createdSimulations: true } },
        createdSimulations: {
          where:   { isDeleted: false },
          select:  { id: true, title: true, status: true },
          take:    5,
          orderBy: { createdAt: "desc" },
        },
      },
    });
    res.json({ success: true, data: employees });
  } catch (error) { next(error); }
};

exports.createEmployee = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    
    // ✅ Validation
    if (!name || !email || !password) return res.status(400).json({ success: false, message: "name, email, password required" });
    
    const exists = await prisma.employee.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ success: false, message: "Email already registered" });
    
    const bcrypt = require("bcryptjs");
    const hash   = await bcrypt.hash(password, 12);
    const emp    = await prisma.employee.create({
      data:   { name, email: email.toLowerCase(), password: hash, role: role || "CONTENT_DEVELOPER" },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    res.json({ success: true, message: "Employee created", data: emp });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ success: false, message: "Email already registered" });
    next(error);
  }
};

exports.updateEmployee = async (req, res, next) => {
  try {
    const { empId } = req.params;
    const { name, role, isActive } = req.body;
    
    // ✅ Check employee exists
    const existing = await prisma.employee.findUnique({ where: { id: empId } });
    if (!existing) return res.status(404).json({ success: false, message: "Employee not found" });

    const updated = await prisma.employee.update({
      where:  { id: empId },
      data:   {
        ...(name     && { name }),
        ...(role     && { role }),
        ...(isActive !== undefined && { isActive: !!isActive }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.json({ success: true, message: "Updated", data: updated });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Employee not found" });
    next(error);
  }
};

exports.deleteEmployee = async (req, res, next) => {
  try {
    const { empId } = req.params;
    // ✅ Check employee exists
    const existing = await prisma.employee.findUnique({ where: { id: empId } });
    if (!existing) return res.status(404).json({ success: false, message: "Employee not found" });

    await prisma.employee.update({ where: { id: empId }, data: { isActive: false } });
    res.json({ success: true, message: "Employee deactivated" });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ success: false, message: "Employee not found" });
    next(error);
  }
};

// ── Results tab helpers ────────────────────────────────────────────────────
exports.saveGradeDescriptions = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    const { grades } = req.body;
    
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });
    
    if (!grades || typeof grades !== "object") return res.status(400).json({ success: false, message: "grades required" });
    
    const ops = [];
    for (const [grade, userTypes] of Object.entries(grades)) {
      for (const [userType, description] of Object.entries(userTypes)) {
        if (!description) continue;
        ops.push(
          prisma.gradeBandDescription.upsert({
            where:  { simulationId_grade_userType: { simulationId: useCaseId, grade, userType } },
            update: { description },
            create: { simulationId: useCaseId, grade, userType, description },
          }).catch(() => null)
        );
      }
    }
    await Promise.all(ops);
    res.json({ success: true, message: "Grade descriptions saved" });
  } catch (error) { next(error); }
};

exports.saveDimensionBands = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    const { bands } = req.body;
    
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });
    
    for (const [dimKey, gradeBands] of Object.entries(bands || {})) {
      const dim = await prisma.scoringDimensionConfig.findFirst({ where: { simulationId: useCaseId, dimensionKey: dimKey } });
      if (dim) await prisma.scoringDimensionConfig.update({ where: { id: dim.id }, data: { bandDescriptions: gradeBands } }).catch(() => null);
    }
    res.json({ success: true, message: "Dimension bands saved" });
  } catch (error) { next(error); }
};

exports.saveReports = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    const { reports } = req.body;
    
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });
    
    await prisma.storySection.upsert({
      where:  { simulationId: useCaseId },
      update: { reportTemplates: reports },
      create: { simulationId: useCaseId, companyBackground: "", closingChallenge: "", howItWorks: "", reportTemplates: reports },
    }).catch(() => null);
    res.json({ success: true, message: "Reports saved" });
  } catch (error) { next(error); }
};

exports.saveSeniorPerspective = async (req, res, next) => {
  try {
    const { useCaseId } = req.params;
    const { lines } = req.body;
    
    // ✅ Check simulation exists
    const sim = await prisma.simulation.findUnique({ where: { id: useCaseId, isDeleted: false } });
    if (!sim) return res.status(404).json({ success: false, message: "Simulation not found" });
    
    await prisma.storySection.upsert({
      where:  { simulationId: useCaseId },
      update: { seniorPerspectiveLines: lines },
      create: { simulationId: useCaseId, companyBackground: "", closingChallenge: "", howItWorks: "", seniorPerspectiveLines: lines },
    }).catch(() => null);
    res.json({ success: true, message: "Senior perspectives saved" });
  } catch (error) { next(error); }
};