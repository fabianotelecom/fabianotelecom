import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createRawClient } from "@supabase/supabase-js";

// Indica se as variáveis do Supabase estão configuradas (client/anon).
export function hasSupabaseEnv(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Indica se há service_role (necessário para criar usuários / coletor).
export function hasServiceRole(): boolean {
  return hasSupabaseEnv() && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

const SEM_SUPABASE =
  "Supabase não configurado. Preencha .env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY) e rode o schema.sql. Veja o DEPLOY.md.";

export { SEM_SUPABASE };

// Cliente Supabase para Server Components / Route Handlers (respeita RLS
// do usuário logado via cookies).
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // chamado de um Server Component — pode ser ignorado quando há middleware
          }
        },
      },
    },
  );
}

// Cliente com service_role — USO EXCLUSIVO SERVER-SIDE (coletor).
// Ignora RLS: necessário para ler token_api_enc dos parceiros.
export function createServiceClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
