# CineBook

A cinema seat booking service built around one problem: when two people claim
the same seat at the same moment, exactly one must win.

The domain is the vehicle. The engineering is the point.

```
cinebook/
├── backend/            Java 21, Spring Boot 4, PostgreSQL, Flyway
├── frontend/           Next.js 16, TypeScript, Tailwind v4
├── docs/               API contract, architecture, design decisions
└── docker-compose.yml  local Postgres
```

## Status

| Part | State |
|---|---|
| API contract | Defined, see [docs/api-contract.md](docs/api-contract.md) |
| Frontend | In progress |
| Backend | In progress |

## Running locally

Postgres first, from the repository root. Local dev uses a throwaway database
whose password is `postgres`, so there is nothing to configure. Set `DB_PASSWORD`
in a `.env` only if you want to override it.

```bash
docker compose up -d
docker compose ps          # wait for "healthy"
```

Backend. Flyway applies the migrations on startup, so there is no separate
migrate step:

```bash
cd backend
./gradlew bootRun          # http://localhost:8082
```

On Windows PowerShell that is `.\gradlew.bat bootRun`, and `;` separates
commands rather than `&&`.

Frontend:

```bash
cd frontend
npm install
npm run dev                # http://localhost:3000
```

| | URL |
|---|---|
| API | http://localhost:8082/api |
| Swagger UI | http://localhost:8082/swagger-ui.html |
| Health | http://localhost:8082/actuator/health |

## Design decisions

See [docs/api-contract.md](docs/api-contract.md) for the full set. The short version:

- **Seat status is derived, never stored.** A seat is HELD only while an
  unconverted hold has `expires_at > now()`. Correctness does not depend on a
  cleanup job having run.
- **Optimistic locking (`@Version`) on the seat claim.** Two concurrent holds on
  one seat produce one `201` and one `409`.
- **Numeric IDs for catalogue data, UUIDv7 for holds and bookings.** A hold ID
  is a capability, so it has to be unguessable.
- **RFC 9457 problem details** for errors, with a distinct `type` URI per case
  so clients branch on a stable identifier rather than on prose.
- **Money as integer minor units.** Never a float.

## Architecture

_Diagram to come._
