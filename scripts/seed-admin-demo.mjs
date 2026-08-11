// Seeds realistic usage telemetry + a sample audit entry so the Owner Command
// Center renders with data. Idempotent-ish: safe to run repeatedly (adds rows).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PAIRS = ["AUDUSD", "EURUSD", "GBPUSD", "XAUUSD", "USDJPY", "NZDUSD", "EURJPY"];
const TFS = ["15M", "1H", "4H", "D1"];

function pick(a) {
  return a[Math.floor(Math.random() * a.length)];
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });
  if (!users.length) {
    console.log("No users to seed.");
    return;
  }

  let created = 0;
  const now = Date.now();
  for (const u of users) {
    const n = 6 + Math.floor(Math.random() * 30);
    // bias each user toward a favourite pair
    const fav = pick(PAIRS);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const created_at = new Date(now - daysAgo * 86400000 - Math.floor(Math.random() * 86400000));
      rows.push({
        userId: u.id,
        pair: Math.random() < 0.55 ? fav : pick(PAIRS),
        timeframe: pick(TFS),
        confidence: 55 + Math.floor(Math.random() * 41),
        provider: "gemini",
        createdAt: created_at,
      });
    }
    await prisma.analysisUsage.createMany({ data: rows });
    created += rows.length;
    // recent presence for ~half the users
    if (Math.random() < 0.6) {
      await prisma.user.update({
        where: { id: u.id },
        data: { lastActiveAt: new Date(now - Math.floor(Math.random() * 6 * 3600000)) },
      });
    }
  }

  // a sample audit entry authored by the owner
  const admin = users.find((u) => u.role === "SUPER_ADMIN");
  if (admin) {
    const existing = await prisma.adminAction.count();
    if (existing === 0) {
      await prisma.adminAction.create({
        data: {
          actorId: admin.id,
          type: "CHANGE_SETTINGS",
          details: "Initialized the Owner Command Center",
        },
      });
    }
  }

  console.log(`Seeded ${created} analysis events across ${users.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
