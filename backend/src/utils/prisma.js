// backend/src/utils/prisma.js
const { PrismaClient } = require("@prisma/client");

const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

module.exports = prisma;