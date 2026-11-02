# Environment variables

Four places. Neon is the odd one out: it supplies values rather than consuming
them.

| Where | Variables |
|---|---|
| Frontend, local | `NEXT_PUBLIC_API_MODE`, `NEXT_PUBLIC_API_URL` |
| Frontend, Vercel | the same two |
| Backend, local | `DB_PASSWORD` only; everything else defaults |
| Backend, Render | `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `CINEBOOK_CORS_ALLOWED_ORIGINS` |
| Neon | none |

Live URLs: frontend <https://screenbook.vercel.app>, API
<https://cinebook-67pa.onrender.com>.

---

## Frontend

The client reads exactly two variables, both in `src/services/apiConfig.ts`.

```
NEXT_PUBLIC_API_MODE   mock | live
NEXT_PUBLIC_API_URL    only read when the mode is live
```

`mock` means MSW intercepts requests in the browser and no backend is involved.
`live` means real HTTP to `NEXT_PUBLIC_API_URL`.

Local (`frontend/.env.local`, gitignored):

```
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_API_URL=http://localhost:8082
```

Vercel (Project Settings, Environment Variables):

```
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_API_URL=https://cinebook-67pa.onrender.com
```

`NEXT_PUBLIC_*` values are substituted into the bundle at build time, not read
at runtime. Changing one needs a dev-server restart locally and a redeploy on
Vercel. A page refresh will not do it.

## Backend

Every variable, with the default it falls back to:

| Variable | Default | Notes |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/cinebook` | JDBC form, not the `postgresql://` form Neon hands you |
| `DB_USERNAME` | `postgres` | |
| `DB_PASSWORD` | `postgres` | the only one local development has to set |
| `PORT` | `8082` | Render injects this; never set it yourself |
| `CINEBOOK_CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | comma separated |

Local development needs `DB_PASSWORD` and nothing else. Set it as a user-level
environment variable rather than per shell, and restart the terminal and the
IDE afterwards so they inherit it.

Render needs four:

```
DB_URL                         jdbc:postgresql://ep-blue-star-ban44ub9.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require
DB_USERNAME                    neondb_owner
DB_PASSWORD                    (from the Neon connection string)
CINEBOOK_CORS_ALLOWED_ORIGINS  http://localhost:3000,https://screenbook.vercel.app
```

Keep `http://localhost:3000` in that list permanently. It is what lets a local
frontend talk to the deployed API, which is the most useful debugging setup
available.

The odd name is Spring Boot's relaxed binding: the property
`cinebook.cors.allowed-origins` is set by uppercasing it and turning dots and
dashes into underscores.

## Neon

Nothing is configured on Neon. It hands out a connection string in libpq form:

```
postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require&channel_binding=require
```

Which splits into the three `DB_*` values above, with two changes:

- Prefix the host with `jdbc:postgresql://` and drop the user and password from
  the URL, since JDBC takes them separately.
- Drop `channel_binding`. It is a libpq parameter and the JDBC driver does not
  understand it. Keep `sslmode=require`.

Use the direct endpoint, not the one with `-pooler` in the hostname. HikariCP
already pools connections inside the application, and Neon's pooler is
PgBouncer in transaction mode, which adds nothing here and can interfere with
the driver's server-side prepared statements.

The `.env` written at the repository root by `neon init` is read by nothing in
this project. Spring Boot does not read `.env` files.

## Order of operations

Render needs the Vercel origin for CORS and Vercel needs the Render URL for the
API, so the first deployment is three steps rather than two:

1. Deploy the API. Note its Render URL.
2. Set `NEXT_PUBLIC_API_URL` to that URL on Vercel and deploy the frontend.
3. Add the Vercel origin to `CINEBOOK_CORS_ALLOWED_ORIGINS` on Render and save,
   which redeploys.

Between steps 2 and 3 the frontend loads and every API call is blocked by the
browser. That is expected, not a fault.
