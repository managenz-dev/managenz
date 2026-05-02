// frontend/src/app/onboarding/user-type/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, GraduationCap, Briefcase, Check, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import { toast } from "sonner";

const USER_TYPES = [
  {
    id: "STUDENT_EXPLORER",
    title: "Student Explorer",
    icon: Compass,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    description: "I'm exploring management concepts without pressure. I want to learn through immersive, low-stakes simulations.",
    examples: ["College student", "Career explorer", "Lifelong learner"],
  },
  {
    id: "PLACEMENT_PREP",
    title: "Placement Prep",
    icon: GraduationCap,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    description: "I'm preparing for campus placements or job interviews. I need interview-calibrated, high-pressure scenarios.",
    examples: ["Final-year student", "Job seeker", "Interview prep"],
  },
  {
    id: "JUNIOR_PROFESSIONAL",
    title: "Junior Professional",
    icon: Briefcase,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    description: "I'm 1–3 years into my career. I want complex, ambiguous simulations that drive real professional growth.",
    examples: ["Early-career PM", "New manager", "Consultant"],
  },
];

export default function UserTypeGalleryPage() {
  const router = useRouter();
  const { fetchMe } = useAuthStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      await fetchMe();
      const state = useAuthStore.getState();
      const u = state.user;
      if (!u) {
        router.replace("/auth/login");
        return;
      }
      // ✅ FIXED: Check userType, not selectedDomain
      if (u.userType) {
        router.replace("/onboarding/domains");
      }
    };
    check();
  }, [fetchMe, router]);

  const handleSubmit = async () => {
    if (!selected) {
      toast.error("Please select a user type");
      return;
    }
    setLoading(true);
    try {
      await api.post("/onboarding/set-user-type", { userType: selected });
      toast.success("Great choice! Now pick your domains.");
      router.push("/onboarding/domains");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save selection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="font-display font-bold text-3xl mb-3">Who Are You?</h1>
          <p className="font-body text-white/60">
            Choose the path that matches your current goals. You can always explore other paths later.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {USER_TYPES.map(type => {
            const Icon = type.icon;
            const isSelected = selected === type.id;
            return (
              <div 
                key={type.id}
                onClick={() => setSelected(type.id)}
                className={`relative p-6 rounded-2xl border cursor-pointer transition-all duration-200 group
                  ${isSelected 
                    ? `${type.bg} ${type.border} ring-2 ring-offset-2 ring-offset-dark-950 ${type.color.replace("text", "ring")}` 
                    : "bg-white/5 border-white/10 hover:border-white/20"
                  }`}
              >
                {isSelected && (
                  <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full ${type.bg.replace("/10", "")} ${type.border} flex items-center justify-center`}>
                    <Check className={`w-4 h-4 ${type.color}`} />
                  </div>
                )}
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${type.bg} ${type.border} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${type.color}`} />
                    </div>
                    <h3 className={`font-display font-bold text-lg ${isSelected ? type.color : "text-white"}`}>
                      {type.title}
                    </h3>
                  </div>
                  <p className="font-body text-sm text-white/60 mb-4 flex-1">
                    {type.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {type.examples.map((ex, i) => (
                      <span key={i} className={`px-2.5 py-1 rounded-full text-[10px] font-mono ${type.bg} ${type.color} ${type.border}`}>
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white font-body text-sm transition-colors"
          >
            ← Back
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading || !selected}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-body font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Continue to Domains"}
          </button>
        </div>
      </div>
    </div>
  );
}