import { MultiTargetForecast } from './persistence';

// Sinusoidal positional encoding
function getPositionalEncoding(pos: number, dim: number): number[] {
  const pe: number[] = [];
  for (let i = 0; i < dim; i++) {
    if (i % 2 === 0) {
      pe.push(Math.sin(pos / Math.pow(10000, (2 * i) / dim)));
    } else {
      pe.push(Math.cos(pos / Math.pow(10000, (2 * (i - 1)) / dim)));
    }
  }
  return pe;
}

// Softmax helper
function softmax(arr: number[]): number[] {
  const max = Math.max(...arr);
  const exps = arr.map((x) => Math.exp(x - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

interface TransformerForecaster {
  dModel: number;
  seqLen: number;
  Wq: number[][];
  Wk: number[][];
  Wv: number[][];
  Wo: number[][];
  historicalWeights: number[];
}

function initTransformer(seqLen: number = 32, dModel: number = 8): TransformerForecaster {
  const rand = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return (s / 233280 - 0.5) * 0.25;
    };
  };
  const r = rand(9876);
  const makeMat = (rows: number, cols: number) =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => r()));

  return {
    dModel,
    seqLen,
    Wq: makeMat(dModel, dModel),
    Wk: makeMat(dModel, dModel),
    Wv: makeMat(dModel, dModel),
    Wo: makeMat(dModel, 1),
    historicalWeights: new Array(seqLen).fill(1 / seqLen)
  };
}

function forwardTemporalTransformer(
  model: TransformerForecaster,
  seq: number[] // Past seqLen points
): number {
  const T = seq.length;
  const d = model.dModel;

  // 1. Embed scalar sequence into d-dimensional space + positional encoding
  const embedded: number[][] = [];
  for (let t = 0; t < T; t++) {
    const pe = getPositionalEncoding(t, d);
    const emb = pe.map((p, idx) => (idx === 0 ? seq[t] : p * 0.1 + seq[t] * 0.05));
    embedded.push(emb);
  }

  // 2. Scaled Dot-Product Self-Attention
  // Query at last time step T-1
  const query = new Array(d).fill(0);
  const qSource = embedded[T - 1];
  for (let i = 0; i < d; i++) {
    for (let j = 0; j < d; j++) {
      query[i] += model.Wq[i][j] * qSource[j];
    }
  }

  // Keys & Values for all t in [0 .. T-1]
  const scores: number[] = [];
  const scale = Math.sqrt(d);

  for (let t = 0; t < T; t++) {
    const key = new Array(d).fill(0);
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        key[i] += model.Wk[i][j] * embedded[t][j];
      }
    }
    // Dot product Q · K^T / sqrt(d)
    let dot = 0;
    for (let i = 0; i < d; i++) {
      dot += query[i] * key[i];
    }
    // Add diurnal phase resonance bias (recent and harmonic points get attention boost)
    const lagFromNow = T - 1 - t;
    const harmonicBoost = Math.cos((2 * Math.PI * lagFromNow) / 48) * 0.4;
    scores.push(dot / scale + harmonicBoost);
  }

  const attnWeights = softmax(scores);

  // 3. Compute attention-weighted context vector over values
  let contextValue = 0;
  for (let t = 0; t < T; t++) {
    contextValue += attnWeights[t] * seq[t];
  }

  // 4. Combine attention context with local momentum
  const momentum = (seq[T - 1] - seq[Math.max(0, T - 5)]) / Math.min(4, T);
  const forecast = contextValue * 0.75 + seq[T - 1] * 0.25 + momentum * 0.35;

  return forecast;
}

export function predictTransformer(
  historyX: number[],
  historyY: number[],
  historyZ: number[],
  historyClock: number[],
  horizonSteps: number
): MultiTargetForecast {
  const seqLen = 32;
  const modelX = initTransformer(seqLen, 8);
  const modelY = initTransformer(seqLen, 8);
  const modelZ = initTransformer(seqLen, 8);
  const modelClock = initTransformer(seqLen, 8);

  const simX = [...historyX];
  const simY = [...historyY];
  const simZ = [...historyZ];
  const simClock = [...historyClock];

  const predsX: number[] = [];
  const predsY: number[] = [];
  const predsZ: number[] = [];
  const predsClock: number[] = [];

  for (let h = 0; h < horizonSteps; h++) {
    const seqX = simX.slice(-seqLen);
    const seqY = simY.slice(-seqLen);
    const seqZ = simZ.slice(-seqLen);
    const seqClock = simClock.slice(-seqLen);

    const nextX = Math.round(forwardTemporalTransformer(modelX, seqX) * 10000) / 10000;
    const nextY = Math.round(forwardTemporalTransformer(modelY, seqY) * 10000) / 10000;
    const nextZ = Math.round(forwardTemporalTransformer(modelZ, seqZ) * 10000) / 10000;
    const nextClock = Math.round(forwardTemporalTransformer(modelClock, seqClock) * 10000) / 10000;

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
