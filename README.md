# Starter Kit

A full-stack TypeScript monorepo with everything pre-configured so you can focus on building features.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui |
| Backend | Express, Sequelize, Zod |
| Background Jobs | BullMQ, Redis |
| Database | PostgreSQL |
| Monorepo | Turborepo |
| Language | TypeScript (everywhere) |

## Project Structure

```
packages/
  web/        → React + Vite frontend (port 5173)
  api/        → Express REST API (port 3000)
  workers/    → BullMQ background job processors
  shared/     → Shared utilities (auth, db models, queue, AI)
```

## Getting Started

### 1. Prerequisites

- Node.js >= 20
- Docker (for PostgreSQL + Redis)

### 2. Install dependencies

```bash
npm install
```

### 3. Start infrastructure

```bash
docker compose up -d
```

Starts PostgreSQL and Redis only — see [Docker](#docker).

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 5. Run database migrations

```bash
cd packages/api
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all   # optional sample data
```

### 6. Start development servers

```bash
# Start all packages in parallel
npm run dev

# Or start individually
cd packages/api && npm run dev     # API on :3000
cd packages/web && npm run dev     # Web on :5173
cd packages/workers && npm run dev # Workers
```

## Available Scripts (root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all packages in watch mode |
| `npm run build` | Build all packages |
| `npm run test` | Run all test suites |
| `npm run lint` | Lint all packages |

## Environment Variables

See `.env.example` for all required variables.

## Testing

```bash
npm run test              # Run all tests
cd packages/api && npm test  # API unit tests (Jest)
cd packages/web && npm test  # Web tests (Vitest)
```

## Docker

Docker runs the two dependencies; the app itself always runs with
`npm run dev`.

- **PostgreSQL 16** on host port `5433` (mapped from `5432`, so it doesn't
  collide with a PostgreSQL installed directly on the machine)
- **Redis 7** on host port `6379`

```bash
docker compose up -d
```

There are deliberately no images for `api`, `web`, or `workers`. Containerising
the app is worth revisiting before a real deployment, and it needs one problem
solved first: `package-lock.json` is generated on Windows, so the only native
builds of `rollup`, `esbuild`, `lightningcss`, and `@tailwindcss/oxide` recorded
in it are the win32 ones ([npm/cli#4828]). npm won't re-resolve optional platform
dependencies against an existing lock, so on Linux `vite build` and `vitest`
fail. It's also why CI typechecks the frontend instead of building it. Settling
on one platform for generating the lockfile fixes all of it.

[npm/cli#4828]: https://github.com/npm/cli/issues/4828
