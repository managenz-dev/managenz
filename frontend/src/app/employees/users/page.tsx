"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Users, Loader2, ChevronRight,
  Crown, BookOpen, TrendingUp,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const G = "#5a7f2e";

export default function EmpUsersPage() {
  const [users,   setUsers]   = useState<any[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [filters, setFilters] = useState({ search: "", userType: "", plan: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.search)   p.set("search",   filters.search);
      if (filters.userType) p.set("userType",  filters.userType);
      if (filters.plan)     p.set("plan",      filters.plan);
      p.set("page", String(page));
      const res = await api.get(`/emp/users?${p}`);
      setUsers(res.data.data.users);
      setTotal(res.data.data.total);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="p-6 xl:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500 mt-0.5">{total} registered students</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search name or email…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none bg-white"/>
        </div>
        <select value={filters.userType} onChange={e => setFilters(f => ({ ...f, userType: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none">
          <option value="">All Types</option>
          <option value="STUDENT_EXPLORER">Student Explorer</option>
          <option value="PLACEMENT_PREP">Placement Prep</option>
          <option value="JUNIOR_PROFESSIONAL">Junior Professional</option>
        </select>
        <select value={filters.plan} onChange={e => setFilters(f => ({ ...f, plan: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none">
          <option value="">All Plans</option>
          <option value="FREE">Free</option>
          <option value="PREMIUM">Premium</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: G }}/>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-3"/>
            <p className="text-sm text-slate-500">No users found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
              {["User", "Domain", "Type", "Plan", ""].map(h => (
                <p key={h} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{h}</p>
              ))}
            </div>
            {users.map(u => (
              <div key={u.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{u.fullName}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{u.email}</p>
                </div>
                <p className="text-xs text-slate-600 truncate">{u.selectedDomain?.name || "—"}</p>
                <p className="text-xs text-slate-500 font-mono">{u.userType || "—"}</p>
                <div className="flex items-center gap-1">
                  {u.plan === "PREMIUM"
                    ? <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold">
                        <Crown className="w-2.5 h-2.5"/> PREMIUM
                      </span>
                    : <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">FREE</span>
                  }
                </div>
                <Link href={`/emp/users/${u.id}`}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-700 transition-all">
                  <ChevronRight className="w-3.5 h-3.5"/>
                </Link>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">Page {page} of {totalPages} · {total} users</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Previous</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}