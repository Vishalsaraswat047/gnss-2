import React from 'react';
import { ForecastResponse, SatelliteInfo } from '../types/gnss';
import { Clock, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ClockErrorViewProps {
  satellite: SatelliteInfo;
  forecast: ForecastResponse;
}

export const ClockErrorView: React.FC<ClockErrorViewProps> = ({ satellite, forecast }) => {
  const currentClock = forecast.currentErrors.clock;
  const growthRatePerHour = forecast.trend.growthRatePerHour;

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'RAPIDLY_INCREASING':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'INCREASING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'DECREASING':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'OSCILLATING':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'STABLE':
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Satellite Clock Metadata */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Satellite Clock Error Analysis — {satellite.id}
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {satellite.clockType}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoring and forecasting the time-varying delta between broadcast clock model and uploaded master reference.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-700">
            <div className="text-[10px] uppercase font-semibold text-slate-500">Current Error</div>
            <div className="text-lg font-mono font-bold text-white">
              {currentClock >= 0 ? '+' : ''}{currentClock.toFixed(4)} <span className="text-xs text-slate-400 font-normal">m</span>
            </div>
          </div>

          <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-700">
            <div className="text-[10px] uppercase font-semibold text-slate-500">Clock Trend</div>
            <span
              className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-bold uppercase border ${getTrendBadge(
                forecast.trend.clock
              )}`}
            >
              {forecast.trend.clock.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Discrete Multi-Horizon Forecast Matrix (XGBoost only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 15 min Forecast */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-cyan-500/50 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-cyan-400">15 min Horizon</span>
            <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">+1 Step</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {forecast.predictedErrorsAtHorizon.clock >= 0 ? '+' : ''}{forecast.predictedErrorsAtHorizon.clock.toFixed(4)}{' '}
            <span className="text-xs text-slate-400 font-normal">m</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>95% Bounds:</span>
            <span className="font-mono text-slate-300">
              [{forecast.points[0]?.clockLower.toFixed(3)}, {forecast.points[0]?.clockUpper.toFixed(3)}] m
            </span>
          </div>
          <div className="mt-1 text-xs text-emerald-400 flex items-center justify-between font-mono">
            <span>Actual Day 8:</span>
            <span className="font-semibold">
              {forecast.points[0]?.actualClock !== undefined ? `${forecast.points[0].actualClock.toFixed(4)} m` : '—'}
            </span>
          </div>
        </div>

        {/* 30 min Forecast */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-cyan-500/50 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-cyan-400">30 min Horizon</span>
            <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">+2 Steps</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {forecast.predictedErrorsAtHorizon.clock >= 0 ? '+' : ''}{forecast.predictedErrorsAtHorizon.clock.toFixed(4)}{' '}
            <span className="text-xs text-slate-400 font-normal">m</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>95% Bounds:</span>
            <span className="font-mono text-slate-300">
              [{forecast.points[1]?.clockLower.toFixed(3)}, {forecast.points[1]?.clockUpper.toFixed(3)}] m
            </span>
          </div>
          <div className="mt-1 text-xs text-emerald-400 flex items-center justify-between font-mono">
            <span>Actual Day 8:</span>
            <span className="font-semibold">
              {forecast.points[1]?.actualClock !== undefined ? `${forecast.points[1].actualClock.toFixed(4)} m` : '—'}
            </span>
          </div>
        </div>

        {/* 1 hr Forecast */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-cyan-500/50 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-cyan-400">1 hr Horizon</span>
            <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">+4 Steps</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {forecast.predictedErrorsAtHorizon.clock >= 0 ? '+' : ''}{forecast.predictedErrorsAtHorizon.clock.toFixed(4)}{' '}
            <span className="text-xs text-slate-400 font-normal">m</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>95% Bounds:</span>
            <span className="font-mono text-slate-300">
              [{forecast.points[3]?.clockLower.toFixed(3)}, {forecast.points[3]?.clockUpper.toFixed(3)}] m
            </span>
          </div>
          <div className="mt-1 text-xs text-emerald-400 flex items-center justify-between font-mono">
            <span>Actual Day 8:</span>
            <span className="font-semibold">
              {forecast.points[3]?.actualClock !== undefined ? `${forecast.points[3].actualClock.toFixed(4)} m` : '—'}
            </span>
          </div>
        </div>

        {/* 24 hr Forecast */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-sm hover:border-cyan-500/50 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-cyan-400">24 hr Horizon</span>
            <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">+96 Steps</span>
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {forecast.predictedErrorsAtHorizon.clock >= 0 ? '+' : ''}{forecast.predictedErrorsAtHorizon.clock.toFixed(4)}{' '}
            <span className="text-xs text-slate-400 font-normal">m</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>95% Bounds:</span>
            <span className="font-mono text-slate-300">
              [{forecast.points[95]?.clockLower.toFixed(3)}, {forecast.points[95]?.clockUpper.toFixed(3)}] m
            </span>
          </div>
          <div className="mt-1 text-xs text-emerald-400 flex items-center justify-between font-mono">
            <span>Actual Day 8:</span>
            <span className="font-semibold">
              {forecast.points[95]?.actualClock !== undefined ? `${forecast.points[95].actualClock.toFixed(4)} m` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Risk & Trend Summary */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Risk Level</div>
            <div className={`px-2 py-1 rounded text-xs font-bold uppercase border ${
              forecast.risk.level === 'CRITICAL'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : forecast.risk.level === 'HIGH'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : forecast.risk.level === 'MEDIUM'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40'
            }`}>
              {forecast.risk.level}
            </div>
            <div className="text-xs text-slate-500 mt-1">Score: {forecast.risk.score}/100</div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Growth Rate</div>
            <div className="text-lg font-mono font-bold text-cyan-400 mt-1">
              {(growthRatePerHour * 100).toFixed(2)} cm/hr
            </div>
            <div className="text-[10px] text-slate-500">Linear clock drift rate</div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Trend</div>
            <div className={`px-2 py-1 rounded text-xs font-bold uppercase border ${
              forecast.trend.clock === 'STABLE'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40'
                : forecast.trend.clock === 'INCREASING'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : forecast.trend.clock === 'RAPIDLY_INCREASING'
                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                    : forecast.trend.clock === 'OSCILLATING'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40'
            }`}
            >
              {forecast.trend.clock.replace('_', ' ')}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {forecast.trend.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};