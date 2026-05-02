"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2, ArrowLeft, Plus, Trash2, Check, X,
  BookOpen, Activity, Target, HelpCircle, Users,
  Eye, EyeOff, Pencil, ChevronDown, ChevronUp,
  MessageSquare, BarChart3, Flag, Zap, Award,
  FileText, TrendingUp, GraduationCap, Briefcase, Compass,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

/* ════ Constants ═══════════════════════════════════════════════════════════ */
const TABS = ["Story","OpeningScene","Characters","Variables","Scoring","Endings","PreDecision","Questions","Results"] as const;
type Tab   = typeof TABS[number];

const G = "#5a7f2e";
const OPTION_LABELS  = ["A","B","C","D","E","F"];
const CHANNELS       = ["Slack","Email","WhatsApp","Calendar","In Person","Narrative"] as const;
const STRATEGY_TAGS  = [
  "INFORMATION FIRST","STAKEHOLDER FIRST","ESCALATE","COLLABORATIVE","BUY TIME",
  "DECISIVE","DELEGATE","TRANSPARENT","CAUTIOUS","BOLD","COMMERCIAL FIRST",
  "PROCESS FIRST","DATA DRIVEN","EMPATHETIC","POLITICAL","LONG TERM","SHORT TERM",
];
const SCORING_DIMS   = [
  "FINANCIAL_PRUDENCE","STAKEHOLDER_ALIGNMENT","RISK_MANAGEMENT",
  "LEADERSHIP_CREDIBILITY","TEAM_MORALE","STRATEGIC_CLARITY","CUSTOM",
];
const DECISION_TOPICS = [
  "FIRST CALL","INFORMATION AUDIT","PROMISE AUDIT","SILENT STAKEHOLDER","TEAM TRUST","NORTH STAR",
  "QUALITY CRISIS","ETHICAL CALL","GO OR NO GO","COMPETITIVE THREAT","RESOURCE ALLOCATION","COMMERCIAL STRATEGY",
  "CRISIS RESPONSE","BAD DATA","ALIGNMENT CALL","DIFFICULT CUT","GROWTH DECISION","EXTERNAL NARRATIVE",
  "COMMUNICATION STRATEGY","HIGH STAKES NEGOTIATION","STRUCTURAL DEBT","VISION CALL",
  "TEAM DECISION","INTERNAL PRESENTATION","LEGACY CALL",
];
const ENDING_KEYS = ["complete","strategic","firefighter","learning"] as const;
const ACT_RANGES  = [[1,6],[7,12],[13,18],[19,25]];
function getAct(n:number){ return ACT_RANGES.findIndex(([s,e]:any)=>n>=s&&n<=e)+1||1; }

const GRADE_BANDS = [
  {grade:"A+",range:"91–100",what:"Exceptional — all dimensions strong, compounding worked throughout"},
  {grade:"A", range:"81–90", what:"Strong — clear intent, a few patterns worth examining"},
  {grade:"B+",range:"71–80", what:"More right than wrong — specific gaps are identifiable"},
  {grade:"B", range:"61–70", what:"Held the situation together — higher cost than necessary"},
  {grade:"C+",range:"51–60", what:"A difficult run — patterns that made it difficult now visible"},
  {grade:"C", range:"41–50", what:"Significant difficulty — important development needs revealed"},
  {grade:"D+",range:"31–40", what:"Fundamental gaps — experience was challenging but diagnosis is clear"},
  {grade:"D", range:"21–30", what:"Serious development needs across nearly all dimensions"},
  {grade:"E", range:"11–20", what:"Critical gaps — most honest and complete diagnostic"},
  {grade:"F", range:"1–10",  what:"Complete breakdown — the most instructive outcome"},
];
const USER_TYPES = [
  {key:"PLACEMENT",    label:"Placement Prep",      icon:GraduationCap, color:"text-violet-700", bg:"bg-violet-50", border:"border-violet-200"},
  {key:"EXPLORER",     label:"Student Explorer",    icon:Compass,       color:"text-emerald-700",bg:"bg-emerald-50",border:"border-emerald-200"},
  {key:"PROFESSIONAL", label:"Junior Professional", icon:Briefcase,     color:"text-amber-700",  bg:"bg-amber-50",  border:"border-amber-200"},
] as const;
type UTKey = typeof USER_TYPES[number]["key"];

/* ════ Shared UI ════════════════════════════════════════════════════════════ */
const INP = "w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all";
const SEL = `${INP} cursor-pointer`;
const LBL = "font-mono text-[11px] text-slate-500 uppercase tracking-wider block mb-2 font-semibold";
const H3  = "font-display font-bold text-base text-slate-800 mb-1";
const SUB = "font-body text-xs text-slate-500 mb-4";

function F({ label,value,onChange,type="text",rows=1,placeholder="" }:any){
  return(
    <div>
      {label&&<label className={LBL}>{label}</label>}
      {rows>1
        ?<textarea className={`${INP} resize-none`} rows={rows} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>
        :<input type={type} className={INP} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/>
      }
    </div>
  );
}

function Btn({ onClick,loading,children,variant="green",disabled=false }:any){
  const base="flex items-center gap-2 px-5 py-2.5 rounded-xl font-body font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed";
  const styles:any={
    green:  `${base} text-white shadow-sm`,
    ghost:  `${base} bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200`,
    red:    `${base} bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100`,
    blue:   `${base} bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100`,
    outline:`${base} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`,
  };
  return(
    <button onClick={onClick} disabled={loading||disabled} className={styles[variant]} style={variant==="green"?{background:G}:{}}>
      {loading&&<Loader2 className="w-4 h-4 animate-spin"/>}{children}
    </button>
  );
}

function Card({ children,className="" }:any){
  return <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${className}`}>{children}</div>;
}

function SecHead({ icon:Icon,color,title,sub }:any){
  return(
    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{background:`${color}18`,border:`1.5px solid ${color}30`}}>
        <Icon className="w-4.5 h-4.5" style={{color}}/>
      </div>
      <div>
        <h3 className="font-display font-bold text-slate-900 text-sm leading-tight">{title}</h3>
        {sub&&<p className="font-body text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CHANNEL_COLS:Record<string,string>={Slack:"text-violet-600",Email:"text-blue-600",WhatsApp:"text-emerald-600",Calendar:"text-amber-600","In Person":"text-orange-600",Narrative:"text-slate-400"};
const CHANNEL_ICONS:Record<string,string>={Slack:"💬",Email:"📧",WhatsApp:"📱",Calendar:"📅","In Person":"🗣","Narrative":"📝"};

/* ════════════════════════════════════════════════════════════════════
   TAB 1 — STORY
   ════════════════════════════════════════════════════════════════════ */
function StoryTab({ id,story,setStory }:{ id:string;story:any;setStory:any }){
  const [saving,setSaving]=useState(false);
  const s=(k:string)=>(v:string)=>setStory((p:any)=>({...p,[k]:v}));
  const save=async()=>{
    setSaving(true);
    try{await api.post(`/admin/usecases/${id}/story`,story);toast.success("Story saved");}
    catch{toast.error("Save failed");}finally{setSaving(false);}
  };
  return(
    <div className="space-y-5">
      <Card>
        <SecHead icon={BookOpen} color={G} title="Company Background" sub="4 paragraphs — what they do · journey · what's broken · what's at stake"/>
        <F rows={10} placeholder={`Paragraph 1 — What the company does and who it serves. End with one specific number.\n\nParagraph 2 — The journey so far. What has gone well.\n\nParagraph 3 — What is currently broken. Name specific problems.\n\nParagraph 4 — What is at stake. End with the most pressure-dense sentence.`}
          value={story.companyBackground} onChange={s("companyBackground")}/>
      </Card>
      <div className="grid sm:grid-cols-2 gap-5">
        <Card>
          <SecHead icon={Zap} color="#10b981" title="Your Challenge" sub="Closing challenge shown before simulation begins. Use {{PLAYER_NAME}}."/>
          <F rows={4} placeholder="The specific challenge {{PLAYER_NAME}} must navigate in the next 7–10 weeks…"
            value={story.closingChallenge} onChange={s("closingChallenge")}/>
        </Card>
        <Card>
          <SecHead icon={Activity} color="#f59e0b" title="How It Works" sub="Explains the format — decisions, variables, consequence engine"/>
          <F rows={4} placeholder="Brief explanation of the 25-decision format, how choices compound…"
            value={story.howItWorks} onChange={s("howItWorks")}/>
        </Card>
      </div>
      <div className="flex justify-end"><Btn onClick={save} loading={saving}>Save Story</Btn></div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB 2 — OPENING SCENE
   ════════════════════════════════════════════════════════════════════ */
function OpeningSceneTab({ id,scene,setScene }:{ id:string;scene:any;setScene:any }){
  const [saving,setSaving]=useState(false);
  const s=(k:string)=>(v:string)=>setScene((p:any)=>({...p,[k]:v}));
  const save=async()=>{
    setSaving(true);
    try{await api.post(`/admin/usecases/${id}/opening-scene`,scene);toast.success("Opening scene saved");}
    catch{toast.error("Save failed");}finally{setSaving(false);}
  };
  return(
    <div className="space-y-5">
      <Card>
        <SecHead icon={MessageSquare} color="#a78bfa" title="Block 1 — Arrival Context" sub="2–3 sentences. {{PLAYER_NAME}} arrives. Something is already in motion."/>
        <F rows={3} placeholder="You arrive at [company] at [time]. Before you reach your desk, [signal]..."
          value={scene.arrivalContext} onChange={s("arrivalContext")}/>
      </Card>
      <Card>
        <SecHead icon={MessageSquare} color="#3b82f6" title="Block 2 — Incoming Messages" sub="3–4 messages. Each from a different character. Use the format below."/>
        <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-500">
          {"**Slack — Priya Nair, Engineering Lead — 8:47 AM**"}<br/>
          {'"The analytics export is three weeks from done."'}
        </div>
        <F rows={12} placeholder="Write each message in the format above. Channels: Slack, Email, WhatsApp, Calendar, In Person."
          value={scene.incomingMessages} onChange={s("incomingMessages")}/>
      </Card>
      <Card>
        <SecHead icon={MessageSquare} color="#f59e0b" title="Block 3 — Senior Stakeholder Direct Statement" sub="Most pressure-dense writing in Part 1. In-person or direct message from the CEO/Founder."/>
        <F rows={5} placeholder="[CEO] catches {{PLAYER_NAME}} before they reach their desk. 'I won't sugarcoat it…' They leave before {{PLAYER_NAME}} can respond."
          value={scene.seniorStatement} onChange={s("seniorStatement")}/>
      </Card>
      <div className="flex justify-end"><Btn onClick={save} loading={saving}>Save Opening Scene</Btn></div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB 3 — CHARACTERS
   ════════════════════════════════════════════════════════════════════ */
const EMPTY_CHAR={name:"",role:"",trustLevel:"",emotionalState:"",keyConcern:"",isPlayer:false,sortOrder:0};

function CharactersTab({ id,chars,setChars }:{ id:string;chars:any[];setChars:any }){
  const [form,setForm]=useState({...EMPTY_CHAR});
  const [editId,setEditId]=useState<string|null>(null);
  const [editFrm,setEditFrm]=useState({...EMPTY_CHAR});
  const [saving,setSaving]=useState(false);
  const [del,setDel]=useState<string|null>(null);

  const create=async()=>{
    if(!form.name||!form.role){toast.error("Name and role required");return;}
    setSaving(true);
    try{
      const res=await api.post(`/admin/usecases/${id}/characters`,{...form,trustLevel:parseFloat(form.trustLevel)||5,sortOrder:chars.length});
      setChars((c:any[])=>[...c,res.data.data]);setForm({...EMPTY_CHAR});toast.success("Character added");
    }catch{toast.error("Failed");}finally{setSaving(false);}
  };
  const update=async()=>{
    if(!editId)return;setSaving(true);
    try{
      const res=await api.patch(`/admin/characters/${editId}`,{...editFrm,trustLevel:parseFloat(editFrm.trustLevel)||5});
      setChars((c:any[])=>c.map(x=>x.id===editId?{...x,...res.data.data}:x));setEditId(null);toast.success("Updated");
    }catch{toast.error("Failed");}finally{setSaving(false);}
  };
  const remove=async(cid:string)=>{
    if(!confirm("Delete this character?"))return;setDel(cid);
    try{await api.delete(`/admin/characters/${cid}`);setChars((c:any[])=>c.filter(x=>x.id!==cid));toast.success("Deleted");}
    catch{toast.error("Failed");}finally{setDel(null);}
  };

  const CF=({val,setVal,onSave,lbl}:any)=>(
    <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
      <div className="grid sm:grid-cols-2 gap-3">
        <F label="Full Name *" value={val.name} onChange={(v:string)=>setVal((f:any)=>({...f,name:v}))} placeholder="e.g. Priya Nair"/>
        <F label="Job Title *" value={val.role} onChange={(v:string)=>setVal((f:any)=>({...f,role:v}))} placeholder="e.g. Engineering Lead"/>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <F label="Trust Level (e.g. 6.2 out of 10)" type="number" value={val.trustLevel} onChange={(v:string)=>setVal((f:any)=>({...f,trustLevel:v}))} placeholder="6.2"/>
        <F label="Emotional State (1–3 words)" value={val.emotionalState} onChange={(v:string)=>setVal((f:any)=>({...f,emotionalState:v}))} placeholder="Tired and protective"/>
      </div>
      <F label="Key Concern — what they care about most right now (one sentence)" value={val.keyConcern} onChange={(v:string)=>setVal((f:any)=>({...f,keyConcern:v}))} placeholder="Whether the launch date is realistic given what engineering actually has."/>
      <button type="button" onClick={()=>setVal((f:any)=>({...f,isPlayer:!f.isPlayer}))}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-body text-sm font-medium transition-all ${val.isPlayer?"border-2 text-white":"bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
        style={val.isPlayer?{background:G,borderColor:G}:{}}>
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${val.isPlayer?"bg-white border-white":"border-slate-300"}`}>
          {val.isPlayer&&<Check className="w-3 h-3" style={{color:G}}/>}
        </div>
        This is the player character — {"{{PLAYER_NAME}}"}
      </button>
      <div className="flex items-center gap-2 pt-1">
        <Btn onClick={onSave} loading={saving}>{lbl}</Btn>
        <Btn onClick={()=>{setEditId(null);setForm({...EMPTY_CHAR});}} variant="ghost">Cancel</Btn>
      </div>
    </div>
  );

  return(
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className={LBL}>Characters — {chars.length} added (min 5, max 7)</p>
          <p className="font-body text-sm text-slate-600">Must include: senior leader · technical/operational lead · external stakeholder</p>
        </div>
        <div className="flex gap-1">{Array.from({length:7},(_,i)=>(
          <div key={i} className={`w-4 h-2.5 rounded-full ${i<chars.length?"":"bg-slate-200"}`} style={i<chars.length?{background:G}:{}}/>
        ))}</div>
      </div>

      {chars.map(c=>(
        <div key={c.id}>
          {editId===c.id
            ?<CF val={editFrm} setVal={setEditFrm} onSave={update} lbl="Update Character"/>
            :(
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm shadow-sm ${c.isPlayer?"text-white":"bg-slate-100 text-slate-600"}`}
                  style={c.isPlayer?{background:G}:{}}>
                  {c.isPlayer?"YOU":c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-body font-bold text-slate-900 text-sm">{c.name}</p>
                    {c.isPlayer&&<span className="font-mono text-[9px] px-2 py-0.5 rounded-full text-white" style={{background:G}}>PLAYER</span>}
                  </div>
                  <p className="font-mono text-xs text-slate-500 mb-1.5">{c.role}</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-mono text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">Trust {c.trustLevel}/10</span>
                    {c.emotionalState&&<span className="font-mono text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 italic">{c.emotionalState}</span>}
                  </div>
                  {c.keyConcern&&<p className="font-body text-xs text-slate-500 mt-2 leading-relaxed italic">"{c.keyConcern}"</p>}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={()=>{setEditId(c.id);setEditFrm({name:c.name||"",role:c.role||"",trustLevel:String(c.trustLevel||5),emotionalState:c.emotionalState||"",keyConcern:c.keyConcern||"",isPlayer:c.isPlayer||false,sortOrder:c.sortOrder||0});}}
                    className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all">
                    <Pencil className="w-4 h-4"/>
                  </button>
                  <button onClick={()=>remove(c.id)} disabled={del===c.id}
                    className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all">
                    {del===c.id?<Loader2 className="w-4 h-4 animate-spin"/>:<Trash2 className="w-4 h-4"/>}
                  </button>
                </div>
              </div>
            )}
        </div>
      ))}

      {!editId&&(
        <div>
          <p className={`${LBL} mb-3`}>Add Character</p>
          <CF val={form} setVal={setForm} onSave={create} lbl="Add Character"/>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB 4 — VARIABLES  (unlimited)
   ════════════════════════════════════════════════════════════════════ */
const EMPTY_VAR={variableName:"",displayName:"",startingValue:"50",unit:"%",scoringDimension:"CUSTOM",higherIsBetter:true,sortOrder:0};

function VariablesTab({ id,variables,setVariables }:{ id:string;variables:any[];setVariables:any }){
  const [form,setForm]=useState({...EMPTY_VAR});
  const [editId,setEditId]=useState<string|null>(null);
  const [editFrm,setEditFrm]=useState({...EMPTY_VAR});
  const [saving,setSaving]=useState(false);
  const [del,setDel]=useState<string|null>(null);
  const [showAdd,setShowAdd]=useState(false);

  const create=async()=>{
    if(!form.variableName||!form.displayName){toast.error("Variable name and display name required");return;}
    setSaving(true);
    try{
      const res=await api.post(`/admin/usecases/${id}/variables`,{...form,startingValue:parseFloat(form.startingValue)||50,sortOrder:variables.length});
      setVariables((v:any[])=>[...v,res.data.data]);setForm({...EMPTY_VAR});setShowAdd(false);toast.success("Variable added");
    }catch{toast.error("Failed");}finally{setSaving(false);}
  };
  const update=async()=>{
    if(!editId)return;setSaving(true);
    try{
      const res=await api.patch(`/admin/variables/${editId}`,{...editFrm,startingValue:parseFloat(editFrm.startingValue)||50});
      setVariables((v:any[])=>v.map(x=>x.id===editId?{...x,...res.data.data}:x));setEditId(null);toast.success("Updated");
    }catch{toast.error("Failed");}finally{setSaving(false);}
  };
  const remove=async(vid:string)=>{
    if(!confirm("Delete this variable? Impact values using it will also be removed."))return;setDel(vid);
    try{await api.delete(`/admin/variables/${vid}`);setVariables((v:any[])=>v.filter(x=>x.id!==vid));toast.success("Deleted");}
    catch{toast.error("Failed");}finally{setDel(null);}
  };

  const VarForm=({val,setVal,onSave,onCancel,lbl}:any)=>(
    <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <F label="Variable Name (CAPS_UNDERSCORE)" value={val.variableName}
          onChange={(v:string)=>setVal((f:any)=>({...f,variableName:v.toUpperCase().replace(/\s+/g,"_")}))} placeholder="ENGINEERING_TRUST"/>
        <F label="Display Name" value={val.displayName}
          onChange={(v:string)=>setVal((f:any)=>({...f,displayName:v}))} placeholder="Engineering Trust"/>
        <F label="Starting Value" type="number" value={val.startingValue}
          onChange={(v:string)=>setVal((f:any)=>({...f,startingValue:v}))}/>
        <div>
          <label className={LBL}>Unit</label>
          <select value={val.unit} className={SEL} onChange={e=>setVal((f:any)=>({...f,unit:e.target.value}))}>
            <option value="%">% (0–100)</option>
            <option value="INR_L">₹ Lakhs</option>
            <option value="score">Score</option>
          </select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={LBL}>Scoring Dimension</label>
          <select value={val.scoringDimension} className={SEL} onChange={e=>setVal((f:any)=>({...f,scoringDimension:e.target.value}))}>
            {SCORING_DIMS.map(d=><option key={d} value={d}>{d.replace(/_/g," ")}</option>)}
          </select>
        </div>
        <div className="flex flex-col justify-end">
          <label className={LBL}>Higher is Better</label>
          <button type="button" onClick={()=>setVal((f:any)=>({...f,higherIsBetter:!f.higherIsBetter}))}
            className={`px-4 py-3 rounded-xl border font-body text-sm font-medium transition-all text-left
              ${val.higherIsBetter?"bg-emerald-50 border-emerald-200 text-emerald-700":"bg-rose-50 border-rose-200 text-rose-700"}`}>
            {val.higherIsBetter?"↑ Yes — Higher is Better":"↓ No — Lower is Better"}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Btn onClick={onSave} loading={saving}>{lbl}</Btn>
        <Btn onClick={onCancel} variant="ghost">Cancel</Btn>
      </div>
    </div>
  );

  return(
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className={LBL}>Variables — {variables.length} defined (recommended: 20, but unlimited)</p>
          <p className="font-body text-sm text-slate-600">Each variable must be assigned to exactly one scoring dimension. All feed into scoring.</p>
        </div>
        <button onClick={()=>setShowAdd(s=>!s)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-body font-semibold text-sm shadow-sm"
          style={{background:G}}>
          <Plus className="w-4 h-4"/>{showAdd?"Cancel":"Add Variable"}
        </button>
      </div>

      {/* Table header */}
      {variables.length>0&&(
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
          {["#","System Name","Display Name","Start","Unit","Dimension","↑/↓","Edit","Del"].map((h,i)=>(
            <div key={i} className={`font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider ${i===0?"col-span-1":i===1?"col-span-2":i===2?"col-span-2":i===3||i===4?"col-span-1":i===5?"col-span-2":i===6?"col-span-1":i===7||i===8?"col-span-1":""}`}>{h}</div>
          ))}
        </div>
      )}

      {/* Variable rows */}
      <div className="space-y-2">
        {variables.map((v,idx)=>(
          <div key={v.id}>
            {editId===v.id
              ?<VarForm val={editFrm} setVal={setEditFrm} onSave={update} onCancel={()=>setEditId(null)} lbl="Update Variable"/>
              :(
                <div className="grid grid-cols-12 items-center gap-2 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-sm">
                  <div className="col-span-1 text-center"><span className="font-mono text-xs text-slate-400 font-semibold">{idx+1}</span></div>
                  <div className="col-span-2"><p className="font-mono text-xs font-bold" style={{color:G}}>{v.variableName}</p></div>
                  <div className="col-span-2"><p className="font-body text-sm text-slate-800 font-medium">{v.displayName}</p></div>
                  <div className="col-span-1 text-center"><span className="font-mono text-sm text-slate-700 font-semibold">{v.startingValue}</span></div>
                  <div className="col-span-1 text-center"><span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{v.unit||"%"}</span></div>
                  <div className="col-span-2"><span className="font-mono text-[10px] text-slate-500">{(v.scoringDimension||"CUSTOM").replace(/_/g," ")}</span></div>
                  <div className="col-span-1 text-center">
                    <span className={`font-mono text-xs font-bold ${v.higherIsBetter?"text-emerald-600":"text-rose-600"}`}>{v.higherIsBetter?"↑":"↓"}</span>
                  </div>
                  <div className="col-span-1">
                    <button onClick={()=>{setEditId(v.id);setEditFrm({variableName:v.variableName,displayName:v.displayName,startingValue:String(v.startingValue),unit:v.unit||"%",scoringDimension:v.scoringDimension||"CUSTOM",higherIsBetter:v.higherIsBetter,sortOrder:v.sortOrder||0});}}
                      className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all">
                      <Pencil className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                  <div className="col-span-1">
                    <button onClick={()=>remove(v.id)} disabled={del===v.id}
                      className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all">
                      {del===v.id?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Trash2 className="w-3.5 h-3.5"/>}
                    </button>
                  </div>
                </div>
              )}
          </div>
        ))}
      </div>

      {showAdd&&!editId&&(
        <div>
          <p className={`${LBL} mb-3`}>New Variable ({variables.length+1})</p>
          <VarForm val={form} setVal={setForm} onSave={create} onCancel={()=>{setShowAdd(false);setForm({...EMPTY_VAR});}} lbl="Add Variable"/>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB 5 — SCORING
   ════════════════════════════════════════════════════════════════════ */
const EMPTY_DIM={dimensionKey:"FINANCIAL_PRUDENCE",displayName:"",description:"",weight:"1.0"};

function ScoringTab({ id,scoring,setScoring }:{ id:string;scoring:any[];setScoring:any }){
  const [form,setForm]=useState({...EMPTY_DIM});
  const [editId,setEditId]=useState<string|null>(null);
  const [editFrm,setEditFrm]=useState({...EMPTY_DIM});
  const [saving,setSaving]=useState(false);
  const [del,setDel]=useState<string|null>(null);

  const create=async()=>{
    if(!form.displayName){toast.error("Display name required");return;}
    setSaving(true);
    try{
      const res=await api.post(`/admin/usecases/${id}/scoring`,{...form,weight:parseFloat(form.weight)||1.0});
      setScoring((s:any[])=>[...s,res.data.data]);setForm({...EMPTY_DIM});toast.success("Dimension added");
    }catch{toast.error("Failed");}finally{setSaving(false);}
  };
  const update=async()=>{
    if(!editId)return;setSaving(true);
    try{
      const res=await api.patch(`/admin/scoring/${editId}`,{...editFrm,weight:parseFloat(editFrm.weight)||1.0});
      setScoring((s:any[])=>s.map(x=>x.id===editId?{...x,...res.data.data}:x));setEditId(null);toast.success("Updated");
    }catch{toast.error("Failed");}finally{setSaving(false);}
  };
  const remove=async(did:string)=>{
    if(!confirm("Delete this dimension?"))return;setDel(did);
    try{await api.delete(`/admin/scoring/${did}`);setScoring((s:any[])=>s.filter(x=>x.id!==did));toast.success("Deleted");}
    catch{toast.error("Failed");}finally{setDel(null);}
  };

  const DF=({val,setVal,onSave,onCancel,lbl}:any)=>(
    <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className={LBL}>Dimension Key</label>
          <select value={val.dimensionKey} className={SEL} onChange={e=>setVal((f:any)=>({...f,dimensionKey:e.target.value}))}>
            {SCORING_DIMS.map(d=><option key={d} value={d}>{d.replace(/_/g," ")}</option>)}
          </select>
        </div>
        <F label="Display Name" value={val.displayName} onChange={(v:string)=>setVal((f:any)=>({...f,displayName:v}))} placeholder="Financial Discipline"/>
        <F label="Weight (1.0–2.0)" type="number" value={val.weight} onChange={(v:string)=>setVal((f:any)=>({...f,weight:v}))} placeholder="1.3"/>
      </div>
      <F label="Description — shown on result screen" rows={3} value={val.description}
        onChange={(v:string)=>setVal((f:any)=>({...f,description:v}))}
        placeholder="What this dimension measures and why it matters professionally in this domain…"/>
      <div className="flex items-center gap-2">
        <Btn onClick={onSave} loading={saving}>{lbl}</Btn>
        <Btn onClick={onCancel} variant="ghost">Cancel</Btn>
      </div>
    </div>
  );

  return(
    <div className="space-y-4">
      <div>
        <p className={LBL}>Scoring Dimensions — {scoring.length}/5</p>
        <p className="font-body text-sm text-slate-600 mb-4">5 domain-specific dimensions. Every variable must be assigned to one. Minimum 3 variables per dimension.</p>
      </div>
      {scoring.map(d=>(
        <div key={d.id}>
          {editId===d.id
            ?<DF val={editFrm} setVal={setEditFrm} onSave={update} onCancel={()=>setEditId(null)} lbl="Update Dimension"/>
            :(
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{background:`${G}15`,border:`1.5px solid ${G}30`}}>
                    <Target className="w-4 h-4" style={{color:G}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-body font-bold text-slate-900 text-sm">{d.displayName}</p>
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">weight {d.weight}</span>
                    </div>
                    <p className="font-mono text-xs text-slate-500 mb-1.5">{(d.dimensionKey||"").replace(/_/g," ")}</p>
                    {d.description&&<p className="font-body text-sm text-slate-600 leading-relaxed">{d.description}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={()=>{setEditId(d.id);setEditFrm({dimensionKey:d.dimensionKey,displayName:d.displayName,description:d.description||"",weight:String(d.weight||1.0)});}}
                      className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all">
                      <Pencil className="w-4 h-4"/>
                    </button>
                    <button onClick={()=>remove(d.id)} disabled={del===d.id}
                      className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all">
                      {del===d.id?<Loader2 className="w-4 h-4 animate-spin"/>:<Trash2 className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      ))}
      {scoring.length<5&&!editId&&(
        <div>
          <p className={`${LBL} mb-3`}>Add Dimension ({scoring.length}/5)</p>
          <DF val={form} setVal={setForm} onSave={create} onCancel={()=>setForm({...EMPTY_DIM})} lbl="Add Dimension"/>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB 6 — ENDINGS
   ════════════════════════════════════════════════════════════════════ */
const EMPTY_ENDING={endingKey:"complete" as typeof ENDING_KEYS[number],title:"",condition:"",narrative:"",userType:"" as any};
const TRIGGER_HINTS:Record<string,string>={complete:"Leadership >75 AND Strategy >75 AND Stakeholder >75",strategic:"Strategy >75 AND Financial >75 AND Stakeholder <75",firefighter:"Risk >75 AND Leadership >60 AND Strategy <65",learning:"No single dimension above 75, or mixed profile"};
const ENDING_STYLES:Record<string,any>={complete:{col:"text-emerald-700",bg:"bg-emerald-50",border:"border-emerald-200"},strategic:{col:"text-blue-700",bg:"bg-blue-50",border:"border-blue-200"},firefighter:{col:"text-amber-700",bg:"bg-amber-50",border:"border-amber-200"},learning:{col:"text-violet-700",bg:"bg-violet-50",border:"border-violet-200"}};

function EndingsTab({ id,endings,setEndings }:{ id:string;endings:any[];setEndings:any }){
  const [form,setForm]=useState({...EMPTY_ENDING});
  const [editId,setEditId]=useState<string|null>(null);
  const [editFrm,setEditFrm]=useState({...EMPTY_ENDING});
  const [saving,setSaving]=useState(false);
  const [del,setDel]=useState<string|null>(null);

  const create=async()=>{
    if(!form.title||!form.narrative){toast.error("Title and narrative required");return;}
    setSaving(true);
    try{
      const res=await api.post(`/admin/usecases/${id}/endings`,{...form,userType:form.userType||null});
      setEndings((e:any[])=>[...e,res.data.data]);setForm({...EMPTY_ENDING});toast.success("Ending added");
    }catch{toast.error("Failed");}finally{setSaving(false);}
  };
  const update=async()=>{
    if(!editId)return;setSaving(true);
    try{
      const res=await api.patch(`/admin/endings/${editId}`,{...editFrm,userType:editFrm.userType||null});
      setEndings((e:any[])=>e.map(x=>x.id===editId?{...x,...res.data.data}:x));setEditId(null);toast.success("Updated");
    }catch{toast.error("Failed");}finally{setSaving(false);}
  };
  const remove=async(eid:string)=>{
    if(!confirm("Delete this ending?"))return;setDel(eid);
    try{await api.delete(`/admin/endings/${eid}`);setEndings((e:any[])=>e.filter(x=>x.id!==eid));toast.success("Deleted");}
    catch{toast.error("Failed");}finally{setDel(null);}
  };

  const EF=({val,setVal,onSave,onCancel,lbl}:any)=>{
    const st=ENDING_STYLES[val.endingKey]||ENDING_STYLES.complete;
    return(
      <div className={`space-y-3 p-4 rounded-2xl border ${st.border} ${st.bg}`}>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={LBL}>Ending Type</label>
            <select value={val.endingKey} className={`${SEL} bg-white`} onChange={e=>setVal((f:any)=>({...f,endingKey:e.target.value}))}>
              {ENDING_KEYS.map(k=><option key={k} value={k}>{k.charAt(0).toUpperCase()+k.slice(1)}</option>)}
            </select>
          </div>
          <F label="Ending Title" value={val.title} onChange={(v:string)=>setVal((f:any)=>({...f,title:v}))} placeholder="The Complete PM"/>
          <div>
            <label className={LBL}>User Type (blank = all)</label>
            <select value={val.userType||""} className={`${SEL} bg-white`} onChange={e=>setVal((f:any)=>({...f,userType:e.target.value||""}))}>
              <option value="">All User Types</option>
              <option value="PLACEMENT">Placement Prep</option>
              <option value="EXPLORER">Student Explorer</option>
              <option value="PROFESSIONAL">Junior Professional</option>
            </select>
          </div>
        </div>
        <div className={`px-3 py-2 rounded-lg bg-white border ${st.border}`}>
          <p className="font-mono text-[10px] text-slate-400 mb-0.5 font-semibold uppercase">Trigger hint for {val.endingKey}</p>
          <p className={`font-mono text-xs font-semibold ${st.col}`}>{TRIGGER_HINTS[val.endingKey]}</p>
        </div>
        <F label="Condition (your custom trigger description)" value={val.condition}
          onChange={(v:string)=>setVal((f:any)=>({...f,condition:v}))}
          placeholder="Leadership above 75 AND Strategy above 75 AND Stakeholder above 75"/>
        <F label="Narrative — 4–6 paragraphs, 2nd person present, reference specific characters and stakes" rows={10}
          value={val.narrative} onChange={(v:string)=>setVal((f:any)=>({...f,narrative:v}))}
          placeholder="Write the ending narrative in second person present tense. Reference the company name, the characters by name, the specific decisions made, and what the outcome means…"/>
        <div className="flex items-center gap-2">
          <Btn onClick={onSave} loading={saving}>{lbl}</Btn>
          <Btn onClick={onCancel} variant="ghost">Cancel</Btn>
        </div>
      </div>
    );
  };

  const byKey=(k:typeof ENDING_KEYS[number])=>endings.filter(e=>e.endingKey===k);

  return(
    <div className="space-y-6">
      <div>
        <p className={LBL}>Endings — {endings.length} added (target: 12 = 4 types × 3 user types)</p>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {ENDING_KEYS.map(k=>{const s=ENDING_STYLES[k];const cnt=byKey(k).length;return(
            <div key={k} className={`px-3 py-2.5 rounded-xl border text-center ${s.bg} ${s.border}`}>
              <p className={`font-mono text-[10px] font-bold uppercase tracking-wider ${s.col}`}>{k}</p>
              <p className="font-mono text-sm font-bold text-slate-700 mt-0.5">{cnt}/3</p>
            </div>
          );})}
        </div>
      </div>
      {ENDING_KEYS.map(k=>{
        const st=ENDING_STYLES[k];const elist=byKey(k);
        return(
          <div key={k}>
            <div className="flex items-center gap-2 mb-3">
              <Flag className={`w-4 h-4 ${st.col}`}/>
              <p className={`font-mono text-xs font-bold uppercase tracking-wider ${st.col}`}>{k.charAt(0).toUpperCase()+k.slice(1)}</p>
              <span className="font-body text-xs text-slate-500">— {TRIGGER_HINTS[k]}</span>
            </div>
            <div className="space-y-2 mb-2">
              {elist.map(e=>(
                <div key={e.id}>
                  {editId===e.id
                    ?<EF val={editFrm} setVal={setEditFrm} onSave={update} onCancel={()=>setEditId(null)} lbl="Update Ending"/>
                    :(
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-body font-bold text-slate-900 text-sm">{e.title}</p>
                              <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border font-semibold ${st.bg} ${st.border} ${st.col}`}>{e.userType||"All Types"}</span>
                            </div>
                            {e.condition&&<p className="font-mono text-xs text-slate-500 mb-1.5">{e.condition}</p>}
                            <p className="font-body text-sm text-slate-600 leading-relaxed line-clamp-2">{e.narrative?.slice(0,160)}…</p>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button onClick={()=>{setEditId(e.id);setEditFrm({endingKey:e.endingKey,title:e.title,condition:e.condition||"",narrative:e.narrative||"",userType:e.userType||""});}}
                              className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all">
                              <Pencil className="w-4 h-4"/>
                            </button>
                            <button onClick={()=>remove(e.id)} disabled={del===e.id}
                              className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all">
                              {del===e.id?<Loader2 className="w-4 h-4 animate-spin"/>:<Trash2 className="w-4 h-4"/>}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {!editId&&(
        <div>
          <p className={`${LBL} mb-3`}>Add Ending</p>
          <EF val={form} setVal={setForm} onSave={create} onCancel={()=>setForm({...EMPTY_ENDING})} lbl="Add Ending"/>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB 7 — PRE-DECISION CONVERSATIONS
   ════════════════════════════════════════════════════════════════════ */
interface ConvMsg{channel:string;characterName:string;characterRole:string;timestamp:string;text:string;}
const EMPTY_MSG:ConvMsg={channel:"Slack",characterName:"",characterRole:"",timestamp:"",text:""};

function PreDecisionTab({ id,convos,setConvos }:{ id:string;convos:any[];setConvos:any }){
  const [form,setForm]=useState({userType:"" as any,messages:[{...EMPTY_MSG}]});
  const [editId,setEditId]=useState<string|null>(null);
  const [editFrm,setEditFrm]=useState({userType:"" as any,messages:[] as ConvMsg[]});
  const [saving,setSaving]=useState(false);
  const [del,setDel]=useState<string|null>(null);

  const addMsg=(f:any,sf:any)=>()=>sf((p:any)=>({...p,messages:[...p.messages,{...EMPTY_MSG}]}));
  const rmMsg=(f:any,sf:any,i:number)=>()=>sf((p:any)=>({...p,messages:p.messages.filter((_:any,idx:number)=>idx!==i)}));
  const updMsg=(sf:any,i:number,k:keyof ConvMsg,v:string)=>sf((p:any)=>({...p,messages:p.messages.map((m:ConvMsg,idx:number)=>idx===i?{...m,[k]:v}:m)}));

  const create=async()=>{
    const msgs=form.messages.filter(m=>m.text.trim());
    if(!msgs.length){toast.error("Add at least one message");return;}
    setSaving(true);
    try{
      const res=await api.post(`/admin/usecases/${id}/pre-decision`,{userType:form.userType||null,messages:msgs,sortOrder:convos.length});
      setConvos((c:any[])=>[...c,res.data.data]);setForm({userType:"",messages:[{...EMPTY_MSG}]});toast.success("Conversation saved");
    }catch{toast.error("Failed");}finally{setSaving(false);}
  };
  const update=async()=>{
    if(!editId)return;setSaving(true);
    try{
      const msgs=editFrm.messages.filter((m:ConvMsg)=>m.text.trim());
      const res=await api.patch(`/admin/pre-decision/${editId}`,{userType:editFrm.userType||null,messages:msgs});
      setConvos((c:any[])=>c.map(x=>x.id===editId?{...x,...res.data.data}:x));setEditId(null);toast.success("Updated");
    }catch{toast.error("Failed");}finally{setSaving(false);}
  };
  const remove=async(cid:string)=>{
    if(!confirm("Delete?"))return;setDel(cid);
    try{await api.delete(`/admin/pre-decision/${cid}`);setConvos((c:any[])=>c.filter(x=>x.id!==cid));toast.success("Deleted");}
    catch{toast.error("Failed");}finally{setDel(null);}
  };

  const MsgBlock=({msg,idx,sf}:{msg:ConvMsg;idx:number;sf:any})=>{
    const ch=msg.channel||"Slack";const cc=CHANNEL_COLS[ch]||"text-slate-500";
    return(
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
          <span className="text-base">{CHANNEL_ICONS[ch]}</span>
          <select value={ch} className={`bg-transparent border-none text-xs font-mono font-semibold ${cc} focus:outline-none cursor-pointer`}
            onChange={e=>updMsg(sf,idx,"channel",e.target.value)}>
            {CHANNELS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <input value={msg.timestamp} placeholder="9:34 AM"
            className="ml-auto bg-transparent border-none font-mono text-xs text-slate-400 focus:outline-none w-20 text-right"
            onChange={e=>updMsg(sf,idx,"timestamp",e.target.value)}/>
          <button onClick={rmMsg(form,sf,idx)} className="p-0.5 text-slate-300 hover:text-rose-500 transition-all"><X className="w-3.5 h-3.5"/></button>
        </div>
        {ch!=="Narrative"&&(
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-white">
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 flex-shrink-0">
              {msg.characterName?msg.characterName.charAt(0).toUpperCase():"?"}
            </div>
            <input value={msg.characterName} placeholder="Character Name"
              className="flex-1 bg-transparent border-none font-body text-sm text-slate-800 font-medium focus:outline-none"
              onChange={e=>updMsg(sf,idx,"characterName",e.target.value)}/>
            <span className="text-slate-200 font-mono text-xs">/</span>
            <input value={msg.characterRole} placeholder="Job Title"
              className="flex-1 bg-transparent border-none font-mono text-xs text-slate-500 focus:outline-none"
              onChange={e=>updMsg(sf,idx,"characterRole",e.target.value)}/>
          </div>
        )}
        <textarea value={msg.text} rows={3}
          className="w-full bg-white border-none font-body text-sm text-slate-800 p-3 focus:outline-none resize-none placeholder:text-slate-400"
          placeholder={ch==="Narrative"?"Narrative text — scene-setting, no character attribution…":'"Message text in quotes…"'}
          onChange={e=>updMsg(sf,idx,"text",e.target.value)}/>
      </div>
    );
  };

  const CF=({val,setVal,onSave,onCancel,num}:any)=>(
    <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
      <div className="flex items-center justify-between">
        <p className={LBL}>Conversation {num} — {val.messages.length} message{val.messages.length!==1?"s":""}</p>
        <div>
          <label className="font-mono text-[10px] text-slate-500 mr-2 font-bold uppercase">User Type</label>
          <select value={val.userType||""} className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-body text-sm text-slate-800 focus:outline-none cursor-pointer"
            onChange={e=>setVal((f:any)=>({...f,userType:e.target.value||""}))}>
            <option value="">All Types</option>
            <option value="PLACEMENT">Placement Prep</option>
            <option value="EXPLORER">Student Explorer</option>
            <option value="PROFESSIONAL">Junior Professional</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        {val.messages.map((msg:ConvMsg,idx:number)=><MsgBlock key={idx} msg={msg} idx={idx} sf={setVal}/>)}
      </div>
      {val.messages.length<4&&(
        <button onClick={addMsg(val,setVal)}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 font-body text-sm font-medium transition-all">
          <Plus className="w-4 h-4"/>Add Message
        </button>
      )}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
        <Btn onClick={onSave} loading={saving}>Save Conversation {num}</Btn>
        <Btn onClick={onCancel} variant="ghost">Cancel</Btn>
      </div>
    </div>
  );

  return(
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
        <p className={LBL}>Pre-Decision Conversations — {convos.length} saved</p>
        <p className="font-body text-sm text-slate-700"><span className="font-semibold">Conversation 1</span> — between Opening Scene and Decision 1. Zooms to create the specific pressure for Decision 1. Max 150 words.</p>
        <p className="font-body text-sm text-slate-700"><span className="font-semibold">Conversation 2</span> — between Decision 1 and Decision 2. Shows immediate consequence, bridges to Decision 2. Max 150 words.</p>
      </div>
      {convos.map((c,i)=>(
        <div key={c.id}>
          {editId===c.id
            ?<CF val={editFrm} setVal={setEditFrm} onSave={update} onCancel={()=>setEditId(null)} num={i+1}/>
            :(
              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-blue-600"/>
                    <span className="font-body font-bold text-slate-900 text-sm">Conversation {i+1}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500 font-semibold">{c.userType||"All Types"}</span>
                    <span className="font-mono text-xs text-slate-400">{Array.isArray(c.messages)?c.messages.length:0} messages</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={()=>{
                      setEditId(c.id);
                      const msgs=Array.isArray(c.messages)?c.messages.map((m:any)=>({channel:m.medium||m.channel||"Slack",characterName:m.characterName||"",characterRole:m.characterRole||"",timestamp:m.timestamp||"",text:m.text||""})):[];
                      setEditFrm({userType:c.userType||"",messages:msgs.length?msgs:[{...EMPTY_MSG}]});
                    }} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all">
                      <Pencil className="w-4 h-4"/>
                    </button>
                    <button onClick={()=>remove(c.id)} disabled={del===c.id}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all">
                      {del===c.id?<Loader2 className="w-4 h-4 animate-spin"/>:<Trash2 className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
                {Array.isArray(c.messages)&&c.messages.map((m:any,mi:number)=>{
                  const ch=m.medium||m.channel||"Slack";const cc=CHANNEL_COLS[ch]||"text-slate-500";
                  return(
                    <div key={mi} className={`flex items-start gap-3 px-5 py-3 ${mi<c.messages.length-1?"border-b border-slate-100":""}`}>
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0">
                        {m.characterName?m.characterName.charAt(0).toUpperCase():"N"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`font-mono text-xs font-bold ${cc}`}>{m.characterName||"Narrative"}</span>
                          {m.characterRole&&<span className="font-mono text-xs text-slate-400">{m.characterRole}</span>}
                          <span className={`font-mono text-[10px] font-semibold ${cc}`}>{CHANNEL_ICONS[ch]} {ch}</span>
                          {m.timestamp&&<span className="font-mono text-xs text-slate-400">{m.timestamp}</span>}
                        </div>
                        <p className="font-body text-sm text-slate-700 leading-relaxed">"{m.text}"</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      ))}
      {!editId&&(
        <div>
          <p className={`${LBL} mb-3`}>Add Conversation {convos.length+1}</p>
          <CF val={form} setVal={setForm} onSave={create} onCancel={()=>setForm({userType:"",messages:[{...EMPTY_MSG}]})} num={convos.length+1}/>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB 8 — QUESTIONS
   ════════════════════════════════════════════════════════════════════ */
interface SitMsg{channel:string;characterName:string;characterRole:string;timestamp:string;text:string;}
const EMPTY_SITMSG:SitMsg={channel:"Slack",characterName:"",characterRole:"",timestamp:"",text:""};

function SituationBuilder({ messages,setMessages }:{ messages:SitMsg[];setMessages:(m:SitMsg[])=>void }){
  const add=()=>setMessages([...messages,{...EMPTY_SITMSG}]);
  const rm=(i:number)=>setMessages(messages.filter((_,idx)=>idx!==i));
  const upd=(i:number,k:keyof SitMsg,v:string)=>setMessages(messages.map((m,idx)=>idx===i?{...m,[k]:v}:m));
  return(
    <div className="space-y-2">
      {messages.map((msg,i)=>{
        const ch=msg.channel||"Slack";const cc=CHANNEL_COLS[ch]||"text-slate-500";
        return(
          <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
              <select value={ch} className={`bg-transparent border-none text-xs font-mono font-semibold ${cc} focus:outline-none cursor-pointer`}
                onChange={e=>upd(i,"channel",e.target.value)}>
                {CHANNELS.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <input value={msg.timestamp} placeholder="9:58 AM"
                className="ml-auto bg-transparent border-none font-mono text-xs text-slate-400 focus:outline-none w-20 text-right"
                onChange={e=>upd(i,"timestamp",e.target.value)}/>
              {messages.length>1&&<button onClick={()=>rm(i)} className="p-0.5 text-slate-300 hover:text-rose-500 transition-all"><X className="w-3.5 h-3.5"/></button>}
            </div>
            {ch!=="Narrative"&&(
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-500 flex-shrink-0">
                  {msg.characterName?msg.characterName.charAt(0).toUpperCase():"?"}
                </div>
                <input value={msg.characterName} placeholder="Character Name"
                  className="flex-1 bg-transparent border-none font-body text-sm text-slate-800 font-medium focus:outline-none"
                  onChange={e=>upd(i,"characterName",e.target.value)}/>
                <span className="text-slate-200 text-xs">/</span>
                <input value={msg.characterRole} placeholder="Job Title"
                  className="flex-1 bg-transparent border-none font-mono text-xs text-slate-500 focus:outline-none"
                  onChange={e=>upd(i,"characterRole",e.target.value)}/>
              </div>
            )}
            <textarea value={msg.text} rows={2}
              className="w-full bg-white border-none font-body text-sm text-slate-800 p-3 focus:outline-none resize-none placeholder:text-slate-400"
              placeholder={ch==="Narrative"?"Narrative…":'"Message text…"'}
              onChange={e=>upd(i,"text",e.target.value)}/>
          </div>
        );
      })}
      {messages.length<4&&(
        <button onClick={add}
          className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 font-body text-sm font-medium transition-all">
          <Plus className="w-4 h-4"/>Add message
        </button>
      )}
    </div>
  );
}

function ImpactGrid({ variables,impacts,onChange }:{ variables:any[];impacts:{varName:string;delta:string}[];onChange:(i:{varName:string;delta:string}[])=>void }){
  const getD=(varName:string)=>impacts.find(i=>i.varName===varName)?.delta||"0";
  const setD=(varName:string,delta:string)=>{
    const ex=impacts.find(i=>i.varName===varName);
    if(ex)onChange(impacts.map(i=>i.varName===varName?{...i,delta}:i));
    else onChange([...impacts,{varName,delta}]);
  };
  const nz=impacts.filter(i=>parseFloat(i.delta)!==0).length;
  return(
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={LBL}>Variable Impacts — every option must sacrifice something</label>
        <span className={`font-mono text-xs font-bold ${nz>=8?"text-emerald-600":"text-amber-600"}`}>{nz} non-zero {nz>=8?"✓":"⚠ need ≥8"}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
        {variables.map(v=>{
          const d=getD(v.variableName);const n=parseFloat(d);
          const col=n>0?"text-emerald-700":n<0?"text-rose-700":"text-slate-400";
          return(
            <div key={v.variableName} className="flex items-center gap-1.5 bg-white rounded-xl px-2 py-1.5 border border-slate-200">
              <span className="font-mono text-[10px] text-slate-500 flex-1 truncate font-medium" title={v.displayName}>{v.displayName}</span>
              <input type="number" step="1" min="-7" max="7" value={d}
                onChange={e=>setD(v.variableName,e.target.value)}
                className={`w-14 bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs text-right font-bold focus:outline-none focus:border-slate-400 transition-all ${col}`}/>
            </div>
          );
        })}
      </div>
      <p className="font-mono text-[10px] text-slate-400 mt-1.5 font-medium">Range: −7 to +7 · Save ±6/7 for Acts 3–4 high-stakes decisions only</p>
    </div>
  );
}

function OptionBlock({ opt,variables,onUpdated,onDeleted }:{ opt:any;variables:any[];onUpdated:(o:any)=>void;onDeleted:(id:string)=>void }){
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState({optionLabel:opt.optionLabel||"A",title:opt.title||"",description:opt.description||"",strategyTag:opt.strategyTag||"",consequenceText:opt.consequenceText||"",impacts:variables.map(v=>({varName:v.variableName,delta:String(opt.impacts?.find((i:any)=>i.variable?.variableName===v.variableName||i.varName===v.variableName)?.delta||"0")}))});
  const [saving,setSaving]=useState(false);
  const [del,setDel]=useState(false);

  const save=async()=>{
    setSaving(true);
    try{
      const impacts=form.impacts.filter(i=>parseFloat(i.delta)!==0).map(i=>({variableId:variables.find(v=>v.variableName===i.varName)?.id,delta:parseFloat(i.delta)})).filter(i=>i.variableId);
      const res=await api.patch(`/admin/options/${opt.id}`,{...form,impacts});
      onUpdated(res.data.data);setEditing(false);toast.success("Option updated");
    }catch{toast.error("Failed");}finally{setSaving(false);}
  };
  const remove=async()=>{
    if(!confirm(`Delete Option ${opt.optionLabel}?`))return;setDel(true);
    try{await api.delete(`/admin/options/${opt.id}`);onDeleted(opt.id);}
    catch{toast.error("Failed");}finally{setDel(false);}
  };

  const lbl=opt.optionLabel||"?";
  const lc:Record<string,string>={A:"#3b82f6",B:"#10b981",C:"#f59e0b",D:"#ef4444",E:"#8b5cf6",F:"#f97316"};
  const col=lc[lbl]||"#64748b";
  const existingImpacts=(opt.impacts||[]).filter((i:any)=>i.delta!==0);

  if(editing){
    return(
      <div className="rounded-2xl border-2 overflow-hidden" style={{borderColor:col}}>
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100" style={{background:`${col}10`}}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono text-sm font-bold text-white flex-shrink-0 shadow-sm" style={{background:col}}>{lbl}</div>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">Editing Option {lbl}</span>
          <div className="flex-1"/>
          <Btn onClick={save} loading={saving}>Save Option {lbl}</Btn>
          <Btn onClick={()=>setEditing(false)} variant="ghost">Cancel</Btn>
        </div>
        <div className="p-5 space-y-4 bg-white">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Strategy Tag</label>
              <select value={form.strategyTag} className={SEL} onChange={e=>setForm(f=>({...f,strategyTag:e.target.value}))}>
                <option value="">Select strategy tag…</option>
                {STRATEGY_TAGS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <F label="Option Title (max 10 words — action-oriented, specific)" value={form.title}
              onChange={(v:string)=>setForm(f=>({...f,title:v}))} placeholder="Speak to Engineering Lead Before Anyone Else"/>
          </div>
          <F label="Description (2–4 sentences — 2nd person, what {{PLAYER_NAME}} does AND does NOT do)" rows={4}
            value={form.description} onChange={(v:string)=>setForm(f=>({...f,description:v}))}
            placeholder="You message Priya immediately and ask for a 10-minute call at 10:15. You make no commitments until you have spoken to Priya."/>
          <ImpactGrid variables={variables} impacts={form.impacts} onChange={impacts=>setForm(f=>({...f,impacts}))}/>
          <F label="Consequence (what happened + 1 unintended outcome + 1 seed for future decision)" rows={4}
            value={form.consequenceText} onChange={(v:string)=>setForm(f=>({...f,consequenceText:v}))}
            placeholder="Priya gives you the full picture in nine minutes. You walk in better informed. But Arjun noticed you didn't respond to his message — he's already forming a view about your priorities."/>
        </div>
      </div>
    );
  }

  return(
    <div className="rounded-2xl border overflow-hidden hover:border-slate-300 transition-all" style={{borderColor:`${col}50`}}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{borderColor:`${col}30`,background:`${col}08`}}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center font-mono text-sm font-bold text-white flex-shrink-0" style={{background:col}}>{lbl}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {opt.strategyTag&&<span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg font-semibold">{opt.strategyTag}</span>}
            <p className="font-body font-bold text-slate-900 text-sm">{opt.title||<span className="text-slate-400 italic font-normal">No title yet</span>}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border font-bold ${existingImpacts.length>=8?"text-emerald-700 bg-emerald-50 border-emerald-200":"text-amber-700 bg-amber-50 border-amber-200"}`}>
            {existingImpacts.length} impacts
          </span>
          <button onClick={()=>setEditing(true)} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all"><Pencil className="w-3.5 h-3.5"/></button>
          <button onClick={remove} disabled={del} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all">
            {del?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Trash2 className="w-3.5 h-3.5"/>}
          </button>
        </div>
      </div>
      {opt.description&&<div className="px-4 py-3 border-b border-slate-100"><p className="font-body text-sm text-slate-700 leading-relaxed">{opt.description}</p></div>}
      {opt.consequenceText&&<div className="px-4 py-3 border-b border-slate-100 bg-slate-50"><p className="font-mono text-[10px] text-slate-500 font-bold uppercase mb-1">Consequence</p><p className="font-body text-sm text-slate-600 italic leading-relaxed">"{opt.consequenceText.slice(0,200)}{opt.consequenceText.length>200?"…":""}"</p></div>}
      {existingImpacts.length>0&&(
        <div className="px-4 py-2.5 flex flex-wrap gap-1.5">
          {existingImpacts.slice(0,10).map((imp:any)=>{
            const d=imp.delta;const pos=d>0;
            return(<span key={imp.id||imp.varName} className={`font-mono text-[10px] px-2 py-0.5 rounded-full border font-bold ${pos?"text-emerald-700 bg-emerald-50 border-emerald-200":"text-rose-700 bg-rose-50 border-rose-200"}`}>{pos?"+":""}{d} {imp.variable?.displayName||imp.varName}</span>);
          })}
          {existingImpacts.length>10&&<span className="font-mono text-[10px] text-slate-400">+{existingImpacts.length-10} more</span>}
        </div>
      )}
    </div>
  );
}

function AddOptionForm({ questionId,variables,nextLabel,onAdded,onCancel }:{ questionId:string;variables:any[];nextLabel:string;onAdded:(o:any)=>void;onCancel:()=>void }){
  const [form,setForm]=useState({...{optionLabel:nextLabel,title:"",description:"",strategyTag:"",consequenceText:"",impacts:variables.map(v=>({varName:v.variableName,delta:"0"}))}});
  const [saving,setSaving]=useState(false);
  const save=async()=>{
    if(!form.title||!form.description){toast.error("Title and description required");return;}
    setSaving(true);
    try{
      const impacts=form.impacts.filter(i=>parseFloat(i.delta)!==0).map(i=>({variableId:variables.find(v=>v.variableName===i.varName)?.id,delta:parseFloat(i.delta)})).filter(i=>i.variableId);
      const res=await api.post(`/admin/questions/${questionId}/options`,{...form,impacts});
      onAdded(res.data.data);toast.success(`Option ${nextLabel} added`);
    }catch{toast.error("Failed");}finally{setSaving(false);}
  };
  const lc:Record<string,string>={A:"#3b82f6",B:"#10b981",C:"#f59e0b",D:"#ef4444",E:"#8b5cf6",F:"#f97316"};
  const col=lc[nextLabel]||"#64748b";
  return(
    <div className="rounded-2xl border-2 border-dashed overflow-hidden" style={{borderColor:`${col}50`}}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono text-sm font-bold text-white flex-shrink-0 shadow-sm" style={{background:col}}>{nextLabel}</div>
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-600">New Option {nextLabel}</span>
      </div>
      <div className="p-5 space-y-4 bg-white">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={LBL}>Strategy Tag</label>
            <select value={form.strategyTag} className={SEL} onChange={e=>setForm(f=>({...f,strategyTag:e.target.value}))}>
              <option value="">Select strategy tag…</option>
              {STRATEGY_TAGS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <F label="Option Title (max 10 words, action-oriented)" value={form.title}
            onChange={(v:string)=>setForm(f=>({...f,title:v}))} placeholder="Speak to Engineering Lead Before Anyone Else"/>
        </div>
        <F label="Description (2–4 sentences, 2nd person, specific actions and deliberate omissions)" rows={4}
          value={form.description} onChange={(v:string)=>setForm(f=>({...f,description:v}))}
          placeholder="You message Priya immediately and ask for a 10-minute call at 10:15. You make no commitments to anyone until you have spoken to Priya."/>
        <ImpactGrid variables={variables} impacts={form.impacts} onChange={impacts=>setForm(f=>({...f,impacts}))}/>
        <F label="Consequence (what happened + unintended outcome + seed for future decision)" rows={4}
          value={form.consequenceText} onChange={(v:string)=>setForm(f=>({...f,consequenceText:v}))}
          placeholder="Priya gives you the full picture in nine minutes. You walk in better informed. But Arjun noticed you didn't respond — he's forming a view about your priorities."/>
        <div className="flex items-center gap-2">
          <Btn onClick={save} loading={saving}>Add Option {nextLabel}</Btn>
          <Btn onClick={onCancel} variant="ghost">Cancel</Btn>
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({ q,variables,onUpdated,onDeleted,onClose }:{ q:any;variables:any[];onUpdated:(q:any)=>void;onDeleted:(id:string)=>void;onClose:()=>void }){
  const [qForm,setQForm]=useState({questionNumber:q.questionNumber,tag:q.tag||"",weekLabel:q.weekLabel||"",charactersPresent:Array.isArray(q.charactersPresent)?q.charactersPresent.join(", "):q.charactersPresent||"",situationUpdate:q.situationUpdate||"",questionText:q.questionText||"",context:q.context||"",isDiagnostic:q.isDiagnostic||false,diagnosticOrder:String(q.diagnosticOrder||"")});
  const [sitMsgs,setSitMsgs]=useState<SitMsg[]>([{...EMPTY_SITMSG}]);
  const [options,setOptions]=useState<any[]>(q.options||[]);
  const [addingOpt,setAddingOpt]=useState(false);
  const [saving,setSaving]=useState(false);
  const [del,setDel]=useState(false);
  const act=getAct(q.questionNumber);
  const ACT_COLORS=["#3b82f6","#f59e0b","#ef4444","#8b5cf6"];
  const col=ACT_COLORS[act-1];

  const saveQ=async()=>{
    setSaving(true);
    try{
      const sitText=sitMsgs.filter(m=>m.text.trim()).length>0?sitMsgs.filter(m=>m.text.trim()).map(m=>m.channel==="Narrative"?m.text:`**${m.channel} — ${m.characterName}${m.characterRole?", "+m.characterRole:""} — ${m.timestamp||""}**\n"${m.text}"`).join("\n\n"):qForm.situationUpdate;
      const res=await api.patch(`/admin/questions/${q.id}`,{...qForm,situationUpdate:sitText,charactersPresent:qForm.charactersPresent.split(",").map((s:string)=>s.trim()).filter(Boolean),diagnosticOrder:qForm.diagnosticOrder?parseInt(qForm.diagnosticOrder):null});
      onUpdated({...q,...res.data.data,options});toast.success("Decision saved");
    }catch{toast.error("Failed");}finally{setSaving(false);}
  };
  const deleteQ=async()=>{
    if(!confirm(`Delete Decision ${q.questionNumber}?`))return;setDel(true);
    try{await api.delete(`/admin/questions/${q.id}`);onDeleted(q.id);}
    catch{toast.error("Failed");}finally{setDel(false);}
  };

  return(
    <div className="rounded-2xl overflow-hidden border-2" style={{borderColor:`${col}60`}}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b" style={{borderColor:`${col}30`,background:`${col}10`}}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-mono text-base font-bold text-white flex-shrink-0 shadow-sm" style={{background:col}}>{q.questionNumber}</div>
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-700">ACT {act} — Decision {q.questionNumber}</span>
        <div className="flex-1"/>
        <Btn onClick={saveQ} loading={saving}>Save Decision</Btn>
        <Btn onClick={onClose} variant="ghost">Close</Btn>
        <button onClick={deleteQ} disabled={del} className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all">
          {del?<Loader2 className="w-4 h-4 animate-spin"/>:<Trash2 className="w-4 h-4"/>}
        </button>
      </div>

      <div className="p-5 space-y-6 bg-white">
        {/* A: Header */}
        <div>
          <p className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">A — Question Header</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <F label="Decision #" type="number" value={qForm.questionNumber} onChange={(v:string)=>setQForm(f=>({...f,questionNumber:parseInt(v)||1}))}/>
            <div>
              <label className={LBL}>Decision Tag</label>
              <select value={qForm.tag||""} className={SEL} onChange={e=>setQForm(f=>({...f,tag:e.target.value}))}>
                <option value="">Select tag…</option>
                {DECISION_TOPICS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <F label="Week Label" value={qForm.weekLabel} onChange={(v:string)=>setQForm(f=>({...f,weekLabel:v}))} placeholder="Week 1 — Day 1, 9:58 AM"/>
            <F label="Characters Present (comma-sep)" value={qForm.charactersPresent} onChange={(v:string)=>setQForm(f=>({...f,charactersPresent:v}))} placeholder="Priya Nair, Vikram Anand"/>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <button type="button" onClick={()=>setQForm(f=>({...f,isDiagnostic:!f.isDiagnostic}))}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-body text-sm font-medium transition-all ${qForm.isDiagnostic?"text-white":"bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              style={qForm.isDiagnostic?{background:"#3b82f6",borderColor:"#3b82f6"}:{}}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${qForm.isDiagnostic?"bg-white border-white":"border-slate-300"}`}>
                {qForm.isDiagnostic&&<Check className="w-3 h-3 text-blue-600"/>}
              </div>
              Diagnostic question (no-auth preview)
            </button>
            {qForm.isDiagnostic&&<F label="Order (1–5)" type="number" value={qForm.diagnosticOrder} onChange={(v:string)=>setQForm(f=>({...f,diagnosticOrder:v}))} placeholder="1"/>}
          </div>
        </div>

        {/* B: Situation Update */}
        <div>
          <p className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">B — Situation Update</p>
          <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-body text-amber-700">
            <span className="font-bold">From Decision 7 onwards:</span> at least one message must reference a specific consequence of a previous decision by name.
          </div>
          <SituationBuilder messages={sitMsgs} setMessages={setSitMsgs}/>
          <div className="mt-3">
            <p className="font-mono text-[10px] text-slate-400 font-bold uppercase mb-2">Or paste free-form situation text</p>
            <F rows={4} value={qForm.situationUpdate} onChange={(v:string)=>setQForm(f=>({...f,situationUpdate:v}))}
              placeholder="If you use the message builder above it takes priority. Paste raw situation text here as fallback."/>
          </div>
        </div>

        {/* C: Question */}
        <div>
          <p className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">C — The Decision Question</p>
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <F label="Question Text — one clear question naming the specific trade-off. Max 2 sentences." rows={2}
              value={qForm.questionText} onChange={(v:string)=>setQForm(f=>({...f,questionText:v}))}
              placeholder="You have 26 minutes before the all-hands. You've just learned a feature sold to three prospects is three weeks from complete. What is your first move?"/>
            <F label="Additional Context — specific facts that make the decision harder, without hinting at an answer" rows={2}
              value={qForm.context} onChange={(v:string)=>setQForm(f=>({...f,context:v}))}
              placeholder="Vikram's all-hands starts in 26 minutes. Arjun has two prospects who have verbally committed pending a confirmed launch date."/>
          </div>
        </div>

        {/* D: Options */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] text-slate-400 font-bold uppercase tracking-widest">D — Options ({options.length}/6)</p>
            {options.length<6&&!addingOpt&&(
              <button onClick={()=>setAddingOpt(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-body text-sm font-semibold shadow-sm"
                style={{background:col}}>
                <Plus className="w-4 h-4"/>Add Option {OPTION_LABELS[options.length]}
              </button>
            )}
          </div>
          <div className="space-y-3">
            {options.map(opt=>(
              <OptionBlock key={opt.id} opt={opt} variables={variables}
                onUpdated={(updated)=>setOptions(os=>os.map(o=>o.id===opt.id?{...o,...updated}:o))}
                onDeleted={(id)=>setOptions(os=>os.filter(o=>o.id!==id))}/>
            ))}
            {addingOpt&&options.length<6&&(
              <AddOptionForm questionId={q.id} variables={variables} nextLabel={OPTION_LABELS[options.length]}
                onAdded={(o)=>{setOptions(os=>[...os,o]);setAddingOpt(false);}}
                onCancel={()=>setAddingOpt(false)}/>
            )}
            {options.length===0&&!addingOpt&&(
              <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">
                <p className="font-mono text-sm text-slate-400 font-semibold mb-3">No options yet — add all 6 options (A through F)</p>
                <button onClick={()=>setAddingOpt(true)} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white font-body font-semibold text-sm" style={{background:col}}>
                  <Plus className="w-4 h-4"/>Add Option A
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const EMPTY_Q={questionNumber:1,tag:"",weekLabel:"",charactersPresent:"",situationUpdate:"",questionText:"",context:"",isDiagnostic:false,diagnosticOrder:""};

function QuestionsTab({ id,variables,questions,setQuestions }:{ id:string;variables:any[];questions:any[];setQuestions:any }){
  const [openId,setOpenId]=useState<string|null>(null);
  const [adding,setAdding]=useState(false);
  const [qForm,setQForm]=useState({...EMPTY_Q,questionNumber:questions.length+1});
  const [savingNew,setSavingNew]=useState(false);

  const createQ=async()=>{
    if(!qForm.questionText){toast.error("Question text required");return;}
    setSavingNew(true);
    try{
      const res=await api.post(`/admin/usecases/${id}/questions`,{...qForm,questionNumber:parseInt(String(qForm.questionNumber))||questions.length+1,charactersPresent:qForm.charactersPresent.split(",").map((s:string)=>s.trim()).filter(Boolean),diagnosticOrder:qForm.diagnosticOrder?parseInt(String(qForm.diagnosticOrder)):null});
      const newQ={...res.data.data,options:[]};
      setQuestions((q:any[])=>[...q,newQ].sort((a:any,b:any)=>a.questionNumber-b.questionNumber));
      setQForm({...EMPTY_Q,questionNumber:questions.length+2});setAdding(false);setOpenId(newQ.id);
      toast.success(`Decision ${res.data.data.questionNumber} created — add options below`);
    }catch{toast.error("Failed");}finally{setSavingNew(false);}
  };

  const ACT_COLORS=["#3b82f6","#f59e0b","#ef4444","#8b5cf6"];
  const complete=questions.length>=25;const withOpts=questions.filter(q=>(q.options?.length||0)>=6).length;

  return(
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className={LBL}>Decisions — {questions.length}/25 · {withOpts} fully optioned</p>
            <p className="font-body text-sm text-slate-600">Each decision needs 6 options · Each option needs ≥8 non-zero impacts · Every option must cost something</p>
          </div>
          {!adding&&(
            <button onClick={()=>{setAdding(true);setQForm({...EMPTY_Q,questionNumber:questions.length+1});}}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-body font-semibold text-sm shadow-sm" style={{background:G}}>
              <Plus className="w-4 h-4"/>Add Decision {questions.length+1}
            </button>
          )}
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{width:`${Math.min(100,(questions.length/25)*100)}%`,background:complete?"#10b981":G}}/>
        </div>
      </div>

      {adding&&(
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <p className={LBL}>New Decision {qForm.questionNumber}</p>
            <Btn onClick={()=>setAdding(false)} variant="ghost">Cancel</Btn>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <F label="Decision #" type="number" value={qForm.questionNumber} onChange={(v:string)=>setQForm(f=>({...f,questionNumber:parseInt(v)||1}))}/>
            <div>
              <label className={LBL}>Decision Tag</label>
              <select value={qForm.tag||""} className={SEL} onChange={e=>setQForm(f=>({...f,tag:e.target.value}))}>
                <option value="">Select tag…</option>
                {DECISION_TOPICS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <F label="Week Label" value={qForm.weekLabel} onChange={(v:string)=>setQForm(f=>({...f,weekLabel:v}))} placeholder="Week 1 — Day 1, 9:58 AM"/>
            <F label="Characters Present" value={qForm.charactersPresent} onChange={(v:string)=>setQForm(f=>({...f,charactersPresent:v}))} placeholder="Priya Nair, Vikram Anand"/>
          </div>
          <F label="Question Text *" rows={2} value={qForm.questionText} onChange={(v:string)=>setQForm(f=>({...f,questionText:v}))}
            placeholder="One clear question naming the specific trade-off. What is {{PLAYER_NAME}}'s first move?"/>
          <F label="Additional Context" rows={2} value={qForm.context} onChange={(v:string)=>setQForm(f=>({...f,context:v}))}
            placeholder="Specific facts that make the decision harder without hinting at a correct answer."/>
          <div className="flex items-center gap-2">
            <Btn onClick={createQ} loading={savingNew}>Create Decision</Btn>
            <Btn onClick={()=>setAdding(false)} variant="ghost">Cancel</Btn>
          </div>
        </div>
      )}

      {/* Act-grouped question list */}
      <div className="space-y-3">
        {[1,2,3,4].map(act=>{
          const actQs=questions.filter(q=>getAct(q.questionNumber)===act);
          if(!actQs.length)return null;
          const col=ACT_COLORS[act-1];
          const actNames=["THE FIRST ACT","THE SECOND ACT","THE PRESSURE TEST","THE FINAL ACT"];
          return(
            <div key={act}>
              <div className="flex items-center gap-2 py-2 px-4 rounded-xl mb-2 border" style={{background:`${col}0D`,borderColor:`${col}30`}}>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest" style={{color:col}}>ACT {act} — {actNames[act-1]} · Q{ACT_RANGES[act-1][0]}–Q{ACT_RANGES[act-1][1]}</span>
                <span className="ml-auto font-mono text-[10px] font-bold" style={{color:col}}>{actQs.length}/{ACT_RANGES[act-1][1]-ACT_RANGES[act-1][0]+1}</span>
              </div>
              <div className="space-y-2 ml-2">
                {actQs.map(q=>{
                  const optCnt=q.options?.length||0;const isOpen=openId===q.id;
                  return(
                    <div key={q.id}>
                      {isOpen
                        ?<QuestionEditor q={q} variables={variables}
                            onUpdated={(updated)=>setQuestions((qs:any[])=>qs.map(x=>x.id===q.id?{...x,...updated}:x).sort((a:any,b:any)=>a.questionNumber-b.questionNumber))}
                            onDeleted={(id)=>setQuestions((qs:any[])=>qs.filter(x=>x.id!==id))}
                            onClose={()=>setOpenId(null)}/>
                        :(
                          <button onClick={()=>setOpenId(q.id)}
                            className="w-full text-left flex items-center gap-3 p-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-bold text-white flex-shrink-0 shadow-sm" style={{background:col}}>{q.questionNumber}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                {q.tag&&<span className="font-mono text-[10px] font-bold uppercase" style={{color:col}}>{q.tag}</span>}
                                {q.weekLabel&&<span className="font-mono text-[10px] text-slate-400 font-medium">{q.weekLabel}</span>}
                                {q.isDiagnostic&&<span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold">Diagnostic</span>}
                              </div>
                              <p className="font-body text-sm text-slate-700 font-medium leading-snug line-clamp-1">{q.questionText||<span className="text-slate-400 italic font-normal">No question text yet</span>}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`font-mono text-[10px] px-2.5 py-1 rounded-full border font-bold ${optCnt>=6?"text-emerald-700 bg-emerald-50 border-emerald-200":optCnt>0?"text-amber-700 bg-amber-50 border-amber-200":"text-rose-700 bg-rose-50 border-rose-200"}`}>
                                {optCnt}/6
                              </span>
                              <ChevronDown className="w-4 h-4 text-slate-400"/>
                            </div>
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   TAB 9 — RESULTS  (Grade Descriptions · Dimension Bands · Reports)
   ════════════════════════════════════════════════════════════════════ */
type ResultsSub = "grades" | "dimensions" | "reports" | "senior";

function ResultsTab({ id, scoring }: { id: string; scoring: any[] }) {
  const [sub, setSub] = useState<ResultsSub>("grades");
  const [saving, setSaving] = useState(false);

  /* ── Grade Descriptions: 10 grades × 3 user types = 30 fields ── */
  const initGrades = () => {
    const obj: Record<string, Record<string, string>> = {};
    GRADE_BANDS.forEach(b => { obj[b.grade] = { PLACEMENT: "", EXPLORER: "", PROFESSIONAL: "" }; });
    return obj;
  };
  const [grades, setGrades] = useState<Record<string, Record<string, string>>>(initGrades);
  const [gradesOpen, setGradesOpen] = useState<Record<string, boolean>>({});

  /* ── Dimension Bands: 10 bands × dims × 3 user types ── */
  const initBands = () => {
    const obj: Record<string, Record<string, Record<string, string>>> = {};
    scoring.forEach(dim => {
      obj[dim.dimensionKey] = {};
      GRADE_BANDS.forEach(b => { obj[dim.dimensionKey][b.grade] = { PLACEMENT: "", EXPLORER: "", PROFESSIONAL: "" }; });
    });
    return obj;
  };
  const [bands, setBands] = useState<Record<string, Record<string, Record<string, string>>>>(initBands);
  const [dimOpen, setDimOpen] = useState<Record<string, boolean>>({});

  /* ── User-Type Reports ── */
  const initReports = () => ({
    PLACEMENT:    { title: "", subsection1: "", subsection2: "", subsection3: "", subsection4: "" },
    EXPLORER:     { title: "", subsection1: "", subsection2: "", subsection3: "", subsection4: "" },
    PROFESSIONAL: { title: "", subsection1: "", subsection2: "", subsection3: "", subsection4: "", subsection5: "" },
  });
  const [reports, setReports] = useState<Record<string, any>>(initReports);

  /* ── Senior Perspective (Professional): 25 lines ── */
  const [senior, setSenior] = useState<string[]>(Array.from({ length: 25 }, () => ""));

  const saveGrades = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/usecases/${id}/grade-descriptions`, { grades });
      toast.success("Grade descriptions saved");
    } catch { toast.error("Save failed"); } finally { setSaving(false); }
  };
  const saveBands = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/usecases/${id}/dimension-bands`, { bands });
      toast.success("Dimension band descriptions saved");
    } catch { toast.error("Save failed"); } finally { setSaving(false); }
  };
  const saveReports = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/usecases/${id}/reports`, { reports });
      toast.success("Report templates saved");
    } catch { toast.error("Save failed"); } finally { setSaving(false); }
  };
  const saveSenior = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/usecases/${id}/senior-perspective`, { lines: senior });
      toast.success("Senior perspectives saved");
    } catch { toast.error("Save failed"); } finally { setSaving(false); }
  };

  const gradeColor = (g: string) => {
    const map: Record<string, string> = { "A+": "#059669", A: "#10b981", "B+": "#5a7f2e", B: "#84cc16", "C+": "#f59e0b", C: "#f97316", "D+": "#ef4444", D: "#dc2626", E: "#9333ea", F: "#6b21a8" };
    return map[g] || "#64748b";
  };

  const SUB_TABS: { key: ResultsSub; label: string; icon: any; count: string }[] = [
    { key: "grades",     label: "Grade Descriptions",  icon: Award,      count: "30 fields" },
    { key: "dimensions", label: "Dimension Bands",     icon: BarChart3,  count: `${scoring.length * 30} fields` },
    { key: "reports",    label: "User-Type Reports",   icon: FileText,   count: "3 reports" },
    { key: "senior",     label: "Senior Perspective",  icon: TrendingUp, count: "25 lines" },
  ];

  return (
    <div className="space-y-5">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1.5 overflow-x-auto">
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-body text-sm font-semibold transition-all flex-shrink-0 whitespace-nowrap ${sub === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
            <t.icon className="w-4 h-4 flex-shrink-0"/>
            <span>{t.label}</span>
            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md font-bold ${sub === t.key ? "bg-slate-100 text-slate-600" : "bg-white/0 text-slate-400"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── GRADE DESCRIPTIONS ────────────────────────────────────── */}
      {sub === "grades" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className={LBL}>Overall Grade Descriptions — 10 grades × 3 user types = 30 fields</p>
            <p className="font-body text-sm text-slate-600">Each description is 1–2 lines shown prominently on the result screen after the grade letter. Write in the voice of the user type.</p>
          </div>
          {GRADE_BANDS.map(b => (
            <Card key={b.grade}>
              <button onClick={() => setGradesOpen(p => ({ ...p, [b.grade]: !p[b.grade] }))}
                className="w-full flex items-center gap-4 text-left">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-mono text-xl font-black text-white flex-shrink-0 shadow-sm"
                  style={{ background: gradeColor(b.grade) }}>{b.grade}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-body font-bold text-slate-900">{b.grade}</p>
                    <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">{b.range}</span>
                  </div>
                  <p className="font-body text-sm text-slate-500">{b.what}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {USER_TYPES.map(ut => (
                    <span key={ut.key} className={`w-2 h-2 rounded-full ${grades[b.grade]?.[ut.key] ? "" : "bg-slate-200"}`}
                      style={grades[b.grade]?.[ut.key] ? { background: gradeColor(b.grade) } : {}}/>
                  ))}
                  {gradesOpen[b.grade] ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                </div>
              </button>
              {gradesOpen[b.grade] && (
                <div className="mt-4 space-y-4 pt-4 border-t border-slate-100">
                  {USER_TYPES.map(ut => (
                    <div key={ut.key} className={`p-4 rounded-2xl border ${ut.border} ${ut.bg}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <ut.icon className={`w-4 h-4 ${ut.color}`}/>
                        <span className={`font-mono text-[11px] font-bold uppercase tracking-wider ${ut.color}`}>{ut.label}</span>
                      </div>
                      <F rows={2}
                        placeholder={`1–2 lines for ${ut.label} who scored ${b.grade}. Voice: ${ut.key === "PLACEMENT" ? "placement-focused, references interview readiness" : ut.key === "EXPLORER" ? "curious, references learning journey" : "professional, references real career consequences"}`}
                        value={grades[b.grade]?.[ut.key] || ""}
                        onChange={(v: string) => setGrades(p => ({ ...p, [b.grade]: { ...p[b.grade], [ut.key]: v } }))}/>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
          <div className="flex justify-end"><Btn onClick={saveGrades} loading={saving}>Save All Grade Descriptions</Btn></div>
        </div>
      )}

      {/* ── DIMENSION BANDS ───────────────────────────────────────── */}
      {sub === "dimensions" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className={LBL}>Dimension Band Descriptions — {scoring.length} dimensions × 10 bands × 3 user types = {scoring.length * 30} fields</p>
            <p className="font-body text-sm text-slate-600">Each description is 1–2 lines shown under the dimension name on the result screen. Must be domain + user-type specific.</p>
          </div>
          {scoring.length === 0 && (
            <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200">
              <p className="font-body text-slate-500 mb-1">No scoring dimensions defined yet</p>
              <p className="font-mono text-xs text-slate-400">Go to the Scoring tab and add your 5 dimensions first</p>
            </div>
          )}
          {scoring.map(dim => (
            <Card key={dim.id}>
              <button onClick={() => setDimOpen(p => ({ ...p, [dim.dimensionKey]: !p[dim.dimensionKey] }))}
                className="w-full flex items-center gap-4 text-left">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: `${G}15`, border: `1.5px solid ${G}30` }}>
                  <Target className="w-4.5 h-4.5" style={{ color: G }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body font-bold text-slate-900 text-sm">{dim.displayName}</p>
                  <p className="font-mono text-xs text-slate-500">{dim.dimensionKey?.replace(/_/g," ")}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono text-[10px] text-slate-400 font-semibold">{GRADE_BANDS.length * 3} fields</span>
                  {dimOpen[dim.dimensionKey] ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                </div>
              </button>
              {dimOpen[dim.dimensionKey] && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-5">
                  {GRADE_BANDS.map(b => (
                    <div key={b.grade} className="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono text-sm font-black text-white flex-shrink-0" style={{ background: gradeColor(b.grade) }}>{b.grade}</div>
                        <div>
                          <p className="font-mono text-xs font-bold text-slate-700">{b.grade} · {b.range}</p>
                          <p className="font-body text-xs text-slate-500">{b.what.slice(0, 60)}…</p>
                        </div>
                      </div>
                      <div className="p-4 grid sm:grid-cols-3 gap-3">
                        {USER_TYPES.map(ut => (
                          <div key={ut.key} className={`p-3 rounded-xl border ${ut.border} ${ut.bg}`}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <ut.icon className={`w-3.5 h-3.5 ${ut.color}`}/>
                              <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${ut.color}`}>{ut.label}</span>
                            </div>
                            <textarea rows={2}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 resize-none"
                              placeholder={`${dim.displayName} at ${b.grade} for ${ut.label}…`}
                              value={bands[dim.dimensionKey]?.[b.grade]?.[ut.key] || ""}
                              onChange={(e) => setBands(p => ({
                                ...p,
                                [dim.dimensionKey]: {
                                  ...p[dim.dimensionKey],
                                  [b.grade]: { ...(p[dim.dimensionKey]?.[b.grade] || {}), [ut.key]: e.target.value }
                                }
                              }))}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
          <div className="flex justify-end"><Btn onClick={saveBands} loading={saving}>Save All Dimension Bands</Btn></div>
        </div>
      )}

      {/* ── USER-TYPE REPORTS ────────────────────────────────────── */}
      {sub === "reports" && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <p className={LBL}>User-Type Specific Result Reports — 3 fully separate report structures</p>
            <p className="font-body text-sm text-slate-600">Each report appears on the result screen after the grade. Must reference actual decision numbers from this simulation. Cannot be generic.</p>
          </div>

          {/* Placement Prep */}
          {[
            { key:"PLACEMENT", name:"Placement Readiness Report", ut:USER_TYPES[0],
              subs:[{k:"subsection1",label:"Interview Strengths",ph:"Identify 2 specific decision patterns (name Decision numbers) that reflect genuine domain strengths. What does each look like to an interviewer?"},
                    {k:"subsection2",label:"Watch Points Before Interviews",ph:"Identify 2 blind spots tied to actual decision numbers. What would a stronger decision have looked like? How will interviewers probe this?"},
                    {k:"subsection3",label:"Positioning Statement",ph:"One paragraph {{PLAYER_NAME}} can internalise for interviews. From their dimension grades and ending profile. A framework — not a script."},
                    {k:"subsection4",label:"Readiness Comparison",ph:"One line per dimension comparing their grade to what strong placement performers typically achieve. Directional and motivating, not shaming."}]},
            { key:"EXPLORER", name:"Learning Debrief", ut:USER_TYPES[1],
              subs:[{k:"subsection1",label:"What You Experienced",ph:"One paragraph summarising the simulation arc. What {{PLAYER_NAME}} faced across the 4 acts. How the company state changed through their decisions."},
                    {k:"subsection2",label:"The Business Dynamics at Work",ph:"3–4 paragraphs explaining the underlying principles operating in this simulation. Every principle explained through a specific event from the simulation."},
                    {k:"subsection3",label:"What You Did Well",ph:"Two specific decision patterns that showed genuine domain instinct. Reference actual decision numbers. Why are these instincts professionally valuable?"},
                    {k:"subsection4",label:"What to Explore Next",ph:"2–3 specific learning directions connected to blind spots the simulation revealed. Not a reading list. A specific direction with a reason tied to the simulation."}]},
            { key:"PROFESSIONAL", name:"Management Credibility Report", ut:USER_TYPES[2],
              subs:[{k:"subsection1",label:"Decision Pattern Summary",ph:"Two paragraphs. An honest professional characterisation of how {{PLAYER_NAME}} approaches decisions. Name the pattern. Give evidence from specific decisions. Explain the professional consequence."},
                    {k:"subsection2",label:"Leadership Style Profile",ph:"One paragraph. The type of professional {{PLAYER_NAME}} currently is. Natural instincts, default responses under pressure, where those instincts serve them and where they create problems."},
                    {k:"subsection3",label:"Development Priorities",ph:"Two specific things to work on. Each tied to specific decision numbers. What would a more senior version of that decision have looked like?"},
                    {k:"subsection4",label:"Blind Spot Map",ph:"Three rows: Decision Number | Option Chosen | Consequence That Followed | What the Alternative Would Have Achieved. Format as a clear table."},
                    {k:"subsection5",label:"Progress Tracker",ph:"First simulation: baseline dimension grades + 'Complete Simulation 2 to see how your profile develops.' Returning: side-by-side comparison with most significant change noted."}]},
          ].map(({ key, name, ut, subs }) => (
            <Card key={key}>
              <div className={`flex items-center gap-3 mb-5 pb-4 border-b ${ut.border}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${ut.bg} border ${ut.border}`}>
                  <ut.icon className={`w-5 h-5 ${ut.color}`}/>
                </div>
                <div>
                  <h3 className={`font-display font-bold text-sm ${ut.color}`}>{name}</h3>
                  <p className="font-body text-xs text-slate-500">{ut.label} — must reference actual decision numbers from this simulation</p>
                </div>
              </div>
              <div className="space-y-4">
                <F label="Report Title (shown as heading on result screen)" value={reports[key]?.title || ""}
                  onChange={(v: string) => setReports(p => ({ ...p, [key]: { ...p[key], title: v } }))}
                  placeholder={name}/>
                {subs.map(({ k, label, ph }) => (
                  <F key={k} label={label} rows={5} value={reports[key]?.[k] || ""} placeholder={ph}
                    onChange={(v: string) => setReports(p => ({ ...p, [key]: { ...p[key], [k]: v } }))}/>
                ))}
              </div>
            </Card>
          ))}
          <div className="flex justify-end"><Btn onClick={saveReports} loading={saving}>Save All Reports</Btn></div>
        </div>
      )}

      {/* ── SENIOR PERSPECTIVE ───────────────────────────────────── */}
      {sub === "senior" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <p className={LBL}>Senior Perspective — 25 lines, Professional user type only</p>
            <p className="font-body text-sm text-amber-800">One sentence per decision. What a more experienced professional in this domain might have chosen and why. Exclusive to the Junior Professional track. Shown in the Decision Log on the result screen.</p>
          </div>
          {Array.from({ length: 25 }, (_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200 font-mono text-xs font-bold text-amber-700 mt-1">{i + 1}</div>
              <div className="flex-1">
                <label className={LBL}>Decision {i + 1} — Senior Perspective</label>
                <input value={senior[i] || ""}
                  onChange={e => setSenior(p => p.map((v, idx) => idx === i ? e.target.value : v))}
                  placeholder={`A more experienced PM might have chosen to… because… (one sentence for Decision ${i + 1})`}
                  className={INP}/>
              </div>
            </div>
          ))}
          <div className="flex justify-end"><Btn onClick={saveSenior} loading={saving}>Save Senior Perspectives</Btn></div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function SimulationBuilderPage(){
  const router=useRouter();
  const params=useParams();
  const id    =params?.id as string;

  const [loading,   setLoading]   = useState(true);
  const [useCase,   setUseCase]   = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Story");
  const [story,     setStory]     = useState({companyBackground:"",howItWorks:"",closingChallenge:""});
  const [scene,     setScene]     = useState({arrivalContext:"",incomingMessages:"",seniorStatement:""});
  const [chars,     setChars]     = useState<any[]>([]);
  const [variables, setVariables] = useState<any[]>([]);
  const [scoring,   setScoring]   = useState<any[]>([]);
  const [endings,   setEndings]   = useState<any[]>([]);
  const [convos,    setConvos]    = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [publishing,setPublishing]= useState(false);

  useEffect(()=>{
    if(!id||id==="undefined"){router.push("/admin/domains");return;}
    loadAll();
  },[id]);

  const loadAll=async()=>{
    try{
      const res=await api.get(`/admin/usecases/${id}`);
      const d=res.data.data;
      setUseCase(d);
      if(d.story)setStory({companyBackground:d.story.companyBackground||"",howItWorks:d.story.howItWorks||"",closingChallenge:d.story.closingChallenge||""});
      if(d.openingScene)setScene({arrivalContext:d.openingScene.arrivalContext||"",incomingMessages:d.openingScene.incomingMessages||"",seniorStatement:d.openingScene.seniorStatement||""});
      setChars(d.characters||[]);
      setVariables(d.variables||[]);
      setScoring(d.scoringConfigs||d.dimensionConfigs||[]);
      setEndings(d.endings||[]);
      setConvos(d.preDecisionConversations||[]);
      setQuestions((d.questions||[]).sort((a:any,b:any)=>a.questionNumber-b.questionNumber));
    }catch{toast.error("Failed to load simulation");router.push("/admin/domains");}
    finally{setLoading(false);}
  };

  const togglePublish=async()=>{
    setPublishing(true);
    try{
      const res=await api.patch(`/admin/usecases/${id}`,{isPublished:!useCase.isPublished});
      setUseCase((u:any)=>({...u,isPublished:res.data.data.isPublished}));
      toast.success(res.data.data.isPublished?"Published! Students can now access this.":"Unpublished.");
    }catch{toast.error("Failed");}finally{setPublishing(false);}
  };

  const TAB_CONFIG: { [K in Tab]: { icon: any; label: string; count: string | null; done: boolean } } = {
    Story:       {icon:BookOpen,     label:"Story",         count:null,                       done:!!(story.companyBackground&&story.closingChallenge)},
    OpeningScene:{icon:MessageSquare,label:"Opening",       count:null,                       done:!!(scene.arrivalContext&&scene.seniorStatement)},
    Characters:  {icon:Users,        label:"Characters",    count:String(chars.length),       done:chars.length>=5},
    Variables:   {icon:Activity,     label:"Variables",     count:String(variables.length),   done:variables.length>=1},
    Scoring:     {icon:Target,       label:"Scoring",       count:`${scoring.length}/5`,      done:scoring.length===5},
    Endings:     {icon:Flag,         label:"Endings",       count:String(endings.length),     done:endings.length>=4},
    PreDecision: {icon:MessageSquare,label:"Pre-Decision",  count:String(convos.length),      done:convos.length>=2},
    Questions:   {icon:HelpCircle,   label:"Decisions",     count:`${questions.length}/25`,   done:questions.length>=25&&questions.every(q=>(q.options?.length||0)>=6)},
    Results:     {icon:Award,        label:"Results",       count:null,                       done:false},
  };

  const ready=["Story","OpeningScene","Characters","Scoring","Endings","Questions"].every(t=>TAB_CONFIG[t as Tab].done);
  const utLabel={PLACEMENT:"Placement Prep",EXPLORER:"Student Explorer",PROFESSIONAL:"Junior Professional"}[useCase?.targetUserType as string]||"All Types";

  if(loading)return(
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin" style={{color:G}}/>
    </div>
  );

  return(
    <>
    <style>{`
      @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      /* Crystal-clear font rendering for admin panel */
      .admin-builder * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }
      .admin-builder label { font-weight: 600; }
      .admin-builder input, .admin-builder textarea, .admin-builder select {
        color: #0f172a !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
      }
      .admin-builder p, .admin-builder span { letter-spacing: 0; }
      .admin-builder .font-mono { letter-spacing: 0.02em; }
    `}</style>

    <div className="admin-builder" style={{animation:"fadeUp 0.35s ease"}}>

      {/* Header */}
      <div className="mb-6">
        <Link href={`/admin/domains/${useCase?.domainId}`}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-body text-sm font-medium transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5"/>Back to Domain
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg" style={{background:`${G}15`,color:G}}>Simulation Builder</span>
              <span className="font-mono text-xs px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-semibold">
                {utLabel} · {useCase?.difficultyLabel||useCase?.difficulty}
              </span>
            </div>
            <h1 className="font-display font-black text-2xl text-slate-900 leading-tight">{useCase?.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="font-mono text-xs text-slate-400">/{useCase?.slug}</span>
              <span className={`font-mono text-[11px] px-2.5 py-1 rounded-full border font-bold ${useCase?.isPublished?"text-emerald-700 bg-emerald-50 border-emerald-200":"text-slate-500 bg-slate-100 border-slate-200"}`}>
                {useCase?.isPublished?"● Published":"○ Draft"}
              </span>
              <div className="flex gap-1 items-center">
                {(Object.entries(TAB_CONFIG) as [Tab,any][]).map(([k,cfg])=>(
                  <div key={k} className={`w-2 h-2 rounded-full transition-all ${cfg.done?"":"bg-slate-200"}`}
                    style={cfg.done?{background:G}:{}} title={`${cfg.label}: ${cfg.done?"✓":"incomplete"}`}/>
                ))}
              </div>
            </div>
          </div>
          <button onClick={togglePublish} disabled={publishing||(!useCase?.isPublished&&!ready)}
            title={!ready&&!useCase?.isPublished?"Complete Story, Characters, Scoring, Endings, and 25 Decisions first":""}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-body font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-sm
              ${useCase?.isPublished?"bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100":"bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"}`}>
            {publishing?<Loader2 className="w-4 h-4 animate-spin"/>:useCase?.isPublished?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
            {useCase?.isPublished?"Unpublish":"Publish Simulation"}
          </button>
        </div>
      </div>

      {/* Tab bar — horizontal scroll on mobile */}
      <div className="flex items-stretch bg-slate-100 rounded-2xl p-1.5 mb-6 gap-1 overflow-x-auto">
        {TABS.map(tab=>{
          const cfg=TAB_CONFIG[tab];const active=activeTab===tab;
          return(
            <button key={tab} onClick={()=>setActiveTab(tab)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl font-body font-semibold text-xs transition-all relative whitespace-nowrap
                ${active?"text-white shadow-md":"text-slate-600 hover:text-slate-900 hover:bg-white/70"}`}
              style={active?{background:G}:{}}>
              <cfg.icon className="w-3.5 h-3.5 flex-shrink-0"/>
              <span className="hidden sm:inline">{cfg.label}</span>
              {cfg.count!==null&&(
                <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-md flex-shrink-0 font-bold
                  ${active?"bg-white/25 text-white":cfg.done?"bg-emerald-100 text-emerald-700":"bg-slate-200 text-slate-500"}`}>
                  {cfg.count}
                </span>
              )}
              {cfg.done&&!active&&<span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500"/>}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div key={activeTab} style={{animation:"fadeUp 0.2s ease"}}>
        {activeTab==="Story"        &&<StoryTab        id={id} story={story} setStory={setStory}/>}
        {activeTab==="OpeningScene" &&<OpeningSceneTab id={id} scene={scene} setScene={setScene}/>}
        {activeTab==="Characters"   &&<CharactersTab   id={id} chars={chars} setChars={setChars}/>}
        {activeTab==="Variables"    &&<VariablesTab    id={id} variables={variables} setVariables={setVariables}/>}
        {activeTab==="Scoring"      &&<ScoringTab      id={id} scoring={scoring} setScoring={setScoring}/>}
        {activeTab==="Endings"      &&<EndingsTab      id={id} endings={endings} setEndings={setEndings}/>}
        {activeTab==="PreDecision"  &&<PreDecisionTab  id={id} convos={convos} setConvos={setConvos}/>}
        {activeTab==="Questions"    &&<QuestionsTab    id={id} variables={variables} questions={questions} setQuestions={setQuestions}/>}
        {activeTab==="Results"      &&<ResultsTab      id={id} scoring={scoring}/>}
      </div>

    </div>
    </>
  );
}