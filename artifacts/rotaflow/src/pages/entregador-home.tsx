import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { api, type Entrega } from "@/lib/api";
import {
  Package, CheckCircle2, Clock, Truck, Route, Map,
  Play, ChevronRight, Zap, TrendingUp, User, MapPin,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.38, ease: "easeOut" as const },
  }),
};

const ESTADO_CFG = {
  Pendente: { label: "Pendente", color: "hsl(38 92% 40%)", bg: "hsl(38 92% 95%)", icon: Clock },
  "Em Rota": { label: "Em Rota", color: "hsl(221 83% 45%)", bg: "hsl(221 83% 95%)", icon: Truck },
  Entregue: { label: "Entregue", color: "hsl(142 76% 30%)", bg: "hsl(142 76% 95%)", icon: CheckCircle2 },
} as const;

export default function EntregadorHome() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: entregas = [], isLoading } = useQuery({
    queryKey: ["entregas"],
    queryFn: api.entregas.list,
  });

  const { data: motoristas = [] } = useQuery({
    queryKey: ["motoristas"],
    queryFn: api.motoristas.list,
  });

  const iniciarMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => api.entregas.update(id, { estado: "Em Rota" })));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entregas"] });
    },
  });

  const motoristaNome = user?.motoristaNome ?? "";
  const motorista = motoristas.find((m) => m.nome === motoristaNome);

  const minhasEntregas = entregas.filter((e) => e.motorista === motoristaNome);
  const pendentes = minhasEntregas.filter((e) => e.estado === "Pendente");
  const emRota = minhasEntregas.filter((e) => e.estado === "Em Rota");
  const hoje = new Date().toLocaleDateString("pt-PT");
  const entreguesHoje = minhasEntregas.filter(
    (e) => e.estado === "Entregue" && new Date(e.criadoEm).toLocaleDateString("pt-PT") === hoje
  );

  const activasParaRota = [...pendentes, ...emRota];

  const handleIniciarEntregas = () => {
    const ids = pendentes.map((e) => e.id);
    if (ids.length > 0) iniciarMutation.mutate(ids);
  };

  const hour = new Date().getHours();
  const saudacao = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = user?.nome?.split(" ")[0] ?? "Motorista";

  const stats = [
    {
      label: "Pendentes",
      value: pendentes.length,
      icon: Clock,
      color: "hsl(38 92% 40%)",
      bg: "hsl(38 92% 95%)",
      border: "hsl(38 92% 85%)",
    },
    {
      label: "Em Rota",
      value: emRota.length,
      icon: Truck,
      color: "hsl(221 83% 45%)",
      bg: "hsl(221 83% 95%)",
      border: "hsl(221 83% 85%)",
    },
    {
      label: "Entregues Hoje",
      value: entreguesHoje.length,
      icon: CheckCircle2,
      color: "hsl(142 76% 30%)",
      bg: "hsl(142 76% 95%)",
      border: "hsl(142 76% 75%)",
    },
    {
      label: "Total Histórico",
      value: motorista?.entregasTotal ?? minhasEntregas.length,
      icon: TrendingUp,
      color: "hsl(270 76% 45%)",
      bg: "hsl(270 76% 95%)",
      border: "hsl(270 76% 80%)",
    },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl p-6 mb-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(222.2 84% 8%), hsl(221 83% 18%))" }}
      >
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10" style={{ background: "hsl(221 83% 70%)" }} />
        <div className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full opacity-5" style={{ background: "hsl(142 76% 60%)" }} />

        <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ background: "hsl(142 76% 36%)" }}>
              {user?.nome?.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "??"}
            </div>
            <div>
              <div className="text-white/60 text-sm">{saudacao},</div>
              <div className="text-white text-xl font-bold">{primeiroNome}</div>
              {motorista && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white/80"
                    style={{ background: "rgba(255,255,255,0.1)" }}>
                    {motorista.veiculo}
                  </span>
                  <span className="text-xs text-white/60">·</span>
                  <span className="text-xs text-white/60">{motorista.zona}</span>
                </div>
              )}
            </div>
          </div>

          {activasParaRota.length > 0 ? (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-base">
                  Tens <span style={{ color: "hsl(142 76% 60%)" }}>{activasParaRota.length} entrega{activasParaRota.length !== 1 ? "s" : ""}</span> para hoje
                </div>
                {pendentes.length > 0 && (
                  <div className="text-white/60 text-xs mt-0.5">
                    {pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""} por iniciar
                    {emRota.length > 0 ? `, ${emRota.length} já em rota` : ""}
                  </div>
                )}
                {pendentes.length === 0 && emRota.length > 0 && (
                  <div className="text-white/60 text-xs mt-0.5">Rota em curso — {emRota.length} entrega{emRota.length !== 1 ? "s" : ""} pendente{emRota.length !== 1 ? "s" : ""}</div>
                )}
              </div>
              {pendentes.length > 0 && (
                <button
                  onClick={handleIniciarEntregas}
                  disabled={iniciarMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 flex-shrink-0"
                  style={{ background: "hsl(142 76% 36%)", color: "white" }}
                >
                  <Play className="w-4 h-4 fill-white" />
                  {iniciarMutation.isPending ? "A iniciar..." : "Iniciar Entregas"}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6" style={{ color: "hsl(142 76% 60%)" }} />
              <div>
                <div className="text-white font-semibold">Sem entregas pendentes</div>
                <div className="text-white/60 text-xs">Bom trabalho! Aguarda novas atribuições</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} custom={i} initial="hidden" animate="visible" variants={cardVariants}
              className="bg-white rounded-xl p-4 border"
              style={{ borderColor: s.border }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2.5"
                style={{ background: s.bg }}>
                <Icon className="w-4.5 h-4.5" style={{ color: s.color, width: 18, height: 18 }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>
                {isLoading ? <span className="inline-block w-8 h-6 bg-gray-100 rounded animate-pulse" /> : s.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 55%)" }}>{s.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick actions */}
      <motion.div custom={4} initial="hidden" animate="visible" variants={cardVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => navigate("/otimizador")}
          className="flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:shadow-md group"
          style={{ background: "white", borderColor: "hsl(221 83% 85%)" }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(221 83% 95%)" }}>
            <Route className="w-6 h-6" style={{ color: "hsl(221 83% 53%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm" style={{ color: "hsl(222.2 84% 4.9%)" }}>Optimizador de Rota</div>
            <div className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 55%)" }}>
              {activasParaRota.length > 0
                ? `Rota optimizada para ${activasParaRota.length} paragem${activasParaRota.length !== 1 ? "s" : ""}`
                : "Ver rota e situação do trânsito"}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform"
            style={{ color: "hsl(221 83% 53%)" }} />
        </button>

        <a
          href={buildGoogleMapsUrl(activasParaRota)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-xl border text-left transition-all hover:shadow-md group"
          style={{ background: "white", borderColor: "hsl(142 76% 75%)" }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(142 76% 95%)" }}>
            <Map className="w-6 h-6" style={{ color: "hsl(142 76% 30%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm" style={{ color: "hsl(222.2 84% 4.9%)" }}>Google Maps</div>
            <div className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 55%)" }}>
              Ver trânsito e navegar para as entregas
            </div>
          </div>
          <ChevronRight className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform"
            style={{ color: "hsl(142 76% 30%)" }} />
        </a>
      </motion.div>

      {/* Delivery list */}
      {activasParaRota.length > 0 && (
        <motion.div custom={5} initial="hidden" animate="visible" variants={cardVariants}
          className="bg-white rounded-xl border overflow-hidden"
          style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
            <div>
              <h2 className="font-semibold text-base" style={{ color: "hsl(222.2 84% 4.9%)" }}>
                As Minhas Entregas
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 55%)" }}>
                {activasParaRota.length} entrega{activasParaRota.length !== 1 ? "s" : ""} activa{activasParaRota.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => navigate("/otimizador")}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "hsl(221 83% 53%)", background: "hsl(221 83% 95%)" }}
            >
              <Route className="w-3.5 h-3.5" />
              Ver Rota
            </button>
          </div>

          <div className="divide-y" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
            {activasParaRota.map((e, idx) => {
              const cfg = ESTADO_CFG[e.estado as keyof typeof ESTADO_CFG] ?? ESTADO_CFG["Pendente"];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 + 0.3 }}
                  className="flex items-start gap-4 px-5 py-4"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: cfg.bg }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: cfg.color, width: 18, height: 18 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold" style={{ color: "hsl(221 83% 53%)" }}>{e.codigo}</span>
                      {e.prioridade === "Urgente" && (
                        <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: "hsl(0 84.2% 95%)", color: "hsl(0 84.2% 45%)" }}>
                          <Zap className="w-3 h-3" />Urgente
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium mt-0.5" style={{ color: "hsl(222.2 84% 4.9%)" }}>{e.destinatario}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(215.4 16.3% 55%)" }} />
                      <span className="text-xs truncate" style={{ color: "hsl(215.4 16.3% 55%)" }}>{e.endereco}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ color: cfg.color, background: cfg.bg }}>
                      <Icon className="w-3 h-3" style={{ width: 12, height: 12 }} />{cfg.label}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.endereco + ", Luanda")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium transition-colors"
                      style={{ color: "hsl(142 76% 30%)" }}
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <Map className="w-3 h-3" />Maps
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Driver profile card */}
      {motorista && (
        <motion.div custom={6} initial="hidden" animate="visible" variants={cardVariants}
          className="mt-4 bg-white rounded-xl border p-5"
          style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4" style={{ color: "hsl(215.4 16.3% 55%)" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(215.4 16.3% 55%)" }}>
              O Meu Perfil
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Código", value: motorista.codigo },
              { label: "Veículo", value: motorista.veiculo },
              { label: "Zona", value: motorista.zona },
              { label: "Taxa de Sucesso", value: `${motorista.taxaSucesso}%` },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-xs mb-0.5" style={{ color: "hsl(215.4 16.3% 55%)" }}>{item.label}</div>
                <div className="text-sm font-semibold" style={{ color: "hsl(222.2 84% 4.9%)" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function buildGoogleMapsUrl(entregas: Entrega[]): string {
  const DEPOT_LAT = -8.8383;
  const DEPOT_LNG = 13.2344;
  const origin = `${DEPOT_LAT},${DEPOT_LNG}`;

  if (entregas.length === 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Luanda, Angola")}`;
  }

  const stops = entregas.slice(0, 9);
  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
  const waypoints = stops.slice(0, -1).map((e) => `${e.lat},${e.lng}`).join("|");

  const params = new URLSearchParams({
    api: "1",
    origin,
    destination,
    travelmode: "driving",
  });
  if (waypoints) params.set("waypoints", waypoints);

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
