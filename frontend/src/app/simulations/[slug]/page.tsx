"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams }                       from "next/navigation";
import Link                                            from "next/link";
import {
  ArrowLeft, ArrowRight, Brain, Loader2, Zap,
  TrendingUp, TrendingDown, Play, Trophy,
  Target, Sparkles, Shield, ChevronRight, ChevronDown,
  CheckCircle2, RotateCcw, Users, MessageSquare,
  Rocket, User, Lock, Waves, Scale, BarChart3,
  Lightbulb, AlertCircle, Clock,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import api               from "@/lib/api";
import { toast }         from "sonner";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Variable   { id:string; variableName:string; displayName:string; startingValue:number; unit:string; higherIsBetter:boolean; }
interface Option     { id:string; optionLabel:string; title:string; description:string; strategyTag:string; }
interface Question   {
  id:string; questionNumber:number; tag:string; weekLabel?:string;
  charactersPresent:string[]; situationUpdate:string; questionText:string; context:string;
  options:Option[];
}
interface Character  { id:string; name:string; role:string; isPlayer:boolean; trustLevel?:number; emotionalState?:string; keyConcern?:string; }
interface DialogueLine { id:string; characterId:string; characterName:string; characterRole:string; isPlayer:boolean; text:string; sortOrder:number; }
type Phase = "loading"|"carousel"|"playing"|"submitted"|"complete";

/* ─── Act config ─────────────────────────────────────────────────────────── */
const ACTS = [
  { start:1,  end:6,  num:"ACT 1", title:"THE FIRST WEEK",          sub:"No playbook. No trust. No time. Just you and 7 weeks." },
  { start:7,  end:12, num:"ACT 2", title:"FIRES AND FOUNDATIONS",    sub:"Some fires you put out. Some you started." },
  { start:13, end:18, num:"ACT 3", title:"THE PRESSURE TEST",        sub:"This is when most PMs break. You won't." },
  { start:19, end:25, num:"ACT 4", title:"LEGACY IN THE MAKING",     sub:"The last chapter defines everything before it." },
];
function getAct(n:number) { return ACTS.find(a=>n>=a.start&&n<=a.end)||ACTS[0]; }

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function injectPlayerName(text:string|undefined|null, firstName:string):string {
  if(!text) return "";
  return text.replace(/\{\{PLAYER_NAME\}\}/gi, firstName);
}
function abbrev(name:string):string {
  return name
    .replace(/Engineering/gi,"Engg").replace(/Remaining/gi,"Rem.").replace(/Management/gi,"Mgmt")
    .replace(/Credibility/gi,"Cred.").replace(/Leadership/gi,"Lead.").replace(/Stakeholder/gi,"S/H")
    .replace(/Strategic/gi,"Strat.").replace(/Financial/gi,"Fin.").replace(/Customer/gi,"Cust.")
    .replace(/Satisfaction/gi,"Sat.").replace(/Confidence/gi,"Conf.").replace(/Awareness/gi,"Aware.")
    .replace(/Alignment/gi,"Align.").replace(/Readiness/gi,"Ready.").replace(/Clarity/gi,"Clrty.");
}

/* ─── Live Metric Row ────────────────────────────────────────────────────── */
function VarRow({ variable, value, delta, highlight }:{variable:Variable; value:number; delta?:number; highlight:boolean;}) {
  const pct = Math.min(100, Math.max(0, variable.unit==="INR_L"?(value/500)*100:value));
  const bar = value>=70?"bg-emerald-500":value>=50?"bg-amber-400":"bg-rose-500";
  const txt = value>=70?"text-emerald-400":value>=50?"text-amber-400":"text-rose-400";
  const hasDelta = highlight && delta!==undefined && delta!==0;
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors duration-500 ${highlight?"bg-white/[0.04]":""}`}>
      <span className="font-mono text-[11px] uppercase tracking-wide text-slate-400 dark:text-white/45 w-[72px] flex-shrink-0 truncate">
        {abbrev(variable.displayName)}
      </span>
      <div className="flex-1 h-2 bg-slate-200 dark:bg-white/[0.1] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${bar}`} style={{width:`${pct}%`}}/>
      </div>
      <span className={`font-mono text-[13px] font-bold w-9 text-right flex-shrink-0 ${txt}`}>
        {Math.round(value)}
      </span>
      {hasDelta && (
        <span className={`font-mono text-[9px] font-bold w-8 flex-shrink-0 flex items-center gap-0.5 ${delta!>0?"text-emerald-400":"text-rose-400"}`}>
          {delta!>0?<TrendingUp className="w-2.5 h-2.5"/>:<TrendingDown className="w-2.5 h-2.5"/>}
          {delta!>0?"+":""}{delta}
        </span>
      )}
      {!hasDelta && (
        <span className="font-mono text-[9px] text-slate-400 dark:text-white/25 w-8 flex-shrink-0">{variable.unit||"%"}</span>
      )}
    </div>
  );
}

/* ─── Parse situation text into narrative + character message bubbles ──────── */
interface SitSegment {
  type: "narrative" | "message";
  text: string;
  speaker?: string;   // e.g. "Priya Nair"
  medium?: string;    // "slack" | "email" | "calendar" | "message"
}

function parseSituationText(raw: string, presentNames: string[]): SitSegment[] {
  if (!raw) return [];
  const segments: SitSegment[] = [];
  const lines = raw.split("\n");
  let narrativeBuf: string[] = [];

  // Regex: anything ending with action word + colon + quoted string
  // e.g.  "Priya sends one more Slack: "He's going..."
  //        "Divya emails: "Whenever you're ready.""
  //        "Vikram's calendar reminder pings: "All-hands...""
  const MSG_RE = /^(.+?(?:sends?|emails?|pings?|messages?|texts?|says?|writes?|replies?|calls?|notes?|adds?)[^:]*?):\s*["""''](.+)["""'']$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const m = trimmed.match(MSG_RE);
    if (m) {
      // Flush narrative
      if (narrativeBuf.length > 0) {
        segments.push({ type: "narrative", text: narrativeBuf.join("\n").trim() });
        narrativeBuf = [];
      }
      const speakerPart = m[1].trim();
      const quote       = m[2].trim();

      // Detect medium
      let medium = "message";
      if (/slack/i.test(speakerPart))              medium = "slack";
      else if (/email/i.test(speakerPart))         medium = "email";
      else if (/calendar|reminder|ping/i.test(speakerPart)) medium = "calendar";
      else if (/call/i.test(speakerPart))          medium = "call";

      // Try to find speaker name from presentNames or from the text itself
      let speaker = speakerPart;
      for (const n of presentNames) {
        if (speakerPart.toLowerCase().startsWith(n.toLowerCase().split(" ")[0].toLowerCase())) {
          speaker = n; break;
        }
      }

      segments.push({ type: "message", text: quote, speaker, medium });
    } else {
      narrativeBuf.push(trimmed);
    }
  }

  if (narrativeBuf.length > 0) {
    segments.push({ type: "narrative", text: narrativeBuf.join("\n").trim() });
  }

  return segments;
}

/* ─── Situation Update renderer with chat bubbles ─────────────────────────── */
const MEDIUM_ICONS: Record<string, string> = {
  slack:    "💬",
  email:    "📧",
  calendar: "📅",
  call:     "📞",
  message:  "💬",
};

function SituationBlock({ situationUpdate, charactersPresent, allChars, inject }:
  { situationUpdate:string; charactersPresent:string[]; allChars:Character[]; inject:(t:string)=>string; }) {
  const segments = parseSituationText(inject(situationUpdate), charactersPresent);

  return (
    <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] overflow-hidden shadow-sm mb-5"
      style={{animation:"fadeUp 0.22s ease 0.04s both"}}>
      <div className="px-6 pt-5 pb-2 border-b border-slate-100 dark:border-white/[0.05]">
        <p className="font-mono text-[9px] text-slate-400 dark:text-white/30 uppercase tracking-widest">Situation Update</p>
      </div>
      <div className="px-6 py-5 space-y-4">
        {segments.map((seg, i) => {
          if (seg.type === "narrative") {
            return (
              <p key={i} className="font-body text-[15px] text-slate-700 dark:text-white/70 leading-[1.85] whitespace-pre-line">
                {seg.text}
              </p>
            );
          }
          // Message bubble
          const icon = MEDIUM_ICONS[seg.medium || "message"];
          const isPlayer = allChars.find(c => c.name === seg.speaker)?.isPlayer;
          return (
            <div key={i} className="flex items-start gap-3" style={{animation:`fadeUp 0.2s ease ${i*60}ms both`}}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm mt-0.5
                ${isPlayer ? "bg-[#5a7f2e] text-white" : "bg-slate-200 dark:bg-white/[0.12] text-slate-600 dark:text-white/70"}`}>
                {(seg.speaker || "?").charAt(0).toUpperCase()}
              </div>
              {/* Bubble */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[9px] font-bold text-slate-600 dark:text-white/55 uppercase tracking-wider">
                    {seg.speaker}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 dark:text-white/25">
                    {icon} {seg.medium}
                  </span>
                </div>
                <div className={`px-4 py-3 rounded-2xl rounded-tl-sm font-body text-sm leading-relaxed
                  ${isPlayer
                    ? "bg-[rgba(90,127,46,0.10)] border border-[#5a7f2e]/20 text-[#5a7f2e]/90"
                    : "bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-white/75"
                  }`}>
                  &ldquo;{seg.text}&rdquo;
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Option Card — title + always-visible description ───────────────────── */
function OptionCard({ option, index, selected, disabled, onSelect, inject }:
  { option:Option; index:number; selected:boolean; disabled:boolean; onSelect:()=>void; inject:(t:string)=>string; }) {
  const labels = ["A","B","C","D","E","F"];
  return (
    <button onClick={()=>{if(!disabled)onSelect();}} disabled={disabled}
      style={{animation:`fadeUp 0.24s ease ${index*35}ms both`}}
      className={`w-full text-left p-5 rounded-2xl border transition-all duration-200
        ${selected
          ?"bg-[rgba(90,127,46,0.10)] dark:bg-[rgba(90,127,46,0.15)] border-[#5a7f2e]/50 ring-1 ring-[#5a7f2e]/30 shadow-lg shadow-[#5a7f2e]/10"
          :disabled
            ?"opacity-60 cursor-not-allowed bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.05]"
            :"bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] hover:border-[#5a7f2e]/40 hover:bg-[#5a7f2e]/[0.04] cursor-pointer"
        }`}>
      <div className="flex items-start gap-3">
        {/* Label badge */}
        <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-mono font-bold mt-0.5
          ${selected?"bg-[#5a7f2e] text-white shadow-md shadow-[#5a7f2e]/30":"bg-slate-100 dark:bg-white/[0.08] text-slate-500 dark:text-white/40"}`}>
          {labels[index]}
        </div>
        <div className="flex-1 min-w-0">
          {/* Strategy tag */}
          {option.strategyTag&&(
            <span className={`inline-block font-mono text-[9px] px-2 py-0.5 rounded-full border mb-2
              ${selected?"bg-[rgba(90,127,46,0.20)] text-[#5a7f2e] border-[#5a7f2e]/30":"bg-slate-100 dark:bg-white/[0.06] text-slate-400 dark:text-white/30 border-transparent"}`}>
              {option.strategyTag}
            </span>
          )}
          {/* Title */}
          <p className={`font-body font-semibold text-sm leading-snug mb-2 ${selected?"text-[#5a7f2e]":"text-slate-800 dark:text-white"}`}>
            {inject(option.title)}
          </p>
          {/* Description — always visible */}
          {option.description&&(
            <p className={`font-body text-xs leading-relaxed ${selected?"text-[#5a7f2e]/75":"text-slate-500 dark:text-white/45"}`}>
              {inject(option.description)}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Act Banner ─────────────────────────────────────────────────────────── */
function ActBanner({ act, isNew }:{act:ReturnType<typeof getAct>; isNew:boolean}) {
  if(!isNew) return null;
  return (
    <div className="rounded-2xl border border-[#5a7f2e]/25 bg-gradient-to-r from-[#5a7f2e]/10 to-[#5a7f2e]/5 p-5 mb-5"
      style={{animation:"fadeUp 0.3s ease"}}>
      <p className="font-mono text-[9px] text-[#5a7f2e]/70 uppercase tracking-[0.2em] mb-1">{act.num}</p>
      <p className="font-display font-bold text-lg text-[#5a7f2e] leading-tight mb-1">{act.title}</p>
      <p className="font-body text-xs text-slate-500 dark:text-white/45 italic">&ldquo;{act.sub}&rdquo;</p>
    </div>
  );
}

/* ─── Characters Present strip ───────────────────────────────────────────── */
function CharactersPresent({ names, allChars, inject }:
  { names:string[]; allChars:Character[]; inject:(t:string)=>string; }) {
  if(!names||names.length===0) return null;
  const matched = names.map(n=>{
    const found = allChars.find(c=>c.name===n||injectPlayerName(c.name,"")===n);
    return found || { id:n, name:n, role:"", isPlayer:false };
  });
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4" style={{animation:"fadeUp 0.22s ease"}}>
      <span className="font-mono text-[9px] text-slate-400 dark:text-white/30 uppercase tracking-widest flex-shrink-0">Present:</span>
      {matched.map((c,i)=>(
        <span key={i}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-body text-xs font-medium
            ${c.isPlayer
              ?"bg-[rgba(90,127,46,0.15)] border-[#5a7f2e]/30 text-[#5a7f2e]"
              :"bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-white/60"}`}>
          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
            ${c.isPlayer?"bg-[#5a7f2e] text-white":"bg-slate-200 dark:bg-white/[0.15] text-slate-600 dark:text-white/60"}`}>
            {c.isPlayer?<User className="w-2.5 h-2.5"/>:inject(c.name).charAt(0).toUpperCase()}
          </span>
          {inject(c.name)}
        </span>
      ))}
    </div>
  );
}

/* ─── Outcome Panel (shown after submit) ─────────────────────────────────── */
function OutcomePanel({ option, consequence, inject, onNext, isLast }:
  { option:Option; consequence:string; inject:(t:string)=>string; onNext:()=>void; isLast:boolean; }) {
  return (
    <div className="space-y-4 mt-4" style={{animation:"popIn 0.3s ease"}}>
      {/* You chose */}
      <div className="rounded-2xl bg-[rgba(90,127,46,0.10)] border border-[#5a7f2e]/30 p-5">
        <p className="font-mono text-[9px] text-[#5a7f2e]/60 uppercase tracking-widest mb-3">Your Decision</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5a7f2e] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#5a7f2e]/30">
            <span className="font-mono text-sm font-bold text-white">{option.optionLabel}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-body font-semibold text-base text-[#5a7f2e] leading-snug">{inject(option.title)}</p>
            {option.strategyTag&&<span className="font-mono text-[9px] text-[#5a7f2e]/60">{option.strategyTag}</span>}
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0"/>
        </div>
      </div>

      {/* Consequence / Outcome text */}
      {consequence&&(
        <div className="rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.1] p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0"/>
            <p className="font-mono text-[9px] text-amber-500/80 uppercase tracking-widest">What Happened</p>
          </div>
          <p className="font-body text-sm text-slate-700 dark:text-white/70 leading-[1.8] italic">
            &ldquo;{inject(consequence)}&rdquo;
          </p>
        </div>
      )}

      {/* Sidebar hint + Next */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <p className="font-body text-xs text-slate-400 dark:text-white/30">
          Check the Live Metrics panel — your variables have updated.
        </p>
        <button onClick={onNext}
          className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-[#5a7f2e] hover:bg-[#4d6e26] text-white font-body font-semibold transition-all shadow-lg shadow-[#5a7f2e]/25 hover:-translate-y-0.5 group flex-shrink-0">
          {isLast
            ?<><Trophy className="w-4 h-4"/>View Results</>
            :<><RotateCcw className="w-4 h-4"/>Next Decision <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"/></>
          }
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════ INTRO CAROUSEL ══════════════════════════════ */
function IntroCarousel({ simulation, characters, dialogues, firstName, onBegin }:
  { simulation:any; characters:Character[]; dialogues:DialogueLine[]; firstName:string; onBegin:()=>void; }) {
  const [slide, setSlide] = useState(0);
  const TOTAL = 5;
  const inj = (t:string) => injectPlayerName(t, firstName);
  const SLIDES = [
    {icon:Target,        label:"Company Brief"},
    {icon:Users,         label:"Meet the Team"},
    {icon:MessageSquare, label:"Opening Scene"},
    {icon:Shield,        label:"Ground Rules"},
    {icon:Rocket,        label:"Begin"},
  ];
  const prev = () => setSlide(s=>Math.max(0,s-1));
  const next = () => slide<TOTAL-1?setSlide(s=>s+1):onBegin();

  return (
    <div className="min-h-screen w-full bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white flex flex-col">
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[rgba(90,127,46,0.5)] rounded-full blur-[150px]"/>
      </div>

      <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#070711]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.07]">
        <div className="w-full h-14 px-6 xl:px-12 flex items-center justify-between gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-500 dark:text-white/40 hover:text-slate-800 dark:hover:text-white text-sm font-body transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4"/> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            {SLIDES.map((_,i)=>(
              <button key={i} onClick={()=>setSlide(i)}
                className={`rounded-full transition-all duration-300 ${i===slide?"w-6 h-2.5 bg-[#5a7f2e]":i<slide?"w-2.5 h-2.5 bg-[rgba(90,127,46,0.40)]":"w-2.5 h-2.5 bg-slate-300 dark:bg-white/20"}`}/>
            ))}
          </div>
          <span className="font-mono text-[10px] text-slate-400 dark:text-white/30 flex-shrink-0">{slide+1} / {TOTAL}</span>
        </div>
      </header>

      <div className="flex-1 w-full px-6 xl:px-12 py-8 flex flex-col overflow-hidden">
        <div key={`lbl-${slide}`} className="flex items-center gap-3 mb-7" style={{animation:"fadeUp 0.25s ease"}}>
          {(()=>{ const S=SLIDES[slide]; return (<>
            <div className="w-9 h-9 rounded-xl bg-[rgba(90,127,46,0.10)] border border-[#5a7f2e]/20 flex items-center justify-center flex-shrink-0">
              <S.icon className="w-4 h-4 text-[#5a7f2e]"/>
            </div>
            <div>
              <p className="font-mono text-[9px] text-slate-400 dark:text-white/30 uppercase tracking-[0.15em] leading-none mb-0.5">Step {slide+1} of {TOTAL}</p>
              <p className="font-display font-bold text-xl text-slate-900 dark:text-white leading-none">{S.label}</p>
            </div>
          </>); })()}
        </div>

        {/* SLIDE 0 — COMPANY BRIEF */}
        {slide===0&&(
          <div className="flex-1 flex flex-col" style={{animation:"slideIn 0.35s ease"}}>
            <div className="flex-1 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] overflow-hidden shadow-sm flex flex-col">
              <div className="h-1.5 w-full flex-shrink-0" style={{background:"linear-gradient(90deg,#5a7f2e,#7aaa3e)"}}/>
              <div className="flex-1 overflow-y-auto">
                <div className="px-8 xl:px-12 py-8">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(90,127,46,0.10)] border border-[#5a7f2e]/20 mb-5">
                    <Sparkles className="w-3.5 h-3.5 text-[#5a7f2e]"/>
                    <span className="font-mono text-[10px] text-[#5a7f2e] uppercase tracking-wider">{simulation.difficulty} · {simulation.totalQuestions} Decisions · ~{simulation.estimatedMinutes} min</span>
                  </span>
                  <h1 className="font-display font-bold text-2xl xl:text-3xl text-slate-900 dark:text-white leading-tight mb-4">{inj(simulation.title)}</h1>
                  <p className="font-body text-sm xl:text-[15px] text-slate-600 dark:text-white/60 leading-[1.85] mb-7 whitespace-pre-line">{inj(simulation.story?.companyBackground)}</p>
                  {simulation.story?.closingChallenge&&(
                    <div className="rounded-2xl bg-[rgba(90,127,46,0.8)] border border-[#5a7f2e]/20 p-5">
                      <p className="font-mono text-[9px] text-[#5a7f2e]/70 uppercase tracking-widest mb-2">Your Challenge</p>
                      <p className="font-body text-sm text-slate-700 dark:text-white/70 leading-relaxed">{inj(simulation.story.closingChallenge)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 1 — MEET THE TEAM */}
        {slide===1&&(
          <div className="flex-1 overflow-y-auto" style={{animation:"slideIn 0.35s ease"}}>
            {characters.length===0
              ? <p className="font-body text-slate-400 dark:text-white/30 text-sm mt-8">No characters defined.</p>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pb-2">
                  {characters.map((c,i)=>{
                    const t=Math.min(100,Math.max(0,c.trustLevel??0));
                    const barCol=t>=70?"bg-emerald-500":t>=45?"bg-amber-400":"bg-rose-500";
                    const txtCol=t>=70?"text-emerald-500":t>=45?"text-amber-500":"text-rose-500";
                    return(
                      <div key={c.id} style={{animation:`fadeUp 0.3s ease ${i*60}ms both`}}
                        className={`rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl
                          ${c.isPlayer
                            ?"bg-gradient-to-br from-[#5a7f2e]/10 to-[#5a7f2e]/5 border-[#5a7f2e]/30 hover:shadow-[#5a7f2e]/20"
                            :"bg-white dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.08] hover:shadow-black/10 dark:hover:shadow-black/40"}`}>
                        <div className={`h-0.5 w-full ${c.isPlayer?"bg-[#5a7f2e]":"bg-slate-200 dark:bg-white/[0.06]"}`}/>
                        <div className="p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 shadow-sm
                              ${c.isPlayer?"bg-[#5a7f2e] text-white":"bg-slate-100 dark:bg-white/[0.1] text-slate-700 dark:text-white/70"}`}>
                              {c.isPlayer?<User className="w-5 h-5"/>:c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`font-display font-bold text-base leading-tight ${c.isPlayer?"text-[#5a7f2e]":"text-slate-900 dark:text-white"}`}>{inj(c.name)}</p>
                                {c.isPlayer&&<span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full bg-[#5a7f2e] text-white">YOU</span>}
                              </div>
                              <p className="font-body text-xs text-slate-500 dark:text-white/40 mt-0.5 leading-tight">{inj(c.role)}</p>
                            </div>
                          </div>
                          {c.trustLevel!=null&&(
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-mono text-[9px] text-slate-400 dark:text-white/30 uppercase tracking-wider">Trust Level</span>
                                <span className={`font-mono text-xs font-bold ${txtCol}`}>{t}<span className="font-normal text-slate-400 dark:text-white/25 text-[9px]">/100</span></span>
                              </div>
                              <div className="h-2 bg-slate-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${barCol}`} style={{width:`${t}%`}}/>
                              </div>
                            </div>
                          )}
                          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/[0.06]">
                            {c.emotionalState&&(
                              <div className="flex items-start gap-2 pt-2">
                                <span className="font-mono text-[9px] text-slate-400 dark:text-white/25 uppercase tracking-wider w-16 flex-shrink-0 mt-px">State</span>
                                <span className="font-body text-xs text-slate-600 dark:text-white/60 leading-snug">{inj(c.emotionalState)}</span>
                              </div>
                            )}
                            {c.keyConcern&&(
                              <div className="flex items-start gap-2">
                                <span className="font-mono text-[9px] text-slate-400 dark:text-white/25 uppercase tracking-wider w-16 flex-shrink-0 mt-px">Concern</span>
                                <span className="font-body text-xs text-slate-600 dark:text-white/60 leading-relaxed">{inj(c.keyConcern)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}

        {/* SLIDE 2 — OPENING SCENE / DIALOGUES */}
        {slide===2&&(
          <div className="flex-1 flex flex-col gap-5 overflow-hidden" style={{animation:"slideIn 0.35s ease"}}>
            {simulation.story?.howItWorks&&(
              <div className="flex-shrink-0 rounded-xl bg-[rgba(90,127,46,0.8)] border border-[#5a7f2e]/20 p-5">
                <p className="font-mono text-[9px] text-[#5a7f2e]/70 uppercase tracking-widest mb-2">How It Works</p>
                <p className="font-body text-xs xl:text-sm text-slate-600 dark:text-white/60 leading-relaxed">{inj(simulation.story.howItWorks)}</p>
              </div>
            )}
            {dialogues.length===0
              ? <p className="font-body text-slate-400 dark:text-white/30 text-sm">No opening dialogues recorded.</p>
              : <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                  {dialogues.map((d,i)=>(
                    <div key={d.id} style={{animation:`fadeUp 0.26s ease ${i*40}ms both`}}
                      className={`flex gap-4 ${d.isPlayer?"flex-row-reverse":"flex-row"}`}>
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm
                          ${d.isPlayer?"bg-[#5a7f2e] text-white":"bg-slate-200 dark:bg-white/[0.1] text-slate-600 dark:text-white/60"}`}>
                          {d.isPlayer?<User className="w-4 h-4"/>:d.characterName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className={`flex-1 max-w-[80%] xl:max-w-[72%] flex flex-col ${d.isPlayer?"items-end":"items-start"}`}>
                        <p className={`font-mono text-[9px] uppercase tracking-wider mb-1.5 ${d.isPlayer?"text-[#5a7f2e]":"text-slate-500 dark:text-white/40"}`}>
                          {inj(d.characterName)}{d.characterRole&&<span className="font-normal ml-1.5 normal-case tracking-normal text-slate-400 dark:text-white/25">{d.characterRole}</span>}
                        </p>
                        <div className={`px-4 py-3 text-xs xl:text-sm font-body leading-relaxed
                          ${d.isPlayer
                            ?"bg-[#5a7f2e] text-white rounded-2xl rounded-tr-sm shadow-md shadow-[#5a7f2e]/20"
                            :"bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-white/75 rounded-2xl rounded-tl-sm shadow-sm"}`}>
                          {inj(d.text)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* SLIDE 3 — GROUND RULES */}
        {slide===3&&(
          <div className="flex-1 flex flex-col lg:flex-row gap-5 overflow-hidden" style={{animation:"slideIn 0.35s ease"}}>
            <div className="flex-1 min-w-0 overflow-y-auto space-y-3 pr-1">
              {([
                {Icon:Lock,      c:"text-rose-500",    bg:"bg-rose-500/10",    br:"border-rose-500/20",    t:"Decisions are final",      b:"Once submitted, you cannot go back. Each choice locks in permanently."},
                {Icon:Waves,     c:"text-blue-500",    bg:"bg-blue-500/10",    br:"border-blue-500/20",    t:"Consequences compound",    b:"Every choice ripples through all metrics. An early mistake can define your final score."},
                {Icon:Scale,     c:"text-amber-500",   bg:"bg-amber-500/10",   br:"border-amber-500/20",   t:"No perfect answer",        b:"Every option is a trade-off. Optimising one metric often costs another."},
                {Icon:BarChart3, c:"text-[#5a7f2e]",   bg:"bg-[rgba(90,127,46,0.10)]",   br:"border-[#5a7f2e]/20",   t:"Scored on 5 dimensions",   b:"Financial prudence, stakeholder trust, risk management, credibility, morale, strategy."},
                {Icon:Lightbulb, c:"text-emerald-500", bg:"bg-emerald-500/10", br:"border-emerald-500/20", t:"Think, then commit",       b:"Read the outcome narrative after each decision — it shapes the next situation."},
              ] as const).map((r,i)=>(
                <div key={i} style={{animation:`fadeUp 0.26s ease ${i*50}ms both`}}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] shadow-sm">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${r.bg} ${r.br}`}>
                    <r.Icon className={`w-5 h-5 ${r.c}`}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-sm text-slate-800 dark:text-white leading-tight mb-0.5">{r.t}</p>
                    <p className="font-body text-xs text-slate-500 dark:text-white/40 leading-relaxed">{r.b}</p>
                  </div>
                </div>
              ))}
            </div>
            {simulation.variables?.length>0&&(
              <div className="lg:w-72 xl:w-80 flex-shrink-0 self-start flex flex-col rounded-2xl overflow-hidden shadow-sm"
                style={{background:"linear-gradient(135deg,rgba(90,127,46,0.08),rgba(90,127,46,0.03))",border:"1px solid rgba(90,127,46,0.2)"}}>
                <div className="px-5 py-4 border-b border-[#5a7f2e]/15">
                  <p className="font-mono text-[9px] text-[#5a7f2e]/70 uppercase tracking-widest">Metrics you&apos;ll manage</p>
                  <p className="font-body text-xs text-slate-500 dark:text-white/35 mt-0.5">Starting values — every decision moves these</p>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {simulation.variables.map((v:Variable,i:number)=>{
                    const pct=Math.min(100,Math.max(0,v.startingValue));
                    const PALETTE=[
                      {bar:"#5a7f2e",txt:"text-[#5a7f2e]",track:"rgba(90,127,46,0.13)"},
                      {bar:"#10b981",txt:"text-emerald-400",track:"rgba(16,185,129,0.13)"},
                      {bar:"#f59e0b",txt:"text-amber-400",track:"rgba(245,158,11,0.13)"},
                      {bar:"#3b82f6",txt:"text-blue-400",track:"rgba(59,130,246,0.13)"},
                      {bar:"#ec4899",txt:"text-pink-400",track:"rgba(236,72,153,0.13)"},
                      {bar:"#14b8a6",txt:"text-teal-400",track:"rgba(20,184,166,0.13)"},
                      {bar:"#f97316",txt:"text-orange-400",track:"rgba(249,115,22,0.13)"},
                      {bar:"#a855f7",txt:"text-purple-400",track:"rgba(168,85,247,0.13)"},
                      {bar:"#ef4444",txt:"text-rose-400",track:"rgba(239,68,68,0.13)"},
                    ];
                    const pal=PALETTE[i%PALETTE.length];
                    return(
                      <div key={v.id} style={{animation:`fadeUp 0.28s ease ${i*45}ms both`}} className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-slate-300 dark:text-white/50 font-medium flex-shrink-0 w-[110px] truncate">{v.displayName}</span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:pal.track}}>
                          <div className="h-full rounded-full" style={{width:`${pct}%`,background:pal.bar}}/>
                        </div>
                        <span className={`font-mono text-[10px] font-bold flex-shrink-0 w-9 text-right ${pal.txt}`}>{v.startingValue}{v.unit||"%"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SLIDE 4 — READY */}
        {slide===4&&(
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6" style={{animation:"slideIn 0.35s ease"}}>
            <div className="w-24 h-24 rounded-3xl bg-[rgba(90,127,46,0.15)] border border-[#5a7f2e]/25 flex items-center justify-center shadow-2xl shadow-[#5a7f2e]/15">
              <Rocket className="w-12 h-12 text-[#5a7f2e]"/>
            </div>
            <div className="max-w-lg">
              <h2 className="font-display font-bold text-2xl xl:text-3xl text-slate-900 dark:text-white mb-3 leading-tight">Ready, {firstName}?</h2>
              <p className="font-body text-sm text-slate-500 dark:text-white/50 leading-relaxed">
                {simulation.totalQuestions} decisions await. Read each outcome carefully — it shapes what comes next. There is no undo.
              </p>
            </div>
            <button onClick={onBegin}
              className="flex items-center gap-2.5 px-10 py-3.5 rounded-2xl bg-[#5a7f2e] hover:bg-[#4d6e26] text-white font-body font-semibold text-base transition-all shadow-2xl shadow-[#5a7f2e]/30 hover:-translate-y-1 group">
              <Play className="w-5 h-5"/> Begin Simulation
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
            </button>
            <p className="font-body text-xs text-slate-400 dark:text-white/25">~{simulation.estimatedMinutes} min · {simulation.totalQuestions} decisions · {simulation.difficulty}</p>
          </div>
        )}
      </div>

      <footer className="sticky bottom-0 bg-white/95 dark:bg-[#070711]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/[0.07]">
        <div className="w-full px-6 xl:px-12 h-[60px] flex items-center justify-between gap-4">
          <button onClick={prev} disabled={slide===0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-body text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-white/60 hover:enabled:bg-slate-200 dark:hover:enabled:bg-white/10">
            <ArrowLeft className="w-4 h-4"/> Previous
          </button>
          <div className="hidden md:flex items-center gap-1">
            {SLIDES.map((s,i)=>(
              <button key={i} onClick={()=>setSlide(i)}
                className={`font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all
                  ${i===slide?"bg-[rgba(90,127,46,0.15)] text-[#5a7f2e] border border-[#5a7f2e]/25":"text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50"}`}>
                {s.label}
              </button>
            ))}
          </div>
          <button onClick={next}
            className="flex items-center gap-2 px-7 py-2 rounded-xl font-body text-sm font-semibold transition-all bg-[#5a7f2e] hover:bg-[#4d6e26] text-white shadow-lg shadow-[#5a7f2e]/25 group">
            {slide===TOTAL-1?<><Play className="w-4 h-4"/> Begin</>:<>Next <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"/></>}
          </button>
        </div>
      </footer>
    </div>
  );
}

/* ══════════════════════════ MAIN PAGE ══════════════════════════════════ */
export default function SimulationPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const slug   = params?.slug as string;
  const { user, hasHydrated, fetchMe } = useAuthStore();

  const [phase,          setPhase]          = useState<Phase>("loading");
  const [simulation,     setSimulation]     = useState<any>(null);
  const [characters,     setCharacters]     = useState<Character[]>([]);
  const [dialogues,      setDialogues]      = useState<DialogueLine[]>([]);
  const [variables,      setVariables]      = useState<Variable[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string,number>>({});
  const [variableDeltas, setVariableDeltas] = useState<Record<string,number>>({});
  const [sessionId,      setSessionId]      = useState<string|null>(null);
  const [question,       setQuestion]       = useState<Question|null>(null);
  const [nextQ,          setNextQ]          = useState<Question|null>(null);
  const [selectedOption, setSelectedOption] = useState<string|null>(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [isLastQ,        setIsLastQ]        = useState(false);
  const [answeredCount,  setAnsweredCount]  = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(25);
  const [consequence,    setConsequence]    = useState<string>("");
  const [highlightVars,  setHighlightVars]  = useState(false);
  const [prevAct,        setPrevAct]        = useState<string>("");

  const submittingRef = useRef(false);
  const firstName     = user?.name?.split(" ")[0]||"there";
  const inject        = useCallback((t:string)=>injectPlayerName(t,firstName),[firstName]);

  const currentQNum  = phase==="submitted" ? answeredCount : answeredCount+1;
  const safeAnswered = Math.min(answeredCount, totalQuestions);
  const progressPct  = totalQuestions>0 ? Math.round((safeAnswered/totalQuestions)*100) : 0;
  const isSubmitted  = phase==="submitted";
  const chosenOption = isSubmitted&&selectedOption&&question
    ? question.options.find(o=>o.id===selectedOption)??null : null;

  const currentAct  = question ? getAct(question.questionNumber) : ACTS[0];
  const isNewAct    = question ? currentAct.num!==prevAct : false;

  useEffect(()=>{
    const guard=()=>{
      const{isAuthenticated,user:u}=useAuthStore.getState();
      if(!u||!isAuthenticated){router.replace("/auth/login");return;}
      if(!slug){router.replace("/dashboard");return;}
      loadSimulation();
    };
    if(hasHydrated)guard(); else fetchMe().then(guard);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const loadSimulation=async()=>{
    try{
      const res=await api.get(`/simulations/${slug}`);
      const{simulation:sim,session}=res.data.data;
      setSimulation(sim);
      setVariables(sim.variables||[]);
      setCharacters(sim.characters||[]);
      setDialogues(sim.dialogues||[]);
      const total=sim.totalQuestions||25;
      setTotalQuestions(total);
      const vals:Record<string,number>={};
      if(session?.variableValues) Object.assign(vals,session.variableValues);
      else (sim.variables||[]).forEach((v:Variable)=>{vals[v.variableName]=v.startingValue;});
      setVariableValues(vals);
      if(session?.status==="COMPLETED"){router.replace(`/simulations/${slug}/result`);return;}
      if(session?.answeredCount>0) setAnsweredCount(Math.min(session.answeredCount,total));
      setPhase("carousel");
    }catch(e:any){
      toast.error(e?.response?.data?.message||"Could not load simulation.");
      router.replace("/dashboard");
    }
  };

  const handleBegin=async()=>{
    setPhase("loading");
    try{
      const res=await api.post(`/simulations/${slug}/start`);
      const d=res.data.data;
      setSessionId(d.sessionId);
      if(d.variables?.length) setVariables(d.variables);
      if(d.variableValues)    setVariableValues(d.variableValues);
      const total=d.totalQuestions||totalQuestions;
      setTotalQuestions(total);
      setAnsweredCount(Math.min(d.currentQuestionIndex??0,total));
      if(d.question){
        const act=getAct(d.question.questionNumber);
        setPrevAct(act.num);
        setQuestion(d.question);setPhase("playing");
      } else setPhase("complete");
    }catch(e:any){
      toast.error(e?.response?.data?.message||"Failed to start.");
      setPhase("carousel");
    }
  };

  const resyncFromServer=async()=>{
    try{
      const res=await api.post(`/simulations/${slug}/start`);
      const d=res.data.data;
      const total=d.totalQuestions||totalQuestions;
      setTotalQuestions(total);
      setAnsweredCount(Math.min(d.currentQuestionIndex??0,total));
      if(d.variableValues) setVariableValues(d.variableValues);
      if(!d.question){setPhase("complete");return;}
      setPrevAct(getAct(d.question.questionNumber).num);
      setQuestion(d.question);setNextQ(null);setSelectedOption(null);setConsequence("");
      setPhase("playing");
    }catch{ setPhase("complete"); }
  };

  const handleSubmit=async()=>{
    if(submittingRef.current) return;
    if(!selectedOption){toast.error("Please select an option first.");return;}
    if(!question){toast.error("No question loaded.");return;}

    let sid=sessionId;
    if(!sid){
      try{
        const rec=await api.post(`/simulations/${slug}/start`);
        const rd=rec.data.data;
        sid=rd.sessionId; setSessionId(sid);
        const total=rd.totalQuestions||totalQuestions;
        setTotalQuestions(total);
        setAnsweredCount(Math.min(rd.currentQuestionIndex??0,total));
        if(rd.variableValues) setVariableValues(rd.variableValues);
        if(rd.question&&rd.question.id!==question.id){
          setQuestion(rd.question);setSelectedOption(null);
          toast("Session recovered — please reselect your answer.");setPhase("playing");return;
        }
      }catch{toast.error("Session lost. Please restart.");setPhase("carousel");return;}
    }

    submittingRef.current=true;
    setSubmitting(true);
    try{
      const res=await api.post(`/simulations/${slug}/answer`,{
        sessionId:sid, questionId:question.id, optionId:selectedOption,
      });
      const d=res.data.data;
      setIsLastQ(!!d.isLastQuestion);
      setNextQ(d.nextQuestion||null);
      const newAnswered=Math.min(d.answeredCount??answeredCount+1, d.totalQuestions||totalQuestions);
      setAnsweredCount(newAnswered);
      if(d.totalQuestions) setTotalQuestions(d.totalQuestions);
      if(d.variableValues) setVariableValues(d.variableValues);
      // Build delta map
      if(d.variableChanges){
        const dm:Record<string,number>={};
        d.variableChanges.forEach((vc:any)=>{dm[vc.variableName]=vc.delta;});
        setVariableDeltas(dm);
      }
      setConsequence(d.consequence||"");
      setHighlightVars(true);
      setPhase("submitted");
    }catch(e:any){
      const status=e?.response?.status;
      const msg=e?.response?.data?.message||e?.message||"";
      if(msg==="Question already answered"){
        toast("Syncing your progress…"); await resyncFromServer();
      }else if(status===403||msg.toLowerCase().includes("invalid")||msg.toLowerCase().includes("session")){
        toast.error("Session expired — restarting…"); setSessionId(null);setPhase("carousel");
      }else if(status===404&&msg.toLowerCase().includes("option")){
        toast.error("Invalid option. Please select again."); setSelectedOption(null);
      }else{
        toast.error(msg||"Failed to submit. Please try again.");
      }
    }finally{
      setSubmitting(false); submittingRef.current=false;
    }
  };

  const handleNext=async()=>{
    setHighlightVars(false);
    setVariableDeltas({});
    setSelectedOption(null);
    setConsequence("");
    if(isLastQ){
      if(sessionId){try{await api.post(`/simulations/${slug}/complete`,{sessionId});}catch{}}
      setPhase("complete");
    }else{
      if(nextQ){
        const newAct=getAct(nextQ.questionNumber);
        // Show act banner if act changed
        if(newAct.num!==currentAct.num) setPrevAct(currentAct.num); else setPrevAct(newAct.num);
        setQuestion(nextQ);
      }
      setPhase("playing");
    }
  };

  /* Loading */
  if(phase==="loading")return(
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#5a7f2e] animate-spin mx-auto"/>
        <p className="font-mono text-xs text-slate-500 dark:text-white/30">Loading simulation…</p>
      </div>
    </div>
  );

  if(phase==="carousel")return <IntroCarousel simulation={simulation} characters={characters} dialogues={dialogues} firstName={firstName} onBegin={handleBegin}/>;

  if(phase==="complete")return(
    <>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center p-4 text-slate-900 dark:text-white">
      <div className="relative z-10 max-w-md w-full text-center" style={{animation:"fadeUp 0.5s ease"}}>
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-emerald-500"/>
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl mb-3">Simulation Complete!</h1>
        <p className="font-body text-slate-500 dark:text-white/50 mb-6">You made {safeAnswered} decisions. Calculating your score…</p>
        <button onClick={()=>router.push(`/simulations/${slug}/result`)}
          className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-[#5a7f2e] hover:bg-[#4d6e26] text-white font-body font-semibold transition-all shadow-xl shadow-[#5a7f2e]/25 group">
          View Full Results <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
        </button>
      </div>
    </div>
    </>
  );

  /* ══════════════════ PLAYING + SUBMITTED ══════════════════ */
  return(
    <>
    <style>{`
      @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      @keyframes popIn{from{transform:scale(0.95);opacity:0}to{transform:scale(1);opacity:1}}
      @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
    `}</style>

    <div className="h-screen w-screen flex flex-col bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-white overflow-hidden">

      {/* TOP BAR */}
      <div className="flex-shrink-0 bg-white/95 dark:bg-[#070711]/95 backdrop-blur-md border-b border-slate-200 dark:border-white/[0.07] shadow-sm z-50">
        <div className="w-full h-14 px-5 xl:px-8 flex items-center gap-4">
          <Link href="/dashboard" className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-white/40"/>
          </Link>
          <div className="flex-shrink-0">
            <p className="font-mono text-[9px] text-slate-400 dark:text-white/30 uppercase tracking-widest leading-none mb-0.5">
              Decision {Math.min(currentQNum,totalQuestions)} / {totalQuestions}
              {question?.weekLabel&&<span className="ml-2 text-[#5a7f2e]/70">· {question.weekLabel}</span>}
            </p>
            <p className="font-display font-semibold text-slate-800 dark:text-white text-sm leading-none truncate max-w-[280px]">
              {inject(simulation?.title||"")}
            </p>
          </div>
          <div className="flex-1"/>
          {/* Progress bar */}
          <div className="hidden sm:flex flex-col justify-center w-64 lg:w-96 xl:w-[520px] flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px] text-slate-400 dark:text-white/30">{safeAnswered} of {totalQuestions} answered</span>
              <span className="font-mono text-[10px] text-[#5a7f2e] font-bold">{progressPct}%</span>
            </div>
            <div className="h-2.5 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#5a7f2e] to-[#7aaa3e] transition-all duration-700" style={{width:`${progressPct}%`}}/>
            </div>
          </div>
          <div className="flex-1"/>
          {/* Act badge */}
          <div className="hidden md:flex flex-shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(90,127,46,0.10)] border border-[#5a7f2e]/20">
            <Zap className="w-3 h-3 text-[#5a7f2e]"/>
            <span className="font-mono text-[9px] text-[#5a7f2e] uppercase tracking-widest">{currentAct.num}</span>
          </div>
          {/* Status pill */}
          <div className="flex-shrink-0">
            {isSubmitted
              ?<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/><span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Submitted</span></div>
              :<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(90,127,46,0.10)] border border-[#5a7f2e]/20"><Brain className="w-3.5 h-3.5 text-[#5a7f2e]"/><span className="font-mono text-[10px] text-[#5a7f2e]">Deciding…</span></div>
            }
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT — question area */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 xl:px-12 2xl:px-16 py-6">

            {/* Act banner — show when entering new act */}
            {question&&isNewAct&&<ActBanner act={currentAct} isNew={isNewAct}/>}

            {/* Week label + Tag */}
            <div className="flex flex-wrap items-center gap-2 mb-4" style={{animation:"fadeUp 0.2s ease"}}>
              {question?.weekLabel&&(
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1]">
                  <Clock className="w-3 h-3 text-slate-400 dark:text-white/30"/>
                  <span className="font-mono text-[9px] text-slate-500 dark:text-white/40 uppercase tracking-wider">{question.weekLabel}</span>
                </span>
              )}
              {question?.tag&&(
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(90,127,46,0.10)] border border-[#5a7f2e]/20">
                  <Zap className="w-3 h-3 text-[#5a7f2e]"/>
                  <span className="font-mono text-[9px] text-[#5a7f2e] uppercase tracking-widest">{question.tag}</span>
                </span>
              )}
            </div>

            {/* Characters present */}
            {question?.charactersPresent&&question.charactersPresent.length>0&&(
              <CharactersPresent names={question.charactersPresent} allChars={characters} inject={inject}/>
            )}

            {/* Situation Update — narrative + chat bubbles */}
            {question?.situationUpdate&&(
              <SituationBlock
                situationUpdate={question.situationUpdate}
                charactersPresent={question.charactersPresent||[]}
                allChars={characters}
                inject={inject}
              />
            )}

            {/* Decision Question */}
            {question&&(
              <div className="rounded-2xl bg-white dark:bg-white/[0.04] border-2 border-[#5a7f2e]/30 p-6 mb-5 shadow-xl shadow-[#5a7f2e]/5" style={{animation:"fadeUp 0.22s ease 0.08s both"}}>
                <p className="font-mono text-[9px] text-[#5a7f2e]/60 uppercase tracking-widest mb-3">Decision Required</p>
                <p className="font-display font-semibold text-slate-900 dark:text-white text-xl xl:text-2xl leading-snug">{inject(question.questionText)}</p>
                {question.context&&(
                  <p className="font-body text-sm text-slate-500 dark:text-white/40 leading-relaxed border-t border-slate-100 dark:border-white/[0.07] pt-4 mt-5">
                    📌 {inject(question.context)}
                  </p>
                )}
              </div>
            )}

            {/* Options grid */}
            {question&&(
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6" style={{animation:"fadeUp 0.22s ease 0.10s both"}}>
                {question.options.map((opt,i)=>(
                  <OptionCard key={opt.id}
                    option={opt} index={i}
                    selected={selectedOption===opt.id}
                    disabled={isSubmitted}
                    inject={inject}
                    onSelect={()=>{if(!isSubmitted)setSelectedOption(p=>p===opt.id?null:opt.id);}}
                  />
                ))}
              </div>
            )}

            {/* Submit button (playing phase) */}
            {!isSubmitted&&(
              <div className="flex items-center justify-between gap-6" style={{animation:"fadeUp 0.22s ease 0.14s both"}}>
                <p className="font-body text-sm text-slate-400 dark:text-white/30">
                  {selectedOption?"Option selected — click Submit to lock in your decision":"Select one of the 6 options above"}
                </p>
                <button onClick={handleSubmit} disabled={!selectedOption||submitting}
                  className="flex items-center gap-2.5 px-9 py-3.5 rounded-2xl bg-[#5a7f2e] hover:bg-[#4d6e26] text-white font-body font-semibold flex-shrink-0 transition-all shadow-lg shadow-[#5a7f2e]/25 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5">
                  {submitting?<><Loader2 className="w-4 h-4 animate-spin"/>Submitting…</>:<>Submit Decision <ChevronRight className="w-4 h-4"/></>}
                </button>
              </div>
            )}

            {/* Outcome panel (submitted phase) */}
            {isSubmitted&&chosenOption&&(
              <OutcomePanel
                option={chosenOption}
                consequence={consequence}
                inject={inject}
                onNext={handleNext}
                isLast={isLastQ}
              />
            )}

            <div className="h-12"/>
          </div>
        </div>

        {/* RIGHT — Live Metrics sidebar */}
        <div className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 border-l border-slate-200 dark:border-white/[0.07] bg-slate-50/80 dark:bg-[#0a0a1a]">
          <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-slate-200 dark:border-white/[0.07]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#5a7f2e] animate-pulse"/>
                <p className="font-mono text-[10px] text-slate-500 dark:text-white/40 uppercase tracking-widest">Live Metrics</p>
              </div>
              {highlightVars&&(
                <span className="font-mono text-[8px] text-[#5a7f2e] bg-[rgba(90,127,46,0.10)] px-2 py-0.5 rounded-full border border-[#5a7f2e]/20 font-bold">Updated</span>
              )}
            </div>
            <p className="font-body text-[10px] text-slate-400 dark:text-white/25 leading-snug">
              {isSubmitted?"Values updated — deltas shown in sidebar":"Watch these shift after each decision"}
            </p>
            <div className="flex items-center gap-3 px-4 mt-2">
              <span className="font-mono text-[8px] text-slate-400 dark:text-white/20 uppercase w-[72px] flex-shrink-0">Metric</span>
              <span className="flex-1 font-mono text-[8px] text-slate-400 dark:text-white/20 uppercase text-center">—</span>
              <span className="font-mono text-[8px] text-slate-400 dark:text-white/20 uppercase w-9 text-right flex-shrink-0">Val</span>
              <span className="w-8 flex-shrink-0"/>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.04]">
            {variables.map(v=>(
              <VarRow key={v.variableName} variable={v}
                value={variableValues[v.variableName]??v.startingValue}
                delta={variableDeltas[v.variableName]}
                highlight={highlightVars&&variableDeltas[v.variableName]!==undefined&&variableDeltas[v.variableName]!==0}
              />
            ))}
          </div>

          <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 dark:border-white/[0.07]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[8px] text-slate-400 dark:text-white/25 uppercase tracking-widest">Progress</span>
              <span className="font-mono text-[10px] text-[#5a7f2e] font-bold">{safeAnswered}/{totalQuestions}</span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-white/[0.08] rounded-full overflow-hidden mb-1">
              <div className="h-full rounded-full bg-gradient-to-r from-[#5a7f2e] to-[#7aaa3e] transition-all duration-700" style={{width:`${progressPct}%`}}/>
            </div>
            <p className="font-mono text-[8px] text-slate-400 dark:text-white/20">{Math.max(0,totalQuestions-safeAnswered)} remaining</p>
          </div>
        </div>
      </div>

      {/* MOBILE — metric strip */}
      <div className="lg:hidden flex-shrink-0 border-t border-slate-200 dark:border-white/[0.07] bg-white/90 dark:bg-[#070711]/90 backdrop-blur-sm">
        <div className="flex items-center px-2 py-2 overflow-x-auto gap-1.5">
          {variables.map(v=>{
            const val=variableValues[v.variableName]??v.startingValue;
            const delta=variableDeltas[v.variableName];
            const col=val>=70?"text-emerald-500":val>=50?"text-amber-500":"text-rose-500";
            const bar=val>=70?"bg-emerald-500":val>=50?"bg-amber-400":"bg-rose-500";
            return(
              <div key={v.variableName}
                className="flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg border min-w-[64px] bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.08]">
                <span className="font-mono text-[7px] text-slate-400 dark:text-white/30 uppercase tracking-wider truncate max-w-full">{abbrev(v.displayName).replace(/\s.*/,"")}</span>
                <span className={`font-display font-bold text-sm leading-none ${col}`}>{Math.round(val)}</span>
                {highlightVars&&delta!==undefined&&delta!==0&&(
                  <span className={`font-mono text-[7px] font-bold ${delta>0?"text-emerald-500":"text-rose-500"}`}>{delta>0?"+":""}{delta}</span>
                )}
                <div className="w-full h-1 bg-slate-100 dark:bg-white/[0.07] rounded-full overflow-hidden mt-0.5">
                  <div className={`h-full rounded-full ${bar}`} style={{width:`${Math.min(100,val)}%`}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}