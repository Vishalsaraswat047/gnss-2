import React, { useState, useMemo } from 'react';
import { ErrorDataPoint, ForecastHorizon, ModelEvaluationSummary, ModelType } from '../types/gnss';
import { evaluateAllModels } from '../ml/evaluation';
import { FlaskConical, Trophy, Cpu, Zap, CheckCircle, ArrowRight, BarChart2, ShieldCheck, Play } from 'lucide-react';

interface ForecastLabProps {
  dataset: ErrorDataPoint[];
  currentModel: ModelType;
  onSelectModel: (model: ModelType) => void;
  horizon: ForecastHorizon;
}

export const ForecastLab: React.FC<ForecastLabProps> = ({
  dataset,
  currentModel,
  onSelectModel,
  horizon
}) => {
  const [isRunningAll, setIsRunningAll] = useState(false);

  // Compute live real metrics across all 4 models
  const modelSummaries = useMemo(() => {
    return evaluateAllModels(dataset, horizon);
  }, [dataset, horizon]);

  // Find best performing model by Overall RMSE
  const bestModel = useMemo(() => {
    return [...modelSummaries].sort((a, b) => a.overallRMSE - b.overallRMSE)[0];
  }, [modelSummaries]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Forecast Lab — Multi-Model AI/ML Benchmark
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Day 8 Validation Window
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Section 20: Empirical evaluation of Persistence, XGBoost, LSTM, and Temporal Transformer against Day 8 ground truth observations.
              </p>
            </div>
          </div>
        </div>

        {/* Winner Highlight Card */}
        {bestModel && (
          <div className="bg-slate-950 px-4 py-2.5 rounded-lg border border-emerald-500/40 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Top Performing Architecture ({horizon}):
              </div>
              <div className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <span>{bestModel.modelName}</span>
                <span className="font-mono text-xs text-slate-300">
                  (Overall RMSE: {bestModel.overallRMSE.toFixed(4)}m)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Benchmark Comparison Table (Section 20 Specification) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              Day 8 Forecasting Performance Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict chronological testing (Days 1–7 training → Day 8 evaluation). Metrics calculated dynamically from real model inferences.
            </p>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Active Horizon: <strong className="text-cyan-400">{horizon}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px]">
                <th className="py-3 px-3">Model Architecture</th>
                <th className="py-3 px-3 font-mono text-sky-400">X RMSE (m)</th>
                <th className="py-3 px-3 font-mono text-purple-400">Y RMSE (m)</th>
                <th className="py-3 px-3 font-mono text-pink-400">Z RMSE (m)</th>
                <th className="py-3 px-3 font-mono text-cyan-400">Clock RMSE (m)</th>
                <th className="py-3 px-3 font-mono text-amber-400 font-bold">Overall RMSE (m)</th>
                <th className="py-3 px-3 font-mono">Clock MAE (m)</th>
                <th className="py-3 px-3 font-mono">Inference Latency</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-slate-200">
              {modelSummaries.map((summary) => {
                const isSelected = currentModel === summary.modelId;
                const isBest = bestModel.modelId === summary.modelId;

                return (
                  <tr
                    key={summary.modelId}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/10 border-l-2 border-cyan-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3.5 px-3 font-sans">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            summary.modelId === 'persistence'
                              ? 'bg-slate-400'
                              : summary.modelId === 'xgboost'
                              ? 'bg-emerald-400'
                              : summary.modelId === 'lstm'
                              ? 'bg-blue-400'
                              : 'bg-purple-400'
                          }`}
                        ></div>
                        <span className="font-bold text-white text-sm">{summary.modelName}</span>
                        {isBest && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                            ★ Leader
                          </span>
                        )}
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-sans">
                        {summary.description}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-sky-300 font-semibold">
                      {summary.xMetrics.rmse.toFixed(4)}
                    </td>
                    <td className="py-3.5 px-3 text-purple-300 font-semibold">
                      {summary.yMetrics.rmse.toFixed(4)}
                    </td>
                    <td className="py-3.5 px-3 text-pink-300 font-semibold">
                      {summary.zMetrics.rmse.toFixed(4)}
                    </td>
                    <td className="py-3.5 px-3 text-cyan-300 font-bold">
                      {summary.clockMetrics.rmse.toFixed(4)}
                    </td>
                    <td className="py-3.5 px-3 text-amber-300 font-bold text-sm">
                      {summary.overallRMSE.toFixed(4)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {summary.clockMetrics.mae.toFixed(4)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                      {summary.inferenceTimeMs.toFixed(1)} ms
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => onSelectModel(summary.modelId)}
                        disabled={isSelected}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 cursor-default shadow'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700'
                        }`}
                      >
                        {isSelected ? 'Active Model' : 'Select Model'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Archetype Architecture Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Persistence Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase">1. Persistence Baseline</span>
            <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">O(1)</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Maintains the latest observed error value $y(t+h) \approx y(t)$ as the reference baseline required to prove ML performance value.
          </p>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300">
            Clock RMSE: <strong className="text-white">{modelSummaries.find(m => m.modelId === 'persistence')?.clockMetrics.rmse.toFixed(4)}m</strong>
          </div>
        </div>

        {/* XGBoost Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase">2. XGBoost Ensemble</span>
            <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">Gradient Boost</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Gradient boosted decision stumps with feature engineering: lags 0–8, rolling averages, drift gradients, and diurnal harmonic encodings ($\sin/\cos$).
          </p>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300">
            Clock RMSE: <strong className="text-emerald-400">{modelSummaries.find(m => m.modelId === 'xgboost')?.clockMetrics.rmse.toFixed(4)}m</strong>
          </div>
        </div>

        {/* LSTM Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 uppercase">3. LSTM Neural Network</span>
            <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">Recurrent Memory</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Long Short-Term Memory recurrent gating (input, forget, candidate, output) learning time-dependent sequential context over 20-step historical windows.
          </p>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300">
            Clock RMSE: <strong className="text-blue-400">{modelSummaries.find(m => m.modelId === 'lstm')?.clockMetrics.rmse.toFixed(4)}m</strong>
          </div>
        </div>

        {/* Transformer Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400 uppercase">4. Temporal Transformer</span>
            <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">Self-Attention</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Multi-head temporal self-attention with sinusoidal positional encoding capturing long-range orbital resonances and periodic thermal variations.
          </p>
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300">
            Clock RMSE: <strong className="text-purple-400">{modelSummaries.find(m => m.modelId === 'transformer')?.clockMetrics.rmse.toFixed(4)}m</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
