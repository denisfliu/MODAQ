-- MODAQ Tournament Platform Schema
-- Run this in the Supabase SQL Editor to set up the database.

-- 1. Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. Tournaments
create table tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  director_id uuid not null references profiles(id),
  game_format jsonb not null,
  created_at timestamptz default now()
);

-- 3. Teams & Players (global roster per tournament)
create table tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  unique(tournament_id, name)
);

create table tournament_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references tournament_teams(id) on delete cascade,
  name text not null,
  is_starter boolean default true,
  unique(team_id, name)
);

-- 4. Moderator invitations
create table tournament_moderators (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  user_id uuid references profiles(id),
  email text not null,
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  unique(tournament_id, email)
);

-- 5. Rounds
create table rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round_number int not null,
  packet jsonb,
  packet_name text,
  is_enabled boolean default false,
  unique(tournament_id, round_number)
);

-- 6. Games
create table games (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  tournament_id uuid not null references tournaments(id) on delete cascade,
  moderator_id uuid references profiles(id),
  team1_id uuid not null references tournament_teams(id),
  team2_id uuid not null references tournament_teams(id),
  game_state jsonb,
  team1_score int default 0,
  team2_score int default 0,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  updated_at timestamptz default now()
);

-- Enable Realtime on games table for live score updates
alter publication supabase_realtime add table games;

-- ============================================================
-- Row Level Security
--
-- Strategy: authenticated users can SELECT all non-sensitive
-- tables (tournament metadata, teams, players, moderator lists,
-- rounds, games). Write operations are restricted to directors
-- (checked via tournaments.director_id) with no circular refs.
-- ============================================================

alter table profiles enable row level security;
alter table tournaments enable row level security;
alter table tournament_teams enable row level security;
alter table tournament_players enable row level security;
alter table tournament_moderators enable row level security;
alter table rounds enable row level security;
alter table games enable row level security;

-- Profiles
create policy "Profiles readable by authenticated"
  on profiles for select to authenticated using (true);
create policy "Users can update own profile"
  on profiles for update to authenticated using (auth.uid() = id);

-- Tournaments
create policy "Tournaments readable by authenticated"
  on tournaments for select to authenticated using (true);
create policy "Directors can insert tournaments"
  on tournaments for insert to authenticated
  with check (director_id = auth.uid());
create policy "Directors can update own tournaments"
  on tournaments for update to authenticated
  using (director_id = auth.uid());
create policy "Directors can delete own tournaments"
  on tournaments for delete to authenticated
  using (director_id = auth.uid());

-- Teams
create policy "Teams readable by authenticated"
  on tournament_teams for select to authenticated using (true);
create policy "Teams readable by anon"
  on tournament_teams for select to anon using (true);
create policy "Directors can insert teams"
  on tournament_teams for insert to authenticated
  with check (exists (select 1 from tournaments where id = tournament_id and director_id = auth.uid()));
create policy "Directors can update teams"
  on tournament_teams for update to authenticated
  using (exists (select 1 from tournaments where id = tournament_id and director_id = auth.uid()));
create policy "Directors can delete teams"
  on tournament_teams for delete to authenticated
  using (exists (select 1 from tournaments where id = tournament_id and director_id = auth.uid()));

-- Players
create policy "Players readable by authenticated"
  on tournament_players for select to authenticated using (true);
create policy "Players readable by anon"
  on tournament_players for select to anon using (true);
create policy "Directors can insert players"
  on tournament_players for insert to authenticated
  with check (exists (
    select 1 from tournament_teams join tournaments on tournaments.id = tournament_teams.tournament_id
    where tournament_teams.id = team_id and tournaments.director_id = auth.uid()
  ));
create policy "Directors can update players"
  on tournament_players for update to authenticated
  using (exists (
    select 1 from tournament_teams join tournaments on tournaments.id = tournament_teams.tournament_id
    where tournament_teams.id = team_id and tournaments.director_id = auth.uid()
  ));
create policy "Directors can delete players"
  on tournament_players for delete to authenticated
  using (exists (
    select 1 from tournament_teams join tournaments on tournaments.id = tournament_teams.tournament_id
    where tournament_teams.id = team_id and tournaments.director_id = auth.uid()
  ));

-- Moderators
create policy "Moderators readable by authenticated"
  on tournament_moderators for select to authenticated using (true);
create policy "Directors can insert moderators"
  on tournament_moderators for insert to authenticated
  with check (exists (select 1 from tournaments where id = tournament_id and director_id = auth.uid()));
create policy "Directors can delete moderators"
  on tournament_moderators for delete to authenticated
  using (exists (select 1 from tournaments where id = tournament_id and director_id = auth.uid()));
create policy "Moderators can accept own invites"
  on tournament_moderators for update to authenticated
  using (email = (select email from profiles where id = auth.uid()))
  with check (email = (select email from profiles where id = auth.uid()));

-- Rounds
create policy "Rounds readable by authenticated"
  on rounds for select to authenticated using (true);
create policy "Enabled rounds readable by anon"
  on rounds for select to anon using (is_enabled = true);
create policy "Directors can insert rounds"
  on rounds for insert to authenticated
  with check (exists (select 1 from tournaments where id = tournament_id and director_id = auth.uid()));
create policy "Directors can update rounds"
  on rounds for update to authenticated
  using (exists (select 1 from tournaments where id = tournament_id and director_id = auth.uid()));
create policy "Directors can delete rounds"
  on rounds for delete to authenticated
  using (exists (select 1 from tournaments where id = tournament_id and director_id = auth.uid()));

-- Games
create policy "Games readable by authenticated"
  on games for select to authenticated using (true);
create policy "Games readable by anon"
  on games for select to anon using (true);
create policy "Directors and moderators can insert games"
  on games for insert to authenticated
  with check (
    exists (select 1 from tournaments where id = tournament_id and director_id = auth.uid())
    or moderator_id = auth.uid()
  );
create policy "Directors can update games"
  on games for update to authenticated
  using (exists (select 1 from tournaments where id = tournament_id and director_id = auth.uid()));
create policy "Directors can delete games"
  on games for delete to authenticated
  using (exists (select 1 from tournaments where id = tournament_id and director_id = auth.uid()));
create policy "Moderators can update assigned games"
  on games for update to authenticated
  using (moderator_id = auth.uid());
