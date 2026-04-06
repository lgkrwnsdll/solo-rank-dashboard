-- ============================================
-- Fix RLS infinite recursion v2
-- Solution: use security definer functions to bypass RLS in subqueries
-- ============================================

-- Helper function: get room IDs where user is a participant
create or replace function public.get_user_room_ids(uid uuid)
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select room_id from public.participants where user_id = uid
  union
  select id from public.rooms where host_id = uid;
$$;

-- Drop ALL existing policies to start clean
drop policy if exists "participants_select_same_room" on public.participants;
drop policy if exists "participants_select_own_rooms" on public.participants;
drop policy if exists "participants_update_own" on public.participants;
drop policy if exists "participants_update_team_accepted" on public.participants;
drop policy if exists "participants_update_allowed" on public.participants;
drop policy if exists "participants_insert_host_only" on public.participants;
drop policy if exists "participants_delete_host_only" on public.participants;

drop policy if exists "rooms_select_participant" on public.rooms;
drop policy if exists "rooms_insert_authenticated" on public.rooms;
drop policy if exists "rooms_update_accepted" on public.rooms;

drop policy if exists "score_logs_select_same_room" on public.score_logs;
drop policy if exists "score_logs_insert_own" on public.score_logs;

-- ============================================
-- ROOMS policies
-- ============================================
create policy "rooms_select"
  on public.rooms for select
  using (
    id in (select public.get_user_room_ids(auth.uid()))
  );

create policy "rooms_insert"
  on public.rooms for insert
  with check (auth.uid() = host_id);

create policy "rooms_update"
  on public.rooms for update
  using (
    id in (select public.get_user_room_ids(auth.uid()))
  );

-- ============================================
-- PARTICIPANTS policies
-- ============================================
create policy "participants_select"
  on public.participants for select
  using (
    room_id in (select public.get_user_room_ids(auth.uid()))
  );

create policy "participants_insert"
  on public.participants for insert
  with check (
    exists (
      select 1 from public.rooms
      where rooms.id = room_id
        and rooms.host_id = auth.uid()
    )
  );

create policy "participants_update"
  on public.participants for update
  using (
    room_id in (select public.get_user_room_ids(auth.uid()))
  );

create policy "participants_delete"
  on public.participants for delete
  using (
    exists (
      select 1 from public.rooms
      where rooms.id = room_id
        and rooms.host_id = auth.uid()
    )
  );

-- ============================================
-- SCORE_LOGS policies
-- ============================================
create policy "score_logs_select"
  on public.score_logs for select
  using (
    room_id in (select public.get_user_room_ids(auth.uid()))
  );

create policy "score_logs_insert"
  on public.score_logs for insert
  with check (
    exists (
      select 1 from public.participants
      where participants.id = player_id
        and participants.user_id = auth.uid()
        and participants.status = 'accepted'
    )
  );
