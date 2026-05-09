const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("rf_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(body.error || `Erro ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (email: string, senha: string) =>
      request<{ token: string; utilizador: { id: number; nome: string; email: string; papel: string; motoristaNome: string | null } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, senha }),
      }),
    me: () =>
      request<{ id: number; nome: string; email: string; papel: string; motoristaNome: string | null }>("/auth/me"),
    changePassword: (senhaAtual: string, novaSenha: string) =>
      request<{ success: boolean }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ senhaAtual, novaSenha }),
      }),
  },

  entregas: {
    list: () => request<Entrega[]>("/entregas"),
    create: (data: CreateEntregaInput) =>
      request<Entrega>("/entregas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Entrega>) =>
      request<Entrega>(`/entregas/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/entregas/${id}`, { method: "DELETE" }),
  },

  motoristas: {
    list: () => request<Motorista[]>("/motoristas"),
    listNomes: () => request<{ nome: string; activo: boolean }[]>("/motoristas/lista-nomes"),
    create: (data: CreateMotoristaInput) =>
      request<Motorista>("/motoristas", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Motorista>) =>
      request<Motorista>(`/motoristas/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/motoristas/${id}`, { method: "DELETE" }),
  },

  utilizadores: {
    list: () => request<UtilizadorPublico[]>("/utilizadores"),
    create: (data: CreateUtilizadorInput) =>
      request<UtilizadorPublico>("/utilizadores", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<UpdateUtilizadorInput>) =>
      request<UtilizadorPublico>(`/utilizadores/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<{ success: boolean }>(`/utilizadores/${id}`, { method: "DELETE" }),
  },

  relatorios: {
    stats: () => request<RelatoriosStats>("/relatorios/stats"),
  },

  notificacoes: {
    list: () => request<Notificacao[]>("/notificacoes"),
    naoLidas: () => request<{ count: number }>("/notificacoes/nao-lidas"),
    marcarLida: (id: number) =>
      request<Notificacao>(`/notificacoes/${id}/ler`, { method: "PATCH" }),
    marcarTodasLidas: () =>
      request<{ success: boolean }>("/notificacoes/ler-todas", { method: "PATCH" }),
    eliminar: (id: number) =>
      request<{ success: boolean }>(`/notificacoes/${id}`, { method: "DELETE" }),
  },
};

export interface Entrega {
  id: number;
  codigo: string;
  destinatario: string;
  telefone: string;
  endereco: string;
  motorista: string;
  estado: "Pendente" | "Em Rota" | "Entregue";
  prioridade: "Normal" | "Urgente";
  lat: number;
  lng: number;
  criadoEm: string;
}

export interface CreateEntregaInput {
  destinatario: string;
  telefone?: string;
  endereco: string;
  motorista: string;
  prioridade?: "Normal" | "Urgente";
  lat?: number;
  lng?: number;
}

export interface Motorista {
  id: number;
  codigo: string;
  nome: string;
  telefone: string;
  zona: string;
  veiculo: string;
  activo: boolean;
  entregasTotal: number;
  taxaSucesso: number;
  criadoEm: string;
}

export interface CreateMotoristaInput {
  nome: string;
  telefone: string;
  zona?: string;
  veiculo?: string;
}

export interface UtilizadorPublico {
  id: number;
  nome: string;
  email: string;
  papel: string;
  motoristaNome: string | null;
  activo: boolean;
  criadoEm: string;
}

export interface CreateUtilizadorInput {
  nome: string;
  email: string;
  senha: string;
  papel: string;
  motoristaNome?: string;
}

export interface UpdateUtilizadorInput {
  nome: string;
  email: string;
  papel: string;
  motoristaNome: string | null;
  activo: boolean;
}

export interface Notificacao {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  destinatario: string;
  motoristaId: number | null;
  entregaId: number | null;
  lida: boolean;
  criadoEm: string;
}

export interface CombustivelMotorista {
  nome: string;
  entregasTotal: number;
  kmTotal: number;
  kmPoupados: number;
  litrosPoupados: number;
  kzPoupados: number;
  percentagemPoupanca: number;
}

export interface RelatoriosStats {
  kpis: {
    totalMes: number;
    variacaoMes: number;
    taxaSucesso: number;
    totalEntregas: number;
    pendentes: number;
    emRota: number;
    entregues: number;
    totalMotoristas: number;
    motoristasActivos: number;
  };
  desempenhoMensal: { mes: string; entregues: number; pendentes: number; emRota: number }[];
  entregasPorZona: { zona: string; value: number; color: string }[];
  taxaSucessoMotoristas: { nome: string; taxa: number; total: number }[];
  tendenciaDiaria: { hora: string; entregas: number }[];
  picoHora: { hora: string; entregas: number };
  combustivel: {
    porMotorista: CombustivelMotorista[];
    totalKzPoupados: number;
    totalLitrosPoupados: number;
    totalKmPoupados: number;
    percentagemMedia: number;
  };
}
