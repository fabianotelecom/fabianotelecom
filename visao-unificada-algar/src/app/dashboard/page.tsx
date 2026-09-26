import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-400">
          Acompanhamento em tempo real dos servidores Vonix dos parceiros.
        </p>
      </header>
      <DashboardView />
    </div>
  );
}
