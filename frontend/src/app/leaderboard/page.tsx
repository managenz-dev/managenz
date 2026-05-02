"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Trophy, Medal, Crown, TrendingUp,
  Users, BarChart3, ChevronRight, Star, Zap,
  CheckCircle2, Brain,
} from "lucide-react";
import AppNavbar from "@/components/layout/AppNavbar";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Domain accent colours
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const DOMAIN_ACCENT: Record<string, { color: string; bg: string; border: string; hex: string }> = {
  "product-management":  { color: "text-[#7aaa3e]",  bg: "bg-[rgba(90,127,46,0.10)]",  border: "border-[#5a7f2e]/25",  hex: "#7c3aed" },
  "finance":             { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", hex: "#059669" },
  "operations":          { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/25",   hex: "#d97706" },
  "human-resources":     { color: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/25",    hex: "#db2777" },
  "strategy":            { color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/25",    hex: "#0891b2" },
  "general-management":  { color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25",    hex: "#2563eb" },
  "sales-marketing":     { color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/25",    hex: "#e11d48" },
  "entrepreneurship":    { color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/25",  hex: "#ea580c" },
};
const FALLBACK_ACCENT = { color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/25", hex: "#6366f1" };

function getAccent(slug: string) {
  return DOMAIN_ACCENT[slug] || FALLBACK_ACCENT;
}

function scoreLabel(s: number) {
  if (s >= 90) return { label: "Elite",      color: "text-emerald-400" };
  if (s >= 75) return { label: "Strong",     color: "text-emerald-400" };
  if (s >= 60) return { label: "Developing", color: "text-amber-400"   };
  return               { label: "High Risk", color: "text-rose-400"    };
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown  className="w-5 h-5 text-yellow-400"/>;
  if (rank === 2) return <Medal  className="w-5 h-5 text-slate-300"/>;
  if (rank === 3) return <Medal  className="w-5 h-5 text-amber-600"/>;
  return <span className="font-mono text-sm text-slate-500 dark:text-slate-900 dark:text-white/40 w-5 text-center">{rank}</span>;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// LEADERBOARD ROW
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function LeaderRow({
  entry, isMe, accent, index,
}: {
  entry: any; isMe: boolean; accent: typeof FALLBACK_ACCENT; index: number;
}) {
  const sl       = scoreLabel(entry.avgScore);
  const initials = entry.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const top3     = entry.rank <= 3;

  return (
    <div
      style={{ animation: `fadeUp 0.35s ease ${index * 40}ms both` }}
      className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 rounded-2xl border transition-all
        ${isMe
          ? `${accent.bg} ${accent.border} shadow-lg`
          : top3
            ? "bg-white/[0.04] border-white/[0.10] hover:border-white/[0.16]"
            : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.10]"
        }`}
    >
      {/* rank */}
      <div className="w-8 flex items-center justify-center flex-shrink-0">
        <RankIcon rank={entry.rank}/>
      </div>

      {/* avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold
        ${top3 ? "bg-gradient-to-br from-[#5a7f2e]/50 to-[#5a7f2e]/50 border border-white/20" : "bg-white/[0.06] border border-slate-200 dark:border-white/[0.07]"}`}>
        <span className="text-slate-900 dark:text-white">{initials}</span>
      </div>

      {/* name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-display font-semibold text-sm truncate ${isMe ? accent.color : "text-slate-800 dark:text-white"}`}>
            {entry.name}
          </p>
          {isMe && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${accent.bg} ${accent.color} border ${accent.border} flex-shrink-0`}>
              You
            </span>
          )}
        </div>
        <p className="font-mono text-[10px] text-slate-600 dark:text-slate-900 dark:text-white/30 mt-0.5">
          {entry.completed} simulation{entry.completed !== 1 ? "s" : ""} completed
        </p>
      </div>

      {/* best score */}
      <div className="hidden sm:flex flex-col items-end">
        <span className="font-mono text-xs text-slate-600 dark:text-slate-900 dark:text-white/30">Best</span>
        <span className="font-mono text-sm text-slate-600 dark:text-slate-900 dark:text-white/60 font-bold">{entry.best}</span>
      </div>

      {/* avg score */}
      <div className="flex flex-col items-end flex-shrink-0">
        <span className={`font-display font-bold text-xl ${sl.color}`}>{entry.avgScore}</span>
        <span className={`font-mono text-[10px] ${sl.color} opacity-70`}>{sl.label}</span>
      </div>
    </div>
  );
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// LEADERBOARD PAGE
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
export default function LeaderboardPage() {
  const router            = useRouter();
  const { user, fetchMe, hasHydrated } = useAuthStore();

  const [domains,      setDomains]      = useState<any[]>([]);
  const [activeDomain, setActiveDomain] = useState<string>("");
  const [board,        setBoard]        = useState<any[]>([]);
  const [meta,         setMeta]         = useState({ totalParticipants: 0, myRank: null as number | null });
  const [loading,      setLoading]      = useState(true);
  const [tabLoading,   setTabLoading]   = useState(false);

  // \u2500\u2500 Load domains \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  useEffect(() => {
    const runGuard = () => {
    
      const { isAuthenticated, user: u } = useAuthStore.getState();
      if (!u || !isAuthenticated) { router.replace("/auth/login"); return; }

      api.get("/leaderboard/domains").then(res => {
        const list = res.data.data?.domains || [];
        setDomains(list);
        const initial = u.selectedDomain
          ? (typeof u.selectedDomain === "string" ? u.selectedDomain : (u.selectedDomain as any)?.slug)
          : list[0]?.slug;
        if (initial) setActiveDomain(initial);
      });
    };
    if (hasHydrated) runGuard();
    else fetchMe().then(runGuard);
  }, []);

  // \u2500\u2500 Load leaderboard when active domain changes \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  useEffect(() => {
    if (!activeDomain) return;
    setTabLoading(true);
    api.get(`/leaderboard?domain=${activeDomain}`)
      .then(res => {
        setBoard(res.data.data?.leaderboard || []);
        setMeta({
          totalParticipants: res.data.data?.totalParticipants || 0,
          myRank:            res.data.data?.myRank || null,
        });
      })
      .catch(() => setBoard([]))
      .finally(() => { setTabLoading(false); setLoading(false); });
  }, [activeDomain]);

  const accent   = getAccent(activeDomain);
  const myEntry  = board.find(e => e.userId === user?.id);

  if (!hasHydrated || !user) return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#5a7f2e] animate-spin"/>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#5a7f2e] animate-spin"/>
    </div>
  );

  return (
    <>
    <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }    .scrollbar-hide::-webkit-scrollbar { display:none; }    .scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }`}</style>
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white">
      <AppNavbar/>

      {/* ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/4 rounded-full blur-[120px]`}/>
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[rgba(90,127,46,0.3)] rounded-full blur-[100px]"/>
      </div>

      <main className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 pt-20 sm:pt-24 lg:pt-28 pb-16">

        {/* \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        <div className="mb-8 sm:mb-10" style={{ animation: "fadeUp 0.5s ease" }}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-400"/>
            <span className="font-mono text-xs text-yellow-400/70 uppercase tracking-wider">Leaderboard</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-slate-900 dark:text-white mb-1">
            Domain Rankings
          </h1>
          <p className="font-body text-slate-500 dark:text-slate-900 dark:text-white/40 text-sm">
            Top performers across all management domains
          </p>
        </div>

        {/* \u2500\u2500 My rank banner (if ranked) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {myEntry && (
          <div
            className={`${accent.bg} border ${accent.border} rounded-2xl p-4 sm:p-5 mb-6 flex items-center gap-4`}
            style={{ animation: "fadeUp 0.4s ease 0.1s both" }}
          >
            <div className={`w-12 h-12 rounded-xl bg-[rgba(90,127,46,0.20)] border border-[#5a7f2e]/30 flex items-center justify-center flex-shrink-0`}>
              <Star className={`w-6 h-6 ${accent.color}`}/>
            </div>
            <div className="flex-1">
              <p className="font-mono text-xs text-slate-500 dark:text-slate-900 dark:text-white/40 uppercase tracking-wider">Your Position</p>
              <p className={`font-display font-bold text-lg ${accent.color}`}>
                Rank #{meta.myRank} of {meta.totalParticipants} participants
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs text-slate-600 dark:text-slate-900 dark:text-white/30">Avg Score</p>
              <p className="font-display font-bold text-2xl text-slate-900 dark:text-white">{myEntry.avgScore}</p>
            </div>
          </div>
        )}

        {/* \u2500\u2500 Domain tabs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide" style={{ animation: "fadeUp 0.4s ease 0.15s both" }}>
          {domains.map(d => {
            const a       = getAccent(d.slug);
            const isActive = activeDomain === d.slug;
            return (
              <button
                key={d.slug}
                onClick={() => setActiveDomain(d.slug)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl font-mono text-xs uppercase tracking-wider transition-all border
                  ${isActive
                    ? `${a.bg} ${a.color} ${a.border} shadow-md`
                    : "bg-white/[0.03] text-slate-600 dark:text-white/40 border-white/[0.06] hover:border-white/[0.14] hover:text-slate-700 dark:text-white/70"
                  }`}
              >
                {d.name}
              </button>
            );
          })}
        </div>

        {/* \u2500\u2500 Active domain header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div>
            <h2 className="font-display font-bold text-slate-900 dark:text-white text-lg sm:text-xl">
              {domains.find(d => d.slug === activeDomain)?.name || ""} Leaderboard
            </h2>
            <p className="font-body text-slate-600 dark:text-slate-900 dark:text-white/35 text-xs sm:text-sm mt-0.5">
              <span className={`font-bold ${accent.color}`}>{meta.totalParticipants}</span> participants
              {meta.myRank && <> \u00b7 You are ranked <span className={`font-bold ${accent.color}`}>#{meta.myRank}</span></>}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full ${accent.bg} border ${accent.border}`}>
            <span className={`font-mono text-xs font-bold ${accent.color}`}>Top {board.length}</span>
          </div>
        </div>

        {/* \u2500\u2500 Leaderboard list \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {tabLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-slate-600 dark:text-slate-900 dark:text-white/30 animate-spin"/>
          </div>
        ) : board.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-white/[0.025]">
            <Trophy className="w-12 h-12 text-slate-500 dark:text-slate-900 dark:text-white/15 mx-auto mb-4"/>
            <h3 className="font-display font-bold text-slate-500 dark:text-slate-900 dark:text-white/50 text-lg mb-1">No rankings yet</h3>
            <p className="font-body text-slate-600 dark:text-slate-900 dark:text-white/25 text-sm">
              Be the first to complete a simulation in this domain!
            </p>
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl bg-[#5a7f2e] text-white text-sm font-body font-medium hover:bg-[#4d6e26] transition-all">
              Start Simulating <ChevronRight className="w-4 h-4"/>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Top 3 podium highlight */}
            {board.slice(0, 3).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                {[board[1], board[0], board[2]].filter(Boolean).map((entry, i) => {
                  if (!entry) return null;
                  const podiumOrder = [2, 1, 3];
                  const heights     = ["h-20", "h-28", "h-16"];
                  const isMe        = entry.userId === user?.id;
                  const sl          = scoreLabel(entry.avgScore);
                  const initials    = entry.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={entry.userId}
                      style={{ animation: `fadeUp 0.4s ease ${i * 80}ms both` }}
                      className={`relative rounded-2xl border p-4 text-center
                        ${isMe ? `${accent.bg} ${accent.border}` : "bg-white/[0.03] border-white/[0.08]"}`}>
                      {entry.rank === 1 && <Crown className="w-5 h-5 text-yellow-400 mx-auto mb-2"/>}
                      {entry.rank === 2 && <Medal className="w-5 h-5 text-slate-500 mx-auto mb-2"/>}
                      {entry.rank === 3 && <Medal className="w-5 h-5 text-amber-600 mx-auto mb-2"/>}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5a7f2e]/40 to-[#5a7f2e]/40 border border-white/15 flex items-center justify-center mx-auto mb-2">
                        <span className="font-display font-bold text-slate-900 dark:text-white text-sm">{initials}</span>
                      </div>
                      <p className={`font-display font-semibold text-sm truncate mb-1 ${isMe ? accent.color : "text-slate-800 dark:text-white"}`}>
                        {entry.name} {isMe && "(You)"}
                      </p>
                      <p className={`font-display font-bold text-2xl ${sl.color}`}>{entry.avgScore}</p>
                      <p className="font-mono text-[10px] text-slate-600 dark:text-slate-900 dark:text-white/30 mt-0.5">{entry.completed} done</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full list */}
            <div className="space-y-1.5">
              {board.map((entry, i) => (
                <LeaderRow
                  key={entry.userId}
                  entry={entry}
                  isMe={entry.userId === user?.id}
                  accent={accent}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
    </>
  );
}