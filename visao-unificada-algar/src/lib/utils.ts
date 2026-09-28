import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtTma(segundos?: number): string {
  if (segundos == null) return "—";
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}m${String(s).padStart(2, "0")}s`;
}

export function fmtPct(v?: number): string {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}

// Lê o corpo de uma Response como JSON de forma segura (não quebra se vier
// vazio, HTML ou texto). Retorna {} quando não há JSON válido.
export async function safeJson<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}
