# KULTIVAR / LifePulse — Work Split (3 Engineers)

This is the build plan for taking the app from "auth works + frontend prototype
on localStorage" to a fully persisted product, then adding AI.

See [`ERD.md`](./ERD.md) for the data model these tasks implement.

## Where we are today

- **Done:** authentication is live — `users`, `sessions`, `refresh_tokens` are
  migrated and login/register/refresh work end-to-end.
- **Prototype only:** the rest of the app (life areas, habits, check-ins,
  profile, goals) currently lives in browser `localStorage` via
  [`packages/web/src/lib/store.tsx`](../packages/web/src/lib/store.tsx). The job
  is to replace that with real API + database persistence.

## Day 0 — shared kickoff (all three, ~half day)

Agree on the foundations together so the three slices fit cleanly:

1. **API data-fetching layer** — pick and set up the client approach (e.g.
   TanStack Query on top of the existing `apiClient` in
   [`packages/web/src/lib/api-client.ts`](../packages/web/src/lib/api-client.ts))
   that will replace the `localStorage` store.
2. **Migration ordering** — `user_profiles` / `goals` → `life_areas` → `habits`
   → `habit_checkins` so foreign keys resolve in order.
3. **Shared conventions** — response envelope (`{ data }`), error shape, Zod
   validation pattern, and where Sequelize models live in
   `packages/shared/db/models`.

## The three slices

Each engineer owns one vertical slice end-to-end (migration + model + API +
frontend wiring). The work is sized to be roughly equal.

### Engineer A — Identity & Profile

Backend
- Migrations + models: `user_profiles` (1:1 with `users`), `goals`, `user_goals`.
- Seed the `goals` catalog (the list from Onboarding/Profile).
- Endpoints: `GET /api/profile`, `PUT /api/profile`, onboarding submit, and a
  `GET /api/goals` list.

Frontend
- Wire [`Onboarding.tsx`](../packages/web/src/pages/Onboarding.tsx) to persist
  profile + selected goals + initial areas through the API instead of `setProfile`.
- Wire [`Profile.tsx`](../packages/web/src/pages/Profile.tsx) to load/save from
  the API.

### Engineer B — Life Areas & Habits

Backend
- Migrations + models: `life_areas`, `habits`.
- CRUD endpoints: `/api/areas` (list/create/update/delete) and `/api/habits`
  (list/create/update/delete), scoped to the authenticated user.

Frontend
- Wire the [`Dashboard`](../packages/web/src/pages/dashboard/Dashboard.tsx) and
  [`AreaDetail.tsx`](../packages/web/src/pages/AreaDetail.tsx) pages to the API.
- Replace `addArea` / `updateArea` / `removeArea` / `addHabit` / `updateHabit` /
  `removeHabit` store calls with API mutations.

### Engineer C — Check-ins & Progress

Backend
- Migration + model: `habit_checkins` with unique `(habit_id, checkin_date)`.
- Endpoint: toggle a check-in for a habit on a date (create/delete).
- Aggregation endpoints for streaks and completion percentages.

Frontend
- Wire [`Today.tsx`](../packages/web/src/pages/Today.tsx) check-in toggling to
  the API (replace `toggleCheckin` / `isChecked`).
- Wire [`Progress.tsx`](../packages/web/src/pages/Progress.tsx) stats/charts to
  the aggregation endpoints.

## Dependency notes

- A's `goals` + `user_profiles` and B's `life_areas` can start in parallel after
  Day 0.
- B's `habits` depends on `life_areas` existing; C's `habit_checkins` depends on
  `habits`. Coordinate the migration merge order accordingly.
- Frontend wiring per slice can proceed against each engineer's own endpoints
  without blocking the others.

## Phase 2 — AI integration (after CRUD is live)

The OpenAI client and `embeddings` BullMQ queue already exist in
`packages/shared` ([`ai/client.ts`](../packages/shared/ai/client.ts),
[`queue/types.ts`](../packages/shared/queue/types.ts)). Split the AI work along
the same ownership lines:

- **A — Suggestion generation:** `ai_suggestions` table + a generation service
  using `chatCompletion`, prompted from the user's profile + goals. Enqueue
  regeneration when the profile changes.
- **B — Suggestion UX:** surface suggestions in Onboarding / `AreaDetail`
  (accept → create a habit and set `accepted_habit_id`; dismiss → mark dismissed).
- **C — Embeddings & search:** `embeddings` table (pgvector) + the `embeddings`
  worker in `packages/workers` for habit de-duplication / semantic search.

## Summary table

| Engineer | Tables owned | Main API | Main frontend |
|----------|--------------|----------|----------------|
| A — Identity & Profile | `user_profiles`, `goals`, `user_goals` | `/api/profile`, `/api/goals` | Onboarding, Profile |
| B — Areas & Habits | `life_areas`, `habits` | `/api/areas`, `/api/habits` | Dashboard, AreaDetail |
| C — Check-ins & Progress | `habit_checkins` | check-in toggle + stats | Today, Progress |
| (Phase 2) A / B / C | `ai_suggestions`, `embeddings` | generation + embeddings worker | suggestion accept/dismiss UI |
