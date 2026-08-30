import { ErrorDataPoint } from '../types/gnss';

export interface ExtractedFeatures {
  lags: number[];        // Lag 0, 1, 2, 3, 4, 8
  rollingMean4: number;
  rollingMean8: number;
  rollingStd4: number;
  rollingStd8: number;
  growthRatePerHour: number; // First difference scaled to hour (4 * (y_t - y_t-1))
  acceleration: number;      // Second difference
  sinDiurnal: number;        // sin(2*pi * step / 96)
  cosDiurnal: number;        // cos(2*pi * step / 96)
  sinSemiDiurnal: number;    // sin(4*pi * step / 96)
  cosSemiDiurnal: number;    // cos(4*pi * step / 96)
  stepInDay: number;
}

export function extractSeriesFeatures(
  series: number[],
  stepIndex: number
): ExtractedFeatures {
  const t = series.length - 1;
  const val0 = series[t] ?? 0;
  const val1 = series[t - 1] ?? val0;
  const val2 = series[t - 2] ?? val1;
  const val3 = series[t - 3] ?? val2;
  const val4 = series[t - 4] ?? val3;
  const val8 = series[t - 8] ?? val4;

  const lags = [val0, val1, val2, val3, val4, val8];

  // Rolling mean & std over last 4 and 8 steps
  const window4 = series.slice(Math.max(0, t - 3), t + 1);
  const window8 = series.slice(Math.max(0, t - 7), t + 1);

  const mean4 = window4.reduce((a, b) => a + b, 0) / (window4.length || 1);
  const mean8 = window8.reduce((a, b) => a + b, 0) / (window8.length || 1);

  const var4 =
    window4.reduce((acc, v) => acc + Math.pow(v - mean4, 2), 0) / (window4.length || 1);
  const var8 =
    window8.reduce((acc, v) => acc + Math.pow(v - mean8, 2), 0) / (window8.length || 1);

  const std4 = Math.sqrt(var4);
  const std8 = Math.sqrt(var8);

  const delta1 = val0 - val1;
  const delta2 = val1 - val2;
  const growthRatePerHour = delta1 * 4.0; // 15 min = 0.25h
  const acceleration = delta1 - delta2;

  const stepInDay = stepIndex % 96;
  const angleDiurnal = (2 * Math.PI * stepInDay) / 96.0;
  const angleSemiDiurnal = (4 * Math.PI * stepInDay) / 96.0;

  return {
    lags,
    rollingMean4: mean4,
    rollingMean8: mean8,
    rollingStd4: std4,
    rollingStd8: std8,
    growthRatePerHour,
    acceleration,
    sinDiurnal: Math.sin(angleDiurnal),
    cosDiurnal: Math.cos(angleDiurnal),
    sinSemiDiurnal: Math.sin(angleSemiDiurnal),
    cosSemiDiurnal: Math.cos(angleSemiDiurnal),
    stepInDay
  };
}

export function toFeatureVector(feats: ExtractedFeatures): number[] {
  return [
    ...feats.lags,
    feats.rollingMean4,
    feats.rollingMean8,
    feats.rollingStd4,
    feats.rollingStd8,
    feats.growthRatePerHour,
    feats.acceleration,
    feats.sinDiurnal,
    feats.cosDiurnal,
    feats.sinSemiDiurnal,
    feats.cosSemiDiurnal
  ];
}

export function extractDatasetSeries(dataset: ErrorDataPoint[]) {
  return {
    xSeries: dataset.map((d) => d.xError),
    ySeries: dataset.map((d) => d.yError),
    zSeries: dataset.map((d) => d.zError),
    clockSeries: dataset.map((d) => d.clockError),
    norm3DSeries: dataset.map((d) => d.magnitude3D),
    timestamps: dataset.map((d) => d.timestamp),
    times: dataset.map((d) => d.time)
  };
}
