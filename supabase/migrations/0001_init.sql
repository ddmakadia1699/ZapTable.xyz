-- Tavexa — multi-tenant schema (Supabase / Postgres)
-- Phase 1 foundation. Run against your Supabase project (SQL editor or `supabase db push`).
--
-- Tenancy: every venue is a tenant; every row carries tenant_id.
--
-- Auth: Supabase Auth. Admins are auth.users mapped to a tenant via admin_users.
-- Guest-facing writes (orders, social) go through AWS Lambda using the SERVICE-ROLE
-- key (bypasses RLS, scopes by tenant in code). Admin reads are additionally protected
-- by RLS policies keyed to the logged-in admin's tenant via auth.uid(), so even a
-- leaked anon key only ever exposes a venue to its own admins.

create extension if not exists pgcrypto;

-- ── Tenants (venues) ────────────────────────────────────────────────────
create table tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  address     text,
  currency    text not null default 'INR',
  -- Feature flags + reward/streak/level config the admin controls. Shape documented
  -- in docs/ARCHITECTURE.md (§ Settings). Defaults below mirror the current app.
  settings    jsonb not null default '{
    "features": {"ordering": true, "loyalty": true, "referral": true, "scratchReward": true, "social": false, "chat": false},
    "loyalty":  {"stampGoal": 8, "headStart": 2, "rewardTtlDays": 7},
    "scratch":  {"amount": 100, "amountOdds": 0.5, "freeItemOdds": 0.25},
    "referral": {"value": 50, "level2Value": 25},
    "streak":   {"enabled": true},
    "levels":   [{"name": "Bronze", "minVisits": 0}, {"name": "Silver", "minVisits": 5}, {"name": "Gold", "minVisits": 15}],
    "social":   {"sessionTtlMinutes": 30, "minAge": 18}
  }'::jsonb,
  created_at  timestamptz not null default now()
);

-- ── Admin users (many admins; roles per tenant) ─────────────────────────
-- auth_id references Supabase Auth's auth.users. A user can administer one tenant
-- here (extend to many with a join table later if needed).
create table admin_users (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid unique not null references auth.users(id) on delete cascade,
  email       text,
  tenant_id   uuid not null references tenants(id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner','manager','staff')),
  created_at  timestamptz not null default now()
);
create index on admin_users(tenant_id);

-- ── Menu ────────────────────────────────────────────────────────────────
create table menu_items (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  description text,
  price       numeric(10,2) not null default 0,
  category    text not null default 'Menu',
  available   boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index on menu_items(tenant_id);

-- ── Tables (QR targets) ─────────────────────────────────────────────────
-- token is the unguessable value embedded in the QR (issue it HMAC-signed). Orders
-- are only accepted for a (tenant, token) that exists — anti-spoofing.
create table venue_tables (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  label       text not null,
  token       text not null,
  created_at  timestamptz not null default now(),
  unique (tenant_id, token)
);
create index on venue_tables(tenant_id);

-- ── Orders ──────────────────────────────────────────────────────────────
create type order_status as enum ('received','preparing','ready','served');

create table orders (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  table_id    uuid references venue_tables(id) on delete set null,
  table_label text,
  guest_id    uuid,
  status      order_status not null default 'received',
  currency    text not null,
  total       numeric(10,2) not null default 0,
  reward_id   uuid,
  created_at  timestamptz not null default now()
);
create index on orders(tenant_id, created_at desc);
create index on orders(tenant_id, status);

create table order_lines (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  order_id      uuid not null references orders(id) on delete cascade,
  menu_item_id  uuid,
  name          text not null,
  price         numeric(10,2) not null,
  qty           int not null check (qty > 0)
);
create index on order_lines(order_id);

-- ── Guests (loyalty + referrals; phone-keyed per tenant) ────────────────
create table guests (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  phone         text not null,
  name          text,
  visits        int not null default 0,
  stamps        int not null default 0,
  stamp_goal    int not null default 8,
  code          text not null,
  referred_by   text,
  referrals     int not null default 0,
  created_at    timestamptz not null default now(),
  last_visit_at timestamptz not null default now(),
  unique (tenant_id, phone),
  unique (tenant_id, code)
);
create index on guests(tenant_id);

create table rewards (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  guest_id    uuid not null references guests(id) on delete cascade,
  label       text not null,
  kind        text not null check (kind in ('amount','freeItem','none')),
  value       numeric(10,2),
  expires_at  timestamptz not null,
  redeemed    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on rewards(guest_id);
create index on rewards(tenant_id);

-- ── Social layer: participants + 1:1 chat (ephemeral) ───────────────────
-- last_seen drives "here now"; a scheduled prune (pg_cron, see ARCHITECTURE.md)
-- deletes stale participants and their messages so chat disappears when guests leave.
create table participants (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  sid           text not null,
  name          text not null,
  code          text not null,
  ig_handle     text,
  open_to_chat  boolean not null default false,
  created_at    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  unique (tenant_id, sid),
  unique (tenant_id, code)
);
create index on participants(tenant_id, last_seen);

create table chat_messages (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  conv        text not null,
  from_code   text not null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index on chat_messages(tenant_id, conv, created_at);

create table chat_blocks (
  tenant_id     uuid not null references tenants(id) on delete cascade,
  blocker_code  text not null,
  blocked_code  text not null,
  created_at    timestamptz not null default now(),
  primary key (tenant_id, blocker_code, blocked_code)
);

-- ── RLS ─────────────────────────────────────────────────────────────────
-- Enable RLS on every table. Guest-facing writes go through the Lambda backend with
-- the service-role key (bypasses RLS). On top of that, admins authenticated via
-- Supabase Auth get read access scoped to their own tenant.
alter table tenants        enable row level security;
alter table admin_users    enable row level security;
alter table menu_items     enable row level security;
alter table venue_tables   enable row level security;
alter table orders         enable row level security;
alter table order_lines    enable row level security;
alter table guests         enable row level security;
alter table rewards        enable row level security;
alter table participants   enable row level security;
alter table chat_messages  enable row level security;
alter table chat_blocks    enable row level security;

-- Is the logged-in Supabase user an admin of this tenant?
create or replace function is_tenant_admin(tid uuid) returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from admin_users a where a.auth_id = auth.uid() and a.tenant_id = tid
  );
$$;

-- Admins see their own membership row(s).
create policy admin_self on admin_users
  for select using (auth_id = auth.uid());

-- Tenant config + durable data: visible to that tenant's admins.
create policy t_admin on tenants      for select using (is_tenant_admin(id));
create policy mi_admin on menu_items  for all using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));
create policy vt_admin on venue_tables for all using (is_tenant_admin(tenant_id)) with check (is_tenant_admin(tenant_id));
create policy o_admin  on orders      for select using (is_tenant_admin(tenant_id));
create policy ol_admin on order_lines for select using (is_tenant_admin(tenant_id));
create policy g_admin  on guests      for select using (is_tenant_admin(tenant_id));
create policy r_admin  on rewards     for select using (is_tenant_admin(tenant_id));

-- participants / chat_messages / chat_blocks have NO policies: they're guest-facing
-- and ephemeral, reachable only via the Lambda backend (service-role).
