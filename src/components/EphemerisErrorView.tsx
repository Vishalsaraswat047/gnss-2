import React from 'react';
import { ForecastResponse, SatelliteInfo } from '../types/gnss';
import { Orbit, Box, TrendingUp, ShieldCheck } from 'lucide-react';

interface EphemerisErrorViewProps {
  satellite: SatelliteInfo;
  forecast: ForecastResponse;
}

export const EphemerisErrorView: React.FC<EphemerisErrorViewProps> = ({ satellite, forecast }) => {
  const curr = forecast.currentErrors;
  const pred = forecast.predictedErrorsAtHorizon;
  const metrics = forecast.metrics;

  // 3D magnitude calculation
  const curr3D = Math.round(Math.sqrt(curr.x ** 2 + curr.y ** 2 + curr.z ** 2) * 10000) / 10000;
  const pred3D = Math.round(Math.sqrt(pred.x ** 2 + pred.y ** 2 + pred.z ** 2) * 10000) / 10000;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Orbit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Satellite Ephemeris (Orbital) Error Analysis — {satellite.id}
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {satellite.orbitType}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                3-Axis decomposed orbital state error between uploaded ephemeris and broadcast modelled ephemeris parameters.
              </p>
            </div>
          </div>
        </div>

        {/* 3D Magnitude Highlight */}
        <div className="bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-700 flex items-center gap-3">
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-400">
              Current Derived 3D Error (E_3D)
            </div>
            <div className="text-xl font-mono font-bold text-white">
              {curr3D.toFixed(4)} <span className="text-xs text-slate-400 font-normal">m</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-cyan-400">
              Forecast @ {forecast.horizon}
            </div>
            <div className="text-xl font-mono font-bold text-cyan-400">
              {pred3D.toFixed(4)} m
            </div>
          </div>
        </div>
      </div>

      {/* X, Y, Z Error Cards (4 cards inline) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* X Axis Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span>X_Error</span>
          </div>
          <div className="text-sm font-mono font-bold text-sky-300">
            {curr.x >= 0 ? '+' : ''}{curr.x.toFixed(4)} m
          </div>
          <div className="text-xs text-slate-400">
            Forecast @ {forecast.horizon}: {
              pred.x >= 0 ? '+' + pred.x.toFixed(4) + ' m' : pred.x.toFixed(4) + ' m'
            }
          </div>
        </div>

        {/* Y Axis Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span>Y_Error</span>
          </div>
          <div className="text-sm font-mono font-bold text-purple-300">
            {curr.y >= 0 ? '+' : ''}{curr.y.toFixed(4)} m
          </div>
          <div className="text-xs text-slate-400">
            Forecast @ {forecast.horizon}: {
              pred.y >= 0 ? '+' + pred.y.toFixed(4) + ' m' : pred.y.toFixed(4) + ' m'
            }
          </div>
        </div>

        {/* Z Axis Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-400"></span>
            <span>Z_Error</span>
          </div>
          <div className="text-sm font-mono font-bold text-pink-300">
            {curr.z >= 0 ? '+' : ''}{curr.z.toFixed(4)} m
          </div>
          <div className="text-xs text-slate-400">
            Forecast @ {forecast.horizon}: {
              pred.z >= 0 ? '+' + pred.z.toFixed(4) + ' m' : pred.z.toFixed(4) + ' m'
            }
          </div>
        </div>

        {/* Combined 3D Magnitude Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-amber-400 font-bold">E_3D Magnitude</span>
            <div className="text-2xl font-mono font-bold text-amber-400">
              {curr3D.toFixed(4)} m
            </div>
          </div>
          <div>
            <span className="text-cyan-400 font-bold">Forecast</span>
            <div className="text-2xl font-mono font-bold text-cyan-400">
              {pred3D.toFixed(4)} m
            </div>
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg">
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
          <div className="text-xs text-slate-500 mt-1">
            Primary: {forecast.risk.primaryRiskFactor}
          </div>
        </div>
      </div>
    </div>
  );
};