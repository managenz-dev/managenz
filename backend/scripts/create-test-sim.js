// backend/scripts/create-test-sim.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1. Get domain & admin
  const domain = await prisma.domain.findFirst({ where: { slug: "product-management" } });
  const admin = await prisma.employee.findFirst({ where: { role: "ADMIN" } });

  if (!domain || !admin) {
    console.error("❌ Missing domain or admin user. Run domain/employee seed first.");
    return;
  }

  // 2. Create base variables (required for FK)
  const v1 = await prisma.variable.upsert({
    where: { name: "TEAM_MORALE" },
    update: {},
    create: { name: "TEAM_MORALE", displayName: "Team Morale", unit: "%" },
  });
  const v2 = await prisma.variable.upsert({
    where: { name: "PRODUCT_CLARITY" },
    update: {},
    create: { name: "PRODUCT_CLARITY", displayName: "Product Clarity", unit: "%" },
  });
  const v3 = await prisma.variable.upsert({
    where: { name: "STAKEHOLDER_TRUST" },
    update: {},
    create: { name: "STAKEHOLDER_TRUST", displayName: "Stakeholder Trust", unit: "%" },
  });

  // 3. Create simulation with all nested data
  const sim = await prisma.simulation.create({
    data: {
      domainId: domain.id,
      createdBy: admin.id,
      title: "Nivo Product Launch",
      slug: "nivo-product-launch",
      description: "Master product prioritization in a fast-paced startup environment.",
      difficultyLevel: "FOUNDATIONAL",
      userTypeTarget: "STUDENT_EXPLORER",
      estimatedMinutes: 45,
      totalQuestions: 25,
      isPremium: false,
      isPublished: true, // ✅ Must be true for public endpoint
      status: "DRAFT",
      story: {
        create: {
          companyBackground: "NexFlow is a B2B SaaS startup building HR automation tools.",
          howItWorks: "You will face 25 interconnected decisions across 4 acts. Every choice affects your metrics.",
          closingChallenge: "The board is watching. Balance speed, quality, and stakeholder trust.",
        },
      },
      variables: {
        create: [
          { variableId: v1.id, variableName: "TEAM_MORALE", displayName: "Team Morale", startingValue: 70, unit: "%", higherIsBetter: true, scoringDimension: "LEADERSHIP", sortOrder: 1, isVisible: true, dimensionWeight: 1.0 },
          { variableId: v2.id, variableName: "PRODUCT_CLARITY", displayName: "Product Clarity", startingValue: 60, unit: "%", higherIsBetter: true, scoringDimension: "STRATEGY", sortOrder: 2, isVisible: true, dimensionWeight: 1.0 },
          { variableId: v3.id, variableName: "STAKEHOLDER_TRUST", displayName: "Stakeholder Trust", startingValue: 65, unit: "%", higherIsBetter: true, scoringDimension: "STAKEHOLDER", sortOrder: 3, isVisible: true, dimensionWeight: 1.0 },
        ],
      },
      decisions: {
        create: {
          sequenceOrder: 1,
          questionText: "A critical bug affects 15% of enterprise clients. Your engineering lead asks how you want to proceed.",
          tag: "Week 1 — Critical Bug",
          situationUpdate: "You just completed onboarding when Priya pulls you aside before standup.",
          options: {
            create: [
              { optionLabel: "A", title: "Escalate immediately", description: "Interrupt your manager and demand an emergency discussion.", strategyTag: "Escalate", consequenceText: "Your manager appreciated the urgency but questioned why you didn't gather facts first." },
              { optionLabel: "B", title: "Investigate scope first", description: "Spend 30 minutes understanding the full blast radius before looping in leadership.", strategyTag: "Investigate", consequenceText: "Excellent. You walked into the escalation meeting with facts. Your manager was impressed." },
              { optionLabel: "C", title: "Wait for manager", description: "It was discovered before you joined — not your problem yet.", strategyTag: "Wait", consequenceText: "Two days later the bug was escalated directly to the CEO." },
              { optionLabel: "D", title: "Contact clients directly", description: "Get ahead of it by personally reaching out to impacted clients.", strategyTag: "Client First", consequenceText: "Clients were confused — no official communication had been authorised." },
              { optionLabel: "E", title: "Draft fix proposal", description: "Write up your solution and share it with engineering.", strategyTag: "Solution", consequenceText: "Engineering appreciated the initiative but your proposal missed key constraints." },
              { optionLabel: "F", title: "Set up tracking doc", description: "Create a structured incident tracker and monitor from a distance.", strategyTag: "Process", consequenceText: "The tracker was well-structured, but the bug kept running while you set it up." },
            ],
          },
        },
      },
    },
  });

  console.log(`✅ SUCCESS: Created simulation "${sim.title}" (slug: ${sim.slug})`);
  console.log(`🔗 Test endpoint: http://localhost:5000/api/simulations/${sim.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });