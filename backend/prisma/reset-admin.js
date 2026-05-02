const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // ── SET YOUR OWN EMAIL AND PASSWORD HERE ──
  const ADMIN_EMAIL    = "admin@managenz.com";
  const ADMIN_PASSWORD = "MethilaK@120506";
  const ADMIN_NAME     = "Admin";
  // ──────────────────────────────────────────

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where:  { email: ADMIN_EMAIL },
    update: {
      passwordHash,
      role:          "ADMIN",
      emailVerified: true,
      name:          ADMIN_NAME,
    },
    create: {
      email:         ADMIN_EMAIL,
      passwordHash,
      role:          "ADMIN",
      emailVerified: true,
      name:          ADMIN_NAME,
    },
  });

  console.log("✅ Admin account ready:");
  console.log("   Email:   ", admin.email);
  console.log("   Password:", ADMIN_PASSWORD);
  console.log("   Role:    ", admin.role);
}

main()
  .catch((e) => { console.error("❌ Error:", e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });