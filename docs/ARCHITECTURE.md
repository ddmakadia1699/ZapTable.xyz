# ZapTable — Architecture (multi-tenant SaaS)

ZapTable is moving from a single-venue demo to a multi-tenant SaaS where many
restaurants, cafés and hotels each manage their own menu, tables, orders, loyalty
and social settings.

## Stack

| Layer | Choice |
| --- | --- |
| **Database** | **Supabase** (Postgres) |
| **Auth** | **Supabase Auth** (admins log in; JWT drives Postgres RLS) |
| **Backend API** | **AWS Lambda** + **API Gateway (HTTP API)** |
| **Menu ingestion** | **Claude** vision (`claude-opus-4-8`) — PDF/photo → structured menu |
| **Frontend** | Next.js PWA (guest + admin), hosted on AWS (Amplify or S3+CloudFront) |
| **Payments** | Stripe + Razorpay/UPI (funds settle to the venue) |
| **Realtime** | Polling today → Ably/AppSync later |

## Tenancy & trust model

- Every venue is a **tenant**; every row carries `tenant_id`. The URL slug → tenant.
- **Guest traffic** (ordering, social, chat) is unauthenticated and flows through
  **Lambda using the Supabase service-role key**, which **bypasses RLS** — so every
  query MUST scope by `tenant_id` in code. This is the "trusted backend" pattern.
- **Admin traffic** authenticates with **Supabase Auth**. The admin JWT is verified by
  a Lambda authorizer (HS256 via `SUPABASE_JWT_SECRET`), and Postgres **RLS** further
  restricts every durable table to the admin's own tenant via `is_tenant_admin()`.
- **Anti-spoof:** orders are only accepted for a `(tenant, table_token)` that exists;
  table tokens are unguessable and should be **HMAC-signed** (`TABLE_TOKEN_SECRET`).

## Data model

See `supabase/migrations/0001_init.sql`. Tables: `tenants`, `admin_users`,
`menu_items`, `venue_tables`, `orders`, `order_lines`, `guests`, `rewards`,
`participants`, `chat_messages`, `chat_blocks`. Ephemeral social data
(`participants`, `chat_messages`) is pruned by `prune_social()` (migration `0002`),
scheduled via pg_cron — so **chat disappears when guests leave**.

## Settings (admin-controlled) — `tenants.settings` JSONB

This is what powers "admin can turn features on/off and tune rewards, streaks, levels":

```jsonc
{
  "features": { "ordering": true, "loyalty": true, "referral": true,
                "scratchReward": true, "social": false, "chat": false },
  "loyalty":  { "stampGoal": 8, "headStart": 2, "rewardTtlDays": 7 },
  "scratch":  { "amount": 100, "amountOdds": 0.5, "freeItemOdds": 0.25 },
  "referral": { "value": 50, "level2Value": 25 },
  "streak":   { "enabled": true },
  "levels":   [ { "name": "Bronze", "minVisits": 0 },
                { "name": "Silver", "minVisits": 5 },
                { "name": "Gold",   "minVisits": 15 } ],
  "social":   { "sessionTtlMinutes": 30, "minAge": 18 }
}
```

The app reads these per request instead of today's hardcoded constants in `lib/store.ts`.

## Backend layout

- `lib/db/client.ts` — Supabase **service-role** client (server/Lambda only).
- `lambda/<name>/handler.ts` — one Lambda per area (orders, social, chat, admin,
  authorizer). Each imports the data layer and scopes by `tenant_id`.
- `infra/template.yaml` — AWS SAM: HTTP API + Lambdas (scaffold).

## Setup (when you're ready to wire it)

1. **Supabase:** create a project → SQL editor → run `supabase/migrations/0001_init.sql`
   then `0002_prune_ephemeral.sql`. Enable `pg_cron`, then
   `select cron.schedule('prune-social','*/5 * * * *','select prune_social()');`
   Copy URL + service-role key + JWT secret into `.env.local`.
2. **AWS:** `cd infra && sam build && sam deploy --guided` (pass the Supabase params).
   Put the output `ApiBaseUrl` into `NEXT_PUBLIC_API_BASE_URL`.
3. **Frontend:** point it at `NEXT_PUBLIC_API_BASE_URL`; add Supabase Auth login for admins.

## Roadmap (phased)

- **Phase 1 — Foundation (this commit):** schema, RLS, settings model, Supabase client,
  AWS SAM scaffold, this doc. _Demo app keeps running on the in-memory store._
- **Phase 2 — Data layer:** port `lib/store.ts` functions to a Supabase-backed repository
  (async), behind the same signatures.
- **Phase 3 — Lambda API:** move `app/api/*` logic into `lambda/*` handlers; deploy.
- **Phase 4 — Admin auth + onboarding:** Supabase Auth login, create-venue flow, map
  `admin_users`.
- **Phase 5 — Admin settings UI:** edit `tenants.settings` (toggles + rewards/streaks/
  levels); the app honors them.
- **Phase 6 — Hardening:** real payments (fake orders cost money), HMAC/rotating QR,
  rate limiting, chat moderation queue.
- **Phase 7 — Scale:** websockets (Ably/AppSync), analytics, multi-region.

> Phases 2–7 need your Supabase project + AWS account to wire and verify against real
> infrastructure — I can't run those here. Phase 1 artifacts are correct-by-construction
> and reviewable now.
