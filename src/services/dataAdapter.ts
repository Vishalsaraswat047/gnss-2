import { ErrorDataPoint, ForecastHorizon } from '../types/gnss';
import { SATELLITE_DATASETS, formatDateTime, SYNTHETIC_DATASET_DISCLAIMER } from '../data/mockDataset';

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

  // Parse header
  const header = lines[0].toLowerCase().split(/[,\t]/).map((h) => h.trim());
  const timeIdx = header.findIndex((h) => h.includes('time') || h.includes('date') || h.includes('epoch'));
  const xIdx = header.findIndex((h) => h.includes('x_err') || h.includes('xerror') || h === 'x');
  const yIdx = header.findIndex((h) => h.includes('y_err') || h.includes('yerror') || h === 'y');
  const zIdx = header.findIndex((h) => h.includes('z_err') || h.includes('zerror') || h === 'z');
  const clockIdx = header.findIndex((h) => h.includes('clock') || h.includes('clk'));

  if (xIdx === -1 || yIdx === -1 || zIdx === -1 || clockIdx === -1) {
    throw new Error(
      "CSV header must contain columns for Time, X_Error, Y_Error, Z_Error, and Clock_Error (comma or tab delimited)."
    );
  }

  const points: ErrorDataPoint[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue;
    const parts = row.split(/[,\t]/).map((s) => s.trim());
    if (parts.length < 5) continue;

    const timeStr = timeIdx !== -1 && parts[timeIdx] ? parts[timeIdx] : `2026-08-27 ${i}:00`;
    const x = parseFloat(parts[xIdx]) || 0;
    const y = parseFloat(parts[yIdx]) || 0;
    const z = parseFloat(parts[zIdx]) || 0;
    const clock = parseFloat(parts[clockIdx]) || 0;

    let timestamp: number;
    try {
      timestamp = new Date(timeStr.replace(' ', 'T')).getTime();
      if (isNaN(timestamp)) {
        timestamp = new Date("2026-08-27T00:00:00Z").getTime() + (i - 1) * 15 * 60 * 1000;
      }
    } catch {
      timestamp = new Date("2026-08-27T00:00:00Z").getTime() + (i - 1) * 15 * 60 * 1000;
    }

    const isValidation = i > 672; // default 7 day cutoff if 768 points
    const magnitude3D = Math.round(Math.sqrt(x * x + y * y + z * z) * 10000) / 10000;

    points.push({
      time: timeStr,
      timestamp,
      xError: x,
      yError: y,
      zError: z,
      clockError: clock,
      magnitude3D,
      isValidation
    });
  }

  const adapter = new MockDataAdapter();
  const validation = adapter.validateData(points);

  return { points, validation };
}

// Generate a sample CSV dataset for immediate MVP use without uploading
export function generateSampleCSV(): string {
  const dataset = SATELLITE_DATASETS['SAT-01'] ?? [];
  if (dataset.length === 0) {
    throw new Error('No sample dataset available. Please upload a CSV file first.');
  }

  const header = 'Time,X_Error,Y_Error,Z_Error,Clock_Error';
  const rows = dataset.slice(0, 100).map((d) =>
    `${d.time},${d.xError},${d.yError},${d.zError},${d.clockError}`
  ).join('\n');

  return header + '\n' + rows;
}

export const defaultDataAdapter = new MockDataAdapter();