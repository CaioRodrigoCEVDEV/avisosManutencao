# maintenance-api

API de mensagens de manutenção programada com painel administrativo web.

O sistema possui duas partes bem separadas:

1. **Painel administrativo** (`/admin`) protegido por login e senha, onde as
   manutenções são cadastradas e gerenciadas.
2. **API pública** (`/api/maintenance`) consumida por outros sistemas para
   descobrir, em tempo real, se existe uma manutenção ativa.

---

## Índice

- [Stack](#stack)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados e migrations](#banco-de-dados-e-migrations)
- [Criar usuário administrador inicial](#criar-usuário-administrador-inicial)
- [Executar a aplicação](#executar-a-aplicação)
- [Acessar o painel](#acessar-o-painel)
- [Contrato da API Pública](#contrato-da-api-pública)
- [Documentação dos endpoints](#documentação-dos-endpoints)
- [Regras de negócio](#regras-de-negócio)
- [Testes](#testes)
- [Segurança](#segurança)
- [Deploy em produção](#deploy-em-produção)
- [Docker (opcional)](#docker-opcional)
- [OpenAPI](#openapi)

---

## Stack

- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** + **Prisma ORM** (migrations reais, sem SQLite)
- **Zod** para validação
- **bcryptjs** para hash de senha
- **JWT** em cookie **HttpOnly** (nunca em `localStorage`)
- **Helmet**, **CORS** configurável, **rate limit** no login
- **Pino** para logs
- Painel em **HTML + CSS + JavaScript vanilla + Bootstrap 5** (sem framework)

---

## Estrutura de pastas

```
maintenance-api/
├── src/
│   ├── app.ts                     # monta o Express
│   ├── server.ts                  # bootstrap e graceful shutdown
│   ├── config/
│   │   ├── env.ts                 # validação das variáveis de ambiente
│   │   ├── database.ts            # PrismaClient singleton
│   │   └── auth.ts                # configuração de JWT/cookie/senha
│   ├── controllers/               # camada HTTP
│   ├── services/                  # regras de negócio
│   ├── repositories/              # acesso ao banco
│   ├── routes/                    # definição das rotas
│   ├── middlewares/               # auth, erro, not-found, rate limit
│   ├── schemas/                   # schemas Zod
│   ├── utils/                     # jwt, senha, datas/timezone, erros
│   └── types/                     # tipos do Express
├── public/admin/                  # painel administrativo
│   ├── login.html
│   ├── index.html
│   ├── maintenance.html
│   ├── maintenance-form.html
│   ├── settings.html
│   ├── css/admin.css
│   └── js/*.js
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── tests/
├── openapi.yaml
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- npm 10+

---

## Instalação

```bash
git clone <url-do-repositorio> maintenance-api
cd maintenance-api
npm install
cp .env.example .env
# edite o .env com a sua DATABASE_URL e um JWT_SECRET forte
```

---

## Variáveis de ambiente

| Variável         | Descrição                                              | Exemplo                                              |
| ---------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| `NODE_ENV`       | Ambiente (`development`, `test`, `production`)         | `development`                                        |
| `PORT`           | Porta HTTP                                              | `3000`                                               |
| `DATABASE_URL`   | Conexão PostgreSQL                                     | `postgresql://usuario:senha@localhost:5432/maintenance_api` |
| `JWT_SECRET`     | Segredo do JWT (mín. 32 caracteres em produção)        | `CHANGE_THIS_SECRET`                                 |
| `JWT_EXPIRES_IN` | Validade do token                                       | `8h`                                                 |
| `COOKIE_NAME`    | Nome do cookie de autenticação                         | `maintenance_auth`                                   |
| `CORS_ORIGIN`    | Origens permitidas, separadas por vírgula              | `http://localhost:3000`                              |
| `APP_TIMEZONE`   | Fuso usado para converter date/hora do painel           | `America/Sao_Paulo`                                  |
| `ADMIN_NAME`     | Nome do admin criado pelo seed                          | `Administrador`                                      |
| `ADMIN_EMAIL`    | Email do admin criado pelo seed                         | `admin@localhost`                                    |
| `ADMIN_PASSWORD` | Senha do admin criado pelo seed                         | `admin123`                                           |

> Nunca faça commit do arquivo `.env`. Ele já está no `.gitignore`.
> Os valores padrão de `ADMIN_PASSWORD` são **apenas para desenvolvimento**.
> Altere a senha antes de qualquer uso em produção (veja
> [Alteração de senha](#alteração-de-senha)).

---

## Banco de dados e migrations

O projeto **não apaga tabelas existentes**. Ele cria apenas `admin_users` e
`maintenance_messages` (via migration).

```bash
# gera o client do Prisma
npm run prisma:generate

# aplica as migrations em desenvolvimento (cria o banco se necessário)
npm run prisma:migrate

# em produção (aplica migrations já versionadas, sem prompts)
npm run prisma:deploy

# valida o schema
npm run prisma:validate
```

### Índices

A tabela `maintenance_messages` possui um índice composto
`(active, start_at, end_at)` para tornar a consulta pública
(`active = true AND start_at <= now AND end_at >= now`) eficiente, além de
índices individuais em `start_at` e `end_at`.

### Timezone

- O banco armazena `TIMESTAMPTZ` (instantes absolutos).
- O painel envia **data** e **hora** separadas; o backend converte para UTC
  usando `APP_TIMEZONE` (`America/Sao_Paulo` por padrão), inclusive em
  horário de verão.
- A API pública responde ISO 8601 **com offset**, por exemplo
  `2026-09-20T22:00:00-03:00`.

---

## Criar usuário administrador inicial

```bash
npm run prisma:seed
```

O seed:

1. verifica se o usuário (`ADMIN_EMAIL`) já existe;
2. se não existir, cria com `ADMIN_NAME`;
3. gera o hash da senha com **bcrypt** (12 rounds);
4. nunca armazena a senha em texto puro.

Para redefinir a senha, use o painel em `/admin/settings`.

---

## Executar a aplicação

```bash
# desenvolvimento (hot reload)
npm run dev

# produção
npm run build
npm run start
```

Aplicação em `http://localhost:3000`.

---

## Acessar o painel

Abra `http://localhost:3000/admin/login` e entre com as credenciais do seed
(por padrão `admin@localhost` / `admin123`).

Fluxo completo disponível no painel:

1. Login
2. Dashboard (manutenção atual, próxima manutenção, total e últimas)
3. Nova manutenção (com pré-visualização em tempo real)
4. Editar manutenção
5. Ativar / desativar na lista
6. Excluir (com confirmação)
7. Configurações → alterar senha
8. Sair

---

## Contrato da API Pública

O contrato foi pensado para ser **estável**. Os nomes dos campos são sempre em
português.

### `GET /api/maintenance`

Retorna a manutenção ativa **no momento da consulta**.

Manutenção ativa:

```json
{
  "ativo": true,
  "inicio": "2026-09-20T22:00:00-03:00",
  "fim": "2026-09-20T23:30:00-03:00",
  "titulo": "Manutenção programada",
  "mensagem": "O sistema ficará indisponível durante este período."
}
```

Nenhuma manutenção:

```json
{
  "ativo": false,
  "inicio": null,
  "fim": null,
  "titulo": null,
  "mensagem": null
}
```

### `GET /api/maintenance/next`

Retorna a próxima manutenção habilitada que ainda não começou
(`active = true AND startAt > agora`, ordenado por `startAt` ascendente).

```json
{
  "ativo": false,
  "inicio": "2026-09-20T22:00:00-03:00",
  "fim": "2026-09-20T23:30:00-03:00",
  "titulo": "Manutenção programada",
  "mensagem": "O sistema ficará indisponível durante este período."
}
```

> Em `/next`, `ativo` é sempre `false`: a próxima manutenção, por definição,
> ainda não começou. A presença de uma próxima manutenção é indicada por
> `inicio` não nulo.

Se não houver próxima manutenção, todos os campos são `null`.

### `GET /api/maintenance/:id`

Retorna uma manutenção específica **pelo ID**, sem autenticação e
**independentemente da janela de início/fim** (e do flag `active`). Útil para
renderizar um aviso específico em outro sistema a partir de um ID conhecido.

O campo `ativo` continua sendo calculado pela regra real
(`active && startAt <= agora && endAt >= agora`), então vem `true` apenas se a
manutenção estiver acontecendo neste instante.

```json
{
  "ativo": false,
  "inicio": "2026-09-19T23:59:00-03:00",
  "fim": "2026-09-20T02:00:00-03:00",
  "titulo": "Migração de servidor programada",
  "mensagem": "Informamos que será realizada uma migração programada..."
}
```

Se o ID não existir, retorna `404`:

```json
{ "error": "NOT_FOUND", "message": "Manutenção não encontrada." }
```

A resposta da API pública **nunca** inclui `id`, `createdAt` ou `updatedAt`.

### Consumo em JavaScript

```js
fetch("https://api.exemplo.com/api/maintenance")
  .then((response) => response.json())
  .then((data) => {
    if (data.ativo) {
      console.log(data.titulo);
      console.log(data.mensagem);
    }
  });
```

### Aliases de entrada

Por compatibilidade, o backend aceita aliases em inglês no **corpo** das
requisições administrativas:

| Aliases aceitos                               | Campo canônico |
| --------------------------------------------- | -------------- |
| `start`, `inicio`                             | `startAt`      |
| `end`, `fim`                                  | `endAt`        |
| `message`, `mensagem`                         | `message`      |
| `title`, `titulo`                             | `title`        |
| `active`, `ativo`, `enabled`                  | `active`       |

As **respostas** sempre usam `ativo`, `inicio`, `fim`, `titulo`, `mensagem`.

---

## Documentação dos endpoints

### `GET /health`

- **Finalidade:** health check.
- **Autenticação:** não.
- **Resposta 200:**

```json
{
  "status": "ok",
  "service": "maintenance-api",
  "timestamp": "2026-09-18T23:00:00.000Z"
}
```

```bash
curl http://localhost:3000/health
```

---

### `GET /api/maintenance`

- **Finalidade:** manutenção ativa agora.
- **Autenticação:** não.
- **Parâmetros:** nenhum.
- **Resposta 200:** contrato acima.

```bash
curl http://localhost:3000/api/maintenance
```

---

### `GET /api/maintenance/next`

- **Finalidade:** próxima manutenção ainda não iniciada.
- **Autenticação:** não.
- **Resposta 200:** contrato acima.

```bash
curl http://localhost:3000/api/maintenance/next
```

---

### `GET /api/maintenance/:id`

- **Finalidade:** obter uma manutenção pelo ID, ignorando a janela de
  início/fim e o flag `active`.
- **Autenticação:** não.
- **Parâmetros:** `id` na URL.
- **Resposta 200:** contrato público (`ativo`, `inicio`, `fim`, `titulo`,
  `mensagem`); `ativo` calculado pela janela real.
- **Erros:** `404 NOT_FOUND`.

```bash
curl http://localhost:3000/api/maintenance/<id>
```

---

### `POST /api/auth/login`

- **Finalidade:** autenticar o administrador.
- **Autenticação:** não (protegido por rate limit de 5 tentativas / 15 min / IP).
- **Body:**

```json
{ "email": "admin@localhost", "password": "admin123" }
```

- **Resposta 200:** `{ "message": "Login realizado com sucesso.", "user": { "id", "name", "email" } }`
  e cookie `maintenance_auth` `HttpOnly`.
- **Erros:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `429 TOO_MANY_REQUESTS`.

```bash
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"admin@localhost","password":"admin123"}' \
  http://localhost:3000/api/auth/login
```

---

### `POST /api/auth/logout`

- **Finalidade:** encerrar a sessão e limpar o cookie.
- **Autenticação:** não.
- **Resposta 200:** `{ "message": "Logout realizado com sucesso." }`

```bash
curl -i -b cookies.txt -X POST http://localhost:3000/api/auth/logout
```

---

### `GET /api/auth/me`

- **Finalidade:** retornar o usuário autenticado.
- **Autenticação:** cookie `maintenance_auth`.
- **Resposta 200:** `{ "authenticated": true, "user": { "id", "name", "email" } }`
- **Erros:** `401 UNAUTHORIZED`.

```bash
curl -b cookies.txt http://localhost:3000/api/auth/me
```

---

### `POST /api/auth/change-password`

- **Finalidade:** alterar a própria senha.
- **Autenticação:** cookie `maintenance_auth`.
- **Body:**

```json
{
  "currentPassword": "admin123",
  "newPassword": "NovaSenha123",
  "confirmPassword": "NovaSenha123"
}
```

- **Resposta 200:** `{ "message": "Senha alterada com sucesso." }`
- **Erros:** `400 VALIDATION_ERROR` (senha atual incorreta / confirmação diferente), `401 UNAUTHORIZED`.

```bash
curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"currentPassword":"admin123","newPassword":"NovaSenha123","confirmPassword":"NovaSenha123"}' \
  http://localhost:3000/api/auth/change-password
```

---

### `GET /api/admin/maintenance`

- **Finalidade:** listar manutenções.
- **Autenticação:** obrigatória.
- **Query:** `filter` = `all` (padrão) | `active` | `inactive` | `scheduled` | `ongoing` | `finished`.
- **Resposta 200:** `{ "items": [...], "total": n }` (ordenado por `startAt` desc).

```bash
curl -b cookies.txt "http://localhost:3000/api/admin/maintenance?filter=ongoing"
```

---

### `POST /api/admin/maintenance`

- **Finalidade:** criar manutenção.
- **Autenticação:** obrigatória.
- **Body (aceita datas ISO ou data/hora separadas):**

```json
{
  "title": "Manutenção programada",
  "message": "O sistema ficará indisponível.",
  "active": true,
  "startDate": "2026-09-20",
  "startTime": "22:00",
  "endDate": "2026-09-20",
  "endTime": "23:30"
}
```

- **Resposta 201:** objeto administrativo completo (com `id`, `status`, timestamps).
- **Erros:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `409 MAINTENANCE_CONFLICT`.

```bash
curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"title":"Manutenção","message":"Indisponível","active":true,"startDate":"2026-09-20","startTime":"22:00","endDate":"2026-09-20","endTime":"23:30"}' \
  http://localhost:3000/api/admin/maintenance
```

---

### `GET /api/admin/maintenance/:id`

- **Finalidade:** obter uma manutenção.
- **Autenticação:** obrigatória.
- **Erros:** `401 UNAUTHORIZED`, `404 NOT_FOUND`.

```bash
curl -b cookies.txt http://localhost:3000/api/admin/maintenance/<id>
```

---

### `PUT /api/admin/maintenance/:id`

- **Finalidade:** atualizar manutenção (total ou parcialmente).
- **Autenticação:** obrigatória.
- **Body:** mesmos campos do POST; todos opcionais, ao menos um deve ser enviado.
- **Erros:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `404 NOT_FOUND`, `409 MAINTENANCE_CONFLICT`.

```bash
curl -b cookies.txt -X PUT -H "Content-Type: application/json" \
  -d '{"title":"Novo título"}' \
  http://localhost:3000/api/admin/maintenance/<id>
```

> `PATCH /api/admin/maintenance/:id` também é aceito para atualizações parciais.

---

### `PATCH /api/admin/maintenance/:id/status`

- **Finalidade:** ativar/desativar sem editar toda a manutenção.
- **Autenticação:** obrigatória.
- **Body:** `{ "active": true }`
- **Resposta 200:** objeto atualizado.
- **Erros:** `400`, `401`, `404`, `409` (ao ativar com conflito).

```bash
curl -b cookies.txt -X PATCH -H "Content-Type: application/json" \
  -d '{"active":false}' \
  http://localhost:3000/api/admin/maintenance/<id>/status
```

---

### `DELETE /api/admin/maintenance/:id`

- **Finalidade:** excluir manutenção.
- **Autenticação:** obrigatória.
- **Resposta 200:** `{ "message": "Manutenção excluída com sucesso." }`
- **Erros:** `401 UNAUTHORIZED`, `404 NOT_FOUND`.

```bash
curl -b cookies.txt -X DELETE http://localhost:3000/api/admin/maintenance/<id>
```

---

### `GET /api/admin/dashboard`

- **Finalidade:** dados do dashboard (atual, próxima, total, recentes).
- **Autenticação:** obrigatória.

```bash
curl -b cookies.txt http://localhost:3000/api/admin/dashboard
```

---

## Regras de negócio

1. Uma manutenção só é considerada **ativa** se
   `active === true && startAt <= agora && endAt >= agora`.
2. `endAt` deve ser estritamente maior que `startAt`.
3. Não são permitidas duas manutenções **ativas** com períodos sobrepostos
   (`startAt < outro.endAt && endAt > outro.startAt` → HTTP 409).
   Na edição, a própria manutenção é ignorada.
4. Manutenção inativa não aparece na API pública.
5. Manutenção futura não aparece como atual.
6. Manutenção encerrada não aparece como atual.
7. A API pública sempre responde HTTP 200 quando a consulta funciona,
   mesmo sem manutenção.
8. Erros internos retornam HTTP 500 com mensagem genérica.

### Status calculado (não armazenado)

| Condição                        | Status      |
| ------------------------------- | ----------- |
| `active = false`                | Inativa     |
| `active = true` e `now < start` | Programada  |
| `active = true` e no intervalo  | Em andamento|
| `active = true` e `now > end`   | Encerrada   |

---

## Testes

Os testes usam **Vitest + Supertest** e exigem um PostgreSQL de testes.

```bash
# crie um banco de testes e aplique as migrations
export TEST_DATABASE_URL="postgresql://usuario:senha@localhost:5432/maintenance_api_test"
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy

# execute
TEST_DATABASE_URL="$TEST_DATABASE_URL" npm test
```

Cobertura: health, login válido/inválido, acesso sem autenticação, criação,
edição, ativação/desativação, exclusão, API pública (ativa/futura/encerrada/
inativa/vazia), `/next`, conflito de períodos e validação `endAt <= startAt`.

---

## Segurança

- Helmet (CSP restritiva, headers de segurança).
- CORS configurável por `CORS_ORIGIN` (múltiplas origens separadas por vírgula;
  nunca usa `*` com credenciais).
- Rate limit: 5 tentativas de login por IP a cada 15 minutos (HTTP 429).
- Rate limit leve na API pública.
- Senhas com bcrypt (12 rounds); nunca retornadas (`passwordHash` nunca sai).
- JWT em cookie `HttpOnly`, `SameSite=Lax`, `Secure` em produção.
- JWT nunca é devolvido no corpo JSON.
- Validação de entrada com Zod em todas as rotas relevantes.
- Middleware global de erro; stack trace nunca exposta em produção.
- `x-powered-by` desabilitado.

---

## Deploy em produção

Exemplo em Ubuntu Server com PostgreSQL local e PM2.

```bash
# 1. Dependências de sistema
sudo apt update
sudo apt install -y nodejs npm postgresql nginx

# 2. Código e dependências
cd /var/www/maintenance-api
npm ci

# 3. Variáveis de produção
cp .env.example .env
# NODE_ENV=production
# JWT_SECRET=<segredo forte de 32+ caracteres>
# ADMIN_PASSWORD=<senha forte>
# CORS_ORIGIN=https://meu-dominio.com
# DATABASE_URL=postgresql://...
# COOKIE Secure é ativado automaticamente com NODE_ENV=production

# 4. Banco
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed

# 5. Build e processo
npm run build
sudo npm i -g pm2
pm2 start dist/server.js --name maintenance-api
pm2 save
pm2 startup
```

### Nginx como reverse proxy

```nginx
server {
    listen 443 ssl;
    server_name meu-dominio.com;

    ssl_certificate     /etc/letsencrypt/live/meu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/meu-dominio.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> Use HTTPS em produção: com `NODE_ENV=production` o cookie de sessão passa a
> ser `Secure`.

### Checklist de produção

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` forte (32+ caracteres)
- [ ] `ADMIN_PASSWORD` forte e alterada via `/admin/settings`
- [ ] Cookie `Secure` (automático em produção)
- [ ] `CORS_ORIGIN` restrito aos domínios reais
- [ ] HTTPS ativo
- [ ] PostgreSQL com backups regulares (`pg_dump`)
- [ ] PM2 configurado para reiniciar no boot
- [ ] Logs monitorados (`pm2 logs maintenance-api`)

### Backup do banco

```bash
pg_dump "$DATABASE_URL" -Fc -f backup-$(date +%F).dump
```

---

## Docker (opcional)

O uso de Docker não é obrigatório. Se preferir, um exemplo mínimo:

```bash
docker run -d --name maintenance-pg \
  -e POSTGRES_USER=maintenance \
  -e POSTGRES_PASSWORD=maintenance \
  -e POSTGRES_DB=maintenance_api \
  -p 5432:5432 postgres:16-alpine
```

Depois utilize a `DATABASE_URL` correspondente no `.env`.

---

## OpenAPI

O contrato completo está em [`openapi.yaml`](./openapi.yaml) na raiz do
projeto. Ele documenta a API pública e a administrativa e pode ser importado
em ferramentas como Swagger Editor, Postman ou Insomnia.

---

## Licença

MIT — veja [`LICENSE`](./LICENSE).
# avisosManutencao
