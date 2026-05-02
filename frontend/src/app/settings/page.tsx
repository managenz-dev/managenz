"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, Settings, Shield, Bell,
  KeyRound, LogOut, ChevronRight,
  CheckCircle2, Globe, Lock, Mail,
  Eye, EyeOff, X,
} from "lucide-react";
import AppNavbar from "@/components/layout/AppNavbar";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

const G = "#5a7f2e";

const DOMAIN_ACCENT: Record<string,{color:string;bg:string;border:string;hex:string}> = {
  "product-management":  {color:"text-violet-600",bg:"bg-violet-50",border:"border-violet-200",hex:"#7c3aed"},
  "finance":             {color:"text-emerald-600",bg:"bg-emerald-50",border:"border-emerald-200",hex:"#059669"},
  "operations":          {color:"text-amber-600",bg:"bg-amber-50",border:"border-amber-200",hex:"#d97706"},
  "human-resources":     {color:"text-pink-600",bg:"bg-pink-50",border:"border-pink-200",hex:"#db2777"},
  "strategy":            {color:"text-cyan-600",bg:"bg-cyan-50",border:"border-cyan-200",hex:"#0891b2"},
  "general-management":  {color:"text-blue-600",bg:"bg-blue-50",border:"border-blue-200",hex:"#2563eb"},
  "sales-marketing":     {color:"text-rose-600",bg:"bg-rose-50",border:"border-rose-200",hex:"#e11d48"},
  "entrepreneurship":    {color:"text-orange-600",bg:"bg-orange-50",border:"border-orange-200",hex:"#ea580c"},
};
const FALLBACK = {color:"text-indigo-600",bg:"bg-indigo-50",border:"border-indigo-200",hex:"#6366f1"};
const getAccent = (slug?:string|null) => (slug&&DOMAIN_ACCENT[slug])||FALLBACK;

function Section({icon:Icon,title,subtitle,children}:{icon:any;title:string;subtitle:string;children:React.ReactNode}){
  return(
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" style={{animation:"fadeUp 0.4s ease both"}}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:`${G}15`,border:`1px solid ${G}30`}}>
          <Icon className="w-4 h-4" style={{color:G}}/>
        </div>
        <div>
          <h2 className="font-display font-bold text-slate-900 text-sm">{title}</h2>
          <p className="font-body text-slate-500 text-xs">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Toggle({value,onChange}:{value:boolean;onChange:(v:boolean)=>void}){
  return(
    <button onClick={()=>onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
      style={{background:value?G:"#e2e8f0"}}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${value?"left-[22px]":"left-0.5"}`}/>
    </button>
  );
}

function SettingRow({icon:Icon,label,sub,right}:{icon:any;label:string;sub?:string;right:React.ReactNode}){
  return(
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="w-4 h-4 text-slate-400 flex-shrink-0"/>
        <div className="min-w-0">
          <p className="font-body text-sm text-slate-900">{label}</p>
          {sub&&<p className="font-body text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </div>
      <div className="flex-shrink-0">{right}</div>
    </div>
  );
}

export default function SettingsPage(){
  const router=useRouter();
  const {user,fetchMe,hasHydrated,logout}=useAuthStore();
  const [loading,setLoading]=useState(true);
  const [emailNotifs,setEmailNotifs]=useState(true);
  const [simReminders,setSimReminders]=useState(true);
  const [leaderAlerts,setLeaderAlerts]=useState(false);
  const [pwOpen,setPwOpen]=useState(false);
  const [curPw,setCurPw]=useState("");
  const [newPw,setNewPw]=useState("");
  const [conPw,setConPw]=useState("");
  const [showCur,setShowCur]=useState(false);
  const [showNew,setShowNew]=useState(false);
  const [showCon,setShowCon]=useState(false);
  const [pwSaving,setPwSaving]=useState(false);
  const [pwMsg,setPwMsg]=useState({text:"",ok:false});
  const [pwErr,setPwErr]=useState({cur:"",new:"",con:""});

  useEffect(()=>{
    fetchMe().then(()=>{
      const {isAuthenticated,user:u}=useAuthStore.getState();
      if(!u||!isAuthenticated){router.replace("/auth/login");return;}
      setLoading(false);
    });
  },[]);

  const handleChangePassword=async()=>{
    const errs={cur:"",new:"",con:""};let hasErr=false;
    if(!curPw){errs.cur="Current password is required";hasErr=true;}
    if(!newPw||newPw.length<6){errs.new="New password must be at least 6 characters";hasErr=true;}
    if(newPw!==conPw){errs.con="Passwords do not match";hasErr=true;}
    if(curPw===newPw&&newPw){errs.new="New password must be different from current";hasErr=true;}
    setPwErr(errs);if(hasErr)return;
    setPwSaving(true);
    try{
      await api.patch("/users/change-password",{currentPassword:curPw,newPassword:newPw});
      setPwMsg({text:"Password changed successfully!",ok:true});
      setCurPw("");setNewPw("");setConPw("");
      setTimeout(()=>setPwOpen(false),1500);
    }catch(err:any){setPwMsg({text:err?.response?.data?.message||"Failed to change password",ok:false});}
    finally{setPwSaving(false);}
  };

  const domainSlug=user?.selectedDomain?(typeof user.selectedDomain==="string"?user.selectedDomain:(user.selectedDomain as any)?.slug||""):"";
  const accent=getAccent(domainSlug);

  const pwStrength=(pw:string)=>{if(!pw)return 0;if(pw.length<6)return 1;if(pw.length<9)return 2;if(pw.length<12)return 3;return 4;};
  const strength=pwStrength(newPw);
  const strengthLabel=["","Too short","Weak","Good","Strong"];
  const strengthColor=["","bg-rose-500","bg-amber-500","bg-blue-500","bg-emerald-500"];

  const inp=(err?:string)=>`w-full bg-white border ${err?"border-rose-300":"border-slate-200"} rounded-xl pl-9 pr-9 py-2.5 text-sm font-body text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 ${err?"focus:border-rose-400 focus:ring-rose-100":"focus:border-slate-400 focus:ring-slate-100"} transition-all`;

  if(!hasHydrated||!user||loading)return(
    <div className="min-h-screen bg-[#f6faf3] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin" style={{color:G}}/>
    </div>
  );

  return(
    <>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div className="min-h-screen bg-[#f6faf3] text-slate-900">
      <AppNavbar/>
      <main className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 lg:pt-28 pb-16">

        <div className="mb-8" style={{animation:"fadeUp 0.4s ease"}}>
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-slate-400"/>
            <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">Settings</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 mb-1">Account Settings</h1>
          <p className="font-body text-slate-500 text-sm">Manage your preferences and account details</p>
        </div>

        <div className="space-y-4">

          {/* Account */}
          <Section icon={Globe} title="Account" subtitle="Your account information">
            <SettingRow icon={Mail} label="Email" sub={user?.email}
              right={<span className="font-mono text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Verified</span>}/>
            <SettingRow icon={Globe} label="Domain" sub={domainSlug||"Not selected"}
              right={<span className={`font-mono text-xs px-2 py-1 rounded-full ${accent.bg} ${accent.color} border ${accent.border}`}>
                {domainSlug?domainSlug.replace(/-/g," ").replace(/\b\w/g,(c:string)=>c.toUpperCase()):"—"}
              </span>}/>
            <SettingRow icon={Settings} label="Profile" sub="Edit name, bio, and username"
              right={<Link href="/profile" className="flex items-center gap-1 font-body text-xs text-slate-500 hover:text-slate-900 transition-colors">
                Edit <ChevronRight className="w-3 h-3"/>
              </Link>}/>
          </Section>

          {/* Security */}
          <Section icon={Shield} title="Security" subtitle="Password and account security">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4 text-slate-400 flex-shrink-0"/>
                <div>
                  <p className="font-body text-sm text-slate-900">Password</p>
                  <p className="font-body text-xs text-slate-500 mt-0.5">Change or reset your password</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/auth/forgot-password" className="font-body text-xs text-slate-500 hover:text-slate-900 transition-colors">Forgot?</Link>
                <button onClick={()=>{setPwOpen(o=>!o);setPwErr({cur:"",new:"",con:""});setPwMsg({text:"",ok:false});}}
                  className="font-body text-xs flex items-center gap-1 transition-colors" style={{color:G}}>
                  {pwOpen?"Cancel":"Change"} <ChevronRight className="w-3 h-3"/>
                </button>
              </div>
            </div>

            {pwOpen&&(
              <div className="mt-4 space-y-3 pt-1">
                {pwMsg.text&&(
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-body ${pwMsg.ok?"bg-emerald-50 border border-emerald-200 text-emerald-700":"bg-rose-50 border border-rose-200 text-rose-700"}`}>
                    {pwMsg.ok?<CheckCircle2 className="w-3.5 h-3.5"/>:<X className="w-3.5 h-3.5"/>}
                    {pwMsg.text}
                  </div>
                )}
                {/* Current password */}
                <div>
                  <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"/>
                    <input type={showCur?"text":"password"} value={curPw}
                      onChange={e=>{setCurPw(e.target.value);setPwErr(er=>({...er,cur:""}));}}
                      placeholder="Enter current password" className={inp(pwErr.cur)}/>
                    <button type="button" onClick={()=>setShowCur(s=>!s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showCur?<EyeOff className="w-3.5 h-3.5"/>:<Eye className="w-3.5 h-3.5"/>}
                    </button>
                  </div>
                  {pwErr.cur&&<p className="font-body text-xs text-rose-500 mt-1">{pwErr.cur}</p>}
                </div>
                {/* New password */}
                <div>
                  <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"/>
                    <input type={showNew?"text":"password"} value={newPw}
                      onChange={e=>{setNewPw(e.target.value);setPwErr(er=>({...er,new:""}));}}
                      placeholder="Min. 6 characters" className={inp(pwErr.new)}/>
                    <button type="button" onClick={()=>setShowNew(s=>!s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showNew?<EyeOff className="w-3.5 h-3.5"/>:<Eye className="w-3.5 h-3.5"/>}
                    </button>
                  </div>
                  {newPw&&(<div className="mt-1.5 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">{[1,2,3,4].map(i=><div key={i} className={`h-1 flex-1 rounded-full transition-all ${strength>=i?strengthColor[strength]:"bg-slate-200"}`}/>)}</div>
                    <span className="font-mono text-[10px] text-slate-400">{strengthLabel[strength]}</span>
                  </div>)}
                  {pwErr.new&&<p className="font-body text-xs text-rose-500 mt-1">{pwErr.new}</p>}
                </div>
                {/* Confirm password */}
                <div>
                  <label className="block font-mono text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"/>
                    <input type={showCon?"text":"password"} value={conPw}
                      onChange={e=>{setConPw(e.target.value);setPwErr(er=>({...er,con:""}));}}
                      onKeyDown={e=>e.key==="Enter"&&handleChangePassword()}
                      placeholder="Repeat new password"
                      className={inp(pwErr.con||(conPw&&newPw===conPw?"":"no-err"))}/>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {conPw&&newPw===conPw&&<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/>}
                      <button type="button" onClick={()=>setShowCon(s=>!s)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        {showCon?<EyeOff className="w-3.5 h-3.5"/>:<Eye className="w-3.5 h-3.5"/>}
                      </button>
                    </div>
                  </div>
                  {pwErr.con&&<p className="font-body text-xs text-rose-500 mt-1">{pwErr.con}</p>}
                </div>
                <button onClick={handleChangePassword} disabled={pwSaving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-body text-sm font-medium transition-all disabled:opacity-60"
                  style={{background:G}}>
                  {pwSaving?<><Loader2 className="w-4 h-4 animate-spin"/>Saving…</>:"Save New Password"}
                </button>
                <p className="text-center font-body text-xs text-slate-400">
                  Can't remember it?{" "}
                  <Link href="/auth/forgot-password" className="hover:text-slate-700 transition-colors" style={{color:G}}>Reset via email</Link>
                </p>
              </div>
            )}
          </Section>

          {/* Notifications */}
          <Section icon={Bell} title="Notifications" subtitle="Control what emails you receive">
            <SettingRow icon={Mail} label="Email Notifications" sub="Receive important account updates" right={<Toggle value={emailNotifs} onChange={setEmailNotifs}/>}/>
            <SettingRow icon={Bell} label="Simulation Reminders" sub="Weekly nudges to keep practising" right={<Toggle value={simReminders} onChange={setSimReminders}/>}/>
            <SettingRow icon={Bell} label="Leaderboard Alerts" sub="Get notified when your rank changes" right={<Toggle value={leaderAlerts} onChange={setLeaderAlerts}/>}/>
            <p className="font-body text-[10px] text-slate-400 mt-3">Notification preferences are saved locally. Full settings coming soon.</p>
          </Section>

          {/* Quick Links */}
          <Section icon={ChevronRight} title="Quick Links" subtitle="Navigate to other sections">
            {[
              {href:"/dashboard",label:"Dashboard",sub:"View your simulations"},
              {href:"/profile",label:"Profile",sub:"Edit your profile details"},
              {href:"/leaderboard",label:"Leaderboard",sub:"See domain rankings"},
              {href:"/analytics",label:"Analytics",sub:"Your performance charts"},
            ].map(({href,label,sub})=>(
              <Link key={href} href={href}
                className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-5 px-5 transition-all group">
                <div>
                  <p className="font-body text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{label}</p>
                  <p className="font-body text-xs text-slate-400">{sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0"/>
              </Link>
            ))}
          </Section>

          {/* Danger zone */}
          <div className="bg-rose-50 border border-rose-200 rounded-2xl overflow-hidden" style={{animation:"fadeUp 0.4s ease both"}}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-rose-100">
              <div className="w-8 h-8 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center">
                <Shield className="w-4 h-4 text-rose-500"/>
              </div>
              <div>
                <h2 className="font-display font-bold text-slate-900 text-sm">Danger Zone</h2>
                <p className="font-body text-slate-500 text-xs">Irreversible actions</p>
              </div>
            </div>
            <div className="p-5">
              <button onClick={()=>logout()}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 transition-all group">
                <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors"/>
                <div className="text-left">
                  <p className="font-body text-sm text-slate-700 group-hover:text-rose-600 transition-colors">Log Out</p>
                  <p className="font-body text-xs text-slate-400">Sign out of your account</p>
                </div>
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
    </>
  );
}