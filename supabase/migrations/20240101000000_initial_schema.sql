-- Playlists owned by a user
create table if not exists playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamptz default now()
);

-- Tracks within a playlist
create table if not exists playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references playlists(id) on delete cascade not null,
  track_id text not null,
  title text not null,
  artist text,
  thumbnail text,
  thumbnail_medium text,
  duration integer,
  position integer not null,
  added_at timestamptz default now()
);

create index if not exists playlists_user_id_idx on playlists(user_id);
create index if not exists playlist_tracks_playlist_position_idx on playlist_tracks(playlist_id, position);

-- Row-Level Security: users can only access their own data
alter table playlists enable row level security;
alter table playlist_tracks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'playlists' and policyname = 'users manage own playlists'
  ) then
    create policy "users manage own playlists"
      on playlists for all using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'playlist_tracks' and policyname = 'users manage own tracks'
  ) then
    create policy "users manage own tracks"
      on playlist_tracks for all using (
        playlist_id in (select id from playlists where user_id = auth.uid())
      );
  end if;
end $$;
