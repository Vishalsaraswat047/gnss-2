import React, { useState } from 'react';
import { RiskThresholds } from '../types/gnss';
import { DEFAULT_RISK_THRESHOLDS } from '../ml/evaluation';
import { X, ShieldAlert, Sliders, RotateCcw, Check } from 'lucide-react';

interface RiskThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  thresholds: RiskThresholds;
  onSaveThresholds: (thresholds: RiskThresholds) => void;
}

export const RiskThresholdModal: React.FC<RiskThresholdModalProps> = ({
  isOpen,
  onClose,
  thresholds,
  onSaveThresholds
}) => {
  const [formValues, setFormValues] = useState<RiskThresholds>({ ...thresholds });

  if (!isOpen) return null;

  const handleReset = () => {
    setFormValues({ ...DEFAULT_RISK_THRESHOLDS });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveThresholds(formValues);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configure Risk & Alert Thresholds</h3>
              <p className="text-xs text-slate-400">Section 15: Customize GNSS-PREDICT operational risk trigger boundaries</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-slate-300 font-medium mb-1">
                <span>Clock Error Warning Limit (meters):</span>
                <span className="font-mono text-cyan-300">{formValues.clockErrorWarning} m</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={formValues.clockErrorWarning}
                onChange={(e) =>
                  setFormValues({ ...formValues, clockErrorWarning: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 font-medium mb-1">
                <span>Clock Error Critical Limit (meters):</span>
                <span className="font-mono text-red-400">{formValues.clockErrorCritical} m</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.0"
                step="0.05"
                value={formValues.clockErrorCritical}
                onChange={(e) =>
                  setFormValues({ ...formValues, clockErrorCritical: parseFloat(e.target.value) })
                }
                className="w-full accent-red-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 font-medium mb-1">
                <span>Ephemeris 3D Error Warning Envelope (meters):</span>
                <span className="font-mono text-purple-300">{formValues.ephem3DWarning} m</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={formValues.ephem3DWarning}
                onChange={(e) =>
                  setFormValues({ ...formValues, ephem3DWarning: parseFloat(e.target.value) })
                }
                className="w-full accent-purple-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 font-medium mb-1">
                <span>Ephemeris 3D Error Critical Envelope (meters):</span>
                <span className="font-mono text-red-400">{formValues.ephem3DCritical} m</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="5.0"
                step="0.1"
                value={formValues.ephem3DCritical}
                onChange={(e) =>
                  setFormValues({ ...formValues, ephem3DCritical: parseFloat(e.target.value) })
                }
                className="w-full accent-red-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 font-medium mb-1">
                <span>Clock Drift Rate Warning (m/hr):</span>
                <span className="font-mono text-amber-300">{formValues.driftRateWarning} m/hr</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.30"
                step="0.01"
                value={formValues.driftRateWarning}
                onChange={(e) =>
                  setFormValues({ ...formValues, driftRateWarning: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors shadow-md shadow-cyan-500/20"
              >
                <Check className="w-4 h-4" />
                Apply Thresholds
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
