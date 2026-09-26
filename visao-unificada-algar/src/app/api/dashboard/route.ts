import { NextResponse } from "next/server";
import { mockLinhas } from "@/lib/mock-data";
import { coletarLinha } from "@/lib/vonix/client";
import { decryptToken } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/server";
import type { LinhaDashboard } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Endpoint agregador do dashboard.
 * - Lê parceiros ativos (server-side, service_role).
 * - Descriptografa o token de cada um e consulta o respectivo servidor Vonix.
 * - Agrega e devolve uma linha por servidor.
 *
 * Fallback: sem Supabase/parceiros configurados → devolve dados simulados,
 * para o dashboard funcionar em desenvolvimento.
 */
export async function GET() {
  const temSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!temSupabase) {
    return NextResponse.json({ fonte: "mock", linhas: mockLinhas() });
  }

  try {
    const supa = createServiceClient();
    const { data: parceiros, error } = await supa
      .from("parceiros")
      .select("id, nome_parceiro, url_vonix, token_api_enc, gestor_id, gestores(nome)")
      .eq("ativo", true);

    if (error) throw error;
    if (!parceiros || parceiros.length === 0) {
      return NextResponse.json({ fonte: "mock", linhas: mockLinhas() });
    }

    const linhas: LinhaDashboard[] = await Promise.all(
      parceiros.map((p: any) =>
        coletarLinha({
          parceiroId: p.id,
          nomeParceiro: p.nome_parceiro,
          gestor: p.gestores?.nome ?? null,
          baseUrl: p.url_vonix,
          token: decryptToken(p.token_api_enc),
        }),
      ),
    );

    return NextResponse.json({ fonte: "vonix", linhas });
  } catch (e) {
    // Em falha de configuração, não derruba o painel.
    return NextResponse.json({
      fonte: "mock",
      linhas: mockLinhas(),
      aviso: e instanceof Error ? e.message : "erro",
    });
  }
}
