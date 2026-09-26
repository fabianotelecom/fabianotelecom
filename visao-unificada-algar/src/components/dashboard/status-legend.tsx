import { STATUS_META, type AgenteStatus } from "@/lib/types";

export function StatusLegend({
  contadores,
}: {
  contadores?: Record<AgenteStatus, number>;
}) {
  const ordem: AgenteStatus[] = ["atendimento", "disponivel", "pausa", "offline"];
  return (
    <div className="flex flex-wrap items-center gap-4">
      {ordem.map((s) => (
        <div key={s} className="flex items-center gap-2 text-xs text-slate-300">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ backgroundColor: STATUS_META[s].color }}
          />
          <span>{STATUS_META[s].label}</span>
          {contadores && (
            <span className="font-semibold text-slate-100">
              {contadores[s]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
