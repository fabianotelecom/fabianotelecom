import type {
  AgenteAoVivo,
  AgenteStatus,
  LinhaDashboard,
  StatusDiscador,
} from "@/lib/types";

/**
 * Cliente das APIs Vonix por servidor de parceiro.
 *
 * ATENÇÃO: os endpoints/campos abaixo são um MAPA PROVISÓRIO baseado no
 * padrão das APIs Vonix (contatos-discador / agentes-pabx). Os caminhos e
 * nomes de campos exatos devem ser confirmados na documentação:
 *   - https://sandbox.vonixcc.com.br/v1/api-docs/contatos-discador
 *   - https://sandbox.vonixcc.com.br/v1/api-docs/agentes-pabx
 *
 * Ao confirmar, ajuste apenas os pontos marcados com  // TODO: confirmar
 * — o restante do app (dashboard, colméia) consome o tipo LinhaDashboard
 * e não muda.
 */

const TIMEOUT = Number(process.env.VONIX_API_TIMEOUT_MS ?? 8000);

interface VonixCtx {
  baseUrl: string; // url_vonix do parceiro
  token: string; // token de API (já descriptografado, server-side)
}

async function vonixFetch<T>(
  ctx: VonixCtx,
  path: string,
): Promise<T> {
  const url = new URL(path, ctx.baseUrl).toString();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: {
        // TODO: confirmar esquema de auth (Bearer x-api-token etc.)
        Authorization: `Bearer ${ctx.token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Vonix ${res.status} em ${path}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

// Normaliza um status textual da API para o nosso enum de status.
function normalizarStatus(raw?: string): AgenteStatus {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("atend") || s.includes("busy") || s.includes("call"))
    return "atendimento";
  if (s.includes("dispon") || s.includes("ready") || s.includes("idle"))
    return "disponivel";
  if (s.includes("paus") || s.includes("break") || s.includes("acw"))
    return "pausa";
  return "offline";
}

function normalizarStatusDiscador(raw?: string): StatusDiscador {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("ativ") || s.includes("run") || s.includes("on"))
    return "ativo";
  if (s.includes("paus")) return "pausado";
  if (s.includes("par") || s.includes("stop") || s.includes("off"))
    return "parado";
  return "desconhecido";
}

// ---- Formas de resposta ESPERADAS (a confirmar) ----
interface DiscadorResp {
  status?: string; // TODO: confirmar
  contatosNaFila?: number; // TODO: confirmar
  chamadasAtivas?: number;
}
interface AgentesResp {
  agentes?: Array<{
    id?: string | number;
    nome?: string;
    status?: string;
    ramal?: string;
  }>;
}

/**
 * Coleta o estado ao vivo de UM servidor Vonix e devolve a linha do dashboard.
 * Sempre resolve (nunca lança) — em erro, marca online=false e preenche `erro`.
 */
export async function coletarLinha(params: {
  parceiroId: string;
  nomeParceiro: string;
  gestor?: string | null;
  baseUrl: string;
  token: string;
}): Promise<LinhaDashboard> {
  const ctx: VonixCtx = { baseUrl: params.baseUrl, token: params.token };
  const base = (): LinhaDashboard => ({
    parceiroId: params.parceiroId,
    nomeParceiro: params.nomeParceiro,
    gestor: params.gestor ?? null,
    urlVonix: params.baseUrl,
    online: false,
    statusDiscador: "desconhecido",
    contatosNaFila: 0,
    agentesLogados: 0,
    agentes: [],
    contadores: { atendimento: 0, disponivel: 0, pausa: 0, offline: 0 },
    atualizadoEm: new Date().toISOString(),
    erro: null,
  });

  try {
    // TODO: confirmar caminhos reais dos endpoints
    const [disc, ag] = await Promise.all([
      vonixFetch<DiscadorResp>(ctx, "/v1/contatos-discador"),
      vonixFetch<AgentesResp>(ctx, "/v1/agentes-pabx"),
    ]);

    const agentes: AgenteAoVivo[] = (ag.agentes ?? []).map((a, i) => ({
      id: String(a.id ?? i),
      nome: a.nome ?? `Agente ${i + 1}`,
      status: normalizarStatus(a.status),
      ramal: a.ramal,
    }));

    const contadores = agentes.reduce(
      (acc, a) => {
        acc[a.status] += 1;
        return acc;
      },
      { atendimento: 0, disponivel: 0, pausa: 0, offline: 0 } as Record<
        AgenteStatus,
        number
      >,
    );

    const linha = base();
    linha.online = true;
    linha.statusDiscador = normalizarStatusDiscador(disc.status);
    linha.contatosNaFila = disc.contatosNaFila ?? 0;
    linha.chamadasAtivas = disc.chamadasAtivas;
    linha.agentes = agentes;
    linha.contadores = contadores;
    linha.agentesLogados =
      contadores.atendimento + contadores.disponivel + contadores.pausa;
    return linha;
  } catch (err) {
    const linha = base();
    linha.erro = err instanceof Error ? err.message : "Falha ao consultar servidor";
    return linha;
  }
}
