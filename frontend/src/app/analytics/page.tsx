"use client";
import { useEffect, useState } from "react";
import { useRouter }            from "next/navigation";
import Link                      from "next/link";
import {
  Loader2, TrendingUp, TrendingDown, Minus, Trophy,
  Target, Brain, BarChart3, Award, CheckCircle2,
  Zap, ArrowRight, Star, Activity, Clock, RotateCcw,
} from "lucide-react";
import AppNavbar        from "@/components/layout/AppNavbar";
import { useAuthStore } from "@/store/auth.store";
import api              from "@/lib/api";

/* ─── Universal grade (same as dashboard + certificate) ──────────── */
function universalGrade(s: number) {
  if (s >= 90) return { grade:"A+", label:"Elite",      color:"text-emerald-500", hex:"#10b981" };
  if (s >= 80) return { grade:"A",  label:"Strong",     color:"text-emerald-500", hex:"#10b981" };
  if (s >= 70) return { grade:"B+", label:"Good",       color:"text-blue-500",    hex:"#3b82f6" };
  if (s >= 60) return { grade:"B",  label:"Developing", color:"text-amber-500",   hex:"#f59e0b" };
  return             { grade:"C",  label:"High Risk",  color:"text-rose-500",    hex:"#ef4444" };
}

/* ─── Score line chart ─────────────────────────────────────────────── */
function LineChart({ data }: { data: any[] }) {
  if (!data?.length) return (
    <p className="font-body text-sm text-slate-400 dark:text-white/30 text-center py-10">
      No score history yet — complete simulations to see your trend.
    </p>
  );
  const W = 580, H = 150, pad = 24;
  const vals = data.map((d: any) => Number(d.score));
  const minV = Math.max(0,  Math.min(...vals) - 10);
  const maxV = Math.min(100, Math.max(...vals) + 10);
  const sx   = (i: number) => pad + (i / Math.max(data.length - 1, 1)) * (W - 2 * pad);
  const sy   = (v: number) => H - pad - ((v - minV) / Math.max(maxV - minV, 1)) * (H - 2 * pad);
  const pts  = data.map((d: any, i: number) => ({ x: sx(i), y: sy(d.score), d }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = line + ` L${pts[pts.length-1].x.toFixed(1)},${H-pad} L${pts[0].x.toFixed(1)},${H-pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#5a7f2e" stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#5a7f2e" stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      {[25, 50, 75, 100].map(v => {
        const y = sy(v); if (y < 0 || y > H) return null;
        return <line key={v} x1={pad} y1={y} x2={W - pad} y2={y} stroke="rgba(148,163,184,0.1)" strokeWidth="1"/>;
      })}
      <path d={area} fill="url(#areaGrad)"/>
      <path d={line}  fill="none" stroke="#5a7f2e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="5" fill="#5a7f2e" stroke="white" strokeWidth="2"/>
          <text x={p.x.toFixed(1)} y={(p.y - 10).toFixed(1)} textAnchor="middle" fontSize="9" fill="#5a7f2e" fontWeight="700">{Math.round(p.d.score)}</text>
          {data.length <= 10 && (
            <text x={p.x.toFixed(1)} y={(H - 5).toFixed(1)} textAnchor="middle" fontSize="8" fill="rgba(148,163,184,0.55)">{p.d.date}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ─── Score distribution chart ─────────────────────────────────────── */
function DistChart({ data }: { data: any[] }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d: any) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-24 mt-2">
      {data.map((b: any, i: number) => {
        const h   = Math.max(4, (b.count / max) * 88);
        const col = b.range.startsWith("91") || b.range.startsWith("76")
          ? "#10b981" : b.range.startsWith("61") ? "#f59e0b"
          : b.range.startsWith("41") ? "#94a3b8" : "#ef4444";
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="font-mono text-[9px] text-slate-400 dark:text-white/30">{b.count > 0 ? b.count : ""}</span>
            <div className="w-full rounded-t" style={{ height:`${h}px`, background: col, opacity: b.count === 0 ? 0.15 : 1 }}/>
            <span className="font-mono text-[7.5px] text-slate-400 dark:text-white/25 text-center leading-tight">{b.range}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Radar chart ───────────────────────────────────────────────────── */
function RadarChart({ data }: { data: any[] }) {
  if (!data?.length || data.every((d: any) => d.score === 0)) return (
    <p className="font-body text-xs text-slate-400 dark:text-white/30 text-center py-6">
      Complete more simulations to unlock dimension analysis.
    </p>
  );
  const sz = 200, cx = sz/2, cy = sz/2, r = 70, n = data.length;
  const ang  = (i: number) => (i/n)*2*Math.PI - Math.PI/2;
  const pt   = (i: number, v: number) => ({ x: cx+(v/100)*r*Math.cos(ang(i)), y: cy+(v/100)*r*Math.sin(ang(i)) });
  const ptR  = (i: number) => ({ x: cx+r*Math.cos(ang(i)), y: cy+r*Math.sin(ang(i)) });
  const poly = (pts:{x:number;y:number}[]) => pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")+" Z";
  const sPts = data.map((d: any, i: number) => pt(i, d.score));
  return (
    <svg viewBox={`0 0 ${sz} ${sz}`} className="w-full max-w-[200px] mx-auto">
      {[25,50,75,100].map(v=>{
        const pts=data.map((_:any,i:number)=>({x:cx+(v/100)*r*Math.cos(ang(i)),y:cy+(v/100)*r*Math.sin(ang(i))}));
        return <path key={v} d={poly(pts)} fill="none" stroke="rgba(148,163,184,0.13)" strokeWidth="1"/>;
      })}
      {data.map((_:any,i:number)=>{const p=ptR(i);return <line key={i} x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke="rgba(148,163,184,0.18)" strokeWidth="1"/>;} )}
      <path d={poly(sPts)} fill="rgba(90,127,46,0.18)" stroke="#5a7f2e" strokeWidth="2"/>
      {sPts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#5a7f2e" stroke="white" strokeWidth="1.5"/>)}
      {data.map((d:any,i:number)=>{
        const lp={x:cx+(1.22*r)*Math.cos(ang(i)),y:cy+(1.22*r)*Math.sin(ang(i))};
        const anchor=lp.x<cx-5?"end":lp.x>cx+5?"start":"middle";
        return <text key={i} x={lp.x.toFixed(1)} y={lp.y.toFixed(1)} textAnchor={anchor} fontSize="8" fill="rgba(100,116,139,0.8)" fontFamily="monospace">{d.dimension}</text>;
      })}
    </svg>
  );
}

/* ═══════════════════════════ MAIN PAGE ════════════════════════════ */
export default function AnalyticsPage() {
  const router = useRouter();

  const [phase,   setPhase]   = useState<"loading"|"error"|"empty"|"ready">("loading");
  const [data,    setData]    = useState<any>(null);
  const [errMsg,  setErrMsg]  = useState("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      /* 1 – Ensure auth store is ready */
      const store = useAuthStore.getState();
      if (!store.hasHydrated) {
        await store.fetchMe();
      }
      /* 2 – Re-read state after potential fetchMe */
      const { isAuthenticated, user } = useAuthStore.getState();
      if (!isAuthenticated || !user) {
        router.replace("/auth/login");
        return;
      }
      /* 3 – Fetch analytics */
      try {
        const res  = await api.get("/analytics/me");
        const body = res.data?.data;
        if (cancelled) return;
        if (!body) { setPhase("error"); setErrMsg("No data returned from server."); return; }
        if (body.empty === true) { setPhase("empty"); return; }
        setData(body);
        setPhase("ready");
      } catch (e: any) {
        if (cancelled) return;
        const msg = e?.response?.data?.message || e?.message || "Failed to fetch analytics.";
        console.error("[Analytics]", msg);
        setErrMsg(msg);
        setPhase("error");
      }
    }

    init();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = () => { setPhase("loading"); setErrMsg(""); setData(null); /* re-mount triggers nothing so we re-call */ init_(); };
  function init_() {
    const store = useAuthStore.getState();
    api.get("/analytics/me")
      .then(res => {
        const body = res.data?.data;
        if (!body)        { setPhase("error"); setErrMsg("No data returned."); return; }
        if (body.empty)   { setPhase("empty"); return; }
        setData(body); setPhase("ready");
      })
      .catch((e: any) => { setErrMsg(e?.response?.data?.message || e?.message || "Fetch failed."); setPhase("error"); });
  }

  /* ── Loading ── */
  if (phase === "loading") return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[rgba(90,127,46,0.10)] border border-[#5a7f2e]/20 flex items-center justify-center mx-auto">
          <Loader2 className="w-6 h-6 text-[#5a7f2e] animate-spin"/>
        </div>
        <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest">Loading analytics…</p>
      </div>
    </div>
  );

  /* ── Error ── */
  if (phase === "error") return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white">
      <AppNavbar/>
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-5">
          <BarChart3 className="w-8 h-8 text-rose-400"/>
        </div>
        <h2 className="font-display font-bold text-xl mb-2">Could not load analytics</h2>
        <p className="font-body text-slate-500 dark:text-white/40 text-sm max-w-xs leading-relaxed mb-2">
          There was a problem fetching your data.
        </p>
        {errMsg && <p className="font-mono text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 mb-5">{errMsg}</p>}
        <button onClick={retry}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5a7f2e] hover:bg-[#4d6e26] text-white font-body font-semibold text-sm transition-all shadow-lg shadow-[#5a7f2e]/20">
          <RotateCcw className="w-4 h-4"/> Retry
        </button>
      </div>
    </div>
  );

  /* ── Empty ── */
  if (phase === "empty") return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white">
      <AppNavbar/>
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[rgba(90,127,46,0.10)] border border-[#5a7f2e]/20 flex items-center justify-center mb-5">
          <BarChart3 className="w-8 h-8 text-[#5a7f2e]"/>
        </div>
        <h2 className="font-display font-bold text-xl mb-2">No analytics yet</h2>
        <p className="font-body text-slate-500 dark:text-white/40 text-sm max-w-xs leading-relaxed mb-6">
          Complete your first simulation to unlock your analytics dashboard.
        </p>
        <Link href="/dashboard"
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5a7f2e] hover:bg-[#4d6e26] text-white font-body font-semibold text-sm transition-all shadow-lg shadow-[#5a7f2e]/20">
          <ArrowRight className="w-4 h-4"/> Go to Simulations
        </Link>
      </div>
    </div>
  );

  /* ── Ready ── */
  const ov        = data.overview;
  const firstName = useAuthStore.getState().user?.name?.split(" ")[0] ?? "there";
  const scoreData = data.scoreOverTime     ?? [];
  const weekData  = data.weeklyData        ?? [];
  const radarData = data.radarData         ?? [];
  const distData  = data.scoreDistribution ?? [];
  const diffData  = data.difficultyData    ?? [];
  const recent    = data.recentSessions    ?? [];

  const trendDir   = ov.trend === "improving" ? "up" : ov.trend === "declining" ? "down" : "flat";
  const TrendIcon  = trendDir === "up" ? TrendingUp : trendDir === "down" ? TrendingDown : Minus;
  const trendColor = trendDir === "up" ? "text-emerald-500" : trendDir === "down" ? "text-rose-500" : "text-slate-400";

  return (
    <>
    <style>{`@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-0 w-[600px] h-[600px] bg-[rgba(90,127,46,0.5)] rounded-full blur-[180px]"/>
      </div>
      <AppNavbar/>

      <main className="relative z-10 w-full px-5 xl:px-10 2xl:px-16 pt-20 sm:pt-24 pb-20">

        {/* Header */}
        <div className="mb-8" style={{ animation:"up 0.4s ease both" }}>
          <h1 className="font-display font-bold text-2xl xl:text-3xl text-slate-900 dark:text-white">My Analytics</h1>
          <p className="font-body text-sm text-slate-500 dark:text-white/40 mt-0.5">Performance breakdown for {firstName}</p>
        </div>

        {/* ── OVERVIEW STAT CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6" style={{ animation:"up 0.4s ease 0.06s both" }}>
          {[
            { icon:Brain,        label:"Total Sessions",  val: ov.total,                                                          col:"text-slate-500 dark:text-white/50" },
            { icon:CheckCircle2, label:"Completed",       val: ov.completed,                                                      col:"text-emerald-500" },
            { icon:BarChart3,    label:"Avg Score",       val: ov.avgScore  > 0 ? `${ov.avgScore}/100`  : "—",                    col:"text-[#5a7f2e]" },
            { icon:Trophy,       label:"Best Score",      val: ov.bestScore > 0 ? `${ov.bestScore}/100` : "—",                    col:"text-amber-400" },
            { icon:Target,       label:"Completion",      val: ov.total     > 0 ? `${ov.completionRate}%` : "—",                  col:"text-cyan-500" },
            { icon:Star,         label:"Percentile",      val: ov.percentile != null ? `Top ${100 - ov.percentile}%` : "—",       col:"text-[#5a7f2e]" },
          ].map(({ icon:Icon, label, val, col }, i) => (
            <div key={i} className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] p-4 shadow-sm flex flex-col gap-2">
              <Icon className={`w-4 h-4 ${col}`}/>
              <p className={`font-display font-bold text-xl leading-none ${col}`}>{val}</p>
              <p className="font-mono text-[9px] text-slate-400 dark:text-white/25 uppercase tracking-wider leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* ── TREND + LINE CHART ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-6" style={{ animation:"up 0.4s ease 0.1s both" }}>
          <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] p-5 shadow-sm flex flex-col justify-between">
            <div>
              <p className="font-mono text-[9px] text-slate-400 dark:text-white/30 uppercase tracking-widest mb-3">Trend</p>
              <div className="flex items-center gap-2 mb-1">
                <TrendIcon className={`w-5 h-5 ${trendColor}`}/>
                <p className={`font-display font-bold text-2xl capitalize ${trendColor}`}>{ov.trend ?? "Neutral"}</p>
              </div>
              {(ov.trendPercent ?? 0) !== 0 && (
                <p className={`font-mono text-xs ${trendColor}`}>{ov.trendPercent > 0 ? "+" : ""}{ov.trendPercent}% vs earlier</p>
              )}
            </div>
            {ov.bestScore > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                <p className="font-mono text-[9px] text-slate-400 dark:text-white/25 uppercase tracking-wider mb-1">Best Grade</p>
                <div className="flex items-center gap-2">
                  <span className={`font-display font-black text-3xl ${universalGrade(ov.bestScore).color}`}>{universalGrade(ov.bestScore).grade}</span>
                  <span className={`font-body text-xs ${universalGrade(ov.bestScore).color}`}>{universalGrade(ov.bestScore).label}</span>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#5a7f2e]"/>
                <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider">Score Over Time</p>
              </div>
              <span className="font-mono text-[9px] text-slate-400 dark:text-white/20">{scoreData.length} simulation{scoreData.length !== 1 ? "s" : ""}</span>
            </div>
            <LineChart data={scoreData}/>
          </div>
        </div>

        {/* ── WEEKLY + DISTRIBUTION ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6" style={{ animation:"up 0.4s ease 0.15s both" }}>
          <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-[#5a7f2e]"/>
              <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider">Weekly Activity (last 8 weeks)</p>
            </div>
            <div className="flex items-end gap-1.5 h-28">
              {weekData.map((w: any, i: number) => {
                const maxC = Math.max(...weekData.map((x: any) => x.count), 1);
                const h    = Math.max(4, (w.count / maxC) * 96);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="font-mono text-[8px] text-slate-400 dark:text-white/25">{w.count > 0 ? w.count : ""}</span>
                    <div className="w-full rounded-t" style={{ height:`${h}px`, background: w.count > 0 ? "#5a7f2e" : "rgba(148,163,184,0.15)" }}/>
                    <span className="font-mono text-[8px] text-slate-400 dark:text-white/20 text-center">{w.week}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-[#5a7f2e]"/>
              <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider">Score Distribution</p>
            </div>
            <DistChart data={distData}/>
          </div>
        </div>

        {/* ── RADAR + DIFFICULTY + RECENT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ animation:"up 0.4s ease 0.2s both" }}>
          <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-[#5a7f2e]"/>
              <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider">Management Dimensions</p>
            </div>
            <RadarChart data={radarData}/>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {radarData.map((d: any, i: number) => (
                <div key={i} className="text-center">
                  <p className={`font-display font-bold text-base ${universalGrade(d.score).color}`}>
                    {d.score > 0 ? d.score : "—"}
                  </p>
                  <p className="font-mono text-[8px] text-slate-400 dark:text-white/25 leading-tight">{d.dimension}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] p-5 shadow-sm flex flex-col gap-5">
            {/* Difficulty */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-[#5a7f2e]"/>
                <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider">By Difficulty</p>
              </div>
              <div className="space-y-3">
                {diffData.map((d: any, i: number) => {
                  const col = d.difficulty === "Easy" ? "#10b981" : d.difficulty === "Intermediate" ? "#f59e0b" : "#ef4444";
                  const bg  = d.difficulty === "Easy"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                    : d.difficulty === "Intermediate"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-500";
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border ${bg}`}>{d.difficulty}</span>
                          <span className="font-mono text-[9px] text-slate-400 dark:text-white/25">{d.count} completed</span>
                        </div>
                        <span className="font-mono text-xs font-bold" style={{ color: col }}>
                          {d.count > 0 ? `${d.avgScore}/100` : "—"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: d.count > 0 ? `${d.avgScore}%` : "0%", background: col }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent sessions */}
            {recent.length > 0 && (
              <div className="border-t border-slate-100 dark:border-white/[0.06] pt-4">
                <p className="font-mono text-[9px] text-slate-400 dark:text-white/30 uppercase tracking-widest mb-3">Recent Simulations</p>
                <div className="space-y-2.5">
                  {recent.map((s: any, i: number) => {
                    const g = universalGrade(Math.round(s.score));
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold bg-slate-100 dark:bg-white/[0.05]"
                          style={{ color: g.hex }}>
                          {Math.round(s.score)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body text-xs font-semibold text-slate-800 dark:text-white truncate">{s.title}</p>
                          <p className="font-mono text-[9px] text-slate-400 dark:text-white/25">{s.date} · {s.difficulty}</p>
                        </div>
                        <span className={`font-mono text-xs font-bold ${g.color}`}>{g.grade}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* In-progress nudge */}
            {ov.completed === 0 && ov.inProgress > 0 && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                <p className="font-body text-xs text-amber-600 dark:text-amber-400">
                  {ov.inProgress} simulation{ov.inProgress !== 1 ? "s" : ""} in progress — complete them to unlock full analytics.
                </p>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
    </>
  );
}