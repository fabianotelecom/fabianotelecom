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
import type { Gestor, Parceiro } from "@/lib/types";
import { safeJson } from "@/lib/utils";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

const EMPTY = {
  gestor_id: "",
  nome_parceiro: "",
  id_gestor: "",
  id_parceiro: "",
  cpf_cnpj: "",
  razao_social: "",
  customer: "",
  url_vonix: "",
  token_api: "",
};

export default function ParceirosPage() {
  const { data } = useSWR<{ parceiros: Parceiro[] }>("/api/parceiros", fetcher);
  const { data: gestoresData } = useSWR<{ gestores: Gestor[] }>("/api/gestores", fetcher);
  const [form, setForm] = useState({ ...EMPTY });
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof EMPTY>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/parceiros", {
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
    setForm({ ...EMPTY });
    setMsg("Parceiro cadastrado com sucesso.");
    mutate("/api/parceiros");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">Parceiros de Vendas</h1>
        <p className="text-sm text-slate-400">
          Cada parceiro possui um servidor Vonix próprio. O Token de API é
          criptografado e nunca exibido após o cadastro.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Novo parceiro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>Gestor</Label>
                <select
                  className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-slate-100"
                  value={form.gestor_id}
                  onChange={(e) => set("gestor_id", e.target.value)}
                >
                  <option value="">— selecione —</option>
                  {(gestoresData?.gestores ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nome}
                    </option>
                  ))}
                </select>
              </div>
              <Field label="Nome Parceiro *" value={form.nome_parceiro} onChange={(v) => set("nome_parceiro", v)} required />
              <Field label="Id Gestor" value={form.id_gestor} onChange={(v) => set("id_gestor", v)} />
              <Field label="Id Parceiro *" value={form.id_parceiro} onChange={(v) => set("id_parceiro", v)} required />
              <Field label="CPF/CNPJ" value={form.cpf_cnpj} onChange={(v) => set("cpf_cnpj", v)} />
              <Field label="Razão Social" value={form.razao_social} onChange={(v) => set("razao_social", v)} />
              <Field label="Identificador Vonix (customer) *" value={form.customer} onChange={(v) => set("customer", v)} placeholder="ex.: sandbox" required />
              <p className="-mt-1 text-[11px] text-slate-500">Base da API: https://&#123;customer&#125;.api.vonixcc.com.br</p>
              <Field label="URL do painel (opcional)" value={form.url_vonix} onChange={(v) => set("url_vonix", v)} placeholder="https://parceiro.vonixcc.com.br" />
              <div>
                <Label>Token API *</Label>
                <Input
                  type="password"
                  value={form.token_api}
                  onChange={(e) => set("token_api", e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Salvando…" : "Cadastrar parceiro"}
              </Button>
              {msg && <p className="text-xs text-slate-400">{msg}</p>}
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Parceiros cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="pb-2">Parceiro</th>
                  <th className="pb-2">Id Parceiro</th>
                  <th className="pb-2">Razão Social</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Ativo</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {(data?.parceiros ?? []).map((p) => (
                  <tr key={p.id} className="border-t border-brand-border">
                    <td className="py-2">{p.nome_parceiro}</td>
                    <td className="py-2">{p.id_parceiro}</td>
                    <td className="py-2">{p.razao_social ?? "—"}</td>
                    <td className="py-2 text-xs text-slate-400">{p.customer}</td>
                    <td className="py-2">{p.ativo ? "Sim" : "Não"}</td>
                  </tr>
                ))}
                {(!data?.parceiros || data.parceiros.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Nenhum parceiro cadastrado (ou Supabase não configurado).
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}
