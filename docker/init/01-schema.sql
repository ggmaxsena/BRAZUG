/* ===================================== */
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS adventures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  image_data TEXT,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  visibility TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'guildmember',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TABLE IF EXISTS wow_characters;

CREATE TABLE IF NOT EXISTS wow_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  race TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  guild TEXT NOT NULL DEFAULT 'BRAZUG',
  image_url TEXT DEFAULT '',
  lore TEXT DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'public',
  is_dead BOOLEAN NOT NULL DEFAULT FALSE,
  death_cause TEXT DEFAULT '',
  death_location TEXT DEFAULT '',
  death_level INTEGER DEFAULT NULL,
  region TEXT DEFAULT 'us',
  realm TEXT DEFAULT 'doomhowl',
  prof1_name TEXT DEFAULT '',
  prof1_lvl INTEGER DEFAULT 0,
  prof2_name TEXT DEFAULT '',
  prof2_lvl INTEGER DEFAULT 0,
  prof_cooking_lvl INTEGER DEFAULT 0,
  prof_aid_lvl INTEGER DEFAULT 0,
  prof_fishing_lvl INTEGER DEFAULT 0,
  twitch_url TEXT DEFAULT '',
  youtube_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_characters_user_id ON wow_characters (user_id);
CREATE INDEX IF NOT EXISTS idx_characters_visibility ON wow_characters (visibility);
CREATE INDEX IF NOT EXISTS idx_characters_created_at ON wow_characters (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adventures_event_date ON adventures (event_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_adventures_published ON adventures (published);
CREATE INDEX IF NOT EXISTS idx_adventures_visibility ON adventures (visibility);
