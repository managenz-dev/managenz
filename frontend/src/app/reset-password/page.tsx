"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft, X, ShieldCheck } from "lucide-react";
import api from "@/lib/api";

const inputCls = (error?: string) =>
  `w-full bg-white dark:bg-white/[0.05] border rounded-xl pl-10 pr-10 py-3 text-sm font-body text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-1 transition-all ${error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : "border-slate-200 dark:border-white/[0.1] focus:border-[#7c6cfc]/60 focus:ring-[#7c6cfc]/20"}`;

const LABEL = "block font-mono text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider mb-2";
const ICON  = "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30 pointer-events-none";
const EYE   = "absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/60 transition-colors";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPw,  setNewPw]  = useState("");
  const [conPw,  setConPw]  = useState("");
  const [showNw, setShowNw] = useState(false);
  const [showCn, setShowCn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors,  setErrors]  = useState({ new: "", con: "", general: "" });

  useEffect(() => { if (!token || !email) router.replace("/auth/forgot-password"); }, []);

  const getStr = (pw: string) => { if (!pw) return 0; if (pw.length < 6) return 1; if (pw.length < 9) return 2; if (pw.length < 12) return 3; return 4; };
  const STR_LABEL = ["", "Too short", "Weak", "Good", "Strong"];
  const STR_COLOR = ["", "bg-rose-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];
  const str = getStr(newPw);

  const submit = async () => {
    const e = { new: "", con: "", general: "" };
    let bad = false;
    if (!newPw || newPw.length < 6) { e.new = "Password must be at least 6 characters"; bad = true; }
    if (newPw !== conPw)             { e.con = "Passwords do not match"; bad = true; }
    setErrors(e);
    if (bad) return;
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, token, newPassword: newPw });
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 3000);
    } catch (err: any) {
      setErrors(p => ({ ...p, general: err?.response?.data?.message || "Something went wrong." }));
    } finally { setLoading(false); }
  };

  if (!token || !email) return null;

  return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#7c6cfc]/8 rounded-full blur-[120px]"/>
      </div>
      <div className="relative z-10 w-full max-w-md" style={{ animation: "fadeUp 0.5s ease" }}>

        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 border ${success ? "bg-emerald-500/15 border-emerald-500/30" : "bg-[#7c6cfc]/15 border-[#7c6cfc]/30"}`}>
            {success ? <CheckCircle2 className="w-7 h-7 text-emerald-500"/> : <ShieldCheck className="w-7 h-7 text-[#7c6cfc]"/>}
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-white mb-1">
            {success ? "Password reset!" : "Set new password"}
          </h1>
          <p className="font-body text-slate-500 dark:text-white/40 text-sm">
            {success ? "Your password has been changed successfully" : `Resetting password for ${email}`}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] rounded-2xl p-6 sm:p-8 shadow-sm">
          {success ? (
            <div className="text-center py-2 space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4">
                <p className="font-body text-sm text-emerald-700 dark:text-emerald-400 font-medium">Password changed successfully!</p>
                <p className="font-body text-xs text-slate-500 dark:text-white/35 mt-1">Redirecting you to login in a moment…</p>
              </div>
              <Link href="/auth/login" className="inline-flex items-center gap-2 w-full justify-center py-3 rounded-xl bg-[#7c6cfc] hover:bg-[#6a5cf0] text-white font-body font-medium text-sm transition-all">
                <ArrowLeft className="w-4 h-4"/> Go to Login
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {errors.general && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                  <X className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5"/>
                  <p className="font-body text-sm text-rose-600 dark:text-rose-400">{errors.general}</p>
                </div>
              )}

              {/* New password field */}
              <div>
                <label className={LABEL}>New Password</label>
                <div className="relative">
                  <Lock className={ICON}/>
                  <input type={showNw ? "text" : "password"} value={newPw}
                    onChange={e => { setNewPw(e.target.value); setErrors(p => ({ ...p, new: "" })); }}
                    placeholder="Min. 6 characters" className={inputCls(errors.new)}/>
                  <button type="button" onClick={() => setShowNw(s => !s)} className={EYE}>
                    {showNw ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
                {errors.new && <p className="font-body text-xs text-rose-500 mt-1.5 flex items-center gap-1"><X className="w-3 h-3"/>{errors.new}</p>}
                {newPw.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${str >= i ? STR_COLOR[str] : "bg-slate-200 dark:bg-white/10"}`}/>)}
                    </div>
                    <p className="font-mono text-[10px] text-slate-500 dark:text-white/30">{STR_LABEL[str]}</p>
                  </div>
                )}
              </div>

              {/* Confirm password field */}
              <div>
                <label className={LABEL}>Confirm New Password</label>
                <div className="relative">
                  <Lock className={ICON}/>
                  <input type={showCn ? "text" : "password"} value={conPw}
                    onChange={e => { setConPw(e.target.value); setErrors(p => ({ ...p, con: "" })); }}
                    onKeyDown={e => e.key === "Enter" && submit()}
                    placeholder="Repeat your new password" className={inputCls(errors.con)}/>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {conPw && newPw === conPw && <CheckCircle2 className="w-4 h-4 text-emerald-500"/>}
                    <button type="button" onClick={() => setShowCn(s => !s)} className="text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/60 transition-colors">
                      {showCn ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
                {errors.con && <p className="font-body text-xs text-rose-500 mt-1.5 flex items-center gap-1"><X className="w-3 h-3"/>{errors.con}</p>}
              </div>

              {/* Submit */}
              <button onClick={submit} disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#7c6cfc] hover:bg-[#6a5cf0] text-white font-body font-medium text-sm transition-all disabled:opacity-60 mt-2 shadow-lg shadow-[#7c6cfc]/20">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin"/>Resetting…</> : <><ShieldCheck className="w-4 h-4"/>Reset Password</>}
              </button>

              <div className="text-center pt-1">
                <Link href="/auth/login" className="inline-flex items-center gap-1.5 font-body text-sm text-slate-500 dark:text-white/30 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5"/> Back to login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <style jsx global>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center"><Loader2 className="w-8 h-8 text-[#7c6cfc] animate-spin"/></div>}>
      <ResetPasswordForm/>
    </Suspense>
  );
}