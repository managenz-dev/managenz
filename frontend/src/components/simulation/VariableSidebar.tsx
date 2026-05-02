// frontend/src/components/simulation/VariableSidebar.tsx
"use client";
import { ChevronRight, ChevronLeft, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface VariableData {
  displayName: string;
  description: string;
  currentValue: number;
  previousValue: number;
  unit: string;
}

interface VariableSidebarProps {
  variables: VariableData[];
  isOpen: boolean;
  onToggle: () => void;
}

export default function VariableSidebar({ variables, isOpen, onToggle }: VariableSidebarProps) {
  return (
    <>
      {/* Toggle Button (Floating on the side) */}
      <button
        onClick={onToggle}
        className={`fixed top-1/2 -translate-y-1/2 z-50 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all ${
          isOpen ? "right-[310px]" : "right-0"
        }`}
        aria-label={isOpen ? "Collapse metrics" : "Expand metrics"}
      >
        {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Sidebar Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-40 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#5a7f2e]" />
            <h3 className="font-display font-bold text-slate-900 dark:text-white">Live Metrics</h3>
          </div>
          <p className="font-body text-xs text-slate-500 dark:text-slate-400">
            Updated in real-time based on your decisions.
          </p>
        </div>

        {/* Variables List */}
        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100vh-85px)] scrollbar-thin">
          {variables.map((v) => {
            const delta = v.currentValue - v.previousValue;
            const status =
              v.currentValue >= 70
                ? "good"
                : v.currentValue >= 50
                ? "fair"
                : "poor";
            
            const color =
              status === "good"
                ? "bg-emerald-500"
                : status === "fair"
                ? "bg-amber-500"
                : "bg-rose-500";

            const textColor =
              status === "good"
                ? "text-emerald-500"
                : status === "fair"
                ? "text-amber-500"
                : "text-rose-500";

            return (
              <div
                key={v.displayName}
                className="group relative p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-[#5a7f2e]/40 transition-colors"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-body text-sm font-semibold text-slate-800 dark:text-white">
                      {v.displayName}
                    </span>
                    {/* Info Tooltip Icon */}
                    <div className="relative">
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 hidden group-hover:block z-50 bg-slate-900 text-white text-xs rounded-lg shadow-xl pointer-events-none">
                        <p className="font-semibold mb-1 text-[#5a7f2e]">{v.displayName}</p>
                        <p className="leading-relaxed">{v.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Value & Delta */}
                  <div className="flex items-center gap-2">
                    {delta > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    ) : delta < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span className={`font-mono text-sm font-bold ${textColor}`}>
                      {v.currentValue}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
                    style={{ width: `${v.currentValue}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}