// frontend/src/app/select-domain/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, ChevronRight, Brain, BarChart3, Users, Target,
  Briefcase, Zap, TrendingUp, Package, Building2,
  CheckCircle2, ArrowRight, Sparkles, Lock,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";
import api from "@/lib/api";
import { toast } from "sonner";

const G  = "#5a7f2e";
const GH = "#4d6e26";
const GL = "rgba(90,127,46,0.10)";
const GB = "rgba(90,127,46,0.22)";
const F  = "'Inter','Segoe UI',sans-serif";
const FM = "'JetBrains Mono','Fira Code','Courier New',monospace";

const DOMAIN_META: Record<string,{icon:any;color:string;bg:string;border:string;glow:string;tagline:string;skills:string[];}> = {
  "product-management": { icon:Package,    color:"#818cf8", bg:"rgba(129,140,248,0.12)", border:"rgba(129,140,248,0.30)", glow:"rgba(129,140,248,0.08)", tagline:"Build products users love",         skills:["Roadmapping","User Research","Prioritization","Launch Strategy"] },
  "finance":            { icon:BarChart3,  color:"#10b981", bg:"rgba(16,185,129,0.12)",  border:"rgba(16,185,129,0.30)",  glow:"rgba(16,185,129,0.08)",  tagline:"Master financial decisions",        skills:["Budgeting","Risk Management","Investment Strategy","Cost Control"] },
  "operations":         { icon:Zap,        color:"#f59e0b", bg:"rgba(245,158,11,0.12)",  border:"rgba(245,158,11,0.30)",  glow:"rgba(245,158,11,0.08)",  tagline:"Optimise processes at scale",       skills:["Process Design","Supply Chain","Quality Control","Efficiency"] },
  "human-resources":    { icon:Users,      color:"#ec4899", bg:"rgba(236,72,153,0.12)",  border:"rgba(236,72,153,0.30)",  glow:"rgba(236,72,153,0.08)",  tagline:"Lead and develop your people",     skills:["Talent Acquisition","Culture","Performance","Conflict Resolution"] },
  "strategy":           { icon:Target,     color:"#06b6d4", bg:"rgba(6,182,212,0.12)",   border:"rgba(6,182,212,0.30)",   glow:"rgba(6,182,212,0.08)",   tagline:"Navigate competitive landscapes",  skills:["Market Analysis","Growth Strategy","Competitive Intel","M&A"] },
  "general-management": { icon:Building2,  color:"#3b82f6", bg:"rgba(59,130,246,0.12)",  border:"rgba(59,130,246,0.30)",  glow:"rgba(59,130,246,0.08)",  tagline:"Lead cross-functional teams",      skills:["P&L Ownership","Stakeholder Mgmt","Team Building","Execution"] },
  "sales-marketing":    { icon:TrendingUp, color:"#f43f5e", bg:"rgba(244,63,94,0.12)",   border:"rgba(244,63,94,0.30)",   glow:"rgba(244,63,94,0.08)",   tagline:"Drive growth and revenue",         skills:["GTM Strategy","Brand Building","Pipeline Mgmt","Analytics"] },
  "entrepreneurship":   { icon:Sparkles,   color:"#f97316", bg:"rgba(249,115,22,0.12)",  border:"rgba(249,115,22,0.30)",  glow:"rgba(249,115,22,0.08)",  tagline:"Build something from nothing",     skills:["Ideation","Fundraising","MVP Building","Pivot Strategy"] },
};

const FALLBACK = { icon:Briefcase, color:"#6366f1", bg:"rgba(99,102,241,0.12)", border:"rgba(99,102,241,0.30)", glow:"rgba(99,102,241,0.08)", tagline:"Sharpen your management skills", skills:[] };

export default function SelectDomainPage() {
  const router = useRouter();
  const { fetchMe, selectDomain } = useAuthStore();
  const { isDark } = useThemeStore();

  const [mounted,  setMounted]  = useState(false);
  const [domains,  setDomains]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<string|null>(null);
  const [saving,   setSaving]   = useState(false);
  const [hovered,  setHovered]  = useState<string|null>(null);

  useEffect(() => { setMounted(true); }, []);
  const dark = mounted ? isDark : false;

  const bg      = dark ? "#060d02" : "#f6faf3";
  const card    = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const border  = dark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const text    = dark ? "#f1f5f9" : "#0f172a";
  const muted   = dark ? "rgba(255,255,255,0.40)" : "#64748b";
  const faint   = dark ? "rgba(255,255,255,0.25)" : "#94a3b8";
  const cardHov = dark ? "rgba(255,255,255,0.06)" : "rgba(90,127,46,0.04)";

  // ✅ Robust auth check with proper delays
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Wait for cookie to be fully set after verification redirect
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch user data
        await fetchMe();
        
        // Wait for store to update
        await new Promise(resolve => setTimeout(resolve, 150));
        
        const state = useAuthStore.getState();
        const u = state.user;
        const auth = state.isAuthenticated;
        
        // Redirect if not authenticated
        if (!auth || !u) {
          router.replace("/auth/login");
          return;
        }
        
        // Redirect if domain already selected
        if (u.selectedDomain) {
          router.replace("/dashboard");
          return;
        }
        
      } catch (err) {
        router.replace("/auth/login");
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // ✅ Load domains list
  useEffect(() => {
    api.get("/domains")
      .then(res => {
        const raw = res.data.data;
        setDomains(Array.isArray(raw) ? raw : (raw?.domains || raw?.useCases || []));
      })
      .catch(() => toast.error("Could not load domains"))
      .finally(() => setLoading(false));
  }, []);

  // ✅ Handle domain selection confirmation
  const handleConfirm = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      await selectDomain(selected);
      toast.success("Domain selected! Taking you to your dashboard...");
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save domain");
      setSaving(false);
    }
  };

  const selMeta = selected ? (DOMAIN_META[selected] || FALLBACK) : null;
  const selObj  = domains.find(d => d.slug === selected);

  // ✅ Loading state
  if (loading) return (
    <>
    <style suppressHydrationWarning>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    <div style={{ minHeight:"100vh", background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F }}>
      <div style={{ textAlign:"center" }}>
        <Loader2 style={{ width:"32px", height:"32px", color:G, animation:"spin 1s linear infinite", margin:"0 auto 12px", display:"block" }}/>
        <p style={{ fontFamily:FM, fontSize:"12px", color:muted }}>Loading domains...</p>
      </div>
    </div>
    </>
  );

  return (
    <>
    <style suppressHydrationWarning>{`
      @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
      @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      * { box-sizing: border-box; margin: 0; padding: 0; }
    `}</style>

    <div style={{ minHeight:"100vh", background:bg, color:text, fontFamily:F, overflow:"hidden", transition:"background 0.25s ease" }}>

      {/* Fixed glows */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:0, left:"33%", width:"600px", height:"600px", background:"rgba(90,127,46,0.05)", borderRadius:"50%", filter:"blur(150px)" }}/>
        <div style={{ position:"absolute", bottom:0, right:"33%", width:"500px", height:"500px", background:"rgba(90,127,46,0.04)", borderRadius:"50%", filter:"blur(120px)" }}/>
        {selected && selMeta && (
          <div style={{ position:"absolute", inset:0, opacity:0.3, transition:"all 1s ease", background:`radial-gradient(ellipse at 50% 40%, ${selMeta.glow} 0%, transparent 70%)` }}/>
        )}
      </div>

      <main style={{ position:"relative", zIndex:1, maxWidth:"1280px", margin:"0 auto", padding:"48px 24px" }}>

        {/* Header */}
        {/* ✅ Added display:flex, flexDirection:column, alignItems:center to guarantee perfect centering */}
        <div style={{ textAlign:"center", marginBottom:"48px", animation:"fadeUp 0.5s ease", display:"flex", flexDirection:"column", alignItems:"center" }}>
          <Link href="/" style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"20px", textDecoration:"none" }}>
            {/* ✅ Simple, reliable logo with text fallback */}
            <img
              src="/logo.png"
              alt="ManaGenz"
              style={{ height: "32px", objectFit: "contain" }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<span style="font-family:${F};font-size:20px;font-weight:800;color:${G}">ManaGenz</span>`;
                }
              }}
            />
          </Link>

          <div style={{ display:"inline-flex", alignItems:"center", gap:"7px", padding:"6px 14px", borderRadius:"100px", background:GL, border:`1px solid ${GB}`, marginBottom:"16px" }}>
            <Brain style={{ width:"13px", height:"13px", color:G }}/>
            <span style={{ fontFamily:FM, fontSize:"10px", color:G, textTransform:"uppercase", letterSpacing:"0.14em" }}>Step 2 of 2</span>
          </div>

          <h1 style={{ fontFamily:F, fontWeight:800, fontSize:"clamp(28px,5vw,48px)", color:text, marginBottom:"12px", letterSpacing:"-1px", lineHeight:1.1 }}>
            Choose Your Domain
          </h1>
          <p style={{ fontFamily:F, fontSize:"15px", color:muted, maxWidth:"480px", margin:"0 auto 16px", lineHeight:1.7 }}>
            Pick the management area you want to master. You will only see simulations from this domain.
          </p>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"7px", padding:"8px 14px", borderRadius:"12px", background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.20)" }}>
            <Lock style={{ width:"13px", height:"13px", color:"#f59e0b", flexShrink:0 }}/>
            <p style={{ fontFamily:FM, fontSize:"10px", color:"#d97706", margin:0 }}>Choose carefully — this cannot be changed later</p>
          </div>
        </div>

        {/* Domain grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"14px", marginBottom:"32px" }}>
          {domains.map((domain, idx) => {
            const meta  = DOMAIN_META[domain.slug] || FALLBACK;
            const Icon  = meta.icon;
            const isSel = selected === domain.slug;
            const isHov = hovered === domain.slug && !isSel;
            const cnt   = domain._count?.useCases ?? domain.useCaseCount ?? domain.totalSimulations ?? 0;
            return (
              <button key={domain.id}
                onClick={() => setSelected(domain.slug)}
                onMouseEnter={() => setHovered(domain.slug)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position:"relative", textAlign:"left", borderRadius:"18px", padding:"22px",
                  border:`1px solid ${isSel ? meta.border : isHov ? "rgba(255,255,255,0.14)" : border}`,
                  background: isSel ? meta.bg : isHov ? cardHov : card,
                  boxShadow: isSel ? `0 8px 32px ${meta.glow}` : "none",
                  transition:"all 0.2s", cursor:"pointer", overflow:"hidden",
                  animation:`fadeUp 0.4s ease ${idx*45}ms both`,
                }}>
                {isSel && (
                  <div style={{ position:"absolute", top:"14px", right:"14px" }}>
                    <CheckCircle2 style={{ width:"18px", height:"18px", color:meta.color }}/>
                  </div>
                )}
                <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:meta.bg, border:`1px solid ${meta.border}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"14px" }}>
                  <Icon style={{ width:"22px", height:"22px", color:meta.color }}/>
                </div>
                <h3 style={{ fontFamily:F, fontWeight:700, fontSize:"15px", color:text, marginBottom:"4px", lineHeight:1.3 }}>{domain.name}</h3>
                <p style={{ fontFamily:FM, fontSize:"10px", color:isSel?meta.color:faint, marginBottom:"12px", textTransform:"uppercase", letterSpacing:"0.08em" }}>{meta.tagline}</p>
                <div style={{ display:"inline-flex", alignItems:"center", gap:"5px", padding:"4px 10px", borderRadius:"100px", background:isSel?meta.bg:"rgba(255,255,255,0.05)", border:`1px solid ${isSel?meta.border:border}`, marginBottom:"12px" }}>
                  <Brain style={{ width:"11px", height:"11px", color:isSel?meta.color:faint }}/>
                  <span style={{ fontFamily:FM, fontSize:"10px", fontWeight:700, color:isSel?meta.color:muted }}>{cnt}</span>
                  <span style={{ fontFamily:FM, fontSize:"10px", color:faint }}>{cnt===1?"sim":"sims"}</span>
                </div>
                {meta.skills.length > 0 && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"5px" }}>
                    {meta.skills.slice(0,3).map(skill => (
                      <span key={skill} style={{ fontFamily:FM, fontSize:"9px", padding:"3px 8px", borderRadius:"100px", background:isSel?meta.bg:"rgba(255,255,255,0.04)", border:`1px solid ${isSel?meta.border:border}`, color:isSel?meta.color:faint }}>{skill}</span>
                    ))}
                    {meta.skills.length > 3 && <span style={{ fontFamily:FM, fontSize:"9px", color:faint, padding:"3px 4px" }}>+{meta.skills.length-3}</span>}
                  </div>
                )}
                <div style={{ position:"absolute", bottom:"16px", right:"16px", opacity:isSel?1:isHov?0.4:0, transition:"opacity 0.2s" }}>
                  <ChevronRight style={{ width:"14px", height:"14px", color:isSel?meta.color:muted }}/>
                </div>
              </button>
            );
          })}
        </div>

        {/* Confirm panel */}
        <div style={{ maxWidth:"520px", margin:"0 auto", animation:"fadeUp 0.5s ease 0.3s both" }}>
          {selected && selObj && selMeta ? (
            <div style={{ borderRadius:"16px", padding:"18px 20px", border:`1px solid ${selMeta.border}`, background:selMeta.bg, marginBottom:"12px", display:"flex", alignItems:"center", gap:"14px", animation:"slideUp 0.3s ease" }}>
              {(() => { const I = selMeta.icon; return (
                <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:selMeta.bg, border:`1px solid ${selMeta.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <I style={{ width:"22px", height:"22px", color:selMeta.color }}/>
                </div>
              ); })()}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontFamily:FM, fontSize:"9px", color:faint, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"2px" }}>You selected</p>
                <h3 style={{ fontFamily:F, fontWeight:700, fontSize:"16px", color:text, marginBottom:"2px" }}>{selObj.name}</h3>
                <p style={{ fontFamily:FM, fontSize:"10px", color:selMeta.color }}>{selMeta.tagline}</p>
              </div>
              <CheckCircle2 style={{ width:"22px", height:"22px", color:selMeta.color, flexShrink:0 }}/>
            </div>
          ) : (
            <div style={{ borderRadius:"16px", padding:"16px", border:`1px solid ${border}`, background:card, marginBottom:"12px", textAlign:"center" }}>
              <p style={{ fontFamily:F, fontSize:"13px", color:faint }}>Select a domain above to continue</p>
            </div>
          )}

          <button onClick={handleConfirm} disabled={!selected || saving}
            style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", padding:"15px", borderRadius:"14px", border:"none", cursor:(!selected||saving)?"not-allowed":"pointer", background:G, color:"#fff", fontFamily:F, fontSize:"15px", fontWeight:600, boxShadow:"0 6px 20px rgba(90,127,46,0.30)", transition:"all 0.2s", opacity:(!selected||saving)?0.45:1 }}
            onMouseEnter={e => { if(selected&&!saving)(e.currentTarget as HTMLElement).style.background=GH; }}
            onMouseLeave={e => { if(selected&&!saving)(e.currentTarget as HTMLElement).style.background=G; }}>
            {saving
              ? <><Loader2 style={{ width:"18px", height:"18px", animation:"spin 1s linear infinite" }}/> Setting up your dashboard...</>
              : <>Confirm &amp; Start Learning <ArrowRight style={{ width:"18px", height:"18px" }}/></>
            }
          </button>

          <p style={{ textAlign:"center", fontFamily:FM, fontSize:"10px", color:faint, marginTop:"12px" }}>
            You can only attempt each simulation once · Domain cannot be changed
          </p>
        </div>
      </main>
    </div>
    </>
  );
}