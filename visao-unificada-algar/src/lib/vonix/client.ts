import { XMLParser } from "fast-xml-parser";
import type {
  AgenteAoVivo,
  AgenteStatus,
  FonteAgentes,
  LinhaDashboard,
  StatusDiscador,
} from "@/lib/types";

/**
 * Cliente das APIs Vonix por parceiro.
 *
 * Base da API (confirmado nas specs OpenAPI):
 *   https://{customer}.api.vonixcc.com.br
 * Autenticação: header `Authorization: <token>` (token cru).
 *
 * Endpoints usados (API contatos-discador):
 *   GET /v1/queues                    -> lista de filas (JSON)
 *   GET /v1/queue/{queueId}/status    -> status da fila (XML):
 *        <queue id="..."><status/><stored_contacts/><last_feed/></queue>
 *
 * Roster de agentes ao vivo (colméia + nº logados): a API agentes-pabx é de
 * comando (login/pause/dial/status por agente) e NÃO lista os agentes logados.
 * Esse roster virá de uma fonte realtime/supervisão a definir — ver getRoster.
 */

const TIMEOUT = Number(process.env.VONIX_API_TIMEOUT_MS ?? 8000);

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: true,
});

interface VonixCtx {
  customer: string;
  token: string;
}

export function buildBaseUrl(customer: string): string {
  // Aceita tanto o identificador puro ("sandbox") quanto uma URL completa.
  if (/^https?:\/\//i.test(customer)) return customer.replace(/\/+$/, "");
  return `https://${customer}.api.vonixcc.com.br`;
}

async function vonixFetch(
  ctx: VonixCtx,
  path: string,
  accept: string,
): Promise<Response> {
  const url = `${buildBaseUrl(ctx.customer)}${path}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    return await fetch(url, {
      headers: { Authorization: ctx.token, Accept: accept },
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(t);
  }
}

function normalizarStatusDiscador(raw?: string): StatusDiscador {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("dial") || s.includes("run") || s.includes("ativ") || s.includes("on"))
    return "ativo";
  if (s.includes("paus")) return "pausado";
  if (s.includes("stop") || s.includes("par") || s.includes("idle") || s.includes("off"))
    return "parado";
  return "desconhecido";
}

interface FilaInfo {
  id: string;
  nome?: string;
  status: StatusDiscador;
  contatos: number;
}

// GET /v1/queues -> tolera múltiplos formatos de resposta.
async function getQueues(ctx: VonixCtx): Promise<Array<{ id: string; nome?: string }>> {
  const res = await vonixFetch(ctx, "/v1/queues", "application/json");
  if (!res.ok) throw new Error(`GET /v1/queues -> ${res.status}`);
  const body = await res.json();
  // Formatos possíveis: {queues:[...]}, {queue:{...}}, {queue:[...]}, [...]
  const raw =
    (Array.isArray(body) && body) ||
    body?.queues ||
    body?.queue ||
    body?.queues?.queue ||
    [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter(Boolean)
    .map((q: Record<string, unknown>) => ({
      id: String(q.id ?? q["@_id"] ?? ""),
      nome: (q.name ?? q.description) as string | undefined,
    }))
    .filter((q) => q.id);
}

// GET /v1/queue/{id}/status -> XML
async function getQueueStatus(ctx: VonixCtx, queueId: string): Promise<FilaInfo> {
  const res = await vonixFetch(
    ctx,
    `/v1/queue/${encodeURIComponent(queueId)}/status`,
    "application/xml",
  );
  if (!res.ok) throw new Error(`GET /v1/queue/${queueId}/status -> ${res.status}`);
  const text = await res.text();
  const parsed = xml.parse(text);
  const q = parsed?.queue ?? parsed ?? {};
  return {
    id: String(q["@_id"] ?? queueId),
    status: normalizarStatusDiscador(q.status),
    contatos: Number(q.stored_contacts ?? 0) || 0,
  };
}

/**
 * Roster de agentes ao vivo. Fonte a definir (realtime/supervisão).
 * Retorna null enquanto a fonte não estiver ligada -> a linha marca
 * fonteAgentes = "pendente".
 */
async function getRoster(_ctx: VonixCtx): Promise<AgenteAoVivo[] | null> {
  // TODO: integrar quando a API/realtime de agentes for definida pelo Vonix.
  return null;
}

function contar(agentes: AgenteAoVivo[]): Record<AgenteStatus, number> {
  return agentes.reduce(
    (acc, a) => {
      acc[a.status] += 1;
      return acc;
    },
    { atendimento: 0, disponivel: 0, pausa: 0, offline: 0 } as Record<
      AgenteStatus,
      number
    >,
  );
}

// Agrega o estado do discador a partir das filas do parceiro.
function agregarStatusDiscador(filas: FilaInfo[]): StatusDiscador {
  if (filas.length === 0) return "desconhecido";
  if (filas.some((f) => f.status === "ativo")) return "ativo";
  if (filas.every((f) => f.status === "pausado")) return "pausado";
  if (filas.every((f) => f.status === "parado")) return "parado";
  return "pausado";
}

/**
 * Coleta o estado ao vivo de UM parceiro Vonix. Sempre resolve (nunca lança).
 */
export async function coletarLinha(params: {
  parceiroId: string;
  nomeParceiro: string;
  gestor?: string | null;
  customer: string;
  token: string;
}): Promise<LinhaDashboard> {
  const ctx: VonixCtx = { customer: params.customer, token: params.token };
  const base = (): LinhaDashboard => ({
    parceiroId: params.parceiroId,
    nomeParceiro: params.nomeParceiro,
    gestor: params.gestor ?? null,
    urlVonix: buildBaseUrl(params.customer),
    online: false,
    statusDiscador: "desconhecido",
    contatosNaFila: 0,
    agentesLogados: 0,
    agentes: [],
    contadores: { atendimento: 0, disponivel: 0, pausa: 0, offline: 0 },
    filas: [],
    fonteAgentes: "pendente" as FonteAgentes,
    atualizadoEm: new Date().toISOString(),
    erro: null,
  });

  try {
    const queues = await getQueues(ctx);
    const filas = await Promise.all(
      queues.map(async (q) => {
        try {
          const st = await getQueueStatus(ctx, q.id);
          return { ...st, nome: q.nome } as FilaInfo;
        } catch {
          return { id: q.id, nome: q.nome, status: "desconhecido", contatos: 0 } as FilaInfo;
        }
      }),
    );

    const linha = base();
    linha.online = true;
    linha.filas = filas;
    linha.contatosNaFila = filas.reduce((s, f) => s + f.contatos, 0);
    linha.statusDiscador = agregarStatusDiscador(filas);

    const roster = await getRoster(ctx);
    if (roster) {
      linha.agentes = roster;
      linha.contadores = contar(roster);
      linha.agentesLogados =
        linha.contadores.atendimento +
        linha.contadores.disponivel +
        linha.contadores.pausa;
      linha.fonteAgentes = "realtime";
    } else {
      linha.fonteAgentes = "pendente";
    }
    return linha;
  } catch (err) {
    const linha = base();
    linha.erro = err instanceof Error ? err.message : "Falha ao consultar o servidor Vonix";
    return linha;
  }
}
