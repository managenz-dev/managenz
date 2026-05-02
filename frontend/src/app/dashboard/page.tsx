// frontend/src/app/dashboard/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, RotateCcw, CheckCircle2, Trophy,
  ArrowRight, Loader2, Zap, TrendingUp,
  Clock, Target, ChevronRight, Sparkles,
} from "lucide-react";
import AppNavbar from "@/components/layout/AppNavbar";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

const G  = "#5a7f2e";
const G2 = "#4d6e26";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  icon: Icon, value, label, sub, color = G
}: {
  icon: any; value: string | number; label: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-all">
      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
        <Icon className="w-4 h-4 text-slate-600"/>
      </div>
      <p className="font-display font-bold text-3xl text-slate-900 leading-none mb-1" style={{ color }}>{value ?? "—"}</p>
      <p className="font-body text-sm text-slate-600 font-medium">{label}</p>
      {sub && <p className="font-mono text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function SimCard({ sim, status }: { sim: any; status: "available" | "in_progress" | "completed" }) {
  const statusConfig = {
    available:   { badge: "Available",   cls: "text-slate-600 bg-slate-100 border-slate-200", icon: BookOpen     },
    in_progress: { badge: "In Progress", cls: "text-amber-700 bg-amber-50 border-amber-200",  icon: RotateCcw    },
    completed:   { badge: "Completed",   cls: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  }[status];
  const Icon = statusConfig.icon;
  const href = status === "completed"
    ? `/simulations/${sim.slug}/result`
    : `/simulations/${sim.slug}`;

  return (
    <Link href={href}
      className="block bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${sim.colorHex || G}15`, border: `1px solid ${sim.colorHex || G}35` }}>
          <Sparkles className="w-5 h-5" style={{ color: sim.colorHex || G }}/>
        </div>
        <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border font-semibold ${statusConfig.cls}`}>
          <Icon className="w-2.5 h-2.5 inline mr-1"/>
          {statusConfig.badge}
        </span>
      </div>
      <h3 className="font-body font-bold text-slate-900 text-sm mb-1 leading-snug">{sim.title}</h3>
      <p className="font-mono text-[10px] text-slate-400 mb-3">{sim.difficulty} · {sim.totalQuestions} decisions</p>
      {status === "completed" && sim.score != null && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${sim.score}%`, background: G }}/>
          </div>
          <span className="font-mono text-xs font-bold" style={{ color: G }}>{sim.score}</span>
          <span className="font-mono text-[10px] text-slate-400">/100</span>
        </div>
      )}
      <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-700 transition-colors">
        <span className="font-body text-xs font-medium">
          {status === "completed" ? "View Results" : status === "in_progress" ? "Continue" : "Start Simulation"}
        </span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"/>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { fetchMe, checkOnboardingStep } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [sims, setSims] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        await fetchMe();
        const nextStep = checkOnboardingStep();
        
        // ✅ FIXED: Redirect based on onboarding step
        if (nextStep !== "dashboard") {
          if (nextStep === "verify-otp") {
            router.replace("/auth/verify-otp");
          } else if (nextStep === "user-type") {
            router.replace("/onboarding/user-type");
          } else if (nextStep === "domains") {
            router.replace("/onboarding/domains");
          } else {
            router.replace("/auth/login");
          }
          return;
        }
        
        await loadData();
      } catch (err) {
        console.error("❌ Dashboard init failed:", err);
        router.replace("/auth/login");
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, simsRes] = await Promise.allSettled([
        api.get("/dashboard/stats"),
        api.get("/simulations"),
      ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data.data);
      if (simsRes.status === "fulfilled") {
        const data = simsRes.value.data.data;
        setSims(Array.isArray(data) ? data : data?.simulations || []);
      }
    } catch (err) {
      console.warn("⚠️ Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const available = sims.filter(s => !s.session || s.session?.status === "NOT_STARTED");
  const inProgress = sims.filter(s => s.session?.status === "IN_PROGRESS");
  const completed = sims.filter(s => s.session?.status === "COMPLETED");
  
  const { user } = useAuthStore.getState();
  const firstName = user?.firstName || "";
  const domainName = user?.selectedDomain?.name || "your domain";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: G }}/>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNavbar/>
      <div className="pt-16">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero header */}
          <div className="mb-8" style={{ animation: "fadeUp 0.4s ease" }}>
            <p className="font-mono text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{today}</p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl text-slate-900 mb-1">
              {greeting()}{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="font-body text-slate-500 font-medium">
              {domainName} Track
              {inProgress.length > 0 && (
                <span className="ml-2 font-mono text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${G}15`, color: G }}>
                  {inProgress.length} simulation{inProgress.length !== 1 ? "s" : ""} in progress
                </span>
              )}
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8" style={{ animation: "fadeUp 0.4s ease 0.05s both" }}>
            <StatCard icon={BookOpen} value={available.length} label="Available" sub="simulations ready"/>
            <StatCard icon={RotateCcw} value={inProgress.length} label="In Progress" sub="currently active"/>
            <StatCard icon={CheckCircle2} value={completed.length} label="Completed" sub="finished runs"/>
            <StatCard icon={Trophy}
              value={completed.length > 0 ? Math.max(...completed.map(s => s.session?.score ?? 0)) : "—"}
              label="Best Score" sub="out of 100"/>
          </div>

          {/* In progress */}
          {inProgress.length > 0 && (
            <section className="mb-8" style={{ animation: "fadeUp 0.4s ease 0.1s both" }}>
              <div className="flex items-center gap-2 mb-4">
                <RotateCcw className="w-4 h-4" style={{ color: G }}/>
                <h2 className="font-body font-bold text-slate-900 text-base">Continue Where You Left Off</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgress.map(s => <SimCard key={s.id} sim={s} status="in_progress"/>)}
              </div>
            </section>
          )}

          {/* Available simulations */}
          {available.length > 0 && (
            <section className="mb-8" style={{ animation: "fadeUp 0.4s ease 0.15s both" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: G }}/>
                  <h2 className="font-body font-bold text-slate-900 text-base">Available Simulations</h2>
                </div>
                <Link href="/domains"
                  className="font-body text-xs font-semibold flex items-center gap-1 transition-colors"
                  style={{ color: G }}>
                  Browse all <ChevronRight className="w-3.5 h-3.5"/>
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {available.map(s => <SimCard key={s.id} sim={s} status="available"/>)}
              </div>
            </section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <section className="mb-8" style={{ animation: "fadeUp 0.4s ease 0.2s both" }}>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
                <h2 className="font-body font-bold text-slate-900 text-base">Completed</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completed.map(s => <SimCard key={s.id} sim={s} status="completed"/>)}
              </div>
            </section>
          )}

          {/* Empty state */}
          {sims.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm"
              style={{ animation: "fadeUp 0.4s ease 0.1s both" }}>
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: `${G}12`, border: `1px solid ${G}30` }}>
                <Target className="w-8 h-8" style={{ color: G }}/>
              </div>
              <h3 className="font-display font-bold text-slate-900 text-xl mb-2">No simulations yet</h3>
              <p className="font-body text-slate-500 mb-6 max-w-sm mx-auto">
                Simulations for your domain are being prepared. Check back soon.
              </p>
              <Link href="/domains"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-body font-semibold text-sm text-white transition-all shadow-sm"
                style={{ background: G }}>
                Browse domains <ArrowRight className="w-4 h-4"/>
              </Link>
            </div>
          )}

          {/* Footer tip */}
          {sims.length > 0 && (
            <div className="rounded-2xl p-4 flex items-start gap-3 mt-4"
              style={{ background: `${G}08`, border: `1px solid ${G}25` }}>
              <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: G }}/>
              <div>
                <p className="font-body text-sm font-semibold text-slate-800">Every decision compounds</p>
                <p className="font-body text-xs text-slate-500 mt-0.5">
                  Your choices shape the outcome. Read each situation update fully before deciding.
                  Rushed decisions consistently lead to lower scores.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}