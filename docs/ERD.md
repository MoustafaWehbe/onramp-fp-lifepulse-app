# KULTIVAR / LifePulse — Entity Relationship Diagram

Production-ready data model for the full product: authentication, user profile &
goals, life areas, habits, daily check-ins, and the AI suggestion / embedding
layer.

> How to view this diagram
>
> - It renders automatically on GitHub and in the Cursor / VS Code Markdown
>   preview.
> - To export a drawn image (PNG/SVG) to show colleagues, copy the `mermaid`
>   block below into <https://mermaid.live> and use **Actions → Export**.

## Legend

- **Already built** (live in the database today, do not modify the schema):
  `users`, `sessions`, `refresh_tokens` — see
  [`packages/api/src/migrations/20240101000000-create-auth-tables.js`](../packages/api/src/migrations/20240101000000-create-auth-tables.js).
  Login already works end-to-end.
- **To build** (everything that hangs off `users`): `user_profiles`, `goals`,
  `user_goals`, `life_areas`, `habits`, `habit_checkins`, `ai_suggestions`,
  `embeddings`.

The only change touching the existing tables is new foreign keys pointing at
`users.id`. Nothing about `users` / `sessions` / `refresh_tokens` itself changes.

## Diagram

```mermaid
erDiagram
    users ||--o| user_profiles : has
    users ||--o{ sessions : opens
    users ||--o{ refresh_tokens : issues
    sessions ||--o{ refresh_tokens : scopes
    users ||--o{ user_goals : selects
    goals ||--o{ user_goals : chosen_in
    users ||--o{ life_areas : owns
    life_areas ||--o{ habits : groups
    users ||--o{ habits : owns
    habits ||--o{ habit_checkins : logged_as
    users ||--o{ ai_suggestions : receives
    life_areas ||--o{ ai_suggestions : targets
    ai_suggestions |o--o| habits : accepted_into

    users {
        uuid id PK
        string email UK
        string password_hash
        string name
        enum role "admin|user"
        boolean email_verified
        timestamp created_at
        timestamp updated_at
    }
    user_profiles {
        uuid id PK
        uuid user_id FK,UK
        int age
        string job_title
        smallint stress_level "1-10"
        numeric sleep_hours
        boolean onboarded
        timestamp created_at
        timestamp updated_at
    }
    goals {
        uuid id PK
        string slug UK
        string label
    }
    user_goals {
        uuid id PK
        uuid user_id FK
        uuid goal_id FK
        timestamp created_at
    }
    life_areas {
        uuid id PK
        uuid user_id FK
        string name
        string color
        string description
        int sort_order
        timestamp created_at
        timestamp updated_at
    }
    habits {
        uuid id PK
        uuid user_id FK
        uuid area_id FK
        string name
        enum frequency "daily|weekdays|3x|5x|weekly"
        string notes
        timestamp archived_at
        timestamp created_at
        timestamp updated_at
    }
    habit_checkins {
        uuid id PK
        uuid habit_id FK
        uuid user_id FK
        date checkin_date
        timestamp created_at
    }
    ai_suggestions {
        uuid id PK
        uuid user_id FK
        uuid area_id FK
        string suggested_name
        string rationale
        enum frequency "daily|weekdays|3x|5x|weekly"
        enum status "pending|accepted|dismissed"
        uuid accepted_habit_id FK
        string model
        timestamp created_at
        timestamp updated_at
    }
    embeddings {
        uuid id PK
        string entity_type
        uuid entity_id
        text content
        vector embedding "1536 dim"
        timestamp created_at
    }
    sessions {
        uuid id PK
        uuid user_id FK
        text user_agent
        string ip_address
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }
    refresh_tokens {
        uuid id PK
        uuid user_id FK
        uuid session_id FK
        string token_hash UK
        timestamp expires_at
        timestamp revoked_at
        timestamp created_at
        timestamp updated_at
    }
```

## Entity notes

### Already built

| Table | Purpose | Key constraints |
|-------|---------|-----------------|
| `users` | Account + auth identity | `email` unique; `role` enum `admin\|user`; UUID PK via `gen_random_uuid()` |
| `sessions` | One row per active login | `user_id` FK → `users` `ON DELETE CASCADE` |
| `refresh_tokens` | Rotating refresh tokens | `token_hash` unique; FKs to `users` and `sessions`, both `ON DELETE CASCADE` |

### To build — core domain

| Table | Purpose | Key constraints |
|-------|---------|-----------------|
| `user_profiles` | 1:1 extension of `users` with onboarding/wellbeing data (age, job title, stress 1-10, sleep hours, onboarded flag) | `user_id` FK **unique** (enforces 1:1); `ON DELETE CASCADE` |
| `goals` | Catalog of selectable goals (e.g. "Focus & Clarity", "Better Sleep") | `slug` unique; seeded reference data, shared across users |
| `user_goals` | M:N join — which goals a user picked | unique `(user_id, goal_id)`; both FKs `ON DELETE CASCADE` |
| `life_areas` | A user's life domains (Health, Career, Mind, …) | `user_id` FK `ON DELETE CASCADE`; `color` matches frontend area tokens; `sort_order` for display |
| `habits` | Habits grouped under a life area | FKs `user_id` + `area_id` (→ `life_areas`) `ON DELETE CASCADE`; `frequency` enum `daily\|weekdays\|3x\|5x\|weekly`; `archived_at` for soft delete |
| `habit_checkins` | One row per completed habit per day | unique `(habit_id, checkin_date)` (one check per day); FKs `ON DELETE CASCADE`; `user_id` denormalized for fast per-user queries |

### To build — AI layer

| Table | Purpose | Key constraints |
|-------|---------|-----------------|
| `ai_suggestions` | AI-generated habit suggestions per area (3-5 per area) with accept/dismiss workflow | FKs `user_id` + `area_id`; `status` enum `pending\|accepted\|dismissed`; `accepted_habit_id` FK → `habits` (nullable, set when accepted); `model` records which model produced it |
| `embeddings` | Vector store for semantic search / habit de-duplication | requires the `pgvector` extension; `embedding vector(1536)` (matches `text-embedding-3-small`); index on `(entity_type, entity_id)`; backs the `embeddings` BullMQ queue |

## Conventions

- All primary keys are `uuid` defaulting to `gen_random_uuid()`, consistent with
  the existing auth tables.
- All tables carry `created_at` / `updated_at` timestamps (Sequelize
  `timestamps: true`, `underscored: true`), except join/log rows that only need
  `created_at`.
- Every child table cascades on delete from its parent so removing a user (or an
  area, or a habit) cleans up dependent rows.
- `embeddings` needs `CREATE EXTENSION IF NOT EXISTS vector;` in its migration.
