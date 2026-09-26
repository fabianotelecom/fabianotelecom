"use client";

import { useMemo, useState } from "react";
import type { AgenteAoVivo } from "@/lib/types";
import { STATUS_META } from "@/lib/types";

/**
 * Gráfico colméia (honeycomb): cada hexágono = 1 agente logado,
 * colorido pelo padrão de status do VonixCC.
 *   Em Atendimento → Amarelo | Disponível → Verde | Em Pausa → Rosa
 *
 * SVG puro (sem dependências): layout hexagonal "pointy-top" com
 * deslocamento de linhas ímpares. `columns` controla a densidade.
 */
export function AgentHoneycomb({
  agentes,
  columns = 8,
  size = 26,
}: {
  agentes: AgenteAoVivo[];
  columns?: number;
  size?: number; // "raio" do hexágono
}) {
  const [hover, setHover] = useState<AgenteAoVivo | null>(null);

  const layout = useMemo(() => {
    // Geometria de hexágono pointy-top
    const w = Math.sqrt(3) * size; // largura
    const h = 2 * size; // altura
    const vGap = h * 0.75; // deslocamento vertical entre linhas

    const cells = agentes.map((ag, i) => {
      const row = Math.floor(i / columns);
      const col = i % columns;
      const x = col * w + (row % 2 ? w / 2 : 0) + w / 2;
      const y = row * vGap + h / 2;
      return { ag, x, y };
    });

    const rows = Math.ceil(agentes.length / columns);
    const totalW = columns * w + w / 2;
    const totalH = rows * vGap + h / 4 + size;
    return { cells, totalW, totalH, size };
  }, [agentes, columns, size]);

  function hexPoints(cx: number, cy: number, r: number): string {
    const pts: string[] = [];
    for (let k = 0; k < 6; k++) {
      const angle = (Math.PI / 180) * (60 * k - 90); // pointy-top
      pts.push(
        `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`,
      );
    }
    return pts.join(" ");
  }

  if (agentes.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        Sem agentes logados
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${layout.totalW} ${layout.totalH}`}
        className="w-full"
        role="img"
        aria-label="Colméia de agentes por status"
      >
        {layout.cells.map(({ ag, x, y }) => {
          const meta = STATUS_META[ag.status];
          const active = hover?.id === ag.id;
          return (
            <polygon
              key={ag.id}
              points={hexPoints(x, y, layout.size - 2)}
              fill={meta.color}
              fillOpacity={active ? 1 : 0.85}
              stroke={active ? "#fff" : "#0B1220"}
              strokeWidth={active ? 2 : 1}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHover(ag)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-md border border-brand-border bg-brand-bg/95 px-3 py-2 text-xs shadow-lg">
          <div className="font-semibold text-slate-100">{hover.nome}</div>
          <div className="text-slate-400">Ramal {hover.ramal ?? "—"}</div>
          <div style={{ color: STATUS_META[hover.status].color }}>
            {STATUS_META[hover.status].label}
          </div>
        </div>
      )}
    </div>
  );
}
