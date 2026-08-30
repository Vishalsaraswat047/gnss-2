export interface MultiTargetForecast {
  x: number[];
  y: number[];
  z: number[];
  clock: number[];
}

export function predictPersistence(
  historyX: number[],
  historyY: number[],
  historyZ: number[],
  historyClock: number[],
  horizonSteps: number
): MultiTargetForecast {
  const lastX = historyX[historyX.length - 1] ?? 0;
  const lastY = historyY[historyY.length - 1] ?? 0;
  const lastZ = historyZ[historyZ.length - 1] ?? 0;
  const lastClock = historyClock[historyClock.length - 1] ?? 0;

  return {
    x: new Array(horizonSteps).fill(lastX),
    y: new Array(horizonSteps).fill(lastY),
    z: new Array(horizonSteps).fill(lastZ),
    clock: new Array(horizonSteps).fill(lastClock)
  };
}
