export interface ErrorDataPoint {
  time: string;           // ISO format or YYYY-MM-DD HH:MM:SS
  timestamp: number;      // Epoch ms
  xError: number;         // Ephemeris X error in meters
  yError: number;         // Ephemeris Y error in meters
  zError: number;         // Ephemeris Z error in meters
  clockError: number;     // Satellite clock error in meters (or equivalent range error)
  magnitude3D: number;    // sqrt(X^2 + Y^2 + Z^2) in meters
  isValidation?: boolean; // True if in Day 8 test period
  rawUploaded?: {
    clock: number;
    x: number;
    y: number;
    z: number;
  };
  rawModelled?: {
    clock: number;
    x: number;
    y: number;
    z: number;
  };
}

export type ModelType = 'xgboost' | 'persistence' | 'lstm' | 'transformer';

export type ForecastHorizon = '15m' | '30m' | '1h' | '2h' | '6h' | '24h';

export type TrendType = 'STABLE' | 'INCREASING' | 'DECREASING' | 'RAPIDLY_INCREASING' | 'OSCILLATING';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SatelliteInfo {
  id: string;
  name: string;
  orbitType: 'MEO (12h repeat)' | 'GEO (24h stationary)' | 'IGSO (Inclined)';
  prn: string;
  slot: string;
  description: string;
  clockType: 'Rubidium Atomic' | 'Cesium Atomic' | 'Passive Hydrogen Maser';
  status: 'ACTIVE_MONITORING' | 'NOMINAL' | 'ALERT_DRIFT';
}

export interface AxisMetrics {
  mae: number;
  rmse: number;
  maxError: number;
  r2Score: number;
  meanBias: number;
}

export interface ModelEvaluationSummary {
  modelId: ModelType;
  modelName: string;
  description: string;
  xMetrics: AxisMetrics;
  yMetrics: AxisMetrics;
  zMetrics: AxisMetrics;
  overall3DMetrics: AxisMetrics;
  overallRMSE: number;
  inferenceTimeMs: number;
  trainingTimeMs: number;
  complexity: 'O(N·Trees)';
}

export interface RiskThresholds {
  clockErrorWarning: number;   // meters (e.g. 0.35m)
  clockErrorCritical: number;  // meters (e.g. 0.60m)
  ephem3DWarning: number;      // meters (e.g. 1.20m)
  ephem3DCritical: number;     // meters (e.g. 1.80m)
  driftRateWarning: number;    // meters/hour (e.g. 0.08 m/h)
  uncertaintyWarning: number;  // meters (e.g. 0.25m)
}

export interface ForecastResponse {
  satelliteId: string;
  model: ModelType;
  horizon: ForecastHorizon;
  generatedAt: string;
  currentErrors: {
    clock: number;
    x: number;
    y: number;
    z: number;
    magnitude3D: number;
  };
  predictedErrorsAtHorizon: {
    clock: number;
    x: number;
    y: number;
    z: number;
    magnitude3D: number;
  };
  trend: {
    clock: TrendType;
    ephemeris: TrendType;
    overall: TrendType;
    growthRatePerHour: number;
    description: string;
  };
  risk: {
    level: RiskLevel;
    score: number; // 0 to 100
    primaryRiskFactor: string;
    details: string[];
  };
  points: PredictedPoint[];
  metrics: {
    clockRMSE: number;
    clockMAE: number;
    ephem3DRMSE: number;
    ephem3DMAE: number;
    xRMSE: number;
    yRMSE: number;
    zRMSE: number;
  };
}

export interface PredictedPoint {
  time: string;
  timestamp: number;
  stepIndex: number;      // 1 to 96
  predictedX: number;
  predictedY: number;
  predictedZ: number;
  predictedClock: number;
  predicted3D: number;
  // Confidence intervals (95% bounds)
  xLower: number;
  xUpper: number;
  yLower: number;
  yUpper: number;
  zLower: number;
  zUpper: number;
  clockLower: number;
  clockUpper: number;
  // Actual values for Day 8 validation
  actualX?: number;
  actualY?: number;
  actualZ?: number;
  actualClock?: number;
  actual3D?: number;
}