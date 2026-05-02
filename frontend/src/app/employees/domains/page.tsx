"use client";
import { useEffect, useState } from "react";
import { Globe, Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const G = "#5a7f2e";
const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none bg-white";

const BLANK = { name: "", slug: "", description: "", iconName: "BookOpen", colorHex: "#5a7f2e", sortOrder: "0" };

export default function EmpDomainsPage() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(BLANK);
  const [editId,  setEditId]  = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [showForm,setShowForm]= useState(false);

  const load = async () => {
    try {
      const res = await api.get("/emp/domains");
      setDomains(res.data.data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error("Name and slug required"); return; }
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/emp/domains/${editId}`, form);
        toast.success("Domain updated");
      } else {
        await api.post("/emp/domains", form);
        toast.success("Domain created");
      }
      setForm(BLANK); setEditId(null); setShowForm(false); load();
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  const handleEdit = (d: any) => {
    setForm({ name: d.name, slug: d.slug, description: d.description || "", iconName: d.iconName, colorHex: d.colorHex, sortOrder: String(d.sortOrder) });
    setEditId(d.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this domain? This cannot be undone.")) return;
    try { await api.delete(`/emp/domains/${id}`); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e?.response?.data?.message || "Failed"); }
  };

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-");

  return (
    <div className="p-6 xl:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Domains</h1>
          <p className="text-sm text-slate-500 mt-0.5">{domains.length} active domains</p>
        </div>
        <button onClick={() => { setShowForm(s => !s); setEditId(null); setForm(BLANK); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: G }}>
          {showForm ? <X className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
          {showForm ? "Cancel" : "Add Domain"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">{editId ? "Edit Domain" : "New Domain"}</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Name *</label>
              <input value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: autoSlug(e.target.value) }))}
                placeholder="Product Management" className={inputCls}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Slug *</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="product-management" className={inputCls}/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-1"/>
                <input value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none font-mono"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                className={inputCls} min="0"/>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="What this domain covers…" className={inputCls + " resize-none"}/>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: G }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
            {editId ? "Update Domain" : "Create Domain"}
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: G }}/>
          </div>
        ) : domains.length === 0 ? (
          <div className="py-16 text-center">
            <Globe className="w-8 h-8 text-slate-300 mx-auto mb-3"/>
            <p className="text-sm text-slate-500">No domains yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {domains.map(d => (
              <div key={d.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${d.colorHex}18`, border: `1.5px solid ${d.colorHex}35` }}>
                  <Globe className="w-4 h-4" style={{ color: d.colorHex }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{d.name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    /{d.slug} · {d._count?.simulations || 0} simulations · {d._count?.users || 0} users
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleEdit(d)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900 transition-all">
                    <Pencil className="w-3.5 h-3.5"/>
                  </button>
                  <button onClick={() => handleDelete(d.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}