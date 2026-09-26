// Tipos de domínio da Visão Unificada Algar

export type AppRole = "admin" | "gestor" | "viewer";

export interface Gestor {
  id: string;
  nome: string;
  id_gestor: string; // texto — origem externa
  email?: string | null;
  telefone?: string | null;
  criado_em?: string;
  atualizado_em?: string;
}

export interface Parceiro {
  id: string;
  gestor_id?: string | null;
  nome_parceiro: string;
  id_gestor?: string | null;
  id_parceiro: string;
  cpf_cnpj?: string | null;
  razao_social?: string | null;
  url_vonix: string;
  ativo: boolean;
  criado_em?: string;
  atualizado_em?: string;
  // token_api NUNCA trafega para o client
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: AppRole;
}

// Status possíveis de um agente (padrão de cores VonixCC)
export type AgenteStatus =
  | "atendimento" // Amarelo
  | "disponivel" // Verde
  | "pausa" // Rosa
  | "offline"; // Cinza

export const STATUS_META: Record<
  AgenteStatus,
  { label: string; color: string }
> = {
  atendimento: { label: "Em Atendimento", color: "#F5C518" },
  disponivel: { label: "Disponível", color: "#22C55E" },
  pausa: { label: "Em Pausa", color: "#EC4899" },
  offline: { label: "Offline", color: "#6B7280" },
};

export type StatusDiscador = "ativo" | "pausado" | "parado" | "desconhecido";

export interface AgenteAoVivo {
  id: string;
  nome: string;
  status: AgenteStatus;
  ramal?: string;
}

// Uma linha do dashboard = 1 servidor Vonix de 1 parceiro
export interface LinhaDashboard {
  parceiroId: string;
  nomeParceiro: string;
  gestor?: string | null;
  urlVonix: string;
  online: boolean; // servidor respondeu?
  statusDiscador: StatusDiscador;
  contatosNaFila: number;
  agentesLogados: number;
  // Distribuição por status (para a colméia e contadores)
  agentes: AgenteAoVivo[];
  contadores: Record<AgenteStatus, number>;
  // Métricas candidatas (a confirmar na doc da API):
  chamadasAtivas?: number;
  tmaSegundos?: number;
  taxaOcupacao?: number; // 0..1
  atualizadoEm: string;
  erro?: string | null;
}
