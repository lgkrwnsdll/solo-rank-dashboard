-- ============================================
-- Atomic score update RPCs
-- Prevents stale-state overwrites when buttons are clicked rapidly
-- ============================================

-- Record win/lose result atomically
create or replace function public.record_match(
  p_participant_id uuid,
  p_type text,           -- 'win' or 'lose'
  p_base_points int,     -- random points already chosen client-side
  p_streak_config jsonb  -- win_streak or lose_streak config from rooms.config
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_streak int;
  v_new_streak int;
  v_bonus int := 0;
  v_sign int;
  v_room_id uuid;
  v_user_id uuid;
  v_streak_key text;
  v_streak_data jsonb;
  v_total_change int;
begin
  -- Lock the row and get current state
  select streak, room_id, user_id
    into v_current_streak, v_room_id, v_user_id
  from public.participants
  where id = p_participant_id
  for update;

  -- Permission: only the participant themselves
  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Permission denied';
  end if;

  -- Calculate sign and new streak
  v_sign := case when p_type = 'win' then 1 else -1 end;
  if p_type = 'win' then
    v_new_streak := case when v_current_streak > 0 then v_current_streak + 1 else 1 end;
  else
    v_new_streak := case when v_current_streak < 0 then v_current_streak - 1 else -1 end;
  end if;

  -- Calculate streak bonus
  v_streak_key := case when abs(v_new_streak) >= 10 then '10' else abs(v_new_streak)::text end;
  v_streak_data := p_streak_config -> v_streak_key;
  if v_streak_data is not null and (v_streak_data ->> 'enabled')::boolean then
    v_bonus := (v_streak_data ->> 'point')::int;
  end if;

  v_total_change := (p_base_points + v_bonus) * v_sign;

  -- Atomic update
  update public.participants
  set
    score = score + v_total_change,
    streak = v_new_streak,
    wins = wins + (case when p_type = 'win' then 1 else 0 end),
    losses = losses + (case when p_type = 'lose' then 1 else 0 end),
    total_gained = total_gained + (case when p_type = 'win' then p_base_points + v_bonus else 0 end),
    total_lost = total_lost + (case when p_type = 'lose' then p_base_points + v_bonus else 0 end)
  where id = p_participant_id;

  -- Log base score
  insert into public.score_logs (room_id, player_id, amount, reason, detail)
  values (
    v_room_id,
    p_participant_id,
    p_base_points * v_sign,
    p_type,
    case when p_type = 'win' then '승리 +' || p_base_points
         else '패배 -' || p_base_points end
  );

  -- Log streak bonus if applied
  if v_bonus > 0 then
    insert into public.score_logs (room_id, player_id, amount, reason, detail)
    values (
      v_room_id,
      p_participant_id,
      v_bonus * v_sign,
      case when p_type = 'win' then 'streak_bonus' else 'streak_penalty' end,
      abs(v_new_streak)
        || (case when p_type = 'win' then '연승 보너스 +' else '연패 감점 -' end)
        || v_bonus
    );
  end if;
end;
$$;

-- Manual adjust score atomically
create or replace function public.adjust_score(
  p_participant_id uuid,
  p_amount int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room_id uuid;
  v_user_id uuid;
begin
  select room_id, user_id into v_room_id, v_user_id
  from public.participants
  where id = p_participant_id
  for update;

  if v_user_id is null or v_user_id != auth.uid() then
    raise exception 'Permission denied';
  end if;

  update public.participants
  set
    score = score + p_amount,
    total_gained = total_gained + (case when p_amount > 0 then p_amount else 0 end),
    total_lost = total_lost + (case when p_amount < 0 then abs(p_amount) else 0 end)
  where id = p_participant_id;

  insert into public.score_logs (room_id, player_id, amount, reason, detail)
  values (
    v_room_id,
    p_participant_id,
    p_amount,
    'manual',
    '수동 ' || (case when p_amount > 0 then '+' else '' end) || p_amount
  );
end;
$$;
