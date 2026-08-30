import {
  AxisMetrics,
  ErrorDataPoint,
  ForecastHorizon,
  ForecastResponse,
  ModelEvaluationSummary,
  ModelType,
  PredictedPoint,
  RiskLevel,
  RiskThresholds,
  TrendType
} from '../types/gnss';
import { formatDateTime } from '../data/mockDataset';
import { predictXGBoost } from './models/xgboost';

export const HORIZON_STEPS_MAP: Record<ForecastHorizon, number> = {
  '15m': 1,
  '30m': 2,
  '1h': 4,
  '2h': 8,
  '6h': 24,
  '24h': 96
};

// Default risk thresholds (can be configured via modal)
export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  clockErrorWarning: 0.35,   // 35 cm
  clockErrorCritical: 0.60,  // 60 cm
  ephem3DWarning: 1.20,      // 1.2 meters
  ephem3DCritical: 1.80,     // 1.8 meters
  driftRateWarning: 0.08,    // 8 cm/hr
  uncertaintyWarning: 0.25   // 25 cm
};

// Calculate statistical performance metrics between true and predicted arrays
export function computeAxisMetrics(actual: number[], predicted: number[]): AxisMetrics {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) {
    return { mae: 0, rmse: 0, maxError: 0, r2Score: 0, meanBias: 0 };
  }

  let absSum = 0;
  let sqSum = 0;
  let maxErr = 0;
  let biasSum = 0;

  const actualMean = actual.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let totVar = 0;

  for (let i = 0; i < n; i++) {
    const err = predicted[i] - actual[i];
    const absErr = Math.abs(err);
    absSum += absErr;
    sqSum += err * err;
    biasSum += err;
    if (absErr > maxErr) maxErr = absErr;
    totVar += Math.pow(actual[i] - actualMean, 2);
  }

  const mae = absSum / n;
  const rmse = Math.sqrt(sqSum / n);
  const meanBias = biasSum / n;
  const r2Score = totVar > 0 ? 1 - sqSum / totVar : 0;

  return {
    mae: Math.round(mae * 10000) / 10000,
    rmse: Math.round(rmse * 10000) / 10000,
    maxError: Math.round(maxErr * 10000) / 10000,
    r2Score: Math.round(Math.max(-1, Math.min(1, r2Score)) * 1000) / 1000,
    meanBias: Math.round(meanBias * 10000) / 10000
  };
}

// Estimate residual sigma from historical data for confidence intervals
function estimateResidualSigma(history: number[]): number {
  const diffs: number[] = [];
  for (let i = 1; i < history.length; i++) {
    diffs.push(history[i] - history[i - 1]);
  }
  if (diffs.length === 0) return 0;
  const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const variance =
    diffs.reduce((acc, d) => acc + Math.pow(d - meanDiff, 2), 0) / diffs.length;
  return Math.sqrt(variance);
}

// Trend classification algorithm
export function classifyTrend(
  currentVal: number,
  forecastVals: number[],
  historyVals: number[]
): TrendType {
  if (!forecastVals.length) return 'STABLE';

  const endVal = forecastVals[forecastVals.length - 1];
  const delta = endVal - currentVal;
  const ratePerHour = (delta / (forecastVals.length * 0.25)); // meters per hour

  // Check for oscillations in recent history + forecast
  const combined = [...historyVals.slice(-16), ...forecastVals];
  let zeroCrossings = 0;
  const meanComb = combined.reduce((a, b) => a + b, 0) / combined.length;
  for (let i = 1; i < combined.length; i++) {
    if ((combined[i - 1] - meanComb) * (combined[i] - meanComb) < 0) {
      zeroCrossings++;
    }
  }

  if (zeroCrossings >= 4) {
    return 'OSCILLATING';
  }
  if (ratePerHour > 0.12) {
    return 'RAPIDLY_INCREASING';
  }
  if (ratePerHour > 0.02) {
    return 'INCREASING';
  }
  if (ratePerHour < -0.02) {
    return 'DECREASING';
  }
  return 'STABLE';
}

// Calculate risk from current error, predicted error, error growth, and prediction uncertainty
export function calculateRisk(
  currentClock: number,
  predClock: number,
  current3D: number,
  pred3D: number,
  growthRate: number,
  uncertaintySigma: number,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
): { level: RiskLevel; score: number; primaryRiskFactor: string; details: string[] } {
  const details: string[] = [];
  let score = 10; // Baseline low risk score

  // 1. Clock Error Evaluation
  const absClockPred = Math.abs(predClock);
  if (absClockPred >= thresholds.clockErrorCritical) {
    score += 45;
    details.push(`Clock forecast (|${absClockPred.toFixed(3)}m|) exceeds CRITICAL limit (${thresholds.clockErrorCritical}m)`);
  } else if (absClockPred >= thresholds.clockErrorWarning) {
    score += 25;
    details.push(`Clock forecast (|${absClockPred.toFixed(3)}m|) exceeds WARNING limit (${thresholds.clockErrorWarning}m)`);
  }

  // 2. Ephemeris 3D Magnitude Evaluation
  if (pred3D >= thresholds.ephem3DCritical) {
    score += 40;
    details.push(`Ephemeris 3D forecast (${pred3D.toFixed(3)}m) exceeds CRITICAL envelope (${thresholds.ephem3DCritical}m)`);
  } else if (pred3D >= thresholds.ephem3DWarning) {
    score += 20;
    details.push(`Ephemeris 3D forecast (${pred3D.toFixed(3)}m) exceeds WARNING envelope (${thresholds.ephem3DWarning}m)`);
  }

  // 3. Error Growth Rate
  if (Math.abs(growthRate) >= thresholds.driftRateWarning * 1.8) {
    score += 20;
    details.push(`Rapid error divergence: ${growthRate.toFixed(4)} m/hr build-up rate`);
  } else if (Math.abs(growthRate) >= thresholds.driftRateWarning) {
    score += 10;
    details.push(`Moderate error drift: ${growthRate.toFixed(4)} m/hr`);
  }

  // 4. Uncertainty Expansion
  if (uncertaintySigma >= thresholds.uncertaintyWarning) {
    score += 15;
    details.push(`High prediction interval dispersion (±${(uncertaintySigma * 1.96).toFixed(3)}m)`);
  }

  score = Math.min(100, Math.max(5, score));

  let level: RiskLevel = 'LOW';
  if (score >= 75) level = 'CRITICAL';
  else if (score >= 50) level = 'HIGH';
  else if (score >= 28) level = 'MEDIUM';

  const primaryRiskFactor =
    details.length > 0
      ? details[0]
      : 'All error residuals within nominal specification limits';

  return { level, score, primaryRiskFactor, details };
}

// Generate XGBoost-based forecast response
export function runForecastingEngine(
  dataset: ErrorDataPoint[],
  satelliteId: string,
  horizon: ForecastHorizon,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS
): ForecastResponse {
  const startTime = performance.now();

  // Split strictly: Days 1–7 (first 672 points) for historical training, Day 8 (96 points) for validation
  const history = dataset.filter((d) => !d.isValidation);
  const validation = dataset.filter((d) => d.isValidation);

  const histX = history.map((d) => d.xError);
  const histY = history.map((d) => d.yError);
  const histZ = history.map((d) => d.zError);
  const histClock = history.map((d) => d.clockError);

  const horizonSteps = HORIZON_STEPS_MAP[horizon];
  const maxSteps = 96; // Full Day 8 horizon for complete analysis

  // Execute XGBoost model (only model for MVP)
  const rawForecast = predictXGBoost(histX, histY, histZ, histClock, maxSteps);

  const sigmaX = estimateResidualSigma(histX);
  const sigmaY = estimateResidualSigma(histY);
  const sigmaZ = estimateResidualSigma(histZ);
  const sigmaClock = estimateResidualSigma(histClock);

  const lastHistoryPoint = history[history.length - 1];
  const lastEpoch = lastHistoryPoint ? lastHistoryPoint.timestamp : Date.now();
  const stepMs = 15 * 60 * 1000;

  const predictedPoints: PredictedPoint[] = [];

  for (let i = 0; i < maxSteps; i++) {
    const timestamp = lastEpoch + (i + 1) * stepMs;
    const timeStr = formatDateTime(new Date(timestamp));

    const pX = rawForecast.x[i];
    const pY = rawForecast.y[i];
    const pZ = rawForecast.z[i];
    const pClock = rawForecast.clock[i];
    const p3D = Math.round(Math.sqrt(pX * pX + pY * pY + pZ * pZ) * 10000) / 10000;

    // Temporal uncertainty growth: sigma(t) grows with horizon
    // Uncertainty widens for longer horizons: 15m → narrower, 24h → widest
    const timeDecay = Math.sqrt(1 + 0.08 * (i + 1));
    const zScore = 1.96; // 95% Confidence Interval

    const actualPoint = validation[i];

    predictedPoints.push({
      time: timeStr,
      timestamp,
      stepIndex: i + 1,
      predictedX: pX,
      predictedY: pY,
      predictedZ: pZ,
      predictedClock: pClock,
      predicted3D: p3D,
      xLower: Math.round((pX - zScore * sigmaX * timeDecay) * 10000) / 10000,
      xUpper: Math.round((pX + zScore * sigmaX * timeDecay) * 10000) / 10000,
      yLower: Math.round((pY - zScore * sigmaY * timeDecay) * 10000) / 10000,
      yUpper: Math.round((pY + zScore * sigmaY * timeDecay) * 10000) / 10000,
      zLower: Math.round((pZ - zScore * sigmaZ * timeDecay) * 10000) / 10000,
      zUpper: Math.round((pZ + zScore * sigmaZ * timeDecay) * 10000) / 10000,
      clockLower: Math.round((pClock - zScore * sigmaClock * timeDecay) * 10000) / 10000,
      clockUpper: Math.round((pClock + zScore * sigmaClock * timeDecay) * 10000) / 10000,
      actualX: actualPoint?.xError,
      actualY: actualPoint?.yError,
      actualZ: actualPoint?.zError,
      actualClock: actualPoint?.clockError,
      actual3D: actualPoint?.magnitude3D
    });
  }

  // Calculate metrics over selected horizon
  const horizonPoints = predictedPoints.slice(0, horizonSteps);
  const actX = horizonPoints.map((p) => p.actualX ?? p.predictedX);
  const actY = horizonPoints.map((p) => p.actualY ?? p.predictedY);
  const actZ = horizonPoints.map((p) => p.actualZ ?? p.predictedZ);
  const actClock = horizonPoints.map((p) => p.actualClock ?? p.predictedClock);
  const act3D = horizonPoints.map((p) => p.actual3D ?? p.predicted3D);

  const xMetrics = computeAxisMetrics(actX, horizonPoints.map((p) => p.predictedX));
  const yMetrics = computeAxisMetrics(actY, horizonPoints.map((p) => p.predictedY));
  const zMetrics = computeAxisMetrics(actZ, horizonPoints.map((p) => p.predictedZ));
  const clockMetrics = computeAxisMetrics(actClock, horizonPoints.map((p) => p.predictedClock));
  const ephem3DMetrics = computeAxisMetrics(act3D, horizonPoints.map((p) => p.predicted3D));

  // The target point for this specific horizon (not always the 96th step)
  const targetIdx = horizonSteps - 1;
  const targetPoint = predictedPoints[targetIdx] ?? predictedPoints[0];
  const currentClock = lastHistoryPoint?.clockError ?? 0;
  const currentX = lastHistoryPoint?.xError ?? 0;
  const currentY = lastHistoryPoint?.yError ?? 0;
  const currentZ = lastHistoryPoint?.zError ?? 0;
  const current3D = lastHistoryPoint?.magnitude3D ?? 0;

  // Growth rate per hour for the selected horizon
  const growthRatePerHour = ((targetPoint.predictedClock - currentClock) / (horizonSteps * 0.25));

  // Uncertainty sigma for this horizon (grows with step count)
  const horizonSigmaClock = sigmaClock * Math.sqrt(1 + 0.08 * horizonSteps);

  const risk = calculateRisk(
    currentClock,
    targetPoint.predictedClock,
    current3D,
    targetPoint.predicted3D,
    growthRatePerHour,
    horizonSigmaClock,
    thresholds
  );

  const clockTrend = classifyTrend(currentClock, horizonPoints.map((p) => p.predictedClock), histClock);
  const ephemTrend = classifyTrend(current3D, horizonPoints.map((p) => p.predicted3D), history.map((d) => d.magnitude3D));
  const overallTrend = clockTrend === 'RAPIDLY_INCREASING' || ephemTrend === 'RAPIDLY_INCREASING'
    ? 'RAPIDLY_INCREASING'
    : clockTrend === 'INCREASING' || ephemTrend === 'INCREASING'
    ? 'INCREASING'
    : clockTrend === 'OSCILLATING' || ephemTrend === 'OSCILLATING'
    ? 'OSCILLATING'
    : 'STABLE';

  return {
    satelliteId,
    model: 'xgboost',
    horizon,
    generatedAt: new Date().toISOString(),
    currentErrors: {
      clock: currentClock,
      x: currentX,
      y: currentY,
      z: currentZ,
      magnitude3D: current3D
    },
    predictedErrorsAtHorizon: {
      clock: targetPoint.predictedClock,
      x: targetPoint.predictedX,
      y: targetPoint.predictedY,
      z: targetPoint.predictedZ,
      magnitude3D: targetPoint.predicted3D
    },
    trend: {
      clock: clockTrend,
      ephemeris: ephemTrend,
      overall: overallTrend,
      growthRatePerHour: Math.round(growthRatePerHour * 10000) / 10000,
      description: `Clock drift: ${growthRatePerHour > 0 ? '+' : ''}${Math.abs(growthRatePerHour * 100).toFixed(2)} cm/hr | Ephemeris: ${ephemTrend}`
    },
    risk,
    points: predictedPoints,
    metrics: {
      clockRMSE: clockMetrics.rmse,
      clockMAE: clockMetrics.mae,
      ephem3DRMSE: ephem3DMetrics.rmse,
      ephem3DMAE: ephem3DMetrics.mae,
      xRMSE: xMetrics.rmse,
      yRMSE: yMetrics.rmse,
      zRMSE: zMetrics.rmse
    }
  };
}