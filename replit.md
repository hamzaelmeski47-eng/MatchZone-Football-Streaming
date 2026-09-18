# MatchZone

MatchZone is a football streaming frontend with a secured MySQL REST API for accounts, fixtures, teams, competitions, favorites, streams, and notifications.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server using the configured `PORT`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required backend env: `DATABASE_URL` (MySQL URL), `JWT_SECRET` (32+ character secret), and `PORT`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + TypeScript
- DB: MySQL 8+ via `mysql2`
- Validation: Zod
- Authentication: JWT access tokens + bcrypt password hashes
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/matchzone` — React/Vite frontend
- `artifacts/api-server/src/config` — environment validation
- `artifacts/api-server/src/database` — MySQL pool and schema initialization
- `artifacts/api-server/src/models` — database query models
- `artifacts/api-server/src/controllers` — request handlers
- `artifacts/api-server/src/routes` — REST route registration
- `artifacts/api-server/src/middlewares` — validation, JWT authentication, authorization, and error handling
- `artifacts/api-server/.env.example` — required local environment variable names

## Architecture decisions

- The API server owns MySQL access directly through a bounded `mysql2` connection pool; it does not import the workspace's PostgreSQL/Drizzle library.
- The server validates `DATABASE_URL` and requires `JWT_SECRET` at startup so it cannot silently run against the wrong database or an insecure fallback secret.
- Authenticated request identity is derived from the verified JWT and authorization for admin writes is enforced in route middleware.
- Tables are initialized idempotently on startup with foreign keys and indexes; no application password or secret is stored in source.

## Product

The frontend provides MatchZone's fan experience. The REST API exposes account registration/login, current-user profile access, matches/live matches, match events and lineups, teams, competitions, favorites, protected match streams, and user notifications.

## User preferences

- Backend requested with Node.js, Express, TypeScript, MySQL, JWT, and bcrypt.

## Gotchas

- The existing workspace-managed `DATABASE_URL` is PostgreSQL in the current environment; the MatchZone API intentionally refuses it and requires a MySQL URL.
- `JWT_SECRET` was not provided, so the API workflow will not start until it is configured as a secret.

## Pointers

- See `artifacts/api-server/src/database/schema.sql` for the human-readable table reference.
- See the `artifacts/api-server` package scripts for typechecking and bundling.
