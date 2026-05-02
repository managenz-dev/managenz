"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus,
  CheckCircle2, ChevronDown, ChevronUp, Loader2, RotateCcw,
  Share2, Award, Brain, Sparkles, ArrowRight, Target,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

// ─── Score helpers ────────────────────────────────────────────────────────────
function getScoreTier(score: number) {
  if (score >= 90) return { label: "Elite",      emoji: "🏆", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", ring: "#10b981" };
  if (score >= 75) return { label: "Strong",     emoji: "⭐", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", ring: "#10b981" };
  if (score >= 60) return { label: "Developing", emoji: "📈", color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   ring: "#f59e0b" };
  return               { label: "High Risk",  emoji: "📚", color: "text-rose-500",   bg: "bg-rose-500/10",    border: "border-rose-500/20",    ring: "#ef4444" };
}

// ─── Score ring (large) ───────────────────────────────────────────────────────
function ScoreRingLarge({ score }: { score: number }) {
  const tier  = getScoreTier(score);
  const r     = 54;
  const circ  = 2 * Math.PI * r;
  const off   = circ - (score / 100) * circ;
  return (
    <svg viewBox="0 0 140 140" className="w-36 h-36">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="10"/>
      <circle cx="70" cy="70" r={r} fill="none" stroke={tier.ring} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        transform="rotate(-90 70 70)" style={{ transition: "stroke-dashoffset 1.2s ease" }}/>
      <text x="70" y="64" textAnchor="middle" fontSize="28" fontWeight="bold" fontFamily="monospace"
        className="fill-slate-900 dark:fill-white">{score}</text>
      <text x="70" y="82" textAnchor="middle" fontSize="11" fontFamily="sans-serif"
        className="fill-slate-400 dark:fill-white/30">/ 100</text>
    </svg>
  );
}

// ─── Variable result bar ──────────────────────────────────────────────────────
function VariableBar({ v }: { v: any }) {
  const deltaPositive = v.delta > 0;
  const deltaColor    = v.delta === 0 ? "text-slate-400" : deltaPositive ? "text-emerald-500" : "text-rose-500";
  const barColor      = v.finalValue >= 70 ? "bg-emerald-500" : v.finalValue >= 50 ? "bg-amber-500" : "bg-rose-500";
  const startBar      = v.startingValue;
  const endBar        = v.finalValue;

  return (
    <div
      className="py-3 border-b border-slate-100 dark:border-white/[0.06] last:border-0">
      <div className="flex items-center justify-between mb-2">
        <span className="font-body text-sm font-semibold text-slate-800 dark:text-white">{v.displayName}</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-400 dark:text-white/30">{v.startingValue} → <span className="text-slate-700 dark:text-white/70 font-semibold">{v.finalValue}</span></span>
          <span className={`font-mono text-sm font-bold ${deltaColor}`}>
            {v.delta > 0 ? `+${v.delta}` : v.delta === 0 ? "±0" : v.delta}
          </span>
        </div>
      </div>
      {/* Double bar: start vs end */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] w-10 text-slate-400 dark:text-white/25 flex-shrink-0">Start</span>
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-slate-300 dark:bg-white/20 transition-all duration-1000" style={{ width: `${startBar}%` }}/>
          </div>
          <span className="font-mono text-[9px] w-6 text-right text-slate-400 dark:text-white/25">{startBar}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] w-10 text-slate-400 dark:text-white/25 flex-shrink-0">Final</span>
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${endBar}%` }}/>
          </div>
          <span className={`font-mono text-[9px] w-6 text-right font-bold ${barColor.replace("bg-", "text-")}`}>{endBar}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Decision review row ──────────────────────────────────────────────────────
function DecisionRow({ answer }: { answer: any }) {
  const [open, setOpen] = useState(false);
  const hasImpacts = answer.chosenOption?.impacts?.length > 0;

  return (
    <div className="border border-slate-200 dark:border-white/[0.07] rounded-xl overflow-hidden mb-2">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center flex-shrink-0">
          <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-white/40">{String(answer.questionNumber).padStart(2, "0")}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[9px] text-slate-400 dark:text-white/25 uppercase tracking-wider">{answer.questionTag}</p>
          <p className="font-body text-sm text-slate-800 dark:text-white truncate">{answer.questionText}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-[10px] font-bold text-[#7c6cfc]">Option {answer.chosenOption?.label}</span>
            {answer.chosenOption?.strategyTag && (
              <span className="font-mono text-[9px] text-slate-400 dark:text-white/30 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.06]">
                {answer.chosenOption.strategyTag}
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0"/> : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0"/>}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/[0.06]">
          {answer.chosenOption?.title && (
            <p className="font-body text-sm font-semibold text-slate-800 dark:text-white mt-3 mb-1">{answer.chosenOption.title}</p>
          )}
          {answer.chosenOption?.consequence && (
            <p className="font-body text-sm text-slate-600 dark:text-white/60 leading-relaxed mb-3">{answer.chosenOption.consequence}</p>
          )}
          {hasImpacts && (
            <div className="flex flex-wrap gap-1.5">
              {answer.chosenOption.impacts.map((imp: any, i: number) => (
                <span key={i} className={`font-mono text-[10px] px-2 py-0.5 rounded-full border
                  ${imp.delta > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : imp.delta < 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    : "bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-white/30 border-slate-200 dark:border-white/[0.06]"}`}>
                  {imp.displayName} {imp.delta > 0 ? `+${imp.delta}` : imp.delta}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RESULT PAGE ──────────────────────────────────────────────────────────────
export default function SimulationResultPage() {
  const router = useRouter();
  const params = useParams();
  const slug   = params?.slug as string;
  const { user, hasHydrated, fetchMe } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [result,  setResult]  = useState<any>(null);
  const [badge,   setBadge]   = useState<any>(null);

  useEffect(() => {
    const guard = () => {
      const { isAuthenticated, user: u } = useAuthStore.getState();
      if (!u || !isAuthenticated) { router.replace("/auth/login"); return; }
      loadResult();
    };
    if (hasHydrated) guard();
    else fetchMe().then(guard);
  }, []);

  const loadResult = async () => {
    try {
      const res = await api.get(`/simulations/${slug}/result`);
      const resultData = res.data.data;
      setResult(resultData);
      // Auto-create badge if session is completed
      if (resultData?.session?.id) {
        try {
          const badgeRes = await api.post("/badges/create", { sessionId: resultData.session.id });
          setBadge(badgeRes.data.data);
        } catch { /* badge creation is non-blocking */ }
      }
    } catch {
      // Use mock result
      setResult(MOCK_RESULT);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#7c6cfc] animate-spin mx-auto"/>
        <p className="font-mono text-xs text-slate-500 dark:text-white/30">Loading your results…</p>
      </div>
    </div>
  );

  if (!result) return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center">
      <div className="text-center">
        <p className="font-body text-slate-500 dark:text-white/40 mb-4">No result found for this simulation.</p>
        <Link href="/dashboard" className="font-body text-sm text-[#7c6cfc] hover:underline">← Back to Dashboard</Link>
      </div>
    </div>
  );

  const tier   = getScoreTier(result.score?.overallScore || 0);
  const score  = result.score?.overallScore || 0;

  const handleLinkedIn = () => {
    if (!badge) return;
    const certUrl = `${window.location.origin}/certificate/${badge.publicId}`;
    const text = encodeURIComponent(
      `I just completed the "${result.useCase?.title || "a management simulation"}" on ManaGenz Academy and earned the ${tier.label} badge — scoring ${score}/100! 🎯\n\nReal decisions. Real consequences.\n\nVerify my certificate:`
    );
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl)}&summary=${text}`, "_blank");
  };
  const name   = user?.name?.split(" ")[0] || "You";

  return (
    <>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#7c6cfc]/6 rounded-full blur-[140px]"/>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-10">

        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white font-body text-sm transition-colors mb-8">
          <ArrowLeft className="w-4 h-4"/> Back to Dashboard
        </Link>

        {/* ── SCORE HERO ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] p-6 sm:p-8 mb-6 shadow-sm overflow-hidden relative"
          style={{ animation: "fadeUp 0.5s ease" }}>
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${tier.ring}, ${tier.ring}80)` }}/>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreRingLarge score={score}/>
            <div className="text-center sm:text-left">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${tier.bg} border ${tier.border} mb-3`}>
                <span>{tier.emoji}</span>
                <span className={`font-mono text-xs font-bold ${tier.color}`}>{tier.label} Performance</span>
              </div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white mb-2">
                {score >= 75 ? `Well done, ${name}!` : score >= 60 ? `Good effort, ${name}!` : `Keep going, ${name}!`}
              </h1>
              <p className="font-body text-sm text-slate-500 dark:text-white/50 leading-relaxed max-w-sm">
                {score >= 90 ? "You made near-optimal decisions throughout. Elite management judgment." :
                 score >= 75 ? "Solid decision-making across the board. A few choices cost you, but your fundamentals are strong." :
                 score >= 60 ? "You're developing real judgment. Review the decisions where you lost the most points." :
                 "Your decisions had significant consequences. Study the feedback carefully and retry."}
              </p>
            </div>
          </div>

          {/* ── Badge earned ───────────────────────────────────────────── */}
          {badge && (
            <div className="rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-5 mb-2"
              style={{ borderColor: tier.ring + "50", background: tier.ring + "10" }}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: tier.ring + "25", border: `1px solid ${tier.ring}50` }}>
                  <span className="text-xl">{tier.emoji}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Badge Earned</p>
                  <p className={`font-display font-bold text-sm ${tier.color}`}>{tier.label}</p>
                  <p className="font-mono text-[10px] text-white/35">Verifiable certificate issued</p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={handleLinkedIn}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0A66C2]/20 border border-[#0A66C2]/40 text-[#0A66C2] hover:bg-[#0A66C2]/30 font-body text-xs font-semibold transition-all">
                  <Share2 className="w-3.5 h-3.5"/> Share on LinkedIn
                </button>
                <Link href={`/certificate/${badge.publicId}`} target="_blank"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white/55 hover:text-white font-body text-xs transition-all">
                  View Cert
                </Link>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-white/[0.07]">
            <Link href={`/simulations/${slug}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7c6cfc] hover:bg-[#6a5cf0] text-white font-body font-medium text-sm transition-all shadow-md shadow-[#7c6cfc]/20 group">
              <RotateCcw className="w-4 h-4"/>
              Retry Simulation
            </Link>
            <Link href="/leaderboard"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-body font-medium text-sm hover:bg-amber-500/20 transition-all">
              <Trophy className="w-4 h-4"/>
              View Leaderboard
            </Link>
            <Link href="/analytics"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/60 font-body font-medium text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
              <Brain className="w-4 h-4"/>
              Analytics
            </Link>
          </div>
        </div>

        {/* ── METRIC BREAKDOWN ──────────────────────────────────────────── */}
        {result.variables?.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 mb-6 shadow-sm"
            style={{ animation: "fadeUp 0.5s ease 0.1s both" }}>
            <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider mb-4">Metric Breakdown</p>
            {result.variables.map((v: any) => <VariableBar key={v.variableId} v={v}/>)}
          </div>
        )}

        {/* ── DECISION REVIEW ───────────────────────────────────────────── */}
        {result.answers?.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 shadow-sm"
            style={{ animation: "fadeUp 0.5s ease 0.2s both" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider">All {result.answers.length} Decisions</p>
              <span className="font-body text-xs text-slate-400 dark:text-white/30">Click to expand</span>
            </div>
            {result.answers.map((a: any) => <DecisionRow key={a.questionNumber} answer={a}/>)}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// ─── Mock result (shown when API isn't ready) ─────────────────────────────────
const MOCK_RESULT = {
  score: { overallScore: 72 },
  variables: [
    { variableId: "v1", variableName: "REVENUE_IMPACT",        displayName: "Revenue",         startingValue: 70, finalValue: 75, delta: +5,  unit: "%", higherIsBetter: true },
    { variableId: "v2", variableName: "TEAM_MORALE",           displayName: "Team Morale",     startingValue: 75, finalValue: 67, delta: -8,  unit: "%", higherIsBetter: true },
    { variableId: "v3", variableName: "LEADERSHIP_CREDIBILITY",displayName: "Leadership Cred", startingValue: 60, finalValue: 74, delta: +14, unit: "%", higherIsBetter: true },
  ],
  answers: [
    {
      questionNumber: 1, questionTag: "Week 1 — Critical Bug",
      questionText: "Engineering discovered a data sync bug affecting 15% of enterprise clients.",
      chosenOption: {
        label: "B", title: "Investigate scope first, then escalate", strategyTag: "Investigate",
        consequence: "You gathered key data, impressed engineering, and walked into the escalation meeting prepared.",
        impacts: [{ displayName: "Revenue", delta: +2 }, { displayName: "Team Morale", delta: +5 }, { displayName: "Leadership Cred", delta: +10 }],
      },
    },
    {
      questionNumber: 2, questionTag: "Week 2 — Roadmap Pressure",
      questionText: "Sales wants 3 new enterprise features in Q2. Engineering says they can do 1.",
      chosenOption: {
        label: "C", title: "Agree to 3 features to maintain relationships", strategyTag: "People Pleaser",
        consequence: "Engineering was deflated. You ended Q2 having shipped 1 feature late.",
        impacts: [{ displayName: "Revenue", delta: -5 }, { displayName: "Team Morale", delta: -10 }, { displayName: "Leadership Cred", delta: -8 }],
      },
    },
  ],
  simulation: {
    title: "ContextIQ — Aarav's First 90 Days",
    slug: "contextiq-aarav",
  },
};