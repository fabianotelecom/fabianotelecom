import { NextRequest, NextResponse } from "next/server";
import { createClient, hasSupabaseEnv, SEM_SUPABASE } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseEnv()) return NextResponse.json({ gestores: [], aviso: SEM_SUPABASE });
  const supa = await createClient();
  const { data, error } = await supa
    .from("gestores")
    .select("*")
    .order("nome");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ gestores: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!hasSupabaseEnv()) return NextResponse.json({ error: SEM_SUPABASE }, { status: 503 });
  const body = await req.json();
  const { nome, id_gestor, email, telefone } = body ?? {};
  if (!nome || !id_gestor) {
    return NextResponse.json(
      { error: "nome e id_gestor são obrigatórios" },
      { status: 422 },
    );
  }
  const supa = await createClient();
  const { data, error } = await supa
    .from("gestores")
    .insert({ nome, id_gestor, email, telefone })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ gestor: data }, { status: 201 });
}
