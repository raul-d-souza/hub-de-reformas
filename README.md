# 🏗️ Hub de Reformas

Plataforma completa para gerenciamento de obras, itens, fornecedores e cotações.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-green?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)

---

## 📋 Stack

| Tecnologia                   | Uso                         |
| ---------------------------- | --------------------------- |
| **Next.js 15** (App Router)  | Framework React com SSR/SSG |
| **React 19**                 | UI library                  |
| **TypeScript**               | Tipagem estática            |
| **Tailwind CSS**             | Estilos utilitários         |
| **Supabase** (Postgres)      | Banco de dados + Auth + RLS |
| **react-hook-form + Zod**    | Formulários + validação     |
| **Vitest + Testing Library** | Testes unitários            |
| **pnpm**                     | Gerenciador de pacotes      |
| **ESLint + Prettier**        | Linting e formatação        |
| **Husky + lint-staged**      | Pre-commit hooks            |
| **GitHub Actions**           | CI (lint + build + testes)  |

---

## 🚀 Quick Start

### 1. Pré-requisitos

- **Node.js** >= 18
- **pnpm** >= 9 (`npm install -g pnpm`)
- Conta no [Supabase](https://supabase.com) (free tier funciona)

### 2. Criar projeto no Supabase

1. Acesse [app.supabase.com](https://app.supabase.com) e crie um novo projeto.
2. Vá em **Settings → API** e copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon / public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configurar variáveis

```bash
cp .env.example .env.local
# Edite .env.local com as credenciais do Supabase
```

### 4. Aplicar migrations e seed

**Opção A — Via SQL Editor do Supabase:**

1. Abra o **SQL Editor** no dashboard do Supabase.
2. Cole e execute o conteúdo de `migrations/001_initial_schema.sql`.
3. Cole e execute o conteúdo de `seeds/seed.sql` (substitua o `v_owner_id` pelo UUID do seu usuário).

**Opção B — Via CLI:**

```bash
# Se tiver o psql instalado:
psql "$DATABASE_URL" < migrations/001_initial_schema.sql
psql "$DATABASE_URL" < seeds/seed.sql

# Ou via Supabase CLI:
supabase db push
```

### 5. Instalar e rodar

```bash
pnpm install
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### 6. Criar sua conta

1. Acesse `/signup` e crie uma conta com email/password.
2. Confirme o email (verifique a caixa de entrada — o Supabase envia email de confirmação).
3. Faça login em `/login`.

---

## 📁 Estrutura do Projeto

```
hub-de-reformas/
├── .github/workflows/ci.yml    # GitHub Actions CI
├── .husky/pre-commit            # Hook de pre-commit
├── migrations/
│   └── 001_initial_schema.sql   # Schema + RLS + triggers
├── seeds/
│   └── seed.sql                 # Dados de exemplo
├── public/assets/logo.svg       # Logo SVG
├── src/
│   ├── app/                     # App Router (páginas)
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Dashboard (/)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── auth/callback/route.ts  # OAuth callback
│   │   ├── projects/
│   │   │   ├── page.tsx         # Lista paginada
│   │   │   ├── new/page.tsx     # Criar projeto
│   │   │   └── [id]/
│   │   │       ├── page.tsx     # Detalhe + itens
│   │   │       └── quotes/page.tsx  # Cotações + comparador
│   │   └── suppliers/
│   │       ├── page.tsx         # Lista
│   │       └── new/page.tsx     # Cadastrar
│   ├── components/
│   │   ├── Header.tsx           # Navbar com logo
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx          # Nav lateral (opcional)
│   │   ├── ProjectCard.tsx
│   │   ├── ItemList.tsx         # CRUD inline de itens
│   │   └── QuoteComparisonModal.tsx
│   ├── hooks/useAuth.ts         # Hook de autenticação
│   ├── lib/
│   │   ├── supabaseClient.ts    # Client-side Supabase
│   │   ├── supabaseServer.ts    # Server-side Supabase
│   │   └── validations.ts       # Schemas Zod
│   ├── middleware.ts             # Refresh de sessão + proteção de rotas
│   ├── services/
│   │   ├── projects.ts
│   │   ├── items.ts
│   │   ├── suppliers.ts
│   │   └── quotes.ts
│   ├── types/database.ts        # Tipos TS do schema
│   └── __tests__/
│       ├── setup.ts
│       └── ProjectCard.test.tsx
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## 🔧 Scripts Disponíveis

| Script              | Descrição                          |
| ------------------- | ---------------------------------- |
| `pnpm dev`          | Inicia servidor de desenvolvimento |
| `pnpm build`        | Build de produção                  |
| `pnpm start`        | Serve o build de produção          |
| `pnpm lint`         | Executa ESLint                     |
| `pnpm format`       | Formata código com Prettier        |
| `pnpm format:check` | Verifica formatação                |
| `pnpm test`         | Executa testes com Vitest          |
| `pnpm test:watch`   | Testes em modo watch               |

---

## 🔒 Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. As políticas garantem:

### Profiles

- Usuários só leem/editam **seu próprio perfil**.

### Projects

```sql
-- Somente o owner pode ver/criar/editar/excluir seus projetos
CREATE POLICY "projects_select_own" ON public.projects
  FOR SELECT USING (auth.uid() = owner_id);
```

### Items

- Acesso vinculado ao owner do **projeto pai** (via subquery).

### Suppliers

- Cada usuário gerencia **seus próprios fornecedores**.

### Quotes

- Cotações são visíveis apenas para o **owner** que as criou.
- Ao marcar "Escolhida", as demais do mesmo projeto são desmarcadas.

> 💡 Todas as políticas estão definidas em `migrations/001_initial_schema.sql`.

---

## 🎨 Design System

| Token    | Valor     | Uso                                |
| -------- | --------- | ---------------------------------- |
| `navy`   | `#0B3D91` | Cor primária (textos, botões, nav) |
| `orange` | `#FF8C42` | Cor de acento (CTAs, destaques)    |
| Font     | **Inter** | Tipografia principal               |

As cores estão tokenizadas no `tailwind.config.ts` com variantes (50–900).

---

## 🚀 Deploy

### Vercel (recomendado)

1. Conecte o repositório no [Vercel](https://vercel.com).
2. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy automático a cada push na `main`.

### Outras plataformas

O projeto é um Next.js padrão — funciona em qualquer plataforma que suporte Node.js:

- Railway
- Render
- AWS Amplify
- Docker (use `next start` após `next build`)

---

## 🧪 Testes

```bash
# Rodar todos os testes
pnpm test

# Modo watch (desenvolvimento)
pnpm test:watch
```

O teste exemplo (`src/__tests__/ProjectCard.test.tsx`) verifica a renderização do componente `ProjectCard`.

---

## 📝 Modelo de Dados

```
auth.users (Supabase Auth)
  └── profiles (1:1)
        ├── projects (1:N)
        │     ├── items (1:N)
        │     └── quotes (1:N)
        │           └── suppliers (N:1)
        └── suppliers (1:N)
```

### Tabelas

| Tabela       | Descrição                                      |
| ------------ | ---------------------------------------------- |
| `profiles`   | Dados públicos do usuário (espelha auth.users) |
| `projects`   | Obras/reformas                                 |
| `items`      | Itens/materiais de uma obra                    |
| `suppliers`  | Fornecedores cadastrados                       |
| `quotes`     | Cotações vinculadas a supplier + project       |
| `audit_logs` | Log de ações (opcional)                        |

---

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit: `git commit -m 'feat: minha feature'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

MIT © Hub de Reformas
