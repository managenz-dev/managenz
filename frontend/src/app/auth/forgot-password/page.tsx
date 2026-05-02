"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, CheckCircle2, Send } from "lucide-react";
import api from "@/lib/api";

const LABEL = "block font-mono text-xs text-slate-500 dark:text-white/40 uppercase tracking-wider mb-2";
const ICON  = "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30 pointer-events-none";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email.trim()) { setError("Please enter your email address"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Please enter a valid email address"); return; }
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
    } catch { /* show success anyway to prevent email enumeration */ }
    finally { setLoading(false); setSent(true); }
  };

  return (
    <>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
    <div
      className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#7c6cfc]/8 rounded-full blur-[120px]"/>
      </div>

      <div className="relative z-10 w-full max-w-md" style={{ animation: "fadeUp 0.5s ease" }}>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#7c6cfc]/15 border border-[#7c6cfc]/30 mb-4">
            <Mail className="w-7 h-7 text-[#7c6cfc]"/>
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-white mb-1">
            {sent ? "Check your email" : "Forgot password?"}
          </h1>
          <p className="font-body text-slate-500 dark:text-white/40 text-sm">
            {sent ? `We sent a reset link to ${email}` : "No worries — we'll send you a reset link"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] rounded-2xl p-6 sm:p-8 shadow-sm">
          {!sent ? (
            <>
              <div className="mb-5">
                <label className={LABEL}>Email Address</label>
                <div className="relative">
                  <Mail className={ICON}/>
                  <input type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    placeholder="you@example.com" autoFocus
                    className={`w-full bg-white dark:bg-white/[0.05] border rounded-xl pl-10 pr-4 py-3 text-sm font-body text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-1 transition-all ${error ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20" : "border-slate-200 dark:border-white/[0.1] focus:border-[#7c6cfc]/60 focus:ring-[#7c6cfc]/20"}`}
                  />
                </div>
                {error && <p className="font-body text-xs text-rose-500 mt-1.5">{error}</p>}
              </div>

              <button onClick={handleSubmit} disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#7c6cfc] hover:bg-[#6a5cf0] text-white font-body font-medium text-sm transition-all disabled:opacity-60 mb-4 shadow-lg shadow-[#7c6cfc]/20">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin"/>Sending…</> : <><Send className="w-4 h-4"/>Send Reset Link</>}
              </button>

              <div className="text-center">
                <Link href="/auth/login" className="inline-flex items-center gap-1.5 font-body text-sm text-slate-500 dark:text-white/30 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5"/> Back to login
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500"/>
              </div>

              <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] rounded-xl p-4 mb-5 text-left space-y-2">
                {["Open your email inbox", "Click the Reset My Password button", "Choose a new password", "Link expires in 15 minutes"].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#7c6cfc]/15 border border-[#7c6cfc]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="font-mono text-[10px] text-[#7c6cfc] font-bold">{i + 1}</span>
                    </div>
                    <p className="font-body text-sm text-slate-600 dark:text-white/50">{step}</p>
                  </div>
                ))}
              </div>

              <p className="font-body text-xs text-slate-400 dark:text-white/25 mb-5">
                Didn&apos;t receive it? Check your spam folder or{" "}
                <button onClick={() => { setSent(false); setEmail(""); }} className="text-[#7c6cfc] hover:underline">try again</button>
              </p>

              <Link href="/auth/login" className="inline-flex items-center gap-1.5 font-body text-sm text-slate-500 dark:text-white/30 hover:text-slate-900 dark:hover:text-white transition-colors">
                <ArrowLeft className="w-3.5 h-3.5"/> Back to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}