"use client";
import { useEffect, useState } from "react";
import { UserCheck, Plus, Loader2, Pencil, X, Check, Power } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const G = "#5a7f2e";
const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent bg-white";

export default function EmpEmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "CONTENT_DEVELOPER" });

  const load = async () => {
    try {
      const res = await api.get("/emp/employees");
      setEmployees(res.data.data);
    } catch { toast.error("Failed to load employees"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) { toast.error("All fields required"); return; }
    setSaving(true);
    try {
      await api.post("/emp/employees", form);
      toast.success("Employee created");
      setForm({ name: "", email: "", password: "", role: "CONTENT_DEVELOPER" });
      setShowForm(false);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const toggleActive = async (emp: any) => {
    try {
      await api.patch(`/emp/employees/${emp.id}`, { isActive: !emp.isActive });
      setEmployees(es => es.map(e => e.id === emp.id ? { ...e, isActive: !e.isActive } : e));
      toast.success(emp.isActive ? "Employee deactivated" : "Employee activated");
    } catch { toast.error("Failed"); }
  };

  return (
    <div className="p-6 xl:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500 mt-0.5">{employees.length} team members</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: G }}>
          {showForm ? <X className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
          {showForm ? "Cancel" : "Add Employee"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">New Employee</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ananya Krishnan" className={inputCls}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ananya@managenz.com" className={inputCls}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Strong password" className={inputCls}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputCls}>
                <option value="CONTENT_DEVELOPER">Content Developer</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: G }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
            Create Employee
          </button>
        </div>
      )}

      {/* Employee list */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: G }}/>
          </div>
        ) : employees.length === 0 ? (
          <div className="py-16 text-center">
            <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-3"/>
            <p className="text-sm text-slate-500">No employees yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {employees.map(emp => (
              <div key={emp.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: G }}>
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{emp.name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {emp.email} · {emp.role === "ADMIN" ? "Admin" : "Content Developer"}
                    {" "}· {emp._count?.createdSimulations || 0} simulations
                  </p>
                </div>
                <span className={`text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full ${emp.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {emp.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
                <button onClick={() => toggleActive(emp)}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all ${emp.isActive ? "border-rose-200 text-rose-500 hover:bg-rose-50" : "border-emerald-200 text-emerald-500 hover:bg-emerald-50"}`}>
                  <Power className="w-3.5 h-3.5"/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}