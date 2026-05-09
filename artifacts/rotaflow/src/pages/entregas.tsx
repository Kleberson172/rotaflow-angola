import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Clock, CheckCircle2, Truck, Plus, Search, Trash2, Eye,
  MapPin, Phone, Calendar, User, Map, List, ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { api, type Entrega } from "@/lib/api";

type Status = "Pendente" | "Em Rota" | "Entregue";

const STATUS_ORDER: Status[] = ["Pendente", "Em Rota", "Entregue"];

const statusConfig: Record<Status, { color: string; bg: string; border: string; icon: typeof Clock }> = {
  Pendente: { color: "hsl(38 92% 40%)", bg: "hsl(38 92% 95%)", border: "hsl(38 92% 75%)", icon: Clock },
  "Em Rota": { color: "hsl(221 83% 45%)", bg: "hsl(221 83% 95%)", border: "hsl(221 83% 75%)", icon: Truck },
  Entregue: { color: "hsl(142 76% 30%)", bg: "hsl(142 76% 95%)", border: "hsl(142 76% 65%)", icon: CheckCircle2 },
};

function StatusBadge({ status }: { status: Status }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: cfg.color, background: cfg.bg }}>
      <Icon className="w-3 h-3" />{status}
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
                {s}
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

function createMarkerIcon(status: Status) {
  const colors: Record<Status, string> = { Pendente: "#f59e0b", "Em Rota": "#3b82f6", Entregue: "#22c55e" };
  const color = colors[status];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="white"/></svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -36] });
}

function FlyToMarker({ delivery }: { delivery: Entrega | null }) {
  const map = useMap();
  useEffect(() => {
    if (delivery) map.flyTo([delivery.lat, delivery.lng], 15, { animate: true, duration: 0.8 });
  }, [delivery, map]);
  return null;
}

export default function Entregas() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"Todas" | Status>("Todas");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Entrega | null>(null);
  const [focusedOnMap, setFocusedOnMap] = useState<Entrega | null>(null);
  const [view, setView] = useState<"lista" | "mapa">("lista");
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
      if (selectedDelivery?.id === updated.id) setSelectedDelivery(updated);
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

  const tabs: Array<"Todas" | Status> = ["Todas", "Pendente", "Em Rota", "Entregue"];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>Entregas</h1>
          <p className="text-sm mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{entregas.length} entregas registadas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border p-1 gap-1" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
            <button data-testid="button-view-lista" onClick={() => setView("lista")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
              style={view === "lista" ? { background: "hsl(221 83% 53%)", color: "white" } : { color: "hsl(215.4 16.3% 46.9%)" }}>
              <List className="w-4 h-4" /> Lista
            </button>
            <button data-testid="button-view-mapa" onClick={() => setView("mapa")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
              style={view === "mapa" ? { background: "hsl(221 83% 53%)", color: "white" } : { color: "hsl(215.4 16.3% 46.9%)" }}>
              <Map className="w-4 h-4" /> Mapa
            </button>
          </div>
          <Button data-testid="button-nova-entrega" onClick={() => setShowCreate(true)} className="flex items-center gap-2 text-white h-10 px-4" style={{ background: "hsl(221 83% 53%)" }}>
            <Plus className="w-4 h-4" /> Nova Entrega
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-6 pb-4 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button key={tab} data-testid={`tab-${tab.toLowerCase().replace(" ", "-")}`} onClick={() => setActiveTab(tab)}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
              style={activeTab === tab ? { background: "hsl(221 83% 53%)", color: "white" } : { color: "hsl(215.4 16.3% 46.9%)" }}>
              {tab}
              <span className="ml-1.5 text-xs opacity-70">
                {tab === "Todas" ? entregas.length : entregas.filter((d) => d.estado === tab).length}
              </span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
          <Input data-testid="input-search" placeholder="Pesquisar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-56 text-sm" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6 pb-6">
        {view === "lista" ? (
          <motion.div key="lista" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white rounded-xl border overflow-hidden h-full flex flex-col" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
            <div className="overflow-y-auto flex-1">
              <table className="w-full">
                <thead className="sticky top-0 bg-white z-10">
                  <tr style={{ borderBottom: "1px solid hsl(214.3 31.8% 91.4%)" }}>
                    {["ID", "Destinatário", "Endereço", "Motorista", "Estado", "Data", "Acções"].map((h) => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>A carregar entregas...</td></tr>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-16 text-center text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Nenhuma entrega encontrada.</td></tr>
                  )}
                  {filtered.map((delivery, idx) => {
                    const next = nextStatus(delivery.estado as Status);
                    return (
                      <motion.tr key={delivery.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                        className="hover:bg-slate-50 transition-colors cursor-pointer" style={{ borderBottom: "1px solid hsl(214.3 31.8% 91.4%)" }}
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
                        <td className="px-6 py-4 text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{new Date(delivery.criadoEm).toLocaleDateString("pt-PT")}</td>
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
                            <button data-testid={`button-map-${delivery.codigo}`}
                              onClick={() => { setView("mapa"); setFocusedOnMap(delivery); }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" style={{ color: "hsl(142 76% 30%)" }} title="Ver no mapa">
                              <MapPin className="w-4 h-4" />
                            </button>
                            <button data-testid={`button-view-${delivery.codigo}`} onClick={() => setSelectedDelivery(delivery)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" style={{ color: "hsl(221 83% 53%)" }}>
                              <Eye className="w-4 h-4" />
                            </button>
                            <button data-testid={`button-delete-${delivery.codigo}`} onClick={() => deleteMutation.mutate(delivery.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" style={{ color: "hsl(0 84.2% 60.2%)" }}>
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
            <div className="px-6 py-3 border-t flex-shrink-0" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
              <span className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{filtered.length} entregas</span>
            </div>
          </motion.div>
        ) : (
          <motion.div key="mapa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 h-full">
            <div className="w-64 flex-shrink-0 bg-white rounded-xl border overflow-hidden flex flex-col" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
              <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                <h3 className="text-sm font-semibold" style={{ color: "hsl(222.2 84% 4.9%)" }}>Entregas activas</h3>
              </div>
              <div className="overflow-y-auto flex-1">
                {filtered.map((d) => {
                  const cfg = statusConfig[d.estado as Status];
                  const isFocused = focusedOnMap?.id === d.id;
                  const next = nextStatus(d.estado as Status);
                  return (
                    <div key={d.id} className="border-b" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                      <button data-testid={`map-list-${d.codigo}`} onClick={() => setFocusedOnMap(d)}
                        className="w-full text-left px-4 py-3 transition-colors"
                        style={{ background: isFocused ? "hsl(221 83% 53% / 0.06)" : "transparent", borderLeft: isFocused ? "3px solid hsl(221 83% 53%)" : "3px solid transparent" }}>
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: cfg.color }} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold truncate" style={{ color: "hsl(222.2 84% 4.9%)" }}>{d.destinatario}</div>
                            <div className="text-xs mt-0.5 truncate" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{d.endereco}</div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-xs font-medium" style={{ color: cfg.color }}>{d.estado}</span>
                              {next && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateMutation.mutate({ id: d.id, estado: next }); }}
                                  disabled={updateMutation.isPending}
                                  className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md"
                                  style={{ background: statusConfig[next].bg, color: statusConfig[next].color }}
                                >
                                  <ArrowRight className="w-2.5 h-2.5" />{next}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-3 border-t flex-shrink-0 flex gap-3 text-xs" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                {[{ label: "Pendente", color: "#f59e0b" }, { label: "Em Rota", color: "#3b82f6" }, { label: "Entregue", color: "#22c55e" }].map((l) => (
                  <div key={l.label} className="flex items-center gap-1" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />{l.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
              <MapContainer center={[-8.8383, 13.2344]} zoom={12} style={{ height: "100%", width: "100%" }} zoomControl={true}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                <FlyToMarker delivery={focusedOnMap} />
                {filtered.map((delivery) => (
                  <Marker key={delivery.id} position={[delivery.lat, delivery.lng]} icon={createMarkerIcon(delivery.estado as Status)} eventHandlers={{ click: () => setFocusedOnMap(delivery) }}>
                    <Popup>
                      <div className="p-1 min-w-[200px]">
                        <div className="font-semibold text-sm mb-1">{delivery.destinatario}</div>
                        <div className="text-xs text-gray-500 mb-1">{delivery.endereco}</div>
                        <div className="text-xs text-gray-500 mb-2">Motorista: {delivery.motorista}</div>
                        <div className="flex items-center justify-between">
                          <StatusBadge status={delivery.estado as Status} />
                          {nextStatus(delivery.estado as Status) && (
                            <button
                              onClick={() => updateMutation.mutate({ id: delivery.id, estado: nextStatus(delivery.estado as Status)! })}
                              className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md"
                              style={{ background: statusConfig[nextStatus(delivery.estado as Status)!].bg, color: statusConfig[nextStatus(delivery.estado as Status)!].color }}
                            >
                              <ArrowRight className="w-3 h-3" />
                              {nextStatus(delivery.estado as Status)}
                            </button>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </motion.div>
        )}
      </div>

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
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "hsl(210 40% 96.1%)" }}>
                          <item.icon className="w-3.5 h-3.5" style={{ color: "hsl(221 83% 53%)" }} />
                        </div>
                        <div>
                          <div className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{item.label}</div>
                          <div className="text-sm font-medium mt-0.5" style={{ color: "hsl(222.2 84% 4.9%)" }}>{item.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 text-sm" onClick={() => { setView("mapa"); setFocusedOnMap(selectedDelivery); setSelectedDelivery(null); }}>
                    <MapPin className="w-3.5 h-3.5 mr-1.5" style={{ color: "hsl(142 76% 30%)" }} />Ver no Mapa
                  </Button>
                  <Button variant="outline" className="flex-1 text-sm" style={{ color: "hsl(0 84.2% 45%)", borderColor: "hsl(0 84.2% 80%)" }}
                    onClick={() => deleteMutation.mutate(selectedDelivery.id)} disabled={deleteMutation.isPending}>
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
    </div>
  );
}
