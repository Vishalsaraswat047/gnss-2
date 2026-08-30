import React, { useState, useMemo, useEffect } from 'react';
import {
  ForecastHorizon,
  ModelType,
  RiskThresholds,
  SatelliteInfo,
  ErrorDataPoint
} from './types/gnss';
import { SATELLITES, SATELLITE_DATASETS } from './data/mockDataset';
import { runForecastingEngine } from './ml/evaluation';
import { Header, AppTab } from './components/Header';
import { SystemFlowBar } from './components/SystemFlowBar';
import { MainForecastGraph, ErrorAxis } from './components/MainForecastGraph';
import { ClockErrorView } from './components/ClockErrorView';
import { EphemerisErrorView } from './components/EphemerisErrorView';
import { DataPipelineView } from './components/DataPipelineView';
import { ProblemStatementGuide } from './components/ProblemStatementGuide';
import { RiskThresholdModal } from './components/RiskThresholdModal';
import {
  Clock,
  Orbit,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Database,
  Sparkles,
  CheckCircle2,
  Calendar,
  Zap,
  Radio,
  ExternalLink
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [currentIndex, setCurrentIndex] = useState(671);
  const [selectedHorizon, setSelectedHorizon] = useState<ForecastHorizon>('24h');
  const [selectedModel, setSelectedModel] = useState<ModelType>('xgboost');
  const [thresholds, setThresholds] = useState<RiskThresholds>(DEFAULT_RISK_THRESHOLDS);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [autoPlayInterval, setAutoPlayInterval] = useState<NodeJS.Timeout | null>(null);

  // Fixed SAT-01 satellite for MVP (no selector)
  const satInfo = { id: 'SAT-01', name: 'SAT-01', orbitType: 'MEO (12h repeat)', prn: 'PRN-01', slot: 'Plane A / Slot 2', description: 'Medium Earth Orbit satellite with semi-diurnal harmonic ephemeris variation and linear atomic clock drift.', clockType: 'Rubidium Atomic', status: 'ACTIVE_MONITORING' };

  // Rolling historical dataset: 672 points (7 days) ending at currentIndex
  // When currentIndex = 671, historical = first 672 points (Days 1-7, fixed)
  // When currentIndex advances, historical window rolls forward with latest data
  const activeDataset = useMemo(() => {
    const dataset = SATELLITE_DATASETS['SAT-01'];
    if (!dataset || dataset.length < 672) return [];
    if (currentIndex >= 671) {
      // Rolling window: last 672 points ending at currentIndex
      return dataset.slice(currentIndex - 671, currentIndex + 1);
    }
    // Fixed first 672 points (Days 1-7)
    return dataset.slice(0, 672);
  }, [currentIndex]);

  // Execute XGBoost forecasting engine over active rolling dataset
  const forecastResult = useMemo(() => {
    if (!activeDataset || activeDataset.length < 96) {
      return {
        satelliteId: 'SAT-01',
        model: 'xgboost',
        horizon: '24h',
        generatedAt: new Date().toISOString(),
        currentErrors: { clock: 0, x: 0, y: 0, z: 0, magnitude3D: 0 },
        predictedErrorsAtHorizon: { clock: 0, x: 0, y: 0, z: 0, magnitude3D: 0 },
        trend: { clock: 'STABLE', ephemeris: 'STABLE', overall: 'STABLE', growthRatePerHour: 0, description: 'Insufficient data for forecast' },
        risk: { level: 'LOW', score: 5, primaryRiskFactor: 'Insufficient data', details: [] },
        points: [],
        metrics: { clockRMSE: 0, clockMAE: 0, ephem3DRMSE: 0, ephem3DMAE: 0, xRMSE: 0, yRMSE: 0, zRMSE: 0 }
      };
    }
    return runForecastingEngine(
      activeDataset,
      'SAT-01',
      selectedHorizon,
      thresholds
    );
  }, [activeDataset, selectedHorizon, thresholds]);

  // Horizon step options for UI display
  const horizonOptions = useMemo(() => [
    { key: '15m', label: '15 min', steps: 1 },
    { key: '30m', label: '30 min', steps: 2 },
    { key: '1h', label: '1 hour', steps: 4 },
    { key: '2h', label: '2 hours', steps: 8 },
    { key: '6h', label: '6 hours', steps: 24 },
    { key: '24h', label: '24 hours', steps: 96 }
  ], []);

  // Advance 15 minutes: rolls the historical window forward
  const handleAdvance = () => {
    const dataset = SATELLITE_DATASETS['SAT-01'];
    if (!dataset) return;
    const maxIndex = dataset.length - 1;
    // Can advance as long as we have enough points for at least 15-min forecast
    setCurrentIndex(prev => {
      const newIndex = Math.min(prev + 1, maxIndex);
      return newIndex;
    });
  };

  // Auto-play: advance one 15-min step at a time
  const handleAutoPlay = () => {
    setAutoPlay(prev => {
      if (prev) {
        if (autoPlayInterval) clearInterval(autoPlayInterval);
        return false;
      } else {
        const maxIndex = SATELLITE_DATASETS['SAT-01'].length - 1;
        const interval = setInterval(() => {
          setCurrentIndex(prev => {
            if (prev >= maxIndex - 1) {
              clearInterval(autoPlayInterval);
              setAutoPlay(false);
              return prev;
            }
            return Math.min(prev + 1, maxIndex - 1);
          });
        }, 600); // Demo: 600ms per step; would be 900000ms (15 min) in production
        setAutoPlay(true);
        setAutoPlayInterval(interval);
        return true;
      }
    });
  };

  // Reset to initial state
  const handleReset = () => {
    setCurrentIndex(671);
    setSelectedHorizon('24h');
    setAutoPlay(false);
    if (autoPlayInterval) clearInterval(autoPlayInterval);
    setAutoPlayInterval(null);
  };

  // Compute derived clock error trend string
  const trendLabel = useMemo(() => {
    if (!forecastResult.trend) return 'STABLE';
    return forecastResult.trend.clock;
  }, [forecastResult.trend]);

  // Historical label based on current index position
  const historicalLabel = useMemo(() => {
    if (currentIndex >= 767) return 'Historical (Days 1–7, complete)';
    const remaining = 768 - currentIndex;
    const daysCompleted = Math.floor((672 - remaining) / 96) + 1;
    return `Historical (Days ${daysCompleted - 7}–7, step ${currentIndex - 671 + 1}/672)`;
  }, [currentIndex]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. Header & Navigation */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedSatellite={satInfo}
        onSelectSatellite={() => {/* SAT-01 fixed for MVP */}
        }
        selectedModel={selectedModel}
        onSelectModel={() => {/* XGBoost fixed for MVP */}
        }
        selectedHorizon={selectedHorizon}
        onSelectHorizon={setSelectedHorizon}
        riskLevel={forecastResult.risk.level}
        onOpenThresholdModal={() => setIsThresholdModalOpen(true)}
        isCustomData={false}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 space-y-4">

        {/* Rolling forecast status banner */}
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Rolling Forecast Window</div>
              <div className="text-sm font-medium text-white">
                {historicalLabel}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Step {currentIndex - 671 + 1}/672</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400">{forecastResult.horizon}</span>
            </div>
          </div>
        </div>

        {/* 3. Dashboard Structure per Requirement 21 */}
        
        {/* SAT-01 Header */}
        <div className="text-center mb-4">
          <div className="text-4xl font-bold tracking-widest text-cyan-400 mb-1">SAT-01</div>
          <div className="text-sm text-slate-500">Satellite Clock & Ephemeris Error Forecasting</div>
        </div>

        {/* Top Row: KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Clock Error Card */}
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

          {/* Ephemeris 3D Magnitude Card */}
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

          {/* Risk Assessment Card */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Risk Assessment</p>
                <button
                  onClick={() => setIsThresholdModalOpen(true)}
                  className="text-[10px] text-slate-400 hover:text-cyan-400 underline"
                >
                  Thresholds
                </button>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <div
                  className={`px-3 py-1 rounded font-bold text-sm uppercase tracking-wider border ${
                    forecastResult.risk.level === 'CRITICAL'
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                      : forecastResult.risk.level === 'HIGH'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                        : forecastResult.risk.level === 'MEDIUM'
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                          : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  }`}
                >
                  {forecastResult.risk.level}
                </div>
                <span className="text-[11px] font-mono text-slate-400">Score {forecastResult.risk.score}/100</span>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 truncate italic">
              {forecastResult.risk.primaryRiskFactor}
            </div>
          </div>

          {/* Forecast Model Card */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Forecast Model</p>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  XGBoost
                </span>
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
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.max(10, Math.min(100, 100 - forecastResult.metrics.clockRMSE * 50))}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1.5">
                <span>RMSE: {forecastResult.metrics.clockRMSE.toFixed(4)}m</span>
                <span>MAE: {forecastResult.metrics.clockMAE.toFixed(4)}m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Forecast Section with Horizon Control */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">FORECAST</h2>
              <div className="flex gap-2">
                <button
                  key="15m"
                  onClick={() => setSelectedHorizon('15m')}
                  className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                    selectedHorizon === '15m' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
                  }`}
                >
                  [ 15m ]
                </button>
                <button
                  key="30m"
                  onClick={() => setSelectedHorizon('30m')}
                  className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                    selectedHorizon === '30m' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
                  }`}
                >
                  [ 30m ]
                </button>
                <button
                  key="1h"
                  onClick={() => setSelectedHorizon('1h')}
                  className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                    selectedHorizon === '1h' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
                  }`}
                >
                  [ 1h ]
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  key="2h"
                  onClick={() => setSelectedHorizon('2h')}
                  className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                    selectedHorizon === '2h' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
                  }`}
                >
                  [ 2h ]
                </button>
                <button
                  key="6h"
                  onClick={() => setSelectedHorizon('6h')}
                  className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                    selectedHorizon === '6h' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
                  }`}
                >
                  [ 6h ]
                </button>
                <button
                  key="24h"
                  onClick={() => setSelectedHorizon('24h')}
                  className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                    selectedHorizon === '24h' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
                  }`}
                >
                  [ 24h ]
                </button>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 text-right">
                <span className="text-[10px] text-slate-500">Model: XGBoost</span>
              </div>
            </div>
          </div>

          {/* Forecast Horizon Info */}
          <div className="flex flex-col lg:flex-row gap-2 pt-3 text-xs text-slate-400">
            <span className="font-mono">Horizon steps:</span>
            <span className="font-medium text-cyan-400">{forecastResult.points.length > 0 ? forecastResult.points.length : '—'} steps (T + {selectedHorizon})</span>
          </div>
        </div>

        {/* Clock Error Graph Section */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">CLOCK ERROR</h2>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="lg:col-span-6">
              <MainForecastGraph
                historicalData={activeDataset}
                forecastResult={forecastResult}
                selectedAxis={'clock'}
                onSelectAxis={() => {}}
                selectedModel={'xgboost'}
              />
            </div>
            <div className="lg:col-span-6 bg-slate-900/80 p-4 rounded-lg border border-slate-700">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">NOW Marker</div>
              <div className="h-20 bg-slate-800 rounded-lg border border-slate-700 relative overflow-hidden">
                {/* Historical line */}
                {/* Forecast line */}
                {/* NOW vertical marker */}
                {/* Confidence band */}
                <div className="absolute w-1 top-0 bottom-0 bg-cyan-400 opacity-80 left-1/2 transform -translate-x-0.5 hidden">
                  <span className="absolute -top-1/2 left-1/2 text-xs text-cyan-400 font-mono">NOW</span>
                </div>
                {/* Confidence interval fill */}
                <div className="absolute inset-0 bg-cyan-500/20 rounded-lg overflow-hidden">
                  <div className="h-full bg-cyan-500/50 transition-all duration-500" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-400">
                <strong>Historical:</strong> Error values already known from the dataset<br />
                <strong>Forecast:</strong> XGBoost predicted future values<br />
                <strong>Ground Truth:</strong> Actual Day 8 values (when available)
              </div>
            </div>
          </div>
        </div>

        {/* Ephemeris Error Section */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          {/* X Error */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">X_Error (Along-Track)</span>
              <span className="text-xs font-mono text-amber-400">|</span>
            </div>
            <div className="text-2xl font-mono font-bold text-white">
              {forecastResult.currentErrors.x >= 0 ? '+' : ''}{forecastResult.currentErrors.x.toFixed(4)} m
            </div>
            <div className="text-sm text-slate-400">
              Forecast @ {selectedHorizon}: {
                forecastResult.predictedErrorsAtHorizon.x >= 0
                  ? '+' + forecastResult.predictedErrorsAtHorizon.x.toFixed(4) + ' m'
                  : forecastResult.predictedErrorsAtHorizon.x.toFixed(4) + ' m'
              }
            </div>
          </div>

          {/* Y Error */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Y_Error (Radial)</span>
              <span className="text-xs font-mono text-amber-400">|</span>
            </div>
            <div className="text-2xl font-mono font-bold text-white">
              {forecastResult.currentErrors.y >= 0 ? '+' : ''}{forecastResult.currentErrors.y.toFixed(4)} m
            </div>
            <div className="text-sm text-slate-400">
              Forecast @ {selectedHorizon}: {
                forecastResult.predictedErrorsAtHorizon.y >= 0
                  ? '+' + forecastResult.predictedErrorsAtHorizon.y.toFixed(4) + ' m'
                  : forecastResult.predictedErrorsAtHorizon.y.toFixed(4) + ' m'
              }
            </div>
          </div>

          {/* Z Error */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Z_Error (Cross-Track)</span>
              <span className="text-xs font-mono text-amber-400">|</span>
            </div>
            <div className="text-2xl font-mono font-bold text-white">
              {forecastResult.currentErrors.z >= 0 ? '+' : ''}{forecastResult.currentErrors.z.toFixed(4)} m
            </div>
            <div className="text-sm text-slate-400">
              Forecast @ {selectedHorizon}: {
                forecastResult.predictedErrorsAtHorizon.z >= 0
                  ? '+' + forecastResult.predictedErrorsAtHorizon.z.toFixed(4) + ' m'
                  : forecastResult.predictedErrorsAtHorizon.z.toFixed(4) + ' m'
              }
            </div>
          </div>
        </div>

        {/* Forecast Performance Section */}
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">FORECAST PERFORMANCE</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-3">Horizon</th>
                  <th className="py-3 px-3 font-mono text-cyan-400">MAE</th>
                  <th className="py-3 px-3 font-mono text-amber-400">RMSE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                {horizonOptions.map((h) => {
                  const steps = h.steps;
                  const horizonPoints = forecastResult.points.slice(0, steps);
                  const actualClock = horizonPoints.map((p) => p.actualClock ?? p.predictedClock);
                  const predictedClock = horizonPoints.map((p) => p.predictedClock);
                  const clockMetrics = actualClock.length > 0
                    ? computeAxisMetrics(actualClock, predictedClock)
                    : { mae: 0, rmse: 0 };

                  return (
                    <tr key={h.key} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 font-medium text-white">{h.label}</td>
                      <td className="py-3 px-3 font-mono text-cyan-300">{clockMetrics.mae.toFixed(4)} m</td>
                      <td className="py-3 px-3 font-mono text-amber-400">{clockMetrics.rmse.toFixed(4)} m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          {/* Advance controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdvance}
              className="py-2 px-4 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono transition-all flex items-center gap-2"
              disabled={currentIndex >= 767 - 1}
            >
              <Zap className="w-4 h-4" />
              {currentIndex >= 767 - 1 ? 'End of Dataset' : '▶ Advance 15 min'}
            </button>
            <button
              onClick={handleAutoPlay}
              className="py-2 px-4 rounded bg-cyan-600 text-white text-[10px] font-bold hover:bg-cyan-500 transition-all flex items-center gap-2"
              disabled={currentIndex >= 767 - 1}
            >
              {autoPlay ? '⏸️ Auto Play Paused' : '⏭️ Auto Play'}
            </button>
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="py-2 px-4 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-mono transition-all"
          >
            <Calendar className="w-4 h-4" />
            Reset Forecast Window
          </button>
        </div>

      </main>

      {/* 4. Risk Threshold Configuration Modal */}
      <RiskThresholdModal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        thresholds={thresholds}
        onSaveThresholds={setThresholds}
      />

      {/* 5. Footer & Scientific Disclaimers */}
      <footer className="bg-slate-950 border-t border-slate-700 py-3.5 px-4 text-[10px] text-slate-500 text-center space-y-1 mt-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © 2026 <strong>GNSS-PREDICT</strong>. Proprietary Analytical Tool for Error Pattern Identification.
          </div>
          <div className="flex items-center gap-4 font-mono">
            <span>DATASET: PS-117-SYNTHETIC</span>
            <span>•</span>
            <span>SYNC: UTC+5:30</span>
            <span>•</span>
            <button
              onClick={() => setActiveTab('guide')}
              className="text-cyan-400 hover:text-cyan-300 underline"
            >
              PS-117 Specs
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper: compute axis metrics (copied from evaluation.ts for standalone use)
function computeAxisMetrics(actual: number[], predicted: number[]): { mae: number; rmse: number } {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return { mae: 0, rmse: 0 };

  let absSum = 0;
  let sqSum = 0;

  for (let i = 0; i < n; i++) {
    const err = predicted[i] - actual[i];
    const absErr = Math.abs(err);
    absSum += absErr;
    sqSum += err * err;
  }

  const mae = absSum / n;
  const rmse = Math.sqrt(sqSum / n);

  return { mae, rmse };
}

export default App;