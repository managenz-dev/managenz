"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Brain, Clock, ChevronRight, Loader2,
  Zap, TrendingUp, TrendingDown, Minus, CheckCircle2,
  AlertCircle, Play, RotateCcw, X, Trophy, Target,
  Sparkles, ArrowRight, Shield,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Variable {
  id: string; variableName: string; displayName: string;
  startingValue: number; unit: string; higherIsBetter: boolean;
}
interface Option {
  id: string; optionLabel: string; title: string;
  description: string; strategyTag: string;
}
interface Question {
  id: string; orderIndex: number; tag: string;
  situationUpdate: string; questionText: string;
  context: string; options: Option[];
}
interface VarChange { variableName: string; displayName: string; delta: number; oldValue: number; newValue: number; }

type Phase = "loading" | "intro" | "playing" | "revealing" | "complete";

// ─── Mock data (used when API isn't ready yet) ────────────────────────────────
const MOCK_SIMULATION = {
  title: "ContextIQ — Aarav's First 90 Days",
  story: {
    companyBackground: "NexaHR is a B2B SaaS startup in Bengaluru building HR automation tools for mid-sized companies. Founded 4 years ago, they've just crossed ₹12 Cr ARR and are in aggressive growth mode. The team is 45 people, moving fast, and constantly navigating the tension between speed and quality.",
    howItWorks: "You are Aarav Mehta, a newly hired Product Manager. Over the next 25 decisions, you'll navigate real situations across your first 90 days — from handling a critical bug in week 1, to managing a difficult stakeholder, to deciding the product roadmap direction. Every choice has consequences.",
  },
  variables: [
    { id: "v1", variableName: "REVENUE_IMPACT",       displayName: "Revenue",         startingValue: 70, unit: "%", higherIsBetter: true },
    { id: "v2", variableName: "TEAM_MORALE",           displayName: "Team Morale",     startingValue: 75, unit: "%", higherIsBetter: true },
    { id: "v3", variableName: "LEADERSHIP_CREDIBILITY",displayName: "Leadership Cred", startingValue: 60, unit: "%", higherIsBetter: true },
  ] as Variable[],
};

const MOCK_QUESTIONS: Question[] = [
  {
    id: "q1", orderIndex: 1, tag: "Week 1 — Critical Bug",
    situationUpdate: "You've just completed your first week of onboarding when your engineering lead, Priya, pulls you aside before the team standup.",
    questionText: "Engineering discovered a data sync bug affecting 15% of enterprise clients. It was found 3 days ago but hasn't been escalated. Priya is waiting to see how you handle it.",
    context: "The CEO is traveling. Your direct manager is in back-to-back customer calls. The bug is live and clients may already be noticing.",
    options: [
      { id: "o1a", optionLabel: "A", title: "Escalate immediately to your manager", description: "Interrupt your manager's calls and demand an emergency discussion right now.", strategyTag: "Escalate" },
      { id: "o1b", optionLabel: "B", title: "Investigate scope first, then escalate", description: "Spend 30 minutes understanding the full blast radius before looping in leadership.", strategyTag: "Investigate" },
      { id: "o1c", optionLabel: "C", title: "Wait for your manager to bring it up", description: "It was discovered before you joined — not your problem yet. See how leadership handles it.", strategyTag: "Wait" },
      { id: "o1d", optionLabel: "D", title: "Contact affected clients directly", description: "Get ahead of it by personally reaching out to the 15% of enterprise clients impacted.", strategyTag: "Client First" },
      { id: "o1e", optionLabel: "E", title: "Draft a fix proposal for engineering", description: "Write up what you think the solution is and share it with the engineering team.", strategyTag: "Solution" },
      { id: "o1f", optionLabel: "F", title: "Set up a tracking doc and monitor", description: "Create a structured incident tracker, assign owners, and monitor from a distance.", strategyTag: "Process" },
    ],
  },
  {
    id: "q2", orderIndex: 2, tag: "Week 2 — Roadmap Pressure",
    situationUpdate: "The bug is resolved. Your manager thanks you for how you handled it. Now, in your first roadmap review, the Head of Sales puts you on the spot.",
    questionText: "Sales wants you to commit to 3 new enterprise features in Q2. Engineering says they can realistically do 1. The meeting room is watching you for a decision.",
    context: "You've been at the company 2 weeks. The Sales lead has been here for 3 years and is a key revenue driver. Engineering lead looks uncomfortable.",
    options: [
      { id: "o2a", optionLabel: "A", title: "Side with engineering — commit to 1", description: "Back your engineering lead publicly. Quality over speed, even if it disappoints Sales.", strategyTag: "Back Engineering" },
      { id: "o2b", optionLabel: "B", title: "Propose a structured prioritisation session", description: "Decline to commit now and set up a proper discovery session with both teams.", strategyTag: "Process First" },
      { id: "o2c", optionLabel: "C", title: "Agree to 3 features to maintain relationships", description: "Commit to Sales publicly and figure out how to make it work later.", strategyTag: "People Pleaser" },
      { id: "o2d", optionLabel: "D", title: "Offer 2 as a compromise", description: "Split the difference publicly — 2 features, and be clear about trade-offs.", strategyTag: "Compromise" },
      { id: "o2e", optionLabel: "E", title: "Defer to your manager to decide", description: "This feels above your pay grade in week 2. Ask your manager to weigh in.", strategyTag: "Defer" },
      { id: "o2f", optionLabel: "F", title: "Ask Sales to rank the 3 by revenue impact", description: "Turn the question back: if we can only do 1, which one drives the most revenue?", strategyTag: "Reframe" },
    ],
  },
];

const MOCK_CONSEQUENCES: Record<string, { consequence: string; changes: VarChange[] }> = {
  "o1a": { consequence: "Your manager appreciated the urgency, but questioned why you didn't gather basic facts first. It created slight anxiety in the room. Engineering respected you less for jumping the gun.", changes: [{ variableName: "REVENUE_IMPACT", displayName: "Revenue", delta: -2, oldValue: 70, newValue: 68 }, { variableName: "TEAM_MORALE", displayName: "Team Morale", delta: +2, oldValue: 75, newValue: 77 }, { variableName: "LEADERSHIP_CREDIBILITY", displayName: "Leadership Cred", delta: -3, oldValue: 60, newValue: 57 }] },
  "o1b": { consequence: "Excellent. You spent 30 minutes understanding the full scope, walked into the escalation meeting with facts, and suggested a fix priority. Your manager was impressed. Engineering trusts you already.", changes: [{ variableName: "REVENUE_IMPACT", displayName: "Revenue", delta: +2, oldValue: 70, newValue: 72 }, { variableName: "TEAM_MORALE", displayName: "Team Morale", delta: +5, oldValue: 75, newValue: 80 }, { variableName: "LEADERSHIP_CREDIBILITY", displayName: "Leadership Cred", delta: +10, oldValue: 60, newValue: 70 }] },
  "o1c": { consequence: "Two days later the bug was escalated directly to the CEO by a client. Your manager asked why you didn't act. 'I thought it wasn't my problem yet' didn't land well. This set a bad tone for your onboarding.", changes: [{ variableName: "REVENUE_IMPACT", displayName: "Revenue", delta: -8, oldValue: 70, newValue: 62 }, { variableName: "TEAM_MORALE", displayName: "Team Morale", delta: -4, oldValue: 75, newValue: 71 }, { variableName: "LEADERSHIP_CREDIBILITY", displayName: "Leadership Cred", delta: -12, oldValue: 60, newValue: 48 }] },
  "o1d": { consequence: "Clients were surprised and confused — no official communication had been authorised. One client escalated further after your message. You meant well, but the execution created more noise than signal.", changes: [{ variableName: "REVENUE_IMPACT", displayName: "Revenue", delta: +1, oldValue: 70, newValue: 71 }, { variableName: "TEAM_MORALE", displayName: "Team Morale", delta: -2, oldValue: 75, newValue: 73 }, { variableName: "LEADERSHIP_CREDIBILITY", displayName: "Leadership Cred", delta: -6, oldValue: 60, newValue: 54 }] },
  "o1e": { consequence: "Engineering appreciated the initiative but your fix proposal missed key architectural constraints. They spent time explaining why it wouldn't work. Goodwill earned, credibility mildly dented.", changes: [{ variableName: "REVENUE_IMPACT", displayName: "Revenue", delta: 0, oldValue: 70, newValue: 70 }, { variableName: "TEAM_MORALE", displayName: "Team Morale", delta: +2, oldValue: 75, newValue: 77 }, { variableName: "LEADERSHIP_CREDIBILITY", displayName: "Leadership Cred", delta: +2, oldValue: 60, newValue: 62 }] },
  "o1f": { consequence: "The tracker was well-structured, but the bug kept running while you were setting up the doc. Your manager felt you over-processed a situation that needed decisive action.", changes: [{ variableName: "REVENUE_IMPACT", displayName: "Revenue", delta: -3, oldValue: 70, newValue: 67 }, { variableName: "TEAM_MORALE", displayName: "Team Morale", delta: +1, oldValue: 75, newValue: 76 }, { variableName: "LEADERSHIP_CREDIBILITY", displayName: "Leadership Cred", delta: -2, oldValue: 60, newValue: 58 }] },
  "o2a": { consequence: "Engineering respected you for having their back. Sales was cold in the hallway for a week. But when Q2 ended and the one feature shipped perfectly, Sales came around.", changes: [{ variableName: "REVENUE_IMPACT", displayName: "Revenue", delta: +3, oldValue: 70, newValue: 73 }, { variableName: "TEAM_MORALE", displayName: "Team Morale", delta: +8, oldValue: 75, newValue: 83 }, { variableName: "LEADERSHIP_CREDIBILITY", displayName: "Leadership Cred", delta: +5, oldValue: 60, newValue: 65 }] },
  "o2b": { consequence: "Both teams respected the structured approach. The prioritisation session surfaced that 2 of the 3 features were actually solving the same problem. You shipped the best one. Everyone won.", changes: [{ variableName: "REVENUE_IMPACT", displayName: "Revenue", delta: +5, oldValue: 70, newValue: 75 }, { variableName: "TEAM_MORALE", displayName: "Team Morale", delta: +6, oldValue: 75, newValue: 81 }, { variableName: "LEADERSHIP_CREDIBILITY", displayName: "Leadership Cred", delta: +12, oldValue: 60, newValue: 72 }] },
  "o2c": { consequence: "Engineering was visibly deflated. They told you after the meeting that 3 features in Q2 was impossible. You ended Q2 having shipped 1 feature late, with your credibility significantly damaged.", changes: [{ variableName: "REVENUE_IMPACT", displayName: "Revenue", delta: -5, oldValue: 70, newValue: 65 }, { variableName: "TEAM_MORALE", displayName: "Team Morale", delta: -10, oldValue: 75, newValue: 65 }, { variableName: "LEADERSHIP_CREDIBILITY", displayName: "Leadership Cred", delta: -8, oldValue: 60, newValue: 52 }] },
  "o2d": { consequence: "The compromise felt safe but left both sides mildly unsatisfied. Engineering felt pressured. Sales felt their ask wasn't heard. You avoided a conflict but didn't build trust with either team.", changes: [{ variableName: "REVENUE_IMPACT", displayName: "Revenue", delta: +1, oldValue: 70, newValue: 71 }, { variableName: "TEAM_MORALE", displayName: "Team Morale", delta: -2, oldValue: 75, newValue: 73 }, { variableName: "LEADERSHIP_CREDIBILITY", displayName: "Leadership Cred", delta: 0, oldValue: 60, newValue: 60 }] },
  "o2e": { consequence: "Your manager stepped in but later asked why you needed to escalate something that was clearly within your remit. In week 2, this reinforced a perception that you weren't ready to own decisions.", changes: [{ variableName: "REVENUE_IMPACT", displayName: "Revenue", delta: 0, oldValue: 70, newValue: 70 }, { variableName: "TEAM_MORALE", displayName: "Team Morale", delta: -3, oldValue: 75, newValue: 72 }, { variableName: "LEADERSHIP_CREDIBILITY", displayName: "Leadership Cred", delta: -7, oldValue: 60, newValue: 53 }] },
  "o2f": { consequence: "Sales paused, thought, then admitted that feature 2 was 10x more valuable than the other two. You focused on it, shipped it well, and Sales closed 2 new enterprise deals. Masterful reframing.", changes: [{ variableName: "REVENUE_IMPACT", displayName: "Revenue", delta: +8, oldValue: 70, newValue: 78 }, { variableName: "TEAM_MORALE", displayName: "Team Morale", delta: +4, oldValue: 75, newValue: 79 }, { variableName: "LEADERSHIP_CREDIBILITY", displayName: "Leadership Cred", delta: +15, oldValue: 60, newValue: 75 }] },
};

// ─── Metric pill component ────────────────────────────────────────────────────
function MetricPill({
  displayName, value, delta, animating,
}: { displayName: string; value: number; delta?: number; animating?: boolean }) {
  const color = value >= 70 ? "text-emerald-500" : value >= 50 ? "text-amber-500" : "text-rose-500";
  const bg    = value >= 70 ? "bg-emerald-500/10" : value >= 50 ? "bg-amber-500/10" : "bg-rose-500/10";
  const bar   = value >= 70 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] ${animating ? "scale-105" : ""} transition-transform`}>
      <div className="flex flex-col gap-0.5 w-14 sm:w-20">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] text-slate-400 dark:text-white/30 hidden sm:inline">{displayName}</span>
          <span className="font-mono text-[9px] text-slate-400 dark:text-white/30 sm:hidden">{displayName.split(" ")[0]}</span>
          <span className={`font-mono text-[10px] font-bold ${color}`}>{value}</span>
        </div>
        <div className="h-1 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${bar}`} style={{ width: `${value}%` }}/>
        </div>
      </div>
      {delta !== undefined && delta !== 0 && (
        <div className={`flex items-center gap-0.5 text-[10px] font-mono font-bold ${delta > 0 ? "text-emerald-500" : "text-rose-500"}`}>
          {delta > 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
          {delta > 0 ? `+${delta}` : delta}
        </div>
      )}
    </div>
  );
}

// ─── Option card component ────────────────────────────────────────────────────
function OptionCard({
  option, index, selected, disabled, onSelect,
}: { option: Option; index: number; selected: boolean; disabled: boolean; onSelect: () => void }) {
  const labels = ["A", "B", "C", "D", "E", "F"];
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      style={{ animation: `fadeUp 0.35s ease ${index * 50}ms both` }}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group
        ${selected
          ? "bg-[#7c6cfc]/10 border-[#7c6cfc]/40 ring-1 ring-[#7c6cfc]/30"
          : disabled
            ? "bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.05] opacity-40"
            : "bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] hover:border-[#7c6cfc]/30 hover:bg-[#7c6cfc]/5 hover:shadow-md"
        }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-mono font-bold transition-colors
          ${selected
            ? "bg-[#7c6cfc] text-white"
            : "bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/40 group-hover:bg-[#7c6cfc]/20 group-hover:text-[#7c6cfc]"
          }`}>
          {labels[index]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className={`font-body font-semibold text-sm leading-snug ${selected ? "text-[#7c6cfc]" : "text-slate-800 dark:text-white"}`}>
              {option.title}
            </p>
            {option.strategyTag && (
              <span className={`flex-shrink-0 font-mono text-[9px] px-1.5 py-0.5 rounded-full border
                ${selected
                  ? "bg-[#7c6cfc]/15 text-[#7c6cfc] border-[#7c6cfc]/30"
                  : "bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/30 border-slate-200 dark:border-white/[0.06]"
                }`}>
                {option.strategyTag}
              </span>
            )}
          </div>
          <p className="font-body text-xs text-slate-500 dark:text-white/40 leading-relaxed">{option.description}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Variable change row ──────────────────────────────────────────────────────
function VarChangeRow({ change }: { change: VarChange }) {
  const positive = change.delta > 0;
  const neutral  = change.delta === 0;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-white/[0.06] last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
        ${neutral ? "bg-slate-100 dark:bg-white/[0.05]" : positive ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
        {neutral
          ? <Minus className="w-3.5 h-3.5 text-slate-400"/>
          : positive
            ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500"/>
            : <TrendingDown className="w-3.5 h-3.5 text-rose-500"/>
        }
      </div>
      <div className="flex-1">
        <p className="font-body text-sm text-slate-700 dark:text-white/70">{change.displayName}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-[10px] text-slate-400 dark:text-white/30">{change.oldValue}</span>
          <ChevronRight className="w-3 h-3 text-slate-300 dark:text-white/20"/>
          <span className={`font-mono text-[10px] font-bold ${positive ? "text-emerald-500" : neutral ? "text-slate-400" : "text-rose-500"}`}>
            {change.newValue}
          </span>
        </div>
      </div>
      <span className={`font-mono text-sm font-bold
        ${neutral ? "text-slate-400" : positive ? "text-emerald-500" : "text-rose-500"}`}>
        {positive ? `+${change.delta}` : change.delta === 0 ? "±0" : change.delta}
      </span>
    </div>
  );
}

// ─── MAIN PLAYER ─────────────────────────────────────────────────────────────
export default function SimulationPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const slug   = params?.slug as string;
  const { user, hasHydrated, fetchMe } = useAuthStore();

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase,          setPhase]          = useState<Phase>("loading");
  const [simulation,     setSimulation]     = useState<any>(null);
  const [variables,      setVariables]      = useState<Variable[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, number>>({});
  const [sessionId,      setSessionId]      = useState<string | null>(null);
  const [question,       setQuestion]       = useState<Question | null>(null);
  const [questionIndex,  setQuestionIndex]  = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(25);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [consequence,    setConsequence]    = useState<string>("");
  const [varChanges,     setVarChanges]     = useState<VarChange[]>([]);
  const [submitting,     setSubmitting]     = useState(false);
  const [animating,      setAnimating]      = useState<string | null>(null);
  const [useMock,        setUseMock]        = useState(false);
  const mockQIndex = useRef(0);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const guard = () => {
      const { isAuthenticated, user: u } = useAuthStore.getState();
      if (!u || !isAuthenticated) { router.replace("/auth/login"); return; }
      loadSimulation();
    };
    if (hasHydrated) guard();
    else fetchMe().then(guard);
  }, []);

  // ── Load simulation overview ───────────────────────────────────────────────
  const loadSimulation = async () => {
    try {
      const res = await api.get(`/simulations/${slug}`);
      const { simulation: sim, session } = res.data.data;
      setSimulation(sim);
      setVariables(sim.variables || []);
      if (session) {
        const vals: Record<string, number> = {};
        (sim.variables || []).forEach((v: Variable) => {
          vals[v.variableName] = session.variableValues?.[v.variableName] ?? v.startingValue;
        });
        setVariableValues(vals);
        setTotalQuestions(sim.totalQuestions || 25);
      } else {
        const vals: Record<string, number> = {};
        (sim.variables || []).forEach((v: Variable) => { vals[v.variableName] = v.startingValue; });
        setVariableValues(vals);
      }
      setPhase("intro");
    } catch {
      // Fall back to mock data
      setSimulation(MOCK_SIMULATION);
      setVariables(MOCK_SIMULATION.variables);
      const vals: Record<string, number> = {};
      MOCK_SIMULATION.variables.forEach(v => { vals[v.variableName] = v.startingValue; });
      setVariableValues(vals);
      setTotalQuestions(MOCK_QUESTIONS.length);
      setUseMock(true);
      setPhase("intro");
    }
  };

  // ── Start / resume session ─────────────────────────────────────────────────
  const handleStart = async () => {
    if (useMock) {
      mockQIndex.current = 0;
      setQuestion(MOCK_QUESTIONS[0]);
      setQuestionIndex(0);
      setPhase("playing");
      return;
    }
    try {
      const res = await api.post(`/simulations/${slug}/start`);
      const { sessionId: sid, currentQuestionIndex, totalQuestions: total, variables: vars, variableValues: vals, question: q } = res.data.data;
      setSessionId(sid);
      setVariables(vars || []);
      if (vals) setVariableValues(vals);
      setTotalQuestions(total);
      setQuestionIndex(currentQuestionIndex);
      if (q) { setQuestion(q); setPhase("playing"); }
      else    { setPhase("complete"); }
    } catch { toast.error("Failed to start simulation"); }
  };

  // ── Submit answer ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedOption || !question) return;
    setSubmitting(true);

    if (useMock) {
      const mockResult = MOCK_CONSEQUENCES[selectedOption];
      if (!mockResult) {
        // Generic fallback
        setConsequence("Your decision has been recorded. The consequences will unfold over time.");
        setVarChanges([]);
      } else {
        setConsequence(mockResult.consequence);
        setVarChanges(mockResult.changes);
        // Animate metrics
        mockResult.changes.forEach(c => setAnimating(c.variableName));
        const newVals = { ...variableValues };
        mockResult.changes.forEach(c => { newVals[c.variableName] = c.newValue; });
        setTimeout(() => {
          setVariableValues(newVals);
          setAnimating(null);
        }, 400);
      }
      setSubmitting(false);
      setPhase("revealing");
      return;
    }

    try {
      const res = await api.post(`/simulations/${slug}/answer`, {
        sessionId,
        questionId: question.id,
        optionId:   selectedOption,
      });
      const { consequence: cons, variableChanges, variableValues: newVals, isLastQuestion, nextQuestion, answeredCount } = res.data.data;
      setConsequence(cons);
      setVarChanges(variableChanges || []);

      // Animate then update values
      variableChanges?.forEach((c: VarChange) => setAnimating(c.variableName));
      setTimeout(() => { if (newVals) setVariableValues(newVals); setAnimating(null); }, 400);

      setQuestionIndex(answeredCount);

      if (isLastQuestion) {
        // Store next state for after reveal
        setQuestion(null);
      } else {
        setQuestion(nextQuestion);
      }
      setPhase("revealing");
    } catch { toast.error("Failed to submit answer"); }
    finally { setSubmitting(false); }
  };

  // ── Continue to next question ──────────────────────────────────────────────
  const handleContinue = async () => {
    setSelectedOption(null);
    setConsequence("");
    setVarChanges([]);

    if (useMock) {
      const nextIdx = mockQIndex.current + 1;
      mockQIndex.current = nextIdx;
      if (nextIdx >= MOCK_QUESTIONS.length) {
        setPhase("complete");
      } else {
        setQuestion(MOCK_QUESTIONS[nextIdx]);
        setQuestionIndex(nextIdx);
        setPhase("playing");
      }
      return;
    }

    if (!question) {
      // Last question — complete the session
      if (sessionId) {
        try {
          await api.post(`/simulations/${slug}/complete`, { sessionId });
        } catch { /* swallow */ }
      }
      setPhase("complete");
    } else {
      setPhase("playing");
    }
  };

  // ── View results ──────────────────────────────────────────────────────────
  const handleViewResults = () => {
    router.push(`/simulations/${slug}/result`);
  };

  const progressPct = totalQuestions > 0 ? Math.round((questionIndex / totalQuestions) * 100) : 0;

  // ══════════════════════════════════════════════════════════════════════════
  // LOADING
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === "loading") return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#7c6cfc] animate-spin mx-auto"/>
        <p className="font-mono text-xs text-slate-500 dark:text-white/30">Loading simulation…</p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // INTRO SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === "intro") return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#7c6cfc]/6 rounded-full blur-[120px]"/>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white font-body text-sm transition-colors mb-8">
          <ArrowLeft className="w-4 h-4"/> Back to Dashboard
        </Link>

        {/* Header */}
        <div style={{ animation: "fadeUp 0.5s ease" }} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7c6cfc]/10 border border-[#7c6cfc]/20 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#7c6cfc]"/>
            <span className="font-mono text-[10px] text-[#7c6cfc] uppercase tracking-wider">
              {simulation?.difficulty || "Intermediate"} · {totalQuestions} Decisions
            </span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white mb-3">
            {simulation?.title || "ContextIQ"}
          </h1>
          <p className="font-body text-slate-500 dark:text-white/50 text-base">
            Every decision has consequences. There is no pause. There is no undo.
          </p>
        </div>

        {/* Story card */}
        <div style={{ animation: "fadeUp 0.5s ease 0.1s both" }}
          className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] p-6 mb-5 shadow-sm">
          <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider mb-3">The Context</p>
          <p className="font-body text-sm text-slate-600 dark:text-white/60 leading-relaxed mb-4">
            {simulation?.story?.companyBackground || MOCK_SIMULATION.story.companyBackground}
          </p>
          <div className="h-px bg-slate-100 dark:bg-white/[0.07] mb-4"/>
          <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider mb-3">How It Works</p>
          <p className="font-body text-sm text-slate-600 dark:text-white/60 leading-relaxed">
            {simulation?.story?.howItWorks || MOCK_SIMULATION.story.howItWorks}
          </p>
        </div>

        {/* Metrics preview */}
        <div style={{ animation: "fadeUp 0.5s ease 0.2s both" }}
          className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] p-6 mb-5 shadow-sm">
          <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider mb-4">Metrics You&apos;ll Track</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(variables.length > 0 ? variables : MOCK_SIMULATION.variables).map((v, i) => (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
                <div className="w-8 h-8 rounded-lg bg-[#7c6cfc]/10 border border-[#7c6cfc]/20 flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-[#7c6cfc]"/>
                </div>
                <div>
                  <p className="font-body text-sm font-semibold text-slate-800 dark:text-white">{v.displayName}</p>
                  <p className="font-mono text-[10px] text-slate-400 dark:text-white/30">Starts at {v.startingValue}{v.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rules */}
        <div style={{ animation: "fadeUp 0.5s ease 0.25s both" }}
          className="rounded-2xl bg-amber-50 dark:bg-amber-500/[0.08] border border-amber-200 dark:border-amber-500/20 p-4 mb-8">
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"/>
            <div>
              <p className="font-body text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">The rules</p>
              <p className="font-body text-xs text-amber-700 dark:text-amber-400/80 leading-relaxed">
                Decisions are permanent — you cannot go back. Each choice affects all three metrics, sometimes in ways you won&apos;t expect. Read every scenario carefully. Think before you pick.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ animation: "fadeUp 0.5s ease 0.3s both" }}>
          <button onClick={handleStart}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-4 rounded-2xl bg-[#7c6cfc] hover:bg-[#6a5cf0] text-white font-body font-semibold text-base transition-all shadow-xl shadow-[#7c6cfc]/25 hover:shadow-[#7c6cfc]/40 hover:-translate-y-0.5 group">
            <Play className="w-5 h-5"/>
            Begin Simulation
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
          </button>
          <p className="font-body text-xs text-slate-400 dark:text-white/25 mt-3 sm:ml-2">~{simulation?.estimatedTime || 45} minutes · {totalQuestions} decisions</p>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // COMPLETE SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === "complete") return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/8 rounded-full blur-[140px]"/>
      </div>
      <div className="relative z-10 max-w-md w-full text-center" style={{ animation: "fadeUp 0.6s ease" }}>
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-emerald-500"/>
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 dark:text-white mb-3">
          Simulation Complete!
        </h1>
        <p className="font-body text-slate-500 dark:text-white/50 mb-6">
          You made {totalQuestions} decisions as {simulation?.story?.character || "Aarav Mehta"}. Your score is being calculated.
        </p>

        {/* Final metric values */}
        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 mb-6 shadow-sm">
          <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider mb-4">Final Metrics</p>
          <div className="space-y-3">
            {(variables.length > 0 ? variables : MOCK_SIMULATION.variables).map(v => {
              const val = variableValues[v.variableName] ?? v.startingValue;
              const start = v.startingValue;
              const delta = val - start;
              const color = val >= 70 ? "text-emerald-500" : val >= 50 ? "text-amber-500" : "text-rose-500";
              const bar   = val >= 70 ? "bg-emerald-500" : val >= 50 ? "bg-amber-500" : "bg-rose-500";
              return (
                <div key={v.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-body text-sm text-slate-700 dark:text-white/70">{v.displayName}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-bold ${delta >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {delta >= 0 ? `+${delta}` : delta}
                      </span>
                      <span className={`font-mono text-sm font-bold ${color}`}>{val}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${bar}`} style={{ width: `${val}%` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={handleViewResults}
          className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-[#7c6cfc] hover:bg-[#6a5cf0] text-white font-body font-semibold text-base transition-all shadow-xl shadow-[#7c6cfc]/25 group">
          View Full Results
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
        </button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // PLAYING + REVEALING — shared layout
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white flex flex-col">

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-[#070711]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.07] shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

          {/* Left: back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-white/40"/>
            </Link>
            <div className="min-w-0 hidden sm:block">
              <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider">
                Decision {questionIndex + (phase === "revealing" ? 0 : 0) + 1} of {totalQuestions}
              </p>
              <p className="font-display font-semibold text-slate-800 dark:text-white text-sm truncate">
                {simulation?.title || "Simulation"}
              </p>
            </div>
          </div>

          {/* Center: progress */}
          <div className="flex-1 max-w-xs hidden sm:block">
            <div className="h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[#7c6cfc] transition-all duration-500"
                style={{ width: `${progressPct}%` }}/>
            </div>
            <p className="font-mono text-[9px] text-slate-400 dark:text-white/25 text-center mt-0.5">{progressPct}% complete</p>
          </div>

          {/* Right: metrics pills */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {(variables.length > 0 ? variables : MOCK_SIMULATION.variables).map(v => (
              <MetricPill
                key={v.variableName}
                displayName={v.displayName}
                value={variableValues[v.variableName] ?? v.startingValue}
                delta={phase === "revealing" ? varChanges.find(c => c.variableName === v.variableName)?.delta : undefined}
                animating={animating === v.variableName}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 sm:py-10">

        {/* Mobile progress */}
        <div className="sm:hidden mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10px] text-slate-400 dark:text-white/30">Decision {questionIndex + 1} / {totalQuestions}</span>
            <span className="font-mono text-[10px] text-[#7c6cfc]">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#7c6cfc] transition-all duration-500" style={{ width: `${progressPct}%` }}/>
          </div>
        </div>

        {/* Question tag */}
        {question && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7c6cfc]/10 border border-[#7c6cfc]/20 mb-5"
            style={{ animation: "fadeUp 0.4s ease" }}>
            <Zap className="w-3 h-3 text-[#7c6cfc]"/>
            <span className="font-mono text-[10px] text-[#7c6cfc] uppercase tracking-wider">{question.tag}</span>
          </div>
        )}

        {/* Situation update */}
        {question?.situationUpdate && (
          <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] p-5 mb-5 shadow-sm"
            style={{ animation: "fadeUp 0.4s ease 0.05s both" }}>
            <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider mb-2">Situation</p>
            <p className="font-body text-sm text-slate-600 dark:text-white/65 leading-relaxed">{question.situationUpdate}</p>
          </div>
        )}

        {/* Question card */}
        {question && (
          <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-[#7c6cfc]/20 p-5 sm:p-6 mb-6 shadow-md"
            style={{ animation: "fadeUp 0.4s ease 0.1s both" }}>
            <p className="font-mono text-[10px] text-[#7c6cfc]/70 uppercase tracking-wider mb-3">Decision Required</p>
            <p className="font-display font-semibold text-slate-900 dark:text-white text-base sm:text-lg leading-snug mb-3">
              {question.questionText}
            </p>
            {question.context && (
              <p className="font-body text-xs text-slate-500 dark:text-white/40 leading-relaxed border-t border-slate-100 dark:border-white/[0.06] pt-3 mt-3">
                📌 {question.context}
              </p>
            )}
          </div>
        )}

        {/* ── PLAYING PHASE: options grid ─────────────────────────────────── */}
        {phase === "playing" && question && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {question.options.map((opt, i) => (
                <OptionCard
                  key={opt.id}
                  option={opt}
                  index={i}
                  selected={selectedOption === opt.id}
                  disabled={false}
                  onSelect={() => setSelectedOption(selectedOption === opt.id ? null : opt.id)}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-4">
              <p className="font-body text-xs text-slate-400 dark:text-white/25">
                {selectedOption ? "Decision locked in — ready to submit" : "Select an option to continue"}
              </p>
              <button
                onClick={handleSubmit}
                disabled={!selectedOption || submitting}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#7c6cfc] hover:bg-[#6a5cf0] text-white font-body font-semibold transition-all shadow-lg shadow-[#7c6cfc]/20 disabled:opacity-40 disabled:cursor-not-allowed group">
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin"/> Submitting…</>
                  : <>Submit Decision <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"/></>
                }
              </button>
            </div>
          </>
        )}

        {/* ── REVEALING PHASE: consequence + changes ──────────────────────── */}
        {phase === "revealing" && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>

            {/* Chosen option recap */}
            {question && selectedOption && (
              <div className="mb-4">
                <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider mb-2">You chose</p>
                {question.options.filter(o => o.id === selectedOption).map(opt => (
                  <div key={opt.id} className="p-4 rounded-xl bg-[#7c6cfc]/10 border border-[#7c6cfc]/30">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-[#7c6cfc] flex items-center justify-center flex-shrink-0">
                        <span className="font-mono text-[10px] font-bold text-white">{opt.optionLabel}</span>
                      </div>
                      <div>
                        <p className="font-body font-semibold text-sm text-[#7c6cfc]">{opt.title}</p>
                        {opt.strategyTag && <span className="font-mono text-[9px] text-[#7c6cfc]/60">{opt.strategyTag}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Consequence */}
            <div className="rounded-2xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.1] p-5 mb-4 shadow-md">
              <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider mb-3">What Happened</p>
              <p className="font-body text-sm sm:text-base text-slate-700 dark:text-white/75 leading-relaxed">{consequence}</p>
            </div>

            {/* Metric changes */}
            {varChanges.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] p-5 mb-6 shadow-sm">
                <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider mb-3">Metric Impact</p>
                {varChanges.map((c, i) => <VarChangeRow key={i} change={c}/>)}
              </div>
            )}

            {/* Continue */}
            <div className="flex justify-end">
              <button onClick={handleContinue}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#7c6cfc] hover:bg-[#6a5cf0] text-white font-body font-semibold transition-all shadow-lg shadow-[#7c6cfc]/20 group">
                {!question ? "View Results" : "Next Decision"}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}