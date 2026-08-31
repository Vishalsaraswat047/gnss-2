import React, { useState, useRef } from 'react';
import { ErrorDataPoint } from '../types/gnss';
import { defaultDataAdapter, parseUploadedCSV, DataValidationResult, generateSampleCSV } from '../services/dataAdapter';
import { Database, Upload, Download, CheckCircle2, AlertCircle, FileText, RefreshCw } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validationResult: DataValidationResult = defaultDataAdapter.validateData(currentDataset);

  const handleFile = (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt');
    const isXlsx = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
    if (!isCsv && !isXlsx) {
      setUploadError('Please upload a valid .csv, .txt or .xlsx file. Required columns: Time, X_Error, Y_Error, Z_Error, Clock_Error');
      return;
    }

    // For xlsx, we instruct to export as CSV - simple path: read as text and try parse; if binary, show error with guidance
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        // quick binary check - if contains many non-ASCII, likely xlsx binary
        if (isXlsx && text.charCodeAt(0) === 80 && text.charCodeAt(1) === 75) {
          setUploadError('XLSX detected. Please export/save your Excel file as CSV (File → Save As → CSV UTF-8) and re-upload. Expected header: Time, X_Error, Y_Error, Z_Error, Clock_Error');
          return;
        }
        const { points, validation } = parseUploadedCSV(text);

        if (!validation.isValid) {
          setUploadError(`CSV validation failed: ${validation.errors.join(', ')}`);
          return;
        }
        if (validation.warnings.length > 0) {
          // still load but show warning
          setUploadError(null);
        }

        onDatasetLoaded(points, `Custom Upload: ${file.name}`);
        setUploadSuccess(
          `Successfully loaded ${points.length} observations (${validation.historicalPoints} historical + ${validation.validationPoints} validation points) — sorted chronologically, timestamps validated, missing values checked. Dataset is now active in forecasting engine.`
        );
      } catch (err: any) {
        setUploadError(err.message || 'Failed to parse file. Check columns: Time, X_Error, Y_Error, Z_Error, Clock_Error');
      }
    };
    reader.onerror = () => setUploadError('Failed to read file');
    reader.readAsText(file);
  };

  const handleSampleDataset = () => {
    setUploadError(null);
    try {
      const sampleCsv = generateSampleCSV();
      const { points, validation } = parseUploadedCSV(sampleCsv);
      onDatasetLoaded(points, 'Sample Dataset (SAT-01)');
      setUploadSuccess(
        `Sample dataset loaded: ${points.length} observations (${validation.historicalPoints} historical + ${validation.validationPoints} Day-8 validation) at 15-min cadence. Ready to forecast — select a horizon on Dashboard.`
      );
      // scroll to top? parent will switch to dashboard
    } catch (err: any) {
      setUploadError(err.message || 'Failed to load sample dataset.');
    }
  };

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
    URL.revokeObjectURL(url);
  };

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
                  Data Injection
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  SAT-01 • 15-min cadence
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload CSV/XLSX with columns <code className="text-cyan-300">Time, X_Error, Y_Error, Z_Error, Clock_Error</code> — system validates, sorts chronologically, detects missing values and prepares time-series for XGBoost.
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            Export CSV
          </button>
          <button
            onClick={handleSampleDataset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 border border-cyan-500 text-xs font-bold transition-colors shadow shadow-cyan-900/30"
          >
            <Upload className="w-4 h-4" />
            Use Sample Dataset
          </button>
        </div>
      </div>

      {/* Validation messages - always visible area */}
      {(uploadError || uploadSuccess) && (
        <div className="space-y-2">
          {uploadError && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}
          {uploadSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-800 text-xs text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{uploadSuccess}</span>
            </div>
          )}
        </div>
      )}

      {/* 1. Pipeline schema */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-cyan-400" />
          Data Injection Pipeline — What happens after upload
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { title: '1. Read file', desc: 'CSV/XLSX parsed; header must be Time, X_Error, Y_Error, Z_Error, Clock_Error (comma/tab).' },
            { title: '2. Validate', desc: 'Columns, timestamps parsed to epoch, NaN/missing rows flagged.' },
            { title: '3. Sort & Check', desc: 'Sorted chronologically; missing 15-min epochs detected; first 672 → training, rest → Day-8 validation.' },
            { title: '4. Prepare', desc: 'Magnitude3D computed, features fed to XGBoost 7-day → 96-step Day-8 forecast.' },
          ].map(s => (
            <div key={s.title} className="bg-slate-950 p-3 rounded-lg border border-slate-700">
              <div className="text-xs font-bold text-cyan-400 font-mono">{s.title}</div>
              <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-[11px] text-slate-500">Tip: For XLSX, export as CSV UTF-8 first. For quick demo, click <strong className="text-cyan-300">Use Sample Dataset</strong> — judges can run immediately without uploading.</div>
      </div>

      {/* 2. Raw diff table */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Current Dataset Preview — First 8 Observations
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              E_3D = √(X²+Y²+Z²) • Uploaded − Modelled = Error • Shown from active dataset ({currentDataset.length} pts)
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-700">
            {currentDataset.length} total • {validationResult.historicalPoints} hist • {validationResult.validationPoints} val
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3 font-mono">Time (UTC)</th>
                <th className="py-2.5 px-3 text-cyan-300 font-mono font-bold bg-cyan-500/10">Δ Clock_Error (m)</th>
                <th className="py-2.5 px-3 text-sky-400 font-mono font-bold">Δ X_Error (m)</th>
                <th className="py-2.5 px-3 text-purple-400 font-mono font-bold">Δ Y_Error (m)</th>
                <th className="py-2.5 px-3 text-pink-400 font-mono font-bold">Δ Z_Error (m)</th>
                <th className="py-2.5 px-3 text-amber-400 font-mono font-bold">E_3D (m)</th>
                <th className="py-2.5 px-3 text-slate-500 font-mono">IsVal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 font-mono text-slate-200">
              {sampleInspectionPoints.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-700/40">
                  <td className="py-2 px-3 text-slate-400">{row.time}</td>
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
                  <td className="py-2 px-3 text-slate-500">{row.isValidation ? 'val' : 'hist'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Drag-and-Drop */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Upload CSV / XLSX
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Expected header (exact, case-insensitive): <code className="text-cyan-300 font-mono">Time, X_Error, Y_Error, Z_Error, Clock_Error</code> — XLSX should be exported as CSV.
            </p>
          </div>
          <button onClick={handleSampleDataset} className="hidden sm:flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 underline">Or use sample dataset →</button>
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
            accept=".csv,.txt,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
              // reset so same file can be re-selected
              e.target.value = '';
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="p-3 rounded-full bg-slate-800 text-cyan-400">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-white">
              Drag and drop your CSV, or click to browse
            </div>
            <div className="text-xs text-slate-400 max-w-md">
              File will be read, columns validated, timestamps parsed, sorted chronologically, missing values flagged, and then sent to XGBoost. For quick test click <span className="text-cyan-300 underline">Use Sample Dataset</span> above.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 text-xs">
            <div className="text-slate-400">Total Observations:</div>
            <div className="text-base font-mono font-bold text-white mt-0.5">
              {validationResult.totalPoints} <span className="text-slate-400 font-normal">epochs</span>
            </div>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-700 text-xs">
            <div className="text-slate-400">Historical (Days 1–7):</div>
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
            <div className="text-slate-400">Cadence:</div>
            <div className="text-base font-mono font-bold text-white mt-0.5">
              {validationResult.timeSpan.intervalMinutes} <span className="text-slate-400 font-normal">min</span>
            </div>
          </div>
        </div>
        {validationResult.warnings.length > 0 && (
          <div className="text-[11px] text-amber-300 bg-amber-950/30 border border-amber-800/50 rounded p-2">{validationResult.warnings.join(' • ')}</div>
        )}
      </div>
    </div>
  );
};
