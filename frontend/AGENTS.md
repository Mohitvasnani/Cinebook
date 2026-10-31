<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## CineBook frontend conventions

Part of the CineBook monorepo. The Spring Boot service lives in `../backend`,
and the contract both sides are built against is `../docs/api-contract.md`.
If a change here implies a change to the contract, update that file too.

### Stack
Next.js 16 (App Router, no `src/`), React 19, TypeScript strict, Tailwind v4 via
`@theme inline` in `app/globals.css`. Import alias `@/*`. MSW for the mock API.

### Rules
- **All data fetching is client-side.** Pages that load data are client
  components. The mock is a browser service worker, so a server-side fetch would
  bypass it and we would need two code paths instead of one.
- **Nothing calls `fetch` except `lib/api/client.ts`.** Components call `api.*`.
  This is what makes mock-to-live a single env var.
- **Errors are RFC 9457 problem details.** Catch `ApiError` and branch on
  `err.is("seat-unavailable")`, never on the message text.
- **Seat status is never stored.** It is derived from bookings and unexpired
  holds, mirroring the SQL in the contract. Do not add a status column to the
  mock or cache a seat's state in component state.
- **Money is integer minor units.** Format at the edge, never store a float.
- `cacheComponents` is deliberately off in `next.config.ts`. See the comment there.

### Layout
```
app/                 routes
components/          shared UI
lib/api/             types, client, config, problem details
lib/mock/            MSW handlers and the in-memory db
```

### Modes
`NEXT_PUBLIC_API_MODE=mock` intercepts requests in the browser and needs no
backend. `live` sends them to `NEXT_PUBLIC_API_URL`. Keep both working.
