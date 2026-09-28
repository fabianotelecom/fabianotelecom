import { NextRequest, NextResponse } from "next/server";
import {
  createClient,
  createServiceClient,
  hasSupabaseEnv,
  hasServiceRole,
  SEM_SUPABASE,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ usuarios: [], aviso: SEM_SUPABASE });
  const supa = await createClient();
  const { data, error } = await supa.from("perfis").select("*").order("nome");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ usuarios: data ?? [] });
}

// Cria usuário do app: cria no Auth (service_role) e o perfil.
// Requer que o solicitante seja admin (validado via RLS na criação do perfil).
export async function POST(req: NextRequest) {
  if (!hasServiceRole())
    return NextResponse.json(
      { error: SEM_SUPABASE + " (a criação de usuários exige SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 503 },
    );
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
