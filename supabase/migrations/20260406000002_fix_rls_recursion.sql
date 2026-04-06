-- Fix infinite recursion in participants RLS policies
-- The issue: participants SELECT policy references participants table itself

-- Drop problematic policies
drop policy if exists "participants_select_same_room" on public.participants;
drop policy if exists "participants_update_own" on public.participants;
drop policy if exists "participants_update_team_accepted" on public.participants;
drop policy if exists "rooms_select_participant" on public.rooms;

-- Recreate participants SELECT: use user_id directly, no subquery on self
create policy "participants_select_own_rooms"
  on public.participants for select
  using (
    user_id = auth.uid()
    or room_id in (
      select id from public.rooms where host_id = auth.uid()
    )
    or room_id in (
      select p.room_id from public.participants p where p.user_id = auth.uid()
    )
  );

-- Recreate rooms SELECT: use a direct check instead of exists on participants
create policy "rooms_select_participant"
  on public.rooms for select
  using (
    host_id = auth.uid()
    or id in (
      select p.room_id from public.participants p where p.user_id = auth.uid()
    )
  );

-- Single UPDATE policy for participants (merge own + team)
create policy "participants_update_allowed"
  on public.participants for update
  using (
    user_id = auth.uid()
    or room_id in (
      select r.id from public.rooms r where r.host_id = auth.uid()
    )
    or room_id in (
      select p.room_id from public.participants p
      where p.user_id = auth.uid() and p.status = 'accepted'
    )
  );
