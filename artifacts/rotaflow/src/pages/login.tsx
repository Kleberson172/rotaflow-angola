import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Eye, EyeOff, AlertCircle, ShieldCheck, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type RoleMode = "administrador" | "entregador" | null;

const DEMO = {
  administrador: { email: "admin@rotaflow.ao", senha: "admin123" },
  entregador: { email: "antonio@rotaflow.ao", senha: "entrega123" },
};

export default function Login() {
  const [roleMode, setRoleMode] = useState<RoleMode>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const selectRole = (role: RoleMode) => {
    setRoleMode(role);
    setEmail("");
    setPassword("");
    setError("");
  };

  const fillDemo = () => {
    if (!roleMode) return;
    setEmail(DEMO[roleMode].email);
    setPassword(DEMO[roleMode].senha);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.papel === "entregador") {
        setLocation("/otimizador");
      } else {
        setLocation("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao iniciar sessão";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden" style={{ background: "hsl(222.2 84% 4.9%)" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full" style={{ background: "hsl(221 83% 53%)", filter: "blur(80px)" }} />
          <div className="absolute bottom-32 right-10 w-48 h-48 rounded-full" style={{ background: "hsl(142 76% 36%)", filter: "blur(60px)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full" style={{ background: "hsl(270 76% 45%)", filter: "blur(120px)", opacity: 0.3 }} />
        </div>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-3 relative z-10">
          <div className="p-2.5 rounded-xl" style={{ background: "hsl(221 83% 53%)" }}>
            <Truck className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">RotaFlow Angola</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Gestão de Entregas<br />
            <span style={{ color: "hsl(142 76% 50%)" }}>Inteligente</span>
          </h2>
          <p className="text-lg mb-10" style={{ color: "hsl(210 40% 70%)" }}>
            Controle rotas, motoristas e entregas com optimização de combustível em tempo real.
          </p>

          <div className="space-y-4">
            {[
              { icon: ShieldCheck, title: "Administrador", desc: "Gestão completa: entregas, motoristas, relatórios e configurações", color: "hsl(221 83% 53%)" },
              { icon: Navigation, title: "Entregador", desc: "Optimizador de rota inteligente com poupança de combustível", color: "hsl(142 76% 42%)" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}20` }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{item.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: "hsl(210 40% 60%)" }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-sm relative z-10" style={{ color: "hsl(210 40% 45%)" }}>
          © 2026 RotaFlow Angola. Todos os direitos reservados.
        </motion.p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="p-2 rounded-xl" style={{ background: "hsl(221 83% 53%)" }}>
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: "hsl(222.2 84% 4.9%)" }}>RotaFlow Angola</span>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-1" style={{ color: "hsl(222.2 84% 4.9%)" }}>Bem-vindo</h1>
            <p style={{ color: "hsl(215.4 16.3% 46.9%)" }}>Seleccione o seu perfil para continuar</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { role: "administrador" as RoleMode, icon: ShieldCheck, label: "Administrador", desc: "Gestão total", color: "hsl(221 83% 53%)", bg: "hsl(221 83% 95%)" },
              { role: "entregador" as RoleMode, icon: Navigation, label: "Entregador", desc: "Rota optimizada", color: "hsl(142 76% 30%)", bg: "hsl(142 76% 95%)" },
            ].map((opt) => (
              <button
                key={opt.role}
                onClick={() => selectRole(opt.role)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200 text-center"
                style={
                  roleMode === opt.role
                    ? { borderColor: opt.color, background: opt.bg }
                    : { borderColor: "hsl(214.3 31.8% 91.4%)", background: "white" }
                }
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: roleMode === opt.role ? opt.color : "hsl(210 40% 96.1%)" }}>
                  <opt.icon className="w-5 h-5" style={{ color: roleMode === opt.role ? "white" : "hsl(215.4 16.3% 46.9%)" }} />
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: roleMode === opt.role ? opt.color : "hsl(222.2 84% 4.9%)" }}>{opt.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {roleMode && (
              <motion.div key={roleMode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium" style={{ color: "hsl(222.2 47.4% 11.2%)" }}>Email</Label>
                    <Input id="email" data-testid="input-email" type="email" placeholder={`${roleMode}@rotaflow.ao`} value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium" style={{ color: "hsl(222.2 47.4% 11.2%)" }}>Senha</Label>
                    <div className="relative">
                      <Input id="password" data-testid="input-password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-lg text-sm" style={{ background: "hsl(0 84.2% 60.2% / 0.08)", color: "hsl(0 84.2% 45%)" }}>
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  <Button type="submit" data-testid="button-login" disabled={loading} className="w-full h-11 text-sm font-medium text-white" style={{ background: roleMode === "administrador" ? "hsl(221 83% 53%)" : "hsl(142 76% 36%)" }}>
                    {loading ? "A entrar..." : `Entrar como ${roleMode === "administrador" ? "Administrador" : "Entregador"}`}
                  </Button>
                </form>

                <button onClick={fillDemo} className="w-full mt-4 p-3 rounded-xl text-sm text-left transition-colors hover:opacity-80" style={{ background: "hsl(210 40% 96.1%)", color: "hsl(215.4 16.3% 46.9%)" }}>
                  <span className="font-medium block mb-0.5" style={{ color: "hsl(222.2 47.4% 11.2%)" }}>Credenciais de demonstração</span>
                  {roleMode === "administrador" ? (
                    <><span>Email: <span className="font-mono">admin@rotaflow.ao</span></span><br /><span>Senha: <span className="font-mono">admin123</span></span></>
                  ) : (
                    <><span>Email: <span className="font-mono">antonio@rotaflow.ao</span></span><br /><span>Senha: <span className="font-mono">entrega123</span></span><br /><span className="text-xs mt-1 block" style={{ color: "hsl(215.4 16.3% 55%)" }}>Clicar para preencher automaticamente</span></>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!roleMode && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm mt-2" style={{ color: "hsl(215.4 16.3% 60%)" }}>
              Seleccione um perfil acima para ver as opções de acesso
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
