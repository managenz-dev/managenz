"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Trophy, Share2, ExternalLink,
  Award, Lock, ChevronRight, Copy, Check,
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";

// ─── Tier config ──────────────────────────────────────────────────────────────
const TIER: Record<string, {
  label: string; emoji: string; color: string;
  bg: string; border: string; glow: string; ring: string;
}> = {
  ELITE: {
    label: "Elite Strategist",  emoji: "🏆",
    color: "text-emerald-400",  bg: "bg-emerald-500/12",
    border: "border-emerald-500/30", glow: "shadow-emerald-500/20",
    ring: "#10b981",
  },
  STRONG: {
    label: "Strong Leader",     emoji: "⭐",
    color: "text-[#5a7f2e]",    bg: "bg-[rgba(90,127,46,0.12)]",
    border: "border-[#5a7f2e]/30", glow: "shadow-[#5a7f2e]/20",
    ring: "#5a7f2e",
  },
  DEVELOPING: {
    label: "Developing Manager", emoji: "📈",
    color: "text-amber-400",    bg: "bg-amber-500/12",
    border: "border-amber-500/30", glow: "shadow-amber-500/20",
    ring: "#f59e0b",
  },
  HIGH_RISK: {
    label: "High Risk Manager",  emoji: "⚠️",
    color: "text-rose-400",     bg: "bg-rose-500/12",
    border: "border-rose-500/30", glow: "shadow-rose-500/20",
    ring: "#f43f5e",
  },
};

function ScoreRing({ score, tier }: { score: number; tier: string }) {
  const t = TIER[tier] || TIER.DEVELOPING;
  const r = 36; const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  return (
    <div
      className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7"/>
        <circle cx="44" cy="44" r={r} fill="none" stroke={t.ring} strokeWidth="7"
          strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-xl text-white leading-none">{score}</span>
        <span className="font-mono text-[9px] text-white/35 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

function BadgeCard({ badge }: { badge: any }) {
  const t           = TIER[badge.tier] || TIER.DEVELOPING;
  const certUrl     = `${typeof window !== "undefined" ? window.location.origin : ""}/certificate/${badge.publicId}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(certUrl);
    setCopied(true);
    toast.success("Certificate link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkedIn = () => {
    const text = encodeURIComponent(
      `I just completed the "${badge.simTitle}" simulation on ManaGenz and earned the ${t.label} badge with a score of ${badge.score}/100! 🎯\n\nReal management decisions. Real consequences. No theory — just judgment.\n\nVerify my certificate 👇`
    );
    const url  = encodeURIComponent(certUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, "_blank");
  };

  const earnedDate = new Date(badge.earnedAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className={`relative rounded-2xl ${t.bg} border ${t.border} p-5 flex gap-5 items-start shadow-xl ${t.glow} overflow-hidden`}
      style={{ animation: "fadeUp 0.4s ease both" }}>
      {/* subtle glow blob */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20 blur-2xl" style={{ background: t.ring }}/>

      <ScoreRing score={badge.score} tier={badge.tier}/>

      <div className="flex-1 min-w-0 relative">
        {/* tier badge */}
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${t.bg} border ${t.border} mb-2`}>
          <span className="text-sm">{t.emoji}</span>
          <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${t.color}`}>{t.label}</span>
        </div>

        <h3 className="font-display font-bold text-white text-base leading-snug mb-0.5 truncate">
          {badge.simTitle}
        </h3>
        <p className="font-mono text-[10px] text-white/35 mb-3">
          {badge.domainName} · Earned {earnedDate}
        </p>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={handleLinkedIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A66C2]/20 border border-[#0A66C2]/40 text-[#0A66C2] hover:bg-[#0A66C2]/30 font-body text-xs font-medium transition-all">
            <Share2 className="w-3.5 h-3.5"/> Share on LinkedIn
          </button>
          <button onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.09] font-body text-xs transition-all">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400"/> : <Copy className="w-3.5 h-3.5"/>}
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <Link href={`/certificate/${badge.publicId}`} target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.09] font-body text-xs transition-all">
            <ExternalLink className="w-3.5 h-3.5"/> View Certificate
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.07] p-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[rgba(90,127,46,0.10)] border border-[#5a7f2e]/20 flex items-center justify-center mx-auto mb-5">
        <Trophy className="w-8 h-8 text-[#5a7f2e]/50"/>
      </div>
      <h3 className="font-display font-bold text-white text-lg mb-2">No badges yet</h3>
      <p className="font-body text-sm text-white/40 max-w-xs mx-auto leading-relaxed mb-6">
        Complete a simulation to earn your first badge. Each badge is verifiable and shareable on LinkedIn.
      </p>
      <Link href="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5a7f2e] hover:bg-[#4d6e26] text-white font-body font-medium text-sm transition-all shadow-lg shadow-[#5a7f2e]/20">
        Start a Simulation <ChevronRight className="w-4 h-4"/>
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function BadgesPage() {
  const router          = useRouter();
  const { user, fetchMe } = useAuthStore();
  const [badges,  setBadges]  = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then(() => {
      const u = useAuthStore.getState().user;
      if (!u) { router.replace("/auth/login"); return; }
    });
    api.get("/badges")
      .then(res => setBadges(res.data.data || []))
      .catch(() => toast.error("Could not load badges"))
      .finally(() => setLoading(false));
  }, []);

  const eliteCount     = badges.filter(b => b.tier === "ELITE").length;
  const strongCount    = badges.filter(b => b.tier === "STRONG").length;
  const avgScore       = badges.length
    ? Math.round(badges.reduce((s, b) => s + b.score, 0) / badges.length)
    : 0;

  return (
    <>
    <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Header */}
        <div className="mb-8" style={{ animation: "fadeUp 0.4s ease" }}>
          <p className="font-mono text-[10px] text-[#5a7f2e]/70 uppercase tracking-widest mb-1">Achievements</p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            Your Badges
          </h1>
          <p className="font-body text-sm text-slate-500 dark:text-white/40 mt-1">
            Each badge is publicly verifiable and shareable on LinkedIn.
          </p>
        </div>

        {/* Summary cards */}
        {badges.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8" style={{ animation: "fadeUp 0.4s ease 0.05s both" }}>
            {[
              { label: "Badges Earned", value: badges.length,  color: "text-[#5a7f2e]",  bg: "bg-[rgba(90,127,46,0.10)]",  border: "border-[#5a7f2e]/20" },
              { label: "Elite / Strong",value: `${eliteCount}+${strongCount}`, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
              { label: "Avg Score",     value: avgScore,        color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20" },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl ${s.bg} border ${s.border} p-4 text-center`}>
                <p className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</p>
                <p className="font-mono text-[10px] text-white/35 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Badge list */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-6 h-6 text-[#5a7f2e] animate-spin"/>
          </div>
        ) : badges.length === 0 ? (
          <EmptyState/>
        ) : (
          <div className="space-y-4">
            {badges.map((badge, i) => (
              <div key={badge.id} style={{ animationDelay: `${i * 60}ms` }}>
                <BadgeCard badge={badge}/>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}