# KULTIVAR — API Contracts

> **Swagger UI (full spec):** `http://localhost:3000/api/docs`  
> **Source of truth:** `packages/api/openapi.yaml`

## Status

| Group | Endpoints | Implemented |
|-------|-----------|-------------|
| Auth | 5 | Yes |
| Profile | 3 | Yes |
| Goals | 1 | Yes |
| Life Areas | 5 | Yes |
| Habits | 5 | Yes |
| Check-ins | 4 | Yes |
| Coaching | 16 | Yes |
| Health | 1 (`GET /health`) | Yes |

**Coaching adds 16 endpoints**; the groups above total 39 under `/api`, plus 1 health check.

---

## Conventions

- **Base URL:** `/api`
- **Auth:** HttpOnly cookies (`accessToken`, `refreshToken`) — use `withCredentials: true`
- **Success:** `{ "data": ... }`
- **Error:** `{ "error": "message" }`
- **Validation (422):** `{ "error": "Validation failed", "errors": [{ "field", "message" }] }`
- **IDs:** UUID v4 · **Dates:** ISO 8601
- **Timezone:** send `X-Timezone` (IANA, e.g. `America/New_York`) on check-in requests — used as the "today" boundary fallback when a habit has no explicit timezone of its own. Omitting it falls back to UTC.

---

## Endpoint Summary

### Auth
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/auth/register` | No | Does not set cookies — login after. Takes `role` — `user` or `coach`; a coach also sends `coachingTitle` (required) plus optional `bio`, `specialties`, `yearsExperience` |
| POST | `/auth/login` | No | Sets auth cookies |
| POST | `/auth/refresh` | Cookie | Rotates tokens |
| POST | `/auth/logout` | Yes | |
| GET | `/auth/me` | Yes | |

### Profile
| Method | Path | Auth |
|--------|------|------|
| GET | `/profile` | Yes |
| PATCH | `/profile` | Yes |
| PATCH | `/profile/onboarding` | Yes |

### Goals
| Method | Path | Auth |
|--------|------|------|
| GET | `/goals` | No |

### Life Areas
| Method | Path | Auth |
|--------|------|------|
| GET | `/areas` | Yes |
| POST | `/areas` | Yes |
| GET | `/areas/:id` | Yes |
| PATCH | `/areas/:id` | Yes |
| DELETE | `/areas/:id` | Yes |

### Habits
| Method | Path | Auth |
|--------|------|------|
| GET | `/habits` | Yes |
| POST | `/habits` | Yes |
| GET | `/habits/:id` | Yes |
| PATCH | `/habits/:id` | Yes |
| DELETE | `/habits/:id` | Yes |

### Check-ins
| Method | Path | Auth |
|--------|------|------|
| GET | `/check-ins` | Yes |
| GET | `/check-ins/today` | Yes |
| POST | `/check-ins` | Yes |
| DELETE | `/check-ins/:id` | Yes |

### Coaching
| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/coaches` | Any | Every coach is listed; there is no approval step |
| GET | `/coaches/:id` | Any | `:id` is the coach's **user** id |
| GET | `/coaches/me` | Coach | Own editable profile |
| PATCH | `/coaches/me` | Coach | |
| POST | `/coaches/me/credentials` | Coach | Self-reported, never verified |
| DELETE | `/coaches/me/credentials/:credentialId` | Coach | |
| POST | `/coach-requests` | User | Grants are `shareHabits`, `shareProfile`, `editHabits` (the last requires the first). Re-sending to an accepted coach updates sharing, keeps the relationship |
| GET | `/coach-requests/sent` | User | |
| PATCH | `/coach-requests/:id/sharing` | User | Change what a coach can see or do; effective immediately. Withdrawing `shareHabits` withdraws `editHabits` with it |
| DELETE | `/coach-requests/:id` | User | Ends it — access gone, feedback thread deleted |
| GET | `/coach-requests/received` | Coach | |
| PATCH | `/coach-requests/:id` | Coach | Accept or decline |
| GET | `/coach-requests/:id/client-data` | Coach | Only the sections granted. Habits come grouped under the client's life areas, with raw completion dates over a 30-day window |
| GET | `/coach-requests/:id/feedback` | Both | |
| POST | `/coach-requests/:id/feedback` | Coach | |
| PATCH | `/coach-requests/:id/habits/:habitId` | Coach | Needs the client's `editHabits` grant. Name/frequency/days/duration/difficulty/notes only — never reminders or the habit's area. Each change is recorded in the feedback thread |

---

## Domain Types (frontend reference)

```ts
type AreaColor = "health" | "career" | "spirit" | "social" | "learning" | "creative"
type Frequency = "daily" | "weekdays" | "3x" | "5x" | "weekly"

interface LifeArea { id, name, color: AreaColor, description? }
interface Habit { id, areaId, name, frequency: Frequency, durationMinutes?, notes?, reminderEnabled, reminderTime?, timezone?, daysOfWeek?: number[] /* 0=Sun..6=Sat, for 3x/5x/weekly */ }
// durationMinutes: how long the habit takes to do (display-only, e.g. "15 min" clock icon).
// reminderEnabled/reminderTime/timezone: opt-in notification pipeline for live-testing the
// worker (BullMQ) — unrelated to durationMinutes, shown with a bell icon.
interface CheckIn { id, habitId, date: "YYYY-MM-DD" } // DELETE soft-toggles (completed: false), doesn't destroy the row
interface Profile { name, email, ageRange?, profession?, industry?, educationLevel?, livingSituation?, lifestyleTypes[], stressSources[], dailyFreeTime?, energyPattern?, stressBaseline?, workloadIntensity?, motivationDriver?, failureResponse?, topValues[], identityStatements[], badHabits[], goals[], stressLevel?, sleepHours?, onboarded }
```

See Swagger for full request/response schemas and examples.

---

## For contributors

1. Start the API: `npm run dev --workspace=packages/api`
2. Open Swagger: `http://localhost:3000/api/docs`
3. Regenerate frontend types after spec changes:
   ```bash
   npm run gen:api-types --workspace=packages/web
   ```
