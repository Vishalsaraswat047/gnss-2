import { ErrorDataPoint, ForecastHorizon } from '../types/gnss';
import { SATELLITE_DATASETS, formatDateTime, SYNTHETIC_DATASET_DISCLAIMER } from '../data/mockDataset';
import * as XLSX from 'xlsx';

export interface DataValidationResult {
  isValid: boolean;
  totalPoints: number;
  historicalPoints: number;
  validationPoints: number;
  timeSpan: {
    start: string;
    end: string;
    intervalMinutes: number;
  };
  errors: string[];
  warnings: string[];
  stats: {
    xRange: [number, number];
    yRange: [number, number];
    zRange: [number, number];
    clockRange: [number, number];
  };
  missingValuePositions: number[];
}

export interface IDataAdapter {
  sourceType: 'SYNTHETIC_MOCK' | 'OPERATIONAL_ISRO_SCHEMA' | 'USER_UPLOADED_CSV';
  loadData(sourceKey: string): Promise<ErrorDataPoint[]>;
  validateData(points: ErrorDataPoint[]): DataValidationResult;
  normalizeTime(points: ErrorDataPoint[]): ErrorDataPoint[];
  prepareFeatures(points: ErrorDataPoint[]): {
    features: number[][];
    timestamps: number[];
  };
  // Generate a sample dataset for immediate MVP use
  generateSampleDataset(): ErrorDataPoint[];
}

export class MockDataAdapter implements IDataAdapter {
  sourceType = 'SYNTHETIC_MOCK' as const;

  async loadData(satelliteId: string): Promise<ErrorDataPoint[]> {
    const data = SATELLITE_DATASETS[satelliteId] ?? SATELLITE_DATASETS['SAT-01'];
    return [...data];
  }

  validateData(points: ErrorDataPoint[]): DataValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!points || points.length === 0) {
      return {
        isValid: false,
        totalPoints: 0,
        historicalPoints: 0,
        validationPoints: 0,
        timeSpan: { start: '', end: '', intervalMinutes: 0 },
        errors: ['Dataset is empty'],
        warnings: [],
        stats: { xRange: [0, 0], yRange: [0, 0], zRange: [0, 0], clockRange: [0, 0] },
        missingValuePositions: []
      };
    }

    if (points.length < 96) {
      warnings.push(`Dataset contains only ${points.length} observations (recommended >= 96 for minimum validation).`);
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let minC = Infinity, maxC = -Infinity;

    const missingValuePositions: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (isNaN(p.xError) || isNaN(p.yError) || isNaN(p.zError) || isNaN(p.clockError)) {
        missingValuePositions.push(i);
        errors.push(`Row ${i + 1} (${p.time}) contains NaN error values.`);
      }
      minX = Math.min(minX, p.xError); maxX = Math.max(maxX, p.xError);
      minY = Math.min(minY, p.yError); maxY = Math.max(maxY, p.yError);
      minZ = Math.min(minZ, p.zError); maxZ = Math.max(maxZ, p.zError);
      minC = Math.min(minC, p.clockError); maxC = Math.max(maxC, p.clockError);
    }

    const histCount = points.filter((p) => !p.isValidation).length;
    const valCount = points.filter((p) => p.isValidation).length;

    return {
      isValid: errors.length === 0,
      totalPoints: points.length,
      historicalPoints: histCount || points.length,
      validationPoints: valCount,
      timeSpan: {
        start: points[0]?.time ?? '',
        end: points[points.length - 1]?.time ?? '',
        intervalMinutes: 15
      },
      errors,
      warnings,
      stats: {
        xRange: [minX, maxX],
        yRange: [minY, maxY],
        zRange: [minZ, maxZ],
        clockRange: [minC, maxC]
      },
      missingValuePositions
    };
  }

  normalizeTime(points: ErrorDataPoint[]): ErrorDataPoint[] {
    return points.map((p, idx) => {
      const isVal = p.isValidation ?? idx >= 672;
      return {
        ...p,
        isValidation: isVal,
        magnitude3D: Math.round(Math.sqrt(p.xError ** 2 + p.yError ** 2 + p.zError ** 2) * 10000) / 10000
      };
    });
  }

  prepareFeatures(points: ErrorDataPoint[]) {
    return {
      features: points.map((p) => [p.xError, p.yError, p.zError, p.clockError, p.magnitude3D]),
      timestamps: points.map((p) => p.timestamp)
    };
  }

  generateSampleDataset(): ErrorDataPoint[] {
    return SATELLITE_DATASETS['SAT-01'] ?? [];
  }
}

// Utility to parse uploaded CSV containing GNSS error time series
export function parseUploadedCSV(csvContent: string): { points: ErrorDataPoint[]; validation: DataValidationResult } {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error("CSV file must contain a header and at least one data row.");
  }

  // Parse header - case-insensitive, handles Time, X_Error, Y_Error, Z_Error, Clock_Error
  const header = lines[0].toLowerCase().split(/[,\t;]/).map((h) => h.trim().replace(/"/g,''));
  const timeIdx = header.findIndex((h) => h.includes('time') || h.includes('date') || h.includes('epoch'));
  const xIdx = header.findIndex((h) => h === 'x_error' || h === 'x_err' || h.includes('x_error') || h === 'x');
  const yIdx = header.findIndex((h) => h === 'y_error' || h === 'y_err' || h.includes('y_error') || h === 'y');
  const zIdx = header.findIndex((h) => h === 'z_error' || h === 'z_err' || h.includes('z_error') || h === 'z');
  const clockIdx = header.findIndex((h) => h.includes('clock') || h.includes('clk'));

  if (xIdx === -1 || yIdx === -1 || zIdx === -1 || clockIdx === -1) {
    throw new Error(
      "CSV header must contain columns: Time, X_Error, Y_Error, Z_Error, Clock_Error (comma/tab delimited). Found: " + lines[0]
    );
  }
  if (timeIdx === -1) {
    throw new Error("CSV header must contain a Time column");
  }

  const rawPoints: { timeStr: string; timestamp: number; x: number; y: number; z: number; clock: number; lineIdx: number }[] = [];
  const parseErrors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue;
    const parts = row.split(/[,\t;]/).map((s) => s.trim().replace(/"/g,''));
    if (parts.length < Math.max(xIdx, yIdx, zIdx, clockIdx, timeIdx) + 1) {
      parseErrors.push(`Row ${i+1}: not enough columns`);
      continue;
    }

    const timeStrRaw = parts[timeIdx] ? parts[timeIdx] : `2026-08-27 00:00:00`;
    const timeStr = timeStrRaw.trim();
    let timestamp = Date.parse(timeStr.replace(' ', 'T'));
    // try alternative: if timeStr is like "2026-08-27 00:15:00" without T
    if (isNaN(timestamp)) {
      // try adding Z
      timestamp = Date.parse(timeStr.replace(' ', 'T') + 'Z');
    }
    if (isNaN(timestamp)) {
      // fallback to sequential 15-min steps, but flag warning
      timestamp = new Date("2026-08-27T00:00:00Z").getTime() + rawPoints.length * 15 * 60 * 1000;
      parseErrors.push(`Row ${i+1}: invalid timestamp "${timeStrRaw}" — using sequential 15-min step`);
    }

    const xStr = parts[xIdx], yStr = parts[yIdx], zStr = parts[zIdx], cStr = parts[clockIdx];
    const x = parseFloat(xStr);
    const y = parseFloat(yStr);
    const z = parseFloat(zStr);
    const clock = parseFloat(cStr);
    if ([x, y, z, clock].some(v => isNaN(v))) {
      parseErrors.push(`Row ${i+1}: NaN detected (X=${xStr} Y=${yStr} Z=${zStr} Clock=${cStr})`);
    }

    rawPoints.push({
      timeStr: timeStrRaw,
      timestamp,
      x: isNaN(x) ? 0 : x,
      y: isNaN(y) ? 0 : y,
      z: isNaN(z) ? 0 : z,
      clock: isNaN(clock) ? 0 : clock,
      lineIdx: i
    });
  }

  if (rawPoints.length === 0) throw new Error("No valid data rows found after parsing");

  // Sort chronologically
  rawPoints.sort((a, b) => a.timestamp - b.timestamp);

  // Detect missing values / gaps: check for 15-min cadence gaps > 20 min
  for (let i = 1; i < rawPoints.length; i++) {
    const gap = (rawPoints[i].timestamp - rawPoints[i-1].timestamp) / 60000;
    if (gap > 20) {
      parseErrors.push(`Gap detected between row ${rawPoints[i-1].lineIdx+1} and ${rawPoints[i].lineIdx+1}: ${gap.toFixed(1)} min (expected ~15 min)`);
    }
  }

  // Build ErrorDataPoint[] sorted and with proper validation flags
  const points: ErrorDataPoint[] = rawPoints.map((rp, idx) => {
    const magnitude3D = Math.round(Math.sqrt(rp.x * rp.x + rp.y * rp.y + rp.z * rp.z) * 10000) / 10000;
    // Chronological: first 672 → historical, rest → validation (Day 8)
    const isValidation = idx >= 672;
    // Format time string consistently if original was invalid
    let timeFormatted = rp.timeStr;
    try {
      const d = new Date(rp.timestamp);
      timeFormatted = formatDateTime(d);
    } catch {}
    return {
      time: timeFormatted,
      timestamp: rp.timestamp,
      xError: Math.round(rp.x * 10000) / 10000,
      yError: Math.round(rp.y * 10000) / 10000,
      zError: Math.round(rp.z * 10000) / 10000,
      clockError: Math.round(rp.clock * 10000) / 10000,
      magnitude3D,
      isValidation
    };
  });

  const adapter = new MockDataAdapter();
  const validation = adapter.validateData(points);
  // append parse warnings
  if (parseErrors.length > 0) {
    validation.warnings = [...validation.warnings, ...parseErrors.slice(0, 5)];
    if (parseErrors.length > 5) validation.warnings.push(`... and ${parseErrors.length - 5} more`);
  }

  return { points, validation };
}

// Parse XLSX/XLS file buffer — no CSV conversion needed
export function parseXLSXBuffer(buffer: ArrayBuffer): { points: ErrorDataPoint[]; validation: DataValidationResult } {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('XLSX file has no sheets');
  const sheet = workbook.Sheets[sheetName];
  // Get raw 2D array with header row, keep dates as Date objects where possible
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  if (rows.length < 2) throw new Error('XLSX sheet must contain header + at least one data row');

  // Also get with raw:true to detect Excel serial dates vs strings
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

  const headerRow = rows[0].map((c: any) => String(c).toLowerCase().trim().replace(/"/g,''));
  const timeIdx = headerRow.findIndex((h: string) => h.includes('time') || h.includes('date') || h.includes('epoch'));
  const xIdx = headerRow.findIndex((h: string) => h === 'x_error' || h === 'x_err' || h.includes('x_error') || h === 'x');
  const yIdx = headerRow.findIndex((h: string) => h === 'y_error' || h === 'y_err' || h.includes('y_error') || h === 'y');
  const zIdx = headerRow.findIndex((h: string) => h === 'z_error' || h === 'z_err' || h.includes('z_error') || h === 'z');
  const clockIdx = headerRow.findIndex((h: string) => h.includes('clock') || h.includes('clk'));

  if (xIdx === -1 || yIdx === -1 || zIdx === -1 || clockIdx === -1) {
    throw new Error("XLSX header must contain columns: Time, X_Error, Y_Error, Z_Error, Clock_Error. Found: " + rows[0].join(', '));
  }
  if (timeIdx === -1) throw new Error("XLSX header must contain a Time column");

  const rawPoints: { timeStr: string; timestamp: number; x: number; y: number; z: number; clock: number; lineIdx: number }[] = [];
  const parseErrors: string[] = [];

  // Helper: convert Excel serial or Date to timestamp
  const toTimestamp = (val: any, rawVal: any, rowIdx: number): number => {
    // If raw is Date (when cellDates:true and raw:false may still give string, but rawRows gives Date)
    if (rawVal instanceof Date && !isNaN(rawVal.getTime())) return rawVal.getTime();
    if (val instanceof Date && !isNaN(val.getTime())) return val.getTime();
    // If numeric Excel serial (e.g. 45200.5)
    if (typeof rawVal === 'number' && rawVal > 30000 && rawVal < 60000) {
      // Excel epoch 1899-12-30 ; JS epoch 1970-01-01 ; difference 25569 days
      const utcDays = rawVal - 25569;
      const utcMs = Math.round(utcDays * 86400 * 1000);
      // Compensate for Excel leap year bug if needed (XLSX handles), just return
      if (!isNaN(utcMs) && utcMs > 0) return utcMs;
    }
    // String timestamp
    const str = String(val ?? rawVal ?? '').trim();
    if (!str) return NaN;
    let ts = Date.parse(str.replace(' ', 'T'));
    if (isNaN(ts)) ts = Date.parse(str.replace(' ', 'T') + 'Z');
    if (isNaN(ts)) ts = Date.parse(str);
    return ts;
  };

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rawR = rawRows[i];
    if (!r || r.length === 0 || r.every((c: any) => String(c).trim() === '')) continue;

    const maxIdx = Math.max(timeIdx, xIdx, yIdx, zIdx, clockIdx);
    if (r.length <= maxIdx && rawR.length <= maxIdx) {
      parseErrors.push(`Row ${i+1}: not enough columns`);
      continue;
    }

    const timeCell = r[timeIdx];
    const rawTimeCell = rawR ? rawR[timeIdx] : timeCell;
    let timestamp = toTimestamp(timeCell, rawTimeCell, i);
    const timeStrRaw = timeCell !== undefined && timeCell !== '' ? String(timeCell) : `2026-08-27 00:00:00`;
    if (isNaN(timestamp)) {
      timestamp = new Date("2026-08-27T00:00:00Z").getTime() + rawPoints.length * 15 * 60 * 1000;
      parseErrors.push(`Row ${i+1}: invalid timestamp "${timeStrRaw}" — using sequential 15-min step`);
    }

    const getNum = (idx: number): number => {
      const v = r[idx];
      const rawV = rawR ? rawR[idx] : v;
      const candidate = v !== '' ? v : rawV;
      const num = typeof candidate === 'number' ? candidate : parseFloat(String(candidate).replace(/,/g,''));
      return isNaN(num) ? NaN : num;
    };

    const x = getNum(xIdx);
    const y = getNum(yIdx);
    const z = getNum(zIdx);
    const clock = getNum(clockIdx);
    if ([x, y, z, clock].some(v => isNaN(v))) {
      parseErrors.push(`Row ${i+1}: NaN detected (X=${r[xIdx]} Y=${r[yIdx]} Z=${r[zIdx]} Clock=${r[clockIdx]})`);
    }

    rawPoints.push({
      timeStr: String(timeCell ?? timeStrRaw),
      timestamp,
      x: isNaN(x) ? 0 : x,
      y: isNaN(y) ? 0 : y,
      z: isNaN(z) ? 0 : z,
      clock: isNaN(clock) ? 0 : clock,
      lineIdx: i
    });
  }

  if (rawPoints.length === 0) throw new Error("No valid data rows found in XLSX sheet");

  rawPoints.sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 1; i < rawPoints.length; i++) {
    const gap = (rawPoints[i].timestamp - rawPoints[i-1].timestamp) / 60000;
    if (gap > 20) {
      parseErrors.push(`Gap between row ${rawPoints[i-1].lineIdx+1} and ${rawPoints[i].lineIdx+1}: ${gap.toFixed(1)} min (expected ~15 min)`);
    }
  }

  const points: ErrorDataPoint[] = rawPoints.map((rp, idx) => {
    const magnitude3D = Math.round(Math.sqrt(rp.x * rp.x + rp.y * rp.y + rp.z * rp.z) * 10000) / 10000;
    const isValidation = idx >= 672;
    let timeFormatted = rp.timeStr;
    try { timeFormatted = formatDateTime(new Date(rp.timestamp)); } catch {}
    return {
      time: timeFormatted,
      timestamp: rp.timestamp,
      xError: Math.round(rp.x * 10000) / 10000,
      yError: Math.round(rp.y * 10000) / 10000,
      zError: Math.round(rp.z * 10000) / 10000,
      clockError: Math.round(rp.clock * 10000) / 10000,
      magnitude3D,
      isValidation
    };
  });

  const adapter = new MockDataAdapter();
  const validation = adapter.validateData(points);
  if (parseErrors.length > 0) {
    validation.warnings = [...validation.warnings, ...parseErrors.slice(0, 5)];
    if (parseErrors.length > 5) validation.warnings.push(`... and ${parseErrors.length - 5} more`);
  }
  return { points, validation };
}

// Generate a sample CSV dataset for immediate MVP use without uploading
export function generateSampleCSV(): string {
  const dataset = SATELLITE_DATASETS['SAT-01'] ?? [];
  if (dataset.length === 0) {
    throw new Error('No sample dataset available. Please upload a CSV file first.');
  }
  const header = 'Time,X_Error,Y_Error,Z_Error,Clock_Error';
  const rows = dataset.map((d) =>
    `${d.time},${d.xError},${d.yError},${d.zError},${d.clockError}`
  ).join('\n');
  return header + '\n' + rows;
}

export const defaultDataAdapter = new MockDataAdapter();