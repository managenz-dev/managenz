"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Shield, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const G = "#5a7f2e";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) { toast.error("Email and password required"); return; }
    setLoading(true);
    try {
      await api.post("/admin/login", { email: email.trim(), password });
      toast.success("Welcome back");
      router.push("/admin");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Invalid credentials");
      setLoading(false);
    }
  };

  const inp = "w-full bg-white border border-slate-200 rounded-xl py-3 pl-4 pr-4 font-body text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all";

  return (
    <>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div className="min-h-screen bg-[#f6faf3] flex items-center justify-center p-4">
      {/* Subtle glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full blur-[120px]"
          style={{ background:"rgba(90,127,46,0.06)" }}/>
      </div>

      <div className="relative z-10 w-full max-w-sm" style={{ animation:"fadeUp 0.5s ease" }}>

        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ background:`${G}15`, border:`1px solid ${G}30` }}>
            <Shield className="w-7 h-7" style={{ color:G }}/>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-2xl text-slate-900 mb-1">Admin Access</h1>
          <p className="font-body text-sm text-slate-500">ManaGenz management panel</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div>
            <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block mb-2">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              placeholder="admin@managenz.com" className={inp}/>
          </div>

          <div>
            <label className="font-mono text-[10px] text-slate-400 uppercase tracking-wider block mb-2">Password</label>
            <div className="relative">
              <input type={showPass?"text":"password"} value={password}
                onChange={e=>setPassword(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                placeholder="Your password" className={`${inp} pr-11`}/>
              <button type="button" onClick={()=>setShowPass(v=>!v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPass?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
              </button>
            </div>
          </div>

          <button onClick={handleLogin} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-body font-semibold text-sm transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed group mt-2"
            style={{ background:G }}>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin"/>Signing in…</>
              : <>Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"/></>
            }
          </button>
        </div>
      </div>
    </div>
    </>
  );
}