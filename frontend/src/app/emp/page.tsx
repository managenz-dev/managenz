"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText, Users, CheckCircle2, Clock,
  PlusCircle, ArrowRight, Loader2, TrendingUp,
  UserCheck, Globe, AlertTriangle,
} from "lucide-react";
import api from "@/lib/api";

const G = "#5a7f2e";

interface Stats {
  totalUsers:          number;
  totalSimulations:    number;
  pendingApproval:     number;
  approvedSims:        number;
  activeSubscriptions: number;
  totalEmployees:      number;
}

interface Simulation {
  id: string; title: string; status: string;
  difficultyLevel: string;
  domain: { name: string; colorHex: string };
  createdAt: string;
  _count: { decisions: number };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT:     "bg-slate-100 text-slate-600",
    SUBMITTED: "bg-amber-50 text-amber-700 border border-amber-200",
    APPROVED:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
    REJECTED:  "bg-rose-50 text-rose-700 border border-rose-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono uppercase tracking-wider ${map[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, href }: any) {
  const content = (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-600"/>
        </div>
        {href && <ArrowRight className="w-3.5 h-3.5 text-slate-400"/>}
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-0.5" style={{ color: G }}>{value ?? "—"}</p>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export default function EmpDashboardPage() {
  const router = useRouter();
  const [emp,    setEmp]    = useState<any>(null);
  const [stats,  setStats]  = useState<Stats | null>(null);
  const [sims,   setSims]   = useState<Simulation[]>([]);
  const [loading,setLoading]= useState(true);

  const isAdmin = emp?.role === "ADMIN";

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await api.get("/emp/me");
        const me    = meRes.data.data;
        setEmp(me);

        const [simsRes] = await Promise.allSettled([
          api.get("/emp/simulations?limit=8"),
          me.role === "ADMIN" ? api.get("/emp/stats") : Promise.resolve(null),
        ]);

        if (simsRes.status === "fulfilled") setSims(simsRes.value.data.data.simulations);
        if (me.role === "ADMIN") {
          const sRes = await api.get("/emp/stats").catch(() => null);
          if (sRes) setStats(sRes.data.data);
        }
      } catch { router.replace("/emp/login"); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: G }}/>
    </div>
  );

  return (
    <div className="p-6 xl:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {isAdmin ? "Admin Dashboard" : "My Studio"}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Welcome back, {emp?.name}. {isAdmin ? "Full system overview." : "Manage your simulations."}
        </p>
      </div>

      {/* Admin stats */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
          <StatCard icon={Users}        label="Total Users"      value={stats.totalUsers}          href="/emp/users"/>
          <StatCard icon={FileText}     label="Simulations"      value={stats.totalSimulations}     href="/emp/simulations"/>
          <StatCard icon={Clock}        label="Pending Review"   value={stats.pendingApproval}      href="/emp/simulations?status=SUBMITTED"/>
          <StatCard icon={CheckCircle2} label="Approved"         value={stats.approvedSims}         href="/emp/simulations?status=APPROVED"/>
          <StatCard icon={TrendingUp}   label="Subscriptions"    value={stats.activeSubscriptions}/>
          <StatCard icon={UserCheck}    label="Employees"        value={stats.totalEmployees}       href="/emp/employees"/>
        </div>
      )}

      {/* Pending approval banner for admin */}
      {isAdmin && stats && stats.pendingApproval > 0 && (
        <div className="mb-6 rounded-2xl p-4 flex items-center gap-3 border"
          style={{ background: `${G}08`, borderColor: `${G}30` }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: G }}/>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {stats.pendingApproval} simulation{stats.pendingApproval !== 1 ? "s" : ""} awaiting your review
            </p>
            <p className="text-xs text-slate-500">Submitted by content developers — review and approve or reject</p>
          </div>
          <Link href="/emp/simulations?status=SUBMITTED"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
            style={{ background: G }}>
            Review Now
          </Link>
        </div>
      )}

      {/* Simulations table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">
            {isAdmin ? "Recent Simulations" : "My Simulations"}
          </h2>
          <Link href="/emp/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all"
            style={{ background: G }}>
            <PlusCircle className="w-3.5 h-3.5"/> New Simulation
          </Link>
        </div>

        {sims.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3"/>
            <p className="text-sm text-slate-500 font-medium">No simulations yet</p>
            <p className="text-xs text-slate-400 mt-1">Create your first simulation to get started</p>
            <Link href="/emp/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: G }}>
              <PlusCircle className="w-4 h-4"/> Create Simulation
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sims.map(sim => (
              <div key={sim.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: sim.domain?.colorHex || G }}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{sim.title}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {sim.domain?.name} · {sim._count?.decisions || 0} decisions · {sim.difficultyLevel}
                  </p>
                </div>
                <StatusBadge status={sim.status}/>
                <Link href={`/emp/simulations/${sim.id}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all">
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}

        {sims.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100">
            <Link href="/emp/simulations"
              className="text-xs font-semibold flex items-center gap-1"
              style={{ color: G }}>
              View all simulations <ArrowRight className="w-3 h-3"/>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}