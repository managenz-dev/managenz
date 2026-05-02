// frontend/src/app/auth/signup/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setFormState] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    gender: "",
  });

  const set = (k: string, v: string) => {
    setFormState(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim()) e.lastName = "Last name is required";
    if (!/^\+91\d{10}$/.test(form.phone.replace(/\s/g, ""))) e.phone = "Format: +91XXXXXXXXXX";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email format";
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(form.password)) {
      e.password = "Min 8 chars, 1 uppercase, 1 number, 1 special char";
    }
    if (!form.gender) e.gender = "Please select gender";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    // ✅ CRITICAL: Prevent default form submission
    ev.preventDefault();
    ev.stopPropagation();
    
    console.log("📝 Form submitted, validating...");
    
    if (!validate()) {
      console.log("❌ Validation failed:", errors);
      return;
    }
    
    console.log("✅ Validation passed, submitting...");
    setLoading(true);
    
    try {
      const payload = { ...form, phone: form.phone.replace(/\s/g, "") };
      console.log("📤 Sending payload:", payload);
      
      const response = await api.post("/auth/signup", payload);
      console.log("✅ Signup successful:", response.data);
      
      toast.success("Account created! Redirecting to verification...");
      
      // ✅ Redirect to OTP verification
      const verifyUrl = `/auth/verify-otp?email=${encodeURIComponent(form.email)}`;
      console.log(" Redirecting to:", verifyUrl);
      
      // Use router.push with force navigation
      await router.push(verifyUrl);
      
    } catch (err: any) {
      console.error("❌ Signup error:", err);
      console.error("Response:", err?.response?.data);
      
      const message = err?.response?.data?.message || "Signup failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mb-4 shadow-lg shadow-emerald-500/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-3xl text-gray-900 mb-2">Create Account</h1>
          <p className="font-body text-gray-500">Join ManaGenz to start your journey</p>
        </div>

        {/* Form Card */}
        <form 
          onSubmit={handleSubmit} 
          className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl"
          // ✅ Prevent any default form behavior
          onReset={(e) => e.preventDefault()}
        >
          {/* Name Fields */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                First Name <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                className={`w-full px-4 py-3 bg-gray-50 border ${errors.firstName ? "border-red-500" : "border-gray-200"} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all`}
                placeholder="John"
                value={form.firstName}
                onChange={e => set("firstName", e.target.value)}
                disabled={loading}
                required
              />
              {errors.firstName && <p className="mt-1.5 text-xs text-red-500">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Middle Name</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="Michael"
                value={form.middleName}
                onChange={e => set("middleName", e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Last Name <span className="text-emerald-600">*</span>
              </label>
              <input
                type="text"
                className={`w-full px-4 py-3 bg-gray-50 border ${errors.lastName ? "border-red-500" : "border-gray-200"} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all`}
                placeholder="Doe"
                value={form.lastName}
                onChange={e => set("lastName", e.target.value)}
                disabled={loading}
                required
              />
              {errors.lastName && <p className="mt-1.5 text-xs text-red-500">{errors.lastName}</p>}
            </div>
          </div>

          {/* Phone Field */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number (Govt. Registered) <span className="text-emerald-600">*</span>
            </label>
            <input
              type="tel"
              className={`w-full px-4 py-3 bg-gray-50 border ${errors.phone ? "border-red-500" : "border-gray-200"} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all`}
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={e => set("phone", e.target.value.replace(/[^+\d]/g, ""))}
              maxLength={13}
              disabled={loading}
              required
            />
            {errors.phone && <p className="mt-1.5 text-xs text-red-500">{errors.phone}</p>}
            <p className="mt-1.5 text-xs text-gray-500">Used to restrict one account per person</p>
          </div>

          {/* Email Field */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address <span className="text-emerald-600">*</span>
            </label>
            <input
              type="email"
              className={`w-full px-4 py-3 bg-gray-50 border ${errors.email ? "border-red-500" : "border-gray-200"} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all`}
              placeholder="you@example.com"
              value={form.email}
              onChange={e => set("email", e.target.value.toLowerCase())}
              disabled={loading}
              required
            />
            {errors.email && <p className="mt-1.5 text-xs text-red-500">{errors.email}</p>}
          </div>

          {/* Password Field */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password <span className="text-emerald-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={`w-full px-4 py-3 bg-gray-50 border ${errors.password ? "border-red-500" : "border-gray-200"} rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all pr-12`}
                placeholder="••••••••"
                value={form.password}
                onChange={e => set("password", e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-red-500">{errors.password}</p>}
            <p className="mt-1.5 text-xs text-gray-500">Min 8 chars, 1 uppercase, 1 number, 1 special char</p>
          </div>

          {/* Gender Field */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Gender <span className="text-emerald-600">*</span>
            </label>
            <select
              className={`w-full px-4 py-3 bg-gray-50 border ${errors.gender ? "border-red-500" : "border-gray-200"} rounded-xl text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer`}
              value={form.gender}
              onChange={e => set("gender", e.target.value)}
              disabled={loading}
              required
            >
              <option value="" disabled>Select your gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </select>
            {errors.gender && <p className="mt-1.5 text-xs text-red-500">{errors.gender}</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-emerald-500/50 disabled:to-teal-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-gray-500 mt-6 text-sm">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}