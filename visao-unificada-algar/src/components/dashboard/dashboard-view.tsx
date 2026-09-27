"use client";

import useSWR from "swr";
import { useState } from "react";
import type { AgenteAoVivo, AgenteStatus, LinhaDashboard, StatusDiscador } from "@/lib/types";
import { STATUS_META } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/primitives";
import { AgentHoneycomb } from "./agent-honeycomb";
import { StatusLegend } from "./status-legend";
import { fmtPct, fmtTma } from "@/lib/utils";
import { Activity, Users, ListOrdered, Radio, ChevronDown } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DISCADOR_META: Record<StatusDiscador, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "#10B981" },
  pausado: { label: "Pausado", color: "#F59E0B" },
  parado: { label: "Parado", color: "#EF4444" },
  desconhecido: { label: "Desconhecido", color: "#64748B" },
};

export function DashboardView() {
  // Atualiza por polling. 20s equilibra atualidade x custo (o coletor
  // consulta status por fila; parceiros podem ter muitas filas).
  const { data, isLoading } = useSWR<{ linhas: LinhaDashboard[]; fonte: string }>(
    "/api/dashboard",
    fetcher,
    { refreshInterval: 20_000 },
  );

  const linhas = data?.linhas ?? [];

  const totais = linhas.reduce(
    (acc, l) => {
      acc.fila += l.contatosNaFila;
      acc.logados += l.agentesLogados;
      acc.online += l.online ? 1 : 0;
      return acc;
    },
    { fila: 0, logados: 0, online: 0 },
  );

  // Colméia global: todos os agentes logados de todos os parceiros (sem offline)
  const todosAgentes: AgenteAoVivo[] = linhas
    .flatMap((l) => l.agentes)
    .filter((a) => a.status !== "offline");

  const contadoresGlobais = todosAgentes.reduce(
    (acc, a) => {
      acc[a.status] += 1;
      return acc;
    },
    { atendimento: 0, disponivel: 0, pausa: 0, offline: 0 } as Record<AgenteStatus, number>,
  );

  return (
    <div className="space-y-6">
      {data?.fonte === "mock" && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          Exibindo <strong>dados simulados</strong> (modo demo). Configure o
          Supabase e cadastre um parceiro para ver os dados reais dos servidores Vonix.
        </div>
      )}

      {/* KPIs gerais */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Radio size={18} />} label="Servidores online" value={`${totais.online}/${linhas.length}`} />
        <Kpi icon={<ListOrdered size={18} />} label="Contatos na fila (total)" value={totais.fila.toLocaleString("pt-BR")} />
        <Kpi icon={<Users size={18} />} label="Agentes logados (total)" value={totais.logados} />
        <Kpi icon={<Activity size={18} />} label="Parceiros" value={linhas.length} />
      </div>

      {/* Colméia global — todos os agentes logados de todos os parceiros */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Colméia de Agentes</CardTitle>
            <p className="text-xs text-slate-400">
              {todosAgentes.length} agentes logados · todos os parceiros
            </p>
          </div>
          <div className="flex items-center gap-4">
            <StatusLegend contadores={contadoresGlobais} hideOffline />
            {isLoading && <span className="text-xs text-slate-500">Atualizando…</span>}
          </div>
        </CardHeader>
        <CardContent>
          <AgentHoneycomb agentes={todosAgentes} hexTarget={40} size={12} />
        </CardContent>
      </Card>

      {/* Uma linha por servidor */}
      <div className="space-y-3">
        {linhas.map((l) => (
          <ServerRow key={l.parceiroId} linha={l} />
        ))}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className="rounded-lg bg-brand-accent/15 p-2 text-brand-accent">{icon}</div>
        <div>
          <div className="text-xs text-slate-400">{label}</div>
          <div className="text-xl font-semibold text-slate-100">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ServerRow({ linha }: { linha: LinhaDashboard }) {
  const [aberto, setAberto] = useState(false);
  const disc = DISCADOR_META[linha.statusDiscador];

  return (
    <Card>
      <div
        className="grid cursor-pointer grid-cols-12 items-center gap-3 p-4"
        onClick={() => setAberto((v) => !v)}
      >
        <div className="col-span-4 flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${linha.online ? "bg-status-disponivel" : "bg-red-500"}`}
            title={linha.online ? "Online" : "Offline"}
          />
          <div>
            <div className="font-medium text-slate-100">{linha.nomeParceiro}</div>
            <div className="text-xs text-slate-500">{linha.gestor}</div>
          </div>
        </div>

        <div className="col-span-2">
          <div className="text-xs text-slate-400">Discador</div>
          <Badge color={disc.color}>{disc.label}</Badge>
        </div>

        <div className="col-span-2">
          <div className="text-xs text-slate-400">Contatos na fila</div>
          <div className="font-semibold text-slate-100">
            {linha.contatosNaFila.toLocaleString("pt-BR")}
          </div>
        </div>

        <div className="col-span-2">
          <div className="text-xs text-slate-400">Agentes logados</div>
          <div className="font-semibold text-slate-100">
            {linha.fonteAgentes === "pendente" ? (
              <span className="text-slate-500" title="Fonte de agentes a definir">—</span>
            ) : (
              linha.agentesLogados
            )}
          </div>
        </div>

        <div className="col-span-1 text-xs text-slate-400">
          <div>TMA</div>
          <div className="text-slate-200">{fmtTma(linha.tmaSegundos)}</div>
        </div>

        <div className="col-span-1 flex items-center justify-end gap-2">
          <span className="text-xs text-slate-500">Ocup. {fmtPct(linha.taxaOcupacao)}</span>
          <ChevronDown
            size={18}
            className={`text-slate-400 transition-transform ${aberto ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {aberto && (
        <CardContent className="border-t border-brand-border">
          {linha.erro ? (
            <p className="text-sm text-red-400">{linha.erro}</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <CardTitle className="mb-3">Filas do discador</CardTitle>
                {linha.filas && linha.filas.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-slate-500">
                        <tr>
                          <th className="pb-2">Fila</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Contatos</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-200">
                        {linha.filas.map((f) => (
                          <tr key={f.id} className="border-t border-brand-border">
                            <td className="py-1.5">{f.nome ?? f.id}</td>
                            <td className="py-1.5 text-slate-400">
                              {DISCADOR_META[f.status].label}
                            </td>
                            <td className="py-1.5 text-right">{f.contatos.toLocaleString("pt-BR")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Sem filas para exibir.</p>
                )}
              </div>
              <div>
                <CardTitle className="mb-3">Agentes por status</CardTitle>
                {linha.fonteAgentes === "pendente" ? (
                  <p className="text-xs text-slate-500">
                    Roster de agentes indisponível para este servidor.
                  </p>
                ) : (
                  <StatusLegend contadores={linha.contadores} hideOffline />
                )}
                <div className="mt-4 text-xs text-slate-500">Servidor: {linha.urlVonix}</div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
