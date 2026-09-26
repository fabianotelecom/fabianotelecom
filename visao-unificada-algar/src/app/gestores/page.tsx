"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from "@/components/ui/primitives";
import type { Gestor } from "@/lib/types";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function GestoresPage() {
  const { data } = useSWR<{ gestores: Gestor[] }>("/api/gestores", fetcher);
  const [form, setForm] = useState({ nome: "", id_gestor: "", email: "", telefone: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/gestores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMsg(json.error ?? "Erro ao salvar");
      return;
    }
    setForm({ nome: "", id_gestor: "", email: "", telefone: "" });
    setMsg("Gestor cadastrado com sucesso.");
    mutate("/api/gestores");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">Gestores</h1>
        <p className="text-sm text-slate-400">Cadastro de gestores da Algar.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Novo gestor</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Id do gestor * (texto, origem externa)</Label>
                <Input
                  value={form.id_gestor}
                  onChange={(e) => setForm({ ...form, id_gestor: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Salvando…" : "Cadastrar gestor"}
              </Button>
              {msg && <p className="text-xs text-slate-400">{msg}</p>}
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gestores cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="pb-2">Nome</th>
                  <th className="pb-2">Id Gestor</th>
                  <th className="pb-2">E-mail</th>
                  <th className="pb-2">Telefone</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {(data?.gestores ?? []).map((g) => (
                  <tr key={g.id} className="border-t border-brand-border">
                    <td className="py-2">{g.nome}</td>
                    <td className="py-2">{g.id_gestor}</td>
                    <td className="py-2">{g.email ?? "—"}</td>
                    <td className="py-2">{g.telefone ?? "—"}</td>
                  </tr>
                ))}
                {(!data?.gestores || data.gestores.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      Nenhum gestor cadastrado (ou Supabase não configurado).
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
