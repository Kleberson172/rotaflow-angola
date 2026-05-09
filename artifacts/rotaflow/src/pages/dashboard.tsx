import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Package, Clock, CheckCircle2, Truck, Users, Plus, Search, Trash2, Eye,
  MapPin, Phone, Calendar, User, TrendingUp, ArrowRight,
} from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api, type Entrega } from "@/lib/api";

type Status = "Pendente" | "Em Rota" | "Entregue";

const STATUS_ORDER: Status[] = ["Pendente", "Em Rota", "Entregue"];

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
      <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
        Alterar Estado
      </div>
      <div className="flex items-center gap-1">
        {STATUS_ORDER.map((s, i) => {
          const cfg = statusConfig[s];
          const Icon = cfg.icon;
          const isCurrent = current === s;
          const isPast = STATUS_ORDER.indexOf(current) > i;
          return (
            <div key={s} className="flex items-center gap-1 flex-1">
              <button
                onClick={() => !isCurrent && onSelect(s)}
                disabled={loading || isCurrent}
                className="flex-1 flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border-2 transition-all text-xs font-semibold"
                style={
                  isCurrent
                    ? { borderColor: cfg.border, background: cfg.bg, color: cfg.color }
                    : isPast
                    ? { borderColor: "hsl(214.3 31.8% 91.4%)", background: "hsl(210 40% 98%)", color: "hsl(215.4 16.3% 60%)", cursor: "pointer" }
                    : { borderColor: "hsl(214.3 31.8% 91.4%)", background: "white", color: "hsl(215.4 16.3% 46.9%)", cursor: "pointer" }
                }
              >
                <Icon className="w-4 h-4" />
                {cfg.label}
              </button>
              {i < STATUS_ORDER.length - 1 && (
                <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(214.3 31.8% 75%)" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const weeklyData = [
  { dia: "Seg", entregues: 38, emRota: 12, pendentes: 8 },
  { dia: "Ter", entregues: 52, emRota: 18, pendentes: 11 },
  { dia: "Qua", entregues: 45, emRota: 14, pendentes: 9 },
  { dia: "Qui", entregues: 61, emRota: 20, pendentes: 15 },
  { dia: "Sex", entregues: 74, emRota: 25, pendentes: 18 },
  { dia: "Sáb", entregues: 29, emRota: 8, pendentes: 5 },
  { dia: "Dom", entregues: 12, emRota: 3, pendentes: 2 },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

export default function Dashboard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"Todas" | Status>("Todas");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Entrega | null>(null);
  const [form, setForm] = useState({ destinatario: "", telefone: "", endereco: "", motorista: "", prioridade: "Normal" as "Normal" | "Urgente" });

  const { data: entregas = [], isLoading } = useQuery({ queryKey: ["entregas"], queryFn: api.entregas.list });
  const { data: motoristasData = [] } = useQuery({ queryKey: ["motoristas"], queryFn: api.motoristas.list });

  const createMutation = useMutation({
    mutationFn: api.entregas.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entregas"] });
      setShowCreate(false);
      setForm({ destinatario: "", telefone: "", endereco: "", motorista: "", prioridade: "Normal" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: Status }) => api.entregas.update(id, { estado }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["entregas"] });
      if (selectedDelivery?.id === updated.id) {
        setSelectedDelivery(updated);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.entregas.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["entregas"] }); setSelectedDelivery(null); },
  });

  const nextStatus = (current: Status): Status | null => {
    const idx = STATUS_ORDER.indexOf(current);
    return idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
  };

  const filtered = entregas.filter((d) => {
    const matchSearch = d.destinatario.toLowerCase().includes(search.toLowerCase()) || d.endereco.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === "Todas" || d.estado === activeTab;
    return matchSearch && matchTab;
  });

  const stats = [
    { label: "Total de Entregas", value: entregas.length, icon: Package, color: "hsl(221 83% 53%)", bg: "hsl(221 83% 95%)" },
    { label: "Pendentes", value: entregas.filter((d) => d.estado === "Pendente").length, icon: Clock, color: "hsl(38 92% 40%)", bg: "hsl(38 92% 95%)" },
    { label: "Em Rota", value: entregas.filter((d) => d.estado === "Em Rota").length, icon: Truck, color: "hsl(221 83% 45%)", bg: "hsl(221 83% 95%)" },
    { label: "Entregues", value: entregas.filter((d) => d.estado === "Entregue").length, icon: CheckCircle2, color: "hsl(142 76% 30%)", bg: "hsl(142 76% 95%)" },
    { label: "Motoristas Activos", value: motoristasData.filter((m) => m.activo).length, icon: Users, color: "hsl(270 76% 45%)", bg: "hsl(270 76% 95%)" },
  ];

  const tabs: Array<"Todas" | Status> = ["Todas", "Pendente", "Em Rota", "Entregue"];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Visão geral das operações de entrega</p>
        </div>
        <Button data-testid="button-nova-entrega" onClick={() => setShowCreate(true)} className="flex items-center gap-2 text-white h-10 px-4" style={{ background: "hsl(221 83% 53%)" }}>
          <Plus className="w-4 h-4" /> Nova Entrega
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} custom={i} initial="hidden" animate="visible" variants={cardVariants}
              className="bg-white rounded-xl p-5 border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: stat.bg }}>
                <Icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div className="text-2xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>
                {isLoading ? <span className="inline-block w-8 h-6 bg-gray-100 rounded animate-pulse" /> : stat.value}
              </div>
              <div className="text-xs mt-1" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42, duration: 0.4 }}
        className="bg-white rounded-xl border mb-6" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <div>
            <h2 className="font-semibold text-base" style={{ color: "hsl(222.2 84% 4.9%)" }}>Entregas por Dia da Semana</h2>
            <p className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Evolução dos últimos 7 dias</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg" style={{ background: "hsl(142 76% 95%)", color: "hsl(142 76% 30%)" }}>
            <TrendingUp className="w-3.5 h-3.5" /> Esta semana
          </div>
        </div>
        <div className="px-2 py-4" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} barSize={14} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214.3 31.8% 91.4%)" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={{ background: "white", border: "1px solid hsl(214.3 31.8% 91.4%)", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} cursor={{ fill: "hsl(210 40% 97%)" }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="entregues" name="Entregues" fill="hsl(142 76% 42%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="emRota" name="Em Rota" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pendentes" name="Pendentes" fill="hsl(38 92% 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.4 }}
        className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <h2 className="font-semibold text-base" style={{ color: "hsl(222.2 84% 4.9%)" }}>Entregas Recentes</h2>
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
              {tab}
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
              {filtered.map((delivery, idx) => {
                const next = nextStatus(delivery.estado as Status);
                return (
                  <motion.tr key={delivery.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
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
                          <button
                            data-testid={`button-advance-${delivery.codigo}`}
                            onClick={() => updateMutation.mutate({ id: delivery.id, estado: next })}
                            disabled={updateMutation.isPending}
                            title={`Avançar para ${next}`}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors"
                            style={{ background: statusConfig[next].bg, color: statusConfig[next].color }}
                          >
                            <ArrowRight className="w-3 h-3" />
                            {next}
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
          <span className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{filtered.length} entregas encontradas</span>
        </div>
      </motion.div>

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
                <StatusStepper
                  current={selectedDelivery.estado as Status}
                  onSelect={(s) => updateMutation.mutate({ id: selectedDelivery.id, estado: s })}
                  loading={updateMutation.isPending}
                />

                <div className="border-t pt-4" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Detalhes da Entrega</div>
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
