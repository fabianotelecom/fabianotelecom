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

## Deploy

Para publicar (Vercel + Supabase) e obter um URL compartilhável, veja
[`DEPLOY.md`](./DEPLOY.md).

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

## Integração com as APIs Vonix (validada em sandbox)

- **Base da API:** `https://{customer}.api.vonixcc.com.br`.
- **Autenticação:** header `Authorization: Bearer <token>`.
- **Fila + status do discador:** via `contatos-discador` (respostas em **XML**)
  - `GET /v1/queues` → filas do token
  - `GET /v1/queue/{id}/status` → `status`, `stored_contacts`, `total_contacts`, `last_feed`
  - Contatos na fila = Σ `stored_contacts`; status do discador agregado das
    filas (`Discando`→ativo, `Em pausa`→pausado, `Fora de horário`/`Parada`→parado).
  - Teto de filas consultadas por ciclo: `VONIX_MAX_QUEUE_STATUS` (sandbox tem ~133).
- **Roster de agentes / colméia:** via `agentes-pabx`
  - `GET /agents` → **já traz o status ao vivo** de cada agente numa única
    chamada: `status` (ONLINE/PAUSED/OFFLINE), `talkingCallId`, `pauseAt`,
    `loginExtension`.
  - Mapeamento: `talkingCallId` → Em Atendimento 🟡; `PAUSED`/`pauseAt` → Em
    Pausa 🩷; `ONLINE` → Disponível 🟢; `OFFLINE` → offline (fora da colméia).
  - A colméia mostra apenas os agentes **logados** (status ≠ offline).

## Roadmap sugerido

- [ ] Middleware de proteção de rotas (redirect p/ /login sem sessão)
- [ ] Edição/inativação de parceiros e gestores
- [ ] Histórico de snapshots + gráficos de tendência
- [ ] Alertas (servidor offline, fila acima do limite)
- [ ] Deploy (Vercel) + agendamento do coletor
