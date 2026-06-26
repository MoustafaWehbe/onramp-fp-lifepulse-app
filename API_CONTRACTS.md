# KULTIVAR — API Contracts

> **Swagger UI (full spec):** `http://localhost:3000/api/docs`  
> **Source of truth:** `packages/api/openapi.yaml`

## Status

| Group | Endpoints | Implemented |
|-------|-----------|-------------|
| Auth | 5 | Yes |
| Profile | 3 | No |
| Life Areas | 5 | No |
| Habits | 5 | No |
| Check-ins | 4 | No |
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
interface Habit { id, areaId, name, frequency: Frequency, notes? }
interface CheckIn { id, habitId, date: "YYYY-MM-DD" }
interface Profile { name, email, age?, jobTitle?, goals[], stressLevel?, sleepHours?, onboarded }
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
