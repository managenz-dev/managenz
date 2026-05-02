// frontend/src/app/auth/login/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✅ Get returnTo from URL params (decode it properly)
  const returnTo = searchParams.get("returnTo") 
    ? decodeURIComponent(searchParams.get("returnTo")!) 
    : "/dashboard";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // ✅ CRITICAL: Track if we're still checking auth to prevent flicker
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // ✅ Check auth ONLY once after component mounts
  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!mounted) return;
      
      try {
        const token = localStorage.getItem("managenz_token");
        
        // Only redirect if we have a valid token AND we're not already on an auth page
        if (token && !window.location.pathname.startsWith("/auth")) {
          // Verify token is still valid with a quick API call (optional but recommended)
          try {
            await api.get("/auth/me");
            // Token is valid, redirect
            if (mounted) {
              router.replace(returnTo);
            }
          } catch {
            // Token invalid, clear it and stay on login
            localStorage.removeItem("managenz_token");
            localStorage.removeItem("managenz_user");
            document.cookie = "managenz_token=; path=/; max-age=0";
          }
        }
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        // ✅ Only set to false if still mounted
        if (mounted) {
          setIsCheckingAuth(false);
        }
      }
    };
    
    checkAuth();
    
    // ✅ Cleanup function to prevent state updates on unmounted component
    return () => {
      mounted = false;
    };
  }, [router, returnTo]); // ✅ Proper dependency array

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/login", {
        email: email.toLowerCase().trim(),
        password,
      });

      if (response.data.success && response.data.token) {
        // ✅ Save token to localStorage
        localStorage.setItem("managenz_token", response.data.token);
        
        // ✅ Save user data
        if (response.data.user) {
          localStorage.setItem("managenz_user", JSON.stringify(response.data.user));
        }
        
        // ✅ Save to cookie for server-side access
        document.cookie = `managenz_token=${response.data.token}; path=/; max-age=604800; SameSite=Lax`;
        
        toast.success("Welcome back!");
        
        // ✅ Use replace instead of push to prevent back-button issues
        // Small delay to ensure toast shows and state updates
        setTimeout(() => {
          router.replace(returnTo);
        }, 500);
      } else {
        toast.error(response.data.message || "Login failed");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err?.response?.data?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Show loading state while checking auth to prevent flicker
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-slate-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          type="button"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display font-bold text-3xl text-white mb-2">Welcome Back</h1>
          <p className="font-body text-slate-400">
            Sign in to continue your ManaGenz journey
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-[#12121a] border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Email Field */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                className="w-full pl-12 pr-4 py-3 bg-[#1a1a25] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                className="w-full pl-12 pr-12 py-3 bg-[#1a1a25] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="text-right mb-6">
            <button
              type="button"
              onClick={() => router.push("/auth/forgot-password")}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              disabled={loading}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-emerald-500/50 disabled:to-teal-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="text-center mt-6">
          <p className="text-slate-400 text-sm">
            Don't have an account?{" "}
            <button
              onClick={() => router.push("/auth/signup")}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              type="button"
              disabled={loading}
            >
              Create one
            </button>
          </p>
        </div>

        {/* Debug info (only in development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
            <p className="text-xs text-slate-400">
              Debug: returnTo = <span className="text-emerald-400 break-all">{returnTo}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Token exists:{" "}
              <span className={localStorage.getItem("managenz_token") ? "text-emerald-400" : "text-red-400"}>
                {localStorage.getItem("managenz_token") ? "Yes" : "No"}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}