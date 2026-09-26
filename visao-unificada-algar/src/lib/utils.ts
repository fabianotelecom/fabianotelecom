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
