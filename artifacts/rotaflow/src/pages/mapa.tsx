import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Truck, Navigation, Clock, Users, CheckCircle2, AlertCircle, Loader2, Phone, MapPin, Package, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MotoristaMapaInfo {
  id: number;
  codigo: string;
  nome: string;
  telefone: string;
  zona: string;
  veiculo: string;
  activo: boolean;
  entregasTotal: number;
  taxaSucesso: number;
  estado: "em_rota" | "disponivel" | "inactivo";
  lat: number;
  lng: number;
  entregasEmRota: number;
  entregasPendentes: number;
  entregaAtual: {
    id: number;
    codigo: string;
    destinatario: string;
    endereco: string;
    prioridade: string;
  } | null;
}

const ESTADO_CFG = {
  em_rota:    { label: "Em Rota",    color: "#2563eb", bg: "hsl(221 83% 95%)", dot: "#2563eb", pulse: true  },
  disponivel: { label: "Disponível", color: "#16a34a", bg: "hsl(142 76% 95%)", dot: "#16a34a", pulse: false },
  inactivo:   { label: "Inactivo",   color: "#64748b", bg: "hsl(215 20% 95%)", dot: "#64748b", pulse: false },
};

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Truck; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border p-4 flex items-center gap-3" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>{value}</div>
        <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{label}</div>
      </div>
    </div>
  );
}

function MotoristaCard({
  m, selected, onClick,
}: { m: MotoristaMapaInfo; selected: boolean; onClick: () => void }) {
  const cfg = ESTADO_CFG[m.estado];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      data-testid={`card-motorista-${m.id}`}
      className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
      style={{
        borderColor: selected ? "hsl(221 83% 53%)" : "hsl(214.3 31.8% 91.4%)",
        background: selected ? "hsl(221 83% 53% / 0.05)" : "white",
      }}
    >
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ background: cfg.color }}>
          {m.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
        </div>
        {cfg.pulse && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white animate-pulse"
            style={{ background: cfg.dot }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: "hsl(222.2 84% 4.9%)" }}>{m.nome}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
          <span className="text-xs" style={{ color: cfg.color }}>{cfg.label}</span>
          {m.entregasEmRota > 0 && (
            <span className="text-xs ml-1" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>· {m.entregasEmRota} em rota</span>
          )}
        </div>
      </div>
      <div className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: cfg.bg, color: cfg.color }}>
        {m.veiculo}
      </div>
    </motion.div>
  );
}

function MotoristaDetail({ m, onClose }: { m: MotoristaMapaInfo; onClose: () => void }) {
  const cfg = ESTADO_CFG[m.estado];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="bg-white rounded-2xl border shadow-lg overflow-hidden"
      style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}
    >
      <div className="p-4 border-b" style={{ borderColor: "hsl(214.3 31.8% 91.4%)", background: `${cfg.color}08` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold"
              style={{ background: cfg.color }}>
              {m.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <div className="font-semibold" style={{ color: "hsl(222.2 84% 4.9%)" }}>{m.nome}</div>
              <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{m.codigo} · {m.veiculo}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded-lg hover:bg-slate-100"
            style={{ color: "hsl(215.4 16.3% 46.9%)" }}>✕</button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
          <span className="text-sm font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Package, label: "Total entregas", value: m.entregasTotal },
            { icon: CheckCircle2, label: "Taxa sucesso", value: `${m.taxaSucesso}%` },
            { icon: Navigation, label: "Em rota", value: m.entregasEmRota },
            { icon: Clock, label: "Pendentes", value: m.entregasPendentes },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl p-3 border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)", background: "hsl(210 40% 98%)" }}>
              <Icon className="w-4 h-4 mb-1" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
              <div className="text-lg font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>{value}</div>
              <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{label}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 py-2 border-t" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <Phone className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
          <span className="text-sm" style={{ color: "hsl(222.2 84% 4.9%)" }}>{m.telefone}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
          <span className="text-sm" style={{ color: "hsl(222.2 84% 4.9%)" }}>Zona: {m.zona}</span>
        </div>
        {m.entregaAtual && (
          <div className="rounded-xl p-3 border mt-1"
            style={{ borderColor: "hsl(221 83% 75%)", background: "hsl(221 83% 95%)" }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "hsl(221 83% 45%)" }}>
              Entrega em curso
            </div>
            <div className="text-sm font-medium" style={{ color: "hsl(222.2 84% 4.9%)" }}>
              {m.entregaAtual.destinatario}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
              {m.entregaAtual.endereco}
            </div>
            {m.entregaAtual.prioridade === "Urgente" && (
              <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "hsl(0 84.2% 95%)", color: "hsl(0 84.2% 45%)" }}>
                Urgente
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function Mapa() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<Record<number, any>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "em_rota" | "disponivel" | "inactivo">("todos");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: motoristas = [], isLoading, refetch } = useQuery<MotoristaMapaInfo[]>({
    queryKey: ["mapa-motoristas"],
    queryFn: () => fetch("/api/mapa/motoristas", {
      headers: { Authorization: `Bearer ${localStorage.getItem("rf_token")}` },
    }).then((r) => r.json()),
    refetchInterval: 20000,
  });

  const selectedMotorista = motoristas.find((m) => m.id === selectedId) ?? null;
  const filtered = filtro === "todos" ? motoristas : motoristas.filter((m) => m.estado === filtro);

  const emRota = motoristas.filter((m) => m.estado === "em_rota").length;
  const disponiveis = motoristas.filter((m) => m.estado === "disponivel").length;
  const inactivos = motoristas.filter((m) => m.estado === "inactivo").length;
  const totalEmRota = motoristas.reduce((s, m) => s + m.entregasEmRota, 0);

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    import("leaflet").then((L) => {
      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [-8.838, 13.234],
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Compact attribution
      L.control.attribution({ prefix: "© OSM" }).addTo(map);

      leafletMapRef.current = map;
    });

    return () => {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!leafletMapRef.current || !motoristas.length) return;
    setLastRefresh(new Date());

    import("leaflet").then((L) => {
      const map = leafletMapRef.current;

      motoristas.forEach((m) => {
        const cfg = ESTADO_CFG[m.estado];

        const icon = L.divIcon({
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
          html: `
            <div style="
              width:36px;height:36px;border-radius:50% 50% 50% 0;
              background:${cfg.color};transform:rotate(-45deg);
              border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
              display:flex;align-items:center;justify-content:center;
            ">
              <span style="transform:rotate(45deg);color:white;font-size:13px;font-weight:700;line-height:1">
                ${m.nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
              </span>
            </div>
            ${cfg.pulse ? `<div style="position:absolute;top:0;left:0;width:36px;height:36px;border-radius:50%;background:${cfg.color};opacity:0.3;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ""}
          `,
        });

        if (markersRef.current[m.id]) {
          markersRef.current[m.id].setLatLng([m.lat, m.lng]).setIcon(icon);
        } else {
          const marker = L.marker([m.lat, m.lng], { icon });

          marker.bindTooltip(
            `<div style="font-family:sans-serif;min-width:160px;">
              <div style="font-weight:600;font-size:13px;margin-bottom:2px;">${m.nome}</div>
              <div style="font-size:11px;color:#64748b;">${m.veiculo} · ${m.zona}</div>
              <div style="font-size:11px;color:${cfg.color};margin-top:4px;font-weight:500;">${cfg.label}</div>
              ${m.entregaAtual ? `<div style="font-size:11px;color:#334155;margin-top:2px;">→ ${m.entregaAtual.destinatario}</div>` : ""}
            </div>`,
            { permanent: false, direction: "top", className: "custom-tooltip" }
          );

          marker.on("click", () => setSelectedId(m.id));
          marker.addTo(map);
          markersRef.current[m.id] = marker;
        }
      });

      // Remove markers for deleted motoristas
      Object.keys(markersRef.current).forEach((idStr) => {
        const id = Number(idStr);
        if (!motoristas.find((m) => m.id === id)) {
          markersRef.current[id].remove();
          delete markersRef.current[id];
        }
      });
    });
  }, [motoristas]);

  // Pan map to selected motorista
  useEffect(() => {
    if (!leafletMapRef.current || !selectedMotorista) return;
    leafletMapRef.current.flyTo([selectedMotorista.lat, selectedMotorista.lng], 15, { duration: 0.8 });
    markersRef.current[selectedMotorista.id]?.openTooltip();
  }, [selectedMotorista]);

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Inject leaflet CSS and ping animation */}
      <style>{`
        @import url("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .custom-tooltip {
          border-radius: 10px !important;
          border: 1px solid hsl(214.3 31.8% 91.4%) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1) !important;
          padding: 8px 10px !important;
        }
        .leaflet-tooltip-top:before { border-top-color: hsl(214.3 31.8% 91.4%) !important; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important; }
        .leaflet-control-zoom a { border-radius: 8px !important; }
      `}</style>

      {/* Top stats bar */}
      <div className="flex-shrink-0 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>Mapa em Tempo Real</h1>
            <p className="text-sm mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
              Luanda · Actualizado {lastRefresh.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
          <button onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium hover:bg-slate-50 transition-colors"
            style={{ borderColor: "hsl(214.3 31.8% 91.4%)", color: "hsl(215.4 16.3% 46.9%)" }}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <StatCard icon={Truck} label="Em Rota" value={emRota} color="#2563eb" />
          <StatCard icon={Users} label="Disponíveis" value={disponiveis} color="#16a34a" />
          <StatCard icon={Navigation} label="Entregas activas" value={totalEmRota} color="#9333ea" />
          <StatCard icon={Clock} label="Inactivos" value={inactivos} color="#64748b" />
        </div>
      </div>

      {/* Main content: map + sidebar */}
      <div className="flex flex-1 gap-0 px-6 pb-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3 pr-4 overflow-hidden">
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 rounded-xl flex-shrink-0" style={{ background: "hsl(210 40% 98%)", border: "1px solid hsl(214.3 31.8% 91.4%)" }}>
            {(["todos", "em_rota", "disponivel", "inactivo"] as const).map((f) => (
              <button key={f} onClick={() => setFiltro(f)}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all"
                style={filtro === f
                  ? { background: "white", color: "hsl(222.2 84% 4.9%)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                  : { color: "hsl(215.4 16.3% 46.9%)" }}>
                {f === "todos" ? "Todos" : f === "em_rota" ? "Em rota" : f === "disponivel" ? "Livre" : "Inactivo"}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "hsl(221 83% 53%)" }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(215.4 16.3% 70%)" }} />
                <p className="text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Nenhum motorista</p>
              </div>
            ) : (
              filtered.map((m) => (
                <MotoristaCard key={m.id} m={m}
                  selected={selectedId === m.id}
                  onClick={() => setSelectedId(selectedId === m.id ? null : m.id)} />
              ))
            )}
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selectedMotorista && (
              <MotoristaDetail m={selectedMotorista} onClose={() => setSelectedId(null)} />
            )}
          </AnimatePresence>
        </div>

        {/* Map */}
        <div className="flex-1 rounded-2xl overflow-hidden border relative" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <div ref={mapRef} className="w-full h-full" />

          {/* Legend overlay */}
          <div className="absolute bottom-4 right-4 bg-white rounded-xl border p-3 shadow-sm z-[1000]"
            style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
            <div className="text-xs font-semibold mb-2" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>LEGENDA</div>
            {Object.entries(ESTADO_CFG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2 mb-1 last:mb-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                <span className="text-xs" style={{ color: "hsl(222.2 84% 4.9%)" }}>{cfg.label}</span>
              </div>
            ))}
          </div>

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-[999] rounded-2xl">
              <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-md">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "hsl(221 83% 53%)" }} />
                <span className="text-sm" style={{ color: "hsl(222.2 84% 4.9%)" }}>A carregar mapa...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
