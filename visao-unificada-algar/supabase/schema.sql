-- =====================================================================
--  Visão Unificada Algar — Schema do banco (Supabase / PostgreSQL)
--  Execute no SQL Editor do Supabase (ou via migration).
-- =====================================================================

-- Extensões
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUM de papéis de usuário do app
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'gestor', 'viewer');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- USUÁRIOS do app (perfil ligado ao Supabase Auth)
--   Autenticação e senha ficam no auth.users (nativo do Supabase).
--   Esta tabela guarda o perfil/papel.
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null,
  email       text not null,
  papel       app_role not null default 'viewer',
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- GESTORES
-- ---------------------------------------------------------------------
create table if not exists public.gestores (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  id_gestor   text not null,              -- texto: dado vem de outro sistema
  email       text,
  telefone    text,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index if not exists gestores_id_gestor_uidx on public.gestores (id_gestor);

-- ---------------------------------------------------------------------
-- PARCEIROS DE VENDAS
--   token_api é criptografado na aplicação (AES-256-GCM) antes de gravar.
--   Nunca armazenar/retornar o token em texto puro para o client.
-- ---------------------------------------------------------------------
create table if not exists public.parceiros (
  id             uuid primary key default gen_random_uuid(),
  gestor_id      uuid references public.gestores(id) on delete set null,
  nome_parceiro  text not null,
  id_gestor      text,                    -- id do gestor (origem externa)
  id_parceiro    text not null,           -- id do parceiro (origem externa)
  cpf_cnpj       text,
  razao_social   text,
  customer       text not null,           -- identificador Vonix; base = https://{customer}.api.vonixcc.com.br
  url_vonix      text,                    -- URL do painel (opcional, referência)
  token_api_enc  text not null,           -- token criptografado (payload base64)
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create unique index if not exists parceiros_id_parceiro_uidx on public.parceiros (id_parceiro);
create index if not exists parceiros_gestor_idx on public.parceiros (gestor_id);

-- ---------------------------------------------------------------------
-- (Opcional / evolução) Histórico de snapshots do dashboard,
--   para análise de tendência (fila, agentes logados, TMA...).
-- ---------------------------------------------------------------------
create table if not exists public.snapshots_dashboard (
  id                 bigint generated always as identity primary key,
  parceiro_id        uuid references public.parceiros(id) on delete cascade,
  status_discador    text,
  contatos_fila      integer,
  agentes_logados    integer,
  agentes_disponivel integer,
  agentes_atendimento integer,
  agentes_pausa      integer,
  coletado_em        timestamptz not null default now()
);
create index if not exists snapshots_parceiro_idx on public.snapshots_dashboard (parceiro_id, coletado_em desc);

-- ---------------------------------------------------------------------
-- Trigger de atualizado_em
-- ---------------------------------------------------------------------
create or replace function public.set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists trg_perfis_upd on public.perfis;
create trigger trg_perfis_upd before update on public.perfis
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_gestores_upd on public.gestores;
create trigger trg_gestores_upd before update on public.gestores
  for each row execute function public.set_atualizado_em();

drop trigger if exists trg_parceiros_upd on public.parceiros;
create trigger trg_parceiros_upd before update on public.parceiros
  for each row execute function public.set_atualizado_em();

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
--   Regra base: usuário autenticado lê; escrita para admin/gestor.
--   Ajuste conforme a política definitiva (ex.: gestor só vê seus parceiros).
-- ---------------------------------------------------------------------
alter table public.perfis     enable row level security;
alter table public.gestores   enable row level security;
alter table public.parceiros  enable row level security;
alter table public.snapshots_dashboard enable row level security;

-- helper: papel do usuário atual
create or replace function public.meu_papel()
returns app_role language sql stable as $$
  select papel from public.perfis where id = auth.uid();
$$;

-- perfis: cada um lê o próprio; admin lê todos
drop policy if exists perfis_select on public.perfis;
create policy perfis_select on public.perfis for select
  using (id = auth.uid() or public.meu_papel() = 'admin');

drop policy if exists perfis_admin_all on public.perfis;
create policy perfis_admin_all on public.perfis for all
  using (public.meu_papel() = 'admin') with check (public.meu_papel() = 'admin');

-- gestores: autenticado lê; admin/gestor escreve
drop policy if exists gestores_select on public.gestores;
create policy gestores_select on public.gestores for select
  using (auth.role() = 'authenticated');

drop policy if exists gestores_write on public.gestores;
create policy gestores_write on public.gestores for all
  using (public.meu_papel() in ('admin','gestor'))
  with check (public.meu_papel() in ('admin','gestor'));

-- parceiros: autenticado lê (SEM o token — o token só é lido server-side
--   via service_role); admin/gestor escreve
drop policy if exists parceiros_select on public.parceiros;
create policy parceiros_select on public.parceiros for select
  using (auth.role() = 'authenticated');

drop policy if exists parceiros_write on public.parceiros;
create policy parceiros_write on public.parceiros for all
  using (public.meu_papel() in ('admin','gestor'))
  with check (public.meu_papel() in ('admin','gestor'));

-- snapshots: autenticado lê
drop policy if exists snapshots_select on public.snapshots_dashboard;
create policy snapshots_select on public.snapshots_dashboard for select
  using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- VIEW segura: parceiros sem expor o token
-- ---------------------------------------------------------------------
create or replace view public.parceiros_publicos as
  select id, gestor_id, nome_parceiro, id_gestor, id_parceiro,
         cpf_cnpj, razao_social, customer, url_vonix, ativo, criado_em, atualizado_em
  from public.parceiros;
