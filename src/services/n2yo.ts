// N2YO.com REST API v1 - Live Satellite Tracking + SAT-01 synthetic fallback
// Docs: https://www.n2yo.com/api/  |  https://api.n2yo.com/rest/v1/satellite/
// License Key provided: SKXSP9-XKRXV3-23XXR4-5TQQ  (free tier limits: tle/positions 1000/h, visualpasses/radiopasses/above 100/h)
export const N2YO_API_KEY = (import.meta as any).env?.VITE_N2YO_API_KEY || 'SKXSP9-XKRXV3-23XXR4-5TQQ';
const BASE = 'https://api.n2yo.com/rest/v1/satellite';

async function fetchJSON(url: string) {
  const r = await fetch(url, { mode: 'cors' });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`N2YO API error ${r.status}: ${text || r.statusText}`);
  }
  const j = await r.json();
  if ((j as any).error) throw new Error((j as any).error);
  return j;
}

export interface TleResponse {
  info: { satid: number; satname: string; transactionscount: number };
  tle: string;
}

export interface Position {
  satlatitude: number;
  satlongitude: number;
  sataltitude: number;
  azimuth: number;
  elevation: number;
  ra: number;
  dec: number;
  timestamp: number;
}

export interface PositionsResponse {
  info: { satname: string; satid: number; transactionscount: number };
  positions: Position[];
}

export interface Pass {
  startAz: number; startAzCompass: string; startEl: number; startUTC: number;
  maxAz: number; maxAzCompass: string; maxEl: number; maxUTC: number;
  endAz: number; endAzCompass: string; endEl: number; endUTC: number;
  mag?: number; duration?: number;
}

export interface VisualPassesResponse {
  info: { satid: number; satname: string; transactionscount: number; passescount: number };
  passes: Pass[];
}
export type RadioPassesResponse = VisualPassesResponse;

export interface AboveSat {
  satid: number;
  satname: string;
  intDesignator: string;
  launchDate: string;
  satlat: number;
  satlng: number;
  satalt: number;
}

export interface AboveResponse {
  info: { category: string; transactionscount: number; satcount: number };
  above: AboveSat[];
}

// ——— Correct URL builders ———
// N2YO expects query string ?apiKey=, not &apiKey glued to path. We use standard ?apiKey and fallback to legacy &apiKey if needed.
function tleUrl(id: number, key: string) { return `${BASE}/tle/${id}?apiKey=${key}`; }
function posUrl(id: number, la:number, lo:number, al:number, sec:number, key:string) { return `${BASE}/positions/${id}/${la}/${lo}/${al}/${sec}?apiKey=${key}`; }
function visualUrl(id:number, la:number, lo:number, al:number, d:number, v:number, key:string){ return `${BASE}/visualpasses/${id}/${la}/${lo}/${al}/${d}/${v}?apiKey=${key}`; }
function radioUrl(id:number, la:number, lo:number, al:number, d:number, e:number, key:string){ return `${BASE}/radiopasses/${id}/${la}/${lo}/${al}/${d}/${e}?apiKey=${key}`; }
function aboveUrl(la:number, lo:number, al:number, r:number, c:number, key:string){ return `${BASE}/above/${la}/${lo}/${al}/${r}/${c}?apiKey=${key}`; }

export function getTLE(noradId: number, apiKey: string = N2YO_API_KEY): Promise<TleResponse> {
  return fetchJSON(tleUrl(noradId, apiKey)).catch(() => fetchJSON(`${BASE}/tle/${noradId}&apiKey=${apiKey}`));
}
export function getPositions(noradId: number, observerLat: number, observerLng: number, observerAlt: number, seconds: number, apiKey: string = N2YO_API_KEY): Promise<PositionsResponse> {
  const sec = Math.min(300, Math.max(1, Math.floor(seconds)));
  return fetchJSON(posUrl(noradId, observerLat, observerLng, observerAlt, sec, apiKey))
    .catch(() => fetchJSON(`${BASE}/positions/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${sec}&apiKey=${apiKey}`));
}
export function getVisualPasses(noradId: number, observerLat: number, observerLng: number, observerAlt: number, days: number, minVisibility: number, apiKey: string = N2YO_API_KEY): Promise<VisualPassesResponse> {
  const d = Math.min(10, Math.max(1, days));
  return fetchJSON(visualUrl(noradId, observerLat, observerLng, observerAlt, d, minVisibility, apiKey))
    .catch(()=>fetchJSON(`${BASE}/visualpasses/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${d}/${minVisibility}&apiKey=${apiKey}`));
}
export function getRadioPasses(noradId: number, observerLat: number, observerLng: number, observerAlt: number, days: number, minElevation: number, apiKey: string = N2YO_API_KEY): Promise<RadioPassesResponse> {
  const d = Math.min(10, Math.max(1, days));
  return fetchJSON(radioUrl(noradId, observerLat, observerLng, observerAlt, d, minElevation, apiKey))
    .catch(()=>fetchJSON(`${BASE}/radiopasses/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${d}/${minElevation}&apiKey=${apiKey}`));
}
export function getAbove(observerLat: number, observerLng: number, observerAlt: number, searchRadius: number, categoryId: number, apiKey: string = N2YO_API_KEY): Promise<AboveResponse> {
  const r = Math.min(90, Math.max(0, searchRadius));
  return fetchJSON(aboveUrl(observerLat, observerLng, observerAlt, r, categoryId, apiKey))
    .catch(()=>fetchJSON(`${BASE}/above/${observerLat}/${observerLng}/${observerAlt}/${r}/${categoryId}&apiKey=${apiKey}`));
}

// ——— SAT-01 Synthetic Live Generator (fallback when N2YO fails or for dashboard satellite) ———
// Uses same orbital math as mockDataset but for real-time wall clock
export function generateSyntheticPositions(
  observerLat: number,
  observerLng: number,
  observerAlt: number,
  seconds: number,
  satName: string = 'SAT-01 (Synthetic MEO)'
): PositionsResponse {
  const now = Math.floor(Date.now() / 1000);
  const orbitPeriodSec = 12 * 3600; // MEO 12h
  const baseT = now % orbitPeriodSec;
  const positions: Position[] = [];
  for (let i = 0; i < seconds; i++) {
    const t = baseT + i;
    const theta = (2 * Math.PI * t) / orbitPeriodSec;
    // MEO inclination ~55°, RAAN drift ~ 0.06 deg/sec approx
    const incl = 55 * Math.PI / 180;
    const lat = Math.asin(Math.sin(incl) * Math.sin(theta)) * 180 / Math.PI;
    // Longitude: earth rotation + orbital node precession approx
    const lon0 = -75; // reference
    const lon = (((lon0 + (t * 360 / 86164) + (Math.cos(incl) * 15 * (t/3600)) ) % 360 + 540) % 360) - 180;
    const alt = 20200 + 1.2 * Math.sin(theta * 1.5) + 0.6 * Math.cos(theta * 0.7);
    // azimuth/elevation approx relative to observer
    const dLat = lat - observerLat;
    const dLon = lon - observerLng;
    const az = (Math.atan2(Math.sin(dLon * Math.PI/180) * Math.cos(lat*Math.PI/180),
      Math.cos(observerLat*Math.PI/180)*Math.sin(lat*Math.PI/180) - Math.sin(observerLat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.cos(dLon*Math.PI/180)) * 180/Math.PI + 360) % 360;
    // elevation approx: simplistic, >0 when near
    const centralAngle = Math.acos(Math.sin(observerLat*Math.PI/180)*Math.sin(lat*Math.PI/180) + Math.cos(observerLat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.cos(dLon*Math.PI/180)) * 180/Math.PI;
    const el = Math.max(-90, Math.min(90, 90 - centralAngle - (alt/100) ));
    positions.push({
      satlatitude: Number(lat.toFixed(4)),
      satlongitude: Number(lon.toFixed(4)),
      sataltitude: Number(alt.toFixed(2)),
      azimuth: Number(az.toFixed(2)),
      elevation: Number(el.toFixed(2)),
      ra: Number((theta * 180 / Math.PI % 360).toFixed(2)),
      dec: Number(lat.toFixed(2)),
      timestamp: now + i,
    });
  }
  return {
    info: { satname: satName, satid: 1, transactionscount: 0 },
    positions,
  };
}

export function generateSyntheticTLE(satId: number = 1, satName: string = 'SAT-01'): TleResponse {
  return {
    info: { satid: satId, satname: satName, transactionscount: 0 },
    tle: `1 ${String(satId).padStart(5,'0')}U 26000A   26243.50000000  .00001234  00000-0  00000-0 0  9991\r\n2 ${String(satId).padStart(5,'0')}  55.0000  75.0000 0012000 280.0000  80.0000  2.00560000    01`
  };
}

export function fmtUTC(ts: number): string {
  try { return new Date(ts * 1000).toUTCString(); } catch { return String(ts); }
}
