-- Центр Притяжения 2.0 — communities and events foundation
-- Public catalog + private membership/registration records with RLS.

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name text not null check (char_length(name) between 2 and 120),
  summary text not null default '' check (char_length(summary) <= 240),
  description text not null default '' check (char_length(description) <= 5000),
  city text not null default 'Асбест',
  cover_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected', 'left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete set null,
  title text not null check (char_length(title) between 2 and 160),
  description text not null default '' check (char_length(description) <= 5000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '',
  capacity integer check (capacity is null or capacity > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled', 'completed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_valid_time check (ends_at is null or ends_at > starts_at)
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'cancelled', 'attended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index clubs_status_city_idx on public.clubs(status, city);
create index club_memberships_user_status_idx on public.club_memberships(user_id, status);
create index events_status_starts_at_idx on public.events(status, starts_at);
create index events_club_id_idx on public.events(club_id);
create index event_registrations_user_status_idx on public.event_registrations(user_id, status);

create trigger clubs_set_updated_at before update on public.clubs
for each row execute function public.set_updated_at();
create trigger club_memberships_set_updated_at before update on public.club_memberships
for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();
create trigger event_registrations_set_updated_at before update on public.event_registrations
for each row execute function public.set_updated_at();

alter table public.clubs enable row level security;
alter table public.club_memberships enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;

-- Published catalogs are visible without registration. Drafts are visible only to their creator and staff.
create policy "Anyone can read published clubs" on public.clubs
for select to anon
using (status = 'published');

create policy "Authenticated users read published and own clubs" on public.clubs
for select to authenticated
using (status = 'published' or created_by = (select auth.uid()) or public.is_staff((select auth.uid())));

create policy "Staff manage clubs" on public.clubs
for all to authenticated
using (public.is_staff((select auth.uid())))
with check (public.is_staff((select auth.uid())));

create policy "Members read own memberships" on public.club_memberships
for select to authenticated
using (user_id = (select auth.uid()) or public.is_staff((select auth.uid())));

create policy "Users request club membership" on public.club_memberships
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and exists (select 1 from public.clubs c where c.id = club_id and c.status = 'published')
);

create policy "Staff manage memberships" on public.club_memberships
for all to authenticated
using (public.is_staff((select auth.uid())))
with check (public.is_staff((select auth.uid())));

create policy "Anyone can read published events" on public.events
for select to anon
using (status = 'published');

create policy "Authenticated users read published and own events" on public.events
for select to authenticated
using (
  status = 'published'
  or created_by = (select auth.uid())
  or public.is_staff((select auth.uid()))
);

create policy "Staff manage events" on public.events
for all to authenticated
using (public.is_staff((select auth.uid())))
with check (public.is_staff((select auth.uid())));

create policy "Users read own event registrations" on public.event_registrations
for select to authenticated
using (user_id = (select auth.uid()) or public.is_staff((select auth.uid())));

create policy "Users register for published future events" on public.event_registrations
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'registered'
  and exists (
    select 1 from public.events e
    where e.id = event_id
      and e.status = 'published'
      and e.starts_at > now()
  )
);

create policy "Users cancel own event registration" on public.event_registrations
for update to authenticated
using (user_id = (select auth.uid()) and status = 'registered')
with check (user_id = (select auth.uid()) and status = 'cancelled');

create policy "Staff manage event registrations" on public.event_registrations
for all to authenticated
using (public.is_staff((select auth.uid())))
with check (public.is_staff((select auth.uid())));

grant select on public.clubs, public.events to anon;
grant select, insert, update, delete on public.clubs, public.events to authenticated;
grant select, insert, update, delete on public.club_memberships to authenticated;
grant select, insert, update, delete on public.event_registrations to authenticated;

comment on table public.clubs is 'Published community clubs and initiatives.';
comment on table public.club_memberships is 'Membership requests and member status for clubs.';
comment on table public.events is 'Published events and activities of the community.';
comment on table public.event_registrations is 'Private user registrations for events.';
