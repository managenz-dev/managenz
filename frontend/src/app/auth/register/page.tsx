"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Brain, Loader2, ArrowRight, User, Mail, Lock } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";

export default function RegisterPage() {
  const router   = useRouter();
  const register = useAuthStore(s => s.register);

  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      toast.error("All fields are required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      toast.success(`Welcome, ${name.split(" ")[0]}! Now choose your domain.`);
      // ── KEY REDIRECT: go to domain selection, NOT dashboard ──
      router.push("/select-domain");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-500/4 rounded-full blur-3xl"/>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/4 rounded-full blur-3xl"/>
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* logo */}
        <div className="text-center mb-8" style={{ animation: "fadeUp 0.5s ease" }}>
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 rounded-2xl bg-brand-500/10 animate-pulse"/>
            <div className="absolute inset-1.5 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center">
              <Brain className="w-7 h-7 text-brand-400"/>
            </div>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white mb-1">Create Account</h1>
          <p className="font-body text-white/40 text-sm">Join ManaGenz and start your management journey</p>
        </div>

        {/* form card */}
        <div className="card p-6 sm:p-8" style={{ animation: "fadeUp 0.5s ease 0.1s both" }}>
          <div className="space-y-4">

            {/* Name */}
            <div>
              <label className="font-mono text-xs text-white/40 uppercase tracking-wider block mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none"/>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="Your full name"
                  className="w-full bg-dark-700 border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 font-body text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="font-mono text-xs text-white/40 uppercase tracking-wider block mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none"/>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="you@example.com"
                  className="w-full bg-dark-700 border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 font-body text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="font-mono text-xs text-white/40 uppercase tracking-wider block mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none"/>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="Min. 6 characters"
                  className="w-full bg-dark-700 border border-white/[0.08] rounded-xl pl-11 pr-11 py-3 font-body text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary w-full justify-center py-3.5 mt-2 disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin"/> Creating account…</>
                : <>Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/></>
              }
            </button>
          </div>

          <p className="text-center font-body text-sm text-white/30 mt-5">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 transition-colors font-medium">Sign in</Link>
          </p>
        </div>

        {/* what happens next */}
        <div className="mt-5 card p-4 border border-white/[0.05]" style={{ animation: "fadeUp 0.5s ease 0.2s both" }}>
          <p className="font-mono text-[10px] text-white/25 uppercase tracking-wider mb-3 text-center">What happens next</p>
          <div className="space-y-2">
            {[
              { step: "1", text: "Create your account" },
              { step: "2", text: "Choose your management domain" },
              { step: "3", text: "Start simulating real scenarios" },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-500/15 border border-brand-500/25 flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-xs text-brand-400">{step}</span>
                </div>
                <p className="font-body text-xs text-white/40">{text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style jsx global>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}