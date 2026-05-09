import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Users, Plus, Search, Phone, MapPin, Package, Star, CheckCircle2, XCircle, Eye, Trash2, TrendingUp } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api, type Motorista } from "@/lib/api";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" as const },
  }),
};

function PerformanceBadge({ taxa }: { taxa: number }) {
  let color = "hsl(142 76% 30%)"; let bg = "hsl(142 76% 95%)"; let label = "Excelente";
  if (taxa < 90) { color = "hsl(0 84.2% 45%)"; bg = "hsl(0 84.2% 95%)"; label = "A melhorar"; }
  else if (taxa < 95) { color = "hsl(38 92% 40%)"; bg = "hsl(38 92% 95%)"; label = "Bom"; }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ color, background: bg }}>
      <Star className="w-2.5 h-2.5" />{label} {taxa}%
    </span>
  );
}

export default function Motoristas() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterActivo, setFilterActivo] = useState<"Todos" | "Activos" | "Inactivos">("Todos");
  const [selected, setSelected] = useState<Motorista | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ nome: "", telefone: "", zona: "", veiculo: "" });

  const { data: motoristas = [], isLoading } = useQuery({ queryKey: ["motoristas"], queryFn: api.motoristas.list });

  const createMutation = useMutation({
    mutationFn: api.motoristas.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["motoristas"] }); setShowCreate(false); setNewForm({ nome: "", telefone: "", zona: "", veiculo: "" }); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => api.motoristas.update(id, { activo }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["motoristas"] });
      if (selected?.id === updated.id) setSelected(updated);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.motoristas.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["motoristas"] }); setSelected(null); },
  });

  const filtered = motoristas.filter((m) => {
    const matchSearch = m.nome.toLowerCase().includes(search.toLowerCase()) || m.zona.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filterActivo === "Todos" || (filterActivo === "Activos" && m.activo) || (filterActivo === "Inactivos" && !m.activo);
    return matchSearch && matchFilter;
  });

  const totalActivos = motoristas.filter((m) => m.activo).length;
  const totalEntregas = motoristas.reduce((a, m) => a + m.entregasTotal, 0);
  const mediaTaxa = motoristas.length ? Math.round(motoristas.reduce((a, m) => a + m.taxaSucesso, 0) / motoristas.length) : 0;

  const dummyHistorico = [
    { dia: "Seg", entregas: 0 }, { dia: "Ter", entregas: 0 }, { dia: "Qua", entregas: 0 },
    { dia: "Qui", entregas: 0 }, { dia: "Sex", entregas: 0 },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>Motoristas</h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Gestão da equipa de condutores</p>
        </div>
        <Button data-testid="button-novo-motorista" onClick={() => setShowCreate(true)} className="flex items-center gap-2 text-white h-10 px-4" style={{ background: "hsl(221 83% 53%)" }}>
          <Plus className="w-4 h-4" /> Novo Motorista
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total de Motoristas", value: motoristas.length, icon: Users, color: "hsl(221 83% 53%)", bg: "hsl(221 83% 95%)" },
          { label: "Motoristas Activos", value: totalActivos, icon: CheckCircle2, color: "hsl(142 76% 30%)", bg: "hsl(142 76% 95%)" },
          { label: "Total de Entregas", value: totalEntregas, icon: Package, color: "hsl(270 76% 45%)", bg: "hsl(270 76% 95%)" },
          { label: "Taxa Média de Sucesso", value: `${mediaTaxa}%`, icon: TrendingUp, color: "hsl(38 92% 40%)", bg: "hsl(38 92% 95%)" },
        ].map((stat, i) => {
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

      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <div className="flex items-center gap-1">
            {(["Todos", "Activos", "Inactivos"] as const).map((tab) => (
              <button key={tab} data-testid={`tab-motoristas-${tab.toLowerCase()}`} onClick={() => setFilterActivo(tab)}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150"
                style={filterActivo === tab ? { background: "hsl(221 83% 53%)", color: "white" } : { color: "hsl(215.4 16.3% 46.9%)" }}>
                {tab}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
            <Input data-testid="input-search-motoristas" placeholder="Pesquisar motoristas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-56 text-sm" />
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          {isLoading && (
            <div className="px-6 py-12 text-center text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>A carregar motoristas...</div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="px-6 py-12 text-center text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Nenhum motorista encontrado.</div>
          )}
          {filtered.map((motorista, idx) => (
            <motion.div key={motorista.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
              className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => setSelected(motorista)} data-testid={`row-motorista-${motorista.codigo}`}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ background: motorista.activo ? "hsl(221 83% 53%)" : "hsl(215.4 16.3% 70%)" }}>
                {motorista.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: "hsl(222.2 84% 4.9%)" }}>{motorista.nome}</span>
                  <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={motorista.activo ? { color: "hsl(142 76% 30%)", background: "hsl(142 76% 95%)" } : { color: "hsl(215.4 16.3% 46.9%)", background: "hsl(210 40% 94%)" }}>
                    {motorista.activo ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                    {motorista.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs flex items-center gap-1" style={{ color: "hsl(215.4 16.3% 46.9%)" }}><Phone className="w-3 h-3" />{motorista.telefone}</span>
                  <span className="text-xs flex items-center gap-1" style={{ color: "hsl(215.4 16.3% 46.9%)" }}><MapPin className="w-3 h-3" />{motorista.zona}</span>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-6 flex-shrink-0">
                <div className="text-center">
                  <div className="text-sm font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>{motorista.entregasTotal}</div>
                  <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>total</div>
                </div>
                <PerformanceBadge taxa={motorista.taxaSucesso} />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button data-testid={`button-view-motorista-${motorista.codigo}`} onClick={() => setSelected(motorista)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-slate-100" style={{ color: "hsl(221 83% 53%)" }}>
                  <Eye className="w-4 h-4" />
                </button>
                <button data-testid={`button-toggle-motorista-${motorista.codigo}`}
                  onClick={() => toggleMutation.mutate({ id: motorista.id, activo: !motorista.activo })}
                  className="p-1.5 rounded-lg transition-colors hover:bg-slate-100"
                  style={{ color: motorista.activo ? "hsl(38 92% 40%)" : "hsl(142 76% 30%)" }} title={motorista.activo ? "Desactivar" : "Activar"}>
                  {motorista.activo ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                </button>
                <button data-testid={`button-delete-motorista-${motorista.codigo}`} onClick={() => deleteMutation.mutate(motorista.id)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-red-50" style={{ color: "hsl(0 84.2% 60.2%)" }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="px-6 py-3 border-t" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <span className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{filtered.length} motoristas encontrados</span>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-80 sm:w-96 overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: selected.activo ? "hsl(221 83% 53%)" : "hsl(215.4 16.3% 70%)" }}>
                    {selected.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div className="text-base font-semibold" style={{ color: "hsl(222.2 84% 4.9%)" }}>{selected.nome}</div>
                    <div className="text-xs font-normal mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{selected.codigo}</div>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total", value: selected.entregasTotal },
                    { label: "Sucesso", value: `${selected.taxaSucesso}%` },
                  ].map((s) => (
                    <div key={s.label} className="p-3 rounded-xl text-center border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                      <div className="text-lg font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>{s.value}</div>
                      <div className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Informações</div>
                  <div className="space-y-2.5">
                    {[
                      { icon: Phone, label: "Telefone", value: selected.telefone },
                      { icon: MapPin, label: "Zona", value: selected.zona },
                      { icon: Package, label: "Veículo", value: selected.veiculo },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "hsl(210 40% 96.1%)" }}>
                          <item.icon className="w-3.5 h-3.5" style={{ color: "hsl(221 83% 53%)" }} />
                        </div>
                        <div>
                          <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{item.label}</div>
                          <div className="text-sm font-medium" style={{ color: "hsl(222.2 84% 4.9%)" }}>{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Histórico — últimos 5 dias</div>
                  <div style={{ height: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dummyHistorico} barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214.3 31.8% 91.4%)" />
                        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(215.4 16.3% 46.9%)" }} axisLine={false} tickLine={false} width={20} />
                        <Tooltip contentStyle={{ background: "white", border: "1px solid hsl(214.3 31.8% 91.4%)", borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="entregas" name="Entregas" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <PerformanceBadge taxa={selected.taxaSucesso} />
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 text-sm" variant="outline"
                    onClick={() => toggleMutation.mutate({ id: selected.id, activo: !selected.activo })}
                    disabled={toggleMutation.isPending}
                    style={selected.activo ? { color: "hsl(38 92% 40%)", borderColor: "hsl(38 92% 80%)" } : { color: "hsl(142 76% 30%)", borderColor: "hsl(142 76% 70%)" }}>
                    {selected.activo ? "Desactivar" : "Activar"}
                  </Button>
                  <Button variant="outline" className="flex-1 text-sm" style={{ color: "hsl(0 84.2% 45%)", borderColor: "hsl(0 84.2% 80%)" }}
                    onClick={() => deleteMutation.mutate(selected.id)} disabled={deleteMutation.isPending}>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />{deleteMutation.isPending ? "A eliminar..." : "Eliminar"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Motorista</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome Completo</Label>
              <Input data-testid="input-nome-motorista" placeholder="Nome completo" value={newForm.nome} onChange={(e) => setNewForm({ ...newForm, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input data-testid="input-telefone-motorista" placeholder="+244 9XX XXX XXX" value={newForm.telefone} onChange={(e) => setNewForm({ ...newForm, telefone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Zona de Entrega</Label>
              <Input data-testid="input-zona-motorista" placeholder="Ex: Talatona / Miramar" value={newForm.zona} onChange={(e) => setNewForm({ ...newForm, zona: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Veículo / Matrícula</Label>
              <Input data-testid="input-veiculo-motorista" placeholder="Ex: Moto — AO 12-34-AB" value={newForm.veiculo} onChange={(e) => setNewForm({ ...newForm, veiculo: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button data-testid="button-criar-motorista" onClick={() => createMutation.mutate(newForm)} disabled={createMutation.isPending || !newForm.nome || !newForm.telefone}
              className="text-white" style={{ background: "hsl(221 83% 53%)" }}>
              {createMutation.isPending ? "A criar..." : "Criar Motorista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
