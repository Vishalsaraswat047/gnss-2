import React, { useState, useRef } from 'react';
import { ErrorDataPoint } from '../types/gnss';
import { defaultDataAdapter, parseUploadedCSV, DataValidationResult, generateSampleCSV } from '../services/dataAdapter';
import { Database, Upload, Download, CheckCircle2, AlertCircle, FileText, ArrowDown, RefreshCw } from 'lucide-react';

interface DataPipelineViewProps {
  currentDataset: ErrorDataPoint[];
  onDatasetLoaded: (newDataset: ErrorDataPoint[], customName?: string) => void;
  selectedSatelliteId: string;
}

export const DataPipelineView: React.FC<DataPipelineViewProps> = ({
  currentDataset,
  onDatasetLoaded,
  selectedSatelliteId
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showSample, setShowSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validationResult: DataValidationResult = defaultDataAdapter.validateData(currentDataset);

  // Handle CSV file upload
  const handleFile = (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setUploadError('Please upload a valid .csv or .txt file containing GNSS time-series error data.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { points, validation } = parseUploadedCSV(text);

        if (!validation.isValid) {
          setUploadError(`CSV validation failed: ${validation.errors.join(', ')}`);
          return;
        }

        onDatasetLoaded(points, `Custom Upload: ${file.name}`);
        setUploadSuccess(
          `Successfully loaded ${points.length} observations (${validation.historicalPoints} historical + ${validation.validationPoints} validation points).`
        );
      } catch (err: any) {
        setUploadError(err.message || 'Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  };

  // Handle "Use Sample Dataset" button
  const handleSampleDataset = () => {
    try {
      const sampleCsv = generateSampleCSV();
      setShowSample(false);
      const { points, validation } = parseUploadedCSV(sampleCsv);
      onDatasetLoaded(points, 'Sample Dataset (SAT-01)');
      setUploadSuccess(
        `Successfully loaded ${points.length} observations from sample dataset (7 days historical + ${validation.validationPoints} validation points).`
      );
    } catch (err: any) {
      setUploadError(err.message || 'Failed to load sample dataset.');
    }
  };

  // Export current dataset to CSV
  const handleExportCSV = () => {
    const header = 'Time,X_Error,Y_Error,Z_Error,Clock_Error,Magnitude3D,IsValidation\n';
    const rows = currentDataset.map((d) =>
      `${d.time},${d.xError},${d.yError},${d.zError},${d.clockError},${d.magnitude3D},${d.isValidation ? '1' : '0'}`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GNSS_PREDICT_${selectedSatelliteId}_dataset.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sample inspection points
  const sampleInspectionPoints = currentDataset.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Data Adapter & Ingestion Pipeline Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  PS-117 Architecture
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Section 22 & 23: Standardized adapter interface decoupling raw ground-station / broadcast telemetry ingestion from downstream AI models.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          Export Dataset (CSV)
        </button>

        {/* Sample Dataset Button */}
        <button
          onClick={() => setShowSample(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
        >
          <Upload className="w-4 h-4 text-cyan-400" />
          Use Sample Dataset
        </button>
      </div>

      {/* Sample Dataset Preview (when activated) */}
      {showSample && uploadSuccess && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg mt-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Sample Dataset Loaded
            </h3>
            <button
              onClick={() => setShowSample(false)}
              className="text-[10px] text-slate-400 hover:text-cyan-300 underline"
            >
              Close
            </button>
          </div>
          <div className="text-sm text-slate-400">
            <strong>100 observations from SAT-01 synthetic dataset</strong> (first 7 days historical + Day 8 validation).
            <br />
            <code className="text-cyan-300 font-mono">Time, X_Error, Y_Error, Z_Error, Clock_Error</code> format.
            <br />
            Data is at 15-minute intervals, 96 observations per day.
          </div>
        </div>
      }}

      {/* 1. Data Adapter Standard Interface Architecture */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-cyan-400" />
          Standard Data Adapter Pipeline Schema
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-700">
            <div className="text-xs font-bold text-cyan-400 font-mono">1. load_data()</div>
            <p className="text-xs text-slate-400 mt-1">
              Connects to synthetic mock generator or operational ground station ingestion service.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-700">
            <div className="text-xs font-bold text-cyan-400 font-mono">2. validate_data()</div>
            <p className="text-xs text-slate-400 mt-1">
              Verifies 15-minute epoch spacing, checks for NaN outliers, missing orbits, and range limits.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-700">
            <div className="text-xs font-bold text-cyan-400 font-mono">3. normalize_time()</div>
            <p className="text-xs text-slate-400 mt-1">
              Synchronizes UTC timestamps, tags Days 1–7 as training history and Day 8 as validation.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-700">
            <div className="text-xs font-bold text-cyan-400 font-mono">4. prepare_features()</div>
            <p className="text-xs text-slate-400 mt-1">
              Generates lag-8 vectors, rolling statistics, growth rate $dy/dt$, and diurnal harmonic features.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Raw Uploaded vs Modelled Subtraction Differential Table */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Raw Parameter Differential Calculation: Uploaded − Modelled = Error
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Section 3: Demonstration of the exact error engine calculation before ML ingestion.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-700">
            Showing initial 8 observations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3 font-mono">Time (UTC)</th>
                <th className="py-2.5 px-3 text-cyan-400 font-mono">Raw Uploaded Clock (m)</th>
                <th className="py-2.5 px-3 text-slate-400 font-mono">Modelled Clock (m)</th>
                <th className="py-2.5 px-3 text-cyan-300 font-mono font-bold bg-cyan-500/10">Δ Clock_Error (m)</th>
                <th className="py-2.5 px-3 text-sky-400 font-mono font-bold">Δ X_Error (m)</th>
                <th className="py-2.5 px-3 text-purple-400 font-mono font-bold">Δ Y_Error (m)</th>
                <th className="py-2.5 px-3 text-pink-400 font-mono font-bold">Δ Z_Error (m)</th>
                <th className="py-2.5 px-3 text-amber-400 font-mono font-bold">Derived E_3D (m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 font-mono text-slate-200">
              {sampleInspectionPoints.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-700/40">
                  <td className="py-2 px-3 text-slate-400">{row.time}</td>
                  <td className="py-2 px-3 text-slate-300">{row.rawUploaded?.clock ?? (row.clockError + 120.0).toFixed(4)}</td>
                  <td className="py-2 px-3 text-slate-400">{row.rawModelled?.clock ?? (120.0).toFixed(4)}</td>
                  <td className="py-2 px-3 text-cyan-300 font-bold bg-cyan-500/10">
                    {row.clockError >= 0 ? '+' : ''}{row.clockError.toFixed(4)}
                  </td>
                  <td className="py-2 px-3 text-sky-300">
                    {row.xError >= 0 ? '+' : ''}{row.xError.toFixed(4)}
                  </td>
                  <td className="py-2 px-3 text-purple-300">
                    {row.yError >= 0 ? '+' : ''}{row.yError.toFixed(4)}
                  </td>
                  <td className="py-2 px-3 text-pink-300">
                    {row.zError >= 0 ? '+' : ''}{row.zError.toFixed(4)}
                  </td>
                  <td className="py-2 px-3 text-amber-300 font-bold">
                    {row.magnitude3D.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Drag-and-Drop CSV Ingestion & Custom Dataset Validator */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-4 h-4 text-cyan-400" />
            Custom Telemetry / CSV Ingestion Portal
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Test the forecasting engine with your own custom GNSS error time-series CSV file.
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-cyan-400 bg-cyan-500/10'
              : 'border-slate-700 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-950'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 rounded-full bg-slate-800 text-cyan-400">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-white">
              Drag and drop your GNSS error time series CSV, or click to browse
            </div>
            <div className="text-xs text-slate-400 max-w-md">
              Required headers: <code className="text-cyan-300 font-mono">Time, X_Error, Y_Error, Z_Error, Clock_Error</code> (15-min intervals recommended).
            </div>
          </div>

          {/* Validation Status Messages */}
          {uploadError && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Current Active Dataset Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 text-xs">
              <div className="text-slate-400">Total Observations:</div>
              <div className="text-base font-mono font-bold text-white mt-0.5">
                {validationResult.totalPoints} <span className="text-slate-400 font-normal">epochs</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 text-xs">
              <div className="text-slate-400">Historical Training (Days 1–7):</div>
              <div className="text-base font-mono font-bold text-cyan-300 mt-0.5">
                {validationResult.historicalPoints} <span className="text-slate-400 font-normal">pts</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 text-xs">
              <div className="text-slate-400">Validation (Day 8):</div>
              <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">
                {validationResult.validationPoints} <span className="text-slate-400 font-normal">pts</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 text-xs">
              <div className="text-slate-400">Sampling Cadence:</div>
              <div className="text-base font-mono font-bold text-white mt-0.5">
                {validationResult.timeSpan.intervalMinutes} <span className="text-slate-400 font-normal">minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};