-- Tighten helper-function execution and trigger search_path.
alter function public.set_updated_at() set search_path = '';
revoke all on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.set_updated_at() to postgres;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from anon;
revoke all on function public.is_staff(uuid) from anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_staff(uuid) to authenticated;

-- Organizers may create events they own; staff retain full management.
create policy "Organizers create own events" on public.events
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.has_role((select auth.uid()), 'organizer'::public.app_role)
);

create policy "Organizers update own events" on public.events
for update to authenticated
using (
  created_by = (select auth.uid())
  and public.has_role((select auth.uid()), 'organizer'::public.app_role)
)
with check (
  created_by = (select auth.uid())
  and public.has_role((select auth.uid()), 'organizer'::public.app_role)
);
