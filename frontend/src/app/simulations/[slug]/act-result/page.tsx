// frontend/src/app/simulations/[slug]/act-result/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, TrendingUp, Award, MessageCircle } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const G = "#5a7f2e";

export default function ActResultPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  
  // Simulate receiving scores from previous step (In real app, this comes from URL state or store)
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<any>(null);

  useEffect(() => {
    // Fetch feedback logic
    const loadFeedback = async () => {
      try {
        // Mock scores for demonstration. Replace with real user scores.
        const mockScores = [85, 70, 90, 60]; 
        
        const res = await api.post(`/feedback/simulation/${slug}/act/1`, { scores: mockScores });
        setFeedback(res.data.data);
      } catch (err) {
        toast.error("Could not load feedback");
      } finally {
        setLoading(false);
      }
    };
    loadFeedback();
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50">Loading reflection...</div>;

  return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-100 dark:border-slate-800 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2">
            Act 1 Complete
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reflection Checkpoint</h1>
        </div>

        <div className="p-6 space-y-6">
          
          {/* 1. Narrative Message */}
          <div className="flex gap-4">
            <div className="mt-1 p-2 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 flex-shrink-0">
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Your Pattern</h3>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                {feedback?.narrative}
              </p>
            </div>
          </div>

          {/* 2. Key Metric Insight */}
          {feedback?.insights?.length > 0 && (
            <div className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 flex-shrink-0">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Key Insight</h3>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  {feedback.insights[0].insightText}
                </p>
              </div>
            </div>
          )}

          {/* 3. Dimension Grades Preview */}
          <div className="grid grid-cols-3 gap-3">
            {/* Mocked Grade Display - Real data would come from feedback.grades */}
            {['Product Pathfinder', 'Team Catalyst', 'Launch Driver'].map((dim, i) => (
              <div key={i} className="flex flex-col items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 mb-1 truncate w-full">{dim}</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">{['A', 'B+', 'A-'][i]}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => router.push(`/simulations/${slug}/play?act=2`)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#5a7f2e] hover:bg-[#4d6e26] text-white font-semibold transition-colors"
          >
            Continue to Act 2 <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}