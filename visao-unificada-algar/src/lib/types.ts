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
  // Identificador do cliente na plataforma Vonix (subdomínio).
  // A base da API é https://{customer}.api.vonixcc.com.br
  customer: string;
  // URL do painel Vonix (opcional, apenas link de referência)
  url_vonix?: string | null;
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
  atendimento: { label: "Em Atendimento", color: "#E5E0C5" }, // amarelo pastel
  disponivel: { label: "Disponível", color: "#C6E5C5" }, // verde pastel
  pausa: { label: "Em Pausa", color: "#E5C5C6" }, // rosa pastel
  offline: { label: "Offline", color: "#6B7280" },
};

export type StatusDiscador = "ativo" | "pausado" | "parado" | "desconhecido";

// Origem do roster de agentes ao vivo (colméia + nº logados).
// As APIs contatos-discador/agentes-pabx NÃO expõem esse roster; ele virá
// de uma fonte realtime/supervisão a definir. Enquanto isso: "mock" (demo)
// ou "pendente" (dados reais de fila/discador, agentes ainda sem fonte).
export type FonteAgentes = "realtime" | "mock" | "pendente";

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
  // Detalhe das filas do parceiro (da API contatos-discador)
  filas?: Array<{ id: string; nome?: string; status: StatusDiscador; contatos: number }>;
  fonteAgentes: FonteAgentes;
  atualizadoEm: string;
  erro?: string | null;
}
