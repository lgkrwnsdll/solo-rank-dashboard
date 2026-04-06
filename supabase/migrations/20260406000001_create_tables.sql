-- ============================================
-- Solo Rank Dashboard - Database Schema
-- ============================================

-- 1. profiles
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- 2. rooms
create type public.room_status as enum ('active', 'closed');

create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  target_score int not null default 200,
  team_a_name text not null default 'A',
  team_b_name text not null default 'B',
  status public.room_status not null default 'active',
  config jsonb not null default '{
    "win_score_range": { "min": 18, "max": 23 },
    "lose_score_range": { "min": 18, "max": 23 },
    "win_streak": {
      "2":  { "point": 1,  "enabled": false },
      "3":  { "point": 3,  "enabled": true },
      "4":  { "point": 5,  "enabled": true },
      "5":  { "point": 7,  "enabled": true },
      "6":  { "point": 10, "enabled": true },
      "7":  { "point": 13, "enabled": true },
      "8":  { "point": 16, "enabled": true },
      "9":  { "point": 20, "enabled": true },
      "10": { "point": 24, "enabled": true }
    },
    "lose_streak": {
      "2":  { "point": 1,  "enabled": false },
      "3":  { "point": 1,  "enabled": true },
      "4":  { "point": 2,  "enabled": true },
      "5":  { "point": 4,  "enabled": true },
      "6":  { "point": 6,  "enabled": true },
      "7":  { "point": 8,  "enabled": true },
      "8":  { "point": 11, "enabled": true },
      "9":  { "point": 14, "enabled": true },
      "10": { "point": 17, "enabled": true }
    }
  }'::jsonb,
  created_at timestamptz default now() not null
);

-- 3. participants
create type public.participant_status as enum ('invited', 'accepted', 'declined');

create table public.participants (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade,
  email text not null,
  name text not null default '',
  team_side text check (team_side in ('A', 'B') or team_side is null),
  score int not null default 0,
  streak int not null default 0,
  is_sleeping boolean not null default false,
  status public.participant_status not null default 'invited',
  order_index int not null default 0,
  created_at timestamptz default now() not null,

  unique (room_id, email)
);

-- 4. score_logs
create table public.score_logs (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  player_id uuid references public.participants(id) on delete cascade not null,
  amount int not null,
  reason text not null,
  detail text,
  created_at timestamptz default now() not null
);

-- ============================================
-- Indexes
-- ============================================
create index idx_participants_room_id on public.participants(room_id);
create index idx_participants_user_id on public.participants(user_id);
create index idx_participants_email on public.participants(email);
create index idx_score_logs_room_id on public.score_logs(room_id);
create index idx_score_logs_player_id on public.score_logs(player_id);
create index idx_rooms_host_id on public.rooms(host_id);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- profiles
alter table public.profiles enable row level security;

create policy "profiles_select_public"
  on public.profiles for select
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- rooms
alter table public.rooms enable row level security;

create policy "rooms_select_participant"
  on public.rooms for select
  using (
    host_id = auth.uid()
    or exists (
      select 1 from public.participants
      where participants.room_id = rooms.id
        and participants.user_id = auth.uid()
    )
  );

create policy "rooms_insert_authenticated"
  on public.rooms for insert
  with check (auth.uid() = host_id);

create policy "rooms_update_accepted"
  on public.rooms for update
  using (
    exists (
      select 1 from public.participants
      where participants.room_id = rooms.id
        and participants.user_id = auth.uid()
        and participants.status = 'accepted'
    )
    or host_id = auth.uid()
  );

-- participants
alter table public.participants enable row level security;

create policy "participants_select_same_room"
  on public.participants for select
  using (
    exists (
      select 1 from public.participants p
      where p.room_id = participants.room_id
        and p.user_id = auth.uid()
    )
    or exists (
      select 1 from public.rooms
      where rooms.id = participants.room_id
        and rooms.host_id = auth.uid()
    )
  );

create policy "participants_insert_host_only"
  on public.participants for insert
  with check (
    exists (
      select 1 from public.rooms
      where rooms.id = room_id
        and rooms.host_id = auth.uid()
    )
  );

create policy "participants_update_own"
  on public.participants for update
  using (user_id = auth.uid());

create policy "participants_update_team_accepted"
  on public.participants for update
  using (
    exists (
      select 1 from public.participants p
      where p.room_id = participants.room_id
        and p.user_id = auth.uid()
        and p.status = 'accepted'
    )
    or exists (
      select 1 from public.rooms
      where rooms.id = participants.room_id
        and rooms.host_id = auth.uid()
    )
  );

create policy "participants_delete_host_only"
  on public.participants for delete
  using (
    exists (
      select 1 from public.rooms
      where rooms.id = participants.room_id
        and rooms.host_id = auth.uid()
    )
  );

-- score_logs
alter table public.score_logs enable row level security;

create policy "score_logs_select_same_room"
  on public.score_logs for select
  using (
    exists (
      select 1 from public.participants
      where participants.room_id = score_logs.room_id
        and participants.user_id = auth.uid()
        and participants.status = 'accepted'
    )
  );

create policy "score_logs_insert_own"
  on public.score_logs for insert
  with check (
    exists (
      select 1 from public.participants
      where participants.id = player_id
        and participants.user_id = auth.uid()
        and participants.status = 'accepted'
    )
  );

-- ============================================
-- Realtime
-- ============================================
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.score_logs;

-- ============================================
-- Auto-create profile on Google OAuth sign-up
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
