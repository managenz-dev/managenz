"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2, Plus, Globe, Pencil, Trash2, ChevronRight,
  Check, X, BookOpen, ToggleLeft, ToggleRight,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const G  = "#5a7f2e";
const G2 = "#4d6e26";

const EMPTY_FORM = { name: "", slug: "", description: "", colorHex: "#5a7f2e", sortOrder: "0" };

const COLOR_PRESETS = [
  "#5a7f2e","#0f766e","#1d4ed8","#7c3aed","#be185d",
  "#b45309","#dc2626","#0891b2","#374151",
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function DomainForm({
  initial, onSave, onCancel, saving,
}: {
  initial: typeof EMPTY_FORM;
  onSave: (data: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const inp = "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all";
  const lbl = "font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5";

  return (
    <div className="rounded-2xl bg-white border border-slate-300 p-5 space-y-4 shadow-sm">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Domain Name *</label>
          <input value={form.name}
            onChange={e => { set("name", e.target.value); if (!initial.slug) set("slug", slugify(e.target.value)); }}
            placeholder="Product Management" className={inp}/>
        </div>
        <div>
          <label className={lbl}>Slug *</label>
          <input value={form.slug}
            onChange={e => set("slug", slugify(e.target.value))}
            placeholder="product-management" className={inp}/>
        </div>
      </div>
      <div>
        <label className={lbl}>Description</label>
        <textarea value={form.description}
          onChange={e => set("description", e.target.value)}
          rows={2} placeholder="Brief description of this domain…"
          className={`${inp} resize-none`}/>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Accent Colour</label>
          <div className="flex items-center gap-2 flex-wrap">
            {COLOR_PRESETS.map(c => (
              <button key={c} onClick={() => set("colorHex", c)}
                className="w-7 h-7 rounded-lg border-2 transition-all flex-shrink-0"
                style={{ background: c, borderColor: form.colorHex === c ? "#0f172a" : "transparent", boxShadow: form.colorHex === c ? "0 0 0 1px #0f172a" : "none" }}/>
            ))}
            <input type="color" value={form.colorHex}
              onChange={e => set("colorHex", e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5"/>
          </div>
        </div>
        <div>
          <label className={lbl}>Sort Order</label>
          <input type="number" value={form.sortOrder}
            onChange={e => set("sortOrder", e.target.value)} className={inp}/>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => onSave(form)} disabled={saving || !form.name || !form.slug}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-body font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          style={{ background: G }}>
          {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/>Saving…</> : <><Check className="w-3.5 h-3.5"/>Save Domain</>}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-body text-sm font-medium transition-all">
          <X className="w-3.5 h-3.5"/>Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminDomainsPage() {
  const [loading,  setLoading]  = useState(true);
  const [domains,  setDomains]  = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { loadDomains(); }, []);

  const loadDomains = async () => {
    try {
      const res = await api.get("/admin/domains");
      setDomains(res.data.data || []);
    } catch { toast.error("Failed to load domains"); }
    finally { setLoading(false); }
  };

  const handleCreate = async (form: typeof EMPTY_FORM) => {
    setSaving(true);
    try {
      const res = await api.post("/admin/domains", { ...form, sortOrder: parseInt(form.sortOrder) || 0 });
      setDomains(d => [...d, res.data.data]);
      setShowForm(false);
      toast.success("Domain created!");
    } catch (err: any) { toast.error(err?.response?.data?.message || "Failed to create domain"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (form: typeof EMPTY_FORM) => {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await api.patch(`/admin/domains/${editId}`, { ...form, sortOrder: parseInt(form.sortOrder) || 0 });
      setDomains(d => d.map(x => x.id === editId ? { ...x, ...res.data.data } : x));
      setEditId(null);
      toast.success("Domain updated!");
    } catch (err: any) { toast.error(err?.response?.data?.message || "Failed to update domain"); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (domain: any) => {
    try {
      const res = await api.patch(`/admin/domains/${domain.id}`, { ...domain, isActive: !domain.isActive });
      setDomains(d => d.map(x => x.id === domain.id ? { ...x, isActive: res.data.data.isActive } : x));
      toast.success(`Domain ${res.data.data.isActive ? "activated" : "deactivated"}`);
    } catch { toast.error("Failed to update domain"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this domain? All its simulations will also be deleted.")) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/domains/${id}`);
      setDomains(d => d.filter(x => x.id !== id));
      toast.success("Domain deleted");
    } catch (err: any) { toast.error(err?.response?.data?.message || "Failed to delete"); }
    finally { setDeleting(null); }
  };

  const startEdit = (d: any) => {
    setEditId(d.id);
    setEditForm({ name: d.name, slug: d.slug, description: d.description || "", colorHex: d.colorHex || G, sortOrder: String(d.sortOrder || 0) });
    setShowForm(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: G }}/>
    </div>
  );

  return (
    <div style={{ animation: "fadeUp 0.4s ease" }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: G }}>Content</p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">Domains</h1>
          <p className="font-body text-sm text-slate-500 mt-1">{domains.length} domain{domains.length !== 1 ? "s" : ""} configured</p>
        </div>
        {!showForm && !editId && (
          <button onClick={() => { setShowForm(true); setEditId(null); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-body font-semibold text-sm transition-all shadow-sm flex-shrink-0"
            style={{ background: G }}>
            <Plus className="w-4 h-4"/>New Domain
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6">
          <p className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">New Domain</p>
          <DomainForm initial={EMPTY_FORM} onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving}/>
        </div>
      )}

      {/* Domains list */}
      {domains.length === 0 && !showForm ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-16 text-center">
          <Globe className="w-10 h-10 text-slate-300 mx-auto mb-4"/>
          <p className="font-body text-slate-500 font-medium mb-1">No domains yet</p>
          <p className="font-mono text-xs text-slate-400">Click "New Domain" to create your first management track</p>
        </div>
      ) : (
        <div className="space-y-2">
          {domains.map(d => (
            <div key={d.id}>
              {editId === d.id ? (
                <div>
                  <p className="font-mono text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Editing: {d.name}</p>
                  <DomainForm initial={editForm} onSave={handleUpdate} onCancel={() => setEditId(null)} saving={saving}/>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${d.colorHex}15`, border: `1.5px solid ${d.colorHex}35` }}>
                    <Globe className="w-4 h-4" style={{ color: d.colorHex }}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-body font-semibold text-slate-900">{d.name}</p>
                      <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border font-semibold ${
                        d.isActive
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : "text-slate-500 bg-slate-100 border-slate-200"
                      }`}>
                        {d.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-slate-400">
                      /{d.slug} · {d._count?.useCases || 0} simulation{(d._count?.useCases || 0) !== 1 ? "s" : ""}
                    </p>
                    {d.description && <p className="font-body text-xs text-slate-500 mt-0.5 truncate">{d.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Link href={`/admin/domains/${d.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 font-body text-xs font-medium transition-all">
                      <BookOpen className="w-3.5 h-3.5"/>Simulations
                    </Link>
                    <button onClick={() => handleToggleActive(d)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 transition-all"
                      title={d.isActive ? "Deactivate" : "Activate"}>
                      {d.isActive
                        ? <ToggleRight className="w-4 h-4 text-emerald-600"/>
                        : <ToggleLeft className="w-4 h-4"/>
                      }
                    </button>
                    <button onClick={() => startEdit(d)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition-all">
                      <Pencil className="w-4 h-4"/>
                    </button>
                    <button onClick={() => handleDelete(d.id)} disabled={deleting === d.id}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 transition-all disabled:opacity-40">
                      {deleting === d.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}