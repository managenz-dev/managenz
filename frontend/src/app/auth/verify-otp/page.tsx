// frontend/src/app/auth/verify-otp/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function VerifyOTPPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (email) {
      handleResend();
    }
  }, [email]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Email not found");
      router.push("/auth/signup");
      return;
    }
    if (otp.length !== 6) {
      toast.error("Enter 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const response = await api.post("/otp/verify-otp", { 
        email: email.toLowerCase(), 
        code: otp.trim() 
      });
      
      if (response.data.success && response.data.token) {
        // Save token to localStorage
        localStorage.setItem("managenz_token", response.data.token);
        if (response.data.user) {
          localStorage.setItem("managenz_user", JSON.stringify(response.data.user));
        }
        // Also save to cookie
        document.cookie = `managenz_token=${response.data.token}; path=/; max-age=604800; SameSite=Lax`;
        
        toast.success("Email verified! Redirecting...");
        
        // Force redirect with fresh state
        setTimeout(() => {
          router.push("/onboarding/user-type");
          router.refresh();
        }, 500);
      } else {
        toast.error("Verification failed - no token received");
      }
    } catch (err: any) {
      console.error("Verify error:", err);
      toast.error(err?.response?.data?.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0 || !email) return;
    setResending(true);
    try {
      const res = await api.post("/otp/resend-otp", { email: email.toLowerCase() });
      toast.success("New code sent! Check your email.");
      setTimeLeft(30);
      setOtp("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to resend");
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl text-white mb-2">Verify Your Account</h1>
          <p className="font-body text-slate-400">
            Enter the 6-digit code sent to{" "}
            <span className="text-emerald-400">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="bg-[#12121a] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              One-Time Code
            </label>
            <input
              type="text"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full px-4 py-3 bg-[#1a1a25] border border-white/10 rounded-xl text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || otp.length !== 6} 
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-emerald-500/50 disabled:to-teal-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Continue"
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-slate-400 text-sm">
            Didn't receive the code?{" "}
            {timeLeft > 0 ? (
              <span className="text-slate-500">Resend in {timeLeft}s</span>
            ) : (
              <button 
                onClick={handleResend} 
                disabled={resending}
                className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                Resend Code
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}