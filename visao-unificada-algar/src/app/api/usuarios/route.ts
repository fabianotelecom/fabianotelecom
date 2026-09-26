import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supa = await createClient();
  const { data, error } = await supa.from("perfis").select("*").order("nome");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ usuarios: data ?? [] });
}

// Cria usuário do app: cria no Auth (service_role) e o perfil.
// Requer que o solicitante seja admin (validado via RLS na criação do perfil).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nome, email, senha, papel } = body ?? {};
  if (!nome || !email || !senha) {
    return NextResponse.json(
      { error: "nome, email e senha são obrigatórios" },
      { status: 422 },
    );
  }

  const admin = createServiceClient();
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (authErr || !created.user) {
    return NextResponse.json(
      { error: authErr?.message ?? "Falha ao criar usuário" },
      { status: 400 },
    );
  }

  const { error: perfilErr } = await admin.from("perfis").insert({
    id: created.user.id,
    nome,
    email,
    papel: papel ?? "viewer",
  });
  if (perfilErr) {
    return NextResponse.json({ error: perfilErr.message }, { status: 400 });
  }

  return NextResponse.json({ usuario: { id: created.user.id, nome, email } }, {
    status: 201,
  });
}
