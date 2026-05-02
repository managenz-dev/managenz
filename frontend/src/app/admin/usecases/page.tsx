"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2, ArrowLeft, ChevronDown, ChevronUp, Save } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const VARIABLES = ["REVENUE", "BUDGET", "TEAM_MORALE", "INVESTOR_CONFIDENCE", "RISK_EXPOSURE", "CUSTOMER_SATISFACTION", "BRAND_PERCEPTION", "STAKEHOLDER_TRUST"];
const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

export default function ManageUseCasePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [useCase, setUseCase] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [isSavingQ, setIsSavingQ] = useState(false);
  const [isSavingO, setIsSavingO] = useState(false);
  const [newQ, setNewQ] = useState({ situationUpdate: "", questionText: "", context: "" });
  const [showNewQ, setShowNewQ] = useState(false);
  const [newOptions, setNewOptions] = useState<Record<string, any>>({});

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await api.get("/admin/verify");
      loadData();
    } catch (err) {
      router.push("/admin/login");
    }
  };

  const loadData = async () => {
    try {
      const [ucRes, qRes] = await Promise.all([
        api.get("/admin/usecases"),
        api.get(`/admin/usecases/${id}/questions`),
      ]);
      const uc = ucRes.data.data.find((u: any) => u.id === id);
      setUseCase(uc);
      setQuestions(qRes.data.data);
    } catch (err) {
      toast.error("Failed to load");
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.questionText) { toast.error("Question text is required"); return; }
    setIsSavingQ(true);
    try {
      await api.post(`/admin/usecases/${id}/questions`, {
        ...newQ,
        questionNumber: questions.length + 1,
      });
      toast.success("Question added!");
      setNewQ({ situationUpdate: "", questionText: "", context: "" });
      setShowNewQ(false);
      loadData();
    } catch (err) {
      toast.error("Failed to add question");
    } finally {
      setIsSavingQ(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm("Delete this question and all its options?")) return;
    try {
      await api.delete(`/admin/questions/${questionId}`);
      toast.success("Question deleted");
      loadData();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const initNewOption = (questionId: string, currentCount: number) => {
    setNewOptions((prev) => ({
      ...prev,
      [questionId]: {
        optionLabel: OPTION_LABELS[currentCount] || "A",
        title: "",
        description: "",
        strategyTag: "",
        impacts: VARIABLES.map((v) => ({ variable: v, delta: 0 })),
      },
    }));
  };

  const addOption = async (questionId: string) => {
    const opt = newOptions[questionId];
    if (!opt?.title || !opt?.description) { toast.error("Title and description are required"); return; }
    setIsSavingO(true);
    try {
      await api.post(`/admin/questions/${questionId}/options`, {
        optionLabel: opt.optionLabel,
        title: opt.title,
        description: opt.description,
        strategyTag: opt.strategyTag,
        impacts: opt.impacts.filter((i: any) => i.delta !== 0),
      });
      toast.success("Option added!");
      setNewOptions((prev) => { const n = { ...prev }; delete n[questionId]; return n; });
      loadData();
    } catch (err) {
      toast.error("Failed to add option");
    } finally {
      setIsSavingO(false);
    }
  };

  const deleteOption = async (optionId: string) => {
    if (!confirm("Delete this option?")) return;
    try {
      await api.delete(`/admin/options/${optionId}`);
      toast.success("Option deleted");
      loadData();
    } catch (err) {
      toast.error("Failed to delete option");
    }
  };

  const updateImpact = (questionId: string, variable: string, delta: number) => {
    setNewOptions((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        impacts: prev[questionId].impacts.map((i: any) =>
          i.variable === variable ? { ...i, delta } : i
        ),
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-950/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/admin/usecases" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-body text-sm">Simulations</span>
          </Link>
          <span className="font-display font-bold text-white truncate max-w-xs">{useCase?.title}</span>
          <button
            onClick={() => setShowNewQ(true)}
            disabled={questions.length >= 25}
            className="btn-primary text-sm gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {questions.length >= 25 ? "Max 25 Questions" : "Add Question"}
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-28 pb-16">

        {/* Use case info bar */}
        {useCase && (
          <div className="card p-5 mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-white text-xl">{useCase.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-xs text-white/30">{useCase.domain?.name}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="font-mono text-xs text-white/30">{questions.length} / 25 questions</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className={`font-mono text-xs ${useCase.isPublished ? "text-emerald-400" : "text-white/30"}`}>
                  {useCase.isPublished ? "● Published" : "○ Draft"}
                </span>
              </div>
            </div>
            <div className="h-2 w-32 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${(questions.length / 25) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Add Question Form */}
        {showNewQ && (
          <div className="card border border-brand-500/20 p-6 mb-6">
            <h3 className="font-display font-semibold text-white mb-4">
              Add Question {questions.length + 1} of 25
            </h3>
            <form onSubmit={addQuestion} className="space-y-4">
              <div>
                <label className="label">Situation Update</label>
                <textarea
                  className="input resize-none" rows={2}
                  placeholder="What just happened? 1-2 sentences setting the scene for this decision..."
                  value={newQ.situationUpdate}
                  onChange={(e) => setNewQ({ ...newQ, situationUpdate: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Question Text <span className="text-rose-400">*</span></label>
                <textarea
                  className="input resize-none" rows={2}
                  placeholder="The decision question the player must answer..."
                  value={newQ.questionText}
                  onChange={(e) => setNewQ({ ...newQ, questionText: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Context / Additional Data</label>
                <textarea
                  className="input resize-none" rows={2}
                  placeholder="Any numbers, data or extra context the player should know before deciding..."
                  value={newQ.context}
                  onChange={(e) => setNewQ({ ...newQ, context: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={isSavingQ} className="btn-primary text-sm disabled:opacity-50">
                  {isSavingQ ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : "Add Question"}
                </button>
                <button type="button" onClick={() => setShowNewQ(false)} className="btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Questions List */}
        {questions.length === 0 ? (
          <div className="card p-12 text-center">
            <h3 className="font-display font-semibold text-white/50 mb-2">No questions yet</h3>
            <p className="font-body text-sm text-white/30 mb-4">Click Add Question to start building your simulation.</p>
            <button onClick={() => setShowNewQ(true)} className="btn-primary text-sm gap-2">
              <Plus className="w-4 h-4" /> Add First Question
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, qi) => (
              <div key={q.id} className="card overflow-hidden">

                {/* Question header — click to expand */}
                <div
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                      <span className="font-mono text-sm text-brand-400 font-bold">{qi + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-white text-sm truncate">{q.questionText}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-white/30">{q.options?.length || 0}/6 options</span>
                        {q.options?.length === 6 && (
                          <span className="font-mono text-xs text-emerald-400">✓ Complete</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
                      className="p-2 text-white/20 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {expandedQ === q.id
                      ? <ChevronUp className="w-4 h-4 text-white/40" />
                      : <ChevronDown className="w-4 h-4 text-white/40" />
                    }
                  </div>
                </div>

                {/* Expanded content */}
                {expandedQ === q.id && (
                  <div className="border-t border-white/[0.06] p-5 space-y-4">

                    {/* Situation update */}
                    {q.situationUpdate && (
                      <div className="bg-dark-700 rounded-lg p-3">
                        <p className="font-mono text-xs text-white/40 uppercase tracking-wider mb-1">Situation Update</p>
                        <p className="font-body text-sm text-white/60">{q.situationUpdate}</p>
                      </div>
                    )}

                    {/* Context */}
                    {q.context && (
                      <div className="bg-dark-700 rounded-lg p-3">
                        <p className="font-mono text-xs text-white/40 uppercase tracking-wider mb-1">Context</p>
                        <p className="font-body text-sm text-white/60">{q.context}</p>
                      </div>
                    )}

                    {/* Existing options */}
                    <div>
                      <h4 className="font-display font-semibold text-white text-sm mb-3">
                        Options ({q.options?.length || 0} / 6)
                      </h4>
                      <div className="space-y-2 mb-4">
                        {q.options?.map((opt: any) => (
                          <div key={opt.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/[0.06]">
                            <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="font-mono text-xs text-brand-400 font-bold">{opt.optionLabel}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-display font-semibold text-white text-sm">{opt.title}</p>
                              <p className="font-body text-xs text-white/50 mt-0.5 leading-relaxed">{opt.description}</p>
                              {opt.strategyTag && (
                                <span className="inline-block mt-1.5 font-mono text-xs text-brand-400/70 bg-brand-500/5 border border-brand-500/10 px-2 py-0.5 rounded">
                                  {opt.strategyTag}
                                </span>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {opt.impacts?.filter((i: any) => i.delta !== 0).map((i: any) => (
                                  <span
                                    key={i.variable}
                                    className={`font-mono text-xs px-1.5 py-0.5 rounded ${i.delta > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
                                  >
                                    {i.variable.replace(/_/g, " ")} {i.delta > 0 ? "+" : ""}{i.delta}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteOption(opt.id)}
                              className="p-1 text-white/20 hover:text-rose-400 transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add option form */}
                      {(q.options?.length || 0) < 6 && (
                        <>
                          {!newOptions[q.id] ? (
                            <button
                              onClick={() => initNewOption(q.id, q.options?.length || 0)}
                              className="btn-secondary text-xs gap-2 w-full justify-center py-2.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Option {OPTION_LABELS[q.options?.length || 0]}
                            </button>
                          ) : (
                            <div className="border border-brand-500/20 rounded-xl p-4 space-y-4">
                              <h5 className="font-display font-semibold text-white text-sm">
                                New Option {newOptions[q.id]?.optionLabel}
                              </h5>

                              <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                  <label className="label text-xs">Option Label</label>
                                  <select
                                    className="input bg-dark-700 text-sm"
                                    value={newOptions[q.id]?.optionLabel}
                                    onChange={(e) => setNewOptions((prev) => ({ ...prev, [q.id]: { ...prev[q.id], optionLabel: e.target.value } }))}
                                  >
                                    {OPTION_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="label text-xs">Strategy Tag</label>
                                  <input
                                    type="text" className="input text-sm"
                                    placeholder="e.g. Risk-Averse, Growth-Focused"
                                    value={newOptions[q.id]?.strategyTag}
                                    onChange={(e) => setNewOptions((prev) => ({ ...prev, [q.id]: { ...prev[q.id], strategyTag: e.target.value } }))}
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="label text-xs">Title <span className="text-rose-400">*</span></label>
                                <input
                                  type="text" className="input text-sm"
                                  placeholder="Short title for this option"
                                  value={newOptions[q.id]?.title}
                                  onChange={(e) => setNewOptions((prev) => ({ ...prev, [q.id]: { ...prev[q.id], title: e.target.value } }))}
                                />
                              </div>

                              <div>
                                <label className="label text-xs">Description <span className="text-rose-400">*</span></label>
                                <textarea
                                  className="input text-sm resize-none" rows={2}
                                  placeholder="What does this option involve? What action does the player take?"
                                  value={newOptions[q.id]?.description}
                                  onChange={(e) => setNewOptions((prev) => ({ ...prev, [q.id]: { ...prev[q.id], description: e.target.value } }))}
                                />
                              </div>

                              {/* Impact Values Grid */}
                              <div>
                                <label className="label text-xs">Measurable Impact on Variables</label>
                                <p className="font-mono text-xs text-white/30 mb-3">Positive = increase. Negative = decrease. Zero = no change.</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {VARIABLES.map((v) => (
                                    <div key={v}>
                                      <label className="font-mono text-xs text-white/40 mb-1 block">
                                        {v.replace(/_/g, " ")}
                                      </label>
                                      <input
                                        type="number"
                                        className="input text-sm py-1.5 text-center"
                                        placeholder="0"
                                        min="-100"
                                        max="100"
                                        value={newOptions[q.id]?.impacts?.find((i: any) => i.variable === v)?.delta || 0}
                                        onChange={(e) => updateImpact(q.id, v, parseFloat(e.target.value) || 0)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => addOption(q.id)}
                                  disabled={isSavingO}
                                  className="btn-primary text-sm disabled:opacity-50"
                                >
                                  {isSavingO
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                                    : <><Save className="w-3.5 h-3.5" /> Save Option</>
                                  }
                                </button>
                                <button
                                  onClick={() => setNewOptions((prev) => { const n = { ...prev }; delete n[q.id]; return n; })}
                                  className="btn-secondary text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {(q.options?.length || 0) >= 6 && (
                        <div className="text-center py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                          <span className="font-mono text-xs text-emerald-400">✓ All 6 options added for this question</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}