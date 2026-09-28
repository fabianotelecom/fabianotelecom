import { NextRequest, NextResponse } from "next/server";
import { createClient, hasSupabaseEnv, SEM_SUPABASE } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/crypto";

export const dynamic = "force-dynamic";

// Lista parceiros SEM o token (view pública).
export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ parceiros: [], aviso: SEM_SUPABASE });
  const supa = await createClient();
  const { data, error } = await supa
    .from("parceiros_publicos")
    .select("*")
    .order("nome_parceiro");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ parceiros: data ?? [] });
}

// Cria parceiro — o token_api é criptografado server-side antes de gravar.
export async function POST(req: NextRequest) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: SEM_SUPABASE }, { status: 503 });
  const body = await req.json();
  const {
    gestor_id,
    nome_parceiro,
    id_gestor,
    id_parceiro,
    cpf_cnpj,
    razao_social,
    customer,
    url_vonix,
    token_api,
  } = body ?? {};

  if (!nome_parceiro || !id_parceiro || !customer || !token_api) {
    return NextResponse.json(
      { error: "nome_parceiro, id_parceiro, customer e token_api são obrigatórios" },
      { status: 422 },
    );
  }

  let token_api_enc: string;
  try {
    token_api_enc = encryptToken(token_api);
  } catch (e) {
    return NextResponse.json(
      { error: "Falha ao criptografar token (verifique TOKEN_ENCRYPTION_KEY)" },
      { status: 500 },
    );
  }

  const supa = await createClient();
  const { data, error } = await supa
    .from("parceiros")
    .insert({
      gestor_id: gestor_id || null,
      nome_parceiro,
      id_gestor,
      id_parceiro,
      cpf_cnpj,
      razao_social,
      customer,
      url_vonix: url_vonix || null,
      token_api_enc,
    })
    .select("id, nome_parceiro")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ parceiro: data }, { status: 201 });
}
