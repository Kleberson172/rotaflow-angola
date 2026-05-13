import { useState, useRef, useEffect, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Notificacao } from "@/lib/api";
import {
  LayoutDashboard, Package, Users, BarChart3, Settings, Truck,
  LogOut, Menu, X, Bell, Route, Navigation, CheckCheck, Trash2,
  Info, CheckCircle2, AlertTriangle, Zap, Package2, Map, History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GlobalSearch from "./global-search";

const adminNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/entregas", icon: Package, label: "Entregas" },
  { href: "/motoristas", icon: Users, label: "Motoristas" },
  { href: "/otimizador", icon: Route, label: "Optimizador" },
  { href: "/mapa", icon: Map, label: "Mapa ao Vivo" },
  { href: "/historico-rotas", icon: History, label: "Histórico Rotas" },
  { href: "/relatorios", icon: BarChart3, label: "Relatórios" },
  { href: "/configuracoes", icon: Settings, label: "Configurações" },
];

const entregadorNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Início" },
  { href: "/otimizador", icon: Navigation, label: "Minha Rota" },
];

const tipoConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info:     { icon: Info,          color: "hsl(221 83% 53%)",  bg: "hsl(221 83% 95%)"  },
  sucesso:  { icon: CheckCircle2,  color: "hsl(142 76% 30%)",  bg: "hsl(142 76% 95%)"  },
  aviso:    { icon: AlertTriangle, color: "hsl(38 92% 40%)",   bg: "hsl(38 92% 95%)"   },
  urgente:  { icon: Zap,           color: "hsl(0 84.2% 45%)",  bg: "hsl(0 84.2% 95%)"  },
};

const destinatarioConfig: Record<string, { label: string; color: string; bg: string }> = {
  empresa:   { label: "Empresa",   color: "hsl(221 83% 45%)", bg: "hsl(221 83% 95%)" },
  cliente:   { label: "Cliente",   color: "hsl(270 76% 45%)", bg: "hsl(270 76% 95%)" },
  motorista: { label: "Motorista", color: "hsl(142 76% 30%)", bg: "hsl(142 76% 95%)" },
};

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: api.notificacoes.list,
  });

  const marcarLidaMutation = useMutation({
    mutationFn: api.notificacoes.marcarLida,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificacoes"] });
      qc.invalidateQueries({ queryKey: ["notificacoes-count"] });
    },
  });

  const marcarTodasMutation = useMutation({
    mutationFn: api.notificacoes.marcarTodasLidas,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificacoes"] });
      qc.invalidateQueries({ queryKey: ["notificacoes-count"] });
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: api.notificacoes.eliminar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notificacoes"] });
      qc.invalidateQueries({ queryKey: ["notificacoes-count"] });
    },
  });

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-xl border z-50 overflow-hidden"
      style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
        <div>
          <span className="text-sm font-semibold" style={{ color: "hsl(222.2 84% 4.9%)" }}>Notificações</span>
          {naoLidas > 0 && (
            <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "hsl(221 83% 95%)", color: "hsl(221 83% 45%)" }}>
              {naoLidas} novas
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {naoLidas > 0 && (
            <button onClick={() => marcarTodasMutation.mutate()} disabled={marcarTodasMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-slate-50"
              style={{ color: "hsl(221 83% 53%)" }} title="Marcar todas como lidas">
              <CheckCheck className="w-3.5 h-3.5" />Ler todas
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[480px]">
        {isLoading && (
          <div className="py-12 text-center text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>A carregar...</div>
        )}
        {!isLoading && notificacoes.length === 0 && (
          <div className="py-12 text-center">
            <Package2 className="w-10 h-10 mx-auto mb-3" style={{ color: "hsl(214.3 31.8% 80%)" }} />
            <div className="text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Sem notificações</div>
          </div>
        )}
        {notificacoes.map((n) => {
          const tipo = tipoConfig[n.tipo] ?? tipoConfig.info;
          const TipoIcon = tipo.icon;
          const dest = destinatarioConfig[n.destinatario] ?? destinatarioConfig.empresa;
          return (
            <div key={n.id}
              className="flex items-start gap-3 px-5 py-4 border-b transition-colors hover:bg-slate-50"
              style={{ borderColor: "hsl(214.3 31.8% 91.4%)", background: n.lida ? "transparent" : "hsl(221 83% 98%)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: tipo.bg }}>
                <TipoIcon className="w-4 h-4" style={{ color: tipo.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-semibold" style={{ color: "hsl(222.2 84% 4.9%)" }}>{n.titulo}</div>
                  {!n.lida && (
                    <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: "hsl(221 83% 53%)" }} />
                  )}
                </div>
                <div className="text-xs mt-0.5 leading-relaxed" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{n.mensagem}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: dest.bg, color: dest.color }}>
                    {dest.label}
                  </span>
                  <span className="text-xs" style={{ color: "hsl(215.4 16.3% 60%)" }}>
                    {new Date(n.criadoEm).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                {!n.lida && (
                  <button onClick={() => marcarLidaMutation.mutate(n.id)}
                    className="p-1 rounded hover:bg-slate-100 transition-colors" style={{ color: "hsl(221 83% 53%)" }} title="Marcar como lida">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => eliminarMutation.mutate(n.id)}
                  className="p-1 rounded hover:bg-red-50 transition-colors" style={{ color: "hsl(0 84.2% 60%)" }} title="Eliminar">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const { logout, user, isEntregador } = useAuth();
  const [, setLocation] = useLocation();

  const navItems = isEntregador ? entregadorNavItems : adminNavItems;

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const initials = user?.nome
    ? user.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  return (
    <div className="flex flex-col h-full w-64" style={{ background: "hsl(222.2 84% 4.9%)" }}>
      <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: "hsl(221 83% 53%)" }}>
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">RotaFlow</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-white/50 hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg flex items-center gap-2"
        style={{ background: isEntregador ? "hsl(142 76% 36% / 0.15)" : "hsl(221 83% 53% / 0.12)" }}>
        {isEntregador ? (
          <Navigation className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(142 76% 60%)" }} />
        ) : (
          <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(221 83% 70%)" }} />
        )}
        <span className="text-xs font-semibold"
          style={{ color: isEntregador ? "hsl(142 76% 60%)" : "hsl(221 83% 70%)" }}>
          {isEntregador ? "Entregador" : "Administrador"}
        </span>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const active = location === item.href || (item.href === "/dashboard" && location === "/");
          return (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-150"
                style={{
                  background: active ? "hsl(221 83% 53% / 0.2)" : "transparent",
                  color: active ? "hsl(221 83% 70%)" : "hsl(210 40% 55%)",
                  borderLeft: active ? "2px solid hsl(221 83% 53%)" : "2px solid transparent",
                }}>
                <item.icon className="flex-shrink-0" style={{ width: 18, height: 18 }} />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg mb-2" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: isEntregador ? "hsl(142 76% 36%)" : "hsl(221 83% 53%)" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{user?.nome ?? "Utilizador"}</div>
            <div className="text-xs truncate" style={{ color: "hsl(210 40% 45%)" }}>{user?.email}</div>
          </div>
        </div>
        <button onClick={handleLogout} data-testid="button-logout"
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm transition-all duration-150 hover:bg-white/5"
          style={{ color: "hsl(210 40% 50%)" }}>
          <LogOut className="w-4 h-4" />
          Terminar Sessão
        </button>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notificacoes-count"],
    queryFn: api.notificacoes.naoLidas,
    refetchInterval: 15000,
  });

  const naoLidas = countData?.count ?? 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "hsl(210 40% 98%)" }}>
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
            <motion.div initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed left-0 top-0 bottom-0 z-50 lg:hidden">
              <Sidebar onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-3 border-b bg-white flex-shrink-0"
          style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
          <button onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0" data-testid="button-menu">
            <Menu className="w-5 h-5" style={{ color: "hsl(222.2 84% 4.9%)" }} />
          </button>
          <div className="flex-1 hidden lg:flex justify-center">
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div ref={notifRef} className="relative">
              <button
                data-testid="button-notifications"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  if (!notifOpen) qc.invalidateQueries({ queryKey: ["notificacoes"] });
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
              >
                <Bell className="w-5 h-5" style={{ color: "hsl(215.4 16.3% 46.9%)" }} />
                {naoLidas > 0 && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[10px] font-bold px-1"
                    style={{ background: "hsl(0 84.2% 55%)" }}>
                    {naoLidas > 99 ? "99+" : naoLidas}
                  </motion.span>
                )}
              </button>
              <AnimatePresence>
                {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
