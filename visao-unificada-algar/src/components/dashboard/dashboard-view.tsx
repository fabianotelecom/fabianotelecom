"use client";

import useSWR from "swr";
import { useState } from "react";
import type { LinhaDashboard, StatusDiscador } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/primitives";
import { AgentHoneycomb } from "./agent-honeycomb";
import { StatusLegend } from "./status-legend";
import { fmtPct, fmtTma } from "@/lib/utils";
import { Activity, Users, ListOrdered, Radio, ChevronDown } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DISCADOR_META: Record<StatusDiscador, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "#22C55E" },
  pausado: { label: "Pausado", color: "#F5C518" },
  parado: { label: "Parado", color: "#EF4444" },
  desconhecido: { label: "Desconhecido", color: "#6B7280" },
};

export function DashboardView() {
  // Atualiza a cada 10s (polling). Ajuste conforme necessidade operacional.
  const { data, isLoading } = useSWR<{ linhas: LinhaDashboard[]; fonte: string }>(
    "/api/dashboard",
    fetcher,
    { refreshInterval: 10_000 },
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

  return (
    <div className="space-y-6">
      {data?.fonte === "mock" && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">
          Exibindo <strong>dados simulados</strong> — integração real com as APIs
          Vonix pendente de liberação de rede e confirmação dos endpoints.
        </div>
      )}

      {/* KPIs gerais */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={<Radio size={18} />} label="Servidores online" value={`${totais.online}/${linhas.length}`} />
        <Kpi icon={<ListOrdered size={18} />} label="Contatos na fila (total)" value={totais.fila.toLocaleString("pt-BR")} />
        <Kpi icon={<Users size={18} />} label="Agentes logados (total)" value={totais.logados} />
        <Kpi icon={<Activity size={18} />} label="Parceiros" value={linhas.length} />
      </div>

      <div className="flex items-center justify-between">
        <StatusLegend />
        {isLoading && <span className="text-xs text-slate-500">Atualizando…</span>}
      </div>

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
            className={`h-2.5 w-2.5 rounded-full ${linha.online ? "bg-green-500" : "bg-red-500"}`}
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
          <div className="font-semibold text-slate-100">{linha.agentesLogados}</div>
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
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <CardTitle className="mb-3">Colméia de Agentes</CardTitle>
                <AgentHoneycomb agentes={linha.agentes} />
              </div>
              <div>
                <CardTitle className="mb-3">Distribuição</CardTitle>
                <StatusLegend contadores={linha.contadores} />
                <div className="mt-4 text-xs text-slate-500">
                  Servidor: {linha.urlVonix}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
