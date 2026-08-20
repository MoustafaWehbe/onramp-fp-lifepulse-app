# Frontend Migration — Life-Compass → Monorepo

This document describes the integration of the **Kultivar / Life-Compass** frontend design into `packages/web`, while keeping the existing monorepo auth API untouched.

## What changed

### Design system
- **Brand:** Kultivar (life-area habit tracker)
- **Fonts:** Inter + JetBrains Mono (loaded in `index.html`)
- **Colors:** OKLCH tokens with life-area palette (`health`, `career`, `spirit`, `social`, `learning`, `creative`)
- **Tailwind:** Extended `tailwind.config.js` + replaced `globals.css`

### Architecture
| Life-Compass (source) | Monorepo (target) |
|---|---|
| TanStack Router | **React Router v6** (unchanged in monorepo) |
| TanStack Start / Lovable | **Not used** — plain Vite SPA |
| `@/lib/store` (localStorage) | Same — hardcoded seed + localStorage |
| Cookie/session auth | **Existing `AuthProvider` + `api-client`** |

### Auth (unchanged backend integration)
These files were **not modified** in the API package. Frontend auth wiring is unchanged:
- `packages/web/src/providers/AuthProvider.tsx` — still calls `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/register`
- `packages/web/src/lib/api-client.ts` — cookie-based JWT + refresh interceptor

Login/Register pages were **restyled** to match Kultivar but still use `useAuth()` → existing endpoints.

### New files

```
packages/web/src/
├── components/
│   ├── app-shell.tsx          # Sidebar, mobile nav, PageHeader, AiPanel
│   ├── confirm-dialog.tsx
│   └── ui/
│       ├── alert-dialog.tsx
│       └── sonner.tsx
├── lib/
│   └── store.tsx              # Hardcoded habits/areas/check-ins (localStorage)
├── pages/
│   ├── Landing.tsx
│   ├── Today.tsx
│   ├── Progress.tsx
│   ├── Profile.tsx
│   ├── Onboarding.tsx
│   ├── AreaDetail.tsx
│   └── dashboard/Dashboard.tsx  # Replaced starter-kit dashboard
└── routes/
    └── GuestRoute.tsx         # Redirect authenticated users away from /login
```

### Modified files
- `package.json` — added `sonner`, `recharts`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-slot`
- `tailwind.config.js`, `globals.css`, `index.html`
- `App.tsx` — wraps app with `AppStateProvider` + `Toaster`
- `routes/index.tsx`, `ProtectedRoute.tsx`
- `pages/auth/Login.tsx`, `pages/auth/Register.tsx` — Kultivar styling
- `pages/NotFound.tsx`
- `components/ui/button.tsx` — added `asChild` for Radix

### Removed files (replaced by Kultivar layout)
- `layouts/AppLayout.tsx`, `layouts/AuthLayout.tsx`
- `components/layout/Header.tsx`, `components/layout/Sidebar.tsx`
- `pages/dashboard/Settings.tsx`

## Routes

| Path | Access | Page |
|---|---|---|
| `/` | Public | Landing |
| `/login` | Guest only | Sign in (API auth) |
| `/register` | Guest only | Register (API auth) |
| `/dashboard` | Protected | Dashboard |
| `/today` | Protected | Daily check-in |
| `/progress` | Protected | Charts & streaks |
| `/profile` | Protected | Profile + local data reset |
| `/onboarding` | Protected | 4-step onboarding wizard |
| `/areas/:id` | Protected | Area detail + habits |

## Data model (frontend-only)

All habit/area/check-in data lives in **localStorage** (`habitgarden:v1`) via `AppStateProvider`. Demo seed data loads on first visit.

Auth user (name/email) comes from the **API** and is shown in the sidebar; profile form can also store extended fields locally.

## How to run

### Prerequisites
```bash
docker-compose up -d   # Postgres + Redis (for API)
cp .env.example .env
cd packages/api && npx sequelize-cli db:migrate
```

### Development (all packages)
From repo root:
```bash
npm install
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000 |

### Frontend only
```bash
cd packages/web
npm run dev
```
Note: Login requires the API running on `:3000` (Vite proxies `/api`).

### Production build
```bash
npm run build
# or
cd packages/web && npm run build
```

## Test accounts

There is no seeded login — register at `/register` and pick an account type
(personal or coach). Seeders only plant reference data, the goals catalogue:
```bash
cd packages/api && npx sequelize-cli db:seed:all
```

## What was intentionally excluded

- Lovable / TanStack Start / Nitro SSR
- `@lovable.dev/vite-tanstack-config`
- Lovable error reporting
- Backend changes to auth routes or services
