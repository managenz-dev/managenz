"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search, Filter, Plus, CheckCircle2, XCircle, Trash2,
  Eye, RotateCcw, Loader2, FileText, Clock, ChevronDown,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const G = "#5a7f2e";
const STATUSES = ["", "DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];
const DIFFICULTIES = ["", "FOUNDATIONAL", "INTERMEDIATE", "ADVANCED"];

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    DRAFT:     "bg-slate-100 text-slate-600",
    SUBMITTED: "bg-amber-50 text-amber-700 border border-amber-200",
    APPROVED:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
    REJECTED:  "bg-rose-50 text-rose-700 border border-rose-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono uppercase tracking-wider ${map[s] || "bg-slate-100 text-slate-500"}`}>
      {s}
    </span>
  );
}

export default function EmpSimulationsPage() {
  const searchParams = useSearchParams();
  const [emp,    setEmp]    = useState<any>(null);
  const [sims,   setSims]   = useState<any[]>([]);
  const [total,  setTotal]  = useState(0);
  const [domains,setDomains]= useState<any[]>([]);
  const [loading,setLoading]= useState(true);
  const [actingOn,setActingOn]= useState<string | null>(null);

  const [filters, setFilters] = useState({
    status:     searchParams.get("status") || "",
    domainId:   "",
    difficulty: "",
    search:     "",
  });
  const [page, setPage] = useState(1);

  const isAdmin = emp?.role === "ADMIN";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status)     params.set("status",     filters.status);
      if (filters.domainId)   params.set("domainId",   filters.domainId);
      if (filters.difficulty) params.set("difficulty", filters.difficulty);
      if (filters.search)     params.set("search",     filters.search);
      params.set("page",  String(page));
      params.set("limit", "20");
      const res = await api.get(`/emp/simulations?${params}`);
      setSims(res.data.data.simulations);
      setTotal(res.data.data.total);
    } catch { toast.error("Failed to load simulations"); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => {
    api.get("/emp/me").then(r => setEmp(r.data.data)).catch(() => {});
    api.get("/emp/domains").then(r => setDomains(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: string) => {
    setActingOn(id);
    try {
      await api.post(`/emp/simulations/${id}/approve`);
      toast.success("Simulation approved and published");
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed"); }
    finally { setActingOn(null); }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Rejection reason (required):");
    if (!reason) return;
    setActingOn(id);
    try {
      await api.post(`/emp/simulations/${id}/reject`, { reason });
      toast.success("Simulation rejected");
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed"); }
    finally { setActingOn(null); }
  };

  const handleSoftDelete = async (id: string) => {
    if (!confirm("Soft-delete this simulation? It can be restored.")) return;
    setActingOn(id);
    try {
      await api.patch(`/emp/simulations/${id}/soft-delete`);
      toast.success("Simulation removed");
      load();
    } catch (e: any) { toast.error("Failed"); }
    finally { setActingOn(null); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="p-6 xl:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isAdmin ? "All Simulations" : "My Simulations"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} simulation{total !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/emp/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-sm"
          style={{ background: G }}>
          <Plus className="w-4 h-4"/> New Simulation
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5 flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search simulations…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent bg-white"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:border-transparent">
          {STATUSES.map(s => <option key={s} value={s}>{s || "All Status"}</option>)}
        </select>

        {/* Difficulty */}
        <select
          value={filters.difficulty}
          onChange={e => setFilters(f => ({ ...f, difficulty: e.target.value }))}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:border-transparent">
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d || "All Levels"}</option>)}
        </select>

        {/* Domain */}
        {isAdmin && (
          <select
            value={filters.domainId}
            onChange={e => setFilters(f => ({ ...f, domainId: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:border-transparent">
            <option value="">All Domains</option>
            {domains.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: G }}/>
          </div>
        ) : sims.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3"/>
            <p className="text-sm font-medium text-slate-500">No simulations found</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2.5 border-b border-slate-100 bg-slate-50">
              {["Simulation", "Domain", "Difficulty", "Status", "Actions"].map(h => (
                <p key={h} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{h}</p>
              ))}
            </div>

            {sims.map(sim => (
              <div key={sim.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{sim.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    {sim._count?.decisions || 0} decisions · {sim.creator?.name || "—"}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: sim.domain?.colorHex || G }}/>
                    <span className="text-xs text-slate-600 truncate">{sim.domain?.name}</span>
                  </div>
                </div>
                <p className="text-xs font-mono text-slate-500">{sim.difficultyLevel}</p>
                <StatusBadge s={sim.status}/>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <Link href={`/emp/simulations/${sim.id}`}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-all">
                    <Eye className="w-3.5 h-3.5"/>
                  </Link>

                  {isAdmin && sim.status === "SUBMITTED" && (
                    <>
                      <button
                        onClick={() => handleApprove(sim.id)}
                        disabled={actingOn === sim.id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-all disabled:opacity-50">
                        {actingOn === sim.id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <CheckCircle2 className="w-3.5 h-3.5"/>}
                      </button>
                      <button
                        onClick={() => handleReject(sim.id)}
                        disabled={actingOn === sim.id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all disabled:opacity-50">
                        <XCircle className="w-3.5 h-3.5"/>
                      </button>
                    </>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => handleSoftDelete(sim.id)}
                      disabled={actingOn === sim.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Previous
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}