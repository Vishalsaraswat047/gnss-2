import { MultiTargetForecast } from './persistence';

// Sigmoid and Tanh activations
const sigmoid = (x: number) => 1 / (1 + Math.exp(-Math.max(-15, Math.min(15, x))));
const tanh = (x: number) => Math.tanh(Math.max(-15, Math.min(15, x)));

interface LSTMWeights {
  hiddenDim: number;
  inputDim: number;
  Wf: number[][]; // Forget gate
  Wi: number[][]; // Input gate
  Wc: number[][]; // Candidate gate
  Wo: number[][]; // Output gate
  bf: number[];
  bi: number[];
  bc: number[];
  bo: number[];
  Wy: number[];   // Dense output projection
  by: number;
}

function initLSTMWeights(inputDim: number, hiddenDim: number, seed: number): LSTMWeights {
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return (s / 233280 - 0.5) * 0.35;
  };

  const createMatrix = (rows: number, cols: number) =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => rand()));

  return {
    hiddenDim,
    inputDim,
    Wf: createMatrix(hiddenDim, inputDim + hiddenDim),
    Wi: createMatrix(hiddenDim, inputDim + hiddenDim),
    Wc: createMatrix(hiddenDim, inputDim + hiddenDim),
    Wo: createMatrix(hiddenDim, inputDim + hiddenDim),
    bf: Array.from({ length: hiddenDim }, () => 0.5), // forget gate bias initialized positive
    bi: Array.from({ length: hiddenDim }, () => 0.0),
    bc: Array.from({ length: hiddenDim }, () => 0.0),
    bo: Array.from({ length: hiddenDim }, () => 0.0),
    Wy: Array.from({ length: hiddenDim }, () => rand()),
    by: 0.0
  };
}

function forwardLSTM(
  weights: LSTMWeights,
  sequence: number[] // window of past scalar values
): number {
  const H = weights.hiddenDim;
  let h = new Array(H).fill(0);
  let c = new Array(H).fill(0);

  for (let t = 0; t < sequence.length; t++) {
    const x = [sequence[t]];
    const xh = [...x, ...h];

    const f = new Array(H);
    const i = new Array(H);
    const c_tilde = new Array(H);
    const o = new Array(H);
    const next_c = new Array(H);
    const next_h = new Array(H);

    for (let k = 0; k < H; k++) {
      let sumF = weights.bf[k];
      let sumI = weights.bi[k];
      let sumC = weights.bc[k];
      let sumO = weights.bo[k];

      for (let j = 0; j < xh.length; j++) {
        sumF += weights.Wf[k][j] * xh[j];
        sumI += weights.Wi[k][j] * xh[j];
        sumC += weights.Wc[k][j] * xh[j];
        sumO += weights.Wo[k][j] * xh[j];
      }

      f[k] = sigmoid(sumF);
      i[k] = sigmoid(sumI);
      c_tilde[k] = tanh(sumC);
      o[k] = sigmoid(sumO);

      next_c[k] = f[k] * c[k] + i[k] * c_tilde[k];
      next_h[k] = o[k] * tanh(next_c[k]);
    }

    c = next_c;
    h = next_h;
  }

  // Dense linear head
  let yHat = weights.by;
  for (let k = 0; k < H; k++) {
    yHat += weights.Wy[k] * h[k];
  }

  return yHat;
}

// Light recurrent fitting across historical windows
function fitLSTMOnSeries(series: number[], windowSize: number = 20, seed: number = 42): LSTMWeights {
  const hiddenDim = 12;
  const weights = initLSTMWeights(1, hiddenDim, seed);
  const n = series.length;
  if (n <= windowSize) return weights;

  // Extract windows
  const samples: { seq: number[]; target: number }[] = [];
  for (let i = windowSize; i < n; i++) {
    samples.push({
      seq: series.slice(i - windowSize, i),
      target: series[i]
    });
  }

  // Quick gradient descent on last output weights and biases (reservoir-style recurrent dynamics)
  const lr = 0.05;
  for (let epoch = 0; epoch < 18; epoch++) {
    for (const sample of samples) {
      const pred = forwardLSTM(weights, sample.seq);
      const error = pred - sample.target;

      // Update output layer weights
      for (let k = 0; k < hiddenDim; k++) {
        weights.Wy[k] -= lr * error * 0.1;
      }
      weights.by -= lr * error * 0.1;
    }
  }

  return weights;
}

export function predictLSTM(
  historyX: number[],
  historyY: number[],
  historyZ: number[],
  historyClock: number[],
  horizonSteps: number
): MultiTargetForecast {
  const windowSize = 20;
  const modelX = fitLSTMOnSeries(historyX, windowSize, 101);
  const modelY = fitLSTMOnSeries(historyY, windowSize, 102);
  const modelZ = fitLSTMOnSeries(historyZ, windowSize, 103);
  const modelClock = fitLSTMOnSeries(historyClock, windowSize, 104);

  const simX = [...historyX];
  const simY = [...historyY];
  const simZ = [...historyZ];
  const simClock = [...historyClock];

  const predsX: number[] = [];
  const predsY: number[] = [];
  const predsZ: number[] = [];
  const predsClock: number[] = [];

  for (let h = 0; h < horizonSteps; h++) {
    const seqX = simX.slice(-windowSize);
    const seqY = simY.slice(-windowSize);
    const seqZ = simZ.slice(-windowSize);
    const seqClock = simClock.slice(-windowSize);

    // Apply recurrent prediction with inertial smoothing
    const rawPredX = forwardLSTM(modelX, seqX);
    const rawPredY = forwardLSTM(modelY, seqY);
    const rawPredZ = forwardLSTM(modelZ, seqZ);
    const rawPredClock = forwardLSTM(modelClock, seqClock);

    // Blend slightly with last point for stability over deep horizons
    const alpha = 0.85;
    const nextX = Math.round((alpha * rawPredX + (1 - alpha) * seqX[seqX.length - 1]) * 10000) / 10000;
    const nextY = Math.round((alpha * rawPredY + (1 - alpha) * seqY[seqY.length - 1]) * 10000) / 10000;
    const nextZ = Math.round((alpha * rawPredZ + (1 - alpha) * seqZ[seqZ.length - 1]) * 10000) / 10000;
    const nextClock = Math.round((alpha * rawPredClock + (1 - alpha) * seqClock[seqClock.length - 1]) * 10000) / 10000;

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
