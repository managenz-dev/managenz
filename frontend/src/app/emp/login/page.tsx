"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, Loader2, ArrowRight, Lock, Mail } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const G = "#5a7f2e";

export default function EmpLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { toast.error("Email and password required"); return; }
    setLoading(true);
    try {
      await api.post("/emp/login", { email, password });
      toast.success("Logged in");
      router.push("/emp");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Invalid credentials");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: `${G}15`, border: `2px solid ${G}30` }}>
            <Shield className="w-6 h-6" style={{ color: G }}/>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ManaGenz Studio</h1>
          <p className="text-sm text-slate-500 mt-1">Admin & Content Developer Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="you@managenz.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent bg-white placeholder:text-slate-400"
                style={{ "--tw-ring-color": G } as any}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
              <input
                type={showPass ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="Your password"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent bg-white placeholder:text-slate-400"
              />
              <button onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button onClick={handleLogin} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: G }}>
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin"/> Signing in…</>
              : <>Sign In <ArrowRight className="w-4 h-4"/></>
            }
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Internal portal — authorised personnel only
        </p>
      </div>
    </div>
  );
}