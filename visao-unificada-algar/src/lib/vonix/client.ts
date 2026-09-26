import { XMLParser } from "fast-xml-parser";
import type {
  AgenteAoVivo,
  AgenteStatus,
  FonteAgentes,
  LinhaDashboard,
  StatusDiscador,
} from "@/lib/types";

/**
 * Cliente das APIs Vonix por parceiro. Validado contra o sandbox.
 *
 * Base:  https://{customer}.api.vonixcc.com.br
 * Auth:  header `Authorization: Bearer <token>`
 *
 * Endpoints usados:
 *   GET /agents                     (JSON) -> lista de agentes com status ao vivo
 *   GET /v1/queues                  (XML)  -> filas do token
 *   GET /v1/queue/{queueId}/status  (XML)  -> status/stored_contacts/total_contacts
 *
 * O /agents já traz `status` (ONLINE/PAUSED/OFFLINE), `talkingCallId`,
 * `pauseAt` e `loginExtension` — o roster da colméia sai de UMA chamada.
 */

const TIMEOUT = Number(process.env.VONIX_API_TIMEOUT_MS ?? 8000);
// Teto de filas cujo status é consultado por ciclo (proteção). Em produção,
// o token do parceiro costuma expor poucas filas; o sandbox tem ~133.
const MAX_QUEUE_STATUS = Number(process.env.VONIX_MAX_QUEUE_STATUS ?? 150);
const QUEUE_CONCURRENCY = 8;

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
  if (/^https?:\/\//i.test(customer)) return customer.replace(/\/+$/, "");
  return `https://${customer}.api.vonixcc.com.br`;
}

async function vonixFetch(ctx: VonixCtx, path: string, accept: string): Promise<Response> {
  const url = `${buildBaseUrl(ctx.customer)}${path}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    return await fetch(url, {
      headers: { Authorization: `Bearer ${ctx.token}`, Accept: accept },
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(t);
  }
}

// Executa tarefas com limite de concorrência.
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// ---------------------------------------------------------------------------
// Filas / Discador (API contatos-discador) — respostas em XML
// ---------------------------------------------------------------------------

// status textual da fila (pt-BR): "Discando", "Em pausa", "Parada"...
function normalizarStatusDiscador(raw?: string): StatusDiscador {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("paus")) return "pausado";
  if (s.includes("disc") || s.includes("ativ") || s.includes("run") || s.includes("aberta"))
    return "ativo";
  if (
    s.includes("par") ||
    s.includes("stop") ||
    s.includes("fech") ||
    s.includes("encerr") ||
    s.includes("fora de hor") || // "Fora de horário"
    s.includes("off")
  )
    return "parado";
  return "desconhecido";
}

interface FilaInfo {
  id: string;
  nome?: string;
  status: StatusDiscador;
  contatos: number; // stored_contacts (na fila para discar)
  total?: number; // total_contacts
}

async function getQueues(ctx: VonixCtx): Promise<Array<{ id: string; nome?: string }>> {
  const res = await vonixFetch(ctx, "/v1/queues", "application/xml");
  if (!res.ok) throw new Error(`GET /v1/queues -> ${res.status}`);
  const parsed = xml.parse(await res.text());
  const raw = parsed?.queues?.queue ?? parsed?.queue ?? [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter(Boolean)
    .map((q: Record<string, any>) => ({
      id: String(q["@_id"] ?? q.id ?? ""),
      nome: q.name ?? q.description,
    }))
    .filter((q) => q.id);
}

async function getQueueStatus(ctx: VonixCtx, queueId: string, nome?: string): Promise<FilaInfo> {
  const res = await vonixFetch(ctx, `/v1/queue/${encodeURIComponent(queueId)}/status`, "application/xml");
  if (!res.ok) throw new Error(`GET /v1/queue/${queueId}/status -> ${res.status}`);
  const parsed = xml.parse(await res.text());
  const q = parsed?.queue ?? parsed ?? {};
  return {
    id: String(q["@_id"] ?? queueId),
    nome,
    status: normalizarStatusDiscador(q.status),
    contatos: Number(q.stored_contacts ?? 0) || 0,
    total: q.total_contacts != null ? Number(q.total_contacts) || 0 : undefined,
  };
}

function agregarStatusDiscador(filas: FilaInfo[]): StatusDiscador {
  if (filas.length === 0) return "desconhecido";
  if (filas.some((f) => f.status === "ativo")) return "ativo";
  if (filas.some((f) => f.status === "pausado")) return "pausado";
  if (filas.every((f) => f.status === "parado")) return "parado";
  return "desconhecido";
}

// ---------------------------------------------------------------------------
// Agentes (API agentes-pabx) — GET /agents (JSON) já traz o status ao vivo
// ---------------------------------------------------------------------------

interface AgenteApi {
  id?: string | number;
  name?: string;
  loginExtension?: string;
  status?: string; // ONLINE | PAUSED | OFFLINE
  talkingCallId?: string | null;
  talkingSince?: number | null;
  pauseAt?: number | null;
  pauseReasonId?: string | number | null;
  pauseReasonName?: string | null;
}

function statusDoAgente(a: AgenteApi): AgenteStatus {
  const s = String(a.status ?? "").toUpperCase();
  if (a.talkingCallId != null || a.talkingSince != null) return "atendimento";
  if (s === "PAUSED" || a.pauseAt != null || a.pauseReasonId != null) return "pausa";
  if (s === "ONLINE") return "disponivel";
  return "offline"; // OFFLINE / deslogado
}

async function getRoster(ctx: VonixCtx): Promise<AgenteAoVivo[] | null> {
  let res: Response;
  try {
    res = await vonixFetch(ctx, "/agents", "application/json");
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const body = await res.json();
  const arr: AgenteApi[] = Array.isArray(body) ? body : body?.data ?? body?.agents ?? [];

  const agentes: AgenteAoVivo[] = arr.map((a) => ({
    id: String(a.id ?? ""),
    nome: a.name ?? `Agente ${a.id ?? ""}`,
    status: statusDoAgente(a),
    ramal: a.loginExtension ?? undefined,
  }));

  // Colméia = agentes logados (exclui OFFLINE/deslogados).
  return agentes.filter((a) => a.status !== "offline");
}

function contar(agentes: AgenteAoVivo[]): Record<AgenteStatus, number> {
  return agentes.reduce(
    (acc, a) => {
      acc[a.status] += 1;
      return acc;
    },
    { atendimento: 0, disponivel: 0, pausa: 0, offline: 0 } as Record<AgenteStatus, number>,
  );
}

// ---------------------------------------------------------------------------
// Agregação por parceiro
// ---------------------------------------------------------------------------

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
    // Filas + roster de agentes em paralelo.
    const [queues, roster] = await Promise.all([
      getQueues(ctx).catch(() => [] as Array<{ id: string; nome?: string }>),
      getRoster(ctx),
    ]);

    const alvo = queues.slice(0, MAX_QUEUE_STATUS);
    const filas = await mapLimit(alvo, QUEUE_CONCURRENCY, async (q) => {
      try {
        return await getQueueStatus(ctx, q.id, q.nome);
      } catch {
        return { id: q.id, nome: q.nome, status: "desconhecido", contatos: 0 } as FilaInfo;
      }
    });

    const linha = base();
    linha.online = true;
    linha.filas = filas;
    linha.contatosNaFila = filas.reduce((s, f) => s + f.contatos, 0);
    linha.statusDiscador = agregarStatusDiscador(filas);

    if (roster) {
      linha.agentes = roster;
      linha.contadores = contar(roster);
      linha.agentesLogados = roster.length; // já filtrado a logados
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
