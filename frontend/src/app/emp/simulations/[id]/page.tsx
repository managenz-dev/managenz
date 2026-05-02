"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Send, Plus, Trash2, ChevronDown, ChevronUp,
  Loader2, Check, AlertCircle, BookOpen, Users, BarChart3,
  MessageSquare, HelpCircle, CheckCircle2, FileText, Eye,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const G = "#5a7f2e";
const OPTION_LABELS    = ["A", "B", "C", "D", "E", "F"];
const MSG_TYPES        = ["CHAT", "EMAIL", "SLACK", "WHATSAPP"];
const DIFFICULTY_LEVELS= ["FOUNDATIONAL", "INTERMEDIATE", "ADVANCED"];
const USER_TYPE_OPTS   = [
  { value: "", label: "All Types" },
  { value: "STUDENT_EXPLORER",   label: "Student Explorer" },
  { value: "PLACEMENT_PREP",     label: "Placement Prep" },
  { value: "JUNIOR_PROFESSIONAL",label: "Junior Professional" },
];
const SCORE_DIMS = [
  "FINANCIAL_PRUDENCE","STAKEHOLDER_ALIGNMENT","RISK_MANAGEMENT",
  "LEADERSHIP_CREDIBILITY","TEAM_MORALE","STRATEGIC_CLARITY","CUSTOM",
];
const TABS = [
  { key: "meta",          label: "Metadata",      icon: FileText },
  { key: "story",         label: "Story",         icon: BookOpen },
  { key: "variables",     label: "Variables",     icon: BarChart3 },
  { key: "characters",    label: "Characters",    icon: Users },
  { key: "conversations", label: "Conversations", icon: MessageSquare },
  { key: "decisions",     label: "Decisions",     icon: HelpCircle },
  { key: "review",        label: "Review",        icon: CheckCircle2 },
] as const;
type TabKey = typeof TABS[number]["key"];

// ─── Field components ─────────────────────────────────────────────────────────
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent bg-white placeholder:text-slate-400";
const textareaCls = inputCls + " resize-none";

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      {title && <h3 className="text-sm font-bold text-slate-900 mb-4">{title}</h3>}
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export default function SimulationBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const simId  = params?.id as string | undefined;
  const isNew  = !simId;

  const [emp,  setEmp]  = useState<any>(null);
  const [sim,  setSim]  = useState<any>(null);
  const [tab,  setTab]  = useState<TabKey>("meta");
  const [loading,  setLoading]  = useState(!isNew);
  const [saving,   setSaving]   = useState(false);
  const [submitting,setSubmitting] = useState(false);

  const [domains,   setDomains]   = useState<any[]>([]);
  const [variables, setVariables] = useState<any[]>([]);
  const [characters,setCharacters]= useState<any[]>([]);
  const [conversations,setConvos] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);

  const isAdmin    = emp?.role === "ADMIN";
  const isLocked   = sim?.status && sim.status !== "DRAFT";
  // Employees can only CREATE — they cannot edit approved/submitted/rejected sims
  // Admins can always edit
  const canEdit    = isAdmin || (!isLocked);

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/emp/me").then(r => setEmp(r.data.data)).catch(() => router.push("/emp/login"));
    api.get("/emp/domains").then(r => setDomains(r.data.data)).catch(() => {});
    if (simId) loadSim(simId);
  }, [simId]);

  const loadSim = async (id: string) => {
    try {
      const res = await api.get(`/emp/simulations/${id}`);
      const d   = res.data.data;
      setSim(d);
      setVariables(d.variables || []);
      setCharacters(d.characters || []);
      setConvos(d.conversations || []);
      setDecisions(d.decisions || []);
    } catch { toast.error("Could not load simulation"); router.push("/emp/simulations"); }
    finally { setLoading(false); }
  };

  // ── Meta form ──────────────────────────────────────────────────────────────
  const [meta, setMeta] = useState({
    domainId: "", title: "", description: "", difficultyLevel: "FOUNDATIONAL",
    userTypeTarget: "", estimatedMinutes: "30", isPremium: false, openingScene: "",
  });

  useEffect(() => {
    if (sim) setMeta({
      domainId:        sim.domainId        || "",
      title:           sim.title           || "",
      description:     sim.description     || "",
      difficultyLevel: sim.difficultyLevel || "FOUNDATIONAL",
      userTypeTarget:  sim.userTypeTarget  || "",
      estimatedMinutes:String(sim.estimatedMinutes || 30),
      isPremium:       !!sim.isPremium,
      openingScene:    sim.openingScene    || "",
    });
  }, [sim]);

  const saveMeta = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const res = await api.post("/emp/simulations", meta);
        const newId = res.data.data.id;
        toast.success("Simulation created");
        router.push(`/emp/simulations/${newId}`);
      } else {
        await api.patch(`/emp/simulations/${simId}`, meta);
        toast.success("Metadata saved");
        loadSim(simId!);
      }
    } catch (e: any) { toast.error(e?.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  // ── Story form ─────────────────────────────────────────────────────────────
  const [story, setStory] = useState({
    companyBackground: "", closingChallenge: "", howItWorks: "",
    arrivalContext: "", incomingMessages: "", seniorStatement: "",
  });

  useEffect(() => {
    if (sim?.story) setStory({
      companyBackground: sim.story.companyBackground || "",
      closingChallenge:  sim.story.closingChallenge  || "",
      howItWorks:        sim.story.howItWorks        || "",
      arrivalContext:    sim.story.arrivalContext     || "",
      incomingMessages:  sim.story.incomingMessages  || "",
      seniorStatement:   sim.story.seniorStatement   || "",
    });
  }, [sim]);

  const saveStory = async () => {
    if (!simId) { toast.error("Create simulation first"); return; }
    setSaving(true);
    try {
      await api.post(`/emp/simulations/${simId}/story`, story);
      toast.success("Story saved");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  // ── Variables ──────────────────────────────────────────────────────────────
  const [varForm, setVarForm] = useState({
    variableName: "", displayName: "", startingValue: "50",
    unit: "%", higherIsBetter: true, scoringDimension: "CUSTOM", dimensionWeight: "1.0",
  });

  const addVariable = async () => {
    if (!varForm.variableName || !varForm.displayName) { toast.error("Name and display name required"); return; }
    try {
      const res = await api.post(`/emp/simulations/${simId}/variables`, varForm);
      setVariables(v => [...v, res.data.data]);
      setVarForm({ variableName: "", displayName: "", startingValue: "50", unit: "%", higherIsBetter: true, scoringDimension: "CUSTOM", dimensionWeight: "1.0" });
      toast.success("Variable added");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed"); }
  };

  const deleteVariable = async (id: string) => {
    try {
      await api.delete(`/emp/variables/${id}`);
      setVariables(v => v.filter(x => x.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed to delete"); }
  };

  // ── Characters ─────────────────────────────────────────────────────────────
  const [charForm, setCharForm] = useState({
    name: "", role: "", trustLevel: "70", emotionalState: "", keyConcern: "", isPlayer: false,
  });

  const addCharacter = async () => {
    if (!charForm.name) { toast.error("Name required"); return; }
    try {
      const res = await api.post(`/emp/simulations/${simId}/characters`, charForm);
      setCharacters(c => [...c, res.data.data]);
      setCharForm({ name: "", role: "", trustLevel: "70", emotionalState: "", keyConcern: "", isPlayer: false });
      toast.success("Character added");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed"); }
  };

  const deleteCharacter = async (id: string) => {
    try {
      await api.delete(`/emp/characters/${id}`);
      setCharacters(c => c.filter(x => x.id !== id));
      toast.success("Deleted");
    } catch { toast.error("Failed"); }
  };

  // ── Conversations ──────────────────────────────────────────────────────────
  const addConversation = async () => {
    try {
      const res = await api.post(`/emp/simulations/${simId}/conversations`, {
        title: `Conversation ${conversations.length + 1}`,
        sequenceOrder: conversations.length + 1,
      });
      setConvos(c => [...c, res.data.data]);
    } catch { toast.error("Failed"); }
  };

  const deleteConversation = async (id: string) => {
    try {
      await api.delete(`/emp/conversations/${id}`);
      setConvos(c => c.filter(x => x.id !== id));
    } catch { toast.error("Failed"); }
  };

  const addMessage = async (convoId: string, msg: any) => {
    try {
      const res = await api.post(`/emp/conversations/${convoId}/messages`, msg);
      setConvos(c => c.map(cv =>
        cv.id === convoId ? { ...cv, messages: [...(cv.messages || []), res.data.data] } : cv
      ));
    } catch { toast.error("Failed to add message"); }
  };

  const deleteMessage = async (convoId: string, msgId: string) => {
    try {
      await api.delete(`/emp/messages/${msgId}`);
      setConvos(c => c.map(cv =>
        cv.id === convoId ? { ...cv, messages: cv.messages.filter((m: any) => m.id !== msgId) } : cv
      ));
    } catch { toast.error("Failed"); }
  };

  // ── Decisions ──────────────────────────────────────────────────────────────
  const [decForm, setDecForm] = useState({
    questionText: "", situationUpdate: "", tag: "", weekLabel: "",
    contextNote: "", charactersPresent: "",
  });

  const addDecision = async () => {
    if (!decForm.questionText) { toast.error("Question text required"); return; }
    try {
      const res = await api.post(`/emp/simulations/${simId}/decisions`, {
        ...decForm,
        charactersPresent: decForm.charactersPresent.split(",").map(s => s.trim()).filter(Boolean),
        sequenceOrder: decisions.length + 1,
      });
      setDecisions(d => [...d, { ...res.data.data, options: [] }]);
      setDecForm({ questionText: "", situationUpdate: "", tag: "", weekLabel: "", contextNote: "", charactersPresent: "" });
      toast.success("Decision added");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed"); }
  };

  const deleteDecision = async (id: string) => {
    try {
      await api.delete(`/emp/decisions/${id}`);
      setDecisions(d => d.filter(x => x.id !== id));
      toast.success("Decision deleted");
    } catch { toast.error("Failed"); }
  };

  const addOption = async (decisionId: string, opt: any) => {
    const dec  = decisions.find(d => d.id === decisionId);
    if (dec?.options?.length >= 6) { toast.error("Max 6 options"); return; }
    if (!opt.title || !opt.consequenceText) { toast.error("Title and consequence required"); return; }
    try {
      const res = await api.post(`/emp/decisions/${decisionId}/options`, opt);
      setDecisions(d => d.map(dec =>
        dec.id === decisionId ? { ...dec, options: [...(dec.options || []), res.data.data] } : dec
      ));
      toast.success("Option added");
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed"); }
  };

  const deleteOption = async (decisionId: string, optionId: string) => {
    try {
      await api.delete(`/emp/options/${optionId}`);
      setDecisions(d => d.map(dec =>
        dec.id === decisionId ? { ...dec, options: dec.options.filter((o: any) => o.id !== optionId) } : dec
      ));
    } catch { toast.error("Failed"); }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!confirm("Submit this simulation for review? You cannot edit it after submission.")) return;
    setSubmitting(true);
    try {
      await api.post(`/emp/simulations/${simId}/submit`);
      toast.success("Submitted for review!");
      loadSim(simId!);
    } catch (e: any) {
      const errs = e?.response?.data?.errors;
      if (errs?.length) errs.forEach((err: string) => toast.error(err));
      else toast.error(e?.response?.data?.message || "Submission failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: G }}/>
    </div>
  );

  return (
    <div className="p-4 xl:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/emp/simulations"
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-4 h-4"/>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate">
            {isNew ? "New Simulation" : (sim?.title || "Simulation Builder")}
          </h1>
          {sim?.status && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono uppercase ${
                sim.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                sim.status === "SUBMITTED" ? "bg-amber-100 text-amber-700" :
                sim.status === "REJECTED" ? "bg-rose-100 text-rose-700" :
                "bg-slate-100 text-slate-600"
              }`}>{sim.status}</span>
              {isLocked && !isAdmin && (
                <span className="text-[10px] text-slate-400">Read-only after submission</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && !isNew && (
            <button onClick={() => tab === "meta" ? saveMeta() : tab === "story" ? saveStory() : null}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
              Save
            </button>
          )}
          {!isNew && sim?.status === "DRAFT" && !isAdmin && (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: G }}>
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Send className="w-3.5 h-3.5"/>}
              Submit for Review
            </button>
          )}
          {isAdmin && !isNew && sim?.status === "SUBMITTED" && (
            <>
              <button onClick={() => api.post(`/emp/simulations/${simId}/approve`).then(() => { toast.success("Approved"); loadSim(simId!); }).catch(() => toast.error("Failed"))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all">
                <Check className="w-3.5 h-3.5"/> Approve
              </button>
              <button onClick={() => { const r = prompt("Rejection reason:"); if(r) api.post(`/emp/simulations/${simId}/reject`, {reason:r}).then(() => { toast.success("Rejected"); loadSim(simId!); }).catch(() => toast.error("Failed")); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-all">
                Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto mb-6 bg-white border border-slate-200 rounded-2xl p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key as TabKey)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              tab === key ? "text-white shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            style={tab === key ? { background: G } : {}}>
            <Icon className="w-3.5 h-3.5"/>
            {label}
          </button>
        ))}
      </div>

      {/* ── METADATA TAB ─────────────────────────────────────────────────────── */}
      {tab === "meta" && (
        <div className="space-y-4">
          <Section title="Simulation Details">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Domain" required>
                <select value={meta.domainId} onChange={e => setMeta(m => ({ ...m, domainId: e.target.value }))}
                  disabled={!canEdit}
                  className={inputCls}>
                  <option value="">Select domain…</option>
                  {domains.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Difficulty" required>
                <select value={meta.difficultyLevel} onChange={e => setMeta(m => ({ ...m, difficultyLevel: e.target.value }))}
                  disabled={!canEdit} className={inputCls}>
                  {DIFFICULTY_LEVELS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Title" required>
                <input value={meta.title} onChange={e => setMeta(m => ({ ...m, title: e.target.value }))}
                  disabled={!canEdit} placeholder="e.g. The Founding PM" className={inputCls}/>
              </Field>
              <Field label="Estimated Minutes">
                <input type="number" value={meta.estimatedMinutes} onChange={e => setMeta(m => ({ ...m, estimatedMinutes: e.target.value }))}
                  disabled={!canEdit} className={inputCls} min="5" max="120"/>
              </Field>
              <Field label="User Type Target">
                <select value={meta.userTypeTarget} onChange={e => setMeta(m => ({ ...m, userTypeTarget: e.target.value }))}
                  disabled={!canEdit} className={inputCls}>
                  {USER_TYPE_OPTS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </Field>
              <Field label="Premium">
                <div className="flex items-center gap-3 pt-2">
                  <button onClick={() => canEdit && setMeta(m => ({ ...m, isPremium: !m.isPremium }))}
                    disabled={!canEdit}
                    className={`relative w-10 h-5 rounded-full transition-colors ${meta.isPremium ? "" : "bg-slate-200"}`}
                    style={meta.isPremium ? { background: G } : {}}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${meta.isPremium ? "translate-x-5" : "translate-x-0.5"}`}/>
                  </button>
                  <span className="text-sm text-slate-700">{meta.isPremium ? "Premium only" : "Free"}</span>
                </div>
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Description" required>
                <textarea value={meta.description} onChange={e => setMeta(m => ({ ...m, description: e.target.value }))}
                  disabled={!canEdit} rows={3} placeholder="Brief simulation description…" className={textareaCls}/>
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Opening Scene Text">
                <textarea value={meta.openingScene || ""} onChange={e => setMeta(m => ({ ...m, openingScene: e.target.value }))}
                  disabled={!canEdit} rows={3} placeholder="Brief context shown to the player before starting…" className={textareaCls}/>
              </Field>
            </div>
          </Section>

          {canEdit && (
            <button onClick={saveMeta} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: G }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              {isNew ? "Create Simulation" : "Save Metadata"}
            </button>
          )}
        </div>
      )}

      {/* ── STORY TAB ────────────────────────────────────────────────────────── */}
      {tab === "story" && simId && (
        <div className="space-y-4">
          <Section title="Company Background (Carousel Slide 1)">
            <div className="space-y-4">
              <Field label="Company Background" required>
                <textarea value={story.companyBackground} onChange={e => setStory(s => ({ ...s, companyBackground: e.target.value }))}
                  disabled={!canEdit} rows={4} placeholder="The company's story, context, and what's at stake…" className={textareaCls}/>
              </Field>
              <Field label="Closing Challenge">
                <textarea value={story.closingChallenge || ""} onChange={e => setStory(s => ({ ...s, closingChallenge: e.target.value }))}
                  disabled={!canEdit} rows={2} placeholder="Your challenge is…" className={textareaCls}/>
              </Field>
              <Field label="How It Works">
                <textarea value={story.howItWorks || ""} onChange={e => setStory(s => ({ ...s, howItWorks: e.target.value }))}
                  disabled={!canEdit} rows={2} placeholder="Explain the simulation mechanics…" className={textareaCls}/>
              </Field>
            </div>
          </Section>

          <Section title="Opening Scene (Shown before first decision)">
            <div className="space-y-4">
              <Field label="Arrival Context (Block 1)">
                <textarea value={story.arrivalContext || ""} onChange={e => setStory(s => ({ ...s, arrivalContext: e.target.value }))}
                  disabled={!canEdit} rows={3} placeholder="Player arrives — something is in motion…" className={textareaCls}/>
              </Field>
              <Field label="Incoming Messages (Block 2)">
                <textarea value={story.incomingMessages || ""} onChange={e => setStory(s => ({ ...s, incomingMessages: e.target.value }))}
                  disabled={!canEdit} rows={4} placeholder="Slack/email messages the player receives…" className={textareaCls}/>
              </Field>
              <Field label="Senior Statement (Block 3)">
                <textarea value={story.seniorStatement || ""} onChange={e => setStory(s => ({ ...s, seniorStatement: e.target.value }))}
                  disabled={!canEdit} rows={2} placeholder="Senior stakeholder speaks directly to the player…" className={textareaCls}/>
              </Field>
            </div>
          </Section>

          {canEdit && (
            <button onClick={saveStory} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: G }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              Save Story
            </button>
          )}
        </div>
      )}

      {/* ── VARIABLES TAB ─────────────────────────────────────────────────────── */}
      {tab === "variables" && simId && (
        <div className="space-y-4">
          {/* Existing variables */}
          {variables.length > 0 && (
            <Section title={`Variables (${variables.length})`}>
              <div className="space-y-2">
                {variables.map(v => (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{v.displayName}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {v.variableName} · Start: {v.startingValue}{v.unit} · {v.scoringDimension} · Weight: {v.dimensionWeight}
                      </p>
                    </div>
                    {canEdit && (
                      <button onClick={() => deleteVariable(v.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Add variable form */}
          {canEdit && (
            <Section title="Add Variable">
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <Field label="Variable Name (code key)">
                  <input value={varForm.variableName} onChange={e => setVarForm(f => ({ ...f, variableName: e.target.value.toUpperCase() }))}
                    placeholder="TEAM_MORALE" className={inputCls}/>
                </Field>
                <Field label="Display Name">
                  <input value={varForm.displayName} onChange={e => setVarForm(f => ({ ...f, displayName: e.target.value }))}
                    placeholder="Team Morale" className={inputCls}/>
                </Field>
                <Field label="Starting Value">
                  <input type="number" value={varForm.startingValue} onChange={e => setVarForm(f => ({ ...f, startingValue: e.target.value }))}
                    className={inputCls} min="0" max="100"/>
                </Field>
                <Field label="Unit">
                  <input value={varForm.unit} onChange={e => setVarForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="%" className={inputCls}/>
                </Field>
                <Field label="Scoring Dimension">
                  <select value={varForm.scoringDimension} onChange={e => setVarForm(f => ({ ...f, scoringDimension: e.target.value }))}
                    className={inputCls}>
                    {SCORE_DIMS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Weight">
                  <input type="number" step="0.1" value={varForm.dimensionWeight} onChange={e => setVarForm(f => ({ ...f, dimensionWeight: e.target.value }))}
                    className={inputCls} min="0.1" max="5"/>
                </Field>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={varForm.higherIsBetter}
                    onChange={e => setVarForm(f => ({ ...f, higherIsBetter: e.target.checked }))}
                    className="rounded border-slate-300"/>
                  Higher is better
                </label>
              </div>
              <button onClick={addVariable}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: G }}>
                <Plus className="w-4 h-4"/> Add Variable
              </button>
            </Section>
          )}
        </div>
      )}

      {/* ── CHARACTERS TAB ────────────────────────────────────────────────────── */}
      {tab === "characters" && simId && (
        <div className="space-y-4">
          {characters.length > 0 && (
            <Section title={`Characters (${characters.length})`}>
              <div className="space-y-2">
                {characters.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: G }}>
                      {c.isPlayer ? "YOU" : (c.character?.name || c.name || "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{c.character?.name || c.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {c.character?.role || c.role} {c.trustLevel !== null && `· Trust: ${c.trustLevel}`}
                        {c.isPlayer && " · PLAYER"}
                      </p>
                    </div>
                    {canEdit && (
                      <button onClick={() => deleteCharacter(c.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {canEdit && (
            <Section title="Add Character">
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <Field label="Name"><input value={charForm.name} onChange={e => setCharForm(f => ({ ...f, name: e.target.value }))} placeholder="Priya Nair" className={inputCls}/></Field>
                <Field label="Role"><input value={charForm.role} onChange={e => setCharForm(f => ({ ...f, role: e.target.value }))} placeholder="Engineering Lead" className={inputCls}/></Field>
                <Field label="Trust Level (0–100)"><input type="number" value={charForm.trustLevel} onChange={e => setCharForm(f => ({ ...f, trustLevel: e.target.value }))} min="0" max="100" className={inputCls}/></Field>
                <Field label="Emotional State"><input value={charForm.emotionalState} onChange={e => setCharForm(f => ({ ...f, emotionalState: e.target.value }))} placeholder="Cautiously optimistic" className={inputCls}/></Field>
                <Field label="Key Concern"><input value={charForm.keyConcern} onChange={e => setCharForm(f => ({ ...f, keyConcern: e.target.value }))} placeholder="What this person worries about" className={inputCls}/></Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mb-4">
                <input type="checkbox" checked={charForm.isPlayer} onChange={e => setCharForm(f => ({ ...f, isPlayer: e.target.checked }))} className="rounded border-slate-300"/>
                This is the player character
              </label>
              <button onClick={addCharacter} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: G }}>
                <Plus className="w-4 h-4"/> Add Character
              </button>
            </Section>
          )}
        </div>
      )}

      {/* ── CONVERSATIONS TAB ─────────────────────────────────────────────────── */}
      {tab === "conversations" && simId && (
        <div className="space-y-4">
          {conversations.map((convo, ci) => (
            <Section key={convo.id}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900">
                  Conversation {ci + 1} — Before Decision #{convo.sequenceOrder}
                </h4>
                {canEdit && (
                  <button onClick={() => deleteConversation(convo.id)} className="text-xs text-rose-600 hover:underline">
                    Delete
                  </button>
                )}
              </div>
              {/* Messages */}
              <div className="space-y-2 mb-4">
                {(convo.messages || []).map((msg: any) => (
                  <div key={msg.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex-shrink-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{msg.messageType}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700">{msg.character?.name || "System"}</p>
                      <p className="text-sm text-slate-900 mt-0.5">{msg.content}</p>
                    </div>
                    {canEdit && (
                      <button onClick={() => deleteMessage(convo.id, msg.id)} className="text-rose-400 hover:text-rose-600">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {/* Add message inline */}
              {canEdit && <AddMessageForm convoId={convo.id} characters={characters} onAdd={msg => addMessage(convo.id, msg)}/>}
            </Section>
          ))}

          {canEdit && (
            <button onClick={addConversation}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-all w-full justify-center">
              <Plus className="w-4 h-4"/> Add Conversation
            </button>
          )}
        </div>
      )}

      {/* ── DECISIONS TAB ─────────────────────────────────────────────────────── */}
      {tab === "decisions" && simId && (
        <div className="space-y-4">
          {decisions.map((dec, di) => (
            <DecisionCard key={dec.id} decision={dec} index={di} variables={variables}
              canEdit={canEdit}
              onDelete={() => deleteDecision(dec.id)}
              onAddOption={(opt: any) => addOption(dec.id, opt)}
              onDeleteOption={(oid: string) => deleteOption(dec.id, oid)}
            />
          ))}

          {canEdit && (
            <Section title="Add Decision">
              <div className="space-y-3 mb-3">
                <Field label={`Decision #${decisions.length + 1} Question Text`} required>
                  <textarea value={decForm.questionText} onChange={e => setDecForm(f => ({ ...f, questionText: e.target.value }))}
                    rows={2} placeholder="What should you do?" className={textareaCls}/>
                </Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Situation Update">
                    <textarea value={decForm.situationUpdate} onChange={e => setDecForm(f => ({ ...f, situationUpdate: e.target.value }))}
                      rows={2} placeholder="What just happened…" className={textareaCls}/>
                  </Field>
                  <div className="space-y-3">
                    <Field label="Tag"><input value={decForm.tag} onChange={e => setDecForm(f => ({ ...f, tag: e.target.value }))} placeholder="e.g. Team Crisis" className={inputCls}/></Field>
                    <Field label="Week Label"><input value={decForm.weekLabel} onChange={e => setDecForm(f => ({ ...f, weekLabel: e.target.value }))} placeholder="e.g. Week 3, Monday" className={inputCls}/></Field>
                  </div>
                </div>
              </div>
              <button onClick={addDecision} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: G }}>
                <Plus className="w-4 h-4"/> Add Decision
              </button>
            </Section>
          )}
        </div>
      )}

      {/* ── REVIEW TAB ────────────────────────────────────────────────────────── */}
      {tab === "review" && sim && (
        <div className="space-y-4">
          <Section title="Simulation Summary">
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {[
                ["Title",      sim.title],
                ["Domain",     sim.domain?.name],
                ["Difficulty", sim.difficultyLevel],
                ["Status",     sim.status],
                ["Variables",  variables.length],
                ["Characters", characters.length],
                ["Conversations", conversations.length],
                ["Decisions",  decisions.length],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</dt>
                  <dd className="text-sm font-semibold text-slate-900 mt-0.5">{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Validation Checklist">
            <div className="space-y-2">
              {[
                { label: "Has title",             ok: !!sim.title },
                { label: "Has domain",            ok: !!sim.domainId },
                { label: "Has description",       ok: !!sim.description },
                { label: "Has ≥1 variable",       ok: variables.length > 0 },
                { label: "Has ≥1 decision",       ok: decisions.length > 0 },
                { label: "All decisions have 6 options", ok: decisions.every((d: any) => (d.options || []).length === 6) },
                { label: "All options have consequence", ok: decisions.every((d: any) => (d.options || []).every((o: any) => !!o.consequenceText)) },
                { label: "All options have ≥1 impact",  ok: decisions.every((d: any) => (d.options || []).every((o: any) => (o.impacts || []).length > 0)) },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center gap-2.5">
                  {ok
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0"/>
                    : <AlertCircle  className="w-4 h-4 text-rose-500 flex-shrink-0"/>
                  }
                  <span className={`text-sm ${ok ? "text-slate-700" : "text-rose-700 font-medium"}`}>{label}</span>
                </div>
              ))}
            </div>
          </Section>

          {sim.status === "DRAFT" && !isAdmin && (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 w-full justify-center"
              style={{ background: G }}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
              Submit for Review
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AddMessageForm({ convoId, characters, onAdd }: { convoId: string; characters: any[]; onAdd: (m: any) => void }) {
  const [form, setForm] = useState({ characterId: "", messageType: "CHAT", content: "", timestamp: "" });
  return (
    <div className="flex items-end gap-2 flex-wrap">
      <select value={form.characterId} onChange={e => setForm(f => ({ ...f, characterId: e.target.value }))}
        className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none">
        <option value="">System</option>
        {characters.map((c: any) => <option key={c.id} value={c.character?.id || c.characterId}>{c.character?.name || c.name}</option>)}
      </select>
      <select value={form.messageType} onChange={e => setForm(f => ({ ...f, messageType: e.target.value }))}
        className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none">
        {MSG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <input value={form.timestamp} onChange={e => setForm(f => ({ ...f, timestamp: e.target.value }))}
        placeholder="9:47 AM" className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"/>
      <input value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
        placeholder="Message content…" className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"/>
      <button onClick={() => { if (form.content) { onAdd(form); setForm(f => ({ ...f, content: "", timestamp: "" })); } }}
        className="px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "#5a7f2e" }}>
        Add
      </button>
    </div>
  );
}

function DecisionCard({ decision, index, variables, canEdit, onDelete, onAddOption, onDeleteOption }: any) {
  const [open,  setOpen]  = useState(true);
  const [form,  setForm]  = useState({
    optionLabel: OPTION_LABELS[decision.options?.length || 0] || "A",
    title: "", description: "", consequenceText: "", strategyTag: "",
    impacts: [] as { simulationVariableId: string; delta: string }[],
  });

  const addImpact = () => setForm(f => ({ ...f, impacts: [...f.impacts, { simulationVariableId: "", delta: "" }] }));
  const removeImpact = (i: number) => setForm(f => ({ ...f, impacts: f.impacts.filter((_, j) => j !== i) }));

  const handleAddOption = () => {
    const opt = {
      optionLabel:    form.optionLabel,
      title:          form.title,
      description:    form.description,
      consequenceText:form.consequenceText,
      strategyTag:    form.strategyTag || null,
      impacts:        form.impacts.filter(i => i.simulationVariableId && i.delta).map(i => ({
        simulationVariableId: i.simulationVariableId,
        delta: parseFloat(i.delta),
      })),
    };
    onAddOption(opt);
    const nextLabel = OPTION_LABELS[decision.options?.length + 1] || "A";
    setForm({ optionLabel: nextLabel, title: "", description: "", consequenceText: "", strategyTag: "", impacts: [] });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: "#5a7f2e" }}>{index + 1}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{decision.questionText}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {decision.tag && `${decision.tag} · `}{decision.options?.length || 0}/6 options
            {decision.options?.length === 6 && " ✓"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              className="w-6 h-6 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 transition-colors">
              <Trash2 className="w-3 h-3"/>
            </button>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
        </div>
      </div>

      {open && (
        <div className="p-5">
          {/* Situation update preview */}
          {decision.situationUpdate && (
            <p className="text-xs text-slate-500 mb-4 italic">{decision.situationUpdate}</p>
          )}

          {/* Existing options */}
          <div className="space-y-2 mb-4">
            {(decision.options || []).map((opt: any) => (
              <div key={opt.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: "#5a7f2e" }}>{opt.optionLabel}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{opt.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.consequenceText?.slice(0, 80)}…</p>
                  {opt.impacts?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {opt.impacts.map((imp: any) => (
                        <span key={imp.id} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                          {imp.simulationVariable?.displayName}: {imp.delta > 0 ? "+" : ""}{imp.delta}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {canEdit && (
                  <button onClick={() => onDeleteOption(opt.id)} className="text-rose-400 hover:text-rose-600">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add option form */}
          {canEdit && (decision.options || []).length < 6 && (
            <div className="border border-dashed border-slate-300 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Add Option {OPTION_LABELS[(decision.options || []).length]}
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Title *</p>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Short option title" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"/>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Strategy Tag</p>
                  <input value={form.strategyTag} onChange={e => setForm(f => ({ ...f, strategyTag: e.target.value }))}
                    placeholder="e.g. Collaborative" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"/>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2} placeholder="What this option means…" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none resize-none"/>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500 mb-1">Consequence Text * (shown after choosing)</p>
                  <textarea value={form.consequenceText} onChange={e => setForm(f => ({ ...f, consequenceText: e.target.value }))}
                    rows={2} placeholder="What happens as a result…" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none resize-none"/>
                </div>
              </div>

              {/* Impacts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">Variable Impacts *</p>
                  <button onClick={addImpact} className="text-xs font-semibold" style={{ color: G }}>+ Add Impact</button>
                </div>
                {form.impacts.map((imp, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <select value={imp.simulationVariableId}
                      onChange={e => setForm(f => ({ ...f, impacts: f.impacts.map((x, j) => j === i ? { ...x, simulationVariableId: e.target.value } : x) }))}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none">
                      <option value="">Select variable…</option>
                      {variables.map((v: any) => <option key={v.id} value={v.id}>{v.displayName}</option>)}
                    </select>
                    <input type="number" step="1" value={imp.delta}
                      onChange={e => setForm(f => ({ ...f, impacts: f.impacts.map((x, j) => j === i ? { ...x, delta: e.target.value } : x) }))}
                      placeholder="±delta" className="w-20 px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"/>
                    <button onClick={() => removeImpact(i)} className="text-rose-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={handleAddOption}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: G }}>
                <Plus className="w-3.5 h-3.5"/> Add Option {OPTION_LABELS[(decision.options || []).length]}
              </button>
            </div>
          )}

          {(decision.options || []).length === 6 && (
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500"/>
              <p className="text-xs text-emerald-700 font-semibold">All 6 options added</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}