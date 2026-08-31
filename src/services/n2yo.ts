// N2YO.com REST API v1 - Live Satellite Tracking
// Docs: https://www.n2yo.com/api/  |  https://api.n2yo.com/rest/v1/satellite/
// License Key provided: SKXSP9-XKRXV3-23XXR4-5TQQ  (free tier limits: tle/positions 1000/h, visualpasses/radiopasses/above 100/h)
export const N2YO_API_KEY = (import.meta as any).env?.VITE_N2YO_API_KEY || 'SKXSP9-XKRXV3-23XXR4-5TQQ';
const BASE = 'https://api.n2yo.com/rest/v1/satellite';

async function fetchJSON(url: string) {
  const r = await fetch(url);
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`N2YO API error ${r.status}: ${text || r.statusText}`);
  }
  const j = await r.json();
  // N2YO sometimes returns { error: "..."} with 200
  if ((j as any).error) throw new Error((j as any).error);
  return j;
}

export interface TleResponse {
  info: { satid: number; satname: string; transactionscount: number };
  tle: string; // two lines separated by \r\n
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

// Get TLE for NORAD id
export function getTLE(noradId: number, apiKey: string = N2YO_API_KEY): Promise<TleResponse> {
  const url = `${BASE}/tle/${noradId}&apiKey=${apiKey}`;
  // N2YO expects /tle/{id}?apiKey=... but docs show &apiKey — support both
  // Correct format per docs: /tle/{id}&apiKey={key} (no ?). We'll use as docs.
  // Fallback: if & fails, try ?apiKey
  return fetchJSON(url).catch(() => fetchJSON(`${BASE}/tle/${noradId}?apiKey=${apiKey}`));
}

export function getPositions(
  noradId: number,
  observerLat: number,
  observerLng: number,
  observerAlt: number,
  seconds: number,
  apiKey: string = N2YO_API_KEY
): Promise<PositionsResponse> {
  const sec = Math.min(300, Math.max(1, Math.floor(seconds)));
  const url = `${BASE}/positions/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${sec}&apiKey=${apiKey}`;
  return fetchJSON(url).catch(() => fetchJSON(`${BASE}/positions/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${sec}?apiKey=${apiKey}`));
}

export function getVisualPasses(
  noradId: number,
  observerLat: number,
  observerLng: number,
  observerAlt: number,
  days: number,
  minVisibility: number,
  apiKey: string = N2YO_API_KEY
): Promise<VisualPassesResponse> {
  const d = Math.min(10, Math.max(1, days));
  const url = `${BASE}/visualpasses/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${d}/${minVisibility}&apiKey=${apiKey}`;
  return fetchJSON(url).catch(() => fetchJSON(`${BASE}/visualpasses/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${d}/${minVisibility}?apiKey=${apiKey}`));
}

export function getRadioPasses(
  noradId: number,
  observerLat: number,
  observerLng: number,
  observerAlt: number,
  days: number,
  minElevation: number,
  apiKey: string = N2YO_API_KEY
): Promise<RadioPassesResponse> {
  const d = Math.min(10, Math.max(1, days));
  const url = `${BASE}/radiopasses/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${d}/${minElevation}&apiKey=${apiKey}`;
  return fetchJSON(url).catch(() => fetchJSON(`${BASE}/radiopasses/${noradId}/${observerLat}/${observerLng}/${observerAlt}/${d}/${minElevation}?apiKey=${apiKey}`));
}

export function getAbove(
  observerLat: number,
  observerLng: number,
  observerAlt: number,
  searchRadius: number,
  categoryId: number,
  apiKey: string = N2YO_API_KEY
): Promise<AboveResponse> {
  const r = Math.min(90, Math.max(0, searchRadius));
  const url = `${BASE}/above/${observerLat}/${observerLng}/${observerAlt}/${r}/${categoryId}&apiKey=${apiKey}`;
  return fetchJSON(url).catch(() => fetchJSON(`${BASE}/above/${observerLat}/${observerLng}/${observerAlt}/${r}/${categoryId}?apiKey=${apiKey}`));
}

// Helper to format timestamp
export function fmtUTC(ts: number): string {
  try { return new Date(ts * 1000).toUTCString(); } catch { return String(ts); }
}
