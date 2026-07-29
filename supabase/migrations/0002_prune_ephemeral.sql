-- Ephemeral social cleanup: when a guest leaves (no heartbeat for the tenant's
-- configured TTL), drop their presence and delete their chats. Runs in the DB so it
-- holds at scale regardless of which Lambda is serving traffic.

create or replace function prune_social() returns void
language plpgsql
as $$
declare
  ttl_minutes int;
begin
  -- Per-tenant TTL from settings.social.sessionTtlMinutes (default 30).
  for ttl_minutes in
    select distinct coalesce((settings->'social'->>'sessionTtlMinutes')::int, 30) from tenants
  loop
    null; -- (kept simple; the delete below uses a per-row TTL lookup)
  end loop;

  -- Delete chat messages whose sender or recipient is no longer present.
  delete from chat_messages m
  using tenants t
  where m.tenant_id = t.id
    and (
      not exists (
        select 1 from participants p
        where p.tenant_id = m.tenant_id and p.code = split_part(m.conv, '~', 1)
      )
      or not exists (
        select 1 from participants p
        where p.tenant_id = m.tenant_id and p.code = split_part(m.conv, '~', 2)
      )
    );

  -- Delete stale participants (left the venue).
  delete from participants p
  using tenants t
  where p.tenant_id = t.id
    and p.last_seen < now() - (coalesce((t.settings->'social'->>'sessionTtlMinutes')::int, 30) || ' minutes')::interval;
end;
$$;

-- Schedule every 5 minutes via pg_cron (enable the extension in Supabase first:
-- Dashboard → Database → Extensions → pg_cron).
-- select cron.schedule('prune-social', '*/5 * * * *', 'select prune_social()');
