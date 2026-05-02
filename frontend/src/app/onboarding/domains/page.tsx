// frontend/src/app/onboarding/domains/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Package, Megaphone, DollarSign, Rocket, Zap, Users, Target, Sparkles, 
  Check, Loader2, ArrowLeft 
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { toast } from "sonner";

const DOMAINS = [
  { id: "product-management", name: "Product Management", icon: Package, description: "Roadmaps, prioritization, stakeholder trade-offs", color: "#818cf8" },
  { id: "marketing", name: "Marketing", icon: Megaphone, description: "Brand building, campaigns, audience growth", color: "#f43f5e" },
  { id: "sales", name: "Sales", icon: DollarSign, description: "Revenue generation, pipeline management", color: "#10b981" },
  { id: "finance", name: "Finance", icon: DollarSign, description: "Budgeting, forecasting, capital decisions", color: "#3b82f6" },
  { id: "operations", name: "Operations", icon: Zap, description: "Process design, efficiency, supply chain", color: "#f59e0b" },
  { id: "human-resources", name: "Human Resources", icon: Users, description: "Hiring, culture, performance management", color: "#ec4899" },
  { id: "strategy", name: "Strategy", icon: Target, description: "Competitive positioning, growth levers", color: "#06b6d4" },
  { id: "entrepreneurship", name: "Entrepreneurship", icon: Sparkles, description: "Founder decisions, fundraising, pivots", color: "#f97316" },
];

export default function DomainGalleryPage() {
  const router = useRouter();
  const { fetchMe } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [primary, setPrimary] = useState<string | null>(null);
  const [supporting, setSupporting] = useState<string[]>([]);

  useEffect(() => {
    const check = async () => {
      await fetchMe();
      const state = useAuthStore.getState();
      const u = state.user;
      if (!u) {
        router.replace("/auth/login");
        return;
      }
      // ✅ FIXED: Check userType first, then selectedDomainId
      if (!u.userType) {
        router.replace("/onboarding/user-type");
        return;
      }
      if (u.selectedDomainId) {
        router.replace("/dashboard");
        return;
      }
    };
    check();
  }, [fetchMe, router]);

  const togglePrimary = (id: string) => {
    if (primary === id) setPrimary(null);
    else {
      setPrimary(id);
      setSupporting(s => s.filter(d => d !== id));
    }
  };

  const toggleSupporting = (id: string) => {
    if (id === primary) return;
    setSupporting(s => 
      s.includes(id) ? s.filter(d => d !== id) : 
      s.length < 2 ? [...s, id] : s
    );
  };

  const handleSubmit = async () => {
    if (!primary) {
      toast.error("Please select a primary domain");
      return;
    }
    setLoading(true);
    try {
      await api.post("/onboarding/select-domains", {
        primaryDomainId: primary,
        supportingDomainIds: supporting,
      });
      toast.success("All set! Welcome to ManaGenz.");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <div>
            <h1 className="font-display font-bold text-2xl">Choose Your Domains</h1>
            <p className="font-body text-white/60 text-sm">
              Pick 1 primary domain and up to 2 supporting domains to personalize your experience.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {DOMAINS.map(domain => {
            const Icon = domain.icon;
            const isPrimary = primary === domain.id;
            const isSupporting = supporting.includes(domain.id);
            return (
              <div 
                key={domain.id}
                className={`relative p-5 rounded-2xl border cursor-pointer transition-all duration-200
                  ${isPrimary 
                    ? "bg-brand-500/20 border-brand-500 ring-2 ring-brand-500" 
                    : isSupporting 
                      ? "bg-white/5 border-brand-400/50" 
                      : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
                onClick={() => togglePrimary(domain.id)}
              >
                {isPrimary && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center z-10">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                {!isPrimary && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleSupporting(domain.id); }}
                    className={`absolute top-3 right-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors z-10
                      ${isSupporting 
                        ? "bg-brand-500 border-brand-500" 
                        : "border-white/30 hover:border-brand-400"
                      }`}
                    title={isSupporting ? "Remove as supporting" : "Add as supporting domain"}
                  >
                    {isSupporting && <Check className="w-3 h-3 text-white" />}
                  </button>
                )}
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${domain.color}20`, border: `1px solid ${domain.color}40` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: domain.color }} />
                  </div>
                  <div>
                    <p className="font-body font-semibold text-sm">{domain.name}</p>
                    <p className="font-body text-xs text-white/50 mt-1 line-clamp-2">{domain.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
          <p className="font-mono text-xs text-white/40 uppercase tracking-wider mb-3">Your Selection</p>
          <div className="flex flex-wrap gap-2">
            {primary ? (
              <span className="px-3 py-1.5 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-300 text-sm font-body flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Primary: {DOMAINS.find(d => d.id === primary)?.name}
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-full bg-white/5 border border-dashed border-white/20 text-white/40 text-sm font-body">
                Select a primary domain
              </span>
            )}
            {supporting.map(id => (
              <span key={id} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-sm font-body flex items-center gap-1.5">
                Supporting: {DOMAINS.find(d => d.id === id)?.name}
              </span>
            ))}
            {supporting.length < 2 && supporting.length > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-white/5 border border-dashed border-white/20 text-white/30 text-sm font-body">
                +1 more supporting (optional)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button 
            onClick={handleSubmit}
            disabled={loading || !primary}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-body font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Continue to Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}