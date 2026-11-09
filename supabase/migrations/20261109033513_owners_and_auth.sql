-- =============================================================================
-- M1: owners and sign-in
--
-- What this migration makes true, in plain English:
--   * There is one workspace, Waterloo.
--   * It has at most two owners, written in once by a one-time bootstrap that
--     both owners approve, and never added to, removed, demoted or suspended
--     afterwards (G1, G2). Triggers enforce that here, below the app, so it
--     holds for the website, the API and raw SQL alike.
--   * Nothing comes out of the database without 2FA (aal2) on a sign-in
--     younger than 30 days.
--   * Each owner can make and use recovery codes for their own account only
--     (G4).
--
-- Every function is SECURITY DEFINER with an empty search_path (so nothing can
-- hijack a name it uses), and only the functions the app needs are callable by
-- signed-in users. tests/governance/G4.test.ts pins the full list, so adding a
-- new one shows up in review.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The workspace
-- -----------------------------------------------------------------------------

create function public.waterloo_workspace_id()
returns uuid
language sql
immutable
set search_path = ''
as $$ select '00000000-0000-4000-8000-000000000001'::uuid $$;

comment on function public.waterloo_workspace_id() is
  'The id of the one workspace v1 has. Every table carries workspace_id so a second could exist one day.';

create table public.workspaces (
  id uuid primary key default public.waterloo_workspace_id(),
  -- The convention is that every table has workspace_id. For this table it is
  -- simply its own id.
  workspace_id uuid generated always as (id) stored,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

insert into public.workspaces (name) values ('Waterloo');

-- A workspace is never created by the app, and deleting it is a protected
-- action (7-day wait) that only the governance engine will perform, in M2.
create function public.reject_workspace_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    raise exception 'Waterloo has exactly one workspace; another cannot be created'
      using errcode = 'P0001';
  elsif tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'A workspace id never changes' using errcode = 'P0001';
  elsif tg_op in ('DELETE', 'TRUNCATE') then
    raise exception 'Deleting the workspace is a protected action, run only by the governance engine'
      using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger workspaces_locked
  before insert or update or delete on public.workspaces
  for each row execute function public.reject_workspace_changes();

create trigger workspaces_no_truncate
  before truncate on public.workspaces
  for each statement execute function public.reject_workspace_changes();

-- -----------------------------------------------------------------------------
-- Members and the owner lock
-- -----------------------------------------------------------------------------

-- Members, clients and bots are modelled now but get no access in v1.
create type public.member_role as enum ('owner', 'member', 'client', 'bot');

-- There is deliberately no 'suspended' or 'removed' state: those are the
-- Impossible tier, so the schema cannot even express them. 'left' is reached
-- only through the governed leave flow (G9, M2).
create type public.member_status as enum ('active', 'left');

create table public.workspace_members (
  workspace_id uuid not null default public.waterloo_workspace_id()
    references public.workspaces (id),
  -- ON DELETE RESTRICT: deleting an owner's login account would remove their
  -- access, so the database refuses it, even through Supabase's admin API.
  user_id uuid not null references auth.users (id) on delete restrict,
  role public.member_role not null,
  status public.member_status not null default 'active',
  display_name text not null default '' check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

comment on table public.workspace_members is
  'Who belongs to the workspace. Owner rows are locked by enforce_owner_lock(): see G1 and G2 in CLAUDE.md.';

create function public.enforce_owner_lock()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner_count int;
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      raise exception 'An owner can never be removed (G2)' using errcode = 'P0001';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'owner' then
      if coalesce(current_setting('waterloo.bootstrapping_owners', true), '') <> 'on' then
        raise exception 'Owners are added only by the one-time owner bootstrap (G1)'
          using errcode = 'P0001';
      end if;
      select count(*) into owner_count
        from public.workspace_members
       where workspace_id = new.workspace_id and role = 'owner';
      if owner_count >= 2 then
        raise exception 'Waterloo has exactly two owner seats (G1)' using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE
  if new.workspace_id is distinct from old.workspace_id
     or new.user_id is distinct from old.user_id
     or new.created_at is distinct from old.created_at then
    raise exception 'A membership cannot be moved to another person or workspace'
      using errcode = 'P0001';
  end if;

  if new.role is distinct from old.role and 'owner' in (old.role, new.role) then
    raise exception 'Nobody can promote someone to owner or demote an owner (G1, G2)'
      using errcode = 'P0001';
  end if;

  if new.status is distinct from old.status
     and coalesce(current_setting('waterloo.governed_leave', true), '') <> 'on' then
    raise exception 'An owner''s status changes only through the governed leave flow, which needs both owners (G2, G9)'
      using errcode = 'P0001';
  end if;

  -- Defence in depth for G1: when the change comes from a signed-in person,
  -- it must be their own row. Row-level security already says so; this says
  -- it again in a place no policy change can reach.
  if auth.uid() is not null and auth.uid() <> old.user_id then
    raise exception 'You can change only your own membership (G1)' using errcode = 'P0001';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger workspace_members_owner_lock
  before insert or update or delete on public.workspace_members
  for each row execute function public.enforce_owner_lock();

create function public.reject_member_truncate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Members cannot be wiped in bulk (G2)' using errcode = 'P0001';
end;
$$;

create trigger workspace_members_no_truncate
  before truncate on public.workspace_members
  for each statement execute function public.reject_member_truncate();

-- -----------------------------------------------------------------------------
-- Guard the owners' login accounts themselves
--
-- Supabase's admin API (the secret key) can ban or soft-delete any login. For
-- an owner that would be a suspension or removal by another name, so refuse it
-- here. Hard deletes are already refused by workspace_members' foreign key.
-- -----------------------------------------------------------------------------

create function public.guard_owner_login()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.workspace_members m
     where m.user_id = old.id and m.role = 'owner' and m.status = 'active'
  ) then
    if new.banned_until is not null
       and new.banned_until is distinct from old.banned_until
       and new.banned_until > now() then
      raise exception 'An owner''s login can never be banned or suspended (G2)'
        using errcode = 'P0001';
    end if;
    if new.deleted_at is not null and old.deleted_at is null then
      raise exception 'An owner''s login can never be deleted (G2)' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger owner_login_guard
  before update on auth.users
  for each row execute function public.guard_owner_login();

-- -----------------------------------------------------------------------------
-- Session helpers used by every row-level security policy
-- -----------------------------------------------------------------------------

-- True when this request carries a 2FA-verified (aal2) token from a sign-in
-- that is still live and younger than 30 days. Supabase's own session time
-- limit is a paid feature, so the database checks the age itself.
create function public.session_is_trusted()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (
       select 1 from auth.sessions s
        where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
          and s.user_id = auth.uid()
          and s.created_at > now() - interval '30 days'
     )
$$;

-- True when the person entered a 2FA code within the last `within_seconds`.
-- Creating or approving a protected request (M2) requires this.
create function public.has_fresh_2fa(within_seconds int default 300)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_path_exists(
      auth.jwt(),
      '$.amr[*] ? (@.method == "totp" && @.timestamp >= $since)',
      jsonb_build_object('since', extract(epoch from now())::bigint - within_seconds)
    ),
    false
  )
$$;

-- True when the caller is an active owner of Waterloo.
create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
     where m.workspace_id = public.waterloo_workspace_id()
       and m.user_id = auth.uid()
       and m.role = 'owner'
       and m.status = 'active'
  )
$$;

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.workspaces force row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_members force row level security;

-- Supabase grants everything on new tables to its API roles by default. Take
-- it back and grant only what the app uses. Strangers (anon) get nothing.
revoke all on public.workspaces from anon, authenticated;
revoke all on public.workspace_members from anon, authenticated;
grant select on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
-- The only column anyone may ever edit through the API is their own name.
grant update (display_name) on public.workspace_members to authenticated;

-- RESTRICTIVE: this must pass on top of every other policy. No 2FA, or a
-- sign-in older than 30 days, means no rows at all.
create policy "Trusted 2FA session required"
  on public.workspaces as restrictive for all to authenticated
  using ((select public.session_is_trusted()))
  with check ((select public.session_is_trusted()));

create policy "Owners can see the workspace"
  on public.workspaces for select to authenticated
  using ((select public.is_owner()));

create policy "Trusted 2FA session required"
  on public.workspace_members as restrictive for all to authenticated
  using ((select public.session_is_trusted()))
  with check ((select public.session_is_trusted()));

create policy "Owners can see every member"
  on public.workspace_members for select to authenticated
  using ((select public.is_owner()));

create policy "Owners can edit their own name"
  on public.workspace_members for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_owner()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Recovery codes
--
-- Supabase's own recovery codes are still experimental, so these are ours.
-- Only bcrypt hashes are stored. Every function acts on auth.uid(), the
-- caller, and takes no user id, so there is nothing to point at the other
-- owner (G4).
-- -----------------------------------------------------------------------------

create table public.recovery_codes (
  id bigint generated always as identity primary key,
  workspace_id uuid not null default public.waterloo_workspace_id()
    references public.workspaces (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index recovery_codes_user on public.recovery_codes (user_id) where used_at is null;

create table public.recovery_attempts (
  id bigint generated always as identity primary key,
  workspace_id uuid not null default public.waterloo_workspace_id()
    references public.workspaces (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null
);

create index recovery_attempts_recent on public.recovery_attempts (user_id, attempted_at);

-- Sealed: row-level security on, and no policy at all, so nobody reads or
-- writes these directly. The functions below are the only way in.
alter table public.recovery_codes enable row level security;
alter table public.recovery_codes force row level security;
alter table public.recovery_attempts enable row level security;
alter table public.recovery_attempts force row level security;
revoke all on public.recovery_codes from anon, authenticated;
revoke all on public.recovery_attempts from anon, authenticated;

-- 12 characters from a 31-character alphabet with no look-alikes (no 0/O,
-- 1/I/L), shown as XXXX-XXXX-XXXX. That is about 59 bits per code.
create function public.make_recovery_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(12);
  code text := '';
begin
  -- byte % 31 has a tiny bias, which costs well under one bit of strength.
  for i in 0..11 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 31) + 1, 1);
  end loop;
  return substr(code, 1, 4) || '-' || substr(code, 5, 4) || '-' || substr(code, 9, 4);
end;
$$;

create function public.normalise_recovery_code(raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(upper(coalesce(raw, '')), '[^A-Z0-9]', '', 'g')
$$;

-- Replace the caller's codes with 10 fresh ones and return them, once. Needs
-- 2FA from the last 10 minutes, so a stolen password alone cannot do it.
create function public.generate_recovery_codes()
returns setof text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  code text;
begin
  if me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' or not public.has_fresh_2fa(600) then
    raise exception 'Enter a 2FA code first: making recovery codes needs 2FA from the last 10 minutes'
      using errcode = '42501';
  end if;

  delete from public.recovery_codes where user_id = me;

  for i in 1..10 loop
    code := public.make_recovery_code();
    insert into public.recovery_codes (user_id, code_hash)
    values (me, extensions.crypt(public.normalise_recovery_code(code), extensions.gen_salt('bf', 10)));
    return next code;
  end loop;
end;
$$;

-- How many unused codes the caller has left.
create function public.recovery_codes_remaining()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.recovery_codes
   where user_id = auth.uid() and used_at is null
$$;

-- Use one of the caller's own codes to remove the caller's own 2FA, so they
-- can set it up again on a new phone. Works without 2FA (that is the point),
-- but allows only 5 wrong guesses an hour.
--
-- Returns true when a code matched. A wrong code returns false rather than
-- raising an error, so the failed attempt is still recorded.
create function public.redeem_recovery_code(code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  matched bigint;
begin
  if me is null then
    raise exception 'Sign in with your password first' using errcode = '42501';
  end if;

  if (select count(*) from public.recovery_attempts
       where user_id = me and not succeeded
         and attempted_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many wrong recovery codes. Try again in an hour.'
      using errcode = 'P0001';
  end if;

  select rc.id into matched
    from public.recovery_codes rc
   where rc.user_id = me
     and rc.used_at is null
     and rc.code_hash = extensions.crypt(public.normalise_recovery_code(code), rc.code_hash)
   limit 1
   for update;

  insert into public.recovery_attempts (user_id, succeeded) values (me, matched is not null);

  if matched is null then
    return false;
  end if;

  update public.recovery_codes set used_at = now() where id = matched;
  -- The caller's own factors, and nobody else's.
  delete from auth.mfa_factors where user_id = me;
  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- Sign-in activity: see, never control
--
-- Both owners can see each other's sign-ins and devices. There is no way to
-- end the other owner's sessions: session ids are not even returned.
-- -----------------------------------------------------------------------------

create function public.sign_in_activity()
returns table (
  user_id uuid,
  display_name text,
  signed_in_at timestamptz,
  last_active_at timestamptz,
  device text,
  ip text,
  is_this_device boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id,
         coalesce(nullif(m.display_name, ''), 'You') as display_name,
         s.created_at,
         coalesce(s.refreshed_at::timestamptz, s.updated_at, s.created_at),
         coalesce(s.user_agent, 'Unknown device'),
         host(s.ip),
         s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
    from auth.sessions s
    left join public.workspace_members m
      on m.user_id = s.user_id and m.workspace_id = public.waterloo_workspace_id()
   where public.session_is_trusted()
     and (
       s.user_id = auth.uid()
       or (public.is_owner() and m.role = 'owner')
     )
   order by s.created_at desc
   limit 50
$$;

-- -----------------------------------------------------------------------------
-- The one-time owner bootstrap
--
-- Called once per database, from a reviewed SQL file, after both owners have
-- signed up and turned on 2FA. It refuses to run a second time, refuses the
-- same person twice, and refuses anyone without verified 2FA. Signed-in users
-- cannot call it at all.
-- -----------------------------------------------------------------------------

create function public.bootstrap_owners(
  first_owner uuid, first_name text,
  second_owner uuid, second_name text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  candidate uuid;
begin
  if first_owner is null or second_owner is null or first_owner = second_owner then
    raise exception 'The bootstrap needs two different people' using errcode = 'P0001';
  end if;

  lock table public.workspace_members in share row exclusive mode;

  if exists (select 1 from public.workspace_members where role = 'owner') then
    raise exception 'The owners are already set. The bootstrap runs only once (G1).'
      using errcode = 'P0001';
  end if;

  foreach candidate in array array[first_owner, second_owner] loop
    if not exists (select 1 from auth.users u
                    where u.id = candidate and u.email_confirmed_at is not null) then
      raise exception 'User % has not signed up and confirmed their email', candidate
        using errcode = 'P0001';
    end if;
    if not exists (select 1 from auth.mfa_factors f
                    where f.user_id = candidate and f.status = 'verified') then
      raise exception 'User % has not turned on 2FA yet', candidate using errcode = 'P0001';
    end if;
  end loop;

  perform set_config('waterloo.bootstrapping_owners', 'on', true);
  insert into public.workspace_members (user_id, role, display_name)
  values (first_owner, 'owner', first_name), (second_owner, 'owner', second_name);
  perform set_config('waterloo.bootstrapping_owners', 'off', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- Who may call what
--
-- Postgres lets everyone run a new function by default, and Supabase adds its
-- API roles. Revoke all of that, then grant back only what the app calls.
-- -----------------------------------------------------------------------------

revoke execute on function
  public.waterloo_workspace_id(),
  public.reject_workspace_changes(),
  public.enforce_owner_lock(),
  public.reject_member_truncate(),
  public.guard_owner_login(),
  public.session_is_trusted(),
  public.has_fresh_2fa(int),
  public.is_owner(),
  public.make_recovery_code(),
  public.normalise_recovery_code(text),
  public.generate_recovery_codes(),
  public.recovery_codes_remaining(),
  public.redeem_recovery_code(text),
  public.sign_in_activity(),
  public.bootstrap_owners(uuid, text, uuid, text)
from public, anon, authenticated;

grant execute on function
  public.waterloo_workspace_id(),
  public.session_is_trusted(),
  public.has_fresh_2fa(int),
  public.is_owner(),
  public.generate_recovery_codes(),
  public.recovery_codes_remaining(),
  public.redeem_recovery_code(text),
  public.sign_in_activity()
to authenticated;
