// frontend/src/app/profile/page.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, User, Mail, Phone, Globe, Calendar, Shield,
  CheckCircle2, Trophy, Brain, TrendingUp, Edit3,
  Save, X, Eye, EyeOff, Lock, AtSign, FileText,
  Star, Zap, Award, BarChart3, ChevronRight, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import AppNavbar from "@/components/layout/AppNavbar";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
const DOMAIN_ACCENT: Record<string, { color: string; bg: string; border: string; hex: string }> = {
  "product-management": { color: "text-[#7aaa3e]",  bg: "bg-[rgba(90,127,46,0.10)]",  border: "border-[#5a7f2e]/25",  hex: "#7c3aed" },
  "finance":            { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", hex: "#059669" },
  "operations":         { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/25",   hex: "#d97706" },
  "human-resources":    { color: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/25",    hex: "#db2777" },
  "strategy":           { color: "text-cyan-400",    bg: "bg-cyan-500/10",    border: "border-cyan-500/25",    hex: "#0891b2" },
  "general-management": { color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/25",    hex: "#2563eb" },
  "sales-marketing":    { color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/25",    hex: "#e11d48" },
  "entrepreneurship":   { color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/25",  hex: "#ea580c" },
};
const FA = { color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/25", hex: "#6366f1" };
const getA = (slug?: string | null) => (slug && DOMAIN_ACCENT[slug]) || FA;

// ─────────────────────────────────────────────────────────────────────────────
// Input field component
function Field({
  label, value, onChange, placeholder, icon: Icon,
  type = "text", maxLength, hint, error, success, disabled = false, suffix,
}: any) {
  return (
    <div>
      <label className="block font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400"/>
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className={`w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-body text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500
            focus:outline-none focus:ring-1 transition-all
            ${Icon ? "pl-10" : ""}
            ${suffix ? "pr-16" : ""}
            ${disabled ? "opacity-40 cursor-not-allowed" : ""}
            ${error   ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20"
            : success ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500/20"
            :           "border-slate-200 dark:border-slate-700 focus:border-[#5a7f2e]/60 focus:ring-[#5a7f2e]/20"}`}
        />
        {suffix && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {suffix}
          </div>
        )}
      </div>
      {hint  && !error && <p className="font-body text-xs text-slate-600 dark:text-slate-400 mt-1.5">{hint}</p>}
      {error && <p className="font-body text-xs text-rose-400 mt-1.5 flex items-center gap-1"><X className="w-3 h-3"/>{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section card wrapper
function Card({ children, delay = 0, className = "" }: any) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-5 sm:p-6 ${className}`}
      style={{ animation: `fadeUp 0.4s ease ${delay}ms both` }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat tile
function StatTile({ icon: Icon, label, value, suffix, color }: any) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
      <Icon className={`w-4 h-4 ${color}`}/>
      <div className="flex items-baseline gap-0.5">
        <span className={`font-display font-bold text-xl ${color}`}>{value ?? "—"}</span>
        {suffix && <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{suffix}</span>}
      </div>
      <p className="font-mono text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const router            = useRouter();
  const { user, fetchMe, hasHydrated } = useAuthStore();

  const [profile,  setProfile]  = useState<any>(null);
  const [loading,  setLoading]  = useState(true);

  // Edit profile state
  const [editMode,  setEditMode]  = useState(false);
  const [name,      setName]      = useState("");
  const [username,  setUsername]  = useState("");
  const [bio,       setBio]       = useState("");
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState("");
  const [nameErr,   setNameErr]   = useState("");
  const [unErr,     setUnErr]     = useState("");
  const [unOk,      setUnOk]      = useState(false);
  const unTimer     = useRef<any>(null);

  // ✅ Phone number state
  const [phone,       setPhone]       = useState("");
  const [editingPhone,setEditingPhone]= useState(false);
  const [phoneInput,  setPhoneInput]  = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  // Change password state
  const [pwSection,   setPwSection]   = useState(false);
  const [curPw,       setCurPw]       = useState("");
  const [newPw,       setNewPw]       = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [showCur,     setShowCur]     = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showCon,     setShowCon]     = useState(false);
  const [pwSaving,    setPwSaving]    = useState(false);
  const [pwMsg,       setPwMsg]       = useState({ text: "", ok: false });
  const [pwErr,       setPwErr]       = useState({ cur: "", new: "", con: "" });

  // ── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      await fetchMe();
      if (cancelled) return;

      const { isAuthenticated, user: u } = useAuthStore.getState();
      if (!isAuthenticated || !u) { router.replace("/auth/login"); return; }

      try {
        const res = await api.get("/users/profile");
        if (cancelled) return;
        const d = res.data.data;
        setProfile(d);
        setName(d.user.name || "");
        setUsername(d.user.username || "");
        setBio(d.user.bio || "");
        setPhone(d.user.mobileNumber || "");
        setPhoneInput(d.user.mobileNumber || "");
      } catch (err: any) {
        if (cancelled) return;
        if (err?.response?.status === 401) { router.replace("/auth/login"); return; }
        // Fallback: show profile with data from auth store
        setProfile({ user: u, stats: null, badges: [] });
        setName(u.name || "");
        setUsername("");
        setBio(u.bio || "");
        setPhone(u.mobileNumber || "");
        setPhoneInput(u.mobileNumber || "");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Update phone input when user data changes (auto-refresh)
  useEffect(() => {
    if (user?.mobileNumber) {
      setPhone(user.mobileNumber);
      setPhoneInput(user.mobileNumber);
    }
  }, [user]);

  // ── Username availability check (debounced) ────────────────────────────────
  const handleUsernameChange = (val: string) => {
    setUsername(val);
    setUnErr("");
    setUnOk(false);
    clearTimeout(unTimer.current);
    if (!val.trim() || val.trim().length < 3) return;
    unTimer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/users/check-username?username=${encodeURIComponent(val.trim())}`);
        const d   = res.data.data;
        if (d.available) setUnOk(true);
        else setUnErr(d.message);
      } catch {}
    }, 500);
  };

  // ── Save profile (name, username, bio) ─────────────────────────────────────
  const handleSave = async () => {
    let hasErr = false;
    setNameErr("");
    setUnErr("");

    if (!name.trim()) { setNameErr("Name is required"); hasErr = true; }
    if (username.trim() && username.trim().length < 3) { setUnErr("Username must be at least 3 characters"); hasErr = true; }
    if (hasErr) return;

    setSaving(true);
    setSaveMsg("");
    try {
      const res = await api.patch("/users/profile", {
        name:     name.trim(),
        username: username.trim() || undefined,
        bio:      bio.trim(),
      });
      setProfile((p: any) => ({ ...p, user: { ...p.user, ...res.data.data.user } }));
      await fetchMe(); // ✅ Refresh auth store
      setSaveMsg("Profile saved successfully!");
      setEditMode(false);
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to save";
      if (msg.toLowerCase().includes("username")) setUnErr(msg);
      else setSaveMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setName(profile?.user?.name || "");
    setUsername(profile?.user?.username || "");
    setBio(profile?.user?.bio || "");
    setNameErr("");
    setUnErr("");
    setUnOk(false);
  };

  // ✅ Save phone number
  const handleSavePhone = async () => {
    if (phoneInput && !/^\d{10}$/.test(phoneInput.replace(/\s/g, ""))) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    setSavingPhone(true);
    try {
      await api.patch("/users/profile", { mobileNumber: phoneInput.trim() || null });
      // ✅ Refresh both profile state and auth store
      const res = await api.get("/users/profile");
      setProfile(res.data.data);
      await fetchMe();
      setPhone(phoneInput.trim() || "");
      setEditingPhone(false);
      toast.success("Phone number updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update phone");
    } finally {
      setSavingPhone(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    const errs = { cur: "", new: "", con: "" };
    let hasErr = false;

    if (!curPw) { errs.cur = "Current password is required"; hasErr = true; }
    if (!newPw || newPw.length < 6) { errs.new = "New password must be at least 6 characters"; hasErr = true; }
    if (newPw !== confirmPw) { errs.con = "Passwords do not match"; hasErr = true; }
    if (curPw === newPw) { errs.new = "New password must be different"; hasErr = true; }

    setPwErr(errs);
    if (hasErr) return;

    setPwSaving(true);
    setPwMsg({ text: "", ok: false });
    try {
      await api.patch("/users/change-password", { currentPassword: curPw, newPassword: newPw });
      setPwMsg({ text: "Password changed successfully!", ok: true });
      setCurPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => { setPwSection(false); setPwMsg({ text: "", ok: false }); }, 2500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to change password";
      if (msg.toLowerCase().includes("current")) setPwErr(e => ({ ...e, cur: msg }));
      else setPwMsg({ text: msg, ok: false });
    } finally {
      setPwSaving(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Single loading guard
  if (loading) return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-[#5a7f2e] animate-spin"/>
    </div>
  );

  if (!profile) return null;

  const { user: u, stats } = profile;
  const domainSlug = typeof u.selectedDomain === "string"
    ? u.selectedDomain
    : (u.selectedDomain as any)?.slug || "";
  const domainName = typeof u.selectedDomain === "string"
    ? u.selectedDomain.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : (u.selectedDomain as any)?.name || "";
  const accent    = getA(domainSlug);
  const initials  = u.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  
  // ✅ FIXED: Robust date parsing with fallback
  const parseJoinedDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "Not available";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Not available";
      return date.toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      });
    } catch {
      return "Not available";
    }
  };
  
  const memberSince = parseJoinedDate(u.createdAt);

  const scoreColor = !stats?.avgScore ? "text-slate-400"
    : (stats?.avgScore ?? 0) >= 75 ? "text-emerald-400"
    : (stats?.avgScore ?? 0) >= 60 ? "text-amber-400"
    : "text-rose-400";

  // ✅ Verification badge component
  const VerificationBadge = () => {
    if (u.emailVerified) {
      return (
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3"/>Verified
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 font-mono text-[10px] text-amber-400 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
        <AlertCircle className="w-3 h-3"/>Pending
      </span>
    );
  };

  return (
    <>
    <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }`}</style>
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] text-slate-900 dark:text-slate-50">
      <AppNavbar/>

      {/* ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full blur-[130px] opacity-60`}
          style={{ background: `${accent.hex}18` }}/>
      </div>

      <main className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 lg:pt-28 pb-16 space-y-5">

        {/* ── Hero Card ───────────────────────────────────────────────────── */}
        <Card delay={0}>
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">

            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-[#5a7f2e]/50 to-[#5a7f2e]/50 border-2 border-[#5a7f2e]/30 flex items-center justify-center shadow-xl`}>
                <span className="font-display font-bold text-3xl text-slate-900 dark:text-slate-50">{initials}</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-slate-50 truncate">
                    {u.name}
                  </h1>
                  {u.username && (
                    <p className="font-mono text-sm text-slate-600 dark:text-slate-400 mt-0.5">@{u.username}</p>
                  )}
                  {u.bio && (
                    <p className="font-body text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">{u.bio}</p>
                  )}
                </div>
                {/* ✅ Fixed Edit Button: Consistent dark:text-slate-50 */}
                <button
                  onClick={() => setEditMode(e => !e)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-body transition-all border flex-shrink-0
                    ${editMode
                      ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-50"
                      : "bg-[rgba(90,127,46,0.15)] border-[#5a7f2e]/30 text-[#5a7f2e] hover:bg-[rgba(90,127,46,0.25)]"
                    }`}
                >
                  <Edit3 className="w-3.5 h-3.5"/>
                  {editMode ? "Cancel" : "Edit Profile"}
                </button>
              </div>

              {/* Meta pills */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Mail className="w-3 h-3"/>{u.email}
                </span>
                {domainName && (
                  <span className={`flex items-center gap-1.5 font-mono text-[10px] ${accent.color} px-2.5 py-1 rounded-full ${accent.bg} border ${accent.border}`}>
                    <Globe className="w-3 h-3"/>{domainName}
                  </span>
                )}
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Calendar className="w-3 h-3"/>Joined {memberSince}
                </span>
                {/* ✅ Real-time verification badge */}
                <VerificationBadge />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <StatTile icon={Brain}        label="Total"     value={stats?.total ?? 0}     color={accent.color}/>
            <StatTile icon={CheckCircle2} label="Completed" value={stats?.completed ?? 0} color="text-emerald-400"/>
            <StatTile icon={TrendingUp}   label="Avg Score" value={stats?.avgScore ?? 0}  suffix="/100" color={scoreColor}/>
            <StatTile icon={Trophy}       label="Best Score" value={stats?.bestScore ?? 0} suffix="/100" color="text-yellow-400"/>
          </div>

          {/* Success message */}
          {saveMsg && (
            <div className={`mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body
              ${saveMsg.includes("success")
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
              }`}>
              {saveMsg.includes("success") ? <CheckCircle2 className="w-4 h-4 flex-shrink-0"/> : <X className="w-4 h-4 flex-shrink-0"/>}
              {saveMsg}
            </div>
          )}
        </Card>

        {/* ── Edit Profile Form ───────────────────────────────────────────── */}
        {editMode && (
          <Card delay={50}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display font-bold text-slate-900 dark:text-slate-50 text-base">Edit Profile</h2>
                <p className="font-body text-slate-600 dark:text-slate-400 text-xs mt-0.5">Update your name, username and bio</p>
              </div>
            </div>

            <div className="space-y-4">
              <Field
                label="Full Name"
                value={name}
                onChange={setName}
                placeholder="Your full name"
                icon={User}
                maxLength={60}
                error={nameErr}
              />

              <Field
                label="Username"
                value={username}
                onChange={handleUsernameChange}
                placeholder="e.g. john_doe"
                icon={AtSign}
                maxLength={30}
                hint="Letters, numbers, _ and - only. Min 3 characters."
                error={unErr}
                success={unOk && !unErr}
                suffix={
                  unOk && !unErr
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
                    : unErr
                      ? <X className="w-4 h-4 text-rose-400"/>
                      : null
                }
              />

              <div>
                <label className="block font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell others a little about yourself…"
                  maxLength={200}
                  rows={3}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-body text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#5a7f2e]/60 focus:ring-1 focus:ring-[#5a7f2e]/20 transition-all resize-none"
                />
                <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-1 text-right">{bio.length}/200</p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5a7f2e] hover:bg-[#4d6e26] text-slate-900 dark:text-slate-50 text-sm font-body font-medium transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 text-sm font-body transition-all"
              >
                Cancel
              </button>
            </div>
          </Card>
        )}

        {/* ── Quick Links ─────────────────────────────────────────────────── */}
        <Card delay={100}>
          <h2 className="font-display font-bold text-slate-900 dark:text-slate-50 text-base mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { href: "/dashboard",   icon: Brain,    label: "Dashboard",   sub: "Your simulations",    color: accent.color, bg: accent.bg, border: accent.border },
              { href: "/leaderboard", icon: Trophy,   label: "Leaderboard", sub: "Domain rankings",     color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
              { href: "/analytics",   icon: BarChart3, label: "Analytics",  sub: "Progress & charts",   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
            ].map(({ href, icon: Icon, label, sub, color, bg, border }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-3 p-3.5 rounded-xl ${bg} border ${border} hover:border-slate-300 dark:hover:border-slate-600 transition-all group`}>
                <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-display font-semibold text-sm ${color}`}>{label}</p>
                  <p className="font-body text-xs text-slate-600 dark:text-slate-400">{sub}</p>
                </div>
                {/* ✅ Fixed Chevron: No conflicting dark mode classes */}
                <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors flex-shrink-0"/>
              </Link>
            ))}
          </div>
        </Card>

        {/* ── Account Details (with Phone Number) ────────────────────────── */}
        <Card delay={150}>
          <h2 className="font-display font-bold text-slate-900 dark:text-slate-50 text-base mb-4">Account Details</h2>
          <div className="space-y-3">
            {[
              { icon: Mail,       label: "Email",          value: u.email                              },
              { icon: Shield,     label: "Role",           value: u.role === "ADMIN" ? "Administrator" : "Student" },
              { icon: Globe,      label: "Domain",         value: domainName || "Not selected"         },
              { icon: Calendar,   label: "Member Since",   value: memberSince                          },
              { icon: CheckCircle2, label: "Email Status", value: u.emailVerified ? "Verified" : "Not verified" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0"/>
                <span className="font-mono text-xs text-slate-600 dark:text-slate-400 w-28 flex-shrink-0 uppercase tracking-wider">{label}</span>
                <span className="font-body text-sm text-slate-600 dark:text-slate-50 truncate">{value}</span>
              </div>
            ))}
            
            {/* ✅ Phone Number Row (Editable) */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <Phone className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0"/>
              <span className="font-mono text-xs text-slate-600 dark:text-slate-400 w-28 flex-shrink-0 uppercase tracking-wider">Phone</span>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {editingPhone ? (
                  <>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={e => setPhoneInput(e.target.value)}
                      placeholder="9876543210"
                      className="flex-1 bg-transparent border-b border-slate-300 dark:border-slate-600 focus:border-[#5a7f2e] outline-none text-sm font-body text-slate-900 dark:text-slate-50 py-1"
                      autoFocus
                    />
                    <button onClick={handleSavePhone} disabled={savingPhone}
                      className="p-1.5 rounded-lg bg-[#5a7f2e] hover:bg-[#4d6e26] text-white transition-colors disabled:opacity-50">
                      {savingPhone ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
                    </button>
                    <button onClick={() => { setEditingPhone(false); setPhoneInput(phone); }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors">
                      <X className="w-3.5 h-3.5"/>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-body text-sm text-slate-600 dark:text-slate-50 truncate">
                      {phone || "Not added"}
                    </span>
                    <button onClick={() => { setEditingPhone(true); setPhoneInput(phone); }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[#5a7f2e] transition-colors">
                      <Edit3 className="w-3.5 h-3.5"/>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* ── Change Password ────────────────────────────────────────────── */}
        <Card delay={200}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="font-display font-bold text-slate-900 dark:text-slate-50 text-base">Security</h2>
              <p className="font-body text-slate-600 dark:text-slate-400 text-xs mt-0.5">Change your account password</p>
              <Link
                href="/auth/forgot-password"
                className="font-body text-xs text-[#5a7f2e]/60 hover:text-[#5a7f2e] transition-colors mt-1 inline-block"
              >
                Forgot your password?
              </Link>
            </div>
            <button
              onClick={() => { setPwSection(s => !s); setPwErr({ cur: "", new: "", con: "" }); setPwMsg({ text: "", ok: false }); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-body transition-all border
                ${pwSection
                  ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-50"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
            >
              <Lock className="w-3.5 h-3.5"/>
              {pwSection ? "Cancel" : "Change Password"}
            </button>
          </div>

          {pwSection && (
            <div className="mt-5 space-y-4">
              {/* Current password */}
              <div>
                <label className="block font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none"/>
                  <input
                    type={showCur ? "text" : "password"}
                    value={curPw}
                    onChange={e => { setCurPw(e.target.value); setPwErr(p => ({ ...p, cur: "" })); }}
                    placeholder="Your current password"
                    className={`w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm font-body text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all
                      ${pwErr.cur ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:border-[#5a7f2e]/60 focus:ring-[#5a7f2e]/20"}`}
                  />
                  {/* ✅ Fixed Eye Button: No conflicting dark mode classes */}
                  <button type="button" onClick={() => setShowCur(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    {showCur ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
                {pwErr.cur && <p className="font-body text-xs text-rose-400 mt-1.5 flex items-center gap-1"><X className="w-3 h-3"/>{pwErr.cur}</p>}
              </div>

              {/* New password */}
              <div>
                <label className="block font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none"/>
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPw}
                    onChange={e => { setNewPw(e.target.value); setPwErr(p => ({ ...p, new: "" })); }}
                    placeholder="Min. 6 characters"
                    className={`w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm font-body text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all
                      ${pwErr.new ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:border-[#5a7f2e]/60 focus:ring-[#5a7f2e]/20"}`}
                  />
                  {/* ✅ Fixed Eye Button: No conflicting dark mode classes */}
                  <button type="button" onClick={() => setShowNew(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    {showNew ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
                {pwErr.new && <p className="font-body text-xs text-rose-400 mt-1.5 flex items-center gap-1"><X className="w-3 h-3"/>{pwErr.new}</p>}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none"/>
                  <input
                    type={showCon ? "text" : "password"}
                    value={confirmPw}
                    onChange={e => { setConfirmPw(e.target.value); setPwErr(p => ({ ...p, con: "" })); }}
                    placeholder="Repeat your new password"
                    className={`w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-3 text-sm font-body text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all
                      ${pwErr.con ? "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20" : "border-slate-200 dark:border-slate-700 focus:border-[#5a7f2e]/60 focus:ring-[#5a7f2e]/20"}`}
                  />
                  {/* ✅ Fixed Eye Button: No conflicting dark mode classes */}
                  <button type="button" onClick={() => setShowCon(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    {showCon ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
                {pwErr.con && <p className="font-body text-xs text-rose-400 mt-1.5 flex items-center gap-1"><X className="w-3 h-3"/>{pwErr.con}</p>}
              </div>

              {/* Password strength indicator */}
              {newPw.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-all ${
                        newPw.length >= i * 3
                          ? i <= 1 ? "bg-rose-500" : i <= 2 ? "bg-amber-500" : i <= 3 ? "bg-blue-500" : "bg-emerald-500"
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}/>
                    ))}
                  </div>
                  <p className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                    {newPw.length < 6 ? "Too short" : newPw.length < 9 ? "Weak" : newPw.length < 12 ? "Good" : "Strong"}
                  </p>
                </div>
              )}

              {pwMsg.text && (
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body
                  ${pwMsg.ok
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                  }`}>
                  {pwMsg.ok ? <CheckCircle2 className="w-4 h-4"/> : <X className="w-4 h-4"/>}
                  {pwMsg.text}
                </div>
              )}

              <button
                onClick={handleChangePassword}
                disabled={pwSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5a7f2e] hover:bg-[#4d6e26] text-slate-900 dark:text-slate-50 text-sm font-body font-medium transition-all disabled:opacity-60"
              >
                {pwSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Lock className="w-4 h-4"/>}
                {pwSaving ? "Changing…" : "Change Password"}
              </button>
            </div>
          )}
        </Card>

      </main>
    </div>
    </>
  );
}