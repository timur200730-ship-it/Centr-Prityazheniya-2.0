-- Schedule management: organizer links, event intake, moderation and approval.
create extension if not exists pgcrypto with schema extensions;

alter table public.events
  add column if not exists organizer_name text not null default '',
  add column if not exists category text not null default '',
  add column if not exists age_limit text not null default '',
  add column if not exists price_label text not null default '',
  add column if not exists room text not null default '';

create table if not exists public.organizer_invite_links (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 2 and 100),
  organizer_name text not null default '',
  token_hash text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  submissions_count integer not null default 0
);

create table if not exists public.event_submissions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid references public.organizer_invite_links(id),
  submitted_by uuid references auth.users(id),
  title text not null check (char_length(title) between 2 and 160),
  description text not null default '',
  category text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '',
  room text not null default '',
  age_limit text not null default '',
  price_label text not null default '',
  capacity integer,
  organizer_name text not null default '',
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_note text not null default '',
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (capacity is null or capacity > 0)
);

create index if not exists event_submissions_status_created_idx
  on public.event_submissions(status, created_at desc);
create index if not exists event_submissions_starts_at_idx
  on public.event_submissions(starts_at);

alter table public.organizer_invite_links enable row level security;
alter table public.event_submissions enable row level security;
alter table public.event_submissions alter column invite_id drop not null;
alter table public.event_submissions add column if not exists submitted_by uuid references auth.users(id);

drop policy if exists "Staff manage organizer invite links" on public.organizer_invite_links;
create policy "Staff manage organizer invite links"
  on public.organizer_invite_links for all to authenticated
  using (public.is_staff((select auth.uid())))
  with check (public.is_staff((select auth.uid())));

drop policy if exists "Staff manage event submissions" on public.event_submissions;
create policy "Staff manage event submissions"
  on public.event_submissions for all to authenticated
  using (public.is_staff((select auth.uid())))
  with check (public.is_staff((select auth.uid())));

drop policy if exists "Organizers submit own event requests" on public.event_submissions;
create policy "Organizers submit own event requests"
  on public.event_submissions for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and public.has_role((select auth.uid()), 'organizer'::public.app_role)
  );
drop policy if exists "Organizers read own event requests" on public.event_submissions;
create policy "Organizers read own event requests"
  on public.event_submissions for select to authenticated
  using (
    submitted_by = (select auth.uid())
    and public.has_role((select auth.uid()), 'organizer'::public.app_role)
  );

-- Organizers may submit drafts only. Publication is reserved for staff moderation.
drop policy if exists "Organizers create own events" on public.events;
create policy "Organizers create own event drafts"
  on public.events for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'draft'
    and public.has_role((select auth.uid()), 'organizer'::public.app_role)
  );

create or replace function public.create_organizer_invite(
  p_token text,
  p_label text,
  p_organizer_name text default '',
  p_expires_at timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_token is null or length(p_token) < 32 then
    raise exception 'invalid_token' using errcode = '22023';
  end if;
  insert into public.organizer_invite_links(label, organizer_name, token_hash, created_by, expires_at)
  values (
    left(trim(p_label), 100),
    left(coalesce(trim(p_organizer_name), ''), 120),
    encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex'),
    auth.uid(),
    p_expires_at
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.submit_event_request(
  p_token text,
  p_title text,
  p_description text,
  p_category text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_location text,
  p_room text,
  p_age_limit text,
  p_price_label text,
  p_capacity integer,
  p_organizer_name text,
  p_contact_name text,
  p_contact_phone text,
  p_contact_email text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.organizer_invite_links%rowtype;
  v_id uuid;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'invalid_or_expired_link' using errcode = '22023';
  end if;
  select * into v_invite
  from public.organizer_invite_links
  where token_hash = encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  for update;
  if not found then
    raise exception 'invalid_or_expired_link' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_title,''))) < 2 or length(trim(p_title)) > 160 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;
  if p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'invalid_time_range' using errcode = '22023';
  end if;
  if p_capacity is not null and p_capacity < 1 then
    raise exception 'invalid_capacity' using errcode = '22023';
  end if;
  insert into public.event_submissions(
    invite_id,title,description,category,starts_at,ends_at,location,room,age_limit,
    price_label,capacity,organizer_name,contact_name,contact_phone,contact_email
  ) values (
    v_invite.id,trim(p_title),left(coalesce(p_description,''),5000),
    left(coalesce(p_category,''),80),p_starts_at,p_ends_at,left(coalesce(p_location,''),180),
    left(coalesce(p_room,''),100),left(coalesce(p_age_limit,''),40),
    left(coalesce(p_price_label,''),80),p_capacity,
    coalesce(nullif(left(trim(p_organizer_name),120),''),v_invite.organizer_name),
    left(coalesce(p_contact_name,''),120),left(coalesce(p_contact_phone,''),40),
    left(coalesce(p_contact_email,''),254)
  ) returning id into v_id;
  update public.organizer_invite_links
    set last_used_at = now(), submissions_count = submissions_count + 1
    where id = v_invite.id;
  return v_id;
end;
$$;

create or replace function public.approve_event_submission(p_submission_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission public.event_submissions%rowtype;
  v_event_id uuid;
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select * into v_submission
  from public.event_submissions
  where id = p_submission_id and status = 'pending'
  for update;
  if not found then
    raise exception 'submission_not_pending' using errcode = '22023';
  end if;
  insert into public.events(
    title,description,starts_at,ends_at,location,capacity,status,created_by,
    organizer_name,category,age_limit,price_label,room
  ) values (
    v_submission.title,v_submission.description,v_submission.starts_at,v_submission.ends_at,
    v_submission.location,v_submission.capacity,'published',auth.uid(),
    v_submission.organizer_name,v_submission.category,v_submission.age_limit,
    v_submission.price_label,v_submission.room
  ) returning id into v_event_id;
  update public.event_submissions
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_submission_id;
  return v_event_id;
end;
$$;

create or replace function public.reject_event_submission(p_submission_id uuid, p_note text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  update public.event_submissions
    set status = 'rejected', review_note = left(coalesce(p_note,''),1000),
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_submission_id and status = 'pending';
  if not found then
    raise exception 'submission_not_pending' using errcode = '22023';
  end if;
end;
$$;


create or replace function public.revoke_organizer_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  update public.organizer_invite_links set revoked_at = now()
    where id = p_invite_id and revoked_at is null;
end;
$;

revoke all on function public.revoke_organizer_invite(uuid) from public;
grant execute on function public.revoke_organizer_invite(uuid) to authenticated;

revoke all on function public.create_organizer_invite(text,text,text,timestamptz) from public;
revoke all on function public.submit_event_request(text,text,text,text,timestamptz,timestamptz,text,text,text,text,integer,text,text,text,text) from public;
revoke all on function public.approve_event_submission(uuid) from public;
revoke all on function public.reject_event_submission(uuid,text) from public;
grant execute on function public.create_organizer_invite(text,text,text,timestamptz) to authenticated;
grant execute on function public.submit_event_request(text,text,text,text,timestamptz,timestamptz,text,text,text,text,integer,text,text,text,text) to anon, authenticated;
grant execute on function public.approve_event_submission(uuid) to authenticated;
grant execute on function public.reject_event_submission(uuid,text) to authenticated;
