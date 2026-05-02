"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Users, CheckCircle2, Brain,
  Globe, Activity, RefreshCw, Loader2,
  Crown, Target, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList,
} from "recharts";
import api from "@/lib/api";

/* ─── Professional colour palette (muted, works on white) ───────────────── */
const G   = "#5a7f2e";   // brand green — primary
const G_L = "#f0f7ec";   // brand green light tint
const PALETTE = {
  green:   "#5a7f2e",   // brand — primary series
  teal:    "#0f766e",   // teal-700
  blue:    "#1d4ed8",   // blue-700
  amber:   "#b45309",   // amber-700
  rose:    "#be123c",   // rose-700
  slate:   "#475569",   // slate-600 — neutral series
  stone:   "#78716c",   // stone-500
  sky:     "#0369a1",   // sky-700
};
const CHART_GRID = "#f1f5f9";
const CHART_TICK = "#64748b";  // slate-500 — readable on white
const PIE_COLORS = [
  PALETTE.green, PALETTE.teal, PALETTE.blue, PALETTE.amber,
  PALETTE.rose,  PALETTE.slate, PALETTE.sky,  PALETTE.stone,
];

/* ─── Custom tooltip — white, professional ───────────────────────────────── */
const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
      {label && <p className="font-mono text-slate-500 font-semibold mb-2">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-body text-slate-800 font-semibold">
          <span style={{ color: p.color || p.fill }}>{p.name}: </span>
          {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, trend }: any) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all">
      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-slate-600"/>
      </div>
      <p className="font-display font-bold text-3xl text-slate-900 leading-none">{value ?? "—"}</p>
      <p className="font-body text-sm text-slate-600 font-medium mt-1">{label}</p>
      {sub && (
        <p className={`font-mono text-[10px] mt-1 flex items-center gap-1 font-semibold ${
          trend === "up" ? "text-emerald-700" : trend === "down" ? "text-rose-700" : "text-slate-400"
        }`}>
          {trend === "up"   && <ArrowUp   className="w-2.5 h-2.5"/>}
          {trend === "down" && <ArrowDown className="w-2.5 h-2.5"/>}
          {sub}
        </p>
      )}
    </div>
  );
}

/* ─── Chart card ─────────────────────────────────────────────────────────── */
function ChartCard({ title, subtitle, children, className = "" }: any) {
  return (
    <div className={`rounded-2xl bg-white border border-slate-200 p-5 shadow-sm ${className}`}>
      <div className="mb-4">
        <p className="font-body font-bold text-slate-900 text-sm">{title}</p>
        {subtitle && <p className="font-mono text-[10px] text-slate-500 mt-0.5 font-semibold">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ─── Badges ─────────────────────────────────────────────────────────────── */
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="font-mono text-[10px] text-slate-400">—</span>;
  const cls = score >= 75 ? "text-emerald-700" : score >= 55 ? "text-amber-800" : "text-rose-700";
  return <span className={`font-mono text-xs font-bold ${cls}`}>{score}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    COMPLETED:   "text-emerald-700 bg-emerald-50 border-emerald-200",
    IN_PROGRESS: "text-amber-800   bg-amber-50   border-amber-200",
    ABANDONED:   "text-rose-700    bg-rose-50    border-rose-200",
  };
  return (
    <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border font-semibold ${styles[status] || "text-slate-500 bg-slate-100 border-slate-200"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ─── Retention heat colour — muted, professional ───────────────────────── */
function retentionColor(pct: number) {
  if (pct >= 60) return "bg-emerald-100 text-emerald-800 font-bold";
  if (pct >= 40) return "bg-emerald-50 text-emerald-700 font-semibold";
  if (pct >= 20) return "bg-amber-50 text-amber-800 font-semibold";
  if (pct > 0)   return "bg-rose-50 text-rose-700";
  return "bg-slate-50 text-slate-400";
}

/* ─── Score bar colours — green=high, amber=mid, rose=low ───────────────── */
const SCORE_COLORS = [
  PALETTE.rose, PALETTE.rose, PALETTE.rose,
  PALETTE.amber, PALETTE.amber, PALETTE.amber,
  PALETTE.green, PALETTE.green, PALETTE.green, PALETTE.green,
];

/* ─── MAIN PAGE ──────────────────────────────────────────────────────────── */
export default function AdminAnalyticsPage() {
  const [data,        setData]        = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeTab,   setActiveTab]   = useState<"overview" | "users" | "simulations" | "retention">("overview");

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await api.get("/admin/analytics");
      setData(res.data.data);
      setLastRefresh(new Date());
    } catch { /* keep stale data */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(false), 60000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-3">
        <Loader2 className="w-7 h-7 animate-spin mx-auto" style={{ color: G }}/>
        <p className="font-mono text-[11px] text-slate-500 font-semibold">Loading analytics…</p>
      </div>
    </div>
  );

  const ov = data?.overview || {};

  /* Shared axis props */
  const tickStyle = { fill: CHART_TICK, fontSize: 11, fontFamily: "ui-monospace, monospace" };
  const gridProps = { strokeDasharray: "3 3", stroke: CHART_GRID };
  const legendStyle = { fontSize: 11, fontFamily: "ui-monospace, monospace", color: CHART_TICK };

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: G }}>Insights</p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">Analytics</h1>
          <p className="font-body text-sm text-slate-500 mt-1">
            Last updated {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-body text-sm font-semibold transition-all disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}/>Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1.5 mb-8 w-fit flex-wrap">
        {(["overview", "users", "simulations", "retention"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl font-body text-sm font-semibold capitalize transition-all ${
              activeTab === tab ? "text-white shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
            style={activeTab === tab ? { background: G } : {}}>
            {tab}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW ─────────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            <StatCard label="Total Users"    value={ov.totalUsers}          icon={Users}        sub="registered accounts"/>
            <StatCard label="Active (7d)"    value={ov.activeUsers7d}       icon={Activity}     sub="last 7 days" trend="up"/>
            <StatCard label="Premium Users"  value={ov.premiumUsers}        icon={Crown}        sub="paid accounts"/>
            <StatCard label="Completion Rate"value={`${ov.completionRate}%`}icon={CheckCircle2} sub="sessions finished"/>
            <StatCard label="Avg Score"      value={ov.avgScore || "—"}     icon={Target}       sub="out of 100"/>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <ChartCard title="Daily Signups" subtitle="New registrations — last 30 days">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data?.dailySignups} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSignup" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={G} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={G} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps}/>
                  <XAxis dataKey="date" tick={tickStyle} tickLine={false} interval={4}/>
                  <YAxis tick={tickStyle} tickLine={false} axisLine={false}/>
                  <Tooltip content={<Tip/>}/>
                  <Area type="monotone" dataKey="signups" name="Signups" stroke={G} strokeWidth={2} fill="url(#gSignup)"/>
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Daily Sessions" subtitle="Started vs completed — last 30 days">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.dailySessions} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid {...gridProps}/>
                  <XAxis dataKey="date" tick={tickStyle} tickLine={false} interval={4}/>
                  <YAxis tick={tickStyle} tickLine={false} axisLine={false}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend wrapperStyle={legendStyle}/>
                  <Bar dataKey="started"   name="Started"   fill={PALETTE.slate}  radius={[3,3,0,0]}/>
                  <Bar dataKey="completed" name="Completed" fill={G}              radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <ChartCard title="Cumulative User Growth" subtitle="Total registered users over time">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data?.cumulativeSignups} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gCumul" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={PALETTE.teal} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={PALETTE.teal} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps}/>
                  <XAxis dataKey="date" tick={tickStyle} tickLine={false} interval={4}/>
                  <YAxis tick={tickStyle} tickLine={false} axisLine={false}/>
                  <Tooltip content={<Tip/>}/>
                  <Area type="monotone" dataKey="total" name="Total Users" stroke={PALETTE.teal} strokeWidth={2} fill="url(#gCumul)"/>
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Weekly Active Users" subtitle="Unique users who ran a simulation each week">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data?.weeklyActive} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid {...gridProps}/>
                  <XAxis dataKey="week" tick={tickStyle} tickLine={false}/>
                  <YAxis tick={tickStyle} tickLine={false} axisLine={false}/>
                  <Tooltip content={<Tip/>}/>
                  <Line type="monotone" dataKey="activeUsers" name="Active Users" stroke={PALETTE.blue} strokeWidth={2.5} dot={{ fill: PALETTE.blue, r: 3 }}/>
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <ChartCard title="Plan Distribution" subtitle="Free vs Premium users">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data?.planDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {data?.planDistribution?.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]}/>
                    ))}
                  </Pie>
                  <Tooltip content={<Tip/>}/>
                  <Legend wrapperStyle={legendStyle}/>
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Users by Domain" subtitle="How students are distributed across tracks">
              {(data?.domainDistribution?.length || 0) === 0 ? (
                <div className="h-48 flex items-center justify-center">
                  <p className="font-body text-sm text-slate-400">No domain selections yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data?.domainDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="users" nameKey="name" paddingAngle={2}>
                      {data?.domainDistribution?.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]}/>
                      ))}
                    </Pie>
                    <Tooltip content={<Tip/>}/>
                    <Legend wrapperStyle={legendStyle}/>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Score Distribution" subtitle="How students score across all simulations">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.scoreDistribution} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid {...gridProps}/>
                  <XAxis dataKey="range" tick={{ ...tickStyle, fontSize: 9 }} tickLine={false}/>
                  <YAxis tick={tickStyle} tickLine={false} axisLine={false}/>
                  <Tooltip content={<Tip/>}/>
                  <Bar dataKey="count" name="Students" radius={[3,3,0,0]}>
                    {data?.scoreDistribution?.map((_: any, i: number) => (
                      <Cell key={i} fill={SCORE_COLORS[i] || PALETTE.slate}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="User Journey Funnel" subtitle="How many users complete each step of the platform">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.funnelData} layout="vertical" margin={{ top: 0, right: 60, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false}/>
                <XAxis type="number" tick={tickStyle} tickLine={false} axisLine={false}/>
                <YAxis dataKey="stage" type="category" tick={{ ...tickStyle, fontSize: 11 }} tickLine={false} axisLine={false} width={110}/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="count" name="Users" fill={G} radius={[0,4,4,0]}>
                  <LabelList dataKey="count" position="right" style={{ fill: CHART_TICK, fontSize: 11, fontFamily: "ui-monospace, monospace", fontWeight: 600 }}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Recent Activity" subtitle="Last 20 simulation sessions">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200">
                    {["Student","Simulation","Status","Score","When"].map(h => (
                      <th key={h} className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.recentActivity || []).map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-4">
                        <p className="font-body text-sm font-semibold text-slate-900">{r.userName}</p>
                        <p className="font-mono text-[10px] text-slate-400">{r.userEmail}</p>
                      </td>
                      <td className="py-2.5 pr-4">
                        <p className="font-body text-sm text-slate-700 truncate max-w-[160px]">{r.simTitle}</p>
                      </td>
                      <td className="py-2.5 pr-4"><StatusBadge status={r.status}/></td>
                      <td className="py-2.5 pr-4"><ScoreBadge score={r.score}/></td>
                      <td className="py-2.5 font-mono text-[10px] text-slate-400">{timeAgo(r.createdAt)}</td>
                    </tr>
                  ))}
                  {!data?.recentActivity?.length && (
                    <tr><td colSpan={5} className="py-8 text-center font-body text-sm text-slate-400">No activity yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      )}

      {/* ─── USERS ──────────────────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Users" value={ov.totalUsers}    icon={Users}        sub="registered"/>
            <StatCard label="Verified"    value={ov.verifiedUsers} icon={CheckCircle2} sub="email verified"/>
            <StatCard label="Premium"     value={ov.premiumUsers}  icon={Crown}        sub="paid accounts"/>
            <StatCard label="Active (7d)" value={ov.activeUsers7d} icon={Activity}     sub="last 7 days" trend="up"/>
          </div>

          <ChartCard title="Users per Domain" subtitle="Which tracks students are choosing">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.domainDistribution} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid {...gridProps}/>
                <XAxis dataKey="name" tick={{ ...tickStyle, fontSize: 11 }} tickLine={false}/>
                <YAxis tick={tickStyle} tickLine={false} axisLine={false}/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="users" name="Users" radius={[4,4,0,0]}>
                  {data?.domainDistribution?.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Signup Trend" subtitle="Daily new registrations — last 30 days">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.dailySignups} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gS2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PALETTE.blue} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={PALETTE.blue} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps}/>
                <XAxis dataKey="date" tick={tickStyle} tickLine={false} interval={4}/>
                <YAxis tick={tickStyle} tickLine={false} axisLine={false}/>
                <Tooltip content={<Tip/>}/>
                <Area type="monotone" dataKey="signups" name="New Users" stroke={PALETTE.blue} strokeWidth={2} fill="url(#gS2)"/>
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top Performers" subtitle="Students ranked by average score">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200">
                    {["#","Student","Domain","Attempts","Best","Avg Score"].map(h => (
                      <th key={h} className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-3 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.topPerformers || []).map((p: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-4">
                        <span className={`font-mono text-xs font-bold ${
                          i === 0 ? "text-amber-700" : i === 1 ? "text-slate-500" : i === 2 ? "text-amber-700" : "text-slate-400"
                        }`}>{i + 1}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <p className="font-body text-sm font-semibold text-slate-900">{p.name}</p>
                        <p className="font-mono text-[10px] text-slate-400">{p.email}</p>
                      </td>
                      <td className="py-2.5 pr-4 font-body text-sm text-slate-600 font-medium">{p.domain}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-600 font-semibold">{p.attempts}</td>
                      <td className="py-2.5 pr-4"><ScoreBadge score={p.bestScore}/></td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${p.avgScore}%`, background: G }}/>
                          </div>
                          <ScoreBadge score={p.avgScore}/>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!data?.topPerformers?.length && (
                    <tr><td colSpan={6} className="py-8 text-center font-body text-sm text-slate-400">No scores recorded yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      )}

      {/* ─── SIMULATIONS ────────────────────────────────────────────────────── */}
      {activeTab === "simulations" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Simulations"    value={ov.totalSimulations}  icon={Brain}        sub="published"/>
            <StatCard label="Total Sessions" value={ov.totalSessions}     icon={Activity}     sub="started"/>
            <StatCard label="Completed"      value={ov.completedSessions} icon={CheckCircle2} sub="finished"/>
            <StatCard label="Avg Score"      value={ov.avgScore || "—"}   icon={Target}       sub="out of 100"/>
          </div>

          {(data?.simStats?.length || 0) > 0 && (
            <ChartCard title="Completion Rate by Simulation" subtitle="% of students who finish each simulation">
              <ResponsiveContainer width="100%" height={Math.max(200, (data?.simStats?.length || 1) * 48)}>
                <BarChart data={data?.simStats} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false}/>
                  <XAxis type="number" domain={[0,100]} unit="%" tick={tickStyle} tickLine={false} axisLine={false}/>
                  <YAxis dataKey="title" type="category" tick={{ ...tickStyle, fontSize: 11 }} tickLine={false} axisLine={false} width={160}/>
                  <Tooltip content={<Tip/>}/>
                  <Bar dataKey="completionRate" name="Completion %" radius={[0,4,4,0]}>
                    {data?.simStats?.map((s: any, i: number) => (
                      <Cell key={i} fill={s.completionRate >= 60 ? G : s.completionRate >= 30 ? PALETTE.amber : PALETTE.rose}/>
                    ))}
                    <LabelList dataKey="completionRate" position="right" formatter={(v: any) => `${v}%`}
                      style={{ fill: CHART_TICK, fontSize: 11, fontFamily: "ui-monospace, monospace", fontWeight: 600 }}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          <ChartCard title="Score Distribution" subtitle="Histogram of all student scores (0–100)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data?.scoreDistribution} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid {...gridProps}/>
                <XAxis dataKey="range" tick={tickStyle} tickLine={false}/>
                <YAxis tick={tickStyle} tickLine={false} axisLine={false}/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="count" name="Students" radius={[4,4,0,0]}>
                  {data?.scoreDistribution?.map((_: any, i: number) => (
                    <Cell key={i} fill={SCORE_COLORS[i] || PALETTE.slate}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {(data?.simStats?.length || 0) > 0 && (
            <ChartCard title="Simulation Performance Table" subtitle="Detailed stats per simulation">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200">
                      {["Simulation","Difficulty","Started","Completed","Completion %","Avg Score"].map(h => (
                        <th key={h} className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-3 pr-4 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.simStats?.map((s: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 pr-4 font-body text-sm font-semibold text-slate-900 max-w-[200px] truncate">{s.fullTitle}</td>
                        <td className="py-2.5 pr-4">
                          <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border font-semibold ${
                            s.difficulty === "ADVANCED" ? "text-rose-700 bg-rose-50 border-rose-200" :
                            s.difficulty === "BEGINNER" ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                            "text-amber-800 bg-amber-50 border-amber-200"
                          }`}>{s.difficulty}</span>
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-700 font-semibold">{s.started}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-700 font-semibold">{s.completed}</td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${s.completionRate}%`, background: s.completionRate >= 60 ? G : s.completionRate >= 30 ? PALETTE.amber : PALETTE.rose }}/>
                            </div>
                            <span className="font-mono text-xs text-slate-700 font-semibold">{s.completionRate}%</span>
                          </div>
                        </td>
                        <td className="py-2.5"><ScoreBadge score={s.avgScore}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}

          {(data?.simStats?.length || 0) === 0 && (
            <div className="rounded-2xl bg-white border border-slate-200 p-16 text-center shadow-sm">
              <Brain className="w-10 h-10 text-slate-300 mx-auto mb-3"/>
              <p className="font-body text-slate-500 font-medium">No simulation data yet</p>
              <p className="font-mono text-xs text-slate-400 mt-1">Publish simulations and wait for students to start playing</p>
            </div>
          )}
        </div>
      )}

      {/* ─── RETENTION ──────────────────────────────────────────────────────── */}
      {activeTab === "retention" && (
        <div className="space-y-6">

          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <p className="font-mono text-[10px] text-amber-800 font-bold uppercase tracking-wider mb-1">How to read this</p>
            <p className="font-body text-sm text-amber-900 leading-relaxed">
              Each row is a cohort of users who signed up that week. W0 = their signup week (always ~100%). W1–W4 = % who came back and ran a simulation in subsequent weeks. Darker = better retention.
            </p>
          </div>

          <ChartCard title="Weekly Retention Cohort" subtitle="% of each signup cohort that remained active week-over-week">
            {(data?.cohortData?.length || 0) === 0 ? (
              <div className="py-12 text-center">
                <p className="font-body text-sm text-slate-500">Not enough data for cohort analysis yet</p>
                <p className="font-mono text-xs text-slate-400 mt-1">Needs users and session history across multiple weeks</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[480px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-3 pr-4 w-32">Cohort</th>
                      <th className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-3 pr-4">Size</th>
                      {["W0","W1","W2","W3","W4"].map(w => (
                        <th key={w} className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider pb-3 pr-2">{w}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.cohortData?.map((cohort: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 pr-4 font-mono text-[11px] text-slate-700 font-semibold w-32">{cohort.cohort}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-500 font-semibold">{cohort.size}</td>
                        {cohort.weeks.map((w: any, wi: number) => (
                          <td key={wi} className="py-2 pr-2">
                            <div className={`w-14 h-8 rounded-lg flex items-center justify-center ${retentionColor(w.retained)}`}>
                              <span className="font-mono text-[11px]">{w.retained > 0 ? `${w.retained}%` : "—"}</span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Weekly Active Users (WAU)" subtitle="Unique students who ran at least one simulation per week">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data?.weeklyActive} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gWau" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={PALETTE.teal} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={PALETTE.teal} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridProps}/>
                <XAxis dataKey="week" tick={tickStyle} tickLine={false}/>
                <YAxis tick={tickStyle} tickLine={false} axisLine={false}/>
                <Tooltip content={<Tip/>}/>
                <Area type="monotone" dataKey="activeUsers" name="Active Users" stroke={PALETTE.teal} strokeWidth={2.5} fill="url(#gWau)" dot={{ fill: PALETTE.teal, r: 3 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Session Completion Over Time" subtitle="Started vs completed simulations — daily, last 30 days">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data?.dailySessions} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid {...gridProps}/>
                <XAxis dataKey="date" tick={tickStyle} tickLine={false} interval={4}/>
                <YAxis tick={tickStyle} tickLine={false} axisLine={false}/>
                <Tooltip content={<Tip/>}/>
                <Legend wrapperStyle={legendStyle}/>
                <Bar dataKey="started"   name="Started"   fill={PALETTE.slate} radius={[3,3,0,0]}/>
                <Bar dataKey="completed" name="Completed" fill={G}             radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      )}
    </div>
  );
}