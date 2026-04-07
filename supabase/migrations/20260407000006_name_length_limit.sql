-- Limit display_name and participant.name to 64 characters

-- Truncate any existing values that exceed limit
update public.profiles set display_name = substring(display_name from 1 for 64) where length(display_name) > 64;
update public.participants set name = substring(name from 1 for 64) where length(name) > 64;

-- Add length constraints
alter table public.profiles add constraint profiles_display_name_length check (char_length(display_name) <= 64);
alter table public.participants add constraint participants_name_length check (char_length(name) <= 64);

-- Update handle_new_user to truncate Google full_name
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
    substring(coalesce(new.raw_user_meta_data ->> 'full_name', new.email) from 1 for 64),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;
