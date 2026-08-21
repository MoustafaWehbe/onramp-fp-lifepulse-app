# KULTIVAR

A habit-tracking app built around **life areas** rather than a flat to-do list.
You group habits under the parts of your life you're trying to grow — health,
work, relationships — check in daily, and watch each area fill in over time.

Coaches are the second half of the product. A user invites a coach, chooses
exactly what to share, and can revoke it at any moment. Nothing about a user's
data is visible to a coach who wasn't explicitly granted it.

| Layer           | Technology                                              |
| --------------- | ------------------------------------------------------- |
| Frontend        | React 18, Vite, TanStack Query, Tailwind CSS, shadcn/ui |
| Backend         | Express, Sequelize, Zod, OpenAPI                        |
| Background jobs | BullMQ, Redis                                           |
| Database        | PostgreSQL 16                                           |
| AI              | OpenAI (habit suggestions)                              |
| Email           | Resend / Brevo, with a console provider for local dev   |
| Infrastructure  | AWS (CloudFront + S3 + EC2), provisioned with Pulumi    |
| Monorepo        | Turborepo, TypeScript everywhere                        |

## Features

**Life areas & habits.** Create areas, each with its own colour, and hang habits
off them. Habits carry a frequency (daily, weekdays, 3x, 5x, weekly), optional
explicit days of the week, a duration, and a difficulty. They can be archived
and restored rather than deleted, so history survives.

**Daily check-ins.** Check off habits for the day, with current and longest
streaks computed per habit. "Today" is resolved in the user's own timezone —
the browser sends its IANA zone on every request — so the day doesn't roll over
at UTC midnight for someone in Beirut.

**Onboarding & profile.** A questionnaire captures the context the AI layer
needs to make useful suggestions: age range, profession, living situation,
free time per day, energy pattern, stress baseline, motivation driver, and how
the user tends to respond to failure. Users pick from a seeded goal catalogue.

**Progress.** Per-area completion, streak history, and charts over time.

**AI habit suggestions.** Given a life area and the user's profile, the API asks
OpenAI for habits worth adding, returned as structured output validated against
a Zod schema. Previously dismissed suggestions are fed back into the prompt so
it stops proposing them. Rate-limited two ways: a per-user hourly cooldown
derived from the database, plus a request throttle that catches concurrent
clicks racing past that cooldown.

**Coaching.** A user searches coaches, sends a request, and attaches a
permission grant to it:

| Grant          | What the coach can see or do                          |
| -------------- | ----------------------------------------------------- |
| `shareHabits`  | Habits grouped by life area, and check-in consistency |
| `shareProfile` | Goals, lifestyle, and motivation details              |
| `editHabits`   | Rename a habit and change its frequency or duration   |

The flags belong to the requester — only they can set them, and they're read at
the moment the coach acts, so withdrawing one takes effect immediately.
`editHabits` requires `shareHabits`; the API refuses a grant to edit habits the
coach cannot see. Coaches leave threaded feedback, and every coach-made habit
change is written into the client's notes. Coaches have their own profile with
credentials, and are routed away from the habit-tracking half of the app
entirely — they have no data there.

**Notifications.** Per-habit email reminders, scheduled through BullMQ Job
Schedulers that fire on a cron pattern derived from the habit's frequency and
timezone. Users set quiet hours (a wall-clock window that may wrap past
midnight) and can unsubscribe from any email via a signed link. A daily sweep
emails users who have lapsed for 30 days, capped so nobody is re-emailed within
30 days of the last one. Reminders also surface as an in-app popup while the
app is open.

## Project structure

```
packages/
  web/        → React + Vite SPA (port 5173)
  api/        → Express REST API (port 3000)
  workers/    → BullMQ job processors: reminders, email, re-engagement
  shared/     → Sequelize models, auth, queue clients, AI, email templates
infra/        → Pulumi program: provisions AWS and deploys the app
docs/         → ERD and the original three-engineer work split
```

`shared` holds everything both the API and the workers need — most importantly
the Sequelize models, so there is exactly one definition of each table.

## Getting started

### Prerequisites

- Node.js >= 20
- Docker (for PostgreSQL and Redis)

### Setup

```bash
npm install
docker compose up -d          # PostgreSQL on :5433, Redis on :6379
cp .env.example .env          # then fill in the values you need
```

Everything in `.env` has a working local default except the optional
integrations — the app runs fine without `OPENAI_API_KEY` (no AI suggestions)
and without an email provider (emails are logged to the console instead of
sent).

### Database

```bash
cd packages/api
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all   # seeds the goal catalogue
```

### Run

```bash
npm run dev     # api, web and workers together
```

Or individually, from each package: `npm run dev` in `packages/api` (:3000),
`packages/web` (:5173), or `packages/workers`.

With `NODE_ENV` set to anything but `production`, the API serves interactive API
docs at <http://localhost:3000/api/docs>.

## Scripts

| Command                    | Description                                        |
| -------------------------- | -------------------------------------------------- |
| `npm run dev`              | Start all packages in watch mode                   |
| `npm run build`            | Build all packages                                 |
| `npm run test`             | Run all test suites                                |
| `npm run lint`             | Lint all packages                                  |
| `npm run format`           | Format with Prettier                               |
| `npm run preview:messages` | Render every email template to `message-previews/` |

Useful during a demo, since neither popup depends on real history:

- `/today?demo=welcome` forces the returning-user greeting
- `/today?demo=reminder` forces a habit reminder popup
- `npm run send:reengagement --workspace=@starter-kit/workers -- you@example.com`
  sends the lapsed-user email to one account on demand

## API

30 endpoints, documented in [`packages/api/openapi.yaml`](packages/api/openapi.yaml).
The frontend's types are generated from that spec rather than hand-written:

```bash
cd packages/web && npm run gen:api-types
```

Responses use a `{ data }` envelope; errors return `{ error }`.

**Auth** is a short-lived access token plus a rotating refresh token, both in
HttpOnly cookies. The API client retries once through `/auth/refresh` on a 401.
CSRF uses a double-submit cookie compared in constant time. Rate limits are
counted in Redis, so they hold across restarts and multiple instances.

## Testing

```bash
npm run test                        # everything
cd packages/api && npm test         # Jest, with coverage
cd packages/web && npm test         # Vitest
```

CI runs lint and tests on every pull request, against real PostgreSQL and Redis
service containers.

## Data model

See [`docs/ERD.md`](docs/ERD.md) for the full diagram. Migrations live in
[`packages/api/src/migrations/`](packages/api/src/migrations/) and run in
filename order.

## Deployment

Deployed to AWS with Pulumi — CloudFront and S3 for the SPA, a single EC2
instance running the API, the workers, and the datastores. From the repo root:

```bash
cd infra && pulumi up
```

That provisions infrastructure _and_ ships the app: the SPA is built locally and
synced to S3, and the API is updated on the instance over SSM. Push your commit
first — the instance pulls it from GitHub.

See [`infra/README.md`](infra/README.md) for the architecture, cost breakdown,
and operational commands.
