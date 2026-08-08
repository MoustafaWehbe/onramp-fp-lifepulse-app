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
| Health | 1 (`GET /health`) | Yes |

**22 API endpoints** under `/api` + 1 health check.

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
| POST | `/auth/register` | No | Does not set cookies — login after |
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
