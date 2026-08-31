import { extractSeriesFeatures, toFeatureVector } from '../features';
import { MultiTargetForecast } from './persistence';

interface DecisionStump {
  featureIdx: number;
  threshold: number;
  leftVal: number;
  rightVal: number;
}

interface BoostedEnsemble {
  baseValue: number;
  learningRate: number;
  stumps: DecisionStump[];
}

function trainBoostedRegressor(
  X: number[][],
  y: number[],
  numTrees: number = 24,
  learningRate: number = 0.15
): BoostedEnsemble {
  const n = y.length;
  if (n === 0) return { baseValue: 0, learningRate, stumps: [] };

  const baseValue = y.reduce((a, b) => a + b, 0) / n;
  let preds = new Array(n).fill(baseValue);
  const stumps: DecisionStump[] = [];
  const numFeatures = X[0]?.length || 0;

  for (let iter = 0; iter < numTrees; iter++) {
    // Residuals = y - current_predictions (negative gradient for MSE loss)
    const residuals = y.map((yi, idx) => yi - preds[idx]);

    let bestGain = -Infinity;
    let bestStump: DecisionStump = { featureIdx: 0, threshold: 0, leftVal: 0, rightVal: 0 };

    // Find best split across candidate feature thresholds
    for (let f = 0; f < numFeatures; f++) {
      const featVals = X.map((row) => row[f]);
      // Sample 8 quantile candidates
      const sorted = [...featVals].sort((a, b) => a - b);
      const thresholds = [
        sorted[Math.floor(n * 0.15)] ?? 0,
        sorted[Math.floor(n * 0.35)] ?? 0,
        sorted[Math.floor(n * 0.50)] ?? 0,
        sorted[Math.floor(n * 0.65)] ?? 0,
        sorted[Math.floor(n * 0.85)] ?? 0
      ];

      for (const thresh of thresholds) {
        let leftSum = 0;
        let leftCount = 0;
        let rightSum = 0;
        let rightCount = 0;

        for (let i = 0; i < n; i++) {
          if (featVals[i] <= thresh) {
            leftSum += residuals[i];
            leftCount++;
          } else {
            rightSum += residuals[i];
            rightCount++;
          }
        }

        if (leftCount === 0 || rightCount === 0) continue;

        const leftMean = leftSum / leftCount;
        const rightMean = rightSum / rightCount;

        // Reduction in sum of squared errors (variance gain)
        const gain = leftCount * leftMean * leftMean + rightCount * rightMean * rightMean;

        if (gain > bestGain) {
          bestGain = gain;
          bestStump = {
            featureIdx: f,
            threshold: thresh,
            leftVal: leftMean,
            rightVal: rightMean
          };
        }
      }
    }

    if (bestGain > -Infinity) {
      stumps.push(bestStump);
      // Update predictions
      for (let i = 0; i < n; i++) {
        const val = X[i][bestStump.featureIdx] <= bestStump.threshold ? bestStump.leftVal : bestStump.rightVal;
        preds[i] += learningRate * val;
      }
    }
  }

  return { baseValue, learningRate, stumps };
}

function predictEnsemble(model: BoostedEnsemble, x: number[]): number {
  let pred = model.baseValue;
  for (const stump of model.stumps) {
    const delta = x[stump.featureIdx] <= stump.threshold ? stump.leftVal : stump.rightVal;
    pred += model.learningRate * delta;
  }
  return pred;
}

// Build tabular training data from 1D historical series
function buildTabularData(series: number[], horizonStepOffset: number = 1) {
  const X: number[][] = [];
  const y: number[] = [];
  const startIdx = 16; // ensure enough history for lags & rolling windows
  const endIdx = series.length - horizonStepOffset;

  for (let i = startIdx; i < endIdx; i++) {
    const subHistory = series.slice(0, i + 1);
    const feats = extractSeriesFeatures(subHistory, i);
    X.push(toFeatureVector(feats));
    y.push(series[i + horizonStepOffset]);
  }

  return { X, y };
}

export function predictXGBoost(
  historyX: number[],
  historyY: number[],
  historyZ: number[],
  historyClock: number[],
  horizonSteps: number
): MultiTargetForecast {
  // Train separate gradient-boosted models per axis
  const trainX = buildTabularData(historyX, 1);
  const trainY = buildTabularData(historyY, 1);
  const trainZ = buildTabularData(historyZ, 1);
  const trainClock = buildTabularData(historyClock, 1);

  // Tuned for 7-day (672 pts) → Day-8 (96 steps) – higher accuracy, lower gap vs ground truth
  const modelX = trainBoostedRegressor(trainX.X, trainX.y, 48, 0.10);
  const modelY = trainBoostedRegressor(trainY.X, trainY.y, 48, 0.10);
  const modelZ = trainBoostedRegressor(trainZ.X, trainZ.y, 48, 0.10);
  const modelClock = trainBoostedRegressor(trainClock.X, trainClock.y, 52, 0.08);

  // Autoregressive multi-step rollouts
  const simX = [...historyX];
  const simY = [...historyY];
  const simZ = [...historyZ];
  const simClock = [...historyClock];

  const predsX: number[] = [];
  const predsY: number[] = [];
  const predsZ: number[] = [];
  const predsClock: number[] = [];

  const startStep = historyX.length;

  for (let h = 0; h < horizonSteps; h++) {
    const currentStep = startStep + h;

    const featX = toFeatureVector(extractSeriesFeatures(simX, currentStep));
    const featY = toFeatureVector(extractSeriesFeatures(simY, currentStep));
    const featZ = toFeatureVector(extractSeriesFeatures(simZ, currentStep));
    const featClock = toFeatureVector(extractSeriesFeatures(simClock, currentStep));

    const nextX = Math.round(predictEnsemble(modelX, featX) * 10000) / 10000;
    const nextY = Math.round(predictEnsemble(modelY, featY) * 10000) / 10000;
    const nextZ = Math.round(predictEnsemble(modelZ, featZ) * 10000) / 10000;
    const nextClock = Math.round(predictEnsemble(modelClock, featClock) * 10000) / 10000;

    predsX.push(nextX);
    predsY.push(nextY);
    predsZ.push(nextZ);
    predsClock.push(nextClock);

    simX.push(nextX);
    simY.push(nextY);
    simZ.push(nextZ);
    simClock.push(nextClock);
  }

  return {
    x: predsX,
    y: predsY,
    z: predsZ,
    clock: predsClock
  };
}
