// backend/scripts/seed-minimal.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DOMAINS = [
  { name: "Product Management", slug: "product-management", description: "Roadmaps, prioritisation, stakeholder trade-offs", colorHex: "#818cf8", iconName: "Package" },
  { name: "Marketing", slug: "marketing", description: "Brand building, campaigns, audience growth", colorHex: "#f43f5e", iconName: "Megaphone" },
  { name: "Sales", slug: "sales", description: "Revenue generation, pipeline management, closing", colorHex: "#10b981", iconName: "DollarSign" },
  { name: "Finance", slug: "finance", description: "Budgeting, forecasting, capital decisions", colorHex: "#3b82f6", iconName: "BarChart3" },
  { name: "Operations", slug: "operations", description: "Process design, efficiency, supply chain", colorHex: "#f59e0b", iconName: "Zap" },
  { name: "Human Resources", slug: "human-resources", description: "Hiring, culture, performance management", colorHex: "#ec4899", iconName: "Users" },
  { name: "Strategy", slug: "strategy", description: "Competitive positioning, growth levers", colorHex: "#06b6d4", iconName: "Target" },
  { name: "Entrepreneurship", slug: "entrepreneurship", description: "Founder decisions, fundraising, pivots", colorHex: "#f97316", iconName: "Sparkles" },
];

async function main() {
  console.log("🌱 Seeding minimal data...");

  // 1. Create Domains
  for (const d of DOMAINS) {
    await prisma.domain.upsert({
      where: { slug: d.slug },
      update: {},
      create: d,
    });
  }
  console.log(`✅ Created ${DOMAINS.length} domains`);

  // 2. Get an admin/employee to own the test sim
  const admin = await prisma.employee.upsert({
    where: { email: "admin@managenz.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@managenz.com",
      password: "hashed_password_placeholder", // We'll hash properly in auth flow
      role: "ADMIN",
    },
  });

  const pmDomain = await prisma.domain.findUnique({ where: { slug: "product-management" } });

  // 3. Create 1 Test Simulation
  await prisma.simulation.create({
    data: {
      domainId: pmDomain.id,
      createdBy: admin.id,
      title: "Nivo Product Launch",
      slug: "nivo-product-launch",
      description: "Master product prioritization in a fast-paced startup environment.",
      difficultyLevel: "FOUNDATIONAL",
      userTypeTarget: "STUDENT_EXPLORER",
      estimatedMinutes: 45,
      totalQuestions: 25,
      isPremium: false,
      isPublished: true,
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
          { variableName: "TEAM_MORALE", displayName: "Team Morale", startingValue: 70, unit: "%", higherIsBetter: true, scoringDimension: "LEADERSHIP", sortOrder: 1, isVisible: true, dimensionWeight: 1.0 },
          { variableName: "PRODUCT_CLARITY", displayName: "Product Clarity", startingValue: 60, unit: "%", higherIsBetter: true, scoringDimension: "STRATEGY", sortOrder: 2, isVisible: true, dimensionWeight: 1.0 },
          { variableName: "STAKEHOLDER_TRUST", displayName: "Stakeholder Trust", startingValue: 65, unit: "%", higherIsBetter: true, scoringDimension: "STAKEHOLDER", sortOrder: 3, isVisible: true, dimensionWeight: 1.0 },
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

  console.log("✅ Created test simulation: nivo-product-launch");
  console.log("🎉 Seed complete! Schema is synced and ready.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });