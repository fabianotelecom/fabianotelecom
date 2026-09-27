"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AgenteAoVivo } from "@/lib/types";
import { STATUS_META } from "@/lib/types";

/**
 * Gráfico colméia (honeycomb): cada hexágono = 1 agente logado,
 * colorido pelo status. SVG puro (sem dependências).
 *
 * Responsivo: o número de colunas é calculado a partir da largura do
 * container e de `hexTarget` (largura-alvo de cada hexágono em px), de modo
 * que os hexágonos mantêm tamanho físico consistente independentemente da
 * quantidade de agentes.
 */
export function AgentHoneycomb({
  agentes,
  hexTarget = 40,
  size = 12,
}: {
  agentes: AgenteAoVivo[];
  hexTarget?: number; // largura-alvo de cada hexágono, em px
  size?: number; // "raio" do hexágono (geometria/traço)
}) {
  const [hover, setHover] = useState<AgenteAoVivo | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const columns = Math.max(1, Math.floor(width / hexTarget));

  const layout = useMemo(() => {
    const w = Math.sqrt(3) * size; // largura do hexágono (pointy-top)
    const h = 2 * size;
    const vGap = h * 0.75;

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
    return { cells, totalW, totalH };
  }, [agentes, columns, size]);

  function hexPoints(cx: number, cy: number, r: number): string {
    const pts: string[] = [];
    for (let k = 0; k < 6; k++) {
      const angle = (Math.PI / 180) * (60 * k - 90);
      pts.push(
        `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`,
      );
    }
    return pts.join(" ");
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      {agentes.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-sm text-slate-500">
          Nenhum agente logado no momento
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${layout.totalW} ${layout.totalH}`}
          width="100%"
          height={Math.round((width / layout.totalW) * layout.totalH)}
          preserveAspectRatio="xMidYMin meet"
          role="img"
          aria-label="Colméia de agentes logados por status"
          style={{ maxWidth: "100%", display: "block" }}
        >
          {layout.cells.map(({ ag, x, y }) => {
            const meta = STATUS_META[ag.status];
            const active = hover?.id === ag.id;
            return (
              <polygon
                key={ag.id}
                points={hexPoints(x, y, size - 1)}
                fill={meta.color}
                fillOpacity={active ? 1 : 0.92}
                stroke={active ? "#fff" : "#002B3D"}
                strokeWidth={active ? 1.5 : 1}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHover(ag)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
      )}
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
