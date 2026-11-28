create policy "Organizers read own events"
on public.events
for select
to authenticated
using (
  created_by = (select auth.uid())
  and public.has_role((select auth.uid()), 'organizer'::public.app_role)
);
