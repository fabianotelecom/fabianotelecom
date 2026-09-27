# Deploy — Visão Unificada Algar (Vercel + Supabase)

Guia para publicar o app e obter um **URL compartilhável** para testes.
Tempo estimado: ~15 min. O app vive na subpasta `visao-unificada-algar/`
deste repositório (`fabianotelecom/fabianotelecom`), branch de trabalho
`claude/admiring-cerf-up9lsr`.

---

## 1. Supabase (banco + auth)

1. Crie um projeto em https://supabase.com (região mais próxima; anote a senha do DB).
2. Em **SQL Editor**, cole e rode o conteúdo de `supabase/schema.sql`
   (cria tabelas, RLS e a view `parceiros_publicos`).
3. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**segredo — só server-side**)

### Primeiro usuário (admin)
Crie direto no Supabase (mais seguro que expor a rota de criação):
1. **Authentication → Users → Add user** (email + senha; marque "Auto Confirm").
2. Copie o **UID** do usuário criado.
3. No **SQL Editor**, insira o perfil:
   ```sql
   insert into public.perfis (id, nome, email, papel)
   values ('<UID>', 'Fabiano Augusto', 'fabiano@vonix.com.br', 'admin');
   ```

---

## 2. Chave de criptografia do token

Gere uma chave AES-256 (32 bytes, base64):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Guarde o valor para `TOKEN_ENCRYPTION_KEY` (usada para cifrar o Token API de
cada parceiro). **Não perca essa chave** — sem ela os tokens já gravados não
são decifrados.

---

## 3. Vercel

1. Acesse https://vercel.com e **Add New → Project**; importe o repositório
   `fabianotelecom/fabianotelecom`.
2. **Root Directory:** selecione `visao-unificada-algar` (passo crítico — o app
   está na subpasta). O framework **Next.js** é detectado automaticamente.
3. **Branch de produção:** aponte para `claude/admiring-cerf-up9lsr` (ou faça o
   merge do PR #1 e use a branch padrão).
4. Em **Environment Variables**, adicione:

   | Variável | Valor | Escopo |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase | All |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | All |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key | All (secret) |
   | `TOKEN_ENCRYPTION_KEY` | chave base64 gerada | All (secret) |
   | `VONIX_API_TIMEOUT_MS` | `8000` (opcional) | All |
   | `VONIX_MAX_QUEUE_STATUS` | `150` (opcional) | All |

5. **Deploy**. Ao final, a Vercel entrega o URL (ex.: `visao-unificada-algar.vercel.app`).

---

## 4. Primeiro uso

1. Acesse o URL → **/login** e entre com o usuário admin criado no passo 1.
2. Em **/gestores**, cadastre um gestor.
3. Em **/parceiros**, cadastre um parceiro:
   - **Identificador Vonix (customer):** `sandbox`
   - **Token API:** o token do sandbox
4. Vá ao **Dashboard**: fila, status do discador e a colméia de agentes passam
   a refletir os dados reais do servidor Vonix (atualização a cada 20s).

---

## 5. ⚠️ Antes de compartilhar amplamente (segurança)

- **Proteção de rotas:** ainda não há middleware que bloqueie páginas/rotas sem
  sessão, e a rota `POST /api/usuarios` (criação de usuários) não está fechada.
  **Recomendado** implementar o guard de autenticação (item de roadmap) antes de
  divulgar o link fora do time. Enquanto isso, mantenha o URL restrito.
- **Tokens:** rotacione os tokens de sandbox usados em teste ao final.
- **Segredos:** `service_role` e `TOKEN_ENCRYPTION_KEY` ficam **apenas** nas
  Environment Variables da Vercel (nunca no client, nunca no repositório).

---

## 6. Atualizações

Cada push na branch de produção dispara um novo deploy automático na Vercel.
Preview deployments são gerados para cada PR.
