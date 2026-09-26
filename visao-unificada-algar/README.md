# Visão Unificada Algar

Ambiente onde os **Gestores da Algar** cadastram os **Parceiros de Vendas** e
acompanham, em um dashboard unificado, o estado de cada **servidor Vonix** dos
parceiros — status do discador, contatos na fila, agentes logados e a **colméia
de agentes por status**.

> Projeto da **Vonix Tecnologia**. Scaffold inicial (v0.1.0).

---

## Stack

- **Next.js 15** (App Router) + **TypeScript** — full-stack (UI + coletor server-side)
- **Tailwind CSS** — tema escuro operacional
- **Supabase** — Postgres + Auth + RLS (usuários, gestores, parceiros)
- **SWR** — polling do dashboard em tempo quase real
- **SVG puro** — gráfico colméia (honeycomb) de agentes

## Arquitetura (resumo)

```
Browser (Dashboard)  →  API Next.js (/api/dashboard, coletor)  →  Vonix Parceiro 1..N
```

O browser **nunca** fala direto com os servidores Vonix. O coletor server-side
descriptografa o token de cada parceiro (AES-256-GCM) e consulta as APIs em
paralelo, agregando as linhas do dashboard. Tokens ficam **criptografados** no
banco e nunca trafegam para o client.

## Padrão de cores de status dos Agentes (VonixCC)

| Status | Cor |
|---|---|
| Em Atendimento | 🟡 Amarelo `#F5C518` |
| Disponível | 🟢 Verde `#22C55E` |
| Em Pausa | 🩷 Rosa `#EC4899` |
| Offline | ⚪ Cinza `#6B7280` |

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev                  # http://localhost:3000
```

Sem Supabase configurado, o dashboard funciona com **dados simulados** (mock)
para validar a experiência visual e a colméia.

### Banco

Aplique `supabase/schema.sql` no SQL Editor do Supabase (cria tabelas
`perfis`, `gestores`, `parceiros`, `snapshots_dashboard`, RLS e a view
`parceiros_publicos`).

### Chave de criptografia

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# cole em TOKEN_ENCRYPTION_KEY no .env.local
```

## Estrutura

```
src/
  app/
    dashboard/            # Dashboard (linha por servidor + colméia)
    gestores/             # Cadastro de gestores
    parceiros/            # Cadastro de parceiros (token criptografado)
    usuarios/             # Cadastro de usuários do app
    login/                # Autenticação (Supabase Auth)
    api/
      dashboard/          # Agregador do dashboard (coletor)
      gestores/ parceiros/ usuarios/
  components/
    dashboard/            # dashboard-view, agent-honeycomb, status-legend
    layout/ ui/
  lib/
    vonix/client.ts       # cliente das APIs Vonix (filas/discador reais; roster de agentes a definir)
    crypto.ts             # AES-256-GCM para tokens
    supabase/             # clients browser/server/service
    types.ts mock-data.ts utils.ts
supabase/schema.sql
```

## Integração com as APIs Vonix

- **Base da API:** `https://{customer}.api.vonixcc.com.br` (o `customer` é o
  identificador do parceiro, cadastrado por parceiro).
- **Autenticação:** header `Authorization: <token>` (token cru).
- **Fila + status do discador (integrado):** via `contatos-discador`
  - `GET /v1/queues` → filas do token
  - `GET /v1/queue/{id}/status` (XML) → `stored_contacts`, `status`, `last_feed`
  - Agregação: contatos na fila = Σ `stored_contacts`; status do discador
    derivado dos status das filas.

### ⚠️ Pendência: roster de agentes ao vivo (colméia + nº logados)

A API `agentes-pabx` é de **comando** (login/logout/pause/dial/status por
agente) e **não lista os agentes logados**. O roster ao vivo (para a colméia
e o total de agentes) virá de uma **fonte realtime/supervisão a definir** —
ver `getRoster()` em `src/lib/vonix/client.ts`. Enquanto não definida, as
linhas reais marcam `fonteAgentes = "pendente"` e o dashboard exibe fila e
discador reais, com a colméia sinalizada como pendente. O modo mock (sem
Supabase) segue exibindo a colméia completa para demonstração visual.

## Roadmap sugerido

- [ ] Middleware de proteção de rotas (redirect p/ /login sem sessão)
- [ ] Edição/inativação de parceiros e gestores
- [ ] Histórico de snapshots + gráficos de tendência
- [ ] Alertas (servidor offline, fila acima do limite)
- [ ] Deploy (Vercel) + agendamento do coletor
