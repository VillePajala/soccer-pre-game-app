create table public.app_settings (
  user_id uuid not null,
  current_game_id text null,
  other_settings jsonb null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint app_settings_pkey primary key (user_id),
  constraint app_settings_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint fk_app_settings_user foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

------------------------------------------------------


create table public.players (
  id text not null,
  user_id uuid not null,
  name text not null,
  nickname text null,
  jersey_number text null,
  notes text null,
  is_goalie boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint players_pkey primary key (id),
  constraint fk_players_user foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint players_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_players_user_id on public.players using btree (user_id) TABLESPACE pg_default;

------------------------------------------------------

create table public.saved_games (
  id text not null,
  user_id uuid not null,
  team_name text null,
  opponent_name text null,
  game_date date null,
  game_time time without time zone null,
  game_location text null,
  home_or_away text null,
  home_score integer not null default 0,
  away_score integer not null default 0,
  number_of_periods integer not null default 2,
  period_duration_minutes integer not null default 10,
  current_period integer null,
  game_status text null,
  game_notes text null,
  show_player_names_on_field boolean not null default true,
  sub_interval_minutes integer null,
  last_sub_confirmation_time_seconds integer null,
  season_id text null,
  tournament_id text null,
  selected_player_ids jsonb null,
  game_roster_snapshot jsonb null,
  players_on_field_state jsonb null,
  opponents_state jsonb null,
  drawings_state jsonb null,
  game_events_log jsonb null,
  completed_interval_durations_log jsonb null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint saved_games_pkey primary key (id),
  constraint fk_saved_games_user foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint saved_games_season_id_fkey foreign KEY (season_id) references seasons (id) on delete set null,
  constraint saved_games_tournament_id_fkey foreign KEY (tournament_id) references tournaments (id) on delete set null,
  constraint saved_games_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_saved_games_user_id on public.saved_games using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_saved_games_season_id on public.saved_games using btree (season_id) TABLESPACE pg_default;

create index IF not exists idx_saved_games_tournament_id on public.saved_games using btree (tournament_id) TABLESPACE pg_default;

------------------------------------------------------

create table public.seasons (
  id text not null,
  user_id uuid not null,
  name text not null,
  start_date date null,
  end_date date null,
  details jsonb null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint seasons_pkey primary key (id),
  constraint fk_seasons_user foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint seasons_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_seasons_user_id on public.seasons using btree (user_id) TABLESPACE pg_default;


------------------------------------------------------------------

create table public.tournaments (
  id text not null,
  user_id uuid not null,
  name text not null,
  date date null,
  location text null,
  details jsonb null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint tournaments_pkey primary key (id),
  constraint fk_tournaments_user foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint tournaments_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_tournaments_user_id on public.tournaments using btree (user_id) TABLESPACE pg_default;

--------------------------------------------------------------------


create table public.users (
  id uuid not null default gen_random_uuid (),
  clerk_auth_id text not null,
  email text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  last_login_at timestamp with time zone null,
  metadata jsonb null default '{}'::jsonb,
  constraint users_pkey primary key (id),
  constraint users_clerk_auth_id_key unique (clerk_auth_id)
) TABLESPACE pg_default;

create index IF not exists idx_users_clerk_auth_id on public.users using btree (clerk_auth_id) TABLESPACE pg_default;