alter table public.rooms add column if not exists winner text check (winner in ('A', 'B', 'draw') or winner is null);
