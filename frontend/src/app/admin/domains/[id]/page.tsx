"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Plus, ArrowLeft, Brain, Pencil, Trash2,
  Check, X, Globe, BookOpen, Eye, EyeOff,
  Clock, Layers, GraduationCap, Briefcase, Compass,
  AlertCircle, ChevronRight,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

/* ─── Types & Mappings ───────────────────────────────────────────── */
// Frontend display types (what users see)
type UserTypeDisplay = "STUDENT_EXPLORER" | "PLACEMENT_PREP" | "JUNIOR_PROFESSIONAL";

// Backend Prisma enum values (what the database expects)
type UserTypeBackend = "STUDENT_EXPLORER" | "PLACEMENT_PREP" | "JUNIOR_PROFESSIONAL";
type DifficultyBackend = "FOUNDATIONAL" | "INTERMEDIATE" | "ADVANCED";

// ✅ Map frontend display names to backend enum values
const USER_TYPE_MAP: Record<UserTypeDisplay, UserTypeBackend> = {
  "STUDENT_EXPLORER": "STUDENT_EXPLORER",
  "PLACEMENT_PREP": "PLACEMENT_PREP",
  "JUNIOR_PROFESSIONAL": "JUNIOR_PROFESSIONAL",
};

// ✅ Backend difficulty enum values (same for all user types)
const DIFFICULTY_BACKEND = ["FOUNDATIONAL", "INTERMEDIATE", "ADVANCED"] as const;

// ✅ Display names for each user type + difficulty combination
const DIFFICULTY_DISPLAY: Record<UserTypeDisplay, Record<DifficultyBackend, string>> = {
  "STUDENT_EXPLORER": {
    "FOUNDATIONAL": "Foundational",
    "INTERMEDIATE": "Intermediate", 
    "ADVANCED": "Advanced",
  },
  "PLACEMENT_PREP": {
    "FOUNDATIONAL": "Moderate",
    "INTERMEDIATE": "Intense",
    "ADVANCED": "Interview Grade",
  },
  "JUNIOR_PROFESSIONAL": {
    "FOUNDATIONAL": "Operational",
    "INTERMEDIATE": "Strategic",
    "ADVANCED": "Executive",
  },
};

const LANES = [
  {
    type: "STUDENT_EXPLORER" as UserTypeDisplay,
    label: "Student Explorer",
    icon: Compass,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    ring: "ring-emerald-500/20",
    desc: "Immersive learning simulations for students exploring a domain without pressure.",
  },
  {
    type: "PLACEMENT_PREP" as UserTypeDisplay,
    label: "Placement Prep",
    icon: GraduationCap,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    ring: "ring-violet-500/20",
    desc: "Interview-calibrated simulations for students facing campus placement season.",
  },
  {
    type: "JUNIOR_PROFESSIONAL" as UserTypeDisplay,
    label: "Junior Professional",
    icon: Briefcase,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    ring: "ring-amber-500/20",
    desc: "Complex ambiguous simulations for 1–3 year professionals seeking real development.",
  },
] as const;

type Lane = typeof LANES[number];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

function getDifficultyLabel(lane: Lane, difficulty: DifficultyBackend) {
  return DIFFICULTY_DISPLAY[lane.type][difficulty];
}

/* ─── Sim Form ───────────────────────────────────────────────────── */
const EMPTY = {
  title:"", slug:"", shortDescription:"",
  difficulty:"FOUNDATIONAL" as DifficultyBackend,
  estimatedMinutes:"50",
  totalQuestions:"25", isPremium:false, isDiagnosticSource:false,
};

function SimForm({ lane, initial, onSave, onCancel, saving }: {
  lane:Lane; initial:typeof EMPTY; onSave:(d:any)=>void; onCancel:()=>void; saving:boolean;
}) {
  const [f, setF] = useState(initial);
  const set = (k:string,v:any) => setF(p=>({...p,[k]:v}));
  const inp = "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition-all";
  const lbl = "font-mono text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5";
  const dl = getDifficultyLabel(lane, f.difficulty);

  return (
    <div className={`rounded-2xl border ${lane.border} p-5 space-y-4`} style={{background:"#f8fafc"}}>
      <div className="flex items-center gap-2">
        <div className={`w-6 h-6 rounded-lg ${lane.bg} border ${lane.border} flex items-center justify-center flex-shrink-0`}>
          <lane.icon className={`w-3.5 h-3.5 ${lane.color}`}/>
        </div>
        <span className={`font-mono text-[10px] uppercase tracking-wider ${lane.color}`}>{lane.label} — {dl}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Title *</label>
          <input value={f.title} className={inp} placeholder="e.g. The Founding PM"
            onChange={e=>{set("title",e.target.value);if(!initial.slug)set("slug",slugify(e.target.value));}}/>
        </div>
        <div>
          <label className={lbl}>Slug *</label>
          <input value={f.slug} className={inp} placeholder="auto-generated"
            onChange={e=>set("slug",slugify(e.target.value))}/>
        </div>
      </div>
      <div>
        <label className={lbl}>Short Description *</label>
        <textarea value={f.shortDescription} rows={2} className={`${inp} resize-none`}
          placeholder="2–3 sentences shown on the simulation card"
          onChange={e=>set("shortDescription",e.target.value)}/>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={lbl}>Difficulty</label>
          <select value={f.difficulty} className={`${inp} cursor-pointer`} onChange={e=>set("difficulty",e.target.value as DifficultyBackend)}>
            {DIFFICULTY_BACKEND.map(d => (
              <option key={d} value={d}>{getDifficultyLabel(lane, d)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Est. Time (min)</label>
          <input type="number" value={f.estimatedMinutes} className={inp} onChange={e=>set("estimatedMinutes",e.target.value)}/>
        </div>
        <div>
          <label className={lbl}>Questions</label>
          <input type="number" value={f.totalQuestions} className={inp} onChange={e=>set("totalQuestions",e.target.value)}/>
        </div>
        <div className="flex flex-col justify-end">
          <label className={lbl}>Access</label>
          <button type="button" onClick={()=>set("isPremium",!f.isPremium)}
            className={`px-3.5 py-2.5 rounded-xl border font-body text-xs transition-all
              ${f.isPremium?"bg-yellow-500/15 border-yellow-500/30 text-yellow-400":"bg-slate-50 border-slate-200 text-slate-500"}`}>
            {f.isPremium?"Premium":"Free"}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
        <button type="button" onClick={()=>set("isDiagnosticSource",!f.isDiagnosticSource)}
          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all
            ${f.isDiagnosticSource?"bg-[#5a7f2e] border-[#5a7f2e]":"border-slate-300 bg-transparent"}`}>
          {f.isDiagnosticSource&&<Check className="w-3 h-3 text-slate-900"/>}
        </button>
        <p className="font-body text-xs text-slate-600">Mark as diagnostic source — first 3 questions available without login</p>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button onClick={()=>onSave({...f, difficultyLabel:dl, seqOrder:DIFFICULTY_BACKEND.indexOf(f.difficulty)+1})}
          disabled={saving||!f.title||!f.slug||!f.shortDescription}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-900 font-body font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{background:"#5a7f2e"}}>
          {saving?<><Loader2 className="w-3.5 h-3.5 animate-spin"/>Saving…</>:<><Check className="w-3.5 h-3.5"/>Save Simulation</>}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 font-body text-sm transition-all">
          <X className="w-3.5 h-3.5"/>Cancel
        </button>
      </div>
    </div>
  );
}

/* ─── Sim Card ───────────────────────────────────────────────────── */
function SimCard({ uc, lane, onEdit, onDelete, onTogglePublish, deleting }: {
  uc:any; lane:Lane; onEdit:()=>void; onDelete:()=>void; onTogglePublish:()=>void; deleting:boolean;
}) {
  const dl = getDifficultyLabel(lane, uc.difficultyLevel as DifficultyBackend);
  const qCount = uc._count?.questions||0;
  const complete = qCount>=25;
  return (
    <div className="rounded-2xl bg-white border border-slate-200 hover:border-slate-200 transition-all">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-9 h-9 rounded-xl ${lane.bg} border ${lane.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
            <Brain className={`w-4 h-4 ${lane.color}`}/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body font-semibold text-slate-900 text-sm leading-snug mb-1">{uc.title}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border ${lane.bg} ${lane.color} ${lane.border}`}>{dl}</span>
              <span className={`font-mono text-[9px] px-2 py-0.5 rounded-full border ${uc.isPublished?"text-emerald-400 bg-emerald-500/10 border-emerald-500/20":"text-slate-400 bg-slate-50 border-slate-200"}`}>
                {uc.isPublished?"● Live":"○ Draft"}
              </span>
              {uc.isPremium&&<span className="font-mono text-[9px] px-2 py-0.5 rounded-full border text-yellow-400 bg-yellow-500/10 border-yellow-500/20">Premium</span>}
              {uc.isDiagnosticSource&&<span className="font-mono text-[9px] px-2 py-0.5 rounded-full border text-blue-400 bg-blue-500/10 border-blue-500/20">Diagnostic</span>}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[9px] text-slate-400">{qCount}/25 decisions · ~{uc.estimatedMinutes||50}min</span>
            <span className={`font-mono text-[9px] ${complete?"text-emerald-400":"text-amber-400"}`}>{complete?"✓ Complete":"In progress"}</span>
          </div>
          <div className="h-1.5 bg-white rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{width:`${Math.min(100,(qCount/25)*100)}%`,background:complete?"#5a7f2e":"#f59e0b"}}/>
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-3 border-t border-slate-200">
          <Link href={`/admin/usecases/${uc.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-xs transition-all text-slate-900"
            style={{background:"#5a7f2e"}}>
            <BookOpen className="w-3.5 h-3.5"/>Open Builder
          </Link>
          <div className="flex-1"/>
          <button onClick={onTogglePublish} title={uc.isPublished?"Unpublish":"Publish"}
            className={`p-1.5 rounded-lg border transition-all
              ${uc.isPublished?"bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400":"bg-slate-50 border-slate-200 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"}`}>
            {uc.isPublished?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
          </button>
          <button onClick={onEdit}
            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
            <Pencil className="w-4 h-4"/>
          </button>
          <button onClick={onDelete} disabled={deleting}
            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-40">
            {deleting?<Loader2 className="w-4 h-4 animate-spin"/>:<Trash2 className="w-4 h-4"/>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Lane Column ────────────────────────────────────────────────── */
function LaneColumn({ lane, sims, domainId, onRefresh }: {
  lane:Lane; sims:any[]; domainId:string; onRefresh:()=>void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState<string|null>(null);
  const [editForm, setEditForm] = useState({...EMPTY});
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string|null>(null);

  const handleCreate = async (form:any) => {
    setSaving(true);
    try {
      await api.post("/admin/usecases", {
        domainId,
        // ✅ Send correct backend enum value
        userTypeTarget: USER_TYPE_MAP[lane.type],
        title: form.title,
        slug: form.slug,
        description: form.shortDescription || form.title,
        shortDescription: form.shortDescription || "",
        // ✅ Send correct backend difficulty enum
        difficultyLevel: form.difficulty,
        difficultyLabel: form.difficultyLabel,
        sequenceOrder: sims.length+1,
        estimatedMinutes: parseInt(form.estimatedMinutes)||50,
        totalQuestions: parseInt(form.totalQuestions)||25,
        isPremium: form.isPremium,
        isDiagnosticSource: form.isDiagnosticSource,
      });
      setShowForm(false);
      toast.success("Simulation created — open Builder to add content.");
      onRefresh();
    } catch(err:any){toast.error(err?.response?.data?.message||"Failed to create");}
    finally{setSaving(false);}
  };

  const handleUpdate = async (form:any) => {
    if(!editId)return;
    setSaving(true);
    try {
      await api.patch(`/admin/usecases/${editId}`, {
        title: form.title,
        slug: form.slug,
        description: form.shortDescription || form.title,
        shortDescription: form.shortDescription || "",
        // ✅ Send correct backend difficulty enum
        difficultyLevel: form.difficulty,
        difficultyLabel: form.difficultyLabel,
        estimatedMinutes: parseInt(form.estimatedMinutes)||50,
        totalQuestions: parseInt(form.totalQuestions)||25,
        isPremium: form.isPremium,
        isDiagnosticSource: form.isDiagnosticSource,
      });
      setEditId(null);
      toast.success("Updated.");
      onRefresh();
    } catch(err:any){toast.error(err?.response?.data?.message||"Failed to update");}
    finally{setSaving(false);}
  };

  const handleDelete = async (id:string) => {
    if(!confirm("Delete this simulation? All questions, options, and data will be permanently deleted."))return;
    setDeleting(id);
    try {
      await api.delete(`/admin/usecases/${id}`);
      toast.success("Deleted.");
      onRefresh();
    } catch(err:any){toast.error(err?.response?.data?.message||"Failed to delete");}
    finally{setDeleting(null);}
  };

  const handleTogglePublish = async (uc:any) => {
    try {
      await api.patch(`/admin/usecases/${uc.id}`,{isPublished:!uc.isPublished});
      toast.success(uc.isPublished?"Unpublished.":"Published!");
      onRefresh();
    } catch {toast.error("Failed");}
  };

  const startEdit = (uc:any) => {
    setEditId(uc.id);
    setEditForm({
      title: uc.title||"",
      slug: uc.slug||"",
      shortDescription: uc.shortDescription||"",
      difficulty: uc.difficultyLevel||"FOUNDATIONAL",
      estimatedMinutes: String(uc.estimatedMinutes||50),
      totalQuestions: String(uc.totalQuestions||25),
      isPremium: uc.isPremium||false,
      isDiagnosticSource: uc.isDiagnosticSource||false,
    });
    setShowForm(false);
  };

  const live = sims.filter(s=>s.isPublished).length;
  const total = sims.length;

  return (
    <div className="flex flex-col min-w-0">
      {/* Lane header */}
      <div className={`rounded-2xl ${lane.bg} border ${lane.border} p-4 mb-4`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl bg-slate-100 border ${lane.border} flex items-center justify-center`}>
              <lane.icon className={`w-4 h-4 ${lane.color}`}/>
            </div>
            <div>
              <p className={`font-display font-bold text-sm ${lane.color}`}>{lane.label}</p>
              <p className="font-mono text-[9px] text-slate-400">{total} sim{total!==1?"s":""} · {live} live</p>
            </div>
          </div>
          <button onClick={()=>{setShowForm(s=>!s);setEditId(null);}}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-body text-xs transition-all ${lane.bg} ${lane.border} ${lane.color} hover:opacity-80`}>
            <Plus className="w-3.5 h-3.5"/>Add
          </button>
        </div>
        <p className="font-body text-[11px] text-slate-500 leading-relaxed">{lane.desc}</p>
      </div>

      {/* Add form */}
      {showForm&&!editId&&(
        <div className="mb-3">
          <SimForm lane={lane} initial={{...EMPTY}} onSave={handleCreate} onCancel={()=>setShowForm(false)} saving={saving}/>
        </div>
      )}

      {/* Simulation cards */}
      <div className="space-y-3 flex-1">
        {sims.length===0&&!showForm&&(
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
            <Brain className="w-8 h-8 text-slate-300 mx-auto mb-2"/>
            <p className="font-mono text-[10px] text-slate-300 uppercase tracking-wider">No simulations yet</p>
            <button onClick={()=>setShowForm(true)}
              className={`mt-3 flex items-center gap-1 mx-auto px-3 py-1.5 rounded-lg border font-body text-xs ${lane.bg} ${lane.border} ${lane.color}`}>
              <Plus className="w-3 h-3"/>Create first
            </button>
          </div>
        )}
        {sims.map(uc=>(
          <div key={uc.id}>
            {editId===uc.id?(
              <SimForm lane={lane} initial={editForm} onSave={handleUpdate} onCancel={()=>setEditId(null)} saving={saving}/>
            ):(
              <SimCard uc={uc} lane={lane}
                onEdit={()=>startEdit(uc)}
                onDelete={()=>handleDelete(uc.id)}
                onTogglePublish={()=>handleTogglePublish(uc)}
                deleting={deleting===uc.id}/>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function AdminDomainDetailPage() {
  const params = useParams();
  const domainId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState<any>(null);
  const [useCases, setUseCases] = useState<any[]>([]);

  useEffect(()=>{ if(domainId)loadData(); },[domainId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [domRes,ucRes] = await Promise.all([
        api.get("/admin/domains"),
        api.get(`/admin/domains/${domainId}/usecases`),
      ]);
      const all = domRes.data.data||[];
      setDomain(all.find((d:any)=>d.id===domainId)||null);
      setUseCases(ucRes.data.data||[]);
    } catch {toast.error("Failed to load domain");}
    finally{setLoading(false);}
  };

  if(loading) return(
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin" style={{color:"#5a7f2e"}}/>
    </div>
  );

  const byType=(t:UserTypeDisplay)=>useCases.filter(u=>(u.userTypeTarget||"STUDENT_EXPLORER")===t);
  const totalSims = useCases.length;
  const published = useCases.filter(u=>u.isPublished).length;
  const totalQ = useCases.reduce((a,u)=>a+(u._count?.questions||0),0);

  return (
    <>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div style={{animation:"fadeUp 0.4s ease"}}>

      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/domains"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-600 font-body text-sm transition-colors mb-5">
          <ArrowLeft className="w-3.5 h-3.5"/>All Domains
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{background:`${domain?.colorHex||"#5a7f2e"}20`,border:`1px solid ${domain?.colorHex||"#5a7f2e"}40`}}>
              <Globe className="w-6 h-6" style={{color:domain?.colorHex||"#5a7f2e"}}/>
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-slate-900">{domain?.name||"Domain"}</h1>
              <p className="font-mono text-[10px] text-slate-400 mt-0.5">
                /{domain?.slug} · {totalSims} simulations · {published} published · {totalQ} decisions total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0"/>
            <p className="font-mono text-[9px] text-slate-400">Each simulation needs 25 decisions · 6 options each · 8+ impacts per option</p>
          </div>
        </div>
      </div>

      {/* Lane summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {LANES.map(lane=>{
          const sims = byType(lane.type);
          const live = sims.filter(s=>s.isPublished).length;
          return(
            <div key={lane.type} className={`rounded-xl ${lane.bg} border ${lane.border} px-4 py-3 flex items-center gap-3`}>
              <lane.icon className={`w-4 h-4 ${lane.color} flex-shrink-0`}/>
              <div>
                <p className={`font-mono text-[10px] ${lane.color} uppercase tracking-wider`}>{lane.label}</p>
                <p className="font-mono text-[9px] text-slate-400">{sims.length} built · {live} live</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3-column grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {LANES.map(lane=>(
          <LaneColumn
            key={lane.type}
            lane={lane}
            sims={byType(lane.type)}
            domainId={domainId}
            onRefresh={loadData}
          />
        ))}
      </div>

    </div>
    </>
  );
}