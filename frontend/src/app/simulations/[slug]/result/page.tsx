// frontend/src/app/simulations/[slug]/result/page.tsx
"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Loader2, RotateCcw,
  Share2, Brain, Target, Award, CheckCircle2,
  BarChart3, Download, Star, Zap, ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════════════
   UNIVERSAL GRADE SYSTEM — Consistent across ALL pages
   90+ → A+ (Elite) | 80+ → A (Strong) | 70+ → B+ (Good)
   60+ → B (Developing) | <60 → C (High Risk)
═══════════════════════════════════════════════════════════════════ */
function getTier(s: number) {
  if (s >= 90) return { label: "Elite", emoji: "🏆", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/25", ring: "#10b981", grade: "A+", desc: "Elite management judgment" };
  if (s >= 80) return { label: "Strong", emoji: "⭐", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/25", ring: "#10b981", grade: "A", desc: "Strong decision-making" };
  if (s >= 70) return { label: "Good", emoji: "👍", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/25", ring: "#3b82f6", grade: "B+", desc: "Good progress with room to grow" };
  if (s >= 60) return { label: "Developing", emoji: "📈", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/25", ring: "#f59e0b", grade: "B", desc: "Developing judgment" };
  return { label: "High Risk", emoji: "📚", color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/25", ring: "#ef4444", grade: "C", desc: "Needs focused improvement" };
}

/* ═══════════════════════════════════════════════════════════════════
   SCORE RING COMPONENT — Animated radial progress
═══════════════════════════════════════════════════════════════════ */
function ScoreRing({ score }: { score: number }) {
  const t = getTier(score);
  const r = 52, circ = 2 * Math.PI * r, off = circ - (score / 100) * circ;
  return (
    <svg viewBox="0 0 140 140" className="w-32 h-32 sm:w-36 sm:h-36">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="10" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={t.ring} strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        transform="rotate(-90 70 70)" style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }} />
      <text x="70" y="62" textAnchor="middle" fontSize="30" fontWeight="bold" fontFamily="monospace" fill={t.ring}>{score}</text>
      <text x="70" y="78" textAnchor="middle" fontSize="10" fill="rgba(148,163,184,0.7)">out of 100</text>
      <text x="70" y="96" textAnchor="middle" fontSize="15" fontWeight="bold" fill={t.ring}>{t.grade}</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BAR CHART — Starting vs Final values with delta
═══════════════════════════════════════════════════════════════════ */
function BarChart({ variables }: { variables: any[] }) {
  return (
    <div className="space-y-3">
      {variables.map((v: any) => {
        const pct = Math.min(100, Math.max(0, v.finalValue));
        const startPct = Math.min(100, Math.max(0, v.startingValue));
        const color = v.finalValue >= 70 ? "#10b981" : v.finalValue >= 50 ? "#f59e0b" : "#ef4444";
        return (
          <div key={v.variableName}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-body text-xs font-medium text-slate-700 dark:text-white/70 truncate max-w-[40%]">{v.displayName}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-400 dark:text-white/30">{v.startingValue}%</span>
                <span className="font-mono text-[9px] text-slate-300 dark:text-white/20">→</span>
                <span className="font-mono text-xs font-bold" style={{ color }}>{v.finalValue}%</span>
                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full ${v.delta > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : v.delta < 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-slate-100 dark:bg-white/[0.05] text-slate-400"}`}>
                  {v.delta > 0 ? `+${v.delta}` : v.delta}
                </span>
              </div>
            </div>
            <div className="relative h-4 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
              <div className="absolute left-0 top-0 h-full rounded-full opacity-25 bg-slate-400 dark:bg-white/20" style={{ width: `${startPct}%` }} />
              <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              {pct > 15 && <span className="absolute right-2 top-0 h-full flex items-center font-mono text-[9px] font-bold text-white/80">{pct}%</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   COLUMN CHART — Net change per metric (positive/negative)
═══════════════════════════════════════════════════════════════════ */
function ColumnChart({ variables }: { variables: any[] }) {
  const maxAbs = Math.max(...variables.map((v: any) => Math.abs(v.delta)), 1);
  const H = 90;
  return (
    <div className="flex items-end justify-around gap-1 pt-4 overflow-x-auto" style={{ height: H * 2 + 32 }}>
      {variables.map((v: any) => {
        const pos = v.delta >= 0;
        const pct = (Math.abs(v.delta) / maxAbs) * H;
        const col = pos ? "#10b981" : "#ef4444";
        return (
          <div key={v.variableName} className="flex flex-col items-center flex-1 min-w-[36px]" style={{ height: H * 2 + 16 }}>
            <div className="w-full flex flex-col justify-end" style={{ height: H }}>
              {pos && v.delta !== 0 && (
                <div className="w-full rounded-t-lg flex items-start justify-center pt-1"
                  style={{ height: Math.max(4, Math.min(pct, H)), background: col, boxShadow: `0 0 8px ${col}66` }}>
                  <span className="font-mono text-[7px] font-bold text-white">+{v.delta}</span>
                </div>
              )}
            </div>
            <div className="w-full h-px bg-slate-300 dark:bg-white/20" />
            <div className="w-full" style={{ height: H }}>
              {!pos && v.delta !== 0 && (
                <div className="w-full rounded-b-lg flex items-end justify-center pb-1"
                  style={{ height: Math.max(4, Math.min(Math.abs(pct), H)), background: col, boxShadow: `0 0 8px ${col}66` }}>
                  <span className="font-mono text-[7px] font-bold text-white">{v.delta}</span>
                </div>
              )}
              {v.delta === 0 && <div className="w-full rounded-b-lg bg-slate-200 dark:bg-white/10" style={{ height: 4 }} />}
            </div>
            <p className="font-mono text-[7px] text-slate-400 dark:text-white/30 text-center leading-tight truncate w-full px-0.5 mt-1">
              {v.displayName.split(" ")[0]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   RADAR CHART — Multi-dimensional performance view
═══════════════════════════════════════════════════════════════════ */
function RadarChart({ variables }: { variables: any[] }) {
  const size = 220, cx = size / 2, cy = size / 2, radius = 80;
  const n = variables.length;
  if (n < 3) return null;
  const angle = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2;
  const pt = (i: number, r: number) => ({ x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) });
  const poly = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  const finalPts = variables.map((v: any, i: number) => pt(i, (Math.min(100, Math.max(0, v.finalValue)) / 100) * radius));
  const startPts = variables.map((v: any, i: number) => pt(i, (Math.min(100, Math.max(0, v.startingValue)) / 100) * radius));
  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[240px]">
        {[25, 50, 75, 100].map(pct => {
          const pts = variables.map((_: any, i: number) => pt(i, (pct / 100) * radius));
          return <g key={pct}><path d={poly(pts)} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="1" /><text x={cx + 3} y={cy - (pct / 100) * radius + 3} fontSize="7" fill="rgba(148,163,184,0.5)">{pct}</text></g>;
        })}
        {variables.map((_: any, i: number) => { const p = pt(i, radius); return <line key={i} x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke="rgba(148,163,184,0.2)" strokeWidth="1" />; })}
        <path d={poly(startPts)} fill="rgba(148,163,184,0.1)" stroke="rgba(148,163,184,0.35)" strokeWidth="1.5" strokeDasharray="4 2" />
        <path d={poly(finalPts)} fill="rgba(90,127,46,0.18)" stroke="#5a7f2e" strokeWidth="2" />
        {finalPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#5a7f2e" stroke="white" strokeWidth="1.5" />)}
        {variables.map((v: any, i: number) => {
          const lp = pt(i, radius + 18);
          const anchor = lp.x < cx - 5 ? "end" : lp.x > cx + 5 ? "start" : "middle";
          return <text key={i} x={lp.x.toFixed(1)} y={lp.y.toFixed(1)} textAnchor={anchor} fontSize="8.5" fill="rgba(100,116,139,0.9)" fontFamily="monospace">{v.displayName.split(" ")[0]}</text>;
        })}
      </svg>
      <div className="flex items-center gap-4 mt-1">
        <div className="flex items-center gap-1.5"><div className="w-6 h-0.5 bg-[#5a7f2e] rounded" /><span className="font-mono text-[9px] text-slate-500 dark:text-white/40">Final</span></div>
        <div className="flex items-center gap-1.5"><div className="w-6 h-0 border-t border-dashed border-slate-400 opacity-60" /><span className="font-mono text-[9px] text-slate-500 dark:text-white/40">Start</span></div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DECISION ROW — Expandable history of each choice
═══════════════════════════════════════════════════════════════════ */
function DecisionRow({ answer, index }: { answer: any; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-white/[0.07] rounded-xl overflow-hidden mb-2" style={{ animation: `fadeUp 0.3s ease ${index * 18}ms both` }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center flex-shrink-0">
          <span className="font-mono text-[9px] font-bold text-slate-500 dark:text-white/40">{String(answer.questionNumber).padStart(2, "0")}</span>
        </div>
        <div className="flex-1 min-w-0">
          {answer.questionTag && <p className="font-mono text-[8px] text-slate-400 dark:text-white/25 uppercase tracking-wider mb-0.5">{answer.questionTag}</p>}
          <p className="font-body text-sm text-slate-800 dark:text-white truncate">{answer.questionText}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-[9px] font-bold text-[#5a7f2e] bg-[rgba(90,127,46,0.10)] px-1.5 py-0.5 rounded">Option {answer.chosenOption?.label}</span>
            {answer.chosenOption?.strategyTag && <span className="font-mono text-[8px] text-slate-400 dark:text-white/30 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.06]">{answer.chosenOption.strategyTag}</span>}
            <div className="flex items-center gap-1 ml-auto">
              {(answer.chosenOption?.impacts?.filter((i: any) => i.delta > 0).length ?? 0) > 0 && <span className="font-mono text-[8px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><TrendingUp className="w-2.5 h-2.5" />{answer.chosenOption.impacts.filter((i: any) => i.delta > 0).length}</span>}
              {(answer.chosenOption?.impacts?.filter((i: any) => i.delta < 0).length ?? 0) > 0 && <span className="font-mono text-[8px] text-rose-600 dark:text-rose-400 flex items-center gap-0.5"><TrendingDown className="w-2.5 h-2.5" />{answer.chosenOption.impacts.filter((i: any) => i.delta < 0).length}</span>}
            </div>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-white/30 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01]">
          {answer.chosenOption?.title && <p className="font-body text-sm font-semibold text-slate-800 dark:text-white mt-3 mb-1">{answer.chosenOption.title}</p>}
          {answer.chosenOption?.consequence && <p className="font-body text-sm text-slate-600 dark:text-white/60 leading-relaxed mb-3">{answer.chosenOption.consequence}</p>}
          {(answer.chosenOption?.impacts?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {answer.chosenOption.impacts.map((imp: any, i: number) => (
                <span key={i} className={`font-mono text-[9px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${imp.delta > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : imp.delta < 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" : "bg-slate-100 dark:bg-white/[0.05] text-slate-400 border-slate-200 dark:border-white/[0.06]"}`}>
                  {imp.delta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : imp.delta < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
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

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function SimulationResultPage() {
  const router = useRouter();
  const params = useParams();
  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : (rawSlug ?? "");
  const { user, hasHydrated, fetchMe } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [badge, setBadge] = useState<any>(null);
  const [errMsg, setErrMsg] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const [retrying, setRetrying] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (isRetry = false) => {
    if (!slug) { setLoading(false); setErrMsg("Simulation slug missing."); return; }
    if (!isRetry) setLoading(true); else setRetrying(true);
    setErrMsg("");
    try {
      const res = await api.get(`/simulations/${slug}/result`);
      const data = res.data?.data;
      if (!data) throw new Error("Empty response from server.");
      setResult(data);
      if (data?.sessionId) {
        try { const br = await api.post("/badges/create", { sessionId: data.sessionId }); setBadge(br.data?.data ?? null); }
        catch { /* non-critical */ }
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Unknown error";
      console.error("[Result] load failed:", msg);
      setErrMsg(msg);
      if (!isRetry) toast.error("Could not load results.");
    } finally { setLoading(false); setRetrying(false); }
  }, [slug]);

  useEffect(() => {
    const run = async () => {
      if (!hasHydrated) await fetchMe();
      const { isAuthenticated, user: u } = useAuthStore.getState();
      if (!u || !isAuthenticated) { router.replace("/auth/login"); return; }
      load();
    };
    run();
  }, [load, hasHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Report capture for download/sharing ── */
  const captureReport = async (): Promise<string | null> => {
    try {
      const el = reportRef.current;
      if (!el) return null;
      // Make visible for capture
      el.style.display = "block";
      el.style.position = "fixed";
      el.style.top = "-9999px";
      el.style.left = "0";
      el.style.width = "794px"; // A4 portrait px at 96dpi
      // @ts-ignore
      const h2c = (await import("html2canvas")).default;
      const canvas = await h2c(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 794,
      });
      el.style.display = "none";
      el.style.position = "";
      el.style.top = "";
      el.style.left = "";
      return canvas.toDataURL("image/png");
    } catch (err) {
      console.error("Report capture failed:", err);
      return null;
    }
  };

  const handleDownloadReport = async () => {
    const imgData = await captureReport();
    if (!imgData) { window.print(); return; }
    const link = document.createElement("a");
    link.download = `ManaGenz_Report_${(result?.simulation?.title ?? "report").replace(/\s+/g, "_")}.png`;
    link.href = imgData;
    link.click();
  };

  const handleLinkedIn = async () => {
    const certUrl = badge ? `${window.location.origin}/certificate/${badge.publicId}` : window.location.href;
    const tier = getTier(result?.score?.overallScore ?? 0);
    const postText = `🏆 I scored ${result?.score?.overallScore}/100 (Grade ${tier.grade} — ${tier.label}) on "${result?.simulation?.title}" at ManaGenz Academy.\n\n📊 Domain: ${result?.simulation?.domain?.name}\n🎯 ${tier.desc}\n\nManaGenz builds real management judgment through 25-decision business simulations — not theory, not videos, just decisions with consequences.\n\n📜 Verify certificate: ${certUrl}\n\n#ManaGenz #ManagementSkills #Leadership #Simulation #ProfessionalDevelopment`;
    // Capture report image and download it so user can attach to post
    const imgData = await captureReport();
    if (imgData) {
      const link = document.createElement("a");
      link.download = `ManaGenz_Report_${badge?.publicId ?? "report"}.png`;
      link.href = imgData;
      link.click();
      await new Promise(r => setTimeout(r, 600)); // let download start
      toast("Report image downloaded — attach it to your LinkedIn post!", { duration: 4000 });
    }
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl)}&summary=${encodeURIComponent(postText)}`,
      "_blank"
    );
  };

  const handleCopy = async () => {
    if (!badge) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}/certificate/${badge.publicId}`); setCopyMsg("Copied!"); setTimeout(() => setCopyMsg(""), 2000); }
    catch { setCopyMsg("Failed"); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(90,127,46,0.10)] border border-[#5a7f2e]/20 flex items-center justify-center mx-auto">
          <Loader2 className="w-7 h-7 text-[#5a7f2e] animate-spin" />
        </div>
        <p className="font-mono text-[11px] text-slate-500 dark:text-white/30 uppercase tracking-widest">Calculating your results…</p>
      </div>
    </div>
  );

  if (!result) return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center p-4">
      <div className="text-center max-w-sm w-full">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4"><Trophy className="w-8 h-8 text-rose-400" /></div>
        <h2 className="font-display font-bold text-slate-900 dark:text-white text-xl mb-2">Result not available yet</h2>
        <p className="font-body text-slate-500 dark:text-white/40 text-sm mb-2 leading-relaxed">Your session may still be processing.</p>
        {errMsg && <p className="font-mono text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 mb-4">{errMsg}</p>}
        <div className="flex gap-3 justify-center mt-4">
          <button onClick={() => load(true)} disabled={retrying} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5a7f2e] hover:bg-[#4d6e26] text-white font-body text-sm font-semibold transition-all shadow-lg shadow-[#5a7f2e]/20 disabled:opacity-60">
            {retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} {retrying ? "Retrying…" : "Retry"}
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/60 font-body text-sm hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );

  const score = Math.round(result.score?.overallScore ?? 0);
  const tier = getTier(score);
  const name = user?.name ?? "Student";
  const vars = (result.variables ?? []) as any[];
  const answers = (result.answers ?? []) as any[];
  const domain = result.simulation?.domain?.name ?? "Management";
  const simTitle = result.simulation?.title ?? "Simulation";
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const bestVar = vars.length ? [...vars].sort((a, b) => b.delta - a.delta)[0] : null;
  const worstVar = vars.length ? [...vars].sort((a, b) => a.delta - b.delta)[0] : null;
  const certId = badge?.publicId ?? "";

  return (
    <>
    <style>{`
      @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      @keyframes scaleIn { from{transform:scale(0.94);opacity:0}       to{transform:scale(1);opacity:1}     }
      @media print {
        body *, body { visibility:hidden!important; }
        #pdf-report, #pdf-report * { visibility:visible!important; }
        #pdf-report { position:absolute!important;left:0!important;top:0!important;width:100%!important; }
        .no-print { display:none!important; }
      }
    `}</style>

    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[160px]" style={{ background: `${tier.ring}10` }} />
      </div>

      <div className="relative z-10 w-full px-5 xl:px-10 2xl:px-16 py-10">

        {/* NAV */}
        <div className="flex items-center justify-between mb-8 no-print">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white font-body text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <button onClick={handleDownloadReport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5a7f2e] hover:bg-[#4d6e26] text-white font-body text-sm font-semibold transition-all shadow-lg shadow-[#5a7f2e]/20">
            <Download className="w-4 h-4" /> Download Report
          </button>
        </div>

        {/* SCORE HERO */}
        <div className="rounded-3xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] p-6 sm:p-8 mb-6 shadow-sm overflow-hidden relative no-print" style={{ animation: "scaleIn 0.5s ease" }}>
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ background: `linear-gradient(90deg,${tier.ring},${tier.ring}44)` }} />
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: `${tier.ring}0d` }} />
          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0"><ScoreRing score={score} /></div>
            <div className="text-center sm:text-left flex-1">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${tier.bg} border ${tier.border} mb-3`}>
                <span>{tier.emoji}</span><span className={`font-mono text-xs font-bold ${tier.color}`}>{tier.label} · Grade {tier.grade}</span>
              </div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white mb-2">
                {score >= 90 ? `Outstanding, ${name.split(" ")[0]}!` : score >= 75 ? `Well done, ${name.split(" ")[0]}!` : score >= 60 ? `Good effort, ${name.split(" ")[0]}!` : `Keep going, ${name.split(" ")[0]}!`}
              </h1>
              <p className="font-body text-sm text-slate-500 dark:text-white/50 leading-relaxed max-w-sm mb-4">{tier.desc}</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"><Brain className="w-3 h-3 text-slate-400" /><span className="font-mono text-[10px] text-slate-500 dark:text-white/40">{answers.length} decisions</span></div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08]"><Target className="w-3 h-3 text-slate-400" /><span className="font-mono text-[10px] text-slate-500 dark:text-white/40">{domain}</span></div>
                {bestVar && bestVar.delta > 0 && <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20"><TrendingUp className="w-3 h-3 text-emerald-500" /><span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">Best: {bestVar.displayName} +{bestVar.delta}</span></div>}
              </div>
            </div>
          </div>

          {badge && (
            <div className="rounded-xl border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-6" style={{ borderColor: `${tier.ring}40`, background: `${tier.ring}0d` }}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ background: `${tier.ring}25`, border: `1px solid ${tier.ring}50` }}>{tier.emoji}</div>
                <div><p className="font-mono text-[9px] text-slate-400 dark:text-white/30 uppercase tracking-wider">Badge Earned</p><p className={`font-display font-bold text-sm ${tier.color}`}>{tier.label} — {simTitle}</p><p className="font-mono text-[10px] text-slate-400 dark:text-white/30">Certificate ID: {certId.slice(0, 8).toUpperCase()}</p></div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={handleLinkedIn} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0A66C2]/15 border border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/25 font-body text-xs font-semibold transition-all">
                  <Share2 className="w-3.5 h-3.5" /> Share on LinkedIn
                </button>
                <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/50 font-body text-xs transition-all">
                  {copyMsg || "Copy Link"}
                </button>
                <Link href={`/certificate/${badge.publicId}`} target="_blank" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-white/60 font-body text-xs transition-all">
                  <Award className="w-3.5 h-3.5" /> View Certificate
                </Link>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-white/[0.07]">
            <Link href={`/simulations/${slug}`} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5a7f2e] hover:bg-[#4d6e26] text-white font-body font-medium text-sm transition-all shadow-md shadow-[#5a7f2e]/20"><RotateCcw className="w-4 h-4" /> Retry Simulation</Link>
            <Link href="/leaderboard" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-body font-medium text-sm hover:bg-amber-500/20 transition-all"><Trophy className="w-4 h-4" /> Leaderboard</Link>
            <Link href="/analytics" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/60 font-body font-medium text-sm hover:opacity-80 transition-opacity"><BarChart3 className="w-4 h-4" /> My Analytics</Link>
          </div>
        </div>

        {/* SNAPSHOT */}
        {vars.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6 no-print" style={{ animation: "fadeUp 0.5s ease 0.1s both" }}>
            <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-emerald-200 dark:border-emerald-500/20 p-4 shadow-sm">
              <p className="font-mono text-[9px] text-emerald-500/70 uppercase tracking-wider mb-1">Strongest Metric</p>
              <p className="font-body text-sm font-semibold text-slate-800 dark:text-white">{bestVar?.displayName}</p>
              <p className="font-mono text-xl font-bold text-emerald-500">{(bestVar?.delta ?? 0) > 0 ? `+${bestVar?.delta}` : bestVar?.delta}<span className="text-xs font-normal text-slate-400 dark:text-white/30 ml-1">→ {bestVar?.finalValue}%</span></p>
            </div>
            <div className={`rounded-2xl bg-white dark:bg-white/[0.03] border p-4 shadow-sm ${(worstVar?.delta ?? 0) < 0 ? "border-rose-200 dark:border-rose-500/20" : "border-slate-200 dark:border-white/[0.07]"}`}>
              <p className={`font-mono text-[9px] uppercase tracking-wider mb-1 ${(worstVar?.delta ?? 0) < 0 ? "text-rose-500/70" : "text-slate-400"}`}>Needs Improvement</p>
              <p className="font-body text-sm font-semibold text-slate-800 dark:text-white">{worstVar?.displayName}</p>
              <p className={`font-mono text-xl font-bold ${(worstVar?.delta ?? 0) < 0 ? "text-rose-500" : "text-slate-400"}`}>{(worstVar?.delta ?? 0) > 0 ? `+${worstVar?.delta}` : worstVar?.delta}<span className="text-xs font-normal text-slate-400 dark:text-white/30 ml-1">→ {worstVar?.finalValue}%</span></p>
            </div>
          </div>
        )}

        {/* CHARTS */}
        {vars.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6 no-print" style={{ animation: "fadeUp 0.5s ease 0.15s both" }}>
            <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-4 h-4 text-[#5a7f2e]" /><p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider">Metric Performance</p></div>
              <p className="font-body text-[10px] text-slate-400 dark:text-white/25 mb-4">Ghost = starting · Solid = final</p>
              <BarChart variables={vars} />
            </div>
            <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] p-5 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-[#5a7f2e]" /><p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider">Radar View</p></div>
              <p className="font-body text-[10px] text-slate-400 dark:text-white/25 mb-3">All metrics at a glance</p>
              <div className="flex-1 flex items-center justify-center"><RadarChart variables={vars} /></div>
            </div>
            <div className="lg:col-span-3 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-[#5a7f2e]" /><p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider">Net Change Per Metric</p></div>
              <p className="font-body text-[10px] text-slate-400 dark:text-white/25 mb-2">Green = improved · Red = declined</p>
              <ColumnChart variables={vars} />
            </div>
          </div>
        )}

        {/* COACHING */}
        <div className="rounded-2xl bg-[rgba(90,127,46,0.8)] border border-[#5a7f2e]/20 p-5 mb-6 shadow-sm no-print" style={{ animation: "fadeUp 0.5s ease 0.2s both" }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(90,127,46,0.15)] border border-[#5a7f2e]/25 flex items-center justify-center flex-shrink-0 mt-0.5"><Star className="w-4 h-4 text-[#5a7f2e]" /></div>
            <div>
              <p className="font-body text-sm font-semibold text-slate-800 dark:text-white mb-1">Coaching Insight</p>
              <p className="font-body text-sm text-slate-600 dark:text-white/60 leading-relaxed">
                {score >= 90 ? "Elite judgment. Your decisions consistently optimised across all dimensions. Try Advanced difficulty."
                  : score >= 75 ? `Strong performance. Focus on ${worstVar?.displayName ?? "your weakest metric"} to push past 90.`
                  : score >= 60 ? `Developing. Review decisions affecting ${worstVar?.displayName ?? "your weakest metric"} — pattern the red impacts.`
                  : "High-risk cascading patterns. Study your first 5 decisions — initial calls compound hard. Retry with this insight."}
              </p>
            </div>
          </div>
        </div>

        {/* DECISIONS */}
        {answers.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] p-5 mb-6 shadow-sm no-print" style={{ animation: "fadeUp 0.5s ease 0.25s both" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#5a7f2e]" /><p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider">All {answers.length} Decisions</p></div>
              <span className="font-body text-xs text-slate-400 dark:text-white/30">Tap any to expand</span>
            </div>
            {answers.map((a: any, i: number) => <DecisionRow key={a.questionNumber ?? i} answer={a} index={i} />)}
          </div>
        )}

        {/* ─── ELITE CORPORATE REPORT (captured as image / printed) ────── */}
        <div id="pdf-report" ref={reportRef} style={{ display: "none", fontFamily: "'Segoe UI','Helvetica Neue',Arial,sans-serif", background: "#ffffff", width: "794px", minHeight: "1123px", boxSizing: "border-box", margin: "0 auto" }}>

          {/* ── DARK NAVY HEADER ─────────────────────────────────────────── */}
          <div style={{ background: "#0f1e3d", padding: "36px 48px 28px", position: "relative", overflow: "hidden" }}>
            {/* Subtle grid texture */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
            {/* Accent corner glow */}
            <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", background: "rgba(90,127,46,0.15)", borderRadius: "50%", filter: "blur(40px)", pointerEvents: "none" }} />

            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {/* Official ManaGenz logo — white version for dark background */}
              <img
                src="/dark_logo.png"
                alt="ManaGenz"
                style={{ height: "40px", objectFit: "contain", objectPosition: "left center" }}
              />

              {/* Score badge */}
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "14px", padding: "12px 24px" }}>
                  <span style={{ color: "#ffffff", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: "4px", opacity: 0.6 }}>Overall Score</span>
                  <span style={{ color: tier.ring, fontSize: "42px", fontWeight: 900, lineHeight: 1, fontFamily: "monospace" }}>{score}</span>
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "10px", marginTop: "2px" }}>/ 100 — Grade {tier.grade}</span>
                </div>
              </div>
            </div>

            {/* Report title strip */}
            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "8.5px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "4px" }}>Simulation Performance Report</div>
                <div style={{ color: "#ffffff", fontSize: "18px", fontWeight: 700, letterSpacing: "-0.2px" }}>{simTitle}</div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px", marginTop: "3px" }}>{domain} Domain</div>
              </div>
              <div style={{ textAlign: "right", color: "rgba(255,255,255,0.45)", fontSize: "9px" }}>
                <div>{today}</div>
                {certId && <div style={{ marginTop: "2px", fontFamily: "monospace" }}>CERT/{certId.slice(0, 8).toUpperCase()}</div>}
              </div>
            </div>
          </div>

          {/* ── BODY ─────────────────────────────────────────────────────── */}
          <div style={{ padding: "32px 48px 40px" }}>

            {/* Participant + performance row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "28px" }}>
              {/* Participant */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", borderTop: "3px solid #0f1e3d" }}>
                <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600, marginBottom: "10px" }}>Participant</div>
                {([["Name", name], ["Email", user?.email ?? "—"], ["Domain", domain]] as [string, string][]).map(([l, v], i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", padding: "4px 0", borderBottom: i < 2 ? "1px solid #f1f5f9" : "none" }}>
                    <span style={{ fontSize: "8.5px", color: "#94a3b8", width: "46px", flexShrink: 0 }}>{l}</span>
                    <span style={{ fontSize: "8.5px", color: "#0f172a", fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Simulation details */}
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", borderTop: "3px solid #0f1e3d" }}>
                <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600, marginBottom: "10px" }}>Simulation</div>
                {([["Title", simTitle.length > 22 ? simTitle.slice(0, 22) + "…" : simTitle], ["Decisions", `${answers.length} completed`], ["Domain", domain]] as [string, string][]).map(([l, v], i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", padding: "4px 0", borderBottom: i < 2 ? "1px solid #f1f5f9" : "none" }}>
                    <span style={{ fontSize: "8.5px", color: "#94a3b8", width: "56px", flexShrink: 0 }}>{l}</span>
                    <span style={{ fontSize: "8.5px", color: "#0f172a", fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Performance summary */}
              <div style={{ border: `1px solid ${tier.ring}30`, borderRadius: "10px", padding: "16px", background: `${tier.ring}07`, borderTop: `3px solid ${tier.ring}` }}>
                <div style={{ fontSize: "8px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600, marginBottom: "10px" }}>Performance</div>
                {([
                  ["Grade", `${tier.grade} — ${tier.label}`],
                  ["Score", `${score} / 100`],
                  ["Best", bestVar?.delta > 0 ? `${bestVar.displayName} +${bestVar.delta}` : "—"],
                ] as [string, string][]).map(([l, v], i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", padding: "4px 0", borderBottom: i < 2 ? `1px solid ${tier.ring}18` : "none" }}>
                    <span style={{ fontSize: "8.5px", color: "#94a3b8", width: "38px", flexShrink: 0 }}>{l}</span>
                    <span style={{ fontSize: "8.5px", color: i === 1 ? tier.ring : "#0f172a", fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ height: "1.5px", flex: 1, background: "linear-gradient(90deg,#0f1e3d,transparent)" }} />
              <span style={{ fontSize: "8px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 600, flexShrink: 0 }}>Metric Breakdown</span>
              <div style={{ height: "1.5px", flex: 1, background: "linear-gradient(270deg,#0f1e3d,transparent)" }} />
            </div>

            {/* Metrics table */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5px", marginBottom: "24px" }}>
              <thead>
                <tr style={{ background: "#0f1e3d" }}>
                  {["Metric", "Start", "Final", "Δ Change", "Progress", "Status"].map((h, i) => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: i > 1 ? "center" : "left", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: "8px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vars.map((v: any, i: number) => {
                  const sc = v.finalValue >= 70 ? "#059669" : v.finalValue >= 50 ? "#d97706" : "#dc2626";
                  const sl = v.finalValue >= 70 ? "Good" : v.finalValue >= 50 ? "Fair" : "At Risk";
                  const bw = Math.round((v.finalValue / 100) * 80);
                  const sw = Math.round((v.startingValue / 100) * 80);
                  return (
                    <tr key={v.variableName} style={{ background: i % 2 === 0 ? "#ffffff" : "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "9px 10px", fontWeight: 600, color: "#0f172a" }}>{v.displayName}</td>
                      <td style={{ padding: "9px 10px", color: "#94a3b8", fontFamily: "monospace", textAlign: "center" }}>{v.startingValue}%</td>
                      <td style={{ padding: "9px 10px", color: sc, fontWeight: 700, fontFamily: "monospace", textAlign: "center" }}>{v.finalValue}%</td>
                      <td style={{ padding: "9px 10px", color: v.delta > 0 ? "#059669" : v.delta < 0 ? "#dc2626" : "#94a3b8", fontWeight: 700, fontFamily: "monospace", textAlign: "center" }}>{v.delta > 0 ? `+${v.delta}` : v.delta === 0 ? "±0" : v.delta}</td>
                      <td style={{ padding: "9px 10px" }}>
                        {/* Stacked bar: start (ghost) + final (solid) */}
                        <div style={{ position: "relative", height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${sw}px`, background: "#cbd5e1", borderRadius: "4px" }} />
                          <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${bw}px`, background: sc, borderRadius: "4px" }} />
                        </div>
                      </td>
                      <td style={{ padding: "9px 10px", textAlign: "center" }}>
                        <span style={{ background: `${sc}15`, color: sc, border: `1px solid ${sc}35`, borderRadius: "100px", padding: "0 10px", fontSize: "7.5px", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", height: "20px", minWidth: "54px" }}>{sl}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Coaching insight */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px 20px", marginBottom: "24px", borderLeft: "4px solid #0f1e3d" }}>
              <div style={{ fontSize: "8px", color: "#0f1e3d", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: "6px" }}>Coaching Insight</div>
              <div style={{ fontSize: "9.5px", color: "#334155", lineHeight: 1.7 }}>
                {score >= 90 ? "Elite-level management judgment demonstrated throughout. Decisions were consistently well-calibrated across financial, stakeholder, and strategic dimensions. Pursue Advanced-tier simulations for continued growth."
                  : score >= 75 ? `Strong performance with clear decision-making ability. Key opportunity: ${worstVar?.displayName ?? "weaker metrics"}. Review decisions where metrics declined to identify specific improvement patterns.`
                  : score >= 60 ? `Developing judgment with visible progress across multiple metrics. Focus area: ${worstVar?.displayName ?? "weaker metrics"}. Study each decision's consequences carefully before advancing to the next simulation.`
                  : `High-risk cascading decision patterns identified. Early choices had significant compound negative effects. Recommended: restart this simulation with explicit focus on stakeholder trust and financial prudence in the first 8 decisions.`}
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: "2px solid #e2e8f0", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <img
                  src="/light_logo.png"
                  alt="ManaGenz"
                  style={{ height: "28px", objectFit: "contain", objectPosition: "left center" }}
                />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "8px", color: "#64748b" }}>{name} · {domain} · Score {score}/100 ({tier.label}) · {today}</div>
                {certId && <div style={{ fontSize: "7.5px", color: "#94a3b8", marginTop: "2px", fontFamily: "monospace" }}>managenz.academy/certificate/{certId.slice(0, 8).toUpperCase()}</div>}
              </div>
            </div>
          </div>
        </div>
        <style>{`@media print { #pdf-report { display:block!important; } }`}</style>
        <div className="h-12" />
      </div>
    </div>
    </>
  );
}