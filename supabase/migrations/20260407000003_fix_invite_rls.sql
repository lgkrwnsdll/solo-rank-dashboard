-- Fix: invited users (user_id is null, only email matched) couldn't read their own invitation
-- because get_user_room_ids() only checks user_id, not email.

-- Update helper function to also include rooms where user is invited by email
create or replace function public.get_user_room_ids(uid uuid)
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select room_id from public.participants where user_id = uid
  union
  select p.room_id from public.participants p
    inner join auth.users u on u.email = p.email
    where u.id = uid
  union
  select id from public.rooms where host_id = uid;
$$;

-- Also: allow invited users to update their own row by email match
drop policy if exists "participants_update" on public.participants;

create policy "participants_update"
  on public.participants for update
  using (
    user_id = auth.uid()
    or email = (select email from auth.users where id = auth.uid())
    or room_id in (select public.get_user_room_ids(auth.uid()))
  );
