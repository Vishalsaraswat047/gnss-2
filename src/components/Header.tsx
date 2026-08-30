import React from 'react';
import { ForecastHorizon, ModelType, RiskLevel, SatelliteInfo } from '../types/gnss';
import { SATELLITES } from '../data/mockDataset';
import { Satellite, Cpu, Clock, ShieldAlert, Layers, Database, HelpCircle, Info } from 'lucide-react';

export type AppTab = 'dashboard' | 'data';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  selectedSatellite: SatelliteInfo;
  onSelectSatellite: (sat: SatelliteInfo) => void;
  selectedModel: ModelType;
  onSelectModel: (model: ModelType) => void;
  selectedHorizon: ForecastHorizon;
  onSelectHorizon: (horizon: ForecastHorizon) => void;
  riskLevel: RiskLevel;
  onOpenThresholdModal: () => void;
  isCustomData?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  selectedSatellite,
  onSelectSatellite,
  selectedModel,
  onSelectModel,
  selectedHorizon,
  onSelectHorizon,
  riskLevel,
  onOpenThresholdModal,
  isCustomData
}) => {
  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30';
      case 'LOW':
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40 hover:bg-emerald-500/30';
    }
  };

  return (
    <header className="bg-[#0A0C10] border-b border-slate-800 sticky top-0 z-40">
      {/* 1. Subtle data-source note (no "Prototype Mode" banner) */}
      <div className="bg-slate-950/80 border-b border-slate-700/60 px-4 py-1.5 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1">
        <Info className="w-3 h-3 text-slate-400 shrink-0" />
        <span>
          <strong className="font-semibold uppercase tracking-wider text-slate-400">Synthetic dataset — for MVP validation</strong>
        </span>
      </div>

      {/* 2. Main Navigation & Control Bar */}
      <div className="max-w-7xl mx-auto px-4 pt-3 pb-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-black shadow-sm flex items-center justify-center">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center">
                  GNSS-PREDICT
                  <span className="text-cyan-400 font-mono text-xs ml-2 px-1.5 py-0.5 border border-cyan-500/30 bg-cyan-500/10 rounded">
                    v1.0.4-MVP
                  </span>
                </h1>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-medium">
                Satellite Clock & Ephemeris Error Forecasting System
              </p>
            </div>
          </div>

          {/* SAT-01 display (no selector - fixed for MVP) */}
          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-lg p-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Sat:</span>
            <span className="text-xs font-mono text-white font-bold">SAT-01</span>
          </div>

          {/* Model display (no selector - XGBoost only for MVP) */}
          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 rounded-lg p-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Model:</span>
            <span className="text-xs font-mono text-cyan-400 font-bold">XGBoost</span>
          </div>
        </div>

        {/* 3. Navigation Tabs (Dashboard + Data Ingestion only) */}
        <nav className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/80 overflow-x-auto scrollbar-none">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'dashboard'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Core Dashboard
          </button>

          <button
            onClick={() => onTabChange('data')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === 'data'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Data Ingestion
          </button>
        </nav>
      </div>
    </header>
  );
};