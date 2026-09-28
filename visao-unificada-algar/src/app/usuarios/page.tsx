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
import type { Usuario } from "@/lib/types";
import { safeJson } from "@/lib/utils";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function UsuariosPage() {
  const { data } = useSWR<{ usuarios: Usuario[] }>("/api/usuarios", fetcher);
  const [form, setForm] = useState({ nome: "", email: "", senha: "", papel: "viewer" });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await safeJson(res);
    setSaving(false);
    if (!res.ok) {
      setMsg(json.error ?? "Erro ao salvar");
      return;
    }
    setForm({ nome: "", email: "", senha: "", papel: "viewer" });
    setMsg("Usuário criado com sucesso.");
    mutate("/api/usuarios");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">Usuários</h1>
        <p className="text-sm text-slate-400">
          Usuários do app Visão Unificada (autenticação via Supabase Auth).
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Novo usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div>
                <Label>E-mail *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <Label>Senha inicial *</Label>
                <Input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required />
              </div>
              <div>
                <Label>Papel</Label>
                <select
                  className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-slate-100"
                  value={form.papel}
                  onChange={(e) => setForm({ ...form, papel: e.target.value })}
                >
                  <option value="viewer">Viewer (somente leitura)</option>
                  <option value="gestor">Gestor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Criando…" : "Criar usuário"}
              </Button>
              {msg && <p className="text-xs text-slate-400">{msg}</p>}
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="pb-2">Nome</th>
                  <th className="pb-2">E-mail</th>
                  <th className="pb-2">Papel</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {(data?.usuarios ?? []).map((u) => (
                  <tr key={u.id} className="border-t border-brand-border">
                    <td className="py-2">{u.nome}</td>
                    <td className="py-2">{u.email}</td>
                    <td className="py-2 capitalize">{u.papel}</td>
                  </tr>
                ))}
                {(!data?.usuarios || data.usuarios.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-500">
                      Nenhum usuário (ou Supabase não configurado).
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
