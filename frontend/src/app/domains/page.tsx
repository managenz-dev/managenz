"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Brain, Clock, CheckCircle2, Lock, Trophy,
  TrendingUp, ArrowRight, Zap, BarChart3, Sparkles,
  ChevronRight, Play, RotateCcw,
} from "lucide-react";
import AppNavbar from "@/components/layout/AppNavbar";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { toast } from "sonner";

// Difficulty badge colours
const DIFF_STYLES: Record<string, string> = {
  BEGINNER:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  INTERMEDIATE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  ADVANCED:     "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

// Domain-specific accent colours matching select-domain page
const DOMAIN_ACCENT: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  "product-management":  { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25", glow: "bg-violet-500/5" },
  "finance":             { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", glow: "bg-emerald-500/5" },
  "operations":          { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", glow: "bg-amber-500/5" },
  "human-resources":     { color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/25", glow: "bg-pink-500/5" },
  "strategy":            { color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/25", glow: "bg-cyan-500/5" },
  "general-management":  { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25", glow: "bg-blue-500/5" },
  "sales-marketing":     { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25", glow: "bg-rose-500/5" },
  "entrepreneurship":    { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25", glow: "bg-orange-500/5" },
};
const FALLBACK_ACCENT = { color: "text-brand-400", bg: "bg-brand-500/10", border: "border-brand-500/25", glow: "bg-brand-500/5" };

// ─────────────────────────────────────────────────────────────────────────────
// Score ring (small, static)
// ─────────────────────────────────────────────────────────────────────────────
function MiniScore({ score }: { score: number }) {
  const r = 16, circ = 2 * Math.PI * r;
  const off = circ - (score / 100) * circ;
  const col = score >= 75 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg viewBox="0 0 44 44" className="w-11 h-11 flex-shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
      <circle cx="22" cy="22" r={r} fill="none" stroke={col} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 22 22)"/>
      <text x="22" y="27" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="monospace">{score}</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation card
// ─────────────────────────────────────────────────────────────────────────────
function SimCard({ sim, accent, index }: { sim: any; accent: typeof FALLBACK_ACCENT; index: number }) {
  const isCompleted  = sim.userSession?.status === "COMPLETED";
  const isInProgress = sim.userSession?.status === "IN_PROGRESS";
  const score        = sim.userSession?.score?.overallScore ?? null;

  const diffStyle = DIFF_STYLES[sim.difficulty] || DIFF_STYLES.INTERMEDIATE;

  return (
    <div
      style={{ animation: `fadeUp 0.4s ease ${index * 60}ms both` }}
      className={`relative card overflow-hidden transition-all duration-200 group
        ${isCompleted ? "opacity-85" : "hover:border-white/18 hover:-translate-y-0.5 hover:shadow-xl"}`}
    >
      {/* top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${
        isCompleted ? "bg-emerald-500/50" : isInProgress ? "bg-amber-500/50" : `bg-gradient-to-r from-transparent via-white/10 to-transparent`
      }`}/>

      <div className="p-4 sm:p-5">
        {/* header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            {/* tags */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${diffStyle}`}>
                {sim.difficulty?.charAt(0) + sim.difficulty?.slice(1).toLowerCase()}
              </span>
              {isCompleted && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5"/> Completed
                </span>
              )}
              {isInProgress && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <RotateCcw className="w-2.5 h-2.5"/> In Progress
                </span>
              )}
              {sim.isPremium && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5"/> Premium
                </span>
              )}
            </div>
            <h3 className="font-display font-semibold text-slate-900 dark:text-white text-sm sm:text-base leading-snug">{sim.title}</h3>
          </div>
          {isCompleted && score !== null && <MiniScore score={score}/>}
          {!isCompleted && (
            <div className={`w-10 h-10 rounded-xl ${accent.bg} border ${accent.border} flex items-center justify-center flex-shrink-0`}>
              <Brain className={`w-5 h-5 ${accent.color}`}/>
            </div>
          )}
        </div>

        {/* description */}
        <p className="font-body text-xs sm:text-sm text-slate-500 dark:text-slate-900 dark:text-white/45 leading-relaxed line-clamp-2 mb-4">
          {sim.description || sim.story?.companyBackground?.slice(0, 120) + "…"}
        </p>

        {/* meta row */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-slate-600 dark:text-slate-900 dark:text-white/25"/>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-900 dark:text-white/40">
              <span className="text-slate-900 dark:text-white/65 font-semibold">{sim.totalQuestions}</span> decisions
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-900 dark:text-white/25"/>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-900 dark:text-white/40">
              ~<span className="text-slate-900 dark:text-white/65 font-semibold">{sim.estimatedMinutes || 45}</span> min
            </span>
          </div>
          {isCompleted && score !== null && (
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-slate-600 dark:text-slate-900 dark:text-white/25"/>
              <span className={`font-mono text-xs font-bold ${score >= 75 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400"}`}>
                {score >= 75 ? "Strong" : score >= 60 ? "Developing" : "Needs Work"}
              </span>
            </div>
          )}
        </div>

        {/* action button */}
        {isCompleted ? (
          <Link
            href={`/simulations/${sim.slug}`}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-white/8 text-slate-500 dark:text-slate-900 dark:text-white/40 hover:text-slate-600 dark:text-slate-900 dark:text-white/60 transition-colors text-xs font-mono cursor-not-allowed"
          >
            <Lock className="w-3.5 h-3.5"/> Already Completed
          </Link>
        ) : (
          <Link
            href={`/simulations/${sim.slug}`}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-body font-medium transition-all group/btn
              ${isInProgress
                ? "bg-amber-500/15 border border-amber-500/25 text-amber-300 hover:bg-amber-500/25"
                : `${accent.bg} border ${accent.border} ${accent.color} hover:opacity-80`
              }`}
          >
            {isInProgress
              ? <><RotateCcw className="w-4 h-4"/> Continue</>
              : <><Play className="w-3.5 h-3.5"/> Start Simulation</>
            }
            <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform"/>
          </Link>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function DomainsPage() {
  const router              = useRouter();
  const { user, fetchMe }   = useAuthStore();

  const [domain,   setDomain]   = useState<any>(null);
  const [sims,     setSims]     = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [stats,    setStats]    = useState({ total: 0, completed: 0, inProgress: 0, overallAvg: 0 });

  // ── Guard: redirect to domain selection if not chosen ────────────────────
  useEffect(() => {
    fetchMe().then(() => {
      const u = useAuthStore.getState().user;
      if (!u) { router.replace("/auth/login"); return; }
      if (!u.selectedDomain) { router.replace("/select-domain"); return; }
      loadDomainData(u.selectedDomain);
    });
  }, []);

  const loadDomainData = async (domainSlug: string) => {
    try {
      // 1. Domain info
      const domRes = await api.get(`/domains/${domainSlug}`);
      const domainData = domRes.data.data?.domain || domRes.data.data;
      setDomain(domainData);

      // 2. Simulations for this domain (with user session status)
      const simsRes = await api.get(`/domains/${domainSlug}/use-cases`);
      const simList = simsRes.data.data?.useCases || simsRes.data.data || [];
      setSims(simList);

      // 3. Compute stats
      const total      = simList.length;
      const completed  = simList.filter((s: any) => s.userSession?.status === "COMPLETED").length;
      const inProgress = simList.filter((s: any) => s.userSession?.status === "IN_PROGRESS").length;
      const scores     = simList
        .filter((s: any) => s.userSession?.score?.overallScore != null)
        .map((s: any) => s.userSession.score.overallScore);
      const overallAvg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
      setStats({ total, completed, inProgress, overallAvg });
    } catch {
      toast.error("Failed to load domain data");
    } finally {
      setLoading(false);
    }
  };

  const accent          = user?.selectedDomain ? (DOMAIN_ACCENT[user.selectedDomain] || FALLBACK_ACCENT) : FALLBACK_ACCENT;
  const completedSims   = sims.filter(s => s.userSession?.status === "COMPLETED");
  const availableSims   = sims.filter(s => s.userSession?.status !== "COMPLETED");
  const progressPct     = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loading) return (
    <div className="min-h-screen bg-[#F8F7FF] dark:bg-[#04040a] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-400 animate-spin"/>
    </div>
  );

  return (
    <>
    <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }`}</style>
    <div className="min-h-screen bg-[#F8F7FF] dark:bg-[#04040a]">
      <AppNavbar/>

      {/* ambient glow matching domain colour */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-1/4 w-[500px] h-[500px] ${accent.glow} rounded-full blur-3xl`}/>
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/3 rounded-full blur-3xl"/>
      </div>

      <main className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 pt-20 sm:pt-24 lg:pt-28 pb-16 relative z-10">

        {/* ── Domain banner ─────────────────────────────────────────────── */}
        <div className="mb-8 sm:mb-10" style={{ animation: "fadeUp 0.5s ease" }}>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${accent.bg} border ${accent.border} mb-4 sm:mb-5`}>
            <Zap className={`w-3 h-3 ${accent.color}`}/>
            <span className={`font-mono text-xs uppercase tracking-wider ${accent.color}`}>Your Domain</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl 2xl:text-5xl text-slate-900 dark:text-white mb-1 sm:mb-2">
            {domain?.name || "My Domain"}
          </h1>
          <p className="font-body text-slate-500 dark:text-slate-900 dark:text-white/45 text-sm sm:text-base">{domain?.description || "Your personalised simulation library"}</p>
        </div>

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
          {[
            {
              label: "Total Simulations",
              value: stats.total,
              icon: Brain,
              suffix: "",
              hint: "in your domain",
            },
            {
              label: "Completed",
              value: stats.completed,
              icon: CheckCircle2,
              suffix: `/ ${stats.total}`,
              hint: `${progressPct}% done`,
              highlight: true,
            },
            {
              label: "In Progress",
              value: stats.inProgress,
              icon: RotateCcw,
              suffix: "",
              hint: "continue where you left off",
            },
            {
              label: "Avg. Score",
              value: stats.overallAvg || "—",
              icon: TrendingUp,
              suffix: stats.overallAvg ? "/100" : "",
              hint: stats.overallAvg >= 75 ? "Strong performer" : stats.overallAvg >= 60 ? "Developing" : stats.completed > 0 ? "Keep going" : "No attempts yet",
            },
          ].map((stat, i) => (
            <div key={i} style={{ animation: `fadeUp 0.4s ease ${i * 60}ms both` }}
              className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-sm">
              <div className={`absolute inset-0 bg-gradient-to-br ${accent.glow} pointer-events-none opacity-50`}/>
              <div className="relative">
                <div className={`w-8 h-8 rounded-lg ${accent.bg} border ${accent.border} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-4 h-4 ${accent.color}`}/>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">{stat.value}</span>
                  {stat.suffix && <span className="font-mono text-sm text-slate-600 dark:text-slate-900 dark:text-white/30">{stat.suffix}</span>}
                </div>
                <p className="font-mono text-[10px] sm:text-xs text-slate-600 dark:text-slate-900 dark:text-white/35 uppercase tracking-wider mb-0.5">{stat.label}</p>
                <p className="font-body text-[10px] text-slate-600 dark:text-slate-900 dark:text-white/25">{stat.hint}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Progress bar ─────────────────────────────────────────────── */}
        {stats.total > 0 && (
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 mb-8 sm:mb-10" style={{ animation: "fadeUp 0.4s ease 0.25s both" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-slate-500 dark:text-slate-900 dark:text-white/40 uppercase tracking-wider">Domain Progress</span>
              <span className={`font-mono text-sm font-bold ${accent.color}`}>{progressPct}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-${accent.color.split("-")[1]}-600 to-${accent.color.split("-")[1]}-400`}
                style={{
                  width: `${progressPct}%`,
                  background: `linear-gradient(to right, var(--tw-gradient-stops))`,
                  // inline fallback for the gradient
                  backgroundColor: accent.color.includes("violet") ? "#7c3aed" :
                    accent.color.includes("emerald") ? "#059669" :
                    accent.color.includes("amber")   ? "#d97706" :
                    accent.color.includes("pink")    ? "#db2777" :
                    accent.color.includes("cyan")    ? "#0891b2" :
                    accent.color.includes("blue")    ? "#2563eb" :
                    accent.color.includes("rose")    ? "#e11d48" :
                    accent.color.includes("orange")  ? "#ea580c" : "#6366f1",
                }}
              />
            </div>
            <div className="flex gap-1">
              {Array.from({ length: stats.total }).map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                  i < stats.completed ? "bg-emerald-500" : "bg-white/8"
                }`}/>
              ))}
            </div>
          </div>
        )}

        {/* ── Available simulations ────────────────────────────────────── */}
        {availableSims.length > 0 && (
          <section className="mb-10 sm:mb-12">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg sm:text-xl lg:text-2xl">
                  Simulations
                </h2>
                <p className="font-body text-slate-600 dark:text-slate-900 dark:text-white/35 text-xs sm:text-sm mt-0.5">
                  <span className={`font-bold ${accent.color}`}>{availableSims.length}</span>
                  {" "}available · <span className="font-bold text-slate-500 dark:text-slate-900 dark:text-white/50">{stats.total}</span> total
                </p>
              </div>
              <div className={`px-3 py-1.5 rounded-full ${accent.bg} border ${accent.border}`}>
                <span className={`font-mono text-xs ${accent.color} font-bold`}>{availableSims.length} to play</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {availableSims.map((sim, i) => (
                <SimCard key={sim.id} sim={sim} accent={accent} index={i}/>
              ))}
            </div>
          </section>
        )}

        {/* ── Completed simulations ────────────────────────────────────── */}
        {completedSims.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <div>
                <h2 className="font-display font-bold text-slate-600 dark:text-slate-900 dark:text-white/60 text-base sm:text-lg">
                  Completed
                </h2>
                <p className="font-body text-slate-600 dark:text-slate-900 dark:text-white/25 text-xs sm:text-sm mt-0.5">
                  {completedSims.length} simulation{completedSims.length !== 1 ? "s" : ""} locked
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400/50"/>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {completedSims.map((sim, i) => (
                <SimCard key={sim.id} sim={sim} accent={accent} index={i}/>
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {sims.length === 0 && (
          <div className="text-center py-20">
            <div className={`w-16 h-16 rounded-2xl ${accent.bg} border ${accent.border} flex items-center justify-center mx-auto mb-5`}>
              <Brain className={`w-8 h-8 ${accent.color}`}/>
            </div>
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-xl mb-2">No simulations yet</h3>
            <p className="font-body text-slate-500 dark:text-slate-900 dark:text-white/40 text-sm">
              Simulations for your domain are being added. Check back soon!
            </p>
          </div>
        )}

      </main>
    </div>
    </>
  );
}