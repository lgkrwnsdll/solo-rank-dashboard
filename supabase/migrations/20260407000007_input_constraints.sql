-- Length and numeric range constraints

-- Truncate existing values that exceed limits
update public.rooms set name = substring(name from 1 for 50) where char_length(name) > 50;
update public.rooms set team_a_name = substring(team_a_name from 1 for 30) where char_length(team_a_name) > 30;
update public.rooms set team_b_name = substring(team_b_name from 1 for 30) where char_length(team_b_name) > 30;

-- Add length constraints
alter table public.rooms add constraint rooms_name_length check (char_length(name) <= 50);
alter table public.rooms add constraint rooms_team_a_name_length check (char_length(team_a_name) <= 30);
alter table public.rooms add constraint rooms_team_b_name_length check (char_length(team_b_name) <= 30);

-- Numeric range constraints
alter table public.rooms add constraint rooms_target_score_range check (target_score >= 1 and target_score <= 100000);
