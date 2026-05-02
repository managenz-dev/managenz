// frontend/src/app/onboarding/domains/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Briefcase, TrendingUp, DollarSign, Users, Zap, Target, Lightbulb, BarChart3 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface Domain {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const DOMAINS: Domain[] = [
  { id: "product", name: "Product Management", description: "Roadmaps, prioritization, stakeholder trade-offs", icon: "cube", color: "from-blue-500 to-indigo-600" },
  { id: "marketing", name: "Marketing", description: "Brand building, campaigns, audience growth", icon: "megaphone", color: "from-pink-500 to-rose-600" },
  { id: "sales", name: "Sales", description: "Revenue generation, pipeline management", icon: "dollar", color: "from-emerald-500 to-teal-600" },
  { id: "finance", name: "Finance", description: "Budgeting, forecasting, capital decisions", icon: "chart", color: "from-cyan-500 to-blue-600" },
  { id: "operations", name: "Operations", description: "Process design, efficiency, supply chain", icon: "zap", color: "from-amber-500 to-orange-600" },
  { id: "hr", name: "Human Resources", description: "Hiring, culture, performance management", icon: "users", color: "from-purple-500 to-pink-600" },
  { id: "strategy", name: "Strategy", description: "Competitive positioning, growth levers", icon: "target", color: "from-teal-500 to-cyan-600" },
  { id: "entrepreneurship", name: "Entrepreneurship", description: "Founder decisions, fundraising, pivots", icon: "lightbulb", color: "from-violet-500 to-purple-600" },
];

const iconMap: Record<string, any> = {
  cube: Briefcase, megaphone: TrendingUp, dollar: DollarSign, chart: BarChart3,
  zap: Zap, users: Users, target: Target, lightbulb: Lightbulb,
};

export default function DomainSelectionPage() {
  const router = useRouter();
  
  // ✅ UNIFIED STATE: Prevents sync issues between primary and supporting
  const [selections, setSelections] = useState({
    primary: null as string | null,
    supporting: [] as string[],
  });
  
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Check auth on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("managenz_user");
    const token = localStorage.getItem("managenz_token");
    
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    if (storedUser) setUser(JSON.parse(storedUser));
  }, [router]);

  // ✅ ROBUST CLICK HANDLER
  const handleDomainClick = (domainId: string) => {
    console.log("🖱️ Clicked domain:", domainId);
    console.log("📦 Current selections:", selections);

    // 1. If already selected, DESELECT it
    if (selections.primary === domainId) {
      console.log("⛔ Deselecting Primary:", domainId);
      setSelections({ primary: null, supporting: selections.supporting });
      return;
    }
    if (selections.supporting.includes(domainId)) {
      console.log("⛔ Deselecting Supporting:", domainId);
      setSelections({ 
        primary: selections.primary, 
        supporting: selections.supporting.filter(id => id !== domainId) 
      });
      return;
    }

    // 2. If NOT selected, ADD it
    if (!selections.primary) {
      // ✅ No primary yet? This becomes PRIMARY.
      console.log("⭐ Setting as PRIMARY:", domainId);
      setSelections({ primary: domainId, supporting: selections.supporting });
    } else {
      // ✅ Primary exists? This becomes SUPPORTING (max 2).
      if (selections.supporting.length < 2) {
        console.log("➕ Setting as SUPPORTING:", domainId);
        setSelections({ 
          primary: selections.primary, 
          supporting: [...selections.supporting, domainId] 
        });
      } else {
        toast.error("You can only select up to 2 supporting domains.");
      }
    }
  };

  const handleContinue = async () => {
    if (!selections.primary) {
      toast.error("Please select a primary domain to continue");
      return;
    }

    setLoading(true);
    try {
      // ✅ Send to backend
      await api.post("/onboarding/domains", {
        primaryDomain: selections.primary,
        supportingDomains: selections.supporting,
      });

      toast.success("Domains saved! Redirecting to dashboard...");
      
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 600);
    } catch (err: any) {
      console.error("Error saving domains:", err);
      toast.error(err?.response?.data?.message || "Failed to save domains.");
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Briefcase;
    return <IconComponent className="w-6 h-6" />;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
            type="button"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="font-display font-bold text-3xl text-white mb-2">
            Choose Your Domains
          </h1>
          <p className="font-body text-slate-400">
            Pick <span className="text-emerald-400 font-semibold">1 primary domain</span> and up to <span className="text-emerald-400 font-semibold">2 supporting domains</span>.
          </p>
        </div>

        {/* Domain Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {DOMAINS.map((domain) => {
            const isPrimary = selections.primary === domain.id;
            const isSupporting = selections.supporting.includes(domain.id);
            const isDisabled = !isSupporting && selections.supporting.length >= 2;

            return (
              <button
                key={domain.id}
                type="button"
                onClick={() => handleDomainClick(domain.id)}
                className={`
                  relative p-6 rounded-xl border-2 text-left transition-all duration-200 outline-none
                  ${isPrimary 
                    ? `bg-gradient-to-br ${domain.color} border-transparent shadow-lg ring-2 ring-white/20` 
                    : isSupporting
                    ? `bg-slate-800/50 border-emerald-500/50`
                    : isDisabled
                    ? "bg-slate-900/30 border-slate-800 opacity-50 cursor-not-allowed"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50"
                  }
                `}
              >
                {/* Selection Indicator */}
                <div className="absolute top-4 right-4">
                  {isPrimary ? (
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                  ) : isSupporting ? (
                    <div className="w-6 h-6 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-slate-800 border-2 border-slate-700 rounded-full" />
                  )}
                </div>

                {/* Icon */}
                <div className={`
                  w-12 h-12 rounded-lg flex items-center justify-center mb-4
                  ${isPrimary ? "bg-white/20" : `bg-gradient-to-br ${domain.color}`}
                `}>
                  {getIcon(domain.icon)}
                </div>

                {/* Content */}
                <h3 className={`font-semibold mb-2 ${isPrimary ? "text-white" : "text-slate-200"}`}>
                  {domain.name}
                </h3>
                <p className={`text-sm ${isPrimary ? "text-white/80" : "text-slate-400"}`}>
                  {domain.description}
                </p>

                {/* Label */}
                {isPrimary && (
                  <div className="mt-3 text-xs font-bold text-white uppercase tracking-wider bg-black/20 inline-block px-2 py-1 rounded">
                    Primary Domain
                  </div>
                )}
                {isSupporting && (
                  <div className="mt-3 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Supporting Domain
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selection Summary */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">YOUR SELECTION</h3>
          <div className="flex flex-wrap gap-3">
            {selections.primary ? (
              <span className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm font-medium flex items-center gap-2 shadow-sm">
                <Check className="w-4 h-4" />
                Primary: {DOMAINS.find(d => d.id === selections.primary)?.name}
              </span>
            ) : (
              <span className="px-4 py-2 bg-slate-800/50 border border-dashed border-slate-700 rounded-lg text-slate-500 text-sm">
                No primary domain selected
              </span>
            )}
            {selections.supporting.map(domainId => (
              <span key={domainId} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm flex items-center gap-2">
                {DOMAINS.find(d => d.id === domainId)?.name}
              </span>
            ))}
            {selections.supporting.length < 2 && (
              <span className="px-4 py-2 bg-slate-800/30 border border-dashed border-slate-700/50 rounded-lg text-slate-500 text-sm">
                +{2 - selections.supporting.length} more supporting domain(s)
              </span>
            )}
          </div>
        </div>

        {/* Continue Button */}
        <div className="flex justify-end">
          <button
            onClick={handleContinue}
            disabled={!selections.primary || loading}
            className="px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:from-slate-800 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 disabled:shadow-none flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              "Continue to Dashboard"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}