import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Package, Clock, CheckCircle2, Truck, Users, Plus, Search, Trash2, Eye,
  MapPin, Phone, Calendar, User, TrendingUp, ArrowRight, Fuel,
  TrendingDown, Zap, Activity,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, Area, AreaChart,
} from "recharts";
import { api, type Entrega, type RelatoriosStats } from "@/lib/api";

type Status = "Pendente" | "Em Rota" | "Entregue";
const STATUS_ORDER: Status[] = ["Pendente", "Em Rota", "Entregue"];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const statusConfig: Record<Status, { label: string; color: string; bg: string; border: string; icon: typeof Clock }> = {
  Pendente: { label: "Pendente", color: "hsl(38 92% 40%)", bg: "hsl(38 92% 95%)", border: "hsl(38 92% 75%)", icon: Clock },
  "Em Rota": { label: "Em Rota", color: "hsl(221 83% 45%)", bg: "hsl(221 83% 95%)", border: "hsl(221 83% 75%)", icon: Truck },
  Entregue: { label: "Entregue", color: "hsl(142 76% 30%)", bg: "hsl(142 76% 95%)", border: "hsl(142 76% 65%)", icon: CheckCircle2 },
};

function StatusBadge({ status }: { status: Status }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: cfg.color, background: cfg.bg }}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

function StatusStepper({ current, onSelect, loading }: { current: Status; onSelect: (s: Status) => void; loading: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Alterar Estado</div>
      <div className="flex items-center gap-1">
        {STATUS_ORDER.map((s, i) => {
          const cfg = statusConfig[s];
          const Icon = cfg.icon;
          const isCurrent = current === s;
          const isPast = STATUS_ORDER.indexOf(current) > i;
          return (
            <div key={s} className="flex items-center gap-1 flex-1">
              <button onClick={() => !isCurrent && onSelect(s)} disabled={loading || isCurrent}
                className="flex-1 flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border-2 transition-all text-xs font-semibold"
                style={isCurrent ? { borderColor: cfg.border, background: cfg.bg, color: cfg.color }
                  : isPast ? { borderColor: "hsl(214.3 31.8% 91.4%)", background: "hsl(210 40% 98%)", color: "hsl(215.4 16.3% 60%)", cursor: "pointer" }
                  : { borderColor: "hsl(214.3 31.8% 91.4%)", background: "white", color: "hsl(215.4 16.3% 46.9%)", cursor: "pointer" }}>
                <Icon className="w-4 h-4" />{cfg.label}
              </button>
              {i < STATUS_ORDER.length - 1 && <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(214.3 31.8% 75%)" }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" as const } }),
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-gray-100 rounded animate-pulse ${className}`} />;
}

export default function Dashboard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"Todas" | Status>("Todas");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Entrega | null>(null);
  const [form, setForm] = useState({ destinatario: "", telefone: "", endereco: "", motorista: "", prioridade: "Normal" as "Normal" | "Urgente" });

  const { data: entregas = [], isLoading } = useQuery({ queryKey: ["entregas"], queryFn: api.entregas.list });
  const { data: motoristasData = [] } = useQuery({ queryKey: ["motoristas"], queryFn: api.motoristas.list });
  const { data: stats, isLoading: statsLoading } = useQuery<RelatoriosStats>({
    queryKey: ["relatorios-stats"],
    queryFn: api.relatorios.stats,
    staleTime: 60000,
  });

  const createMutation = useMutation({
    mutationFn: api.entregas.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entregas"] });
      qc.invalidateQueries({ queryKey: ["relatorios-stats"] });
      setShowCreate(false);
      setForm({ destinatario: "", telefone: "", endereco: "", motorista: "", prioridade: "Normal" });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: Status }) => api.entregas.update(id, { estado }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["entregas"] });
      qc.invalidateQueries({ queryKey: ["relatorios-stats"] });
      if (selectedDelivery?.id === updated.id) setSelectedDelivery(updated);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: api.entregas.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entregas"] });
      qc.invalidateQueries({ queryKey: ["relatorios-stats"] });
      setSelectedDelivery(null);
    },
  });

  // Last 7 days derived from real entregas
  const weeklyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dayStr = d.toISOString().split("T")[0];
      const dayEntregas = entregas.filter((e) => {
        const eDate = new Date(e.criadoEm).toISOString().split("T")[0];
        return eDate === dayStr;
      });
      return {
        dia: DIAS_SEMANA[d.getDay()],
        date: `${d.getDate()} ${MESES[d.getMonth()]}`,
        entregues: dayEntregas.filter((e) => e.estado === "Entregue").length,
        emRota: dayEntregas.filter((e) => e.estado === "Em Rota").length,
        pendentes: dayEntregas.filter((e) => e.estado === "Pendente").length,
        total: dayEntregas.length,
      };
    });
  }, [entregas]);

  // Top 5 drivers by deliveries today
  const motoristasHoje = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const map: Record<string, { emRota: number; entregues: number; pendentes: number }> = {};
    entregas.filter((e) => new Date(e.criadoEm).toISOString().split("T")[0] === today).forEach((e) => {
      if (!map[e.motorista]) map[e.motorista] = { emRota: 0, entregues: 0, pendentes: 0 };
      if (e.estado === "Em Rota") map[e.motorista].emRota++;
      else if (e.estado === "Entregue") map[e.motorista].entregues++;
      else map[e.motorista].pendentes++;
    });
    return Object.entries(map)
      .map(([nome, counts]) => ({ nome, ...counts, total: counts.emRota + counts.entregues + counts.pendentes }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [entregas]);

  const filtered = entregas.filter((d) => {
    const matchSearch = d.destinatario.toLowerCase().includes(search.toLowerCase()) || d.endereco.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "Todas" || d.estado === activeTab;
    return matchSearch && matchTab;
  });

  const totalPendentes = entregas.filter((d) => d.estado === "Pendente").length;
  const totalEmRota = entregas.filter((d) => d.estado === "Em Rota").length;
  const totalEntregues = entregas.filter((d) => d.estado === "Entregue").length;
  const taxaSucesso = entregas.length > 0 ? Math.round((totalEntregues / entregas.length) * 100) : 0;

  const kpiCards = [
    {
      label: "Total Entregas",
      value: isLoading ? null : entregas.length,
      sub: stats ? `+${stats.kpis.totalMes} este mês` : null,
      icon: Package,
      color: "hsl(221 83% 53%)",
      bg: "hsl(221 83% 95%)",
      trend: stats?.kpis.variacaoMes,
    },
    {
      label: "Pendentes",
      value: isLoading ? null : totalPendentes,
      sub: "aguardam recolha",
      icon: Clock,
      color: "hsl(38 92% 40%)",
      bg: "hsl(38 92% 95%)",
    },
    {
      label: "Em Rota Agora",
      value: isLoading ? null : totalEmRota,
      sub: "em circulação",
      icon: Truck,
      color: "hsl(221 83% 45%)",
      bg: "hsl(221 83% 95%)",
    },
    {
      label: "Entregues",
      value: isLoading ? null : totalEntregues,
      sub: `taxa ${taxaSucesso}%`,
      icon: CheckCircle2,
      color: "hsl(142 76% 30%)",
      bg: "hsl(142 76% 95%)",
    },
    {
      label: "Motoristas Activos",
      value: isLoading ? null : motoristasData.filter((m) => m.activo).length,
      sub: `de ${motoristasData.length} total`,
      icon: Users,
      color: "hsl(270 76% 45%)",
      bg: "hsl(270 76% 95%)",
    },
    {
      label: "Kz Poupados",
      value: statsLoading ? null : stats ? `${stats.combustivel.totalKzPoupados.toLocaleString("pt-PT")} Kz` : "—",
      sub: statsLoading ? null : stats ? `${stats.combustivel.totalKmPoupados} km poupados` : null,
      icon: TrendingDown,
      color: "hsl(142 76% 30%)",
      bg: "hsl(142 76% 95%)",
    },
    {
      label: "Combustível Gasto",
      value: statsLoading ? null : stats ? `${stats.combustivel.totalLitrosGastos.toFixed(1)} L` : "—",
      sub: statsLoading ? null : stats ? `${stats.combustivel.totalKzGastos.toLocaleString("pt-PT")} Kz` : null,
      icon: Fuel,
      color: "hsl(38 92% 35%)",
      bg: "hsl(38 92% 95%)",
    },
    {
      label: "Eficiência Média",
      value: statsLoading ? null : stats ? `${stats.combustivel.percentagemMedia.toFixed(1)}%` : "—",
      sub: "poupança vs sem opt.",
      icon: Zap,
      color: "hsl(270 76% 45%)",
      bg: "hsl(270 76% 95%)",
    },
  ];

  const tabs: Array<"Todas" | Status> = ["Todas", "Pendente", "Em Rota", "Entregue"];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
            Visão geral em tempo real · {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Button data-testid="button-nova-entrega" onClick={() => setShowCreate(true)} className="flex items-center gap-2 text-white h-10 px-4" style={{ background: "hsl(221 83% 53%)" }}>
          <Plus className="w-4 h-4" /> Nova Entrega
        </Button>
      </div>

      {/* KPI cards — 4 cols */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {kpiCards.slice(0, 4).map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} custom={i} initial="hidden" animate="visible" variants={cardVariants}
              className="bg-white rounded-xl p-5 border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: card.bg }}>
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                {card.trend !== undefined && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={
                    card.trend >= 0
                      ? { background: "hsl(142 76% 95%)", color: "hsl(142 76% 30%)" }
                      : { background: "hsl(0 84.2% 95%)", color: "hsl(0 84.2% 40%)" }
                  }>
                    {card.trend >= 0 ? "+" : ""}{card.trend}%
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>
                {card.value === null ? <Skeleton className="w-12 h-7" /> : card.value}
              </div>
              <div className="text-xs mt-1" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{card.label}</div>
              {card.sub && (
                <div className="text-xs mt-0.5 font-medium" style={{ color: "hsl(215.4 16.3% 60%)" }}>{card.sub}</div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Fuel/efficiency KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpiCards.slice(4).map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} custom={i + 4} initial="hidden" animate="visible" variants={cardVariants}
              className="bg-white rounded-xl p-5 border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: card.bg }}>
                <Icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>
                {card.value === null ? <Skeleton className="w-16 h-7" /> : card.value}
              </div>
              <div className="text-xs mt-1" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{card.label}</div>
              {card.sub && (
                <div className="text-xs mt-0.5 font-medium" style={{ color: card.sub.includes("Kz") ? card.color : "hsl(215.4 16.3% 60%)" }}>
                  {card.sub === null ? <Skeleton className="w-20 h-3" /> : card.sub}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Weekly bar chart — real data */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="lg:col-span-2 bg-white rounded-xl border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
            <div>
              <h2 className="font-semibold text-base" style={{ color: "hsl(222.2 84% 4.9%)" }}>Entregas — Últimos 7 Dias</h2>
              <p className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Dados reais da base de dados</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg" style={{ background: "hsl(221 83% 95%)", color: "hsl(221 83% 45%)" }}>
              <Activity className="w-3.5 h-3.5" /> Ao vivo
            </div>
          </div>
          <div className="px-2 py-4" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barSize={14} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214.3 31.8% 91.4%)" />
                <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid hsl(214.3 31.8% 91.4%)", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  cursor={{ fill: "hsl(210 40% 97%)" }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="entregues" name="Entregues" fill="hsl(142 76% 42%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="emRota" name="Em Rota" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pendentes" name="Pendentes" fill="hsl(38 92% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Drivers today */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
          className="bg-white rounded-xl border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
            <h2 className="font-semibold text-base" style={{ color: "hsl(222.2 84% 4.9%)" }}>Motoristas Hoje</h2>
            <p className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Actividade do dia</p>
          </div>
          <div className="divide-y" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1.5"><Skeleton className="w-24 h-3" /><Skeleton className="w-16 h-2.5" /></div>
                </div>
              ))
            ) : motoristasHoje.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Sem actividade hoje</div>
            ) : (
              motoristasHoje.map((m) => {
                const initials = m.nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("");
                const isActive = m.emRota > 0;
                return (
                  <div key={m.nome} className="px-5 py-3.5 flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: isActive ? "hsl(221 83% 53%)" : "hsl(215.4 16.3% 70%)" }}>
                        {initials}
                      </div>
                      {isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                          style={{ background: "hsl(142 76% 42%)" }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: "hsl(222.2 84% 4.9%)" }}>
                        {m.nome.split(" ").slice(0, 2).join(" ")}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {m.emRota > 0 && <span className="text-xs font-semibold" style={{ color: "hsl(221 83% 53%)" }}>{m.emRota} em rota</span>}
                        {m.entregues > 0 && <span className="text-xs" style={{ color: "hsl(142 76% 35%)" }}>{m.entregues} entregues</span>}
                        {m.pendentes > 0 && <span className="text-xs" style={{ color: "hsl(38 92% 40%)" }}>{m.pendentes} pend.</span>}
                      </div>
                    </div>
                    <div className="text-xs font-bold" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{m.total}</div>
                  </div>
                );
              })
            )}
          </div>
          {!isLoading && motoristasHoje.length > 0 && (
            <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
              <span className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                {motoristasData.filter((m) => m.activo).length} activos hoje
              </span>
              <span className="text-xs font-semibold" style={{ color: "hsl(221 83% 53%)" }}>
                {entregas.filter((e) => new Date(e.criadoEm).toISOString().split("T")[0] === new Date().toISOString().split("T")[0]).length} entregas
              </span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Monthly trend + Fuel savings */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly trend */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
            className="bg-white rounded-xl border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
              <h2 className="font-semibold text-base" style={{ color: "hsl(222.2 84% 4.9%)" }}>Evolução Mensal</h2>
              <p className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Entregas dos últimos 7 meses</p>
            </div>
            <div className="px-2 py-4" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.desempenhoMensal} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradEntregues" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 76% 42%)" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="hsl(142 76% 42%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214.3 31.8% 91.4%)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "white", border: "1px solid hsl(214.3 31.8% 91.4%)", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                  <Area type="monotone" dataKey="entregues" name="Entregues" stroke="hsl(142 76% 42%)" strokeWidth={2} fill="url(#gradEntregues)" dot={{ r: 3, fill: "hsl(142 76% 42%)" }} />
                  <Line type="monotone" dataKey="pendentes" name="Pendentes" stroke="hsl(38 92% 55%)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Fuel per driver */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="bg-white rounded-xl border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
              <h2 className="font-semibold text-base" style={{ color: "hsl(222.2 84% 4.9%)" }}>Combustível por Motorista</h2>
              <p className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Kz gastos vs Kz poupados (optimização)</p>
            </div>
            <div className="px-2 py-4" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.combustivel.porMotorista.slice(0, 6).map((m) => ({ ...m, nome: m.nome.split(" ")[0] }))}
                  barSize={12} barCategoryGap="30%" margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214.3 31.8% 91.4%)" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} width={36}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                  <Tooltip
                    contentStyle={{ background: "white", border: "1px solid hsl(214.3 31.8% 91.4%)", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    formatter={(v: number) => [`${v.toLocaleString("pt-PT")} Kz`]}
                  />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Bar dataKey="kzGastos" name="Kz Gastos" fill="hsl(38 92% 55%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="kzPoupados" name="Kz Poupados" fill="hsl(142 76% 42%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}

      {/* Deliveries table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62 }}
        className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <h2 className="font-semibold text-base" style={{ color: "hsl(222.2 84% 4.9%)" }}>Entregas</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
            <Input data-testid="input-search" placeholder="Pesquisar entregas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-64 text-sm" />
          </div>
        </div>

        <div className="flex items-center gap-1 px-6 pt-3 pb-0">
          {tabs.map((tab) => (
            <button key={tab} data-testid={`tab-${tab.toLowerCase().replace(" ", "-")}`} onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
              style={activeTab === tab ? { background: "hsl(221 83% 53%)", color: "white" } : { color: "hsl(215.4 16.3% 46.9%)" }}>
              {tab} {tab !== "Todas" && `(${entregas.filter((e) => e.estado === tab).length})`}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid hsl(214.3 31.8% 91.4%)" }}>
                {["ID", "Destinatário", "Endereço", "Motorista", "Estado", "Data", "Acções"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>A carregar entregas...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Nenhuma entrega encontrada.</td></tr>
              )}
              {filtered.slice(0, 20).map((delivery, idx) => {
                const next = STATUS_ORDER[STATUS_ORDER.indexOf(delivery.estado as Status) + 1] ?? null;
                return (
                  <motion.tr key={delivery.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                    className="transition-colors duration-100 cursor-pointer hover:bg-slate-50"
                    style={{ borderBottom: "1px solid hsl(214.3 31.8% 91.4%)" }}
                    onClick={() => setSelectedDelivery(delivery)} data-testid={`row-delivery-${delivery.codigo}`}>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-semibold" style={{ color: "hsl(221 83% 53%)" }}>{delivery.codigo}</span>
                      {delivery.prioridade === "Urgente" && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "hsl(0 84.2% 95%)", color: "hsl(0 84.2% 45%)" }}>Urgente</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium" style={{ color: "hsl(222.2 84% 4.9%)" }}>{delivery.destinatario}</div>
                      <div className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{delivery.telefone}</div>
                    </td>
                    <td className="px-6 py-4"><div className="text-sm max-w-xs truncate" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{delivery.endereco}</div></td>
                    <td className="px-6 py-4 text-sm" style={{ color: "hsl(222.2 47.4% 11.2%)" }}>{delivery.motorista}</td>
                    <td className="px-6 py-4"><StatusBadge status={delivery.estado as Status} /></td>
                    <td className="px-6 py-4 text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                      {new Date(delivery.criadoEm).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {next && (
                          <button data-testid={`button-advance-${delivery.codigo}`}
                            onClick={() => updateMutation.mutate({ id: delivery.id, estado: next })}
                            disabled={updateMutation.isPending} title={`Avançar para ${next}`}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                            style={{ background: statusConfig[next].bg, color: statusConfig[next].color }}>
                            <ArrowRight className="w-3 h-3" />{next}
                          </button>
                        )}
                        <button data-testid={`button-view-${delivery.codigo}`} onClick={() => setSelectedDelivery(delivery)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-slate-100" style={{ color: "hsl(221 83% 53%)" }}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button data-testid={`button-delete-${delivery.codigo}`} onClick={() => deleteMutation.mutate(delivery.id)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-50" style={{ color: "hsl(0 84.2% 60.2%)" }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 flex items-center justify-between border-t" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <span className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
            {filtered.length > 20 ? `A mostrar 20 de ${filtered.length} entregas` : `${filtered.length} entregas`}
          </span>
        </div>
      </motion.div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Entrega</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Destinatário</Label>
              <Input data-testid="input-destinatario" placeholder="Nome completo" value={form.destinatario} onChange={(e) => setForm({ ...form, destinatario: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input data-testid="input-telefone" placeholder="+244 9XX XXX XXX" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Endereço</Label>
              <Input data-testid="input-endereco" placeholder="Morada completa, Luanda" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Motorista</Label>
              <Select value={form.motorista} onValueChange={(v) => setForm({ ...form, motorista: v })}>
                <SelectTrigger data-testid="select-motorista"><SelectValue placeholder="Seleccionar motorista" /></SelectTrigger>
                <SelectContent>
                  {motoristasData.filter((m) => m.activo).map((m) => (
                    <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v as "Normal" | "Urgente" })}>
                <SelectTrigger data-testid="select-prioridade"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button data-testid="button-criar-entrega" onClick={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.destinatario || !form.endereco || !form.motorista}
              className="text-white" style={{ background: "hsl(221 83% 53%)" }}>
              {createMutation.isPending ? "A criar..." : "Criar Entrega"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={!!selectedDelivery} onOpenChange={(open) => !open && setSelectedDelivery(null)}>
        <SheetContent>
          {selectedDelivery && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="text-sm font-mono font-semibold" style={{ color: "hsl(221 83% 53%)" }}>{selectedDelivery.codigo}</span>
                  <StatusBadge status={selectedDelivery.estado as Status} />
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <StatusStepper current={selectedDelivery.estado as Status}
                  onSelect={(s) => updateMutation.mutate({ id: selectedDelivery.id, estado: s })}
                  loading={updateMutation.isPending} />
                <div className="border-t pt-4" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Detalhes</div>
                  <div className="space-y-3">
                    {[
                      { icon: User, label: "Destinatário", value: selectedDelivery.destinatario },
                      { icon: Phone, label: "Telefone", value: selectedDelivery.telefone },
                      { icon: MapPin, label: "Endereço", value: selectedDelivery.endereco },
                      { icon: Truck, label: "Motorista", value: selectedDelivery.motorista },
                      { icon: Calendar, label: "Data", value: new Date(selectedDelivery.criadoEm).toLocaleDateString("pt-PT") },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "hsl(210 40% 96.1%)" }}>
                          <item.icon className="w-4 h-4" style={{ color: "hsl(221 83% 53%)" }} />
                        </div>
                        <div>
                          <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{item.label}</div>
                          <div className="text-sm font-medium mt-0.5" style={{ color: "hsl(222.2 84% 4.9%)" }}>{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-lg flex items-center gap-2"
                  style={{ background: selectedDelivery.prioridade === "Urgente" ? "hsl(0 84.2% 95%)" : "hsl(210 40% 96.1%)", color: selectedDelivery.prioridade === "Urgente" ? "hsl(0 84.2% 45%)" : "hsl(215.4 16.3% 46.9%)" }}>
                  <span className="text-sm font-medium">Prioridade: {selectedDelivery.prioridade}</span>
                </div>
                <Button variant="outline" className="w-full" style={{ color: "hsl(0 84.2% 45%)", borderColor: "hsl(0 84.2% 80%)" }}
                  onClick={() => deleteMutation.mutate(selectedDelivery.id)} disabled={deleteMutation.isPending}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteMutation.isPending ? "A eliminar..." : "Eliminar Entrega"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
