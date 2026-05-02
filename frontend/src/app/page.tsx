"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Brain, Zap, Target, BarChart3, Trophy,
  CheckCircle2, Star, Users, Sparkles, TrendingUp, Shield,
  Lightbulb, Briefcase, DollarSign, Settings, Heart, Menu, X,
} from "lucide-react";

const G  = "#5a7f2e";
const G2 = "#7aaa3e";
const F  = "'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif";
const FM = "'JetBrains Mono','Fira Code','Courier New',monospace";

const DOMAINS = [
  { name:"Product Management",  Icon:Brain,      color:"#5a7f2e", bg:"rgba(90,127,46,0.10)",  desc:"Roadmaps, prioritisation, stakeholder trade-offs" },
  { name:"Finance",             Icon:DollarSign, color:"#059669", bg:"rgba(5,150,105,0.10)",  desc:"Budgeting, forecasting, capital decisions" },
  { name:"Operations",          Icon:Settings,   color:"#d97706", bg:"rgba(217,119,6,0.10)",  desc:"Process design, efficiency, supply chain" },
  { name:"Human Resources",     Icon:Heart,      color:"#db2777", bg:"rgba(219,39,119,0.10)", desc:"Hiring, culture, performance management" },
  { name:"Strategy",            Icon:Target,     color:"#0891b2", bg:"rgba(8,145,178,0.10)",  desc:"Competitive positioning, growth levers" },
  { name:"General Management",  Icon:Briefcase,  color:"#1d4ed8", bg:"rgba(29,78,216,0.10)",  desc:"Cross-functional leadership, org decisions" },
  { name:"Sales & Marketing",   Icon:TrendingUp, color:"#dc2626", bg:"rgba(220,38,38,0.10)",  desc:"GTM strategy, pricing, demand generation" },
  { name:"Entrepreneurship",    Icon:Lightbulb,  color:"#ea580c", bg:"rgba(234,88,12,0.10)",  desc:"Founder decisions, fundraising, pivots" },
];
const STATS = [
  { value:"25+", label:"Decisions per simulation" },
  { value:"8",   label:"Management domains" },
  { value:"6",   label:"Scoring dimensions" },
  { value:"45",  label:"Minutes average" },
];
const HOW = [
  { n:"01", Icon:Target,    title:"Pick your domain",       body:"Choose from 8 management tracks. Each has dedicated simulations built around real Indian business contexts." },
  { n:"02", Icon:Brain,     title:"Step into the scenario", body:"You become the decision-maker. Dropped into a live business situation — no theory, just you and the consequences." },
  { n:"03", Icon:BarChart3, title:"Get scored and coached", body:"After 25 decisions you get a full breakdown — score by dimension, what went wrong, and how to think differently." },
];
const FEATURES = [
  { Icon:Zap,        title:"Sequential decisions",    body:"Every choice affects the next. Decisions compound — exactly like real management." },
  { Icon:BarChart3,  title:"6-dimension scoring",     body:"Financial prudence, stakeholder trust, risk management, credibility, morale, strategy." },
  { Icon:Trophy,     title:"Verifiable certificate",  body:"Share your score on LinkedIn. Show, don't tell." },
  { Icon:Shield,     title:"No right answers",        body:"Most decisions are trade-offs. The simulation rewards nuanced judgment, not textbook answers." },
  { Icon:Users,      title:"Domain-specific context", body:"Finance simulations feel like Finance. Product decisions feel like Product." },
  { Icon:TrendingUp, title:"Track your progress",     body:"Retry simulations. Watch your score improve. See which dimensions you've strengthened." },
];
const COMPARE = [
  { feature:"Real decisions with consequences", us:true,  them:false },
  { feature:"Scores across 6 dimensions",       us:true,  them:false },
  { feature:"Domain-specific scenarios",        us:true,  them:true  },
  { feature:"No multiple-choice theory tests",  us:true,  them:false },
  { feature:"Verifiable LinkedIn certificate",  us:true,  them:false },
  { feature:"Free to start",                    us:true,  them:true  },
];
const TESTIMONIALS = [
  { name:"Aditya Menon",  role:"MBA Student, IIM Kozhikode",  score:84, quote:"I made 25 decisions as a Product Manager before I'd ever had a PM interview. It forced me to think through trade-offs I'd never considered in class." },
  { name:"Priya Sharma",  role:"BCom Final Year, Christ Uni", score:91, quote:"The Finance simulation was harder than my actual internship case study round. Finished it twice and scored better the second time." },
  { name:"Rohan Verma",   role:"BBA Student, Symbiosis",      score:77, quote:"Most learning tools feel like you're being taught. ManaGenz feels like you're being tested. Big difference." },
];

function Navbar({ scrolled }: { scrolled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:100,fontFamily:F,
      background:scrolled?"rgba(255,255,255,0.98)":"rgba(246,250,243,0.96)",
      borderBottom:scrolled?"1px solid #e2e8f0":"1px solid transparent",
      backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",
      boxShadow:scrolled?"0 1px 16px rgba(0,0,0,0.07)":"none",
      transition:"all 0.25s ease" }}>
      <div style={{ maxWidth:"1320px",margin:"0 auto",padding:"0 28px",height:"64px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <Link href="/" style={{ textDecoration:"none",display:"flex",alignItems:"center" }}>
          <img src="/logo.png" alt="ManaGenz" style={{ height:"28px",objectFit:"contain" }}
            onError={(e)=>{ const t=e.target as HTMLImageElement;t.style.display="none";const s=document.createElement("span");s.textContent="ManaGenz";s.style.cssText=`font-family:${F};font-size:18px;font-weight:800;color:#0f172a`;t.parentElement?.appendChild(s); }}/>
        </Link>
        <div className="lp-hidden-mobile" style={{ display:"flex",alignItems:"center",gap:"32px" }}>
          {[["How it works","#how"],["Domains","#domains"],["Features","#features"],["Pricing","/pricing"]].map(([l,h])=>(
            <a key={l} href={h} style={{ fontFamily:F,fontSize:"14px",color:"#475569",textDecoration:"none" }}>{l}</a>
          ))}
        </div>
        <div className="lp-hidden-mobile" style={{ display:"flex",alignItems:"center",gap:"12px" }}>
          <Link href="/auth/login" style={{ fontFamily:F,fontSize:"14px",color:"#475569",textDecoration:"none",padding:"8px 12px" }}>Log in</Link>
          <Link href="/auth/signup" style={{ display:"flex",alignItems:"center",gap:"6px",padding:"9px 20px",borderRadius:"10px",background:G,color:"#fff",fontFamily:F,fontSize:"13px",fontWeight:600,textDecoration:"none" }}>
            Get started free
          </Link>
        </div>
        <button onClick={()=>setOpen(v=>!v)} className="lp-show-mobile"
          style={{ display:"none",padding:"8px",background:"none",border:"none",cursor:"pointer",color:"#475569" }}>
          {open?<X size={22}/>:<Menu size={22}/>}
        </button>
      </div>
      {open&&(
        <div style={{ background:"#fff",borderTop:"1px solid #f1f5f9",padding:"16px 28px 20px",fontFamily:F }}>
          <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
            {[["How it works","#how"],["Domains","#domains"],["Features","#features"],["Pricing","/pricing"]].map(([l,h])=>(
              <a key={l} href={h} onClick={()=>setOpen(false)} style={{ fontSize:"14px",color:"#334155",padding:"9px 0",textDecoration:"none",borderBottom:"1px solid #f1f5f9" }}>{l}</a>
            ))}
            <div style={{ display:"flex",flexDirection:"column",gap:"8px",marginTop:"12px" }}>
              <Link href="/auth/login" onClick={()=>setOpen(false)} style={{ textAlign:"center",padding:"11px",borderRadius:"10px",border:"1px solid #e2e8f0",color:"#334155",fontSize:"14px",textDecoration:"none" }}>Log in</Link>
              <Link href="/auth/signup" onClick={()=>setOpen(false)} style={{ textAlign:"center",padding:"11px",borderRadius:"10px",background:G,color:"#fff",fontSize:"14px",fontWeight:600,textDecoration:"none" }}>Get started free</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(()=>{ const fn=()=>setScrolled(window.scrollY>28); fn(); window.addEventListener("scroll",fn,{passive:true}); return()=>window.removeEventListener("scroll",fn); },[]);
  useEffect(()=>{
    const els=document.querySelectorAll<HTMLElement>("[data-sr]");
    const show=(el:HTMLElement)=>{el.style.opacity="1";el.style.transform="translateY(0)";};
    els.forEach(el=>{if(el.getBoundingClientRect().top<window.innerHeight+80)show(el);});
    const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)show(e.target as HTMLElement);});},{threshold:0.05,rootMargin:"0px 0px -32px 0px"});
    els.forEach(el=>{if(el.getBoundingClientRect().top>=window.innerHeight+80)obs.observe(el);});
    return()=>obs.disconnect();
  },[]);
  const sr=(delay=0):React.CSSProperties=>({ opacity:0,transform:"translateY(18px)",transition:`opacity 0.45s ease ${delay}ms,transform 0.45s ease ${delay}ms` });

  return (
    <>
    <style>{`
      html{scroll-behavior:smooth;}
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @media(max-width:768px){
        .lp-hidden-mobile{display:none!important;}
        .lp-show-mobile{display:flex!important;}
        .lp-stats{grid-template-columns:1fr 1fr!important;}
        .lp-3col{grid-template-columns:1fr!important;}
        .lp-domains{grid-template-columns:1fr 1fr!important;}
        .lp-cmp{grid-template-columns:1fr 90px 90px!important;}
        .lp-footer{grid-template-columns:1fr 1fr!important;}
        .lp-cta{flex-direction:column!important;align-items:stretch!important;}
        .lp-h1{font-size:36px!important;line-height:1.15!important;}
      }
    `}</style>

    <div style={{ minHeight:"100vh",background:"#f6faf3",color:"#0f172a",fontFamily:F,overflowX:"hidden" }}>
      <Navbar scrolled={scrolled}/>

      {/* HERO */}
      <section style={{ position:"relative",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"100px 28px 64px",textAlign:"center",overflow:"hidden" }}>
        <div style={{ position:"absolute",inset:0,pointerEvents:"none" }}>
          <div style={{ position:"absolute",top:"22%",left:"50%",transform:"translateX(-50%)",width:"720px",height:"720px",background:"rgba(90,127,46,0.07)",borderRadius:"50%",filter:"blur(130px)" }}/>
          <div style={{ position:"absolute",inset:0,opacity:0.04,backgroundImage:`linear-gradient(${G} 1px,transparent 1px),linear-gradient(90deg,${G} 1px,transparent 1px)`,backgroundSize:"60px 60px" }}/>
        </div>
        <div style={{ position:"relative",zIndex:1,maxWidth:"900px",margin:"0 auto",width:"100%" }}>
          <div style={{ animation:"fadeUp 0.45s ease both",marginBottom:"28px" }}>
            <span style={{ display:"inline-flex",alignItems:"center",gap:"7px",padding:"7px 16px",borderRadius:"100px",background:"rgba(90,127,46,0.12)",border:"1px solid rgba(90,127,46,0.25)" }}>
              <Sparkles size={13} color={G}/>
              <span style={{ fontFamily:FM,fontSize:"11px",color:G,textTransform:"uppercase",letterSpacing:"0.12em" }}>Simulation-Based Management Training</span>
            </span>
          </div>
          <h1 className="lp-h1" style={{ animation:"fadeUp 0.45s ease 0.08s both",fontWeight:800,fontSize:"clamp(36px,6vw,66px)",lineHeight:1.1,letterSpacing:"-1.5px",marginBottom:"20px",fontFamily:F,color:"#0f172a" }}>
            Management skills are{" "}
            <span style={{ color:"transparent",backgroundImage:`linear-gradient(135deg,${G},${G2})`,WebkitBackgroundClip:"text",backgroundClip:"text" }}>built by doing,</span>
            {" "}not reading.
          </h1>
          <p style={{ animation:"fadeUp 0.45s ease 0.15s both",fontSize:"clamp(16px,2vw,20px)",color:"#475569",lineHeight:1.6,maxWidth:"640px",margin:"0 auto 40px",fontFamily:F }}>
            ManaGenz puts you inside real management decisions. Make choices, see consequences, get scored. Repeat until you're genuinely ready.
          </p>
          <div className="lp-cta" style={{ animation:"fadeUp 0.45s ease 0.22s both",display:"flex",alignItems:"center",justifyContent:"center",gap:"14px",flexWrap:"wrap" }}>
            <Link href="/auth/signup" style={{ display:"inline-flex",alignItems:"center",gap:"8px",padding:"14px 28px",borderRadius:"12px",background:G,color:"#fff",fontFamily:F,fontSize:"15px",fontWeight:700,textDecoration:"none",boxShadow:"0 4px 20px rgba(90,127,46,0.35)" }}>
              Start free — no credit card <ArrowRight size={16}/>
            </Link>
            <a href="#how" style={{ display:"inline-flex",alignItems:"center",gap:"8px",padding:"14px 24px",borderRadius:"12px",border:"1px solid #e2e8f0",background:"#ffffff",color:"#334155",fontFamily:F,fontSize:"15px",fontWeight:600,textDecoration:"none" }}>
              See how it works
            </a>
          </div>
          <div style={{ animation:"fadeUp 0.45s ease 0.3s both",marginTop:"48px",display:"flex",alignItems:"center",justifyContent:"center",gap:"24px",flexWrap:"wrap" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"6px" }}>
              {[1,2,3,4,5].map(i=><Star key={i} size={14} fill="#f59e0b" color="#f59e0b"/>)}
              <span style={{ fontFamily:F,fontSize:"13px",color:"#64748b",marginLeft:"4px" }}>4.9/5 from early users</span>
            </div>
            <span style={{ color:"#cbd5e1" }}>|</span>
            <span style={{ fontFamily:FM,fontSize:"12px",color:"#64748b" }}>1,200+ simulations completed</span>
            <span style={{ color:"#cbd5e1" }}>|</span>
            <span style={{ fontFamily:FM,fontSize:"12px",color:"#64748b" }}>8 domains live</span>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ background:"#ffffff",borderTop:"1px solid #f1f5f9",borderBottom:"1px solid #f1f5f9",padding:"48px 28px" }}>
        <div style={{ maxWidth:"960px",margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"24px" }} className="lp-stats">
          {STATS.map(({ value, label })=>(
            <div key={label} data-sr style={{ textAlign:"center",...sr() }}>
              <p style={{ fontFamily:F,fontSize:"40px",fontWeight:800,color:G,lineHeight:1 }}>{value}</p>
              <p style={{ fontFamily:F,fontSize:"14px",color:"#64748b",marginTop:"6px" }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding:"96px 28px",background:"#f6faf3" }}>
        <div style={{ maxWidth:"1100px",margin:"0 auto" }}>
          <div style={{ textAlign:"center",marginBottom:"64px" }} data-sr>
            <p style={{ fontFamily:FM,fontSize:"11px",color:G,textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:"12px" }}>How it works</p>
            <h2 style={{ fontFamily:F,fontSize:"clamp(28px,4vw,42px)",fontWeight:800,color:"#0f172a",lineHeight:1.2 }}>Three steps. Real outcomes.</h2>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"32px" }} className="lp-3col">
            {HOW.map(({ n, Icon, title, body },i)=>(
              <div key={n} data-sr style={{ background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:"20px",padding:"32px",boxShadow:"0 2px 12px rgba(0,0,0,0.04)",...sr(i*80) }}>
                <div style={{ display:"flex",alignItems:"center",gap:"12px",marginBottom:"20px" }}>
                  <span style={{ fontFamily:FM,fontSize:"11px",color:G,letterSpacing:"0.08em" }}>{n}</span>
                  <div style={{ width:"40px",height:"40px",borderRadius:"12px",background:"rgba(90,127,46,0.10)",border:"1px solid rgba(90,127,46,0.2)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <Icon size={18} color={G}/>
                  </div>
                </div>
                <h3 style={{ fontFamily:F,fontSize:"18px",fontWeight:700,color:"#0f172a",marginBottom:"10px" }}>{title}</h3>
                <p style={{ fontFamily:F,fontSize:"14px",color:"#64748b",lineHeight:1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOMAINS */}
      <section id="domains" style={{ padding:"96px 28px",background:"#ffffff" }}>
        <div style={{ maxWidth:"1100px",margin:"0 auto" }}>
          <div style={{ textAlign:"center",marginBottom:"64px" }} data-sr>
            <p style={{ fontFamily:FM,fontSize:"11px",color:G,textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:"12px" }}>8 domains</p>
            <h2 style={{ fontFamily:F,fontSize:"clamp(28px,4vw,42px)",fontWeight:800,color:"#0f172a",lineHeight:1.2 }}>Pick your management track</h2>
            <p style={{ fontFamily:F,fontSize:"16px",color:"#64748b",marginTop:"14px" }}>Every domain has its own simulations, scoring, and coaching. Built by practitioners, not academics.</p>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"16px" }} className="lp-domains">
            {DOMAINS.map(({ name, Icon, color, bg, desc },i)=>(
              <div key={name} data-sr style={{ background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:"16px",padding:"24px",cursor:"pointer",transition:"all 0.2s ease",...sr(i*40) }}
                onMouseEnter={e=>{ e.currentTarget.style.boxShadow="0 8px 32px rgba(0,0,0,0.08)";e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor=color; }}
                onMouseLeave={e=>{ e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor="#e2e8f0"; }}>
                <div style={{ width:"44px",height:"44px",borderRadius:"12px",background:bg,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"14px" }}>
                  <Icon size={20} color={color}/>
                </div>
                <h3 style={{ fontFamily:F,fontSize:"14px",fontWeight:700,color:"#0f172a",marginBottom:"6px" }}>{name}</h3>
                <p style={{ fontFamily:F,fontSize:"12px",color:"#64748b",lineHeight:1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding:"96px 28px",background:"#f6faf3" }}>
        <div style={{ maxWidth:"1100px",margin:"0 auto" }}>
          <div style={{ textAlign:"center",marginBottom:"64px" }} data-sr>
            <p style={{ fontFamily:FM,fontSize:"11px",color:G,textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:"12px" }}>Why ManaGenz</p>
            <h2 style={{ fontFamily:F,fontSize:"clamp(28px,4vw,42px)",fontWeight:800,color:"#0f172a",lineHeight:1.2 }}>Built differently from the start</h2>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"20px" }} className="lp-3col">
            {FEATURES.map(({ Icon, title, body },i)=>(
              <div key={title} data-sr style={{ background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:"16px",padding:"28px",...sr(i*60) }}>
                <div style={{ width:"40px",height:"40px",borderRadius:"12px",background:"rgba(90,127,46,0.10)",border:"1px solid rgba(90,127,46,0.2)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:"16px" }}>
                  <Icon size={18} color={G}/>
                </div>
                <h3 style={{ fontFamily:F,fontSize:"16px",fontWeight:700,color:"#0f172a",marginBottom:"8px" }}>{title}</h3>
                <p style={{ fontFamily:F,fontSize:"13px",color:"#64748b",lineHeight:1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section style={{ padding:"96px 28px",background:"#ffffff" }}>
        <div style={{ maxWidth:"800px",margin:"0 auto" }}>
          <div style={{ textAlign:"center",marginBottom:"48px" }} data-sr>
            <h2 style={{ fontFamily:F,fontSize:"clamp(26px,4vw,38px)",fontWeight:800,color:"#0f172a" }}>How we compare</h2>
            <p style={{ fontFamily:F,fontSize:"15px",color:"#64748b",marginTop:"12px" }}>vs courses, textbooks, and passive content</p>
          </div>
          <div style={{ background:"#f8fafc",borderRadius:"16px",overflow:"hidden",border:"1px solid #e2e8f0" }}>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 120px 120px",background:"#f0f7ec" }} className="lp-cmp">
              {["Feature","ManaGenz","Others"].map(h=>(
                <div key={h} style={{ padding:"14px 20px",fontFamily:FM,fontSize:"11px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.1em",textAlign:h!=="Feature"?"center":"left" }}>{h}</div>
              ))}
            </div>
            {COMPARE.map(({ feature, us, them },i)=>(
              <div key={feature} style={{ display:"grid",gridTemplateColumns:"1fr 120px 120px",borderTop:"1px solid #e2e8f0",background:i%2===0?"#ffffff":"#fafafa" }} className="lp-cmp">
                <div style={{ padding:"16px 20px",fontFamily:F,fontSize:"14px",color:"#334155" }}>{feature}</div>
                <div style={{ padding:"16px 20px",display:"flex",justifyContent:"center",alignItems:"center" }}>
                  {us?<CheckCircle2 size={18} color={G}/>:<X size={18} color="#cbd5e1"/>}
                </div>
                <div style={{ padding:"16px 20px",display:"flex",justifyContent:"center",alignItems:"center" }}>
                  {them?<CheckCircle2 size={18} color="#94a3b8"/>:<X size={18} color="#cbd5e1"/>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding:"96px 28px",background:"#f6faf3" }}>
        <div style={{ maxWidth:"1100px",margin:"0 auto" }}>
          <div style={{ textAlign:"center",marginBottom:"56px" }} data-sr>
            <p style={{ fontFamily:FM,fontSize:"11px",color:G,textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:"12px" }}>Early users</p>
            <h2 style={{ fontFamily:F,fontSize:"clamp(26px,4vw,38px)",fontWeight:800,color:"#0f172a" }}>What students are saying</h2>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"20px" }} className="lp-3col">
            {TESTIMONIALS.map(({ name, role, score, quote },i)=>(
              <div key={name} data-sr style={{ background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:"16px",padding:"28px",...sr(i*80) }}>
                <div style={{ display:"flex",alignItems:"center",gap:"6px",marginBottom:"16px" }}>
                  {[1,2,3,4,5].map(i=><Star key={i} size={13} fill="#f59e0b" color="#f59e0b"/>)}
                </div>
                <p style={{ fontFamily:F,fontSize:"14px",color:"#334155",lineHeight:1.7,marginBottom:"20px",fontStyle:"italic" }}>"{quote}"</p>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <div>
                    <p style={{ fontFamily:F,fontSize:"14px",fontWeight:600,color:"#0f172a" }}>{name}</p>
                    <p style={{ fontFamily:F,fontSize:"12px",color:"#64748b",marginTop:"2px" }}>{role}</p>
                  </div>
                  <div style={{ padding:"6px 12px",borderRadius:"8px",background:"rgba(90,127,46,0.10)",border:"1px solid rgba(90,127,46,0.2)" }}>
                    <span style={{ fontFamily:FM,fontSize:"13px",color:G,fontWeight:700 }}>{score}</span>
                    <span style={{ fontFamily:FM,fontSize:"10px",color:"#64748b" }}>/100</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:"96px 28px",background:"#ffffff" }}>
        <div style={{ maxWidth:"700px",margin:"0 auto",textAlign:"center" }} data-sr>
          <h2 style={{ fontFamily:F,fontSize:"clamp(28px,5vw,48px)",fontWeight:800,color:"#0f172a",lineHeight:1.15,marginBottom:"20px" }}>
            Ready to make real management decisions?
          </h2>
          <p style={{ fontFamily:F,fontSize:"17px",color:"#475569",lineHeight:1.6,marginBottom:"36px" }}>
            First three simulations per domain are free. No credit card. Start in 2 minutes.
          </p>
          <div className="lp-cta" style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:"14px" }}>
            <Link href="/auth/signup" style={{ display:"inline-flex",alignItems:"center",gap:"8px",padding:"16px 32px",borderRadius:"12px",background:G,color:"#fff",fontFamily:F,fontSize:"16px",fontWeight:700,textDecoration:"none",boxShadow:"0 4px 24px rgba(90,127,46,0.35)" }}>
              Get started free <ArrowRight size={18}/>
            </Link>
            <Link href="/auth/login" style={{ display:"inline-flex",alignItems:"center",gap:"8px",padding:"16px 24px",borderRadius:"12px",border:"1px solid #e2e8f0",background:"#ffffff",color:"#334155",fontFamily:F,fontSize:"16px",fontWeight:600,textDecoration:"none" }}>
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background:"#f0f7ec",borderTop:"1px solid #e2e8f0",padding:"48px 28px 32px" }}>
        <div style={{ maxWidth:"1100px",margin:"0 auto" }}>
          <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:"40px",marginBottom:"40px" }} className="lp-footer">
            <div>
              <img src="/logo.png" alt="ManaGenz" style={{ height:"26px",objectFit:"contain",marginBottom:"14px" }}
                onError={(e)=>{ const t=e.target as HTMLImageElement;t.style.display="none";const s=document.createElement("span");s.textContent="ManaGenz";s.style.cssText=`font-family:${F};font-size:16px;font-weight:800;color:#0f172a;display:block;margin-bottom:14px`;t.parentElement?.insertBefore(s,t.nextSibling); }}/>
              <p style={{ fontFamily:F,fontSize:"13px",color:"#64748b",lineHeight:1.65,maxWidth:"260px" }}>
                Simulation-based management training. Build the skills placement season actually tests.
              </p>
            </div>
            {[
              { title:"Platform", links:[["Domains","/domains"],["How it works","#how"],["Pricing","/pricing"]] },
              { title:"Account",  links:[["Sign up","/auth/signup"],["Log in","/auth/login"],["Dashboard","/dashboard"]] },
              { title:"Company",  links:[["About","/about"],["Privacy","/privacy"],["Terms","/terms"]] },
            ].map(({ title, links })=>(
              <div key={title}>
                <p style={{ fontFamily:FM,fontSize:"11px",color:"#475569",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:"16px" }}>{title}</p>
                <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
                  {links.map(([label,href])=>(
                    <Link key={label} href={href} style={{ fontFamily:F,fontSize:"13px",color:"#64748b",textDecoration:"none" }}>{label}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:"1px solid #e2e8f0",paddingTop:"24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px" }}>
            <p style={{ fontFamily:F,fontSize:"12px",color:"#94a3b8" }}>© {new Date().getFullYear()} ManaGenz Academy. All rights reserved.</p>
            <p style={{ fontFamily:FM,fontSize:"11px",color:"#94a3b8" }}>Built for India's next management leaders</p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}