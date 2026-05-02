// frontend/src/app/auth/verify-email/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useThemeStore } from "@/store/theme.store";
import api from "@/lib/api";
import { toast } from "sonner";

const G = "#5a7f2e";
const F = "'Inter','Segoe UI',sans-serif";
const FM = "'JetBrains Mono','Fira Code','Courier New',monospace";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchMe } = useAuthStore();
  const { isDark } = useThemeStore();

  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => { setMounted(true); }, []);
  const dark = mounted ? isDark : false;

  const bg = dark ? "#060d02" : "#f6faf3";
  const card = dark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const border = dark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const text = dark ? "#f1f5f9" : "#0f172a";
  const muted = dark ? "rgba(255,255,255,0.40)" : "#64748b";
  const faint = dark ? "rgba(255,255,255,0.25)" : "#94a3b8";
  const inp = dark ? "rgba(255,255,255,0.05)" : "#ffffff";
  const inpBrd = dark ? "rgba(255,255,255,0.10)" : "#e2e8f0";

  // ✅ Resend OTP with cooldown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async () => {
    if (!email || !otp) {
      toast.error("Email and OTP are required");
      return;
    }
    if (otp.length !== 6) {
      toast.error("OTP must be 6 digits");
      return;
    }
    
    setLoading(true);
    try {
      await api.post("/auth/verify-email", { email: email.toLowerCase(), otp });
      setVerified(true);
      toast.success("Email verified successfully!");
      
      // ✅ CRITICAL: Wait for cookie to be fully set, then update auth store
      await new Promise(resolve => setTimeout(resolve, 800));
      await fetchMe();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // ✅ Now redirect - auth state is ready
      router.replace("/select-domain");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || countdown > 0) return;
    setResendLoading(true);
    try {
      await api.post("/auth/resend-otp", { email: email.toLowerCase() });
      toast.success("New code sent to your email");
      setCountdown(30); // 30 second cooldown
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to resend");
    } finally {
      setResendLoading(false);
    }
  };

  const inputStyle = (extra?: object): React.CSSProperties => ({
    width: "100%",
    background: inp,
    border: `1px solid ${inpBrd}`,
    borderRadius: "12px",
    padding: "12px 12px 12px 44px",
    fontFamily: F,
    fontSize: "14px",
    color: text,
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    ...extra,
  });

  // ✅ If already verified, show success state
  if (verified) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: F }}>
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: "20px", padding: "32px", maxWidth: "400px", width: "100%", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(90,127,46,0.12)", border: `2px solid ${G}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <CheckCircle2 style={{ width: "32px", height: "32px", color: G }}/>
          </div>
          <h1 style={{ fontFamily: F, fontWeight: 800, fontSize: "24px", color: text, marginBottom: "8px" }}>Email Verified!</h1>
          <p style={{ fontFamily: F, fontSize: "14px", color: muted, marginBottom: "24px" }}>Redirecting you to choose your domain...</p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Loader2 style={{ width: "20px", height: "20px", color: G, animation: "spin 1s linear infinite" }}/>
          </div>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <>
    <style suppressHydrationWarning>{`
      @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
      @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      input:focus { border-color: ${G} !important; box-shadow: 0 0 0 3px rgba(90,127,46,0.10) !important; }
      input::placeholder { color: ${faint}; }
      * { box-sizing: border-box; }
    `}</style>

    <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: F, position: "relative", overflow: "hidden" }}>
      {/* Background glows */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "20%", left: "15%", width: "500px", height: "500px", background: "rgba(90,127,46,0.06)", borderRadius: "50%", filter: "blur(120px)" }}/>
        <div style={{ position: "absolute", bottom: "20%", right: "15%", width: "400px", height: "400px", background: "rgba(90,127,46,0.04)", borderRadius: "50%", filter: "blur(100px)" }}/>
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "440px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px", animation: "fadeUp 0.45s ease" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", textDecoration: "none" }}>
            <img
              src={dark ? "/dark_logo.png" : "/light_logo.png"}
              alt="ManaGenz"
              style={{ height: "32px", objectFit: "contain" }}
              onError={(e) => {
                const t = e.target as HTMLImageElement; t.style.display = "none";
                const s = document.createElement("span");
                s.textContent = "ManaGenz";
                s.style.cssText = `font-family:${F};font-size:20px;font-weight:800;color:${G}`;
                t.parentElement?.appendChild(s);
              }}
            />
          </Link>
          <h1 style={{ fontFamily: F, fontWeight: 800, fontSize: "28px", color: text, marginBottom: "6px", letterSpacing: "-0.5px" }}>
            Verify Your Email
          </h1>
          <p style={{ fontFamily: FM, fontSize: "12px", color: muted }}>
            Enter the 6-digit code sent to {email || "your email"}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: card, border: `1px solid ${border}`,
          borderRadius: "20px", padding: "32px",
          boxShadow: dark ? "0 8px 40px rgba(0,0,0,0.30)" : "0 4px 24px rgba(0,0,0,0.06)",
          animation: "fadeUp 0.45s ease 0.08s both",
        }}>
          {/* Email (read-only) */}
          <div style={{ marginBottom: "18px" }}>
            <label style={{ fontFamily: FM, fontSize: "10px", color: faint, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: "8px" }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <Mail style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: faint, pointerEvents: "none" }}/>
              <input
                type="email"
                value={email}
                readOnly
                style={{ ...inputStyle(), cursor: "not-allowed", opacity: 0.7 }}
              />
            </div>
          </div>

          {/* OTP Input */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontFamily: FM, fontSize: "10px", color: faint, textTransform: "uppercase", letterSpacing: "0.12em", display: "block", marginBottom: "8px" }}>
              Verification Code *
            </label>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={e => e.key === "Enter" && handleVerify()}
              placeholder="Enter 6-digit code"
              maxLength={6}
              style={{ ...inputStyle(), textAlign: "center", letterSpacing: "8px", fontSize: "18px", fontWeight: 600 }}
            />
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "13px",
              borderRadius: "12px",
              border: "none",
              cursor: (loading || otp.length !== 6) ? "not-allowed" : "pointer",
              background: (loading || otp.length !== 6) ? "rgba(90,127,46,0.6)" : G,
              color: "#fff",
              fontFamily: F,
              fontSize: "14px",
              fontWeight: 600,
              boxShadow: "0 4px 16px rgba(90,127,46,0.30)",
              transition: "all 0.2s",
              opacity: (loading || otp.length !== 6) ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!loading && otp.length === 6) (e.currentTarget as HTMLElement).style.background = "#4d6e26"; }}
            onMouseLeave={e => { if (!loading && otp.length === 6) (e.currentTarget as HTMLElement).style.background = G; }}
          >
            {loading ? (
              <><Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }}/> Verifying…</>
            ) : (
              "Verify Email"
            )}
          </button>

          {/* Resend Link */}
          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <p style={{ fontFamily: F, fontSize: "13px", color: muted }}>
              Didn't receive the code?{" "}
              <button
                onClick={handleResend}
                disabled={resendLoading || countdown > 0}
                style={{
                  background: "none",
                  border: "none",
                  color: countdown > 0 ? faint : G,
                  fontFamily: F,
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: (resendLoading || countdown > 0) ? "not-allowed" : "pointer",
                  textDecoration: "none",
                }}
              >
                {resendLoading ? "Sending…" : countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
              </button>
            </p>
          </div>

          {/* Back to Login */}
          <div style={{ textAlign: "center", marginTop: "20px", paddingTop: "20px", borderTop: `1px solid ${border}` }}>
            <Link href="/auth/login" style={{ fontFamily: F, fontSize: "13px", color: muted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <ArrowLeft style={{ width: "14px", height: "14px" }}/> Back to Sign In
            </Link>
          </div>
        </div>

        {/* Trust badges */}
        <div style={{ marginTop: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", animation: "fadeUp 0.45s ease 0.18s both" }}>
          {["Secure", "No spam", "Cancel anytime"].map((t, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: FM, fontSize: "10px", color: faint, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: G, flexShrink: 0, opacity: 0.7 }}/>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}