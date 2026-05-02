const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Clearing all simulation data...");
  await prisma.impactValue.deleteMany();
  await prisma.option.deleteMany();
  await prisma.decisionLog.deleteMany();
  await prisma.sessionVariableState.deleteMany();
  await prisma.score.deleteMany();
  await prisma.simulationSession.deleteMany();
  await prisma.question.deleteMany();
  await prisma.simulationVariable.deleteMany();
  await prisma.scoringDimensionConfig.deleteMany();
  await prisma.dialogue.deleteMany();
  await prisma.character.deleteMany();
  await prisma.storySection.deleteMany();
  await prisma.useCase.deleteMany();
  console.log("✅ All simulations cleared");
  console.log("✅ Domains and users kept");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });