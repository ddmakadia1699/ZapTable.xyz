-- ZapTable — interested emails table migration
create table if not exists interested_emails (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  created_at  timestamptz not null default now()
);

alter table interested_emails enable row level security;
