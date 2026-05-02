"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Globe, BookOpen, Users, CheckCircle2,
  ChevronRight, Loader2, Brain, ArrowRight, Zap,
} from "lucide-react";
import api from "@/lib/api";

const G = "#5a7f2e";

/* ─── Stat card ──────────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, sub, href }: any) {
  const Tag = href ? Link : "div";
  return (
    <Tag href={href || ""}
      className="relative rounded-2xl bg-white border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all group overflow-hidden">
      <div className="relative">
        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
          <Icon className="w-4 h-4 text-slate-600"/>
        </div>
        <p className="font-display font-bold text-3xl text-slate-900 mb-0.5">{value ?? "—"}</p>
        <p className="font-body text-sm text-slate-600 font-medium">{label}</p>
        {sub && <p className="font-mono text-[10px] text-slate-400 mt-1">{sub}</p>}
        {href && (
          <ChevronRight className="absolute top-0 right-0 w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all"/>
        )}
      </div>
    </Tag>
  );
}

function QuickAction({ href, icon: Icon, label, sub }: any) {
  return (
    <Link href={href}
      className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group">
      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-slate-600"/>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-semibold text-slate-900">{label}</p>
        <p className="font-mono text-[10px] text-slate-400 mt-0.5">{sub}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all flex-shrink-0"/>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState<any>(null);
  const [domains, setDomains] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [statsRes, domainsRes] = await Promise.allSettled([
        api.get("/admin/stats"),
        api.get("/admin/domains"),
      ]);
      if (statsRes.status  === "fulfilled") setStats(statsRes.value.data.data);
      if (domainsRes.status === "fulfilled") setDomains(domainsRes.value.data.data || []);
    } finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: G }}/>
    </div>
  );

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>

      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: G }}>Overview</p>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">Admin Dashboard</h1>
        <p className="font-body text-sm text-slate-500 mt-1">Manage domains, simulations, and students</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <StatCard label="Total Users"        value={stats?.totalUsers}    icon={Users}        sub="registered accounts" href="/admin/users"/>
        <StatCard label="Domains"            value={stats?.totalDomains}  icon={Globe}        sub="management tracks"   href="/admin/domains"/>
        <StatCard label="Simulations"        value={stats?.totalUseCases} icon={Brain}        sub="across all domains"  href="/admin/domains"/>
        <StatCard label="Completed Sessions" value={stats?.totalSessions} icon={CheckCircle2} sub="total completions"/>
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Domains list */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider">Domains</p>
            <Link href="/admin/domains"
              className="font-body text-xs font-semibold flex items-center gap-1 transition-colors"
              style={{ color: G }}>
              Manage all <ChevronRight className="w-3.5 h-3.5"/>
            </Link>
          </div>
          <div className="space-y-2">
            {domains.length === 0 && (
              <div className="rounded-xl bg-white border border-slate-200 p-6 text-center">
                <p className="font-body text-sm text-slate-500">No domains yet</p>
                <Link href="/admin/domains"
                  className="font-body text-xs mt-2 inline-block font-semibold"
                  style={{ color: G }}>
                  Create your first domain →
                </Link>
              </div>
            )}
            {domains.map((d: any) => (
              <Link key={d.id} href={`/admin/domains/${d.id}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${d.colorHex}15`, border: `1.5px solid ${d.colorHex}35` }}>
                  <Globe className="w-4 h-4" style={{ color: d.colorHex }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-semibold text-slate-900 truncate">{d.name}</p>
                  <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                    {d._count?.useCases || 0} simulation{(d._count?.useCases || 0) !== 1 ? "s" : ""} · {d.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border font-semibold ${
                    d.isActive
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : "text-slate-500 bg-slate-100 border-slate-200"
                  }`}>
                    {d.isActive ? "Active" : "Inactive"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors"/>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <p className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</p>
          <div className="space-y-2">
            <QuickAction href="/admin/domains" icon={Globe}    label="Manage Domains"  sub="Create and edit domains"/>
            <QuickAction href="/admin/users"   icon={Users}    label="Manage Users"    sub="View and upgrade accounts"/>
            <QuickAction href="/admin/domains" icon={Brain}    label="Add Simulation"  sub="Go to a domain to add simulations"/>
          </div>

          <div className="mt-4 rounded-xl p-4 border" style={{ background: `${G}08`, borderColor: `${G}25` }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5" style={{ color: G }}/>
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: G }}>Platform</p>
            </div>
            <p className="font-body text-xs text-slate-600 leading-relaxed">
              ManaGenz Academy — simulation-based management training. Build simulations, manage students, and track outcomes from this panel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}