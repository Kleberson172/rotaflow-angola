import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import { motion, type Variants } from "framer-motion";
import {
  TrendingUp, TrendingDown, Package, CheckCircle2, Clock, Truck,
  Fuel, Leaf, Zap, Users, ArrowUp, ArrowDown, FileDown, Loader2,
} from "lucide-react";
import { api, type RelatoriosStats } from "@/lib/api";
import { exportRelatoriosPDF } from "@/lib/exportPdf";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

function ChartCard({ title, subtitle, children, delay = 0 }: {
  title: string; subtitle?: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="bg-white rounded-xl border p-6" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
      <div className="mb-5">
        <h3 className="font-semibold text-sm" style={{ color: "hsl(222.2 84% 4.9%)" }}>{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-lg text-xs shadow-lg"
        style={{ background: "white", border: "1px solid hsl(214.3 31.8% 91.4%)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
        <div className="font-semibold mb-1" style={{ color: "hsl(222.2 84% 4.9%)" }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{p.name}:</span>
            <span className="font-medium" style={{ color: "hsl(222.2 84% 4.9%)" }}>{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-5 border animate-pulse" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
      <div className="w-10 h-10 rounded-lg bg-gray-100 mb-3" />
      <div className="w-16 h-7 bg-gray-100 rounded mb-1" />
      <div className="w-24 h-3 bg-gray-100 rounded" />
    </div>
  );
}

export default function Relatorios() {
  const [exporting, setExporting] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["relatorios"],
    queryFn: api.relatorios.stats,
    refetchInterval: 30000,
  });

  const now = new Date();
  const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const handleExport = async () => {
    if (!stats || exporting) return;
    setExporting(true);
    try {
      await exportRelatoriosPDF(stats);
    } finally {
      setExporting(false);
    }
  };

  const kpis = stats ? [
    {
      label: "Total este Mês",
      value: String(stats.kpis.totalMes),
      sub: stats.kpis.variacaoMes >= 0 ? `+${stats.kpis.variacaoMes}% vs mês anterior` : `${stats.kpis.variacaoMes}% vs mês anterior`,
      trend: stats.kpis.variacaoMes >= 0 ? "up" : "down",
      icon: Package,
      color: "hsl(221 83% 53%)",
      bg: "hsl(221 83% 95%)",
    },
    {
      label: "Taxa de Sucesso",
      value: `${stats.kpis.taxaSucesso}%`,
      sub: `${stats.kpis.entregues} de ${stats.kpis.totalEntregas} entregas`,
      trend: stats.kpis.taxaSucesso >= 90 ? "up" : "down",
      icon: CheckCircle2,
      color: "hsl(142 76% 30%)",
      bg: "hsl(142 76% 95%)",
    },
    {
      label: "Em Rota Agora",
      value: String(stats.kpis.emRota),
      sub: `${stats.kpis.pendentes} pendentes`,
      trend: "neutral",
      icon: Truck,
      color: "hsl(38 92% 40%)",
      bg: "hsl(38 92% 95%)",
    },
    {
      label: "Motoristas Activos",
      value: String(stats.kpis.motoristasActivos),
      sub: `de ${stats.kpis.totalMotoristas} no total`,
      trend: "neutral",
      icon: Users,
      color: "hsl(270 76% 45%)",
      bg: "hsl(270 76% 95%)",
    },
  ] : [];

  const totalZona = stats?.entregasPorZona.reduce((a, z) => a + z.value, 0) ?? 1;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>Relatórios</h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
            Análise de desempenho — {MESES[now.getMonth()]} {now.getFullYear()}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={!stats || isLoading || exporting}
          data-testid="button-exportar-pdf"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
          style={{ background: "hsl(221 83% 53%)", boxShadow: "0 2px 8px hsl(221 83% 53% / 0.35)" }}
        >
          {exporting
            ? <><Loader2 className="w-4 h-4 animate-spin" />A gerar PDF...</>
            : <><FileDown className="w-4 h-4" />Exportar PDF</>
          }
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div key={kpi.label} custom={i} initial="hidden" animate="visible" variants={cardVariants}
                className="bg-white rounded-xl p-5 border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: kpi.bg }}>
                  <Icon className="w-5 h-5" style={{ color: kpi.color }} />
                </div>
                <div className="text-2xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>{kpi.value}</div>
                <div className="text-xs mt-0.5 mb-1" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{kpi.label}</div>
                <div className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: kpi.trend === "up" ? "hsl(142 76% 30%)" : kpi.trend === "down" ? "hsl(0 84.2% 45%)" : "hsl(215.4 16.3% 46.9%)" }}>
                  {kpi.trend === "up" ? <ArrowUp className="w-3 h-3" /> : kpi.trend === "down" ? <ArrowDown className="w-3 h-3" /> : null}
                  {kpi.sub}
                </div>
              </motion.div>
            );
          })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <ChartCard title="Desempenho Mensal" subtitle="Entregas por estado nos últimos 7 meses" delay={0.3}>
            {isLoading ? (
              <div className="h-56 bg-gray-50 rounded-lg animate-pulse" />
            ) : (
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.desempenhoMensal ?? []} barSize={16} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214.3 31.8% 91.4%)" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(210 40% 97%)" }} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar dataKey="entregues" name="Entregues" fill="hsl(142 76% 42%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="emRota" name="Em Rota" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pendentes" name="Pendentes" fill="hsl(38 92% 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </div>

        <ChartCard title="Entregas por Zona" subtitle="Distribuição em Luanda" delay={0.38}>
          {isLoading ? (
            <div className="h-56 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats?.entregasPorZona ?? []} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                      {(stats?.entregasPorZona ?? []).map((entry, index) => (
                        <Cell key={index} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value}`, "Entregas"]}
                      contentStyle={{ background: "white", border: "1px solid hsl(214.3 31.8% 91.4%)", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {(stats?.entregasPorZona ?? []).slice(0, 5).map((z) => (
                  <div key={z.zona} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: z.color }} />
                      <span className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{z.zona}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full" style={{ width: `${(z.value / totalZona) * 80}px`, background: z.color, opacity: 0.35 }} />
                      <span className="text-xs font-semibold w-6 text-right" style={{ color: "hsl(222.2 84% 4.9%)" }}>{z.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Taxa de Sucesso por Motorista" subtitle="Percentagem de entregas concluídas com êxito" delay={0.46}>
          {isLoading ? (
            <div className="h-56 bg-gray-50 rounded-lg animate-pulse" />
          ) : (stats?.taxaSucessoMotoristas ?? []).length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
              Sem dados de motoristas disponíveis.
            </div>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.taxaSucessoMotoristas ?? []} layout="vertical" barSize={12} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(214.3 31.8% 91.4%)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="nome" type="category" tick={{ fontSize: 11, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip formatter={(v: number) => [`${v}%`, "Taxa de Sucesso"]}
                    contentStyle={{ background: "white", border: "1px solid hsl(214.3 31.8% 91.4%)", borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: "hsl(210 40% 97%)" }} />
                  <Bar dataKey="taxa" radius={[0, 4, 4, 0]} fill="hsl(221 83% 53%)">
                    {(stats?.taxaSucessoMotoristas ?? []).map((entry, index) => (
                      <Cell key={index} fill={entry.taxa >= 95 ? "hsl(142 76% 42%)" : entry.taxa >= 90 ? "hsl(221 83% 53%)" : "hsl(38 92% 55%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Volume de Entregas por Hora" subtitle="Distribuição horária das entregas registadas" delay={0.54}>
          {isLoading ? (
            <div className="h-56 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.tendenciaDiaria ?? []} margin={{ right: 8 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214.3 31.8% 91.4%)" />
                    <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(221 83% 53%)", strokeWidth: 1, strokeDasharray: "4 2" }} />
                    <Area type="monotone" dataKey="entregas" name="Entregas" stroke="hsl(221 83% 53%)" strokeWidth={2}
                      fill="url(#areaGradient)" dot={false} activeDot={{ r: 4, fill: "hsl(221 83% 53%)", strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {stats?.picoHora && stats.picoHora.entregas > 0 && (
                <div className="mt-4 flex items-center justify-between text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                  <span>Pico: <strong style={{ color: "hsl(222.2 84% 4.9%)" }}>{stats.picoHora.hora}</strong> ({stats.picoHora.entregas} entregas)</span>
                  <div className="flex items-center gap-1 font-medium" style={{ color: "hsl(142 76% 30%)" }}>
                    <TrendingUp className="w-3 h-3" />Dados reais da BD
                  </div>
                </div>
              )}
            </>
          )}
        </ChartCard>
      </div>

      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62, duration: 0.4 }}
        className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: "hsl(222.2 84% 4.9%)" }}>
                <Fuel className="w-4 h-4" style={{ color: "hsl(142 76% 36%)" }} />
                Poupança de Combustível por Motorista
              </h3>
              <p className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                Estimativa baseada na optimização de rotas vs. rota directa sem optimização
              </p>
            </div>
            {stats && !isLoading && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: "hsl(142 76% 95%)", color: "hsl(142 76% 30%)" }}>
                  <Leaf className="w-4 h-4" />
                  {stats.combustivel.totalLitrosPoupados.toFixed(1)}L poupados
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: "hsl(38 92% 95%)", color: "hsl(38 92% 40%)" }}>
                  <Zap className="w-4 h-4" />
                  {stats.combustivel.totalKzPoupados.toLocaleString("pt-PT")} Kz economizados
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: "hsl(221 83% 95%)", color: "hsl(221 83% 45%)" }}>
                  <TrendingDown className="w-4 h-4" />
                  {stats.combustivel.totalKmPoupados.toFixed(1)} km poupados
                </div>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (stats?.combustivel.porMotorista ?? []).length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
            Sem entregas concluídas para calcular poupança de combustível.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
            {(stats?.combustivel.porMotorista ?? []).map((m, idx) => (
              <motion.div key={m.nome} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors flex-wrap">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: "hsl(221 83% 53%)" }}>
                  {m.nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: "hsl(222.2 84% 4.9%)" }}>{m.nome}</div>
                  <div className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                    {m.entregasTotal} entregas · {m.kmTotal} km optimizados · {m.kmSemOtimizacao} km sem opt.
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "hsl(214.3 31.8% 91.4%)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(m.percentagemPoupanca, 100)}%`, background: "hsl(142 76% 42%)" }} />
                    </div>
                    <span className="text-xs font-semibold w-12 text-right" style={{ color: "hsl(142 76% 30%)" }}>
                      -{m.percentagemPoupanca.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
                  <div className="text-center min-w-[80px] px-2 py-1.5 rounded-lg" style={{ background: "hsl(38 92% 97%)" }}>
                    <div className="text-sm font-bold" style={{ color: "hsl(38 92% 35%)" }}>{m.litrosGastos.toFixed(1)}L</div>
                    <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>litros gastos</div>
                    <div className="text-xs font-semibold mt-0.5" style={{ color: "hsl(38 92% 35%)" }}>{m.kzGastos.toLocaleString("pt-PT")} Kz</div>
                  </div>
                  <div className="text-center min-w-[80px] px-2 py-1.5 rounded-lg" style={{ background: "hsl(142 76% 97%)" }}>
                    <div className="text-sm font-bold" style={{ color: "hsl(142 76% 30%)" }}>{m.litrosPoupados.toFixed(1)}L</div>
                    <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>litros poupados</div>
                    <div className="text-xs font-semibold mt-0.5" style={{ color: "hsl(142 76% 30%)" }}>{m.kzPoupados.toLocaleString("pt-PT")} Kz</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {stats && !isLoading && (stats.combustivel.porMotorista.length > 0) && (
          <div className="px-6 py-4 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: "hsl(214.3 31.8% 91.4%)", background: "hsl(142 76% 98%)" }}>
            <Leaf className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(142 76% 36%)" }} />
            <span className="text-xs font-medium" style={{ color: "hsl(142 76% 30%)" }}>
              A optimização de rotas poupa em média {stats.combustivel.percentagemMedia.toFixed(0)}% de combustível por motorista —
              equivalente a {stats.combustivel.totalLitrosPoupados.toFixed(1)} litros e {stats.combustivel.totalKzPoupados.toLocaleString("pt-PT")} Kz neste período.
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
