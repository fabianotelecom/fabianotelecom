"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Building2, UserCog } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parceiros", label: "Parceiros", icon: Building2 },
  { href: "/gestores", label: "Gestores", icon: UserCog },
  { href: "/usuarios", label: "Usuários", icon: Users },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex w-60 flex-col border-r border-brand-border bg-brand-surface">
      <div className="flex h-16 items-center gap-2 border-b border-brand-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-accent font-bold text-white">
          A
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-100">Visão Unificada</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Algar · Vonix</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand-accent/15 text-brand-accent"
                  : "text-slate-400 hover:bg-brand-border hover:text-slate-200",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-brand-border p-4 text-[10px] text-slate-600">
        v0.1.0 · scaffold
      </div>
    </aside>
  );
}
