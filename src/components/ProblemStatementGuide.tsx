import React from 'react';
import { Target, CheckCircle2, XCircle, ShieldCheck, Cpu, Database, Binary, Info } from 'lucide-react';

export const ProblemStatementGuide: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Official Master Problem Statement */}
      <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Target className="w-4 h-4" />
          Official Problem Statement (PS-117)
        </div>

        <blockquote className="text-lg md:text-xl font-bold text-white leading-snug border-l-4 border-cyan-400 pl-4 py-1">
          “To develop AI/ML based models to predict time-varying patterns of the error build up between uploaded and modelled values of both satellite clock and ephemeris parameters of navigation satellites.”
        </blockquote>

        <div className="mt-4 text-xs text-slate-300 leading-relaxed space-y-2">
          <p>
            GNSS satellite navigation accuracy relies on atomic clock synchronization and high-precision orbital ephemerides.
            Ground control stations upload master orbit and clock parameters, while satellite onboard processors broadcast polynomial models. Over time, physical perturbations cause non-linear error build-up between uploaded truth and broadcast models.
          </p>
          <p className="text-cyan-300 font-medium">
            GNSS-PREDICT is an AI/ML forecasting system designed to learn time-varying error dynamics across historical telemetry (Days 1–7) and predict upcoming error build-up across Day 8 horizons (15m to 24 hours).
          </p>
        </div>
      </div>

      {/* Scope Boundaries: What it DOES vs DOES NOT DO (Section 2 Mandate) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WHAT IT DOES */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-wider">
            <CheckCircle2 className="w-5 h-5" />
            What GNSS-PREDICT Does (Exact Scope)
          </div>

          <ul className="space-y-2.5 text-xs text-slate-200">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
              <span><strong>Calculates Error Residuals:</strong> Computes <code className="text-emerald-300 font-mono">Uploaded − Modelled</code> for X, Y, Z ephemeris and clock errors.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
              <span><strong>Learns Historical Dynamics:</strong> Ingests 7 days of 15-minute observations (672 epochs) to capture drift, diurnal thermal cycles, and harmonic resonances.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
              <span><strong>AI/ML Forecasting Engine:</strong> Applies Persistence, XGBoost, LSTM, and Temporal Transformer to predict Day 8 error build-up.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
              <span><strong>Statistical Validation:</strong> Compares Day 8 predicted errors directly against ground truth observations to compute MAE, RMSE, and $R^2$.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
              <span><strong>Risk & Uncertainty Quantization:</strong> Computes 95% confidence intervals and multi-tiered operational risk status (Low, Medium, High, Critical).</span>
            </li>
          </ul>
        </div>

        {/* WHAT IT DOES NOT DO */}
        <div className="bg-slate-900 border border-red-500/30 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm uppercase tracking-wider">
            <XCircle className="w-5 h-5" />
            What GNSS-PREDICT Does NOT Do (Out of Scope)
          </div>

          <ul className="space-y-2.5 text-xs text-slate-200">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
              <span><strong>NOT a Generic Satellite Tracker:</strong> Does not render 3D globe orbital paths, ground tracks, or real-time overhead pass locators.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
              <span><strong>NOT an Arrival Time Predictor:</strong> Does not calculate satellite arrival times or Doppler shifts for ground receivers.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
              <span><strong>NOT a Collision Avoidance Tool:</strong> Does not perform space situational awareness (SSA) or debris conjunction analysis.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
              <span><strong>NOT a User Navigation Solver:</strong> Does not calculate user position/velocity/time (PVT) or atmospheric iono/tropo delays.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
              <span><strong>No Fabricated Operational Claims:</strong> Clearly labels synthetic datasets as prototypes and does not claim official ISRO endorsement.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Core Mathematical Formulations (Section 4 & 19) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Binary className="w-4 h-4 text-cyan-400" />
          Mathematical & Error Formulations
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1">
            <div className="text-cyan-400 font-bold text-sm">Clock Error Residual</div>
            <div className="text-white py-1">e_clk(t) = T_uploaded(t) − T_modelled(t)</div>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              Difference between master atomic time standard and satellite broadcast clock polynomial.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1">
            <div className="text-purple-400 font-bold text-sm">Ephemeris Orbital Errors</div>
            <div className="text-white py-1">e_X(t) = X_up(t) − X_mod(t)</div>
            <div className="text-white py-1">e_Y(t) = Y_up(t) − Y_mod(t)</div>
            <div className="text-white py-1">e_Z(t) = Z_up(t) − Z_mod(t)</div>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              Decomposed orbital errors along Along-track, Radial, and Cross-track coordinate frames.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1">
            <div className="text-amber-400 font-bold text-sm">Derived 3D Magnitude</div>
            <div className="text-white py-1">E_3D(t) = √(e_X² + e_Y² + e_Z²)</div>
            <p className="text-[11px] text-slate-400 font-sans mt-1">
              Total spatial error distance magnitude scalar index for threshold alert triggers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
