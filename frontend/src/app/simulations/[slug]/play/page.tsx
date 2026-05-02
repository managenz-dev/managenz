// frontend/src/app/simulations/[slug]/play/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
// ✅ Import the Sidebar Component
import VariableSidebar from "@/components/simulation/VariableSidebar";

export default function SimulationPlayPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  // State for Simulation
  const [loading, setLoading] = useState(true);
  const [simulation, setSimulation] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Step 3: Sidebar State
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ✅ Step 3: Variables State (Mock data initially, will be updated by backend)
  const [variables, setVariables] = useState([
    {
      displayName: "Team Morale",
      description: "The overall satisfaction and energy of your team members.",
      currentValue: 70,
      previousValue: 70,
      unit: "%",
    },
    {
      displayName: "Budget Health",
      description: "Remaining financial resources available for this project.",
      currentValue: 50,
      previousValue: 50,
      unit: "%",
    },
    {
      displayName: "Client Trust",
      description: "How much confidence the client has in your ability to deliver.",
      currentValue: 80,
      previousValue: 80,
      unit: "%",
    },
    {
      displayName: "Technical Quality",
      description: "The robustness and scalability of the solution you are building.",
      currentValue: 60,
      previousValue: 60,
      unit: "%",
    },
  ]);

  // Fetch Simulation Data
  useEffect(() => {
    const fetchSimulation = async () => {
      try {
        // Replace with your actual simulation endpoint
        const res = await api.get(`/simulations/${slug}`);
        setSimulation(res.data.data);
      } catch (err) {
        toast.error("Failed to load simulation");
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchSimulation();
  }, [slug, router]);

  // ✅ Step 4: Logic to Update Variables after decision
  const updateVariablesLocally = (impacts: any[]) => {
    if (!impacts || impacts.length === 0) return;

    setVariables((prevVars) => {
      return prevVars.map((variable) => {
        // Find if the chosen option had an impact on this specific variable
        const impact = impacts.find(
          (i: any) => i.displayName === variable.displayName || i.variableName === variable.displayName
        );

        if (impact) {
          const delta = impact.delta || 0; // e.g., +10 or -5
          const newValue = Math.min(100, Math.max(0, variable.currentValue + delta));
          
          // Return updated object
          return {
            ...variable,
            previousValue: variable.currentValue, // Old value becomes previous
            currentValue: newValue,               // New value becomes current
          };
        }
        return variable;
      });
    });
  };

  // ✅ Submit Decision Handler
  const handleSubmitDecision = async () => {
    if (!selectedOption) {
      toast.error("Please select an option before continuing");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Call your API to save the decision
      // The API should return the impacts/deltas so we can update the UI instantly
      // const res = await api.post(`/simulations/${slug}/decisions`, { ... });
      // const impacts = res.data.data.impacts; 
      
      // MOCK IMPACTS FOR DEMONSTRATION (Remove this block when connecting real API)
      const mockImpacts = [
        { displayName: "Team Morale", delta: Math.random() > 0.5 ? 10 : -5 },
        { displayName: "Budget Health", delta: Math.random() > 0.5 ? -10 : 5 },
      ];
      
      // ✅ 2. Update the Variables in the UI immediately
      updateVariablesLocally(mockImpacts);

      // 3. Checkpoint Logic (Redirect after Q6, Q12, Q18)
      const nextIndex = currentIndex + 1;
      if (nextIndex === 6 || nextIndex === 12 || nextIndex === 18) {
        const actNumber = nextIndex / 6;
        router.push(`/simulations/${slug}/act-result?act=${actNumber}`);
        return; // ⛔ STOP EXECUTION - Redirect handles the rest
      }

      // 4. Normal Flow: Go to next question
      if (nextIndex < 25) {
        setCurrentIndex(nextIndex);
        setSelectedOption(null);
      } else {
        // Simulation complete
        router.push(`/simulations/${slug}/result`);
      }
    } catch (err) {
      toast.error("Failed to save decision");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !simulation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F3FF] dark:bg-[#070711]">
        <Loader2 className="w-8 h-8 animate-spin text-[#5a7f2e]" />
      </div>
    );
  }

  // Mock Question Data (Replace with your actual question structure from simulation object)
  const currentQuestion = simulation.questions?.[currentIndex] || {
    id: "temp",
    text: "Scenario description goes here...",
    options: [
      { id: "A", label: "Option A: Take a safe, moderate approach." },
      { id: "B", label: "Option B: Take a high-risk, high-reward bet." },
      { id: "C", label: "Option C: Delegate the decision to your team." },
      { id: "D", label: "Option D: Delay the decision to gather more data." },
    ],
  };

  return (
    <div className="min-h-screen bg-[#F4F3FF] dark:bg-[#070711] p-4 sm:p-8">
      
      {/* ✅ Render the Sidebar Component */}
      <VariableSidebar 
        variables={variables} 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
      />

      <div className={`max-w-3xl mx-auto transition-all duration-300 ${sidebarOpen ? "mr-0" : "mr-0"}`}>
        
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Question {currentIndex + 1} / 25
            </span>
            <span className="font-mono text-xs text-[#5a7f2e] font-semibold uppercase tracking-wider">
              Act {Math.min(Math.floor(currentIndex / 6) + 1, 3)}
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5a7f2e] transition-all duration-500 ease-out"
              style={{ width: `${((currentIndex + 1) / 25) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-6 leading-snug">
            {currentQuestion.text}
          </h2>

          <div className="space-y-3">
            {(currentQuestion.options || []).map((opt: any, i: number) => {
              const optId = typeof opt === "object" ? opt.id : `opt-${i}`;
              const optLabel = typeof opt === "object" ? opt.label || opt.text : opt;
              
              return (
                <button
                  key={optId}
                  onClick={() => setSelectedOption(optId)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedOption === optId
                      ? "border-[#5a7f2e] bg-[#5a7f2e]/10 text-[#5a7f2e] dark:bg-[#5a7f2e]/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedOption === optId 
                        ? "border-[#5a7f2e] bg-[#5a7f2e] text-white" 
                        : "border-slate-300 dark:border-slate-700"
                    }`}>
                      {selectedOption === optId && <CheckCircle2 size={14} />}
                    </div>
                    <span className="text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200">
                      {optLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit / Next Button */}
        <button
          onClick={handleSubmitDecision}
          disabled={!selectedOption || isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#5a7f2e] hover:bg-[#4d6e26] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-base transition-all shadow-sm hover:shadow-md"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {currentIndex === 24 ? "Finish Simulation" : "Confirm Decision"}
              <ArrowRight size={18} />
            </>
          )}
        </button>

      </div>
    </div>
  );
}