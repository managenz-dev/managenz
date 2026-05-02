// ─────────────────────────────────────────────────────────────────────────────
// Admin Analytics Controller
// File: backend/src/controllers/admin-analytics.controller.js
// Provides all data for the admin analytics dashboard in one call.
// ─────────────────────────────────────────────────────────────────────────────
const prisma = require("../utils/prisma");

// ── Helper: generate date labels for last N days ──────────────────────────────
function lastNDays(n) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function dateLabel(d) {
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function weekLabel(d) {
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics
// Returns everything the analytics dashboard needs in a single response.
// ─────────────────────────────────────────────────────────────────────────────
exports.getAnalytics = async (req, res, next) => {
  try {
    const now     = new Date();
    const day30   = new Date(now); day30.setDate(now.getDate() - 30);
    const day7    = new Date(now); day7.setDate(now.getDate() - 7);
    const day60   = new Date(now); day60.setDate(now.getDate() - 60);

    // ── Fetch all raw data in parallel ────────────────────────────────────────
    const [
      allUsers,
      allSessions,
      allDomains,
      allUseCases,
      allScores,
    ] = await Promise.all([
      prisma.user.findMany({
        include: {
          subscription: { select: { plan: true } },
          selectedDomain: { select: { id: true, name: true, colorHex: true } },
          _count: { select: { sessions: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.simulationSession.findMany({
        select: {
          id: true, status: true, createdAt: true, completedAt: true,
          userId: true, useCaseId: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.domain.findMany({
        select: { id: true, name: true, colorHex: true, _count: { select: { useCases: true } } },
      }),
      prisma.useCase.findMany({
        select: { id: true, title: true, difficulty: true, isPublished: true, domainId: true,
          _count: { select: { questions: true, sessions: true } } },
      }),
      prisma.simulationScore.findMany({
        select: { overallScore: true, sessionId: true, createdAt: true,
          session: { select: { useCaseId: true, userId: true } } },
      }),
    ]);

    // ═══════════════════════════════════════════════════════════════════════
    // 1. OVERVIEW STATS
    // ═══════════════════════════════════════════════════════════════════════
    const totalUsers       = allUsers.length;
    const premiumUsers     = allUsers.filter(u => u.subscription?.plan === "PREMIUM").length;
    const verifiedUsers    = allUsers.filter(u => u.emailVerified).length;
    const activeUsers7d    = new Set(allSessions.filter(s => new Date(s.createdAt) >= day7).map(s => s.userId)).size;
    const totalSessions    = allSessions.length;
    const completedSessions= allSessions.filter(s => s.status === "COMPLETED").length;
    const completionRate   = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    const avgScore         = allScores.length > 0
      ? Math.round(allScores.reduce((sum, s) => sum + s.overallScore, 0) / allScores.length)
      : 0;

    // ═══════════════════════════════════════════════════════════════════════
    // 2. DAILY SIGNUPS — last 30 days
    // ═══════════════════════════════════════════════════════════════════════
    const days30 = lastNDays(30);
    const dailySignups = days30.map(day => {
      const next = new Date(day); next.setDate(day.getDate() + 1);
      const count = allUsers.filter(u => {
        const d = new Date(u.createdAt);
        return d >= day && d < next;
      }).length;
      return { date: dateLabel(day), signups: count };
    });

    // Cumulative signups
    let cumulative = allUsers.filter(u => new Date(u.createdAt) < days30[0]).length;
    const cumulativeSignups = dailySignups.map(d => {
      cumulative += d.signups;
      return { date: d.date, total: cumulative };
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 3. DAILY SESSIONS — last 30 days
    // ═══════════════════════════════════════════════════════════════════════
    const dailySessions = days30.map(day => {
      const next = new Date(day); next.setDate(day.getDate() + 1);
      const started   = allSessions.filter(s => { const d = new Date(s.createdAt); return d >= day && d < next; }).length;
      const completed = allSessions.filter(s => s.status === "COMPLETED" && s.completedAt && (() => { const d = new Date(s.completedAt); return d >= day && d < next; })()).length;
      return { date: dateLabel(day), started, completed };
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 4. WEEKLY ACTIVE USERS — last 8 weeks
    // ═══════════════════════════════════════════════════════════════════════
    const weeklyActive = Array.from({ length: 8 }, (_, i) => {
      const weekEnd   = new Date(now); weekEnd.setDate(now.getDate() - i * 7);
      const weekStart = new Date(weekEnd); weekStart.setDate(weekEnd.getDate() - 7);
      const activeSet = new Set(allSessions.filter(s => {
        const d = new Date(s.createdAt);
        return d >= weekStart && d < weekEnd;
      }).map(s => s.userId));
      return { week: weekLabel(weekStart), activeUsers: activeSet.size };
    }).reverse();

    // ═══════════════════════════════════════════════════════════════════════
    // 5. PLAN DISTRIBUTION
    // ═══════════════════════════════════════════════════════════════════════
    const planDistribution = [
      { name: "Free",    value: totalUsers - premiumUsers, color: "#94a3b8" },
      { name: "Premium", value: premiumUsers,              color: "#f59e0b" },
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // 6. DOMAIN DISTRIBUTION (users per domain)
    // ═══════════════════════════════════════════════════════════════════════
    const domainUserCount = {};
    allUsers.forEach(u => {
      if (u.selectedDomain?.name) {
        const key = u.selectedDomain.name;
        domainUserCount[key] = (domainUserCount[key] || 0) + 1;
      }
    });
    const domainDistribution = allDomains.map(d => ({
      name:  d.name,
      users: domainUserCount[d.name] || 0,
      color: d.colorHex || "#7c6cfc",
      simulations: d._count.useCases,
    })).filter(d => d.users > 0);

    // ═══════════════════════════════════════════════════════════════════════
    // 7. SCORE DISTRIBUTION (histogram: 0–10, 10–20, … 90–100)
    // ═══════════════════════════════════════════════════════════════════════
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}–${i * 10 + 10}`,
      count: 0,
    }));
    allScores.forEach(s => {
      const bucket = Math.min(9, Math.floor(s.overallScore / 10));
      buckets[bucket].count++;
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 8. COMPLETION RATE PER SIMULATION
    // ═══════════════════════════════════════════════════════════════════════
    const simStats = allUseCases.map(uc => {
      const ucSessions   = allSessions.filter(s => s.useCaseId === uc.id);
      const ucCompleted  = ucSessions.filter(s => s.status === "COMPLETED").length;
      const ucScores     = allScores.filter(s => s.session?.useCaseId === uc.id);
      const avgUcScore   = ucScores.length > 0
        ? Math.round(ucScores.reduce((sum, s) => sum + s.overallScore, 0) / ucScores.length)
        : null;
      return {
        title:          uc.title.length > 28 ? uc.title.slice(0, 25) + "…" : uc.title,
        fullTitle:      uc.title,
        started:        ucSessions.length,
        completed:      ucCompleted,
        completionRate: ucSessions.length > 0 ? Math.round((ucCompleted / ucSessions.length) * 100) : 0,
        avgScore:       avgUcScore,
        difficulty:     uc.difficulty,
        isPublished:    uc.isPublished,
      };
    }).filter(s => s.started > 0);

    // ═══════════════════════════════════════════════════════════════════════
    // 9. USER RETENTION COHORT (week-over-week)
    // Users who signed up in the last 5 weeks — how many came back each week?
    // ═══════════════════════════════════════════════════════════════════════
    const cohortWeeks = 5;
    const cohortData  = Array.from({ length: cohortWeeks }, (_, cohortIdx) => {
      const cohortEnd   = new Date(now); cohortEnd.setDate(now.getDate() - cohortIdx * 7);
      const cohortStart = new Date(cohortEnd); cohortStart.setDate(cohortEnd.getDate() - 7);
      const cohortUsers = allUsers.filter(u => {
        const d = new Date(u.createdAt);
        return d >= cohortStart && d < cohortEnd;
      }).map(u => u.id);

      if (cohortUsers.length === 0) return null;

      const weeks = Array.from({ length: 5 }, (_, w) => {
        const wStart = new Date(cohortEnd); wStart.setDate(cohortEnd.getDate() + w * 7);
        const wEnd   = new Date(wStart); wEnd.setDate(wStart.getDate() + 7);
        const activeInWeek = new Set(
          allSessions.filter(s =>
            cohortUsers.includes(s.userId) &&
            new Date(s.createdAt) >= wStart &&
            new Date(s.createdAt) < wEnd
          ).map(s => s.userId)
        ).size;
        const pct = Math.round((activeInWeek / cohortUsers.length) * 100);
        return { week: `W${w}`, retained: pct, count: activeInWeek };
      });

      return {
        cohort:     weekLabel(cohortStart),
        size:       cohortUsers.length,
        weeks,
      };
    }).filter(Boolean).reverse();

    // ═══════════════════════════════════════════════════════════════════════
    // 10. TOP PERFORMERS (top 10 by avg score)
    // ═══════════════════════════════════════════════════════════════════════
    const userScoreMap = {};
    allScores.forEach(s => {
      if (!userScoreMap[s.session.userId]) userScoreMap[s.session.userId] = [];
      userScoreMap[s.session.userId].push(s.overallScore);
    });
    const topPerformers = Object.entries(userScoreMap)
      .map(([userId, scores]) => ({
        userId,
        avgScore:   Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        attempts:   scores.length,
        bestScore:  Math.max(...scores),
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10)
      .map(p => {
        const user = allUsers.find(u => u.id === p.userId);
        return { ...p, name: user?.name || "Unknown", email: user?.email || "", domain: user?.selectedDomain?.name || "—" };
      });

    // ═══════════════════════════════════════════════════════════════════════
    // 11. VERIFICATION & SIGNUP FUNNEL
    // ═══════════════════════════════════════════════════════════════════════
    const funnelData = [
      { stage: "Signed Up",    count: totalUsers },
      { stage: "Email Verified", count: verifiedUsers },
      { stage: "Selected Domain", count: allUsers.filter(u => u.selectedDomain).length },
      { stage: "Started Sim",  count: new Set(allSessions.map(s => s.userId)).size },
      { stage: "Completed Sim",count: new Set(allSessions.filter(s => s.status === "COMPLETED").map(s => s.userId)).size },
    ];

    // ═══════════════════════════════════════════════════════════════════════
    // 12. RECENT ACTIVITY (last 20 sessions)
    // ═══════════════════════════════════════════════════════════════════════
    const recentSessions = await prisma.simulationSession.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        user:    { select: { name: true, email: true } },
        useCase: { select: { title: true } },
        score:   { select: { overallScore: true } },
      },
    });

    return res.json({
      success: true,
      data: {
        overview: {
          totalUsers, premiumUsers, verifiedUsers, activeUsers7d,
          totalSessions, completedSessions, completionRate, avgScore,
          totalDomains: allDomains.length, totalSimulations: allUseCases.length,
        },
        dailySignups,
        cumulativeSignups,
        dailySessions,
        weeklyActive,
        planDistribution,
        domainDistribution,
        scoreDistribution: buckets,
        simStats,
        cohortData,
        topPerformers,
        funnelData,
        recentActivity: recentSessions.map(s => ({
          userName:  s.user?.name || "Unknown",
          userEmail: s.user?.email || "",
          simTitle:  s.useCase?.title || "—",
          status:    s.status,
          score:     s.score?.overallScore ?? null,
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (err) { next(err); }
};