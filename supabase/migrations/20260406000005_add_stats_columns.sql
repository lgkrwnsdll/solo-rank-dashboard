-- Add win/loss stats columns to participants
alter table public.participants add column if not exists wins int not null default 0;
alter table public.participants add column if not exists losses int not null default 0;
alter table public.participants add column if not exists total_gained int not null default 0;
alter table public.participants add column if not exists total_lost int not null default 0;
