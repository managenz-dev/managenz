"use client";
import { useEffect, useState } from "react";
import {
  Loader2, Search, Users, Crown, CheckCircle2, Clock,
  ChevronDown, ChevronUp,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const G = "#5a7f2e";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "PREMIUM") {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded-full border font-semibold text-amber-800 bg-amber-50 border-amber-200">
        <Crown className="w-2.5 h-2.5"/>PREMIUM
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded-full border font-semibold text-slate-500 bg-slate-100 border-slate-200">
      FREE
    </span>
  );
}

function StatusBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded-full border font-semibold text-emerald-700 bg-emerald-50 border-emerald-200">
        <CheckCircle2 className="w-2.5 h-2.5"/>Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded-full border font-semibold text-amber-800 bg-amber-50 border-amber-200">
      <Clock className="w-2.5 h-2.5"/>Unverified
    </span>
  );
}

export default function AdminUsersPage() {
  const [loading,   setLoading]   = useState(true);
  const [users,     setUsers]     = useState<any[]>([]);
  const [query,     setQuery]     = useState("");
  const [sortKey,   setSortKey]   = useState<string>("createdAt");
  const [sortAsc,   setSortAsc]   = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data.data || []);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  };

  const handleUpgrade = async (userId: string, current: string) => {
    const action = current === "PREMIUM" ? "downgrade to Free" : "upgrade to Premium";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this user?`)) return;
    setUpgrading(userId);
    try {
      const res = await api.patch(`/admin/users/${userId}/upgrade`);
      setUsers(u => u.map(x => x.id === userId ? { ...x, plan: res.data.data.plan } : x));
      toast.success(`User ${res.data.data.plan === "PREMIUM" ? "upgraded to Premium" : "downgraded to Free"}`);
    } catch (err: any) { toast.error(err?.response?.data?.message || "Failed to update plan"); }
    finally { setUpgrading(null); }
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const filtered = users
    .filter(u => {
      const q = query.toLowerCase();
      return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.domain?.name?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === "domain") { va = a.domain?.name || ""; vb = b.domain?.name || ""; }
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

  const stats = {
    total:    users.length,
    premium:  users.filter(u => u.plan === "PREMIUM").length,
    verified: users.filter(u => u.isVerified).length,
  };

  function SortIcon({ k }: { k: string }) {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 text-slate-400"/>;
    return sortAsc
      ? <ChevronUp className="w-3 h-3 text-slate-700"/>
      : <ChevronDown className="w-3 h-3 text-slate-700"/>;
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: G }}/>
    </div>
  );

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>

      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: G }}>People</p>
        <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">Users</h1>
        <p className="font-body text-sm text-slate-500 mt-1">
          {stats.total} registered · {stats.premium} premium · {stats.verified} verified
        </p>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Users",  value: stats.total    },
          { label: "Premium",      value: stats.premium  },
          { label: "Verified",     value: stats.verified },
        ].map(s => (
          <div key={s.label} className="rounded-2xl bg-white border border-slate-200 p-4">
            <p className="font-display font-bold text-2xl text-slate-900">{s.value}</p>
            <p className="font-mono text-[10px] text-slate-500 font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search by name, email, or domain…"
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"/>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
          {[
            { label: "User",    key: "name",       span: "col-span-4" },
            { label: "Domain",  key: "domain",     span: "col-span-2 hidden sm:block" },
            { label: "Plan",    key: "plan",       span: "col-span-2" },
            { label: "Status",  key: "isVerified", span: "col-span-2 hidden md:block" },
            { label: "Joined",  key: "createdAt",  span: "col-span-1 hidden lg:block" },
            { label: "",        key: "",           span: "col-span-1" },
          ].map(col => (
            <button key={col.key} onClick={() => col.key && toggleSort(col.key)}
              className={`${col.span} flex items-center gap-1 font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider hover:text-slate-800 transition-colors text-left`}>
              {col.label} {col.key && <SortIcon k={col.key}/>}
            </button>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
            <p className="font-body text-slate-500 font-medium">{query ? "No users match your search" : "No users yet"}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(u => (
              <div key={u.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center hover:bg-slate-50 transition-colors">
                {/* Name + email */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${G}15`, border: `1.5px solid ${G}35` }}>
                    <span className="font-mono text-[11px] font-bold" style={{ color: G }}>
                      {u.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-body text-sm font-semibold text-slate-900 truncate">{u.name || "—"}</p>
                    <p className="font-mono text-[10px] text-slate-400 truncate">{u.email}</p>
                  </div>
                </div>

                {/* Domain */}
                <div className="col-span-2 hidden sm:block">
                  {u.domain
                    ? <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 font-semibold">{u.domain.name}</span>
                    : <span className="font-mono text-[10px] text-slate-300">—</span>
                  }
                </div>

                {/* Plan */}
                <div className="col-span-2"><PlanBadge plan={u.plan || "FREE"}/></div>

                {/* Status */}
                <div className="col-span-2 hidden md:block"><StatusBadge verified={u.isVerified}/></div>

                {/* Joined */}
                <div className="col-span-1 hidden lg:block">
                  <span className="font-mono text-[10px] text-slate-400">{u.createdAt ? formatDate(u.createdAt) : "—"}</span>
                </div>

                {/* Action */}
                <div className="col-span-1 flex justify-end">
                  <button onClick={() => handleUpgrade(u.id, u.plan || "FREE")} disabled={upgrading === u.id}
                    className={`p-1.5 rounded-lg border font-body text-[10px] transition-all disabled:opacity-40
                      ${(u.plan || "FREE") === "PREMIUM"
                        ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700"
                        : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-800"
                      }`}
                    title={(u.plan || "FREE") === "PREMIUM" ? "Remove Premium" : "Grant Premium"}>
                    {upgrading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Crown className="w-3.5 h-3.5"/>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="font-mono text-[10px] text-slate-400 text-right mt-3 font-semibold">
          {filtered.length} of {users.length} users
        </p>
      )}
    </div>
  );
}