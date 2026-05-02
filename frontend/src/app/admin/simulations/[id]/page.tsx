// frontend/src/app/admin/simulations/[id]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2, ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronUp,
  BookOpen, Users, Activity, Target, HelpCircle, CheckCircle2,
  Pencil, X, Check
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const TABS = ["Story", "Characters", "Variables", "Scoring", "Questions"];
const SCORING_DIMS = ["FINANCIAL_PRUDENCE","STAKEHOLDER_ALIGNMENT","RISK_MANAGEMENT","LEADERSHIP_CREDIBILITY","TEAM_MORALE","STRATEGIC_CLARITY","CUSTOM"];
const OPTION_LABELS = ["A","B","C","D","E","F"];
const tabIcons = [BookOpen, Users, Activity, Target, HelpCircle];

// ── tiny reusable field ───────────────────────────────────────────────────────
function Field({ label, value, onChange, type = "text", rows = 1, placeholder = "" }: any) {
  return (
    <div>
      {label && <label className="label text-xs">{label}</label>}
      {rows > 1
        ? <textarea className="input resize-none text-sm" rows={rows} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
        : <input type={type} className="input text-sm" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
      }
    </div>
  );
}

export default function SimulationBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState(0);
  const [useCase, setUseCase] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // story
  const [story, setStory] = useState({ companyBackground: "", closingChallenge: "", howItWorks: "" });

  // characters
  const [characters, setCharacters] = useState<any[]>([]);
  const [newChar, setNewChar] = useState({ role:"", name:"", isPlayer:false, trustLevel:"", emotionalState:"", keyConcern:"" });
  const [showCharForm, setShowCharForm] = useState(false);
  const [editCharId, setEditCharId] = useState<string|null>(null);
  const [editChar, setEditChar] = useState<any>({});

  // dialogues
  const [dialogues, setDialogues] = useState<any[]>([]);

  // variables
  const [variables, setVariables] = useState<any[]>([]);
  const [newVar, setNewVar] = useState({ 
    variableName:"", 
    displayName:"", 
    startingValue:"50", 
    unit:"%", 
    higherIsBetter:true, 
    scoringDimension:"CUSTOM", 
    dimensionWeight:"1.0",
    userType: "STUDENT_EXPLORER" // ✅ NEW: User Type filter
  });
  const [showVarForm, setShowVarForm] = useState(false);
  const [editVarId, setEditVarId] = useState<string|null>(null);
  const [editVar, setEditVar] = useState<any>({});

  // scoring
  const [scoringDims, setScoringDims] = useState<any[]>([]);
  const [newDim, setNewDim] = useState({ dimensionKey:"", displayName:"", description:"", weight:"1.0" });
  const [showDimForm, setShowDimForm] = useState(false);
  const [editDimId, setEditDimId] = useState<string|null>(null);
  const [editDim, setEditDim] = useState<any>({});

  // questions
  const [questions, setQuestions] = useState<any[]>([]);
  const [expandedQ, setExpandedQ] = useState<string|null>(null);
  const [newQ, setNewQ] = useState({ tag:"", situationUpdate:"", questionText:"", context:"" });
  const [showQForm, setShowQForm] = useState(false);
  const [editQId, setEditQId] = useState<string|null>(null);
  const [editQ, setEditQ] = useState<any>({});
  const [newOptionForms, setNewOptionForms] = useState<Record<string,any>>({});

  // option edit
  const [editOptId, setEditOptId] = useState<string|null>(null);
  const [editOpt, setEditOpt] = useState<any>({});

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try { await api.get("/admin/verify"); loadAll(); }
    catch { router.push("/admin/login"); }
  };

  const loadAll = async () => {
    try {
      const res = await api.get(`/admin/usecases/${id}`);
      const d = res.data.data;
      setUseCase(d);
      setStory({
        companyBackground: d.story?.companyBackground || "",
        closingChallenge: d.story?.closingChallenge || "",
        howItWorks: d.story?.howItWorks || "",
      });
      setCharacters(d.characters || []);
      setDialogues(
        d.dialogues?.map((dl: any) => ({
          characterId: dl.characterId,
          text: dl.text,
          characterName: dl.character?.name,
        })) || []
      );
      setVariables(d.variables || []);
      setQuestions(d.questions || []);
      const dimRes = await api.get(`/admin/usecases/${id}/scoring`);
      setScoringDims(dimRes.data.data || []);
    } catch { toast.error("Failed to load simulation"); }
    finally { setIsLoading(false); }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // STORY
  // ════════════════════════════════════════════════════════════════════════════
  const saveStory = async () => {
    setIsSaving(true);
    try { await api.post(`/admin/usecases/${id}/story`, story); toast.success("Story saved!"); }
    catch { toast.error("Failed to save story"); }
    finally { setIsSaving(false); }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // CHARACTERS
  // ════════════════════════════════════════════════════════════════════════════
  const createCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChar.role || !newChar.name) { toast.error("Role and name required"); return; }
    try {
      const res = await api.post(`/admin/usecases/${id}/characters`, {
        ...newChar,
        trustLevel: newChar.trustLevel ? parseInt(newChar.trustLevel) : null,
        sortOrder: characters.length,
      });
      setCharacters([...characters, res.data.data]);
      setNewChar({ role:"", name:"", isPlayer:false, trustLevel:"", emotionalState:"", keyConcern:"" });
      setShowCharForm(false);
      toast.success("Character added!");
    } catch { toast.error("Failed to add character"); }
  };

  const startEditChar = (c: any) => {
    setEditCharId(c.id);
    setEditChar({
      role: c.role,
      name: c.name,
      isPlayer: c.isPlayer,
      trustLevel: c.trustLevel ?? "",
      emotionalState: c.emotionalState ?? "",
      keyConcern: c.keyConcern ?? "",
    });
  };

  const saveEditChar = async (charId: string) => {
    try {
      const res = await api.patch(`/admin/characters/${charId}`, {
        ...editChar,
        trustLevel: editChar.trustLevel ? parseInt(editChar.trustLevel) : null,
      });
      setCharacters(characters.map(c => c.id === charId ? { ...c, ...res.data.data } : c));
      setEditCharId(null);
      toast.success("Character updated!");
    } catch { toast.error("Failed to update character"); }
  };

  const deleteCharacter = async (charId: string) => {
    if (!confirm("Delete this character?")) return;
    try {
      await api.delete(`/admin/characters/${charId}`);
      setCharacters(characters.filter(c => c.id !== charId));
      toast.success("Character deleted");
    } catch { toast.error("Failed to delete"); }
  };

  // dialogues
  const saveDialogues = async () => {
    setIsSaving(true);
    try { await api.post(`/admin/usecases/${id}/dialogues`, { dialogues }); toast.success("Dialogues saved!"); }
    catch { toast.error("Failed to save dialogues"); }
    finally { setIsSaving(false); }
  };
  const addDialogueLine = () => setDialogues([...dialogues, { characterId:"", text:"" }]);
  const removeDialogueLine = (i: number) => setDialogues(dialogues.filter((_,idx) => idx !== i));
  const updateDialogue = (i: number, field: string, value: string) => {
    const u = [...dialogues]; u[i] = { ...u[i], [field]: value }; setDialogues(u);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // VARIABLES (UPDATED WITH DROPDOWNS & USER TYPE FILTER)
  // ════════════════════════════════════════════════════════════════════════════
  const createVariable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVar.variableName || !newVar.displayName) { toast.error("Name required"); return; }
    try {
      const res = await api.post(`/admin/usecases/${id}/variables`, { 
        ...newVar, 
        sortOrder: variables.length,
        userType: newVar.userType // ✅ Send userType to backend
      });
      setVariables([...variables, res.data.data]);
      setNewVar({ variableName:"", displayName:"", startingValue:"50", unit:"%", higherIsBetter:true, scoringDimension:"CUSTOM", dimensionWeight:"1.0", userType: "STUDENT_EXPLORER" });
      setShowVarForm(false);
      toast.success("Variable added!");
    } catch { toast.error("Failed to add variable"); }
  };

  const startEditVar = (v: any) => {
    setEditVarId(v.id);
    setEditVar({
      variableName: v.variableName,
      displayName: v.displayName,
      startingValue: String(v.startingValue),
      unit: v.unit,
      higherIsBetter: v.higherIsBetter,
      scoringDimension: v.scoringDimension,
      dimensionWeight: String(v.dimensionWeight),
      userType: v.userType || "STUDENT_EXPLORER",
    });
  };

  const saveEditVar = async (varId: string) => {
    try {
      const res = await api.patch(`/admin/variables/${varId}`, editVar);
      setVariables(variables.map(v => v.id === varId ? { ...v, ...res.data.data } : v));
      setEditVarId(null);
      toast.success("Variable updated!");
    } catch { toast.error("Failed to update variable"); }
  };

  const deleteVariable = async (varId: string) => {
    if (!confirm("Delete this variable? All impact values linked to it will also be deleted.")) return;
    try {
      await api.delete(`/admin/variables/${varId}`);
      setVariables(variables.filter(v => v.id !== varId));
      toast.success("Variable deleted");
    } catch { toast.error("Failed to delete"); }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // SCORING DIMENSIONS
  // ════════════════════════════════════════════════════════════════════════════
  const createDimension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDim.dimensionKey || !newDim.displayName) { toast.error("Key and name required"); return; }
    try {
      const res = await api.post(`/admin/usecases/${id}/scoring`, { ...newDim, sortOrder: scoringDims.length });
      setScoringDims([...scoringDims, res.data.data]);
      setNewDim({ dimensionKey:"", displayName:"", description:"", weight:"1.0" });
      setShowDimForm(false);
      toast.success("Scoring dimension added!");
    } catch { toast.error("Failed to add dimension"); }
  };

  const startEditDim = (d: any) => {
    setEditDimId(d.id);
    setEditDim({
      displayName: d.displayName,
      description: d.description ?? "",
      dimensionKey: d.dimensionKey,
      weight: String(d.weight ?? "1.0"),
    });
  };

  const saveEditDim = async (dimId: string) => {
    try {
      const res = await api.patch(`/admin/scoring/${dimId}`, editDim);
      setScoringDims(scoringDims.map(d => d.id === dimId ? { ...d, ...res.data.data } : d));
      setEditDimId(null);
      toast.success("Dimension updated!");
    } catch { toast.error("Failed to update dimension"); }
  };

  const deleteDimension = async (dimId: string) => {
    try {
      await api.delete(`/admin/scoring/${dimId}`);
      setScoringDims(scoringDims.filter(d => d.id !== dimId));
      toast.success("Dimension deleted");
    } catch { toast.error("Failed to delete"); }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // QUESTIONS
  // ════════════════════════════════════════════════════════════════════════════
  const createQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.questionText) { toast.error("Question text required"); return; }
    try {
      const res = await api.post(`/admin/usecases/${id}/questions`, newQ);
      setQuestions([...questions, { ...res.data.data, options: [] }]);
      setNewQ({ tag:"", situationUpdate:"", questionText:"", context:"" });
      setShowQForm(false);
      toast.success("Question added!");
    } catch (err: any) { toast.error(err?.response?.data?.message || "Failed to add"); }
  };

  const startEditQ = (q: any) => {
    setEditQId(q.id);
    setEditQ({
      tag: q.tag ?? "",
      situationUpdate: q.situationUpdate ?? "",
      questionText: q.questionText,
      context: q.context ?? "",
    });
  };

  const saveEditQ = async (qId: string) => {
    try {
      const res = await api.patch(`/admin/questions/${qId}`, editQ);
      setQuestions(questions.map(q => q.id === qId ? { ...q, ...res.data.data } : q));
      setEditQId(null);
      toast.success("Question updated!");
    } catch { toast.error("Failed to update question"); }
  };

  const deleteQuestion = async (qId: string) => {
    if (!confirm("Delete this question and all its options?")) return;
    try {
      await api.delete(`/admin/questions/${qId}`);
      setQuestions(questions.filter(q => q.id !== qId));
      toast.success("Question deleted");
    } catch { toast.error("Failed to delete"); }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // OPTIONS
  // ════════════════════════════════════════════════════════════════════════════
  const initOptionForm = (qId: string, currentCount: number) => {
    setNewOptionForms(prev => ({
      ...prev,
      [qId]: {
        optionLabel: OPTION_LABELS[currentCount] || "A",
        title: "", description: "", strategyTag: "",
        impacts: variables.map(v => ({ variableId: v.id, variableName: v.variableName, displayName: v.displayName, delta: 0 })),
      },
    }));
  };

  const createOption = async (qId: string) => {
    const opt = newOptionForms[qId];
    if (!opt?.title || !opt?.description) { toast.error("Title and description required"); return; }
    try {
      const impacts = opt.impacts
        .filter((i: any) => i.delta !== 0)
        .map((i: any) => ({ variableId: i.variableId, delta: parseFloat(i.delta) }));
      const res = await api.post(`/admin/questions/${qId}/options`, { ...opt, impacts });
      setQuestions(questions.map(q => q.id === qId ? { ...q, options: [...(q.options || []), res.data.data] } : q));
      setNewOptionForms(prev => { const n = { ...prev }; delete n[qId]; return n; });
      toast.success("Option added!");
    } catch { toast.error("Failed to add option"); }
  };

  const startEditOpt = (opt: any) => {
    setEditOptId(opt.id);
    setEditOpt({
      optionLabel: opt.optionLabel,
      title: opt.title,
      description: opt.description,
      strategyTag: opt.strategyTag ?? "",
      impacts: variables.map(v => {
        const existing = opt.impacts?.find((i: any) => i.variableId === v.id || i.variable?.id === v.id);
        return { variableId: v.id, variableName: v.variableName, displayName: v.displayName, delta: existing?.delta ?? 0 };
      }),
    });
  };

  const saveEditOpt = async (qId: string, optId: string) => {
    try {
      const impacts = editOpt.impacts
        .filter((i: any) => i.delta !== 0)
        .map((i: any) => ({ variableId: i.variableId, delta: parseFloat(i.delta) }));
      const res = await api.patch(`/admin/options/${optId}`, { ...editOpt, impacts });
      setQuestions(questions.map(q =>
        q.id === qId
          ? { ...q, options: q.options.map((o: any) => o.id === optId ? { ...o, ...res.data.data } : o) }
          : q
      ));
      setEditOptId(null);
      toast.success("Option updated!");
    } catch { toast.error("Failed to update option"); }
  };

  const deleteOption = async (qId: string, optId: string) => {
    if (!confirm("Delete this option?")) return;
    try {
      await api.delete(`/admin/options/${optId}`);
      setQuestions(questions.map(q =>
        q.id === qId ? { ...q, options: q.options.filter((o: any) => o.id !== optId) } : q
      ));
      toast.success("Option deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const updateImpact = (qId: string, variableId: string, delta: number) => {
    setNewOptionForms(prev => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        impacts: prev[qId].impacts.map((i: any) => i.variableId === variableId ? { ...i, delta } : i),
      },
    }));
  };

  const updateEditImpact = (variableId: string, delta: number) => {
    setEditOpt((prev: any) => ({
      ...prev,
      impacts: prev.impacts.map((i: any) => i.variableId === variableId ? { ...i, delta } : i),
    }));
  };

  // ════════════════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════════════════
  if (isLoading) return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-dark-950">

      {/* ── Top nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href={`/admin/domains/${useCase?.domainId}`} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">Back</span>
          </Link>
          <span className="font-display font-bold text-white truncate max-w-sm">{useCase?.title}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-white/30">{questions.length}/25 questions</span>
            <span className={`font-mono text-xs px-2 py-1 rounded ${useCase?.isPublished ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/30"}`}>
              {useCase?.isPublished ? "Published" : "Draft"}
            </span>
          </div>
        </div>
      </nav>

      {/* ── Tab bar ── */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-dark-950/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {TABS.map((tab, i) => {
              const Icon = tabIcons[i];
              return (
                <button key={tab} onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-4 py-3 font-body text-sm border-b-2 transition-colors ${
                    activeTab === i ? "border-brand-400 text-brand-400" : "border-transparent text-white/40 hover:text-white/70"
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{tab}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 pt-36 pb-16">

        {/* ══════════════════════════════════════════════════════════════════
            TAB 0 — STORY
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-white text-2xl">Story & Background</h2>
              <button onClick={saveStory} disabled={isSaving} className="btn-primary text-sm gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Story
              </button>
            </div>
            <div className="card p-6 space-y-5">
              <div>
                <label className="label">Company Background <span className="text-rose-400">*</span></label>
                <p className="font-mono text-xs text-white/30 mb-2">
                  Use <span className="text-brand-400 bg-brand-500/10 px-1 rounded">{"{{PLAYER_NAME}}"}</span> anywhere to auto-insert the player's real name.
                </p>
                <textarea className="input resize-none" rows={10}
                  placeholder="NexFlow is a 26-month-old B2B SaaS company..."
                  value={story.companyBackground}
                  onChange={e => setStory({ ...story, companyBackground: e.target.value })} />
              </div>
              <div>
                <label className="label">Closing Challenge Paragraph</label>
                <p className="font-mono text-xs text-white/30 mb-2">Sets up what the player needs to do — creates tension before the simulation begins.</p>
                <textarea className="input resize-none" rows={4}
                  placeholder="The board has given a clear mandate..."
                  value={story.closingChallenge}
                  onChange={e => setStory({ ...story, closingChallenge: e.target.value })} />
              </div>
              <div>
                <label className="label">How This Simulation Works</label>
                <textarea className="input resize-none" rows={3}
                  placeholder="You will face 25 interconnected decisions..."
                  value={story.howItWorks}
                  onChange={e => setStory({ ...story, howItWorks: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1 — CHARACTERS + DIALOGUE
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 1 && (
          <div className="space-y-8">

            {/* Characters */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-white text-2xl">Characters</h2>
                <button onClick={() => setShowCharForm(!showCharForm)} className="btn-primary text-sm gap-2">
                  <Plus className="w-4 h-4" />Add Character
                </button>
              </div>

              {showCharForm && (
                <div className="card border border-cyan-500/20 p-5 mb-4">
                  <h3 className="font-display font-semibold text-white mb-4">New Character</h3>
                  <form onSubmit={createCharacter} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Role *" value={newChar.role} placeholder="e.g. CEO, CFO" onChange={(v: string) => setNewChar({ ...newChar, role: v })} />
                      <Field label="Name *" value={newChar.name} placeholder="e.g. Rohan Desai" onChange={(v: string) => setNewChar({ ...newChar, name: v })} />
                      <Field label="Trust Level (%)" value={newChar.trustLevel} placeholder="e.g. 82" type="number" onChange={(v: string) => setNewChar({ ...newChar, trustLevel: v })} />
                      <Field label="Emotional State" value={newChar.emotionalState} placeholder="e.g. Anxious but composed" onChange={(v: string) => setNewChar({ ...newChar, emotionalState: v })} />
                    </div>
                    <Field label="Key Concern" value={newChar.keyConcern} placeholder="What is this character most worried about?" onChange={(v: string) => setNewChar({ ...newChar, keyConcern: v })} />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded" checked={newChar.isPlayer}
                        onChange={e => setNewChar({ ...newChar, isPlayer: e.target.checked })} />
                      <span className="font-body text-sm text-white/60">This is the player character (name auto-filled from user account)</span>
                    </label>
                    <div className="flex gap-3">
                      <button type="submit" className="btn-primary text-sm">Add Character</button>
                      <button type="button" onClick={() => setShowCharForm(false)} className="btn-secondary text-sm">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-2">
                {characters.length === 0
                  ? <div className="card p-8 text-center"><p className="font-body text-white/30 text-sm">No characters yet.</p></div>
                  : characters.map((c, ci) => (
                    <div key={c.id} className="card overflow-hidden">
                      {editCharId === c.id ? (
                        /* EDIT CHARACTER */
                        <div className="p-5 space-y-4 border border-cyan-500/25">
                          <div className="flex items-center justify-between">
                            <h4 className="font-display font-semibold text-white text-sm">Editing Character</h4>
                            <button onClick={() => setEditCharId(null)} className="p-1 text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <Field label="Role *" value={editChar.role} placeholder="e.g. CEO" onChange={(v: string) => setEditChar({ ...editChar, role: v })} />
                            <Field label="Name *" value={editChar.name} placeholder="e.g. Rohan" onChange={(v: string) => setEditChar({ ...editChar, name: v })} />
                            <Field label="Trust Level (%)" value={String(editChar.trustLevel ?? "")} type="number" placeholder="e.g. 82" onChange={(v: string) => setEditChar({ ...editChar, trustLevel: v })} />
                            <Field label="Emotional State" value={editChar.emotionalState} placeholder="e.g. Anxious" onChange={(v: string) => setEditChar({ ...editChar, emotionalState: v })} />
                          </div>
                          <Field label="Key Concern" value={editChar.keyConcern} placeholder="What is this character most worried about?" onChange={(v: string) => setEditChar({ ...editChar, keyConcern: v })} />
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-4 h-4 rounded" checked={editChar.isPlayer}
                              onChange={e => setEditChar({ ...editChar, isPlayer: e.target.checked })} />
                            <span className="font-body text-sm text-white/60">Player character (name auto-filled)</span>
                          </label>
                          <div className="flex gap-3">
                            <button onClick={() => saveEditChar(c.id)} className="btn-primary text-sm gap-2"><Check className="w-3.5 h-3.5" />Save Changes</button>
                            <button onClick={() => setEditCharId(null)} className="btn-secondary text-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        /* VIEW CHARACTER */
                        <div className="p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="font-display font-bold text-cyan-400 text-sm">{ci + 1}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-display font-semibold text-white text-sm">
                                  {c.isPlayer ? "← Player's real name (auto)" : c.name}
                                </span>
                                {c.isPlayer && <span className="font-mono text-xs text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded">YOU</span>}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="font-mono text-xs text-white/40">{c.role}</span>
                                {c.trustLevel != null && <><span className="w-1 h-1 rounded-full bg-white/20" /><span className="font-mono text-xs text-white/30">Trust: {c.trustLevel}%</span></>}
                                {c.emotionalState && <><span className="w-1 h-1 rounded-full bg-white/20" /><span className="font-mono text-xs text-white/25 italic">{c.emotionalState}</span></>}
                              </div>
                              {c.keyConcern && <p className="font-body text-xs text-white/25 mt-0.5">{c.keyConcern}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => startEditChar(c)} className="p-2 text-white/25 hover:text-brand-400 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteCharacter(c.id)} className="p-2 text-white/25 hover:text-rose-400 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Dialogue */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-white text-2xl">Character Dialogue</h2>
                <div className="flex gap-2">
                  <button onClick={addDialogueLine} className="btn-secondary text-sm gap-2"><Plus className="w-4 h-4" />Add Line</button>
                  <button onClick={saveDialogues} disabled={isSaving} className="btn-primary text-sm gap-2 disabled:opacity-50">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Dialogue
                  </button>
                </div>
              </div>
              <p className="font-mono text-xs text-white/30 mb-4">The conversation shown in the intro gallery. Select who speaks and type what they say.</p>
              <div className="space-y-3">
                {dialogues.length === 0
                  ? <div className="card p-8 text-center"><p className="font-body text-white/30 text-sm">No dialogue yet. Click Add Line to start.</p></div>
                  : dialogues.map((d, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="font-mono text-xs text-white/30">{i + 1}</span>
                      </div>
                      <select className="input bg-dark-700 text-sm w-48 flex-shrink-0"
                        value={d.characterId} onChange={e => updateDialogue(i, "characterId", e.target.value)}>
                        <option value="">Select character</option>
                        {characters.map(c => <option key={c.id} value={c.id}>{c.isPlayer ? "You (player)" : c.name} ({c.role})</option>)}
                      </select>
                      <input type="text" className="input text-sm flex-1" placeholder="What do they say?"
                        value={d.text} onChange={e => updateDialogue(i, "text", e.target.value)} />
                      <button onClick={() => removeDialogueLine(i)} className="p-2 text-white/20 hover:text-rose-400 transition-colors mt-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2 — VARIABLES (UPDATED WITH DROPDOWNS & USER TYPE FILTER)
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 2 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display font-bold text-white text-2xl">Simulation Variables</h2>
                <p className="font-mono text-xs text-white/30 mt-1">Add all variables first before adding questions.</p>
              </div>
              <button onClick={() => setShowVarForm(!showVarForm)} className="btn-primary text-sm gap-2">
                <Plus className="w-4 h-4" />Add Variable
              </button>
            </div>

            {showVarForm && (
              <div className="card border border-emerald-500/20 p-5 mb-6">
                <h3 className="font-display font-semibold text-white mb-4">New Variable</h3>
                <form onSubmit={createVariable} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    
                    {/* ✅ Variable Name - Dropdown with Custom Option */}
                    <div>
                      <label className="label text-xs">Variable Name (Select or Custom) *</label>
                      <select
                        className="input bg-dark-700 text-sm"
                        value={newVar.variableName || "CUSTOM"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "CUSTOM") {
                            setNewVar({ ...newVar, variableName: "", displayName: "" });
                          } else {
                            // Auto-fill display name from predefined list
                            const varMap: Record<string, string> = {
                              "ENGINEERING_TRUST": "Engineering Trust",
                              "USER_SATISFACTION": "User Satisfaction",
                              "BUDGET_HEALTH": "Budget Health",
                              "TEAM_MORALE": "Team Morale",
                              "STAKEHOLDER_ALIGNMENT": "Stakeholder Alignment",
                              "RISK_MANAGEMENT": "Risk Management",
                              "FINANCIAL_PRUDENCE": "Financial Prudence",
                              "LEADERSHIP_CREDIBILITY": "Leadership Credibility",
                              "STRATEGIC_CLARITY": "Strategic Clarity",
                              "CHURN_PROBABILITY": "Churn Probability",
                              "REVENUE_GROWTH": "Revenue Growth",
                              "CUSTOMER_ACQUISITION": "Customer Acquisition",
                            };
                            setNewVar({
                              ...newVar,
                              variableName: val,
                              displayName: varMap[val] || val.replace(/_/g, " "),
                            });
                          }
                        }}
                      >
                        <option value="CUSTOM">+ Add Custom Variable</option>
                        <option value="ENGINEERING_TRUST">Engineering Trust</option>
                        <option value="USER_SATISFACTION">User Satisfaction</option>
                        <option value="BUDGET_HEALTH">Budget Health</option>
                        <option value="TEAM_MORALE">Team Morale</option>
                        <option value="STAKEHOLDER_ALIGNMENT">Stakeholder Alignment</option>
                        <option value="RISK_MANAGEMENT">Risk Management</option>
                        <option value="FINANCIAL_PRUDENCE">Financial Prudence</option>
                        <option value="LEADERSHIP_CREDIBILITY">Leadership Credibility</option>
                        <option value="STRATEGIC_CLARITY">Strategic Clarity</option>
                        <option value="CHURN_PROBABILITY">Churn Probability</option>
                        <option value="REVENUE_GROWTH">Revenue Growth</option>
                        <option value="CUSTOMER_ACQUISITION">Customer Acquisition</option>
                      </select>
                    </div>

                    {/* ✅ Custom Variable Input (shows only if CUSTOM selected) */}
                    {!newVar.variableName && (
                      <div>
                        <label className="label text-xs">Custom Variable Name (KEY) *</label>
                        <input
                          type="text"
                          className="input text-sm border-2 border-emerald-500/30"
                          placeholder="e.g. CUSTOM_ENG_MORALE"
                          value={newVar.variableName || ""}
                          onChange={(e) =>
                            setNewVar({
                              ...newVar,
                              variableName: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                            })
                          }
                        />
                      </div>
                    )}

                    {/* ✅ Display Name (Auto-filled but editable) */}
                    <div>
                      <label className="label text-xs">Display Name *</label>
                      <input
                        type="text"
                        className="input text-sm"
                        placeholder="e.g. Engineering Trust"
                        value={newVar.displayName}
                        onChange={(e) => setNewVar({ ...newVar, displayName: e.target.value })}
                      />
                    </div>

                    {/* ✅ User Type Filter (NEW) */}
                    <div>
                      <label className="label text-xs">Target User Type</label>
                      <select
                        className="input bg-dark-700 text-sm"
                        value={newVar.userType || "STUDENT_EXPLORER"}
                        onChange={(e) => {
                          const userType = e.target.value;
                          setNewVar({ ...newVar, userType });
                          // Reset dimension when user type changes
                          setNewVar({ ...newVar, userType, scoringDimension: "CUSTOM" });
                        }}
                      >
                        <option value="STUDENT_EXPLORER">Student Explorer</option>
                        <option value="PLACEMENT_PREP">Placement Prep</option>
                        <option value="JUNIOR_PROFESSIONAL">Junior Professional</option>
                      </select>
                    </div>

                    {/* ✅ Scoring Dimension (Filtered by User Type) */}
                    <div>
                      <label className="label text-xs">Scoring Dimension *</label>
                      <select
                        className="input bg-dark-700 text-sm"
                        value={newVar.scoringDimension}
                        onChange={(e) => setNewVar({ ...newVar, scoringDimension: e.target.value })}
                      >
                        {/* Show dimensions based on user type */}
                        {newVar.userType === "STUDENT_EXPLORER" && (
                          <>
                            <option value="Product Pathfinder">Product Pathfinder</option>
                            <option value="Team Catalyst">Team Catalyst</option>
                            <option value="Stakeholder Liaison">Stakeholder Liaison</option>
                            <option value="Launch Driver">Launch Driver</option>
                            <option value="Viability Watchman">Viability Watchman</option>
                          </>
                        )}
                        {newVar.userType === "PLACEMENT_PREP" && (
                          <>
                            <option value="Case Architect">Case Architect</option>
                            <option value="Interview Captain">Interview Captain</option>
                            <option value="Panel Envoy">Panel Envoy</option>
                            <option value="Pressure Executor">Pressure Executor</option>
                            <option value="Consequence Guardian">Consequence Guardian</option>
                          </>
                        )}
                        {newVar.userType === "JUNIOR_PROFESSIONAL" && (
                          <>
                            <option value="Product Visionary">Product Visionary</option>
                            <option value="Executive Commander">Executive Commander</option>
                            <option value="Alliance Diplomat">Alliance Diplomat</option>
                            <option value="Enterprise Finisher">Enterprise Finisher</option>
                            <option value="Strategic Sentinel">Strategic Sentinel</option>
                          </>
                        )}
                        <option value="CUSTOM">Custom Dimension</option>
                      </select>
                    </div>

                    {/* Starting Value */}
                    <div>
                      <label className="label text-xs">Starting Value</label>
                      <input
                        type="number"
                        className="input text-sm"
                        placeholder="50"
                        value={newVar.startingValue}
                        onChange={(e) => setNewVar({ ...newVar, startingValue: e.target.value })}
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <label className="label text-xs">Unit</label>
                      <select
                        className="input bg-dark-700 text-sm"
                        value={newVar.unit}
                        onChange={(e) => setNewVar({ ...newVar, unit: e.target.value })}
                      >
                        <option value="%">Percent (%)</option>
                        <option value="pts">Points (pts)</option>
                        <option value="hrs">Hours (hrs)</option>
                        <option value="$">Currency ($)</option>
                        <option value="index">Index</option>
                      </select>
                    </div>

                    {/* Dimension Weight */}
                    <div>
                      <label className="label text-xs">Dimension Weight</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input text-sm"
                        placeholder="1.0"
                        value={newVar.dimensionWeight}
                        onChange={(e) => setNewVar({ ...newVar, dimensionWeight: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Higher is Better Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded"
                      checked={newVar.higherIsBetter}
                      onChange={(e) => setNewVar({ ...newVar, higherIsBetter: e.target.checked })}
                    />
                    <span className="font-body text-sm text-white/60">
                      Higher value is better (uncheck for Risk, Churn etc.)
                    </span>
                  </label>

                  <div className="flex gap-3">
                    <button type="submit" className="btn-primary text-sm">
                      Add Variable
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVarForm(false)}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Variables List (unchanged) */}
            <div className="space-y-2">
              {variables.length === 0 ? (
                <div className="card p-12 text-center">
                  <Activity className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="font-body text-white/30">No variables yet.</p>
                </div>
              ) : (
                variables.map((v) => (
                  <div key={v.id} className="card overflow-hidden">
                    {editVarId === v.id ? (
                      /* EDIT VARIABLE */
                      <div className="p-5 space-y-4 border border-emerald-500/20">
                        <div className="flex items-center justify-between">
                          <h4 className="font-display font-semibold text-white text-sm">
                            Editing Variable
                          </h4>
                          <button
                            onClick={() => setEditVarId(null)}
                            className="p-1 text-white/30 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <Field
                            label="Variable Name (key)"
                            value={editVar.variableName}
                            placeholder="CHURN_PROBABILITY"
                            onChange={(val: string) =>
                              setEditVar({
                                ...editVar,
                                variableName: val.toUpperCase().replace(/\s+/g, "_"),
                              })
                            }
                          />
                          <Field
                            label="Display Name"
                            value={editVar.displayName}
                            placeholder="Churn Probability"
                            onChange={(val: string) => setEditVar({ ...editVar, displayName: val })}
                          />
                          <Field
                            label="Starting Value"
                            type="number"
                            value={editVar.startingValue}
                            placeholder="50"
                            onChange={(val: string) => setEditVar({ ...editVar, startingValue: val })}
                          />
                          <Field
                            label="Unit"
                            value={editVar.unit}
                            placeholder="%"
                            onChange={(val: string) => setEditVar({ ...editVar, unit: val })}
                          />
                          <div>
                            <label className="label text-xs">Scoring Dimension</label>
                            <select
                              className="input bg-dark-700 text-sm"
                              value={editVar.scoringDimension}
                              onChange={(e) =>
                                setEditVar({ ...editVar, scoringDimension: e.target.value })
                              }
                            >
                              {SCORING_DIMS.map((d) => (
                                <option key={d} value={d}>
                                  {d.replace(/_/g, " ")}
                                </option>
                              ))}
                            </select>
                          </div>
                          <Field
                            label="Dimension Weight"
                            type="number"
                            value={editVar.dimensionWeight}
                            placeholder="1.0"
                            onChange={(val: string) =>
                              setEditVar({ ...editVar, dimensionWeight: val })
                            }
                          />
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded"
                            checked={editVar.higherIsBetter}
                            onChange={(e) =>
                              setEditVar({ ...editVar, higherIsBetter: e.target.checked })
                            }
                          />
                          <span className="font-body text-sm text-white/60">
                            Higher value is better
                          </span>
                        </label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => saveEditVar(v.id)}
                            className="btn-primary text-sm gap-2"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Save Changes
                          </button>
                          <button
                            onClick={() => setEditVarId(null)}
                            className="btn-secondary text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* VIEW VARIABLE */
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="font-display font-bold text-emerald-400 text-xs">
                              {v.startingValue}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display font-semibold text-white text-sm">
                                {v.displayName}
                              </span>
                              <span className="font-mono text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                                {v.unit}
                              </span>
                              {!v.higherIsBetter && (
                                <span className="font-mono text-xs text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                  ↓ lower is better
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="font-mono text-xs text-white/30">
                                {v.variableName}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-white/20" />
                              <span className="font-mono text-xs text-white/30">
                                {v.scoringDimension?.replace(/_/g, " ") || "CUSTOM"}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-white/20" />
                              <span className="font-mono text-xs text-white/30">
                                weight: {v.dimensionWeight}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEditVar(v)}
                            className="p-2 text-white/25 hover:text-brand-400 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteVariable(v.id)}
                            className="p-2 text-white/25 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3 — SCORING DIMENSIONS
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 3 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display font-bold text-white text-2xl">Scoring Dimensions</h2>
                <p className="font-mono text-xs text-white/30 mt-1">Performance dimensions shown in the results dashboard.</p>
              </div>
              <button onClick={() => setShowDimForm(!showDimForm)} className="btn-primary text-sm gap-2"><Plus className="w-4 h-4" />Add Dimension</button>
            </div>

            {showDimForm && (
              <div className="card border border-brand-500/20 p-5 mb-6">
                <h3 className="font-display font-semibold text-white mb-4">New Scoring Dimension</h3>
                <form onSubmit={createDimension} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Dimension Key *</label>
                      <select className="input bg-dark-700" value={newDim.dimensionKey}
                        onChange={e => setNewDim({ ...newDim, dimensionKey: e.target.value })}>
                        <option value="">Select dimension</option>
                        {SCORING_DIMS.filter(d => d !== "CUSTOM").map(d => <option key={d} value={d}>{d.replace(/_/g," ")}</option>)}
                      </select>
                    </div>
                    <Field label="Display Name *" value={newDim.displayName} placeholder="e.g. Financial Discipline"
                      onChange={(v: string) => setNewDim({ ...newDim, displayName: v })} />
                  </div>
                  <Field label="Description" value={newDim.description} placeholder="What does this dimension measure?"
                    onChange={(v: string) => setNewDim({ ...newDim, description: v })} />
                  <div className="flex gap-3">
                    <button type="submit" className="btn-primary text-sm">Add Dimension</button>
                    <button type="button" onClick={() => setShowDimForm(false)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-2">
              {scoringDims.length === 0
                ? <div className="card p-12 text-center"><Target className="w-12 h-12 text-white/20 mx-auto mb-4" /><p className="font-body text-white/30">No scoring dimensions yet.</p></div>
                : scoringDims.map(d => (
                  <div key={d.id} className="card overflow-hidden">
                    {editDimId === d.id ? (
                      /* EDIT DIMENSION */
                      <div className="p-5 space-y-4 border border-brand-500/20">
                        <div className="flex items-center justify-between">
                          <h4 className="font-display font-semibold text-white text-sm">Editing Dimension</h4>
                          <button onClick={() => setEditDimId(null)} className="p-1 text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="label text-xs">Dimension Key</label>
                            <select className="input bg-dark-700 text-sm" value={editDim.dimensionKey}
                              onChange={e => setEditDim({ ...editDim, dimensionKey: e.target.value })}>
                              {SCORING_DIMS.filter(sd => sd !== "CUSTOM").map(sd => <option key={sd} value={sd}>{sd.replace(/_/g," ")}</option>)}
                            </select>
                          </div>
                          <Field label="Display Name" value={editDim.displayName} placeholder="Financial Discipline"
                            onChange={(v: string) => setEditDim({ ...editDim, displayName: v })} />
                        </div>
                        <Field label="Description" value={editDim.description} placeholder="What does this measure?"
                          onChange={(v: string) => setEditDim({ ...editDim, description: v })} />
                        <div className="flex gap-3">
                          <button onClick={() => saveEditDim(d.id)} className="btn-primary text-sm gap-2"><Check className="w-3.5 h-3.5" />Save Changes</button>
                          <button onClick={() => setEditDimId(null)} className="btn-secondary text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      /* VIEW DIMENSION */
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <span className="font-display font-semibold text-white text-sm">{d.displayName}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-xs text-white/30">{d.dimensionKey}</span>
                            {d.description && <><span className="w-1 h-1 rounded-full bg-white/20" /><span className="font-mono text-xs text-white/30">{d.description}</span></>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => startEditDim(d)} className="p-2 text-white/25 hover:text-brand-400 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteDimension(d.id)} className="p-2 text-white/25 hover:text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4 — QUESTIONS
        ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 4 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display font-bold text-white text-2xl">Questions</h2>
                <p className="font-mono text-xs text-white/30 mt-1">{questions.length}/25 questions. Each needs exactly 6 options.</p>
              </div>
              <button onClick={() => setShowQForm(!showQForm)} disabled={questions.length >= 25}
                className="btn-primary text-sm gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" />Add Question
              </button>
            </div>

            {variables.length === 0 && (
              <div className="card border border-amber-500/20 p-4 mb-6 flex items-center gap-3">
                <span className="text-amber-400 text-lg">⚠️</span>
                <p className="font-body text-sm text-amber-300">Add variables first before adding options. Go to the Variables tab.</p>
              </div>
            )}

            {showQForm && (
              <div className="card border border-brand-500/20 p-5 mb-6">
                <h3 className="font-display font-semibold text-white mb-4">Add Question {questions.length + 1}</h3>
                <form onSubmit={createQuestion} className="space-y-4">
                  <Field label="Decision Tag" value={newQ.tag} placeholder="e.g. CHURN PREVENTION" onChange={(v: string) => setNewQ({ ...newQ, tag: v })} />
                  <Field label="Situation Update" value={newQ.situationUpdate} rows={2} placeholder="What just happened?" onChange={(v: string) => setNewQ({ ...newQ, situationUpdate: v })} />
                  <Field label="Decision Question *" value={newQ.questionText} rows={2} placeholder="The question the player must answer..." onChange={(v: string) => setNewQ({ ...newQ, questionText: v })} />
                  <Field label="Additional Context" value={newQ.context} rows={2} placeholder="Any numbers or context the player should know..." onChange={(v: string) => setNewQ({ ...newQ, context: v })} />
                  <div className="flex gap-3">
                    <button type="submit" className="btn-primary text-sm">Add Question</button>
                    <button type="button" onClick={() => setShowQForm(false)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-4">
              {questions.length === 0
                ? <div className="card p-12 text-center"><HelpCircle className="w-12 h-12 text-white/20 mx-auto mb-4" /><p className="font-body text-white/30">No questions yet.</p></div>
                : questions.map((q, qi) => (
                  <div key={q.id} className="card overflow-hidden">

                    {/* Question header row */}
                    <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}>
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                          <span className="font-mono text-sm text-brand-400 font-bold">{qi + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {q.tag && <span className="font-mono text-xs text-brand-400/70 bg-brand-500/10 px-2 py-0.5 rounded mr-2">{q.tag}</span>}
                          <p className="font-display font-semibold text-white text-sm mt-1 truncate">{q.questionText}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-xs text-white/30">{q.options?.length || 0}/6 options</span>
                            {(q.options?.length || 0) === 6 && <span className="font-mono text-xs text-emerald-400">✓ Complete</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); startEditQ(q); setExpandedQ(q.id); }}
                          className="p-2 text-white/25 hover:text-brand-400 transition-colors" title="Edit question">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteQuestion(q.id); }}
                          className="p-2 text-white/25 hover:text-rose-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {expandedQ === q.id ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                      </div>
                    </div>

                    {/* Expanded body */}
                    {expandedQ === q.id && (
                      <div className="border-t border-white/[0.06] p-5 space-y-5">

                        {/* Inline edit question */}
                        {editQId === q.id && (
                          <div className="card border border-brand-500/20 p-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-display font-semibold text-white text-sm">Edit Question {qi + 1}</h4>
                              <button onClick={() => setEditQId(null)} className="p-1 text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <Field label="Decision Tag" value={editQ.tag} placeholder="e.g. CHURN PREVENTION" onChange={(v: string) => setEditQ({ ...editQ, tag: v })} />
                            <Field label="Situation Update" value={editQ.situationUpdate} rows={2} placeholder="What just happened?" onChange={(v: string) => setEditQ({ ...editQ, situationUpdate: v })} />
                            <Field label="Question Text *" value={editQ.questionText} rows={2} placeholder="The decision question..." onChange={(v: string) => setEditQ({ ...editQ, questionText: v })} />
                            <Field label="Context" value={editQ.context} rows={2} placeholder="Additional context..." onChange={(v: string) => setEditQ({ ...editQ, context: v })} />
                            <div className="flex gap-3">
                              <button onClick={() => saveEditQ(q.id)} className="btn-primary text-sm gap-2"><Check className="w-3.5 h-3.5" />Save Changes</button>
                              <button onClick={() => setEditQId(null)} className="btn-secondary text-sm">Cancel</button>
                            </div>
                          </div>
                        )}

                        {/* Read-only context blocks */}
                        {editQId !== q.id && (
                          <>
                            {q.situationUpdate && <div className="bg-dark-700 rounded-lg p-3"><p className="font-mono text-xs text-white/40 uppercase mb-1">Situation Update</p><p className="font-body text-sm text-white/60">{q.situationUpdate}</p></div>}
                            {q.context && <div className="bg-dark-700 rounded-lg p-3"><p className="font-mono text-xs text-white/40 uppercase mb-1">Context</p><p className="font-body text-sm text-white/60">{q.context}</p></div>}
                          </>
                        )}

                        {/* Options list */}
                        <h4 className="font-display font-semibold text-white text-sm">Options ({q.options?.length || 0}/6)</h4>
                        <div className="space-y-2">
                          {q.options?.map((opt: any) => (
                            <div key={opt.id}>
                              {editOptId === opt.id ? (
                                /* EDIT OPTION */
                                <div className="border border-brand-500/25 rounded-xl p-4 space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h5 className="font-display font-semibold text-white text-sm">Edit Option {opt.optionLabel}</h5>
                                    <button onClick={() => setEditOptId(null)} className="p-1 text-white/30 hover:text-white"><X className="w-4 h-4" /></button>
                                  </div>
                                  <div className="grid md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="label text-xs">Option Label</label>
                                      <select className="input bg-dark-700 text-sm" value={editOpt.optionLabel}
                                        onChange={e => setEditOpt({ ...editOpt, optionLabel: e.target.value })}>
                                        {OPTION_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                                      </select>
                                    </div>
                                    <Field label="Strategy Tag" value={editOpt.strategyTag} placeholder="e.g. Risk-Averse"
                                      onChange={(v: string) => setEditOpt({ ...editOpt, strategyTag: v })} />
                                  </div>
                                  <Field label="Title *" value={editOpt.title} placeholder="Short title"
                                    onChange={(v: string) => setEditOpt({ ...editOpt, title: v })} />
                                  <Field label="Description *" value={editOpt.description} rows={2} placeholder="What does this option involve?"
                                    onChange={(v: string) => setEditOpt({ ...editOpt, description: v })} />
                                  <div>
                                    <label className="label text-xs">Impact on Variables</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                                      {editOpt.impacts?.map((imp: any) => {
                                        const delta = imp.delta ?? 0;
                                        return (
                                          <div key={imp.variableId}>
                                            <label className="font-mono text-xs mb-1 flex items-center justify-between">
                                              <span className="text-white/50 truncate max-w-[80px]">{imp.variableName}</span>
                                              <span className={`text-xs font-bold ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-white/20"}`}>
                                                {delta > 0 ? `+${delta}` : delta}
                                              </span>
                                            </label>
                                            <input type="number" placeholder="0" step="1"
                                              className={`input text-sm py-1.5 text-center transition-colors ${delta > 0 ? "border-emerald-500/30 bg-emerald-500/5" : delta < 0 ? "border-rose-500/30 bg-rose-500/5" : ""}`}
                                              value={delta === 0 ? "" : delta}
                                              onChange={e => updateEditImpact(imp.variableId, parseFloat(e.target.value) || 0)} />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => saveEditOpt(q.id, opt.id)} className="btn-primary text-sm gap-2"><Check className="w-3.5 h-3.5" />Save Option</button>
                                    <button onClick={() => setEditOptId(null)} className="btn-secondary text-sm">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                /* VIEW OPTION */
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/[0.06]">
                                  <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                                    <span className="font-mono text-xs text-brand-400 font-bold">{opt.optionLabel}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-display font-semibold text-white text-sm">{opt.title}</p>
                                    <p className="font-body text-xs text-white/50 mt-0.5">{opt.description}</p>
                                    {opt.strategyTag && <span className="inline-block mt-1 font-mono text-xs text-brand-400/70 bg-brand-500/5 border border-brand-500/10 px-2 py-0.5 rounded">{opt.strategyTag}</span>}
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {opt.impacts?.filter((i: any) => i.delta !== 0).map((i: any) => (
                                        <span key={i.id} className={`font-mono text-xs px-1.5 py-0.5 rounded ${i.delta > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                                          {i.variable?.variableName || i.variableName}: {i.delta > 0 ? "+" : ""}{i.delta}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => startEditOpt(opt)} className="p-1.5 text-white/20 hover:text-brand-400 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deleteOption(q.id, opt.id)} className="p-1.5 text-white/20 hover:text-rose-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add new option form */}
                        {(q.options?.length || 0) < 6 && (
                          !newOptionForms[q.id] ? (
                            <button onClick={() => initOptionForm(q.id, q.options?.length || 0)}
                              className="btn-secondary text-xs gap-2 w-full justify-center py-2.5">
                              <Plus className="w-3.5 h-3.5" />Add Option {OPTION_LABELS[q.options?.length || 0]}
                            </button>
                          ) : (
                            <div className="border border-brand-500/20 rounded-xl p-4 space-y-4">
                              <h5 className="font-display font-semibold text-white text-sm">New Option {newOptionForms[q.id]?.optionLabel}</h5>
                              <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                  <label className="label text-xs">Option Label</label>
                                  <select className="input bg-dark-700 text-sm" value={newOptionForms[q.id]?.optionLabel}
                                    onChange={e => setNewOptionForms(prev => ({ ...prev, [q.id]: { ...prev[q.id], optionLabel: e.target.value } }))}>
                                    {OPTION_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                                  </select>
                                </div>
                                <Field label="Strategy Tag" value={newOptionForms[q.id]?.strategyTag} placeholder="e.g. Risk-Averse"
                                  onChange={(v: string) => setNewOptionForms(prev => ({ ...prev, [q.id]: { ...prev[q.id], strategyTag: v } }))} />
                              </div>
                              <Field label="Title *" value={newOptionForms[q.id]?.title} placeholder="Short title for this option"
                                onChange={(v: string) => setNewOptionForms(prev => ({ ...prev, [q.id]: { ...prev[q.id], title: v } }))} />
                              <Field label="Description *" value={newOptionForms[q.id]?.description} rows={2} placeholder="What does this option involve?"
                                onChange={(v: string) => setNewOptionForms(prev => ({ ...prev, [q.id]: { ...prev[q.id], description: v } }))} />
                              <div>
                                <label className="label text-xs">Impact on Variables</label>
                                <p className="font-mono text-xs text-white/30 mb-3">Positive = increase. Negative = decrease. Zero = no change.</p>
                                {variables.length === 0
                                  ? <p className="font-mono text-xs text-amber-400">No variables yet. Go to Variables tab first.</p>
                                  : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                      {variables.map(v => {
                                        const delta = newOptionForms[q.id]?.impacts?.find((i: any) => i.variableId === v.id)?.delta || 0;
                                        return (
                                          <div key={v.id}>
                                            <label className="font-mono text-xs mb-1 flex items-center justify-between">
                                              <span className="text-white/60 truncate max-w-[80px]">{v.variableName}</span>
                                              <span className={`text-xs font-bold ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-white/20"}`}>
                                                {delta > 0 ? `+${delta}` : delta < 0 ? delta : "0"}
                                              </span>
                                            </label>
                                            <input type="number" placeholder="0" step="1"
                                              className={`input text-sm py-1.5 text-center transition-colors ${delta > 0 ? "border-emerald-500/30 bg-emerald-500/5" : delta < 0 ? "border-rose-500/30 bg-rose-500/5" : ""}`}
                                              value={delta === 0 ? "" : delta}
                                              onChange={e => updateImpact(q.id, v.id, parseFloat(e.target.value) || 0)} />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )
                                }
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => createOption(q.id)} className="btn-primary text-sm gap-2"><Save className="w-3.5 h-3.5" />Save Option</button>
                                <button onClick={() => setNewOptionForms(prev => { const n = { ...prev }; delete n[q.id]; return n; })} className="btn-secondary text-sm">Cancel</button>
                              </div>
                            </div>
                          )
                        )}

                        {(q.options?.length || 0) >= 6 && (
                          <div className="text-center py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                            <span className="font-mono text-xs text-emerald-400 flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5" />All 6 options complete
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        )}
      </main>
    </div>
  );
}