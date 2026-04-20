-- ===== ROLES =====
create type public.app_role as enum ('admin', 'player');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Anyone authenticated can view roles"
on public.user_roles for select to authenticated using (true);

create policy "Admins can manage roles"
on public.user_roles for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- ===== PROFILES =====
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  display_name text not null,
  handicap numeric(4,1) default 0,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles viewable by authenticated"
on public.profiles for select to authenticated using (true);

create policy "Users insert own profile"
on public.profiles for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users update own profile"
on public.profiles for update to authenticated
using (auth.uid() = user_id);

create policy "Admins manage all profiles"
on public.profiles for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- ===== TOURNAMENTS =====
create type public.game_format as enum ('stroke_play', 'stableford', 'team_scramble', 'team_best_ball');
create type public.tournament_status as enum ('upcoming', 'live', 'finished');

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course_name text not null default 'Минский гольф-клуб',
  format game_format not null default 'stroke_play',
  status tournament_status not null default 'upcoming',
  start_date date not null default current_date,
  total_holes integer not null default 18,
  total_par integer not null default 72,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tournaments enable row level security;

create policy "Tournaments viewable by authenticated"
on public.tournaments for select to authenticated using (true);

create policy "Admins manage tournaments"
on public.tournaments for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- ===== HOLES =====
create table public.holes (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  hole_number integer not null check (hole_number between 1 and 36),
  par integer not null check (par between 3 and 6),
  handicap_index integer,
  yards integer,
  created_at timestamptz not null default now(),
  unique (tournament_id, hole_number)
);

alter table public.holes enable row level security;

create policy "Holes viewable by authenticated"
on public.holes for select to authenticated using (true);

create policy "Admins manage holes"
on public.holes for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- ===== TOURNAMENT PLAYERS =====
create table public.tournament_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  team_name text,
  starting_hole integer default 1,
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

alter table public.tournament_players enable row level security;

create policy "Players viewable by authenticated"
on public.tournament_players for select to authenticated using (true);

create policy "Users join themselves"
on public.tournament_players for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users leave themselves"
on public.tournament_players for delete to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Admins manage players"
on public.tournament_players for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- ===== SCORES =====
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  hole_id uuid references public.holes(id) on delete cascade not null,
  hole_number integer not null,
  strokes integer check (strokes >= 1 and strokes <= 15),
  putts integer,
  stableford_points integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, user_id, hole_id)
);

alter table public.scores enable row level security;

create policy "Scores viewable by authenticated"
on public.scores for select to authenticated using (true);

create policy "Players insert own scores"
on public.scores for insert to authenticated
with check (auth.uid() = user_id);

create policy "Players update own scores"
on public.scores for update to authenticated
using (auth.uid() = user_id);

create policy "Players delete own scores"
on public.scores for delete to authenticated
using (auth.uid() = user_id);

create policy "Admins manage scores"
on public.scores for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- ===== TIMESTAMPS TRIGGER =====
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated before update on public.profiles
  for each row execute function public.update_updated_at_column();
create trigger set_tournaments_updated before update on public.tournaments
  for each row execute function public.update_updated_at_column();
create trigger set_scores_updated before update on public.scores
  for each row execute function public.update_updated_at_column();

-- ===== AUTO PROFILE ON SIGNUP =====
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  insert into public.user_roles (user_id, role)
  values (new.id, 'player');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ===== REALTIME =====
alter table public.scores replica identity full;
alter table public.tournaments replica identity full;
alter publication supabase_realtime add table public.scores;
alter publication supabase_realtime add table public.tournaments;
alter publication supabase_realtime add table public.tournament_players;