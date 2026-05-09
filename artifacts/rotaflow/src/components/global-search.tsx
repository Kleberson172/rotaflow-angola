import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, Package, Users, X, Loader2, ArrowRight, CheckCircle2, Clock, Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EntregaResult {
  id: number;
  codigo: string;
  destinatario: string;
  endereco: string;
  motorista: string;
  estado: string;
  prioridade: string;
}

interface MotoristaResult {
  id: number;
  codigo: string;
  nome: string;
  zona: string;
  veiculo: string;
  activo: boolean;
  entregasTotal: number;
  taxaSucesso: number;
}

interface SearchResults {
  entregas: EntregaResult[];
  motoristas: MotoristaResult[];
}

const ESTADO_CFG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  "Pendente":  { label: "Pendente",  color: "hsl(38 92% 40%)",  bg: "hsl(38 92% 95%)",  icon: Clock       },
  "Em Rota":   { label: "Em Rota",   color: "hsl(221 83% 45%)", bg: "hsl(221 83% 95%)", icon: Truck       },
  "Entregue":  { label: "Entregue",  color: "hsl(142 76% 30%)", bg: "hsl(142 76% 95%)", icon: CheckCircle2 },
};

function highlight(text: string, query: string) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded px-0.5" style={{ background: "hsl(221 83% 53% / 0.15)", color: "hsl(221 83% 45%)" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ entregas: [], motoristas: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, navigate] = useLocation();

  const total = results.entregas.length + results.motoristas.length;
  const flatResults = [
    ...results.entregas.map((e) => ({ type: "entrega" as const, item: e })),
    ...results.motoristas.map((m) => ({ type: "motorista" as const, item: m })),
  ];

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults({ entregas: [], motoristas: [] });
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("rf_token")}` },
      });
      const data: SearchResults = await res.json();
      setResults(data);
      setOpen(true);
      setActiveIdx(-1);
    } catch {
      setResults({ entregas: [], motoristas: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) {
      setResults({ entregas: [], motoristas: [] });
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(val), 280);
  };

  const handleSelect = (type: "entrega" | "motorista", item: EntregaResult | MotoristaResult) => {
    if (type === "entrega") navigate("/entregas");
    else navigate("/motoristas");
    setOpen(false);
    setQuery("");
    setResults({ entregas: [], motoristas: [] });
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      const sel = flatResults[activeIdx];
      if (sel) handleSelect(sel.type, sel.item);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function handleGlobal(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(query.length >= 2);
      }
    }
    document.addEventListener("keydown", handleGlobal);
    return () => document.removeEventListener("keydown", handleGlobal);
  }, [query]);

  const isEmpty = query.length >= 2 && !loading && total === 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm" data-testid="global-search">
      {/* Input */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200"
        style={{
          borderColor: focused ? "hsl(221 83% 53%)" : "hsl(214.3 31.8% 91.4%)",
          background: focused ? "white" : "hsl(210 40% 98%)",
          boxShadow: focused ? "0 0 0 3px hsl(221 83% 53% / 0.12)" : "none",
        }}
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "hsl(221 83% 53%)" }} />
          : <Search className="w-4 h-4 flex-shrink-0" style={{ color: focused ? "hsl(221 83% 53%)" : "hsl(215.4 16.3% 60%)" }} />
        }
        <input
          ref={inputRef}
          value={query}
          onChange={handleInput}
          onFocus={() => { setFocused(true); if (query.length >= 2) setOpen(true); }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Pesquisar entregas, motoristas..."
          data-testid="input-search"
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
          style={{ color: "hsl(222.2 84% 4.9%)" }}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {query && (
            <button onClick={() => { setQuery(""); setResults({ entregas: [], motoristas: [] }); setOpen(false); }}
              className="p-0.5 rounded hover:bg-slate-100 transition-colors">
              <X className="w-3.5 h-3.5" style={{ color: "hsl(215.4 16.3% 60%)" }} />
            </button>
          )}
          {!focused && (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border"
              style={{ borderColor: "hsl(214.3 31.8% 91.4%)", color: "hsl(215.4 16.3% 55%)", background: "white" }}>
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border shadow-xl z-50 overflow-hidden"
            style={{ borderColor: "hsl(214.3 31.8% 91.4%)", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
          >
            {isEmpty ? (
              <div className="py-10 text-center">
                <Search className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(214.3 31.8% 80%)" }} />
                <div className="text-sm" style={{ color: "hsl(215.4 16.3% 46.9%)" }}>
                  Sem resultados para <strong>"{query}"</strong>
                </div>
              </div>
            ) : (
              <div className="py-2 max-h-[420px] overflow-y-auto">

                {/* Entregas section */}
                {results.entregas.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2">
                      <Package className="w-3.5 h-3.5" style={{ color: "hsl(215.4 16.3% 55%)" }} />
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(215.4 16.3% 55%)" }}>
                        Entregas
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium ml-auto"
                        style={{ background: "hsl(221 83% 95%)", color: "hsl(221 83% 45%)" }}>
                        {results.entregas.length}
                      </span>
                    </div>
                    {results.entregas.map((e, i) => {
                      const cfg = ESTADO_CFG[e.estado] ?? ESTADO_CFG["Pendente"];
                      const Icon = cfg.icon;
                      const isActive = activeIdx === i;
                      return (
                        <button
                          key={e.id}
                          onClick={() => handleSelect("entrega", e)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group"
                          style={{ background: isActive ? "hsl(221 83% 53% / 0.06)" : "transparent" }}
                          onMouseEnter={() => setActiveIdx(i)}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: cfg.bg }}>
                            <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold font-mono" style={{ color: "hsl(221 83% 45%)" }}>
                                {highlight(e.codigo, query)}
                              </span>
                              {e.prioridade === "Urgente" && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                  style={{ background: "hsl(0 84.2% 95%)", color: "hsl(0 84.2% 45%)" }}>
                                  Urgente
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-medium truncate" style={{ color: "hsl(222.2 84% 4.9%)" }}>
                              {highlight(e.destinatario, query)}
                            </div>
                            <div className="text-xs truncate" style={{ color: "hsl(215.4 16.3% 55%)" }}>
                              {highlight(e.motorista, query)} · {e.endereco.slice(0, 40)}{e.endereco.length > 40 ? "…" : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: cfg.bg, color: cfg.color }}>
                              {cfg.label}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ color: "hsl(215.4 16.3% 55%)" }} />
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Separator */}
                {results.entregas.length > 0 && results.motoristas.length > 0 && (
                  <div className="my-2 mx-4 border-t" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }} />
                )}

                {/* Motoristas section */}
                {results.motoristas.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2">
                      <Users className="w-3.5 h-3.5" style={{ color: "hsl(215.4 16.3% 55%)" }} />
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(215.4 16.3% 55%)" }}>
                        Motoristas
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium ml-auto"
                        style={{ background: "hsl(142 76% 95%)", color: "hsl(142 76% 30%)" }}>
                        {results.motoristas.length}
                      </span>
                    </div>
                    {results.motoristas.map((m, i) => {
                      const flatIdx = results.entregas.length + i;
                      const isActive = activeIdx === flatIdx;
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleSelect("motorista", m)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group"
                          style={{ background: isActive ? "hsl(221 83% 53% / 0.06)" : "transparent" }}
                          onMouseEnter={() => setActiveIdx(flatIdx)}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: m.activo ? "hsl(221 83% 53%)" : "hsl(215.4 16.3% 65%)" }}>
                            {m.nome.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium" style={{ color: "hsl(222.2 84% 4.9%)" }}>
                                {highlight(m.nome, query)}
                              </span>
                              {!m.activo && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                  style={{ background: "hsl(0 84.2% 95%)", color: "hsl(0 84.2% 45%)" }}>
                                  Inactivo
                                </span>
                              )}
                            </div>
                            <div className="text-xs" style={{ color: "hsl(215.4 16.3% 55%)" }}>
                              {highlight(m.zona, query)} · {m.veiculo} · {m.entregasTotal} entregas · {m.taxaSucesso}% sucesso
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            style={{ color: "hsl(215.4 16.3% 55%)" }} />
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Footer hint */}
                <div className="border-t px-4 py-2.5 flex items-center gap-3" style={{ borderColor: "hsl(214.3 31.8% 91.4%)" }}>
                  <span className="text-xs" style={{ color: "hsl(215.4 16.3% 60%)" }}>
                    {total} resultado{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    {["↑↓ navegar", "↵ abrir", "Esc fechar"].map((hint) => (
                      <kbd key={hint} className="text-[10px] px-1.5 py-0.5 rounded border"
                        style={{ borderColor: "hsl(214.3 31.8% 91.4%)", color: "hsl(215.4 16.3% 55%)", background: "hsl(210 40% 98%)" }}>
                        {hint}
                      </kbd>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
