-- Fix: rooms insert policy needs to also allow reading the newly created room
-- The issue: after INSERT, the row must pass SELECT policy too (for RETURNING clause)

drop policy if exists "rooms_select" on public.rooms;
drop policy if exists "rooms_insert" on public.rooms;

-- SELECT: user's rooms OR user is the host
create policy "rooms_select"
  on public.rooms for select
  using (
    host_id = auth.uid()
    or id in (select public.get_user_room_ids(auth.uid()))
  );

-- INSERT: must be the host, no other restrictions
create policy "rooms_insert"
  on public.rooms for insert
  with check (host_id = auth.uid());
