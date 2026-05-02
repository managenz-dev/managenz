const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── 1. Admin User ──────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where:  { email: "admin@managenz.com" },
    update: {},
    create: {
      name:          "Admin",
      email:         "admin@managenz.com",
      passwordHash:  adminPassword,
      role:          "ADMIN",
      emailVerified: true,
    },
  });
  console.log("✅ Admin created:", admin.email);

  // ── 2. Domains ─────────────────────────────────────────────────────────────
  const domainData = [
    { name: "Product Management", slug: "product-management", description: "Master the art of building products users love.", iconName: "Package",   colorHex: "#7c3aed", sortOrder: 1 },
    { name: "Finance",            slug: "finance",            description: "Master financial decisions and investment strategy.", iconName: "BarChart3", colorHex: "#059669", sortOrder: 2 },
    { name: "Operations",         slug: "operations",         description: "Optimise processes at scale.",                       iconName: "Zap",       colorHex: "#d97706", sortOrder: 3 },
    { name: "Human Resources",    slug: "human-resources",    description: "Lead and develop your people.",                      iconName: "Users",     colorHex: "#db2777", sortOrder: 4 },
    { name: "Strategy",           slug: "strategy",           description: "Navigate competitive landscapes.",                   iconName: "Target",    colorHex: "#0891b2", sortOrder: 5 },
    { name: "General Management", slug: "general-management", description: "Lead cross-functional teams.",                       iconName: "Building2", colorHex: "#2563eb", sortOrder: 6 },
    { name: "Sales & Marketing",  slug: "sales-marketing",    description: "Drive growth and revenue.",                         iconName: "TrendingUp",colorHex: "#e11d48", sortOrder: 7 },
    { name: "Entrepreneurship",   slug: "entrepreneurship",   description: "Build something from nothing.",                      iconName: "Sparkles",  colorHex: "#ea580c", sortOrder: 8 },
  ];

  for (const d of domainData) {
    const created = await prisma.domain.upsert({
      where:  { slug: d.slug },
      update: d,
      create: d,
    });
    console.log("✅ Domain:", created.name);
  }

  // ── 3. Use Case ────────────────────────────────────────────────────────────
  const pmDomain = await prisma.domain.findUnique({ where: { slug: "product-management" } });
  if (!pmDomain) { console.log("❌ PM domain not found"); return; }

  const existingUC = await prisma.useCase.findUnique({ where: { slug: "startup-product-launch" } });
  if (existingUC) { console.log("ℹ️  Use case already exists, skipping"); return; }

  const useCase = await prisma.useCase.create({
    data: {
      domainId:         pmDomain.id,
      slug:             "startup-product-launch",
      title:            "The Startup Product Launch",
      shortDescription: "Navigate a 90-day product launch under pressure. Manage stakeholders, scope, and team morale.",
      difficulty:       "INTERMEDIATE",
      estimatedMinutes: 45,
      totalQuestions:   2,
      isPremium:        false,
      isPublished:      true,
      sortOrder:        1,
    },
  });
  console.log("✅ Use case created:", useCase.title);

  // ── 4. Story ───────────────────────────────────────────────────────────────
  await prisma.storySection.create({
    data: {
      useCaseId:         useCase.id,
      companyBackground: "NovaPay is a Series A fintech startup with 45 employees. Founded in 2021, it processes 50 crore in transactions monthly. The company has strong traction but faces increasing competition from established players. You joined 2 weeks ago as the first dedicated Product Manager, reporting directly to CEO Arjun Mehta.",
      closingChallenge:  "Arjun has asked you to lead the launch of NovaPay's most ambitious feature — instant peer-to-peer payments with a social feed. The board is watching. Engineering says 90 days is tight. Marketing wants 6 more weeks for campaigns. Every decision you make will affect team morale, product quality, and whether NovaPay survives its next funding round.",
    },
  });
  console.log("✅ Story created");

  // ── 5. Simulation Variables ────────────────────────────────────────────────
  const varTeamMorale = await prisma.simulationVariable.create({
    data: { useCaseId: useCase.id, variableName: "team_morale",       displayName: "Team Morale",       startingValue: 70, unit: "%", higherIsBetter: true,  sortOrder: 1 },
  });
  const varProductQuality = await prisma.simulationVariable.create({
    data: { useCaseId: useCase.id, variableName: "product_quality",   displayName: "Product Quality",   startingValue: 60, unit: "%", higherIsBetter: true,  sortOrder: 2 },
  });
  const varTimeline = await prisma.simulationVariable.create({
    data: { useCaseId: useCase.id, variableName: "timeline_health",   displayName: "Timeline Health",   startingValue: 80, unit: "%", higherIsBetter: true,  sortOrder: 3 },
  });
  const varStakeholder = await prisma.simulationVariable.create({
    data: { useCaseId: useCase.id, variableName: "stakeholder_trust", displayName: "Stakeholder Trust", startingValue: 65, unit: "%", higherIsBetter: true,  sortOrder: 4 },
  });
  console.log("✅ Variables created");

  // ── 6. Scoring Dimension Configs ───────────────────────────────────────────
  await prisma.scoringDimensionConfig.createMany({
    data: [
      { useCaseId: useCase.id, dimensionKey: "strategic_thinking", displayName: "Strategic Thinking",     weight: 25, sortOrder: 1 },
      { useCaseId: useCase.id, dimensionKey: "stakeholder_mgmt",   displayName: "Stakeholder Management", weight: 25, sortOrder: 2 },
      { useCaseId: useCase.id, dimensionKey: "execution",          displayName: "Execution Quality",      weight: 25, sortOrder: 3 },
      { useCaseId: useCase.id, dimensionKey: "user_focus",         displayName: "User Focus",             weight: 25, sortOrder: 4 },
    ],
  });
  console.log("✅ Scoring dimensions created");

  // ── 7. Question 1 ──────────────────────────────────────────────────────────
  const q1 = await prisma.question.create({
    data: {
      useCaseId:       useCase.id,
      questionNumber:  1,
      tag:             "PRIORITISATION",
      situationUpdate: "It's day 3. You've reviewed the engineering backlog. The feature has 3 major components: payment processing, social feed, and notifications. Engineering says all 3 together need 90 days minimum.",
      questionText:    "How do you approach the 90-day launch deadline with engineering?",
      context:         "The CEO expects a full launch. Engineering lead Priya says splitting the scope is the only way to hit the date safely.",
    },
  });

  const q1optA = await prisma.option.create({
    data: { questionId: q1.id, optionLabel: "A", title: "Launch all 3 components together on day 90, no matter what", description: "Commit to the full vision. Push the team hard. No scope cuts.", strategyTag: "Full Commitment" },
  });
  const q1optB = await prisma.option.create({
    data: { questionId: q1.id, optionLabel: "B", title: "Launch payments only on day 90, ship social feed in phase 2", description: "Focus on core value first. De-risk the launch by splitting scope into phases.", strategyTag: "Phased Launch" },
  });
  const q1optC = await prisma.option.create({
    data: { questionId: q1.id, optionLabel: "C", title: "Ask the CEO to extend the deadline to 120 days", description: "Request more time to do it right rather than rush a poor experience.", strategyTag: "Deadline Extension" },
  });
  const q1optD = await prisma.option.create({
    data: { questionId: q1.id, optionLabel: "D", title: "Hire 2 contract engineers to speed everything up", description: "Throw resources at the problem. Bring in contractors immediately.", strategyTag: "Resource Scaling" },
  });

  // ImpactValues for Q1 options
  await prisma.impactValue.createMany({
    data: [
      // Option A impacts
      { optionId: q1optA.id, variableId: varTeamMorale.id,    delta: -15 },
      { optionId: q1optA.id, variableId: varTimeline.id,      delta: -20 },
      { optionId: q1optA.id, variableId: varProductQuality.id,delta: -10 },
      { optionId: q1optA.id, variableId: varStakeholder.id,   delta:   5 },
      // Option B impacts
      { optionId: q1optB.id, variableId: varTeamMorale.id,    delta:  10 },
      { optionId: q1optB.id, variableId: varTimeline.id,      delta:  15 },
      { optionId: q1optB.id, variableId: varProductQuality.id,delta:  20 },
      { optionId: q1optB.id, variableId: varStakeholder.id,   delta:  -5 },
      // Option C impacts
      { optionId: q1optC.id, variableId: varTeamMorale.id,    delta:   5 },
      { optionId: q1optC.id, variableId: varTimeline.id,      delta:  25 },
      { optionId: q1optC.id, variableId: varProductQuality.id,delta:  15 },
      { optionId: q1optC.id, variableId: varStakeholder.id,   delta: -15 },
      // Option D impacts
      { optionId: q1optD.id, variableId: varTeamMorale.id,    delta:  -5 },
      { optionId: q1optD.id, variableId: varTimeline.id,      delta:  10 },
      { optionId: q1optD.id, variableId: varProductQuality.id,delta:   5 },
      { optionId: q1optD.id, variableId: varStakeholder.id,   delta:   0 },
    ],
  });
  console.log("✅ Question 1 + options + impacts created");

  // ── 8. Question 2 ──────────────────────────────────────────────────────────
  const q2 = await prisma.question.create({
    data: {
      useCaseId:       useCase.id,
      questionNumber:  2,
      tag:             "STAKEHOLDER MANAGEMENT",
      situationUpdate: "Day 15. You decided on a phased launch. Now Marketing Head Vikram says he needs the social feed at launch for his campaign. He has gone directly to the CEO to complain.",
      questionText:    "The CEO calls you to discuss Vikram's concerns. How do you handle this?",
      context:         "Vikram has significant influence. His campaign budget is 40 lakh. But shipping everything at once puts quality at serious risk.",
    },
  });

  const q2optA = await prisma.option.create({
    data: { questionId: q2.id, optionLabel: "A", title: "Stand firm — present data on quality risk to the CEO", description: "Show the CEO the engineering risk analysis. Let the data make your case.", strategyTag: "Data-Driven" },
  });
  const q2optB = await prisma.option.create({
    data: { questionId: q2.id, optionLabel: "B", title: "Compromise — include a basic version of the social feed", description: "Give Vikram something to work with. Ship a lightweight v1 of the social feed.", strategyTag: "Compromise" },
  });
  const q2optC = await prisma.option.create({
    data: { questionId: q2.id, optionLabel: "C", title: "Escalate back — ask CEO to make the final call", description: "Put the decision on the CEO. It is above your pay grade if stakeholders are going around you.", strategyTag: "Escalate" },
  });
  const q2optD = await prisma.option.create({
    data: { questionId: q2.id, optionLabel: "D", title: "Redesign Vikram's campaign around payments-only launch", description: "Proactively work with Vikram to reframe his campaign. Turn the constraint into a positioning advantage.", strategyTag: "Reframe" },
  });

  // ImpactValues for Q2 options
  await prisma.impactValue.createMany({
    data: [
      // Option A impacts
      { optionId: q2optA.id, variableId: varStakeholder.id,   delta:  15 },
      { optionId: q2optA.id, variableId: varTeamMorale.id,    delta:  10 },
      { optionId: q2optA.id, variableId: varProductQuality.id,delta:  15 },
      { optionId: q2optA.id, variableId: varTimeline.id,      delta:   0 },
      // Option B impacts
      { optionId: q2optB.id, variableId: varStakeholder.id,   delta:   5 },
      { optionId: q2optB.id, variableId: varTeamMorale.id,    delta: -10 },
      { optionId: q2optB.id, variableId: varProductQuality.id,delta: -10 },
      { optionId: q2optB.id, variableId: varTimeline.id,      delta: -15 },
      // Option C impacts
      { optionId: q2optC.id, variableId: varStakeholder.id,   delta: -10 },
      { optionId: q2optC.id, variableId: varTeamMorale.id,    delta:  -5 },
      { optionId: q2optC.id, variableId: varProductQuality.id,delta:   0 },
      { optionId: q2optC.id, variableId: varTimeline.id,      delta:   0 },
      // Option D impacts
      { optionId: q2optD.id, variableId: varStakeholder.id,   delta:  20 },
      { optionId: q2optD.id, variableId: varTeamMorale.id,    delta:  15 },
      { optionId: q2optD.id, variableId: varProductQuality.id,delta:  10 },
      { optionId: q2optD.id, variableId: varTimeline.id,      delta:  10 },
    ],
  });
  console.log("✅ Question 2 + options + impacts created");

  console.log("\n🎉 Seed complete!");
  console.log("─────────────────────────────────");
  console.log("Admin login:");
  console.log("  Email:    admin@managenz.com");
  console.log("  Password: admin123");
  console.log("─────────────────────────────────");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });