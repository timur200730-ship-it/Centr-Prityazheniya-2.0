-- Центр Притяжения 2.0 — foundation schema
-- Apply in Supabase SQL Editor. RLS is enabled on every application table.

create extension if not exists pgcrypto;

create type public.app_role as enum (
  'member', 'club_leader', 'organizer', 'moderator', 'administrator', 'super_admin'
);

create type public.profile_visibility as enum ('community', 'private');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Участник' check (char_length(display_name) between 1 and 80),
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 500),
  city text not null default 'Асбест',
  interests text[] not null default '{}',
  visibility public.profile_visibility not null default 'community',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'member',
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Create a basic profile and member role for every new registered account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Участник')
  );
  insert into public.user_roles (user_id, role) values (new.id, 'member');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role checks are performed inside PostgreSQL, not trusted from the browser.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role in ('moderator', 'administrator', 'super_admin')
  );
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- Public/community-visible profile fields are readable to signed-in users.
-- Private profiles are readable only by their owner and authorized staff.
create policy "Profiles visible according to privacy" on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or visibility = 'community'
  or public.is_staff((select auth.uid()))
);

create policy "Users update own profile" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Role assignments cannot be created or modified by ordinary clients.
create policy "Users can read own roles" on public.user_roles
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_staff((select auth.uid()))
);

-- No INSERT/UPDATE/DELETE policies for user_roles by design.

revoke all on public.profiles from anon;
revoke all on public.user_roles from anon;
grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;

comment on table public.profiles is 'Public-facing member profile with privacy controls.';
comment on table public.user_roles is 'Server-controlled application roles; never editable by a regular user.';

-- Limit direct execution of helper functions to authenticated sessions.
revoke all on function public.has_role(uuid, public.app_role) from public;
revoke all on function public.is_staff(uuid) from public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_staff(uuid) to authenticated;
