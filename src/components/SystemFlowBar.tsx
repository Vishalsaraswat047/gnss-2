import React from 'react';
import { Database, AlertTriangle, LayoutDashboard, Layers } from 'lucide-react';

interface SystemFlowBarProps {
  activeStep?: number;
  onStepClick?: (stepIndex: number) => void;
}

export const SystemFlowBar: React.FC<SystemFlowBarProps> = ({ activeStep = 5, onStepClick }) => {
  // Simplified flow for MVP: only 3 core steps
  const steps = [
    { id: 1, label: 'Data Ingestion', short: 'CSV Upload', icon: Database },
    { id: 2, label: 'XGBoost Forecast', short: 'AI Prediction', icon: AlertTriangle },
    { id: 3, label: 'Dashboard', short: 'Monitoring', icon: LayoutDashboard },
  ];

  return (
    <div className="w-full bg-slate-900/90 border-y border-slate-700 px-4 py-2.5 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 pb-1 pt-0.5 gap-2">
        <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          System Flow
        </div>

        <div className="flex items-center gap-1.5 min-w-max">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCurrent = activeStep === step.id;
            const isPassed = activeStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => onStepClick && onStepClick(step.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    isCurrent
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20 ring-1 ring-cyan-500/30'
                      : isPassed
                        ? 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-800 hover:text-white'
                        : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-slate-300'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-cyan-400 text-slate-950'
                        : isPassed
                          ? 'bg-emerald-500/80 text-white'
                          : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {step.id}
                  </span>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.short}</span>
                </button>

                {idx < steps.length - 1 && (
                  <span className="w-3.5 h-3.5 text-slate-600 shrink-0">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};