import React, { useState, useEffect, useRef } from 'react';
import { Satellite, MapPin, Radio, Eye, Navigation, Search, Crosshair, Clock, AlertCircle, ExternalLink, Copy, Play, Pause, RefreshCw } from 'lucide-react';
import { N2YO_API_KEY, getTLE, getPositions, getVisualPasses, getRadioPasses, getAbove, fmtUTC, TleResponse, PositionsResponse, VisualPassesResponse, AboveResponse } from '../services/n2yo';

const QUICK_SATS = [
  { id: 25544, name: 'ISS (SPACE STATION)' },
  { id: 20580, name: 'HST (Hubble)' },
  { id: 33591, name: 'NOAA 19' },
  { id: 43013, name: 'STARLINK-1' },
  { id: 37820, name: 'GPS BIIA-10' },
  { id: 41866, name: 'GOES-16' },
];

const CATEGORIES = [
  { id: 0, name: 'All' },
  { id: 1, name: 'Brightest' },
  { id: 2, name: 'ISS' },
  { id: 3, name: 'Weather' },
  { id: 52, name: 'Starlink' },
  { id: 20, name: 'GPS Operational' },
  { id: 18, name: 'Amateur radio' },
  { id: 10, name: 'Geostationary' },
  { id: 30, name: 'Military' },
];

// ——— Live Map ———
function LiveMap({ positions, lat, lng, noradId, satName, isLive, animIdx }: { positions: PositionsResponse | null; lat: number; lng: number; noradId: number; satName?: string; isLive: boolean; animIdx: number }) {
  const W = 1000, H = 360;
  const toXY = (la: number, lo: number) => {
    // wrap longitude -180..180
    let loN = lo;
    while (loN > 180) loN -= 360;
    while (loN < -180) loN += 360;
    const x = ((loN + 180) / 360) * W;
    const y = ((90 - la) / 180) * H;
    return { x, y };
  };
  const cur = positions?.positions[Math.min(animIdx, (positions?.positions.length || 1) - 1)] ?? null;
  const pathD = positions && positions.positions.length > 1
    ? positions.positions.map((p, i) => {
        const { x, y } = toXY(p.satlatitude, p.satlongitude);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }).join(' ')
    : '';

  // observer marker
  const obs = toXY(lat, lng);

  // velocity approx (km/s) between first two positions if available
  let vel = '—';
  if (positions && positions.positions.length >= 2) {
    const a = positions.positions[0], b = positions.positions[1];
    // haversine distance in km
    const R = 6371;
    const dLat = (b.satlatitude - a.satlatitude) * Math.PI / 180;
    const dLon = (b.satlongitude - a.satlongitude) * Math.PI / 180;
    const lat1 = a.satlatitude * Math.PI / 180, lat2 = b.satlatitude * Math.PI / 180;
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    const d = 2 * R * Math.asin(Math.sqrt(h));
    const altDiff = (b.sataltitude - a.sataltitude);
    const dist3d = Math.sqrt(d*d + altDiff*altDiff);
    vel = dist3d.toFixed(2) + ' km/s';
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-950/50">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          Live Window — NORAD {noradId} {satName ? `• ${satName}` : ''} {isLive ? '• MOVING' : '• PAUSED'}
        </div>
        <div className="text-[11px] font-mono text-slate-400 flex gap-3">
          {cur && <span className="text-cyan-300">{cur.satlatitude.toFixed(2)}°, {cur.satlongitude.toFixed(2)}° • {cur.sataltitude.toFixed(1)} km</span>}
          <span>{cur ? new Date(cur.timestamp*1000).toUTCString().slice(17,25)+' UTC' : ''}</span>
        </div>
      </div>

      <div className="relative bg-[#0f172a]">
        {/* SVG world map */}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[280px] lg:h-[340px] block">
          {/* ocean */}
          <rect x={0} y={0} width={W} height={H} fill="#0f172a" />
          {/* grid */}
          {[-60,-30,0,30,60].map(la => {
            const y = ((90 - la)/180)*H;
            return <line key={la} x1={0} y1={y} x2={W} y2={y} stroke="#1e293b" strokeWidth={la===0?1.2:0.6} strokeDasharray={la===0?'6 0':'4 4'} />;
          })}
          {[-120,-60,0,60,120,180].map(lo => {
            const x = ((lo + 180)/360)*W;
            return <line key={lo} x1={x} y1={0} x2={x} y2={H} stroke="#1e293b" strokeWidth={lo===0?1.2:0.6} strokeDasharray={lo===0?'6 0':'4 4'} />;
          })}
          {/* labels */}
          <text x={W/2} y={14} fill="#475569" fontSize="9" textAnchor="middle" fontFamily="monospace">180°   120°E   60°E   0°   60°W   120°W   180°</text>

          {/* observed location */}
          <g>
            <circle cx={obs.x} cy={obs.y} r={10} fill="none" stroke="#f43f5e" strokeWidth={1.2} opacity={0.5} />
            <circle cx={obs.x} cy={obs.y} r={3.5} fill="#f43f5e" stroke="#0f172a" strokeWidth={1.2} />
            <text x={obs.x+8} y={obs.y-8} fill="#f43f5e" fontSize="9" fontFamily="monospace" fontWeight={700}>YOU ({lat.toFixed(2)}, {lng.toFixed(2)})</text>
          </g>

          {/* trail */}
          {pathD && <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth={1.4} opacity={0.9} strokeLinejoin="round" strokeLinecap="round" />}

          {/* ground track dots for each second */}
          {positions?.positions.map((p, i) => {
            const { x, y } = toXY(p.satlatitude, p.satlongitude);
            const isCur = i === Math.min(animIdx, positions.positions.length-1);
            return <circle key={i} cx={x} cy={y} r={isCur ? 0 : 1.2} fill={isCur ? 'none' : '#22d3ee'} opacity={isCur ? 0 : 0.7} />;
          })}

          {/* current satellite — glowing */}
          {cur && (() => {
            const { x, y } = toXY(cur.satlatitude, cur.satlongitude);
            return (
              <g>
                {/* halo */}
                <circle cx={x} cy={y} r={14} fill="#22d3ee" opacity={0.15}>
                  {isLive && <animate attributeName="r" values="14;22;14" dur="1.6s" repeatCount="indefinite" />}
                  {isLive && <animate attributeName="opacity" values="0.15;0;0.15" dur="1.6s" repeatCount="indefinite" />}
                </circle>
                {/* azimuth line */}
                <line x1={obs.x} y1={obs.y} x2={x} y2={y} stroke="#22d3ee" strokeWidth={0.7} strokeDasharray="4 4" opacity={0.5} />
                {/* satellite dot */}
                <circle cx={x} cy={y} r={5.5} fill="#22d3ee" stroke="#020617" strokeWidth={1.4} />
                <circle cx={x} cy={y} r={2} fill="#fff" opacity={0.95} />
                {/* label */}
                <g transform={`translate(${x+10},${y-12})`}>
                  <rect x={-2} y={-10} width={110} height={22} rx={4} fill="#020617" opacity={0.85} />
                  <text x={4} y={0} fill="#22d3ee" fontSize="8.5" fontFamily="monospace" fontWeight={700}>{(satName || `SAT-${noradId}`).slice(0,18)}</text>
                  <text x={4} y={8} fill="#94a3b8" fontSize="7.5" fontFamily="monospace">{cur.elevation.toFixed(1)}° el • {cur.azimuth.toFixed(0)}° az</text>
                </g>
              </g>
            );
          })()}

          {/* border */}
          <rect x={0.5} y={0.5} width={W-1} height={H-1} fill="none" stroke="#1e293b" strokeWidth={1} />
        </svg>

        {/* details overlay */}
        <div className="absolute left-2 bottom-2 bg-slate-950/90 border border-slate-700 rounded-lg p-2.5 text-[11px] font-mono leading-tight min-w-[220px]">
          <div className="text-cyan-400 font-bold flex items-center gap-1.5"><Satellite className="w-3 h-3" /> {satName || `NORAD ${noradId}`} <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{isLive ? 'LIVE' : 'IDLE'}</span></div>
          {cur ? (
            <div className="mt-1.5 space-y-0.5 text-slate-300">
              <div>Lat <span className="text-white">{cur.satlatitude.toFixed(4)}°</span> • Lon <span className="text-white">{cur.satlongitude.toFixed(4)}°</span></div>
              <div>Alt <span className="text-white">{cur.sataltitude.toFixed(2)} km</span> • Vel <span className="text-white">{vel}</span></div>
              <div>Az <span className="text-white">{cur.azimuth.toFixed(1)}°</span> • El <span className={`font-bold ${cur.elevation>0 ? 'text-emerald-400' : 'text-slate-500'}`}>{cur.elevation.toFixed(1)}° {cur.elevation>0 ? '▲ visible' : '▼ below'}</span></div>
              <div>RA <span className="text-slate-400">{cur.ra.toFixed(1)}°</span> • Dec <span className="text-slate-400">{cur.dec.toFixed(1)}°</span> • t={new Date(cur.timestamp*1000).toISOString().slice(11,19)} UTC</div>
              <div className="pt-1 border-t border-slate-800 mt-1 flex gap-1.5">
                <a href={`https://www.openstreetmap.org/?mlat=${cur.satlatitude}&mlon=${cur.satlongitude}#map=4/${cur.satlatitude}/${cur.satlongitude}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">OSM <ExternalLink className="w-3 h-3" /></a>
                <span className="text-slate-600">•</span>
                <a href={`https://www.n2yo.com/?s=${noradId}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">N2YO page</a>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 mt-1">No position yet — click Positions / Live</div>
          )}
        </div>

        <div className="absolute right-2 top-2 bg-slate-950/80 border border-slate-700 rounded px-2 py-1 text-[10px] font-mono text-slate-400">
          Equatorial • Equirectangular • W {W} • frame {animIdx+1}/{positions?.positions.length ?? 0}
        </div>
      </div>
    </div>
  );
}

export const LiveTracker: React.FC = () => {
  const [lat, setLat] = useState<number>(28.6139);
  const [lng, setLng] = useState<number>(77.2090);
  const [alt, setAlt] = useState<number>(0);
  const [noradId, setNoradId] = useState<number>(25544);
  const [seconds, setSeconds] = useState<number>(15);
  const [days, setDays] = useState<number>(2);
  const [minVis, setMinVis] = useState<number>(300);
  const [minEl, setMinEl] = useState<number>(30);
  const [radius, setRadius] = useState<number>(70);
  const [category, setCategory] = useState<number>(0);

  const [activePane, setActivePane] = useState<'positions' | 'tle' | 'visual' | 'radio' | 'above'>('positions');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tle, setTle] = useState<TleResponse | null>(null);
  const [positions, setPositions] = useState<PositionsResponse | null>(null);
  const [visual, setVisual] = useState<VisualPassesResponse | null>(null);
  const [radio, setRadio] = useState<VisualPassesResponse | null>(null);
  const [above, setAbove] = useState<AboveResponse | null>(null);
  const [live, setLive] = useState(false);
  const [animIdx, setAnimIdx] = useState(0);
  const liveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported in this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      p => {
        setLat(Number(p.coords.latitude.toFixed(4)));
        setLng(Number(p.coords.longitude.toFixed(4)));
        setAlt(Math.round(p.coords.altitude || 0));
        setError(null);
      },
      e => setError('Geolocation failed: ' + e.message)
    );
  };

  // Live polling: fetch every 5s, animate 1 fps inside
  useEffect(() => {
    if (live) {
      handlePositions();
      liveRef.current = setInterval(handlePositions, 5000);
    } else {
      if (liveRef.current) clearInterval(liveRef.current);
    }
    return () => { if (liveRef.current) clearInterval(liveRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  // animate dot 1 fps inside fetched window
  useEffect(() => {
    if (!live || !positions) return;
    const id = setInterval(() => setAnimIdx(i => (i + 1) % (positions.positions.length || 1)), 1000);
    return () => clearInterval(id);
  }, [live, positions]);

  // reset anim when new positions arrive
  useEffect(() => { setAnimIdx(0); }, [positions]);

  const handleTLE = async () => {
    setLoading('tle'); setError(null);
    try {
      const r = await getTLE(noradId);
      setTle(r);
      setActivePane('tle');
    } catch (e: any) {
      setError(e.message || 'Failed to fetch TLE. Check API key limit (1000/h) or NORAD ID.');
    } finally { setLoading(null); }
  };

  const handlePositions = async () => {
    setLoading('positions'); setError(null);
    try {
      const r = await getPositions(noradId, lat, lng, alt, seconds);
      setPositions(r);
      setActivePane('positions');
    } catch (e: any) {
      setError(e.message || 'Failed to fetch positions. If CORS error, check N2YO availability.');
      setLive(false);
    } finally { setLoading(null); }
  };

  const handleVisual = async () => {
    setLoading('visual'); setError(null);
    try {
      const r = await getVisualPasses(noradId, lat, lng, alt, days, minVis);
      setVisual(r);
      setActivePane('visual');
    } catch (e: any) { setError(e.message); } finally { setLoading(null); }
  };

  const handleRadio = async () => {
    setLoading('radio'); setError(null);
    try {
      const r = await getRadioPasses(noradId, lat, lng, alt, days, minEl);
      setRadio(r);
      setActivePane('radio');
    } catch (e: any) { setError(e.message); } finally { setLoading(null); }
  };

  const handleAbove = async () => {
    setLoading('above'); setError(null);
    try {
      const r = await getAbove(lat, lng, alt, radius, category);
      setAbove(r);
      setActivePane('above');
    } catch (e: any) { setError(e.message); } finally { setLoading(null); }
  };

  const copy = (t: string) => navigator.clipboard.writeText(t).catch(()=>{});

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Live Satellite Tracking
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">N2YO.com REST API v1</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">35199 objects</span>
              </h2>
              <p className="text-xs text-slate-400">
                Real-time TLE, groundtrack & passes. API key: <code className="text-cyan-300 font-mono">{N2YO_API_KEY.slice(0,4)}••••{N2YO_API_KEY.slice(-4)}</code> • <code className="text-slate-300">GET /positions /tle /visualpasses /radiopasses /above</code>
              </p>
            </div>
          </div>
          <a href="https://www.n2yo.com/" target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">N2YO.com <ExternalLink className="w-3 h-3" /></a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400">HD Live from ISS</div>
            <a href="https://www.n2yo.com/space-station/" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1 mt-1">Watch now <ExternalLink className="w-3 h-3" /></a>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400">Objects crossing now</div>
            <div className="text-white font-mono">2,535</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400">ISS next pass</div>
            <div className="text-white font-mono">12h 7m</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-400">Tx last 60 min</div>
            <div className="text-white font-mono">{positions?.info.transactionscount ?? tle?.info.transactionscount ?? visual?.info.transactionscount ?? above?.info.transactionscount ?? '—'} / 1000</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><MapPin className="w-4 h-4 text-cyan-400" /> Observer & Target</h3>
          <button onClick={useMyLocation} className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 flex items-center gap-1.5"><Crosshair className="w-3.5 h-3.5" /> Use my location</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <label className="text-xs text-slate-400">NORAD ID
            <input type="number" value={noradId} onChange={e=>setNoradId(parseInt(e.target.value)||25544)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono" />
          </label>
          <label className="text-xs text-slate-400">Lat (°)
            <input type="number" step="0.0001" value={lat} onChange={e=>setLat(parseFloat(e.target.value))} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono" />
          </label>
          <label className="text-xs text-slate-400">Lng (°)
            <input type="number" step="0.0001" value={lng} onChange={e=>setLng(parseFloat(e.target.value))} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono" />
          </label>
          <label className="text-xs text-slate-400">Alt (m)
            <input type="number" value={alt} onChange={e=>setAlt(parseInt(e.target.value)||0)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono" />
          </label>
          <div className="flex items-end gap-2">
            <button onClick={handleTLE} disabled={loading==='tle'} className="flex-1 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-white flex items-center justify-center gap-1.5">{loading==='tle' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Search className="w-3.5 h-3.5" />} TLE</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_SATS.map(s => (
            <button key={s.id} onClick={()=>setNoradId(s.id)} className={`px-2.5 py-1 rounded text-xs font-mono border ${noradId===s.id ? 'bg-cyan-500 text-slate-950 border-cyan-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>{s.id} — {s.name}</button>
          ))}
        </div>
        {error && <div className="p-3 rounded bg-red-950/50 border border-red-800 text-xs text-red-300 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      </div>

      {/* LIVE MAP WINDOW — always visible */}
      <LiveMap positions={positions} lat={lat} lng={lng} noradId={noradId} satName={positions?.info.satname || tle?.info.satname} isLive={live} animIdx={animIdx} />

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 flex flex-wrap gap-2 items-center">
        <div className="flex gap-2 flex-wrap">
          <button onClick={handlePositions} disabled={loading==='positions'} className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 border border-cyan-500">{loading==='positions' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />} Positions</button>
          <button onClick={() => setLive(v=>!v)} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 border ${live ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'}`}>{live ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}{live ? 'Live ON (5s)' : 'Live OFF'}</button>
          <button onClick={handleVisual} disabled={loading==='visual'} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs border border-slate-700 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Visual</button>
          <button onClick={handleRadio} disabled={loading==='radio'} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs border border-slate-700 flex items-center gap-1.5"><Radio className="w-3.5 h-3.5" /> Radio</button>
          <button onClick={handleAbove} disabled={loading==='above'} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs border border-slate-700 flex items-center gap-1.5"><Search className="w-3.5 h-3.5" /> What's Up</button>
        </div>
        <div className="ml-auto flex gap-2 text-xs">
          <label>seconds <input type="number" min={1} max={300} value={seconds} onChange={e=>setSeconds(parseInt(e.target.value)||10)} className="ml-1 w-16 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-white font-mono" /></label>
          <label>days <input type="number" min={1} max={10} value={days} onChange={e=>setDays(parseInt(e.target.value)||2)} className="ml-1 w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-white font-mono" /></label>
        </div>
      </div>

      <div className="flex gap-1.5 text-xs">
        {(['positions','tle','visual','radio','above'] as const).map(p => (
          <button key={p} onClick={()=>setActivePane(p)} className={`px-3 py-1 rounded capitalize border ${activePane===p ? 'bg-cyan-500 text-slate-950 border-cyan-500 font-bold' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>{p}</button>
        ))}
      </div>

      {activePane === 'tle' && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <h4 className="text-sm font-bold text-white flex items-center gap-2"><Satellite className="w-4 h-4 text-cyan-400" /> TLE — {noradId} {tle?.info.satname && `• ${tle.info.satname}`}</h4>
          {!tle ? <div className="text-xs text-slate-400 mt-3">Click “Get TLE” for NORAD {noradId}. Example: <code className="text-cyan-300">GET /tle/{noradId}&apiKey=...</code></div> : (
            <div className="mt-3">
              <div className="bg-slate-950 border border-slate-700 rounded p-3 font-mono text-xs text-cyan-300 whitespace-pre-wrap break-all">{tle.tle.split('\r\n').join('\n')}</div>
              <div className="flex gap-2 mt-2">
                <button onClick={()=>copy(tle.tle)} className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
                <span className="text-[11px] text-slate-500 self-center">Tx: {tle.info.transactionscount} / 1000</span>
              </div>
            </div>
          )}
        </div>
      )}

      {activePane === 'positions' && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2"><Navigation className="w-4 h-4 text-cyan-400" /> Positions — next {seconds}s {positions?.info.satname && `• ${positions.info.satname}`}</h4>
            <span className="text-[11px] text-slate-500">{positions?.positions.length ?? 0} pts • Tx {positions?.info.transactionscount ?? '—'}/1000</span>
          </div>
          {!positions ? <div className="text-xs text-slate-400 mt-3">Click Positions or enable Live. <code className="text-cyan-300">GET /positions/{noradId}/{lat}/{lng}/{alt}/{seconds}&apiKey=...</code></div> : (
            <div className="overflow-x-auto mt-3 max-h-[320px] overflow-y-auto">
              <table className="w-full text-xs font-mono">
                <thead className="sticky top-0 bg-slate-900"><tr className="text-slate-400 border-b border-slate-700 uppercase text-[10px]"><th className="py-2 px-2">UTC</th><th className="py-2 px-2">Lat</th><th className="py-2 px-2">Lng</th><th className="py-2 px-2">Alt (km)</th><th className="py-2 px-2">Az</th><th className="py-2 px-2">El</th><th className="py-2 px-2">Map</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {positions.positions.map((p, i) => (
                    <tr key={i} className={`hover:bg-slate-800/50 text-slate-200 ${i===animIdx && live ? 'bg-cyan-500/10' : ''}`}>
                      <td className="py-1.5 px-2">{new Date(p.timestamp*1000).toUTCString().slice(17,25)} UTC {i===animIdx && live && <span className="text-cyan-400">●</span>}</td>
                      <td className="py-1.5 px-2 text-cyan-300">{p.satlatitude.toFixed(2)}</td>
                      <td className="py-1.5 px-2 text-cyan-300">{p.satlongitude.toFixed(2)}</td>
                      <td className="py-1.5 px-2">{p.sataltitude.toFixed(1)}</td>
                      <td className="py-1.5 px-2">{p.azimuth.toFixed(1)}°</td>
                      <td className={`py-1.5 px-2 ${p.elevation>0?'text-emerald-400':'text-slate-500'}`}>{p.elevation.toFixed(1)}°</td>
                      <td className="py-1.5 px-2"><a href={`https://www.openstreetmap.org/?mlat=${p.satlatitude}&mlon=${p.satlongitude}#map=4/${p.satlatitude}/${p.satlongitude}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">OSM <ExternalLink className="w-3 h-3" /></a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activePane === 'visual' && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white"><Eye className="w-4 h-4 text-cyan-400" /> Visual Passes — {noradId} {visual?.info.satname && `• ${visual.info.satname}`}</div>
          <div className="flex gap-2 mt-2 text-xs"> Days <input value={days} onChange={e=>setDays(parseInt(e.target.value)||2)} type="number" min={1} max={10} className="w-14 bg-slate-950 border border-slate-700 rounded px-1 py-1 text-white font-mono" /> Min vis (s) <input value={minVis} onChange={e=>setMinVis(parseInt(e.target.value)||300)} type="number" className="w-20 bg-slate-950 border border-slate-700 rounded px-1 py-1 text-white font-mono" /> <button onClick={handleVisual} className="px-3 py-1 rounded bg-cyan-600 text-white font-bold">Fetch</button></div>
          {!visual ? <div className="text-xs text-slate-400 mt-3">GET /visualpasses/{noradId}/{lat}/{lng}/{alt}/{days}/{minVis}&apiKey=...</div> : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs font-mono">
                <thead><tr className="text-slate-400 border-b border-slate-700 uppercase text-[10px]"><th className="py-2 px-2">Start (UTC)</th><th className="py-2 px-2">Max El</th><th className="py-2 px-2">End</th><th className="py-2 px-2">Dur</th><th className="py-2 px-2">Mag</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {visual.passes.length===0 ? <tr><td colSpan={5} className="py-4 text-center text-slate-500">No passes ≥{minVis}s in {days}d</td></tr> : visual.passes.map((p,i)=>(
                    <tr key={i} className="hover:bg-slate-800/50 text-slate-200">
                      <td className="py-2 px-2">{fmtUTC(p.startUTC)} <span className="text-slate-500">({p.startAzCompass} {p.startAz.toFixed(1)}°)</span></td>
                      <td className="py-2 px-2 text-amber-300">{p.maxEl.toFixed(1)}° @ {fmtUTC(p.maxUTC).slice(17,22)}</td>
                      <td className="py-2 px-2">{fmtUTC(p.endUTC).slice(17,22)} {p.endAzCompass}</td>
                      <td className="py-2 px-2">{p.duration}s</td>
                      <td className="py-2 px-2">{p.mag===100000?'—':p.mag}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activePane === 'radio' && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white"><Radio className="w-4 h-4 text-cyan-400" /> Radio Passes — {noradId}</div>
          <div className="flex gap-2 mt-2 text-xs"> Days <input value={days} onChange={e=>setDays(parseInt(e.target.value)||2)} type="number" min={1} max={10} className="w-14 bg-slate-950 border border-slate-700 rounded px-1 py-1 text-white font-mono" /> Min el <input value={minEl} onChange={e=>setMinEl(parseInt(e.target.value)||10)} type="number" className="w-20 bg-slate-950 border border-slate-700 rounded px-1 py-1 text-white font-mono" /> <button onClick={handleRadio} className="px-3 py-1 rounded bg-cyan-600 text-white font-bold">Fetch</button></div>
          {!radio ? <div className="text-xs text-slate-400 mt-3">GET /radiopasses/{noradId}/{lat}/{lng}/{alt}/{days}/{minEl}&apiKey=...</div> : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-xs font-mono">
                <thead><tr className="text-slate-400 border-b border-slate-700 uppercase text-[10px]"><th className="py-2 px-2">Start UTC</th><th className="py-2 px-2">Max</th><th className="py-2 px-2">End UTC</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {radio.passes.length===0 ? <tr><td colSpan={3} className="py-4 text-center text-slate-500">No radio passes ≥{minEl}°</td></tr> : radio.passes.map((p,i)=>(
                    <tr key={i} className="hover:bg-slate-800/50 text-slate-200">
                      <td className="py-2 px-2">{fmtUTC(p.startUTC)} {p.startAzCompass}</td>
                      <td className="py-2 px-2 text-amber-300">{p.maxEl.toFixed(1)}° {p.maxAzCompass} {fmtUTC(p.maxUTC).slice(11,16)}</td>
                      <td className="py-2 px-2">{fmtUTC(p.endUTC)} {p.endAzCompass}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activePane === 'above' && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-white"><Search className="w-4 h-4 text-cyan-400" /> What's Up</div>
          <div className="flex flex-wrap gap-2 mt-2 text-xs items-end">
            <label>Radius (°) <input type="number" min={0} max={90} value={radius} onChange={e=>setRadius(parseInt(e.target.value)||70)} className="ml-1 w-16 bg-slate-950 border border-slate-700 rounded px-1 py-1 text-white font-mono" /></label>
            <label>Category <select value={category} onChange={e=>setCategory(parseInt(e.target.value))} className="ml-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white">
              {CATEGORIES.map(c=> <option key={c.id} value={c.id}>{c.id} — {c.name}</option>)}
            </select></label>
            <button onClick={handleAbove} className="px-3 py-1 rounded bg-cyan-600 text-white font-bold">Search</button>
            <span className="text-[11px] text-slate-500">GET /above/{lat}/{lng}/{alt}/{radius}/{category}&apiKey=...</span>
          </div>
          {!above ? <div className="text-xs text-slate-500 mt-3">Find everything above horizon.</div> : (
            <div className="overflow-x-auto mt-3">
              <div className="text-xs text-slate-400 mb-2">{above.info.category} • {above.info.satcount} objects • Tx {above.info.transactionscount}/100</div>
              <table className="w-full text-xs font-mono">
                <thead><tr className="text-slate-400 border-b border-slate-700 uppercase text-[10px]"><th className="py-2 px-2">NORAD</th><th className="py-2 px-2">Name</th><th className="py-2 px-2">Launched</th><th className="py-2 px-2">Lat</th><th className="py-2 px-2">Lng</th><th className="py-2 px-2">Alt (km)</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {above.above.length===0 ? <tr><td colSpan={6} className="py-4 text-center text-slate-500">No objects</td></tr> : above.above.slice(0,100).map(s=>(
                    <tr key={s.satid} className="hover:bg-slate-800/50 text-slate-200">
                      <td className="py-1.5 px-2 text-cyan-300 cursor-pointer hover:underline" onClick={()=>setNoradId(s.satid)}>{s.satid}</td>
                      <td className="py-1.5 px-2">{s.satname}</td>
                      <td className="py-1.5 px-2 text-slate-400">{s.launchDate}</td>
                      <td className="py-1.5 px-2">{Number(s.satlat).toFixed(2)}</td>
                      <td className="py-1.5 px-2">{Number(s.satlng).toFixed(2)}</td>
                      <td className="py-1.5 px-2">{Number(s.satalt).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {above.above.length>100 && <div className="text-[11px] text-slate-500 mt-1">Showing 100 of {above.above.length}</div>}
            </div>
          )}
        </div>
      )}

      <div className="text-[11px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Visual = optically visible (above horizon + illuminated + dark). Radio = any pass ≥ min elevation. Limits: tle/positions 1000/h, visual/radio/above 100/h.</div>
    </div>
  );
};
