"use client";
import { useEffect, useState } from "react";
import {
  UserCheck, Plus, Loader2, Power, Eye,
  FileText, X, Check, AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const G = "#5a7f2e";
const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 bg-white";

function StatusBadge({ s }: { s: string }) {
  const m: Record<string, string> = {
    DRAFT:     "bg-slate-100 text-slate-600",
    SUBMITTED: "bg-amber-50 text-amber-700 border border-amber-200",
    APPROVED:  "bg-emerald-50 text-emerald-700 border border-emerald-200",
    REJECTED:  "bg-rose-50 text-rose-700 border border-rose-200",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${m[s] || "bg-slate-100 text-slate-500"}`}>{s}</span>;
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "CONTENT_DEVELOPER" });

  const load = async () => {
    try {
      const res = await api.get("/admin/employees");
      setEmployees(res.data.data);
    } catch { toast.error("Failed to load employees"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) { toast.error("All fields required"); return; }
    setSaving(true);
    try {
      await api.post("/admin/employees", form);
      toast.success("Employee created successfully");
      setForm({ name: "", email: "", password: "", role: "CONTENT_DEVELOPER" });
      setShowForm(false);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to create"); }
    finally { setSaving(false); }
  };

  const toggleActive = async (emp: any) => {
    try {
      await api.patch(`/admin/employees/${emp.id}`, { isActive: !emp.isActive });
      setEmployees(es => es.map(e => e.id === emp.id ? { ...e, isActive: !e.isActive } : e));
      toast.success(emp.isActive ? "Employee deactivated" : "Employee reactivated");
    } catch { toast.error("Failed to update"); }
  };

  const changeRole = async (empId: string, role: string) => {
    try {
      await api.patch(`/admin/employees/${empId}`, { role });
      setEmployees(es => es.map(e => e.id === empId ? { ...e, role } : e));
      toast.success("Role updated");
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="p-6 xl:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Team Members</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {employees.filter(e => e.isActive).length} active · {employees.length} total
          </p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: G }}>
          {showForm ? <X className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
          {showForm ? "Cancel" : "Add Team Member"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">New Team Member</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ananya Krishnan" className={inputCls}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Work Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="ananya@managenz.com" className={inputCls}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password *</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Strong password (min 8 chars)" className={inputCls}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputCls}>
                <option value="CONTENT_DEVELOPER">Content Developer — Can only create simulations</option>
                <option value="ADMIN">Admin — Full access</option>
              </select>
            </div>
          </div>
          {form.role === "CONTENT_DEVELOPER" && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-amber-700">
                Content Developers can <strong>create</strong> simulations and <strong>submit</strong> them for review.
                They <strong>cannot</strong> edit, delete, or approve simulations — and can only see their own work.
              </p>
            </div>
          )}
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
            style={{ background: G }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
            Create Team Member
          </button>
        </div>
      )}

      {/* Employee list */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: G }}/>
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center">
            <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-3"/>
            <p className="text-sm text-slate-500">No team members yet</p>
            <p className="text-xs text-slate-400 mt-1">Add your first content developer to start building simulations</p>
          </div>
        ) : (
          employees.map(emp => (
            <div key={emp.id}
              className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${emp.isActive ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
              {/* Employee row */}
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${!emp.isActive ? "opacity-50" : ""}`}
                  style={{ background: emp.role === "ADMIN" ? "#1e293b" : G }}>
                  {emp.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-900">{emp.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${
                      emp.role === "ADMIN" ? "bg-slate-900 text-white" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {emp.role === "ADMIN" ? "ADMIN" : "CONTENT DEV"}
                    </span>
                    {!emp.isActive && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">INACTIVE</span>}
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {emp.email} · {emp._count?.createdSimulations || 0} simulation{emp._count?.createdSimulations !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Role changer */}
                <select
                  value={emp.role}
                  onChange={e => changeRole(emp.id, e.target.value)}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none hidden sm:block">
                  <option value="CONTENT_DEVELOPER">Content Developer</option>
                  <option value="ADMIN">Admin</option>
                </select>

                {/* Expand simulations */}
                <button onClick={() => setExpanded(ex => ex === emp.id ? null : emp.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 transition-all">
                  <Eye className="w-3.5 h-3.5"/>
                </button>

                {/* Toggle active */}
                <button onClick={() => toggleActive(emp)}
                  title={emp.isActive ? "Deactivate" : "Reactivate"}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${
                    emp.isActive
                      ? "border-rose-200 text-rose-500 hover:bg-rose-50"
                      : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  }`}>
                  <Power className="w-3.5 h-3.5"/>
                </button>
              </div>

              {/* Expanded: recent simulations */}
              {expanded === emp.id && (
                <div className="border-t border-slate-100 px-5 py-3 bg-slate-50">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Recent Simulations ({emp._count?.createdSimulations || 0} total)
                  </p>
                  {(emp.createdSimulations || []).length === 0 ? (
                    <p className="text-xs text-slate-400">No simulations created yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {emp.createdSimulations.map((sim: any) => (
                        <div key={sim.id} className="flex items-center gap-3">
                          <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
                          <p className="text-xs text-slate-700 font-medium flex-1 truncate">{sim.title}</p>
                          <StatusBadge s={sim.status}/>
                        </div>
                      ))}
                      {emp._count?.createdSimulations > 5 && (
                        <p className="text-xs text-slate-400 pl-6">+{emp._count.createdSimulations - 5} more</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}