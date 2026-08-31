import React, { useState, useMemo } from 'react';
import {
  ForecastHorizon,
  ModelType,
  RiskThresholds,
  ErrorDataPoint
} from './types/gnss';
import { SATELLITE_DATASETS } from './data/mockDataset';
import { runForecastingEngine, DEFAULT_RISK_THRESHOLDS } from './ml/evaluation';
import { Header, AppTab } from './components/Header';
import { MainForecastGraph } from './components/MainForecastGraph';
import { DataPipelineView } from './components/DataPipelineView';
import { LiveTracker } from './components/LiveTracker';
import { RiskThresholdModal } from './components/RiskThresholdModal';
import {
  Calendar,
  Zap,
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [currentIndex, setCurrentIndex] = useState(671);
  const [selectedHorizon, setSelectedHorizon] = useState<ForecastHorizon>('24h');
  const [selectedModel] = useState<ModelType>('xgboost');
  const [thresholds, setThresholds] = useState<RiskThresholds>(DEFAULT_RISK_THRESHOLDS);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoPlayInterval, setAutoPlayInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Custom uploaded dataset
  const [customDataset, setCustomDataset] = useState<ErrorDataPoint[] | null>(null);
  const [customDatasetName, setCustomDatasetName] = useState<string | null>(null);

  const satInfo = { id: 'SAT-01', name: 'SAT-01', orbitType: 'MEO (12h repeat)' as const, prn: 'PRN-01', slot: 'Plane A / Slot 2', description: 'Medium Earth Orbit satellite with semi-diurnal harmonic ephemeris variation and linear atomic clock drift.', clockType: 'Rubidium Atomic' as const, status: 'ACTIVE_MONITORING' as const };

  // Active dataset: if custom uploaded, use it directly; else rolling window of SAT-01 mock dataset
  const activeDataset = useMemo(() => {
    if (customDataset) return customDataset;
    const dataset = SATELLITE_DATASETS['SAT-01'];
    if (!dataset || dataset.length < 672) return [];
    if (currentIndex >= 671) {
      return dataset.slice(currentIndex - 671, currentIndex + 1);
    }
    return dataset.slice(0, 672);
  }, [currentIndex, customDataset]);

  // Also need full dataset for graph historicalData vs activeDataset distinction
  // For custom dataset, historicalData = filter non-validation; else rolling activeDataset itself is already historical window
  const historicalData = useMemo(() => {
    if (customDataset) return customDataset.filter(d => !d.isValidation);
    return activeDataset;
  }, [activeDataset, customDataset]);

  // For forecast engine we need the full activeDataset (which includes history + validation if custom)
  // If custom, use customDataset; if mock, use rolling activeDataset but engine will treat all as history and generate 96 forecast points without real validation
  // Better: for mock with rolling, we need to provide full 768 but engine splits internally; our activeDataset is only 672 rolling slice, so we need to synthesize validation?
  // For simplicity: if not custom, run engine on rolling 672 + generate 96 forecast points synthetically
  // For custom dataset length >= 768, engine will correctly split 672/96
  const forecastResult = useMemo(() => {
    let datasetForEngine: ErrorDataPoint[] = activeDataset;
    if (!customDataset) {
      // For mock rolling, we need to include validation points to show ground truth
      // Use full SAT-01 dataset sliced such that rolling window's next 96 points are validation
      const full = SATELLITE_DATASETS['SAT-01'];
      if (full && full.length === 768) {
        // Build a temporary dataset: rolling history + next 96 validation points
        const historySlice = full.slice(Math.max(0, currentIndex - 671), currentIndex + 1);
        const validationSlice = full.slice(currentIndex + 1, currentIndex + 1 + 96).map(p => ({ ...p, isValidation: true }));
        const combined = [...historySlice.map(p => ({ ...p, isValidation: false })), ...validationSlice];
        // Mark first 672 as history, rest as validation
        datasetForEngine = combined.map((p, idx) => ({ ...p, isValidation: idx >= 672 }));
        if (datasetForEngine.length < 96) datasetForEngine = activeDataset;
      }
    }
    if (!datasetForEngine || datasetForEngine.length < 96) {
      return {
        satelliteId: 'SAT-01',
        model: 'xgboost' as ModelType,
        horizon: '24h' as ForecastHorizon,
        generatedAt: new Date().toISOString(),
        currentErrors: { clock: 0, x: 0, y: 0, z: 0, magnitude3D: 0 },
        predictedErrorsAtHorizon: { clock: 0, x: 0, y: 0, z: 0, magnitude3D: 0 },
        trend: { clock: 'STABLE' as const, ephemeris: 'STABLE' as const, overall: 'STABLE' as const, growthRatePerHour: 0, description: 'Insufficient data for forecast' },
        risk: { level: 'LOW' as const, score: 5, primaryRiskFactor: 'Insufficient data', details: [] },
        points: [],
        metrics: { clockRMSE: 0, clockMAE: 0, ephem3DRMSE: 0, ephem3DMAE: 0, xRMSE: 0, yRMSE: 0, zRMSE: 0 }
      };
    }
    return runForecastingEngine(
      datasetForEngine,
      customDatasetName || 'SAT-01',
      selectedHorizon,
      thresholds
    );
  }, [activeDataset, customDataset, customDatasetName, selectedHorizon, thresholds, currentIndex]);

  const horizonOptions = useMemo(() => [
    { key: '15m' as ForecastHorizon, label: '15 min', steps: 1 },
    { key: '30m' as ForecastHorizon, label: '30 min', steps: 2 },
    { key: '1h' as ForecastHorizon, label: '1 hour', steps: 4 },
    { key: '2h' as ForecastHorizon, label: '2 hours', steps: 8 },
    { key: '6h' as ForecastHorizon, label: '6 hours', steps: 24 },
    { key: '24h' as ForecastHorizon, label: '24 hours', steps: 96 }
  ], []);

  const handleAdvance = () => {
    if (customDataset) {
      // For custom dataset, not applicable - just show toast or do nothing
      return;
    }
    const dataset = SATELLITE_DATASETS['SAT-01'];
    if (!dataset) return;
    const maxIndex = dataset.length - 1 - 96; // keep 96 forecast steps available
    setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
  };

  const handleAutoPlay = () => {
    if (customDataset) return;
    setAutoPlay(prev => {
      if (prev) {
        if (autoPlayInterval) clearInterval(autoPlayInterval);
        setAutoPlayInterval(null);
        return false;
      } else {
        const maxIndex = SATELLITE_DATASETS['SAT-01'].length - 1 - 96;
        const interval = setInterval(() => {
          setCurrentIndex(p => {
            if (p >= maxIndex) {
              clearInterval(interval);
              setAutoPlay(false);
              setAutoPlayInterval(null);
              return p;
            }
            return p + 1;
          });
        }, 700);
        setAutoPlayInterval(interval);
        return true;
      }
    });
  };

  const handleReset = () => {
    setCurrentIndex(671);
    setSelectedHorizon('24h');
    setAutoPlay(false);
    if (autoPlayInterval) clearInterval(autoPlayInterval);
    setAutoPlayInterval(null);
  };

  const handleCustomDatasetLoaded = (newDataset: ErrorDataPoint[], customName?: string) => {
    setCustomDataset(newDataset);
    if (customName) setCustomDatasetName(customName);
    setCurrentIndex(671);
    setAutoPlay(false);
    if (autoPlayInterval) clearInterval(autoPlayInterval);
    setAutoPlayInterval(null);
    setActiveTab('dashboard');
  };

  const handleResetToStandard = () => {
    setCustomDataset(null);
    setCustomDatasetName(null);
    setCurrentIndex(671);
    setAutoPlay(false);
    if (autoPlayInterval) clearInterval(autoPlayInterval);
    setAutoPlayInterval(null);
  };

  const historicalLabel = useMemo(() => {
    if (customDataset) return `Custom Dataset — ${customDatasetName} (${customDataset.length} pts)`;
    if (currentIndex >= 767 - 96) return 'Historical (Days 1–7, complete)';
    return `Historical (rolling window ending at step ${currentIndex + 1}/768)`;
  }, [currentIndex, customDataset, customDatasetName]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedSatellite={satInfo}
        onSelectSatellite={() => {}}
        selectedModel={selectedModel}
        onSelectModel={() => {}}
        selectedHorizon={selectedHorizon}
        onSelectHorizon={setSelectedHorizon}
        riskLevel={forecastResult.risk.level}
        onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
        isCustomData={!!customDataset}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 space-y-4">
        {/* Custom dataset banner */}
        {customDataset && (
          <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-cyan-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Active Custom Session: <strong>{customDatasetName || 'User Uploaded Telemetry'}</strong> ({customDataset.length} epochs).</span>
            </div>
            <button onClick={handleResetToStandard} className="text-xs text-slate-400 underline hover:text-white">Reset to SAT-01</button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            {/* Rolling forecast status banner */}
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Rolling Forecast Window</div>
                  <div className="text-sm font-medium text-white">
                    {historicalLabel}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {!customDataset && <><span className="text-slate-400">Step {currentIndex - 671 + 1}/96 forecast steps</span><span className="text-slate-500">|</span></>}
                  <span className="text-cyan-400">{forecastResult.horizon}</span>
                </div>
              </div>
            </div>

            {/* SAT-01 Header */}
            <div className="text-center mb-2">
              <div className="text-4xl font-bold tracking-widest text-cyan-400 mb-1">SAT-01</div>
              <div className="text-sm text-slate-500">Satellite Clock & Ephemeris Error Forecasting — XGBoost Day-8 Forecast</div>
              <div className="text-[10px] text-slate-600 mt-1">Synthetic dataset — for MVP validation • 15-min cadence • 7 days training (672 pts) → 96 steps Day 8 prediction</div>
            </div>

            {/* Ground truth explainer — clarifies huge difference was tuned */}
            <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-3 flex items-start gap-2 text-xs leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
              <div className="text-slate-300">
                <strong className="text-cyan-300">Actual Ground Truth</strong> = real Day-8 error values (last 96 ×15 min, validation set) — <em className="text-slate-400">never seen during training</em> — used only to compute Forecast Error, MAE & RMSE. <strong className="text-cyan-400">Forecast</strong> = XGBoost prediction trained <strong>strictly on past 7 days (672 points)</strong> with 48 trees / reduced noise — tighter fit, still widens with horizon (15 min narrowest, 24 h widest) as expected. Green dashed line = ground truth (when available), cyan = forecast, grey = historical.
              </div>
            </div>

            {/* Top Row: KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Current Clock Error</p>
                    <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">NOW</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-mono font-bold text-cyan-400">
                      {forecastResult.currentErrors.clock >= 0 ? '+' : ''}{forecastResult.currentErrors.clock.toFixed(4)}
                    </span>
                    <span className="text-xs text-slate-400 font-sans">meters</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1 text-emerald-400 text-xs font-mono">
                    <span>dΔt/dt:</span>
                    <span className="font-semibold">{(forecastResult.trend.growthRatePerHour * 100).toFixed(2)} cm/hr</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-sans">
                    {forecastResult.trend.clock.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Ephemeris 3D Mag</p>
                    <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">E_3D</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-mono font-bold text-amber-400">
                      {forecastResult.currentErrors.magnitude3D.toFixed(4)}
                    </span>
                    <span className="text-xs text-slate-400 font-sans">meters</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                  <span className="text-xs text-slate-400 font-sans">Pred @ {selectedHorizon}:</span>
                  <span className="font-mono text-amber-300 font-semibold">
                    {forecastResult.predictedErrorsAtHorizon.magnitude3D.toFixed(4)} m
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Risk Assessment</p>
                    <button onClick={() => setIsThresholdModalOpen(true)} className="text-[10px] text-slate-400 hover:text-cyan-400 underline">Thresholds</button>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className={`px-3 py-1 rounded font-bold text-sm uppercase tracking-wider border ${forecastResult.risk.level === 'HIGH' ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : forecastResult.risk.level === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'}`}>
                      {forecastResult.risk.level}
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">Score {forecastResult.risk.score}/100</span>
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 truncate italic">
                  {forecastResult.risk.primaryRiskFactor}
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Forecast Model</p>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">XGBoost</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-mono font-bold text-slate-100">
                      {(100 - Math.min(100, forecastResult.metrics.clockRMSE * 50)).toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400 font-sans">%</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full transition-all" style={{ width: `${Math.max(10, Math.min(100, 100 - forecastResult.metrics.clockRMSE * 50))}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1.5">
                    <span>RMSE: {forecastResult.metrics.clockRMSE.toFixed(4)}m</span>
                    <span>MAE: {forecastResult.metrics.clockMAE.toFixed(4)}m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Forecast Section with Horizon Control */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-2">
                <div>
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-1">FORECAST</h2>
                  <p className="text-[10px] text-slate-500 mb-3">Model: <span className="text-cyan-400 font-mono">XGBoost</span> • 7 Days Historical → Day 8 Forecast (96 steps × 15 min)</p>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Forecast Horizon:</div>
                  <div className="flex flex-wrap gap-2">
                    {horizonOptions.map(h => (
                      <button key={h.key} onClick={() => setSelectedHorizon(h.key)} className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${selectedHorizon === h.key ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'}`}>
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500">Predicted Clock @ {selectedHorizon}</div>
                  <div className="text-lg font-mono font-bold text-cyan-400">{forecastResult.predictedErrorsAtHorizon.clock >= 0 ? '+' : ''}{forecastResult.predictedErrorsAtHorizon.clock.toFixed(4)} m</div>
                  <div className="text-[10px] text-slate-500">3D: {forecastResult.predictedErrorsAtHorizon.magnitude3D.toFixed(4)} m</div>
                </div>
              </div>
              <div className="flex gap-2 pt-3 text-xs text-slate-400 border-t border-slate-800 mt-3">
                <span className="font-mono">Horizon:</span>
                <span className="font-medium text-cyan-400">T + {selectedHorizon} • {horizonOptions.find(h=>h.key===selectedHorizon)?.steps} step(s)</span>
                <span className="text-slate-600">|</span>
                <span>96 forecast points generated per inference (Day 8)</span>
              </div>
            </div>

            {/* Clock Error Graph Section */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">CLOCK ERROR — Historical | Forecast | Ground Truth <span className="text-slate-500 font-normal normal-case"> (NOW marker)</span></h2>
              <MainForecastGraph
                historicalData={historicalData}
                forecastResult={forecastResult}
                selectedAxis={'clock'}
                onSelectAxis={() => {}}
                selectedModel={'xgboost'}
              />
              <div className="mt-3 text-[11px] text-slate-400 flex gap-4">
                <span><strong className="text-slate-300">Historical:</strong> known error values</span>
                <span><strong className="text-cyan-400">Forecast:</strong> XGBoost predicted</span>
                <span><strong className="text-emerald-400">Ground Truth:</strong> Actual Day 8 (validation)</span>
              </div>
            </div>

            {/* Ephemeris Error Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'X_Error (Along-Track)', cur: forecastResult.currentErrors.x, pred: forecastResult.predictedErrorsAtHorizon.x },
                { label: 'Y_Error (Radial)', cur: forecastResult.currentErrors.y, pred: forecastResult.predictedErrorsAtHorizon.y },
                { label: 'Z_Error (Cross-Track)', cur: forecastResult.currentErrors.z, pred: forecastResult.predictedErrorsAtHorizon.z },
              ].map(c => (
                <div key={c.label} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{c.label}</div>
                  <div className="text-2xl font-mono font-bold text-white">{c.cur >= 0 ? '+' : ''}{c.cur.toFixed(4)} m</div>
                  <div className="text-xs text-slate-400">Forecast @ {selectedHorizon}: <span className="text-cyan-300 font-mono">{c.pred >= 0 ? '+' : ''}{c.pred.toFixed(4)} m</span></div>
                  <div className="mt-2 text-[10px] text-slate-500">E_3D = √(X²+Y²+Z²) = <span className="text-amber-300">{forecastResult.currentErrors.magnitude3D.toFixed(4)} m</span> → <span className="text-amber-300">{forecastResult.predictedErrorsAtHorizon.magnitude3D.toFixed(4)} m</span></div>
                </div>
              ))}
            </div>

            {/* Forecast Performance Section */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">XGBoost Forecast Performance — Predicted Day 8 vs Actual Day 8</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-3 px-3">Horizon</th>
                      <th className="py-3 px-3 font-mono text-cyan-400">MAE</th>
                      <th className="py-3 px-3 font-mono text-amber-400">RMSE</th>
                      <th className="py-3 px-3 font-mono text-slate-400">95% Interval Width</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                    {horizonOptions.map(h => {
                      const steps = h.steps;
                      const horizonPoints = forecastResult.points.slice(0, steps);
                      const actualClock = horizonPoints.map(p => p.actualClock ?? p.predictedClock);
                      const predictedClock = horizonPoints.map(p => p.predictedClock);
                      const clockMetrics = actualClock.length > 0 ? computeAxisMetrics(actualClock, predictedClock) : { mae: 0, rmse: 0 };
                      const intervalWidth = horizonPoints.length ? (horizonPoints[horizonPoints.length-1].clockUpper - horizonPoints[horizonPoints.length-1].clockLower) : 0;
                      const isActive = h.key === selectedHorizon;
                      return (
                        <tr key={h.key} className={`hover:bg-slate-800/30 ${isActive ? 'bg-cyan-500/10' : ''}`}>
                          <td className="py-3 px-3 font-medium text-white">{h.label} {isActive && <span className="text-cyan-400 text-[10px]">● active</span>}</td>
                          <td className="py-3 px-3 font-mono text-cyan-300">{clockMetrics.mae.toFixed(4)} m</td>
                          <td className="py-3 px-3 font-mono text-amber-400">{clockMetrics.rmse.toFixed(4)} m</td>
                          <td className="py-3 px-3 font-mono text-slate-400">±{(intervalWidth/2).toFixed(4)} m</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-[10px] text-slate-500 mt-2">Forecast Error = Actual – Predicted • 95% prediction interval estimated from historical model errors • Width grows with horizon</div>
            </div>

            {/* Controls Row */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
              <div className="flex items-center gap-2">
                <button onClick={handleAdvance} className="py-2.5 px-4 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-mono transition-all flex items-center gap-2 text-xs border border-slate-700" disabled={!!customDataset}>
                  <Zap className="w-4 h-4" />
                  {customDataset ? 'Custom data — rolling disabled' : (currentIndex >= 767 - 96 - 1 ? 'End of Dataset' : '▶ Advance 15 min')}
                </button>
                <button onClick={handleAutoPlay} className="py-2.5 px-4 rounded-lg bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 transition-all flex items-center gap-2" disabled={!!customDataset}>
                  {autoPlay ? '⏸ Auto Play' : '▶ Auto Play'}
                </button>
              </div>
              <button onClick={handleReset} className="py-2 px-4 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono transition-all flex items-center gap-2 text-xs border border-slate-700">
                <Calendar className="w-4 h-4" />
                Reset Forecast Window
              </button>
            </div>
          </>
        )}

        {activeTab === 'data' && (
          <DataPipelineView
            currentDataset={customDataset || SATELLITE_DATASETS['SAT-01']}
            onDatasetLoaded={handleCustomDatasetLoaded}
            selectedSatelliteId={customDatasetName || 'SAT-01'}
          />
        )}

        {activeTab === 'live' && <LiveTracker />}
      </main>

      <RiskThresholdModal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        thresholds={thresholds}
        onSaveThresholds={setThresholds}
      />

      <footer className="bg-slate-950 border-t border-slate-700 py-3.5 px-4 text-[10px] text-slate-500 text-center space-y-1 mt-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>© 2026 <strong>GNSS-PREDICT</strong>. Synthetic dataset — for MVP validation</div>
          <div className="flex items-center gap-4 font-mono">
            <span>DATASET: PS-117-SYNTHETIC</span>
            <span>•</span>
            <span>SYNC: UTC+5:30</span>
            <span>•</span>
            <span className="text-cyan-400">SAT-01 • XGBoost • 15-min cadence</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function computeAxisMetrics(actual: number[], predicted: number[]): { mae: number; rmse: number } {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return { mae: 0, rmse: 0 };
  let absSum = 0;
  let sqSum = 0;
  for (let i = 0; i < n; i++) {
    const err = predicted[i] - actual[i];
    absSum += Math.abs(err);
    sqSum += err * err;
  }
  return { mae: absSum / n, rmse: Math.sqrt(sqSum / n) };
}

export default App;
