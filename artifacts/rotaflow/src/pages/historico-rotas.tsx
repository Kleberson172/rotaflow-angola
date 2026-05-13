import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  History, Fuel, Navigation, MapPin, TrendingDown, Trash2,
  ChevronDown, ChevronUp, Filter, Leaf, Zap, Clock,
} from "lucide-react";
import { api, type HistoricoRota } from "@/lib/api";
import { useQuery as useMotoristaQuery } from "@tanstack/react-query";

const FUEL_L_PER_KM = 0.065;
const FUEL_PRICE_KZ = 200;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function HistoricoRotas() {
  const qc = useQueryClient();
  const [motoristaFiltro, setMotoristaFiltro] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: motoristas = [] } = useMotoristaQuery({
    queryKey: ["motoristas"],
    queryFn: api.motoristas.list,
  });

  const { data: historico = [], isLoading } = useQuery({
    queryKey: ["historico-rotas", motoristaFiltro],
    queryFn: () => api.historicoRotas.list(motoristaFiltro || undefined),
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: api.historicoRotas.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["historico-rotas"] }),
  });

  const totalKmPoupados = historico.reduce((s, r) => s + r.kmPoupados, 0);
  const totalLitrosPoupados = historico.reduce((s, r) => s + r.litrosPoupados, 0);
  const totalKzPoupados = historico.reduce((s, r) => s + r.kzPoupados, 0);
  const totalKzGastos = historico.reduce((s, r) => s + r.kzGastos, 0);

  const agrupado = historico.reduce<Record<string, HistoricoRota[]>>((acc, r) => {
    if (!acc[r.motorista]) acc[r.motorista] = [];
    acc[r.motorista].push(r);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "hsl(222.2 84% 4.9%)" }}>
            <History className="w-6 h-6" style={{ color: "hsl(221 83% 53%)" }} />
            Histórico de Rotas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
            Registo de todas as rotas optimizadas e consumos de combustível
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
          <select
            value={motoristaFiltro}
            onChange={(e) => setMotoristaFiltro(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 h-10 focus:outline-none focus:ring-2"
            style={{ borderColor: "hsl(214.3 31.8% 91.4%)", color: "hsl(222.2 84% 4.9%)" }}
          >
            <option value="">Todos os motoristas</option>
            {motoristas.map((m) => (
              <option key={m.id} value={m.nome}>{m.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      {historico.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Km Poupados", value: `${totalKmPoupados.toFixed(1)} km`, icon: Navigation, color: "hsl(221 83% 53%)", bg: "hsl(221 83% 95%)" },
            { label: "Litros Poupados", value: `${totalLitrosPoupados.toFixed(1)} L`, icon: Leaf, color: "hsl(142 76% 30%)", bg: "hsl(142 76% 95%)" },
            { label: "Kz Poupados", value: `${totalKzPoupados.toLocaleString("pt-PT")} Kz`, icon: TrendingDown, color: "hsl(142 76% 30%)", bg: "hsl(142 76% 95%)" },
            { label: "Custo Total Gastos", value: `${totalKzGastos.toLocaleString("pt-PT")} Kz`, icon: Fuel, color: "hsl(38 92% 35%)", bg: "hsl(38 92% 95%)" },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="bg-white rounded-xl p-5 border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: card.bg }}>
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <div className="text-xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>{card.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{card.label}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white rounded-xl border animate-pulse" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }} />
          ))}
        </div>
      ) : historico.length === 0 ? (
        <div className="bg-white rounded-xl border p-16 text-center" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <History className="w-12 h-12 mx-auto mb-4" style={{ color: "hsl(214.3 31.8% 80%)" }} />
          <div className="text-base font-semibold mb-1" style={{ color: "hsl(222.2 84% 4.9%)" }}>Sem histórico ainda</div>
          <div className="text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
            As rotas calculadas no Optimizador serão registadas aqui automaticamente.
          </div>
        </div>
      ) : motoristaFiltro ? (
        // List view when filtered by driver
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <div className="divide-y" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
            {historico.map((r, idx) => (
              <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}>
                <div
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: r.modoTrafico === "avoid" ? "hsl(221 83% 95%)" : "hsl(142 76% 95%)" }}>
                    <Navigation className="w-5 h-5" style={{ color: r.modoTrafico === "avoid" ? "hsl(221 83% 45%)" : "hsl(142 76% 30%)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: "hsl(222.2 84% 4.9%)" }}>
                        {r.numParagens} paragens · {r.kmTotal.toFixed(1)} km
                      </span>
                      {r.modoTrafico === "avoid" && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "hsl(221 83% 95%)", color: "hsl(221 83% 45%)" }}>
                          Sem trânsito
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                      <Clock className="w-3 h-3" />{formatDate(r.criadoEm)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-right">
                    <div>
                      <div className="text-sm font-bold" style={{ color: "hsl(38 92% 35%)" }}>{r.litrosGastos.toFixed(1)}L</div>
                      <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{r.kzGastos.toLocaleString("pt-PT")} Kz</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: "hsl(142 76% 30%)" }}>-{r.percentagemPoupanca.toFixed(0)}%</div>
                      <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{r.kzPoupados.toLocaleString("pt-PT")} Kz poup.</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(r.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors ml-2" style={{ color: "hsl(0 84.2% 60%)" }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedId === r.id ? <ChevronUp className="w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />}
                  </div>
                </div>
                <AnimatePresence>
                  {expandedId === r.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden" style={{ background: "hsl(210 40% 98%)" }}>
                      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: "Km Optimizados", value: `${r.kmTotal.toFixed(1)} km`, color: "hsl(221 83% 53%)" },
                          { label: "Km sem opt.", value: `${r.kmSemOtimizacao.toFixed(1)} km`, color: "hsl(215.4 16.3% 46.9%)" },
                          { label: "Litros Gastos", value: `${r.litrosGastos.toFixed(1)} L`, color: "hsl(38 92% 35%)" },
                          { label: "Litros Poupados", value: `${r.litrosPoupados.toFixed(1)} L`, color: "hsl(142 76% 30%)" },
                        ].map((item) => (
                          <div key={item.label} className="bg-white rounded-lg p-3 border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                            <div className="text-sm font-bold" style={{ color: item.color }}>{item.value}</div>
                            <div className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{item.label}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        // Grouped view by driver
        <div className="space-y-6">
          {Object.entries(agrupado).map(([motoristaNome, rotas]) => {
            const totalKm = rotas.reduce((s, r) => s + r.kmTotal, 0);
            const totalLitros = rotas.reduce((s, r) => s + r.litrosGastos, 0);
            const totalKz = rotas.reduce((s, r) => s + r.kzGastos, 0);
            const poupanca = rotas.reduce((s, r) => s + r.kzPoupados, 0);
            const initials = motoristaNome.split(" ").map((n) => n[0]).slice(0, 2).join("");
            return (
              <motion.div key={motoristaNome} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                <div className="px-6 py-4 border-b flex items-center gap-4" style={{ borderColor: "hsl(214.3 31.8% 91.4%)", background: "hsl(210 40% 98%)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: "hsl(221 83% 53%)" }}>{initials}</div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm" style={{ color: "hsl(222.2 84% 4.9%)" }}>{motoristaNome}</div>
                    <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{rotas.length} rotas registadas</div>
                  </div>
                  <div className="flex items-center gap-6 flex-wrap text-right">
                    <div>
                      <div className="text-sm font-bold" style={{ color: "hsl(221 83% 53%)" }}>{totalKm.toFixed(1)} km</div>
                      <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>km total</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: "hsl(38 92% 35%)" }}>{totalLitros.toFixed(1)}L</div>
                      <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{totalKz.toLocaleString("pt-PT")} Kz</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold" style={{ color: "hsl(142 76% 30%)" }}>{poupanca.toLocaleString("pt-PT")} Kz</div>
                      <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>poupados</div>
                    </div>
                  </div>
                </div>
                <div className="divide-y" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                  {rotas.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                        <span className="font-medium" style={{ color: "hsl(222.2 84% 4.9%)" }}>{r.numParagens} paragens</span>
                        {" · "}{r.kmTotal.toFixed(1)} km · {formatDate(r.criadoEm)}
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="text-xs font-semibold" style={{ color: "hsl(38 92% 35%)" }}>{r.litrosGastos.toFixed(1)}L gastos</span>
                        <span className="text-xs font-semibold" style={{ color: "hsl(142 76% 30%)" }}>-{r.percentagemPoupanca.toFixed(0)}%</span>
                        <button onClick={() => deleteMutation.mutate(r.id)}
                          className="p-1 rounded hover:bg-red-50 transition-colors" style={{ color: "hsl(0 84.2% 60%)" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {rotas.length > 5 && (
                    <div className="px-6 py-2 text-xs text-center" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                      + {rotas.length - 5} rotas mais antigas. Filtre por motorista para ver todas.
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
