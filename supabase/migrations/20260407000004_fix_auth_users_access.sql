-- Fix: RLS policies cannot directly query auth.users (permission denied)
-- Wrap the email lookup in a security definer function

create or replace function public.get_user_email(uid uuid)
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select email from auth.users where id = uid;
$$;

-- Update get_user_room_ids to use the helper
create or replace function public.get_user_room_ids(uid uuid)
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select room_id from public.participants where user_id = uid
  union
  select room_id from public.participants where email = public.get_user_email(uid)
  union
  select id from public.rooms where host_id = uid;
$$;

-- Update participants_update to use the helper
drop policy if exists "participants_update" on public.participants;

create policy "participants_update"
  on public.participants for update
  using (
    user_id = auth.uid()
    or email = public.get_user_email(auth.uid())
    or room_id in (select public.get_user_room_ids(auth.uid()))
  );
