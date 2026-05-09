import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Bell, Users, Shield, Save, Plus, Trash2,
  Mail, Phone, MapPin, Globe, CheckCircle2, AlertCircle,
  Lock, Eye, EyeOff, Loader2, XCircle, UserCheck, UserX,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type UtilizadorPublico } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type TabId = "empresa" | "notificacoes" | "utilizadores" | "seguranca";

const tabList: { id: TabId; label: string; icon: typeof Building2 }[] = [
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "utilizadores", label: "Utilizadores", icon: Users },
  { id: "seguranca", label: "Segurança", icon: Shield },
];

const papelConfig: Record<string, { label: string; color: string; bg: string }> = {
  administrador: { label: "Administrador", color: "hsl(221 83% 45%)", bg: "hsl(221 83% 95%)" },
  operador:      { label: "Operador",       color: "hsl(215.4 16.3% 40%)", bg: "hsl(210 40% 94%)" },
  entregador:    { label: "Entregador",     color: "hsl(142 76% 30%)", bg: "hsl(142 76% 95%)" },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold mb-4" style={{ color: "hsl(222.2 84% 4.9%)" }}>{children}</h3>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 py-4">
      <div className="sm:w-48 flex-shrink-0">
        <Label className="text-sm font-medium" style={{ color: "hsl(222.2 47.4% 11.2%)" }}>{label}</Label>
        {hint && <p className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <div className="text-sm font-medium" style={{ color: "hsl(222.2 47.4% 11.2%)" }}>{label}</div>
        {hint && <div className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{hint}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SaveButton({ onClick, saved, loading }: { onClick: () => void; saved: boolean; loading?: boolean }) {
  return (
    <div className="flex items-center gap-3 mt-6 pt-6 border-t" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
      <AnimatePresence>
        {saved && (
          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(142 76% 30%)" }}>
            <CheckCircle2 className="w-4 h-4" />Guardado com sucesso
          </motion.div>
        )}
      </AnimatePresence>
      <Button onClick={onClick} disabled={loading}
        className="ml-auto text-white flex items-center gap-2" style={{ background: "hsl(221 83% 53%)" }}
        data-testid="button-guardar">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Guardar Alterações
      </Button>
    </div>
  );
}

function TabUtilizadores() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<UtilizadorPublico | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [newForm, setNewForm] = useState({ nome: "", email: "", senha: "", papel: "operador", motoristaNome: "" });
  const [editForm, setEditForm] = useState({ nome: "", email: "", papel: "operador", motoristaNome: "", activo: true });

  const { data: utilizadores = [], isLoading } = useQuery({
    queryKey: ["utilizadores"],
    queryFn: api.utilizadores.list,
  });

  const { data: motoristasNomes = [] } = useQuery({
    queryKey: ["motoristas-nomes"],
    queryFn: api.motoristas.listNomes,
  });

  const criarMutation = useMutation({
    mutationFn: api.utilizadores.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["utilizadores"] });
      qc.invalidateQueries({ queryKey: ["notificacoes-count"] });
      setShowAdd(false);
      setNewForm({ nome: "", email: "", senha: "", papel: "operador", motoristaNome: "" });
    },
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.utilizadores.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["utilizadores"] });
      setEditTarget(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.utilizadores.update(id, { activo } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["utilizadores"] }),
  });

  const eliminarMutation = useMutation({
    mutationFn: api.utilizadores.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["utilizadores"] });
      qc.invalidateQueries({ queryKey: ["notificacoes-count"] });
    },
  });

  const openEdit = (u: UtilizadorPublico) => {
    setEditForm({ nome: u.nome, email: u.email, papel: u.papel, motoristaNome: u.motoristaNome ?? "", activo: u.activo });
    setEditTarget(u);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>Gestão de Utilizadores</SectionTitle>
        <Button data-testid="button-adicionar-utilizador" onClick={() => setShowAdd(true)}
          className="text-white h-8 px-3 text-xs flex items-center gap-1.5" style={{ background: "hsl(221 83% 53%)" }}>
          <Plus className="w-3.5 h-3.5" />Adicionar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse border" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {utilizadores.map((u) => {
            const cfg = papelConfig[u.papel] ?? papelConfig.operador;
            const isSelf = u.id === user?.id;
            return (
              <motion.div key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                data-testid={`row-utilizador-${u.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border transition-colors hover:bg-slate-50 cursor-pointer"
                style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}
                onClick={() => openEdit(u)}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: u.activo ? cfg.color : "hsl(215.4 16.3% 70%)" }}>
                  {u.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: "hsl(222.2 84% 4.9%)" }}>{u.nome}</span>
                    {isSelf && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "hsl(38 92% 95%)", color: "hsl(38 92% 40%)" }}>
                        Você
                      </span>
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    {!u.activo && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "hsl(0 84.2% 95%)", color: "hsl(0 84.2% 45%)" }}>
                        Inactivo
                      </span>
                    )}
                    {u.papel === "entregador" && u.motoristaNome && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "hsl(142 76% 95%)", color: "hsl(142 76% 30%)" }}>
                        🚚 {u.motoristaNome}
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{u.email}</div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {!isSelf && (
                    <button data-testid={`button-toggle-utilizador-${u.id}`}
                      onClick={() => toggleMutation.mutate({ id: u.id, activo: !u.activo })}
                      disabled={toggleMutation.isPending}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      style={{ color: u.activo ? "hsl(38 92% 40%)" : "hsl(142 76% 30%)" }}
                      title={u.activo ? "Desactivar" : "Activar"}>
                      {u.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                  )}
                  {!isSelf && (
                    <button data-testid={`button-delete-utilizador-${u.id}`}
                      onClick={() => eliminarMutation.mutate(u.id)}
                      disabled={eliminarMutation.isPending}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      style={{ color: "hsl(0 84.2% 60.2%)" }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Utilizador</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {criarMutation.error && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                style={{ background: "hsl(0 84.2% 95%)", color: "hsl(0 84.2% 45%)" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {criarMutation.error.message}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Nome Completo</Label>
              <Input placeholder="Nome do utilizador" value={newForm.nome}
                onChange={(e) => setNewForm({ ...newForm, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
                <Input className="pl-9" placeholder="email@rotaflow.ao" type="email" value={newForm.email}
                  onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Senha inicial</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
                <Input className="pl-9 pr-9" type={showPass ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres" value={newForm.senha}
                  onChange={(e) => setNewForm({ ...newForm, senha: e.target.value })} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Papel / Função</Label>
              <Select value={newForm.papel} onValueChange={(v) => setNewForm({ ...newForm, papel: v, motoristaNome: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="entregador">Entregador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newForm.papel === "entregador" && (
              <div className="space-y-1.5">
                <Label>Motorista associado</Label>
                <Select value={newForm.motoristaNome} onValueChange={(v) => setNewForm({ ...newForm, motoristaNome: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar motorista..." /></SelectTrigger>
                  <SelectContent>
                    {motoristasNomes.map((m) => (
                      <SelectItem key={m.nome} value={m.nome}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                  O entregador verá apenas as suas próprias entregas no Optimizador.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={() => criarMutation.mutate({
              nome: newForm.nome, email: newForm.email, senha: newForm.senha,
              papel: newForm.papel, motoristaNome: newForm.papel === "entregador" ? newForm.motoristaNome : undefined,
            })}
              disabled={criarMutation.isPending || !newForm.nome || !newForm.email || !newForm.senha}
              className="text-white" style={{ background: "hsl(221 83% 53%)" }}>
              {criarMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />A criar...</> : "Criar Utilizador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Utilizador</DialogTitle></DialogHeader>
          {editTarget && (
            <div className="space-y-4 py-2">
              {editarMutation.error && (
                <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
                  style={{ background: "hsl(0 84.2% 95%)", color: "hsl(0 84.2% 45%)" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {editarMutation.error.message}
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Nome Completo</Label>
                <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
                  <Input className="pl-9" type="email" value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Papel / Função</Label>
                <Select value={editForm.papel}
                  onValueChange={(v) => setEditForm({ ...editForm, papel: v, motoristaNome: "" })}
                  disabled={editTarget.id === user?.id}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrador">Administrador</SelectItem>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="entregador">Entregador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editForm.papel === "entregador" && (
                <div className="space-y-1.5">
                  <Label>Motorista associado</Label>
                  <Select value={editForm.motoristaNome}
                    onValueChange={(v) => setEditForm({ ...editForm, motoristaNome: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar motorista..." /></SelectTrigger>
                    <SelectContent>
                      {motoristasNomes.map((m) => (
                        <SelectItem key={m.nome} value={m.nome}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editTarget.id !== user?.id && (
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "hsl(222.2 47.4% 11.2%)" }}>Conta activa</div>
                    <div className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Utilizador pode iniciar sessão</div>
                  </div>
                  <Switch checked={editForm.activo} onCheckedChange={(v) => setEditForm({ ...editForm, activo: v })} />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={() => editarMutation.mutate({
              id: editTarget!.id,
              data: {
                nome: editForm.nome, email: editForm.email, papel: editForm.papel,
                motoristaNome: editForm.papel === "entregador" ? editForm.motoristaNome || null : null,
                activo: editForm.activo,
              },
            })}
              disabled={editarMutation.isPending}
              className="text-white" style={{ background: "hsl(221 83% 53%)" }}>
              {editarMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />A guardar...</> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabSeguranca() {
  const [form, setForm] = useState({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
  const [showAtual, setShowAtual] = useState(false);
  const [showNova, setShowNova] = useState(false);
  const [erroLocal, setErroLocal] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [sessaoAuto, setSessaoAuto] = useState(true);
  const [doisFatores, setDoisFatores] = useState(false);
  const [tempoSessao, setTempoSessao] = useState("60");

  const changePasswordMutation = useMutation({
    mutationFn: () => api.auth.changePassword(form.senhaAtual, form.novaSenha),
    onSuccess: () => {
      setSucesso(true);
      setForm({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
      setErroLocal("");
      setTimeout(() => setSucesso(false), 4000);
    },
  });

  const handleSubmit = () => {
    if (!form.senhaAtual || !form.novaSenha || !form.confirmarSenha) {
      setErroLocal("Preencha todos os campos.");
      return;
    }
    if (form.novaSenha.length < 6) {
      setErroLocal("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (form.novaSenha !== form.confirmarSenha) {
      setErroLocal("As senhas não coincidem.");
      return;
    }
    setErroLocal("");
    changePasswordMutation.mutate();
  };

  return (
    <div>
      <SectionTitle>Alterar Senha</SectionTitle>
      <div className="space-y-4 mb-6">
        <AnimatePresence>
          {(erroLocal || changePasswordMutation.error) && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg text-sm"
              style={{ background: "hsl(0 84.2% 95%)", color: "hsl(0 84.2% 45%)" }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {erroLocal || changePasswordMutation.error?.message}
            </motion.div>
          )}
          {sucesso && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg text-sm"
              style={{ background: "hsl(142 76% 95%)", color: "hsl(142 76% 30%)" }}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Senha alterada com sucesso!
            </motion.div>
          )}
        </AnimatePresence>
        {[
          { key: "senhaAtual", label: "Senha Actual", show: showAtual, setShow: setShowAtual, placeholder: "••••••••" },
          { key: "novaSenha", label: "Nova Senha", show: showNova, setShow: setShowNova, placeholder: "Mínimo 6 caracteres" },
          { key: "confirmarSenha", label: "Confirmar Nova Senha", show: showNova, setShow: setShowNova, placeholder: "Repetir nova senha" },
        ].map(({ key, label, show, setShow, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-sm" style={{ color: "hsl(222.2 47.4% 11.2%)" }}>{label}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
              <Input data-testid={`input-${key}`} type={show ? "text" : "password"} className="pl-9 pr-9"
                placeholder={placeholder} value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
        <Button onClick={handleSubmit} disabled={changePasswordMutation.isPending}
          className="text-white flex items-center gap-2" style={{ background: "hsl(221 83% 53%)" }}>
          {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {changePasswordMutation.isPending ? "A alterar..." : "Alterar Senha"}
        </Button>
      </div>

      <Separator />

      <div className="mt-6">
        <SectionTitle>Segurança da Conta</SectionTitle>
        <div className="divide-y" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <ToggleRow label="Autenticação de Dois Factores"
            hint="Maior segurança ao iniciar sessão (requer app de autenticação)"
            checked={doisFatores} onChange={setDoisFatores} />
          <ToggleRow label="Terminar sessão automaticamente"
            hint="Encerrar sessão após período de inactividade"
            checked={sessaoAuto} onChange={setSessaoAuto} />
        </div>
        {sessaoAuto && (
          <div className="mt-4 space-y-1.5">
            <Label className="text-sm" style={{ color: "hsl(222.2 47.4% 11.2%)" }}>Tempo de inactividade</Label>
            <Select value={tempoSessao} onValueChange={setTempoSessao}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
                <SelectItem value="480">8 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState<TabId>("empresa");
  const [saved, setSaved] = useState<Record<TabId, boolean>>({
    empresa: false, notificacoes: false, utilizadores: false, seguranca: false,
  });

  const [empresa, setEmpresa] = useState({
    nome: "RotaFlow Angola", nif: "5000123456", email: "geral@rotaflow.ao",
    telefone: "+244 222 345 678", endereco: "Av. 4 de Fevereiro, Edifício Torre A, 5º Andar",
    cidade: "Luanda", website: "www.rotaflow.ao",
  });

  const [notif, setNotif] = useState({
    novaEntrega: true, entregaConcluida: true, entregaFalhou: true,
    motoristaSemActivo: false, relatorioSemanal: true, alertasEmail: true,
    alertasSMS: false, resumoDiario: true,
  });

  const handleSave = (tab: TabId) => {
    setSaved((prev) => ({ ...prev, [tab]: true }));
    setTimeout(() => setSaved((prev) => ({ ...prev, [tab]: false })), 3000);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>Configurações</h1>
        <p className="text-sm mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Gerir as preferências da plataforma</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-52 flex-shrink-0">
          <nav className="space-y-1">
            {tabList.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} data-testid={`tab-config-${tab.id}`} onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left"
                  style={active
                    ? { background: "hsl(221 83% 53% / 0.1)", color: "hsl(221 83% 45%)" }
                    : { color: "hsl(215.4 16.3% 46.9%)" }}>
                  <Icon className="w-4 h-4 flex-shrink-0" />{tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl border p-6" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>

            {activeTab === "empresa" && (
              <div>
                <SectionTitle>Perfil da Empresa</SectionTitle>
                <div className="divide-y" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                  <FieldRow label="Nome da Empresa">
                    <Input data-testid="input-empresa-nome" value={empresa.nome}
                      onChange={(e) => setEmpresa({ ...empresa, nome: e.target.value })} />
                  </FieldRow>
                  <FieldRow label="NIF / Contribuinte">
                    <Input data-testid="input-empresa-nif" value={empresa.nif}
                      onChange={(e) => setEmpresa({ ...empresa, nif: e.target.value })} />
                  </FieldRow>
                  <FieldRow label="Email de Contacto">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
                      <Input data-testid="input-empresa-email" className="pl-9" value={empresa.email}
                        onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })} />
                    </div>
                  </FieldRow>
                  <FieldRow label="Telefone">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
                      <Input data-testid="input-empresa-telefone" className="pl-9" value={empresa.telefone}
                        onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })} />
                    </div>
                  </FieldRow>
                  <FieldRow label="Endereço">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
                      <Input data-testid="input-empresa-endereco" className="pl-9" value={empresa.endereco}
                        onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })} />
                    </div>
                  </FieldRow>
                  <FieldRow label="Cidade">
                    <Input value={empresa.cidade} onChange={(e) => setEmpresa({ ...empresa, cidade: e.target.value })} />
                  </FieldRow>
                  <FieldRow label="Website">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
                      <Input className="pl-9" value={empresa.website}
                        onChange={(e) => setEmpresa({ ...empresa, website: e.target.value })} />
                    </div>
                  </FieldRow>
                </div>
                <SaveButton onClick={() => handleSave("empresa")} saved={saved.empresa} />
              </div>
            )}

            {activeTab === "notificacoes" && (
              <div>
                <SectionTitle>Alertas de Entregas</SectionTitle>
                <div className="divide-y" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                  <ToggleRow label="Nova entrega criada" hint="Notificar quando uma nova entrega é registada"
                    checked={notif.novaEntrega} onChange={(v) => setNotif({ ...notif, novaEntrega: v })} />
                  <ToggleRow label="Entrega concluída" hint="Notificar quando uma entrega é marcada como entregue"
                    checked={notif.entregaConcluida} onChange={(v) => setNotif({ ...notif, entregaConcluida: v })} />
                  <ToggleRow label="Falha de entrega" hint="Alertar quando uma entrega não for concluída"
                    checked={notif.entregaFalhou} onChange={(v) => setNotif({ ...notif, entregaFalhou: v })} />
                  <ToggleRow label="Motorista sem actividade" hint="Alertar quando um motorista não efectua entregas há mais de 2h"
                    checked={notif.motoristaSemActivo} onChange={(v) => setNotif({ ...notif, motoristaSemActivo: v })} />
                </div>
                <div className="mt-6">
                  <SectionTitle>Relatórios Automáticos</SectionTitle>
                  <div className="divide-y" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                    <ToggleRow label="Resumo diário" hint="Receber um resumo das operações do dia"
                      checked={notif.resumoDiario} onChange={(v) => setNotif({ ...notif, resumoDiario: v })} />
                    <ToggleRow label="Relatório semanal" hint="Relatório de desempenho enviado às segundas-feiras"
                      checked={notif.relatorioSemanal} onChange={(v) => setNotif({ ...notif, relatorioSemanal: v })} />
                  </div>
                </div>
                <div className="mt-6">
                  <SectionTitle>Canais de Notificação</SectionTitle>
                  <div className="divide-y" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                    <ToggleRow label="Notificações por Email" checked={notif.alertasEmail}
                      onChange={(v) => setNotif({ ...notif, alertasEmail: v })} />
                    <ToggleRow label="Notificações por SMS" hint="Podem aplicar-se custos de mensagens"
                      checked={notif.alertasSMS} onChange={(v) => setNotif({ ...notif, alertasSMS: v })} />
                  </div>
                </div>
                <SaveButton onClick={() => handleSave("notificacoes")} saved={saved.notificacoes} />
              </div>
            )}

            {activeTab === "utilizadores" && <TabUtilizadores />}

            {activeTab === "seguranca" && <TabSeguranca />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
