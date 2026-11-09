-- ==============================================================================
-- Photo Reveal Game - Complete Supabase Backend Schema
-- Run this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Games Table
CREATE TABLE IF NOT EXISTS public.games (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' | 'active' | 'paused' | 'finished' | 'revealing_answer'
  current_photo_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Photos Table
CREATE TABLE IF NOT EXISTS public.photos (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  game_id TEXT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  hints TEXT DEFAULT '', -- pipe-separated hints: "hint1||hint2||hint3"
  file_path TEXT NOT NULL, -- public image URL or Supabase Storage URL
  sort_order INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create Game Settings Table
CREATE TABLE IF NOT EXISTS public.game_settings (
  game_id TEXT PRIMARY KEY REFERENCES public.games(id) ON DELETE CASCADE,
  reveal_duration INTEGER NOT NULL DEFAULT 60,
  reveal_interval INTEGER NOT NULL DEFAULT 3,
  grid_rows INTEGER NOT NULL DEFAULT 4,
  grid_cols INTEGER NOT NULL DEFAULT 4,
  reveal_order TEXT NOT NULL DEFAULT 'random', -- 'random' | 'sequential'
  reveal_mode TEXT NOT NULL DEFAULT 'auto',     -- 'auto' | 'manual'
  hints_enabled BOOLEAN NOT NULL DEFAULT true,
  timer_enabled BOOLEAN NOT NULL DEFAULT true,
  multiple_attempts BOOLEAN NOT NULL DEFAULT true
);

-- 5. Create Players Table
CREATE TABLE IF NOT EXISTS public.players (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  game_id TEXT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create Submissions Table
CREATE TABLE IF NOT EXISTS public.submissions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  game_id TEXT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  photo_id TEXT NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  guess TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  tiles_revealed INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create Live Game Reveal State Table (for real-time persistence)
CREATE TABLE IF NOT EXISTS public.game_reveal_state (
  game_id TEXT PRIMARY KEY REFERENCES public.games(id) ON DELETE CASCADE,
  photo_id TEXT DEFAULT '',
  revealed_tiles JSONB NOT NULL DEFAULT '[]'::jsonb,
  tile_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  timer_remaining INTEGER NOT NULL DEFAULT 60,
  is_answer_shown BOOLEAN NOT NULL DEFAULT false,
  current_hint_index INTEGER NOT NULL DEFAULT -1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 8. Enable Row Level Security (RLS) & Add Public Policies
-- ==============================================================================

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_reveal_state ENABLE ROW LEVEL SECURITY;

-- Allow unrestricted anonymous access for the game (public game app)
DO $$
BEGIN
  -- Games
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'games' AND policyname = 'Allow public access to games') THEN
    CREATE POLICY "Allow public access to games" ON public.games FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Photos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'photos' AND policyname = 'Allow public access to photos') THEN
    CREATE POLICY "Allow public access to photos" ON public.photos FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Game Settings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_settings' AND policyname = 'Allow public access to game_settings') THEN
    CREATE POLICY "Allow public access to game_settings" ON public.game_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Players
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'players' AND policyname = 'Allow public access to players') THEN
    CREATE POLICY "Allow public access to players" ON public.players FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Submissions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'submissions' AND policyname = 'Allow public access to submissions') THEN
    CREATE POLICY "Allow public access to submissions" ON public.submissions FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- Game Reveal State
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'game_reveal_state' AND policyname = 'Allow public access to game_reveal_state') THEN
    CREATE POLICY "Allow public access to game_reveal_state" ON public.game_reveal_state FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==============================================================================
-- 9. Enable Realtime Replication
-- ==============================================================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_settings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.submissions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_reveal_state;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ==============================================================================
-- 10. Supabase Storage Setup (Photos Bucket)
-- ==============================================================================

-- Create public 'photos' bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy to allow anyone to read photos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Photo Access') THEN
    CREATE POLICY "Public Photo Access" ON storage.objects
      FOR SELECT USING (bucket_id = 'photos');
  END IF;
  
  -- Policy to allow uploads into photos bucket
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Photo Upload') THEN
    CREATE POLICY "Public Photo Upload" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'photos');
  END IF;

  -- Policy to allow photo updates
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Photo Update') THEN
    CREATE POLICY "Public Photo Update" ON storage.objects
      FOR UPDATE USING (bucket_id = 'photos');
  END IF;

  -- Policy to allow photo deletions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Photo Delete') THEN
    CREATE POLICY "Public Photo Delete" ON storage.objects
      FOR DELETE USING (bucket_id = 'photos');
  END IF;
END $$;

-- ==============================================================================
-- 11. Initial Demo Game Seed (Optional)
-- ==============================================================================

DO $$
DECLARE
  demo_game_id TEXT := 'demo-game-1';
  eiffel_id TEXT := 'photo-eiffel';
  saturn_id TEXT := 'photo-saturn';
  bridge_id TEXT := 'photo-bridge';
  lion_id TEXT := 'photo-lion';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.games WHERE id = demo_game_id) THEN
    -- Insert Game
    INSERT INTO public.games (id, name, status, current_photo_index)
    VALUES (demo_game_id, 'Demo Championship', 'waiting', 0);

    -- Insert Settings
    INSERT INTO public.game_settings (game_id, reveal_duration, reveal_interval, grid_rows, grid_cols, reveal_order, reveal_mode, hints_enabled, timer_enabled, multiple_attempts)
    VALUES (demo_game_id, 45, 3, 4, 4, 'random', 'auto', true, true, true);

    -- Insert Photos with SVG data URIs so they load everywhere immediately
    INSERT INTO public.photos (id, game_id, title, hints, file_path, sort_order, category)
    VALUES 
    (
      eiffel_id,
      demo_game_id,
      'Eiffel Tower',
      'Located in the capital of France||Constructed for the 1889 World Fair||Made of wrought iron',
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600"><rect width="800" height="600" fill="%231e1b4b"/><circle cx="680" cy="120" r="50" fill="%23fef3c7"/><rect x="0" y="520" width="800" height="80" fill="%231e293b"/><path d="M 280 520 L 360 320 L 440 320 L 520 520 L 470 520 L 430 380 Q 400 360 370 380 L 330 520 Z" fill="%23fbbf24"/><rect x="350" y="300" width="100" height="20" rx="4" fill="%23fbbf24"/><path d="M 360 300 L 385 180 L 415 180 L 440 300 Z" fill="%23fbbf24"/><polygon points="385,165 400,60 415,165" fill="%23fbbf24"/></svg>',
      0,
      'Landmarks'
    ),
    (
      saturn_id,
      demo_game_id,
      'Saturn',
      'Sixth planet from the Sun||Famous for its prominent ring system||A gas giant named after a Roman god',
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600"><rect width="800" height="600" fill="%23020617"/><circle cx="400" cy="300" r="140" fill="%23f59e0b"/><ellipse cx="400" cy="300" rx="320" ry="70" fill="none" stroke="%23fde047" stroke-width="26" opacity="0.8"/></svg>',
      1,
      'Space'
    ),
    (
      bridge_id,
      demo_game_id,
      'Golden Gate Bridge',
      'Suspension bridge in California||Painted in International Orange||Spans a famous bay and strait',
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600"><rect width="800" height="600" fill="%230f172a"/><rect x="240" y="160" width="24" height="280" fill="%23dc2626"/><rect x="520" y="160" width="24" height="280" fill="%23dc2626"/><rect x="0" y="390" width="800" height="20" fill="%23991b1b"/></svg>',
      2,
      'Landmarks'
    ),
    (
      lion_id,
      demo_game_id,
      'Lion',
      'Known as the King of the Jungle||Males possess a large majestic mane||Apex predator native to Africa',
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600"><rect width="800" height="600" fill="%23451a03"/><circle cx="400" cy="300" r="220" fill="%23b45309"/><ellipse cx="400" cy="330" rx="120" ry="140" fill="%23f59e0b"/></svg>',
      3,
      'Animals'
    );

    -- Initialize Reveal State
    INSERT INTO public.game_reveal_state (game_id, photo_id, revealed_tiles, tile_order, timer_remaining, is_answer_shown, current_hint_index)
    VALUES (demo_game_id, eiffel_id, '[]'::jsonb, '[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]'::jsonb, 45, false, -1);
  END IF;
END $$;
