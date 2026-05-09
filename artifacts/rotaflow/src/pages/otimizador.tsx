import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Navigation, Play, CheckCircle2, Clock, MapPin, Route,
  ChevronRight, RefreshCw, AlertCircle, Zap, Fuel, TrendingDown,
  Layers, AlertTriangle, ArrowRight, RadioTower, ChevronDown, ChevronUp,
  Map, ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type Entrega, type Motorista } from "@/lib/api";
import { useAuth } from "@/lib/auth";

// ── Types ────────────────────────────────────────────────────────────────────
type TrafficLevel = "livre" | "lento" | "congestionado";
type TrafficMode = "normal" | "avoid";

interface SegmentTraffic {
  fromLabel: string;
  toLabel: string;
  level: TrafficLevel;
  delayMin: number;
  reason: string;
}

interface RouteResult {
  line: [number, number][];
  durationSec: number;
  segments: [number, number][][];
  isAlternative: boolean;
}

// ── Luanda congestion hotspots ────────────────────────────────────────────────
const CONGESTION_ZONES: { name: string; center: [number, number]; radius: number; peakOnly: boolean }[] = [
  { name: "Mutamba / Centro",        center: [-8.825, 13.234], radius: 1.2, peakOnly: false },
  { name: "Marginal",                center: [-8.814, 13.235], radius: 0.9, peakOnly: true  },
  { name: "Sambizanga",              center: [-8.808, 13.255], radius: 0.8, peakOnly: true  },
  { name: "Rangel",                  center: [-8.847, 13.284], radius: 0.7, peakOnly: true  },
  { name: "Rocha Pinto",             center: [-8.862, 13.264], radius: 0.8, peakOnly: false },
  { name: "Bairro Azul",             center: [-8.872, 13.249], radius: 0.7, peakOnly: true  },
  { name: "Viana Industrial",        center: [-8.904, 13.371], radius: 1.5, peakOnly: false },
  { name: "Cacuaco Rotunda",         center: [-8.783, 13.296], radius: 1.0, peakOnly: true  },
  { name: "Talatona / Sul",          center: [-8.947, 13.189], radius: 1.2, peakOnly: false },
  { name: "Av. 21 de Janeiro",       center: [-8.836, 13.230], radius: 0.8, peakOnly: true  },
  { name: "Ingombota",               center: [-8.820, 13.243], radius: 0.7, peakOnly: false },
];

function isPeakHour(): boolean {
  const h = new Date().getHours();
  return (h >= 7 && h < 10) || (h >= 12 && h < 14) || (h >= 17 && h < 20);
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

// ── Compute traffic level for a point ────────────────────────────────────────
function trafficAtPoint(pt: [number, number]): { level: TrafficLevel; score: number; zone: string } {
  const peak = isPeakHour();
  let maxScore = 0;
  let worstZone = "";
  for (const z of CONGESTION_ZONES) {
    if (z.peakOnly && !peak) continue;
    const d = haversine(pt, z.center);
    if (d < z.radius) {
      const score = (1 - d / z.radius) * (z.peakOnly ? 0.9 : 0.7);
      if (score > maxScore) { maxScore = score; worstZone = z.name; }
    }
  }
  if (peak) maxScore = Math.min(1, maxScore * 1.3);
  const level: TrafficLevel = maxScore > 0.55 ? "congestionado" : maxScore > 0.25 ? "lento" : "livre";
  return { level, score: maxScore, zone: worstZone };
}

// ── Compute traffic for a route segment ──────────────────────────────────────
function segmentTraffic(from: [number, number], to: [number, number], fromLabel: string, toLabel: string): SegmentTraffic {
  const mid: [number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const fromT = trafficAtPoint(from);
  const midT = trafficAtPoint(mid);
  const toT = trafficAtPoint(to);
  const scores = [fromT.score, midT.score, toT.score];
  const avg = scores.reduce((a, b) => a + b, 0) / 3;
  const peak = isPeakHour();
  const level: TrafficLevel = avg > 0.5 ? "congestionado" : avg > 0.22 ? "lento" : "livre";
  const zone = [fromT, midT, toT].find((t) => t.zone)?.zone ?? "";
  const delayMin = level === "congestionado" ? Math.round(haversine(from, to) * 8) : level === "lento" ? Math.round(haversine(from, to) * 3) : 0;
  const reason = level === "congestionado"
    ? zone ? `Congestionamento em ${zone}` : "Congestionamento na zona"
    : level === "lento"
    ? peak ? "Hora de ponta — trânsito lento" : (zone ? `Tráfego moderado — ${zone}` : "Tráfego moderado")
    : "Via com boa circulação";
  return { fromLabel, toLabel, level, delayMin, reason };
}

// ── TSP nearest neighbour ─────────────────────────────────────────────────────
function optimizeRoute(depot: [number, number], stops: Entrega[], trafficMode: TrafficMode): Entrega[] {
  if (stops.length === 0) return [];
  const remaining = [...stops];
  const result: Entrega[] = [];
  let current = depot;
  while (remaining.length > 0) {
    let best = 0;
    let bestScore = Infinity;
    remaining.forEach((s, i) => {
      let score = haversine(current, [s.lat, s.lng]);
      if (trafficMode === "avoid") {
        const t = trafficAtPoint([(current[0] + s.lat) / 2, (current[1] + s.lng) / 2]);
        score *= (1 + t.score * 2);
      }
      if (score < bestScore) { bestScore = score; best = i; }
    });
    result.push(remaining[best]);
    current = [remaining[best].lat, remaining[best].lng];
    remaining.splice(best, 1);
  }
  return result;
}

function totalDistance(depot: [number, number], stops: Entrega[]): number {
  let d = 0;
  const pts: [number, number][] = [depot, ...stops.map((e) => [e.lat, e.lng] as [number, number])];
  for (let i = 0; i < pts.length - 1; i++) d += haversine(pts[i], pts[i + 1]);
  return d;
}

// ── OSRM with alternatives ────────────────────────────────────────────────────
async function fetchOsrmRoute(
  coords: [number, number][],
  wantAlternative: boolean
): Promise<{ main: RouteResult | null; alt: RouteResult | null }> {
  try {
    const waypoints = coords.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&alternatives=${wantAlternative ? 2 : "false"}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
    if (!res.ok) return { main: null, alt: null };
    const data = await res.json();
    const routes = data.routes ?? [];

    function parseRoute(r: any, isAlt: boolean): RouteResult {
      const line: [number, number][] = r.geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng] as [number, number]);
      // Split full line into per-leg segments (approximate by waypoint proximity)
      const segments: [number, number][][] = [];
      const waypointCoords = coords;
      let segStart = 0;
      for (let w = 0; w < waypointCoords.length - 1; w++) {
        const targetPt = waypointCoords[w + 1];
        let closestIdx = segStart + 1;
        let closestDist = Infinity;
        for (let i = segStart + 1; i < line.length; i++) {
          const d = haversine(line[i], targetPt);
          if (d < closestDist) { closestDist = d; closestIdx = i; }
        }
        segments.push(line.slice(segStart, closestIdx + 1));
        segStart = closestIdx;
      }
      if (segments.length === 0) segments.push(line);
      return { line, durationSec: Math.round(r.duration), segments, isAlternative: isAlt };
    }

    const main = routes[0] ? parseRoute(routes[0], false) : null;
    const alt = routes[1] ? parseRoute(routes[1], true) : null;
    return { main, alt };
  } catch {
    return { main: null, alt: null };
  }
}

// ── Traffic colours ───────────────────────────────────────────────────────────
const TRAFFIC_COLOR: Record<TrafficLevel, string> = { livre: "#16a34a", lento: "#f59e0b", congestionado: "#ef4444" };
const TRAFFIC_LABEL: Record<TrafficLevel, string> = { livre: "Livre", lento: "Lento", congestionado: "Congestionado" };
const TRAFFIC_BG: Record<TrafficLevel, string> = { livre: "#dcfce7", lento: "#fef9c3", congestionado: "#fee2e2" };
const TRAFFIC_TEXT: Record<TrafficLevel, string> = { livre: "#166534", lento: "#92400e", congestionado: "#991b1b" };

// ── Map icons ─────────────────────────────────────────────────────────────────
function createNumberedIcon(n: number, done: boolean, urgent: boolean, isNext: boolean) {
  const bg = done ? "#22c55e" : isNext ? "#f97316" : urgent ? "#ef4444" : "#2563eb";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26S32 28 32 16C32 7.163 24.837 0 16 0z" fill="${bg}" stroke="white" stroke-width="2"/>
    <text x="16" y="21" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="sans-serif">${n}</text>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -44] });
}
function createDepotIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="16" fill="#0f172a" stroke="white" stroke-width="2"/>
    <text x="17" y="22" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="sans-serif">D</text>
  </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -36] });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const prev = useRef<string>("");
  useEffect(() => {
    const key = JSON.stringify(points);
    if (key === prev.current) return;
    prev.current = key;
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15, animate: true, duration: 0.8 });
    else if (points.length === 1) map.flyTo(points[0], 14, { animate: true, duration: 0.8 });
  }, [points, map]);
  return null;
}

const DEPOT: [number, number] = [-8.8383, 13.2344];
const DEPOT_LABEL = "Ponto de Partida — Luanda Centro";
const FUEL_L_PER_KM = 0.065;
const FUEL_PRICE_KZ = 200;
const TRAFFIC_TIME_FACTOR = 1.35;

function buildGoogleMapsUrl(depot: [number, number], stops: Entrega[]): string {
  if (stops.length === 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Luanda, Angola")}`;
  }
  const origin = `${depot[0]},${depot[1]}`;
  const capped = stops.slice(0, 9);
  const destination = `${capped[capped.length - 1].lat},${capped[capped.length - 1].lng}`;
  const waypoints = capped.slice(0, -1).map((e) => `${e.lat},${e.lng}`).join("|");
  const params = new URLSearchParams({ api: "1", origin, destination, travelmode: "driving" });
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Otimizador() {
  const qc = useQueryClient();
  const { user, isEntregador } = useAuth();

  const [motoristaSel, setMotoristaSel] = useState("");
  const [optimized, setOptimized] = useState<Entrega[] | null>(null);
  const [unoptimizedDist, setUnoptimizedDist] = useState(0);
  const [routeMain, setRouteMain] = useState<RouteResult | null>(null);
  const [routeAlt, setRouteAlt] = useState<RouteResult | null>(null);
  const [activeRouteAlt, setActiveRouteAlt] = useState(false);
  const [segmentTrafficList, setSegmentTrafficList] = useState<SegmentTraffic[]>([]);
  const [trafficMode, setTrafficMode] = useState<TrafficMode>("normal");
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingAvoid, setLoadingAvoid] = useState(false);
  const [usingStraightLine, setUsingStraightLine] = useState(false);
  const [started, setStarted] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [showTrafficPanel, setShowTrafficPanel] = useState(true);

  const { data: entregas = [] } = useQuery({ queryKey: ["entregas"], queryFn: api.entregas.list });
  const { data: motoristas = [] } = useQuery({ queryKey: ["motoristas"], queryFn: api.motoristas.list });

  useEffect(() => {
    if (isEntregador && user?.motoristaNome) setMotoristaSel(user.motoristaNome);
  }, [isEntregador, user?.motoristaNome]);

  const updateMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      api.entregas.update(id, { estado: estado as Entrega["estado"] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregas"] }),
  });

  const driverDeliveries = entregas.filter(
    (e) => e.motorista === motoristaSel && (e.estado === "Pendente" || e.estado === "Em Rota")
  );
  const selectedMotorista = motoristas.find((m) => m.nome === motoristaSel);

  const buildSegmentTraffic = useCallback((ordered: Entrega[], stopLabels: string[]) => {
    const pts: [number, number][] = [DEPOT, ...ordered.map((e) => [e.lat, e.lng] as [number, number])];
    const labels = ["Partida (Luanda Centro)", ...stopLabels];
    const list: SegmentTraffic[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      list.push(segmentTraffic(pts[i], pts[i + 1], labels[i], labels[i + 1]));
    }
    setSegmentTrafficList(list);
    return list;
  }, []);

  const handleOptimize = useCallback(async (mode: TrafficMode = "normal") => {
    if (driverDeliveries.length === 0) return;
    setLoadingRoute(true);
    if (mode === "normal") setActiveRouteAlt(false);
    setStarted(false);
    setCompletedIds(new Set());
    setTrafficMode(mode);

    const ordered = optimizeRoute(DEPOT, driverDeliveries, mode);
    setOptimized(ordered);
    setUnoptimizedDist(totalDistance(DEPOT, driverDeliveries));
    buildSegmentTraffic(ordered, ordered.map((e) => e.destinatario));

    const coords: [number, number][] = [DEPOT, ...ordered.map((e) => [e.lat, e.lng] as [number, number])];
    const { main, alt } = await fetchOsrmRoute(coords, true);
    setRouteMain(main);
    setRouteAlt(alt);
    setUsingStraightLine(!main);
    setLoadingRoute(false);
  }, [driverDeliveries, buildSegmentTraffic]);

  const handleAvoidTraffic = async () => {
    if (driverDeliveries.length === 0) return;
    setLoadingAvoid(true);

    // If there's an OSRM alternative, prefer it first
    if (routeAlt && !activeRouteAlt) {
      setActiveRouteAlt(true);
      setLoadingAvoid(false);
      return;
    }

    // Otherwise re-run TSP with traffic-avoidance weights
    setLoadingAvoid(false);
    setActiveRouteAlt(false);
    await handleOptimize("avoid");
  };

  const handleStart = async () => {
    const pending = driverDeliveries.filter((e) => e.estado === "Pendente");
    await Promise.all(pending.map((e) => updateMutation.mutateAsync({ id: e.id, estado: "Em Rota" })));
    setStarted(true);
  };

  const handleComplete = async (entrega: Entrega) => {
    await updateMutation.mutateAsync({ id: entrega.id, estado: "Entregue" });
    setCompletedIds((prev) => new Set(prev).add(entrega.id));
  };

  useEffect(() => {
    if (motoristaSel && driverDeliveries.length > 0) {
      handleOptimize("normal");
    } else if (motoristaSel) {
      setOptimized(null); setRouteMain(null); setRouteAlt(null);
      setStarted(false); setCompletedIds(new Set()); setSegmentTrafficList([]);
    }
  }, [motoristaSel]);

  // Derived
  const activeRoute = activeRouteAlt && routeAlt ? routeAlt : routeMain;
  const optDist = optimized ? totalDistance(DEPOT, optimized) : 0;
  const savedDist = Math.max(0, unoptimizedDist - optDist);
  const savedFuelL = savedDist * FUEL_L_PER_KM;
  const savedKz = savedFuelL * FUEL_PRICE_KZ;
  const osrmDuration = activeRoute?.durationSec ?? 0;
  const estMinutes = osrmDuration > 0 ? Math.round(osrmDuration / 60) : Math.round(optDist * 3.5 * TRAFFIC_TIME_FACTOR);
  const trafficDelayTotal = segmentTrafficList.reduce((sum, s) => sum + s.delayMin, 0);
  const nextStopIdx = optimized ? optimized.findIndex((e) => !completedIds.has(e.id)) : -1;
  const mapPoints: [number, number][] = optimized ? [DEPOT, ...optimized.map((e) => [e.lat, e.lng] as [number, number])] : [DEPOT];
  const allDone = optimized !== null && optimized.every((e) => completedIds.has(e.id));

  const hasCongestion = segmentTrafficList.some((s) => s.level === "congestionado");
  const hasSlowTraffic = segmentTrafficList.some((s) => s.level !== "livre");

  // Active route segments
  const routeSegments = activeRoute?.segments ?? (activeRoute ? [activeRoute.line] : []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 flex-shrink-0 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "hsl(222.2 84% 4.9%)" }}>
            <Route className="w-6 h-6" style={{ color: "hsl(221 83% 53%)" }} />
            {isEntregador ? "Minha Rota" : "Optimizador de Rota"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
            {isEntregador ? `Rota optimizada para ${user?.motoristaNome ?? "o entregador"}` : "Rota mais eficiente com informação de trânsito em tempo real"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {optimized && !loadingRoute && (
            <button onClick={() => handleOptimize("normal")} disabled={loadingRoute} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: "hsl(210 40% 96.1%)", color: "hsl(215.4 16.3% 46.9%)" }}>
              <RefreshCw className={`w-4 h-4 ${loadingRoute ? "animate-spin" : ""}`} />
              Recalcular
            </button>
          )}
          {optimized && !loadingRoute && (
            <a
              href={buildGoogleMapsUrl(DEPOT, optimized)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-sm"
              style={{ background: "hsl(142 76% 95%)", color: "hsl(142 76% 30%)" }}
              title="Abrir rota no Google Maps"
            >
              <Map className="w-4 h-4" />
              Google Maps
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}
          {!isEntregador && (
            <Select value={motoristaSel} onValueChange={setMotoristaSel}>
              <SelectTrigger className="w-56 h-10 text-sm">
                <SelectValue placeholder="Seleccionar motorista..." />
              </SelectTrigger>
              <SelectContent>
                {motoristas.filter((m) => m.activo).map((m) => {
                  const pending = entregas.filter((e) => e.motorista === m.nome && (e.estado === "Pendente" || e.estado === "Em Rota")).length;
                  return (
                    <SelectItem key={m.id} value={m.nome}>
                      <div className="flex items-center gap-2">
                        <span>{m.nome}</span>
                        {pending > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "hsl(221 83% 95%)", color: "hsl(221 83% 45%)" }}>{pending}</span>}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {optimized && !loadingRoute && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="px-6 pb-3 flex-shrink-0 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: "hsl(221 83% 95%)", color: "hsl(221 83% 45%)" }}>
            <MapPin className="w-3.5 h-3.5" />{optimized.length} paragens
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: "hsl(142 76% 95%)", color: "hsl(142 76% 30%)" }}>
            <Navigation className="w-3.5 h-3.5" />{optDist.toFixed(1)} km
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: "hsl(38 92% 95%)", color: "hsl(38 92% 40%)" }}>
            <Clock className="w-3.5 h-3.5" />~{estMinutes + trafficDelayTotal} min {trafficDelayTotal > 0 && <span className="text-xs opacity-70">(+{trafficDelayTotal}m trânsito)</span>}
          </div>
          {hasCongestion && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium animate-pulse" style={{ background: "#fee2e2", color: "#991b1b" }}>
              <AlertTriangle className="w-3.5 h-3.5" />Congestionamento detectado
            </div>
          )}
          {trafficMode === "avoid" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "hsl(221 83% 95%)", color: "hsl(221 83% 45%)" }}>
              <RadioTower className="w-3 h-3" />A evitar trânsito
            </div>
          )}
          {activeRouteAlt && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "hsl(270 76% 95%)", color: "hsl(270 76% 40%)" }}>
              <ArrowRight className="w-3 h-3" />Rota alternativa activa
            </div>
          )}
          {savedDist > 0.1 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: "hsl(270 76% 95%)", color: "hsl(270 76% 40%)" }}>
              <Fuel className="w-3.5 h-3.5" />Poupança: {savedFuelL.toFixed(1)}L (~{Math.round(savedKz)} Kz)
            </div>
          )}
          {usingStraightLine && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "hsl(38 92% 95%)", color: "hsl(38 92% 40%)" }}>
              <AlertCircle className="w-3 h-3" />Linha recta (OSRM offline)
            </div>
          )}
        </motion.div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        {!motoristaSel ? (
          <div className="h-full flex items-center justify-center">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(221 83% 95%)" }}>
                <Route className="w-8 h-8" style={{ color: "hsl(221 83% 53%)" }} />
              </div>
              <div className="font-semibold text-base mb-1" style={{ color: "hsl(222.2 84% 4.9%)" }}>Seleccione um motorista</div>
              <div className="text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>A rota óptima será calculada automaticamente</div>
            </motion.div>
          </div>
        ) : driverDeliveries.length === 0 && !loadingRoute ? (
          <div className="h-full flex items-center justify-center">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(142 76% 95%)" }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: "hsl(142 76% 30%)" }} />
              </div>
              <div className="font-semibold text-base mb-1" style={{ color: "hsl(222.2 84% 4.9%)" }}>Sem entregas pendentes</div>
              <div className="text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{motoristaSel} não tem entregas por realizar</div>
            </motion.div>
          </div>
        ) : (
          <div className="flex gap-4 h-full">
            {/* ── Sidebar ──────────────────────────────────────────────────── */}
            <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pb-1">

              {/* Driver card */}
              {selectedMotorista && (
                <div className="bg-white rounded-xl border p-3 flex items-center gap-3 flex-shrink-0" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: isEntregador ? "hsl(142 76% 36%)" : "hsl(221 83% 53%)" }}>
                    {selectedMotorista.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: "hsl(222.2 84% 4.9%)" }}>{selectedMotorista.nome}</div>
                    <div className="text-xs truncate" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{selectedMotorista.veiculo} · {selectedMotorista.zona}</div>
                  </div>
                </div>
              )}

              {/* ── Traffic panel ──────────────────────────────────────────── */}
              {optimized && segmentTrafficList.length > 0 && !loadingRoute && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border overflow-hidden flex-shrink-0" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                  <button
                    onClick={() => setShowTrafficPanel((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}
                  >
                    <div className="flex items-center gap-2">
                      <RadioTower className="w-4 h-4" style={{ color: hasCongestion ? "#ef4444" : hasSlowTraffic ? "#f59e0b" : "#16a34a" }} />
                      <span className="text-sm font-semibold" style={{ color: "hsl(222.2 84% 4.9%)" }}>Situação do Trânsito</span>
                      {hasCongestion && (
                        <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: "#ef4444" }} />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {segmentTrafficList.map((s, i) => (
                          <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: TRAFFIC_COLOR[s.level] }} title={TRAFFIC_LABEL[s.level]} />
                        ))}
                      </div>
                      {showTrafficPanel ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {showTrafficPanel && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="divide-y" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                          {segmentTrafficList.map((s, i) => (
                            <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: TRAFFIC_COLOR[s.level] }} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-xs font-semibold" style={{ color: "hsl(222.2 84% 4.9%)" }}>
                                    {i === 0 ? "Partida" : `P${i}`}
                                    <span className="text-gray-400 mx-1">→</span>
                                    {i + 1 < segmentTrafficList.length ? `P${i + 1}` : "Fim"}
                                  </span>
                                  <span className="text-xs px-1.5 py-0.5 rounded font-semibold flex-shrink-0" style={{ background: TRAFFIC_BG[s.level], color: TRAFFIC_TEXT[s.level] }}>
                                    {TRAFFIC_LABEL[s.level]}
                                  </span>
                                </div>
                                <div className="text-xs truncate" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{s.reason}</div>
                                {s.delayMin > 0 && (
                                  <div className="text-xs font-semibold mt-0.5" style={{ color: s.level === "congestionado" ? "#991b1b" : "#92400e" }}>
                                    +{s.delayMin} min de atraso estimado
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Avoid traffic button */}
                        {hasSlowTraffic && (
                          <div className="px-4 py-3 border-t" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                            <button
                              onClick={handleAvoidTraffic}
                              disabled={loadingAvoid || loadingRoute}
                              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all"
                              style={{ background: hasCongestion ? "#ef4444" : "#f59e0b", color: "white", opacity: loadingAvoid ? 0.7 : 1 }}
                            >
                              {loadingAvoid ? (
                                <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />A recalcular...</>
                              ) : activeRouteAlt ? (
                                <><RefreshCw className="w-4 h-4" />Recalcular com TSP anti-trânsito</>
                              ) : routeAlt ? (
                                <><ArrowRight className="w-4 h-4" />Usar rota alternativa ({Math.round((routeAlt.durationSec - (routeMain?.durationSec ?? 0)) / 60) > 0 ? "+" : ""}{Math.round((routeAlt.durationSec - (routeMain?.durationSec ?? 0)) / 60)} min)</>
                              ) : (
                                <><RefreshCw className="w-4 h-4" />Recalcular evitando trânsito</>
                              )}
                            </button>
                            {activeRouteAlt && (
                              <button onClick={() => setActiveRouteAlt(false)} className="w-full mt-1.5 text-xs text-center py-1" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                                ← Voltar à rota original
                              </button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Fuel savings */}
              {optimized && savedDist > 0.1 && !loadingRoute && (
                <div className="rounded-xl p-3 flex-shrink-0" style={{ background: "linear-gradient(135deg, hsl(142 76% 36%), hsl(142 76% 28%))" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-white" />
                    <span className="text-white text-sm font-semibold">Poupança de Combustível</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-white font-bold text-base">{savedDist.toFixed(1)}</div><div className="text-xs text-white/70">km poupados</div></div>
                    <div><div className="text-white font-bold text-base">{savedFuelL.toFixed(1)}L</div><div className="text-xs text-white/70">combustível</div></div>
                    <div><div className="text-white font-bold text-base">{Math.round(savedKz)}</div><div className="text-xs text-white/70">Kz poupados</div></div>
                  </div>
                </div>
              )}

              {/* Action button */}
              <AnimatePresence mode="wait">
                {allDone ? (
                  <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl p-4 text-center flex-shrink-0" style={{ background: "hsl(142 76% 95%)" }}>
                    <CheckCircle2 className="w-7 h-7 mx-auto mb-1.5" style={{ color: "hsl(142 76% 30%)" }} />
                    <div className="font-semibold text-sm" style={{ color: "hsl(142 76% 20%)" }}>Rota Concluída!</div>
                    <div className="text-xs" style={{ color: "hsl(142 76% 35%)" }}>Todas as entregas realizadas</div>
                  </motion.div>
                ) : !started ? (
                  <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-shrink-0">
                    <Button onClick={handleStart} disabled={updateMutation.isPending || loadingRoute} className="w-full h-10 text-sm font-semibold text-white flex items-center gap-2" style={{ background: "hsl(142 76% 36%)" }}>
                      <Play className="w-4 h-4 fill-white" />Iniciar Rota
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border px-4 py-3 flex-shrink-0" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Progresso</span>
                      <span className="text-xs font-bold" style={{ color: "hsl(221 83% 53%)" }}>{completedIds.size}/{optimized?.length ?? 0}</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "hsl(214.3 31.8% 91.4%)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: "hsl(142 76% 42%)" }} animate={{ width: `${(completedIds.size / (optimized?.length ?? 1)) * 100}%` }} transition={{ duration: 0.4 }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stop list */}
              {loadingRoute ? (
                <div className="flex-1 flex items-center justify-center min-h-32">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "hsl(221 83% 53%)", borderTopColor: "transparent" }} />
                    <span className="text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>A calcular rota com trânsito...</span>
                  </div>
                </div>
              ) : optimized ? (
                <div className="flex-1 bg-white rounded-xl border min-h-0 overflow-y-auto" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                  <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "hsl(222.2 84% 4.9%)" }}>D</div>
                    <div><div className="text-xs font-semibold" style={{ color: "hsl(222.2 84% 4.9%)" }}>Ponto de Partida</div><div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Luanda Centro</div></div>
                  </div>
                  {optimized.map((stop, idx) => {
                    const done = completedIds.has(stop.id);
                    const isNext = started && !done && idx === nextStopIdx;
                    const prevPoint: [number, number] = idx === 0 ? DEPOT : [optimized[idx - 1].lat, optimized[idx - 1].lng];
                    const dist = haversine(prevPoint, [stop.lat, stop.lng]);
                    const traffic = segmentTrafficList[idx];
                    return (
                      <motion.div key={stop.id} layout className="border-b last:border-0" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                        <div className="px-4 py-3" style={{ background: isNext ? "hsl(38 92% 97%)" : done ? "hsl(142 76% 97%)" : "transparent" }}>
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5 relative">
                              {done ? (
                                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "hsl(142 76% 95%)" }}>
                                  <CheckCircle2 className="w-4 h-4" style={{ color: "hsl(142 76% 30%)" }} />
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: isNext ? "hsl(38 92% 50%)" : stop.prioridade === "Urgente" ? "hsl(0 84.2% 55%)" : "hsl(221 83% 53%)" }}>
                                  {idx + 1}
                                </div>
                              )}
                              {traffic && !done && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: TRAFFIC_COLOR[traffic.level] }} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                {isNext && <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: "hsl(38 92% 50%)", color: "white" }}>PRÓXIMA</span>}
                                <span className="text-xs font-semibold truncate" style={{ color: done ? "hsl(215.4 16.3% 46.9%)" : "hsl(222.2 84% 4.9%)", textDecoration: done ? "line-through" : "none" }}>
                                  {stop.destinatario}
                                </span>
                                {stop.prioridade === "Urgente" && !done && <span className="text-xs px-1 rounded font-bold" style={{ background: "hsl(0 84.2% 95%)", color: "hsl(0 84.2% 45%)" }}>!</span>}
                              </div>
                              <div className="text-xs truncate" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{stop.endereco}</div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs" style={{ color: "hsl(215.4 16.3% 60%)" }}>+{dist.toFixed(1)} km</span>
                                {traffic && !done && (
                                  <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: TRAFFIC_BG[traffic.level], color: TRAFFIC_TEXT[traffic.level] }}>
                                    {TRAFFIC_LABEL[traffic.level]}
                                    {traffic.delayMin > 0 && ` (+${traffic.delayMin}m)`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {started && !done && (
                            <div className="mt-2 pl-10">
                              <button onClick={() => handleComplete(stop)} disabled={updateMutation.isPending} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg w-full justify-center" style={{ background: "hsl(142 76% 95%)", color: "hsl(142 76% 30%)" }}>
                                <CheckCircle2 className="w-3.5 h-3.5" />Marcar como Entregue
                              </button>
                            </div>
                          )}
                        </div>
                        {idx < optimized.length - 1 && (
                          <div className="flex justify-center py-0.5">
                            <ChevronRight className="w-3.5 h-3.5 rotate-90" style={{ color: "hsl(214.3 31.8% 75%)" }} />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* ── Map ──────────────────────────────────────────────────────── */}
            <div className="flex-1 rounded-xl overflow-hidden border relative" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
              {loadingRoute && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3 bg-white rounded-2xl p-6 shadow-xl border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                    <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "hsl(221 83% 53%)", borderTopColor: "transparent" }} />
                    <span className="text-sm font-medium" style={{ color: "hsl(222.2 84% 4.9%)" }}>A calcular rota com trânsito...</span>
                    <span className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>A verificar condições de Luanda</span>
                  </div>
                </div>
              )}

              <MapContainer center={DEPOT} zoom={12} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                <FitBounds points={mapPoints} />

                {/* Alternative route (dimmed in background) */}
                {!activeRouteAlt && routeAlt && routeAlt.line.length > 1 && (
                  <Polyline positions={routeAlt.line} pathOptions={{ color: "#a855f7", weight: 3, opacity: 0.3, dashArray: "8 5" }} />
                )}

                {/* Active route — colour each segment by traffic */}
                {routeSegments.map((seg, segIdx) => {
                  if (!seg || seg.length < 2) return null;
                  const tLevel = segmentTrafficList[segIdx]?.level ?? "livre";
                  const col = TRAFFIC_COLOR[tLevel];
                  return (
                    <span key={segIdx}>
                      <Polyline positions={seg} pathOptions={{ color: "#0f172a", weight: 8, opacity: 0.08 }} />
                      <Polyline positions={seg} pathOptions={{ color: col, weight: 5, opacity: 0.95 }} />
                      <Polyline positions={seg} pathOptions={{ color: "white", weight: 1.5, opacity: 0.4, dashArray: "6 4" }} />
                    </span>
                  );
                })}

                {/* Fallback: plain route if no segments yet */}
                {routeSegments.length === 0 && activeRoute && activeRoute.line.length > 1 && (
                  <>
                    <Polyline positions={activeRoute.line} pathOptions={{ color: "#0f172a", weight: 7, opacity: 0.1 }} />
                    <Polyline positions={activeRoute.line} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.9 }} />
                  </>
                )}

                <Marker position={DEPOT} icon={createDepotIcon()}>
                  <Popup><div className="text-sm font-semibold">{DEPOT_LABEL}</div></Popup>
                </Marker>

                {optimized && optimized.map((stop, idx) => {
                  const done = completedIds.has(stop.id);
                  const isNext = started && !done && idx === nextStopIdx;
                  const traffic = segmentTrafficList[idx];
                  return (
                    <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={createNumberedIcon(idx + 1, done, stop.prioridade === "Urgente", isNext)}>
                      <Popup>
                        <div className="min-w-[200px]">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: done ? "#22c55e" : isNext ? "#f97316" : "#2563eb" }}>{idx + 1}</span>
                            <span className="font-semibold text-sm">{stop.destinatario}</span>
                          </div>
                          <div className="text-xs text-gray-500 mb-1">{stop.endereco}</div>
                          {traffic && !done && (
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: TRAFFIC_COLOR[traffic.level] }} />
                              <span className="text-xs font-semibold" style={{ color: TRAFFIC_TEXT[traffic.level] }}>{TRAFFIC_LABEL[traffic.level]}</span>
                              <span className="text-xs text-gray-400">— {traffic.reason}</span>
                            </div>
                          )}
                          {traffic?.delayMin > 0 && !done && (
                            <div className="text-xs font-semibold mb-2" style={{ color: "#92400e" }}>+{traffic.delayMin} min de atraso estimado</div>
                          )}
                          {isNext && <div className="text-xs font-bold mb-2 px-2 py-0.5 rounded" style={{ background: "#fff7ed", color: "#c2410c" }}>Próxima paragem</div>}
                          {done ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#dcfce7", color: "#166534" }}>✓ Entregue</span>
                          ) : started ? (
                            <button onClick={() => handleComplete(stop)} className="w-full text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1" style={{ background: "#dcfce7", color: "#166534" }}>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Entregue
                            </button>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: stop.prioridade === "Urgente" ? "#fee2e2" : "#dbeafe", color: stop.prioridade === "Urgente" ? "#991b1b" : "#1e40af" }}>
                              {stop.prioridade === "Urgente" ? "⚡ Urgente" : stop.estado}
                            </span>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Map legend */}
              {optimized && !loadingRoute && (
                <div className="absolute bottom-4 right-4 z-10 bg-white rounded-xl border p-3 shadow-lg text-xs" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                  <div className="flex items-center gap-1.5 mb-2 font-semibold" style={{ color: "hsl(222.2 84% 4.9%)" }}>
                    <Layers className="w-3.5 h-3.5" /> Legenda
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2"><span className="w-6 border-t-4 rounded" style={{ borderColor: "#16a34a" }} /><span style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Via livre</span></div>
                    <div className="flex items-center gap-2"><span className="w-6 border-t-4 rounded" style={{ borderColor: "#f59e0b" }} /><span style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Trânsito lento</span></div>
                    <div className="flex items-center gap-2"><span className="w-6 border-t-4 rounded" style={{ borderColor: "#ef4444" }} /><span style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Congestionado</span></div>
                    {routeAlt && <div className="flex items-center gap-2"><span className="w-6 border-t-2 border-dashed rounded" style={{ borderColor: "#a855f7" }} /><span style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Rota alternativa</span></div>}
                    <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "#0f172a" }}>D</span><span style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Partida</span></div>
                    <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "#f97316" }}>→</span><span style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Próxima</span></div>
                    <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "#22c55e" }}>✓</span><span style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Entregue</span></div>
                  </div>
                </div>
              )}

              {/* Alternative route toggle pill */}
              {routeAlt && optimized && !loadingRoute && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex bg-white rounded-full shadow-lg border overflow-hidden text-xs font-semibold" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                    <button onClick={() => setActiveRouteAlt(false)} className="px-4 py-2 transition-colors" style={{ background: !activeRouteAlt ? "hsl(221 83% 53%)" : "white", color: !activeRouteAlt ? "white" : "hsl(215.4 16.3% 46.9%)" }}>
                      Rota principal
                    </button>
                    <button onClick={() => setActiveRouteAlt(true)} className="px-4 py-2 transition-colors flex items-center gap-1" style={{ background: activeRouteAlt ? "#a855f7" : "white", color: activeRouteAlt ? "white" : "hsl(215.4 16.3% 46.9%)" }}>
                      Alternativa
                      {routeAlt && routeMain && (
                        <span className="text-xs opacity-80">
                          ({Math.round((routeAlt.durationSec - routeMain.durationSec) / 60) >= 0 ? "+" : ""}{Math.round((routeAlt.durationSec - routeMain.durationSec) / 60)}m)
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
