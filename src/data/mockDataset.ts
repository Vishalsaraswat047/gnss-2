import { ErrorDataPoint, SatelliteInfo } from '../types/gnss';

// Subtle data-source note for MVP validation (do not display as "Prototype Mode")
export const SYNTHETIC_DATASET_DISCLAIMER =
  "Synthetic dataset — for MVP validation";

export const SATELLITE_CATALOG: SatelliteInfo[] = [
  {
    id: 'SAT-01',
    name: 'Synthetic SAT-01 (MEO-12h Nominal)',
    orbitType: 'MEO (12h repeat)',
    prn: 'PRN-01',
    slot: 'Plane A / Slot 2',
    description: 'Medium Earth Orbit satellite with semi-diurnal harmonic ephemeris variation and linear atomic clock drift.',
    clockType: 'Rubidium Atomic',
    status: 'ACTIVE_MONITORING'
  }
];

// Seeded pseudo-random generator for deterministic, reproducible scientific testing
function createPRNG(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// User-provided ground truth seed for SAT-01 (Days 1 to 4 sample):
const USER_SAMPLE_SEED: [string, number, number, number, number][] = [
  ["2026-08-27 00:00:00", 0.3109, 0.514, 1.0388, 0.3441],
  ["2026-08-27 00:15:00", 0.299, 0.5306, 1.163, 0.2916],
  ["2026-08-27 00:30:00", 0.3557, 0.6683, 0.6779, 0.1904],
  ["2026-08-27 00:45:00", 0.5472, 0.3112, 0.3358, 0.2019],
  ["2026-08-27 01:00:00", 0.435, 0.6463, 0.3978, 0.1369],
  ["2026-08-27 01:15:00", 0.8727, 0.556, 0.4816, 0.1546],
  ["2026-08-27 01:30:00", 0.6259, 0.5872, 0.1185, 0.3522],
  ["2026-08-27 01:45:00", 0.6602, 0.4977, 0.1031, 0.5161],
  ["2026-08-27 02:00:00", 0.7781, 0.3444, 0.2588, 0.2237],
  ["2026-08-27 02:15:00", 0.8279, 0.1621, -0.3021, 0.3788],
  ["2026-08-27 02:30:00", 0.9102, 0.427, -0.1898, 0.3409],
  ["2026-08-27 02:45:00", 0.5668, 0.2316, -0.386, 0.4871],
  ["2026-08-27 03:00:00", 0.8158, 0.0077, -0.3513, 0.3516],
  ["2026-08-27 03:15:00", 0.6253, 0.2918, -0.3251, 0.4903],
  ["2026-08-27 03:30:00", 0.5512, 0.0781, -0.5711, 0.5001],
  ["2026-08-27 03:45:00", 0.5437, 0.019, -0.9537, 0.2866],
  ["2026-08-27 04:00:00", 0.6655, 0.1718, -0.8294, 0.5086],
  ["2026-08-27 04:15:00", 0.5167, -0.2064, -0.8114, 0.5623],
  ["2026-08-27 04:30:00", 0.3679, 0.049, -1.4612, 0.4893],
  ["2026-08-27 04:45:00", 0.2908, -0.3034, -0.9564, 0.2052],
  ["2026-08-27 05:00:00", 0.1444, -0.2734, -0.7, 0.3473],
  ["2026-08-27 05:15:00", -0.0472, -0.4651, -0.8163, 0.4255],
  ["2026-08-27 05:30:00", -0.11, -0.3691, -0.9666, 0.4814],
  ["2026-08-27 05:45:00", -0.2399, -0.5438, -1.0343, 0.2285],
  ["2026-08-27 06:00:00", -0.192, -0.4956, -0.9083, 0.3401],
  ["2026-08-27 06:15:00", -0.5465, -0.6288, -0.9157, 0.2705],
  ["2026-08-27 06:30:00", -0.4504, -0.5263, -0.3934, 0.354],
  ["2026-08-27 06:45:00", -0.4723, -0.6093, -1.0646, 0.3183],
  ["2026-08-27 07:00:00", -0.5778, -0.2297, -0.6179, 0.3342],
  ["2026-08-27 07:15:00", -0.658, -0.7652, -0.2395, 0.3611],
  ["2026-08-27 07:30:00", -0.5889, -0.707, -0.0682, 0.1264],
  ["2026-08-27 07:45:00", -0.6622, -0.2129, -0.4215, 0.1895],
  ["2026-08-27 08:00:00", -0.7651, -0.5786, -0.4044, 0.2316],
  ["2026-08-27 08:15:00", -0.9559, -0.385, -0.1474, 0.3575],
  ["2026-08-27 08:30:00", -0.9169, -0.4496, 0.3293, 0.0564],
  ["2026-08-27 08:45:00", -0.7545, -0.1436, -0.0276, 0.1742],
  ["2026-08-27 09:00:00", -0.7253, -0.1549, 0.1688, -0.0007],
  ["2026-08-27 09:15:00", -0.6486, -0.1555, 0.5814, 0.1412],
  ["2026-08-27 09:30:00", -0.779, -0.0896, 0.6959, 0.0099],
  ["2026-08-27 09:45:00", -0.3358, 0.0243, 0.4942, 0.1215],
  ["2026-08-27 10:00:00", -0.6899, 0.1497, 1.0468, -0.0518],
  ["2026-08-27 10:15:00", -0.3179, 0.1715, 1.0481, 0.1943],
  ["2026-08-27 10:30:00", -0.4101, 0.0726, 0.7593, -0.1025],
  ["2026-08-27 10:45:00", -0.2893, 0.3097, 1.0301, 0.0364],
  ["2026-08-27 11:00:00", -0.1754, 0.545, 0.9426, 0.2006],
  ["2026-08-27 11:15:00", 0.0198, 0.2613, 0.7852, -0.0479],
  ["2026-08-27 11:30:00", -0.003, 0.5532, 1.0807, -0.1276],
  ["2026-08-27 11:45:00", 0.0076, 0.2674, 0.8665, -0.0583],
  ["2026-08-27 12:00:00", 0.2685, 0.3479, 0.9439, -0.1282],
  ["2026-08-27 12:15:00", 0.2016, 0.5887, 0.8588, -0.3031],
  ["2026-08-27 12:30:00", 0.4798, 0.6711, 0.9872, -0.1045],
  ["2026-08-27 12:45:00", 0.3042, 0.4575, 0.7838, -0.1786],
  ["2026-08-27 13:00:00", 0.6641, 1.1771, 0.6936, -0.1354],
  ["2026-08-27 13:15:00", 0.7959, 0.6876, 0.405, -0.1909],
  ["2026-08-27 13:30:00", 0.5917, 0.535, 0.2516, -0.2752],
  ["2026-08-27 13:45:00", 1.0975, 0.2613, 0.3606, -0.4599],
  ["2026-08-27 14:00:00", 0.7093, 0.6664, 0.1071, -0.4202],
  ["2026-08-27 14:15:00", 0.6893, 0.558, -0.1826, -0.3031],
  ["2026-08-27 14:30:00", 0.8063, 0.3035, 0.2622, -0.2722],
  ["2026-08-27 14:45:00", 0.4848, 0.3676, -0.4263, -0.2597],
  ["2026-08-27 15:00:00", 0.6454, 0.2549, -0.3151, -0.266],
  ["2026-08-27 15:15:00", 0.5468, 0.1499, -0.6263, -0.4239],
  ["2026-08-27 15:30:00", 0.9419, 0.1852, -0.8895, -0.2712],
  ["2026-08-27 15:45:00", 0.9339, 0.2017, -1.0363, -0.414],
  ["2026-08-27 16:00:00", 0.7337, -0.1378, -0.7263, -0.2891],
  ["2026-08-27 16:15:00", 0.3234, -0.1185, -1.532, -0.4682],
  ["2026-08-27 16:30:00", 0.3354, -0.3728, -0.6107, -0.5063],
  ["2026-08-27 16:45:00", 0.2117, -0.2389, -0.6865, -0.5027],
  ["2026-08-27 17:00:00", 0.3519, -0.3255, -1.1918, -0.3071],
  ["2026-08-27 17:15:00", 0.1039, -0.4799, -0.9854, -0.3843],
  ["2026-08-27 17:30:00", -0.0135, -0.3467, -0.6688, -0.4604],
  ["2026-08-27 17:45:00", 0.1853, -0.7874, -0.9862, -0.267],
  ["2026-08-27 18:00:00", -0.1943, -0.6281, -0.9509, -0.3628],
  ["2026-08-27 18:15:00", -0.4226, -0.4382, -0.7758, -0.369],
  ["2026-08-27 18:30:00", -0.2912, -0.5408, -0.608, -0.2215],
  ["2026-08-27 18:45:00", -0.6352, -0.6822, -0.5314, -0.2068],
  ["2026-08-27 19:00:00", -0.59, -0.5816, -0.3239, -0.309],
  ["2026-08-27 19:15:00", -0.5708, -0.6202, -0.5116, -0.1208],
  ["2026-08-27 19:30:00", -0.5838, -0.4485, -0.0876, -0.2082],
  ["2026-08-27 19:45:00", -0.648, -0.588, -0.1586, -0.2019],
  ["2026-08-27 20:00:00", -0.7655, -0.4138, -0.2579, 0.0428],
  ["2026-08-27 20:15:00", -0.9475, -0.6382, 0.2681, -0.064],
  ["2026-08-27 20:30:00", -0.7058, -0.307, 0.1642, -0.2088],
  ["2026-08-27 20:45:00", -0.7772, -0.4412, 0.4889, -0.109],
  ["2026-08-27 21:00:00", -0.8881, -0.3204, 0.4987, -0.1252],
  ["2026-08-27 21:15:00", -0.8502, -0.1635, 0.5803, -0.0937],
  ["2026-08-27 21:30:00", -0.7477, -0.0897, 0.3477, -0.1575],
  ["2026-08-27 21:45:00", -0.7234, -0.0788, 0.7946, 0.1573],
  ["2026-08-27 22:00:00", -0.415, 0.0077, 0.8112, -0.0639],
  ["2026-08-27 22:15:00", -0.4652, 0.0663, 0.9482, -0.0196],
  ["2026-08-27 22:30:00", -0.2953, 0.4156, 0.9155, 0.1299],
  ["2026-08-27 22:45:00", -0.1742, 0.1984, 1.0195, 0.1174],
  ["2026-08-27 23:00:00", -0.1627, 0.2111, 1.0005, 0.1921],
  ["2026-08-27 23:15:00", 0.1436, 0.5338, 1.43, 0.0913],
  ["2026-08-27 23:30:00", 0.1614, 0.4736, 1.424, 0.1124],
  ["2026-08-27 23:45:00", 0.0087, 0.4047, 0.5311, 0.1653]
];

// Helper to format ISO date time string
export function formatDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

// Generate the 7-day historical dataset (672 points) + Day 8 validation dataset (96 points) = 768 total points
export function generateSatelliteDataset(satelliteId: string): ErrorDataPoint[] {
  const prng = createPRNG(
    satelliteId === 'SAT-01' ? 104729 : 104729
  );

  const totalPoints = 768; // 8 days * 96 observations/day
  const startEpoch = new Date("2026-08-27T00:00:00Z").getTime();
  const stepMs = 15 * 60 * 1000; // 15 minutes
  const points: ErrorDataPoint[] = [];

  // Orbit parameters per satellite archetype
  const orbitPeriodHours = 12; // MEO
  const clockDriftRate = 0.0007;

  const zOscillationAmp = 0.95;

  for (let i = 0; i < totalPoints; i++) {
    const timestamp = startEpoch + i * stepMs;
    const date = new Date(timestamp);
    const timeStr = formatDateTime(date);
    const tHours = i * 0.25; // hours elapsed since start
    const isValidation = i >= 672; // Day 8 starts after 7 days (672 steps)

    let x: number;
    let y: number;
    let z: number;
    let clock: number;

    if (satelliteId === 'SAT-01' && i < USER_SAMPLE_SEED.length) {
      // Use exact ground-truth seed for SAT-01 initial hours
      const seed = USER_SAMPLE_SEED[i];
      x = seed[1];
      y = seed[2];
      z = seed[3];
      clock = seed[4];
    } else {
      // Physics-grounded GNSS error progression:
      // 1. Semi-diurnal harmonic ephemeris error (radial/along-track/cross-track resonance)
      const omega1 = (2 * Math.PI * tHours) / orbitPeriodHours;
      const omega2 = (2 * Math.PI * tHours) / 24.0; // Diurnal solar radiation pressure
      const omega3 = (2 * Math.PI * tHours) / 6.0;  // High-order gravitational terms

      // Balanced noise — enough variation for XGBoost to learn harmonic trend, yet tight Day-8 forecast vs ground truth
      const noiseX = (prng() - 0.5) * 0.08 + (prng() - 0.5) * 0.04;
      const noiseY = (prng() - 0.5) * 0.08 + (prng() - 0.5) * 0.04;
      const noiseZ = (prng() - 0.5) * 0.10 + (prng() - 0.5) * 0.05;
      const noiseClock = (prng() - 0.5) * 0.06 + (prng() - 0.5) * 0.03;

      // X Error (along-track drift + harmonic perturbation)
      const driftX = Math.sin(tHours * 0.015) * 0.35 + (tHours / totalPoints) * 0.22;
      x = 0.78 * Math.sin(omega1 + 0.4) + 0.22 * Math.cos(omega2) + driftX + noiseX;

      // Y Error (radial orbit determination residual)
      const driftY = Math.cos(tHours * 0.02) * 0.28 - (tHours / totalPoints) * 0.18;
      y = 0.65 * Math.cos(omega1 - 0.3) + 0.35 * Math.sin(omega2 * 2) + driftY + noiseY;

      // Z Error (cross-track solar out-of-plane perturbation)
      const driftZ = Math.sin(tHours * 0.008) * 0.45;
      z = zOscillationAmp * Math.sin(omega1 + 1.8) + 0.4 * Math.cos(omega3) + driftZ + noiseZ;

      // Clock Error (linear frequency offset + periodic relativistic residual + random walk phase)
      const clockBase = 0.28 + tHours * clockDriftRate;
      const clockPeriodic = 0.22 * Math.sin(omega1 - 1.1) + 0.08 * Math.sin(omega2);
      const clockRandomWalk = Math.sin(tHours * 0.04) * 0.14;
      clock = clockBase + clockPeriodic + clockRandomWalk + noiseClock;
    }

    // Round for clean GNSS precision (4 decimal places in meters)
    x = Math.round(x * 10000) / 10000;
    y = Math.round(y * 10000) / 10000;
    z = Math.round(z * 10000) / 10000;
    clock = Math.round(clock * 10000) / 10000;

    const magnitude3D = Math.round(Math.sqrt(x * x + y * y + z * z) * 10000) / 10000;

    // Simulate baseline raw parameters (e.g. uploaded vs broadcast modelled values)
    // Modelled ephemeris nominal orbit vector (km magnitude) + uploaded difference
    const nominalRadius = 26560000; // ~26,560 km MEO semi-major axis in meters
    const theta = (2 * Math.PI * tHours) / orbitPeriodHours;
    const nominalX = Math.round(nominalRadius * Math.cos(theta));
    const nominalY = Math.round(nominalRadius * Math.sin(theta));
    const nominalZ = Math.round(nominalRadius * 0.5 * Math.sin(theta));
    const nominalClock = Math.round((tHours * 3600 * 1e-9 * 299792458) * 1000) / 1000;

    points.push({
      time: timeStr,
      timestamp,
      xError: x,
      yError: y,
      zError: z,
      clockError: clock,
      magnitude3D,
      isValidation,
      rawUploaded: {
        clock: Math.round((nominalClock + clock) * 10000) / 10000,
        x: nominalX + x,
        y: nominalY + y,
        z: nominalZ + z
      },
      rawModelled: {
        clock: nominalClock,
        x: nominalX,
        y: nominalY,
        z: nominalZ
      }
    });
  }

  return points;
}

// Pre-generated satellite datasets cache for instant rendering
// Only SAT-01 for MVP
export const SATELLITE_DATASETS: Record<string, ErrorDataPoint[]> = {
  'SAT-01': generateSatelliteDataset('SAT-01'),
};

export const SATELLITES = SATELLITE_CATALOG;