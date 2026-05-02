"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Package, Megaphone, DollarSign, Rocket, Clock, Lock, ChevronLeft, Loader2, Filter, Zap, BarChart3, Trophy } from "lucide-react";
import AppNavbar from "@/components/layout/AppNavbar";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";

const DOMAIN_ICONS: Record<string, any> = {
  "product-management": Package,
  "marketing": Megaphone,
  "finance": DollarSign,
  "entrepreneurship": Rocket,
};

const DOMAIN_COLORS: Record<string, string> = {
  "product-management": "text-brand-400",
  "marketing": "text-cyan-400",
  "finance": "text-emerald-400",
  "entrepreneurship": "text-amber-400",
};

type Difficulty = "ALL" | "EASY" | "INTERMEDIATE" | "ADVANCED";
type AccessFilter = "ALL" | "FREE" | "PREMIUM";

export default function DomainGalleryPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { isAuthenticated, fetchMe, user } = useAuthStore();
  const [useCases, setUseCases] = useState<any[]>([]);
  const [domain, setDomain] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [diffFilter, setDiffFilter] = useState<Difficulty>("ALL");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("ALL");

  const isPremium = user?.subscription?.plan !== "FREE";

  useEffect(() => { fetchMe(); }, []);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/auth/login"); return; }
    loadData();
  }, [isAuthenticated, slug]);

  const loadData = async () => {
    try {
      const [domainRes, ucRes] = await Promise.all([
        api.get(`/domains/${slug}`),
        api.get(`/usecases?domain=${slug}`),
      ]);
      setDomain(domainRes.data.data);
      setUseCases(ucRes.data.data);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useCases.filter((uc) => {
    if (diffFilter !== "ALL" && uc.difficulty !== diffFilter) return false;
    if (accessFilter === "FREE" && uc.isPremium) return false;
    if (accessFilter === "PREMIUM" && !uc.isPremium) return false;
    return true;
  });

  const Icon = DOMAIN_ICONS[slug] || Package;
  const color = DOMAIN_COLORS[slug] || "text-brand-400";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <AppNavbar />
      <main className="max-w-7xl mx-auto px-6 pt-28 pb-16">
        <Link href="/domains" className="inline-flex items-center gap-2 text-sm font-body text-white/40 hover:text-white/70 transition-colors mb-8">
          <ChevronLeft className="w-4 h-4" /> All Domains
        </Link>

        <div className="flex items-start gap-5 mb-10">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
            <Icon className={`w-8 h-8 ${color}`} />
          </div>
          <div>
            <h1 className="font-display font-bold text-4xl text-white mb-2">{domain?.name || slug}</h1>
            <p className="font-body text-white/50">{domain?.description}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className="font-mono text-xs text-white/30">{useCases.length} simulations</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="font-mono text-xs text-white/30">{useCases.filter((u) => !u.isPremium).length} free</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="font-mono text-xs text-amber-400/60">{useCases.filter((u) => u.isPremium).length} premium</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-1 p-1 bg-dark-800 border border-white/[0.06] rounded-lg">
            {(["ALL", "EASY", "INTERMEDIATE", "ADVANCED"] as Difficulty[]).map((d) => (
              <button key={d} onClick={() => setDiffFilter(d)} className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-200 ${diffFilter === d ? "bg-brand-500 text-white" : "text-white/40 hover:text-white/70"}`}>
                {d === "ALL" ? "All Levels" : d}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 p-1 bg-dark-800 border border-white/[0.06] rounded-lg">
            {(["ALL", "FREE", "PREMIUM"] as AccessFilter[]).map((a) => (
              <button key={a} onClick={() => setAccessFilter(a)} className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-200 ${accessFilter === a ? "bg-brand-500 text-white" : "text-white/40 hover:text-white/70"}`}>
                {a}
              </button>
            ))}
          </div>
          <span className="font-mono text-xs text-white/30 ml-auto">{filtered.length} simulation{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((uc) => {
            const isLocked = uc.isPremium && !isPremium;
            return (
              <div key={uc.id} className={`group card border transition-all duration-300 overflow-hidden ${isLocked ? "border-white/[0.04] opacity-70" : "border-white/[0.06] hover:border-brand-500/30 hover:-translate-y-0.5 hover:shadow-card-hover cursor-pointer"}`}>
                <div className={`h-0.5 w-full ${uc.difficulty === "EASY" ? "bg-gradient-to-r from-emerald-500 to-transparent" : uc.difficulty === "INTERMEDIATE" ? "bg-gradient-to-r from-amber-500 to-transparent" : "bg-gradient-to-r from-rose-500 to-transparent"}`} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge ${uc.difficulty === "EASY" ? "badge-easy" : uc.difficulty === "INTERMEDIATE" ? "badge-intermediate" : "badge-advanced"}`}>{uc.difficulty}</span>
                      {uc.isPremium ? <span className="badge badge-premium"><Trophy className="w-2.5 h-2.5" /> PREMIUM</span> : <span className="badge badge-free">FREE</span>}
                    </div>
                    {isLocked && <Lock className="w-4 h-4 text-white/20 flex-shrink-0" />}
                  </div>
                  <h3 className={`font-display font-semibold text-lg mb-2 transition-colors ${isLocked ? "text-white/40" : "text-white group-hover:text-brand-200"}`}>{uc.title}</h3>
                  <p className="font-body text-sm text-white/40 leading-relaxed mb-5 line-clamp-2">{uc.shortDescription}</p>
                  <div className="flex items-center gap-4 mb-5 text-xs font-mono text-white/30">
                    <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{uc.estimatedMinutes} min</div>
                    <div className="flex items-center gap-1.5"><BarChart3 className="w-3 h-3" />{uc.totalQuestions} decisions</div>
                    {uc.playCount > 0 && <div className="flex items-center gap-1.5"><Zap className="w-3 h-3" />{uc.playCount} plays</div>}
                  </div>
                  {isLocked ? (
                    <Link href="/pricing" className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-body hover:bg-amber-500/20 transition-all">
                      <Lock className="w-3.5 h-3.5" /> Unlock Premium
                    </Link>
                  ) : (
                    <Link href={`/simulation/${uc.slug}`} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 text-sm font-body hover:bg-brand-500 hover:text-white hover:border-brand-500 transition-all">
                      Start Simulation <Zap className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="font-display font-semibold text-white/50 text-lg mb-2">No simulations match</h3>
            <p className="font-body text-white/30 text-sm">Try adjusting your filters.</p>
          </div>
        )}
      </main>
    </div>
  );
}