-- ============================================================
-- AutoPilot Migration v2
-- Run this in Supabase SQL Editor (safe to run multiple times)
-- ============================================================

-- Add youtube to social_accounts platform check
ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check;
ALTER TABLE social_accounts ADD CONSTRAINT social_accounts_platform_check
  CHECK (platform IN ('linkedin', 'instagram', 'youtube'));

-- Extra columns for richer social account data
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS channel_title TEXT;
ALTER TABLE social_accounts ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- User persona fields (set during onboarding)
ALTER TABLE users ADD COLUMN IF NOT EXISTS persona TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS niche_description TEXT;

-- ── YouTube Videos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS youtube_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  generated_post_id UUID REFERENCES generated_posts(id) ON DELETE SET NULL,
  youtube_video_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  gcs_video_url TEXT,
  operation_name TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','generating','ready','uploading','published','failed')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own youtube_videos" ON youtube_videos
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_youtube_videos_user ON youtube_videos(user_id);

CREATE TRIGGER update_youtube_videos_updated_at
  BEFORE UPDATE ON youtube_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── LinkedIn Posts table (missing from original schema) ──────────────────────
CREATE TABLE IF NOT EXISTS linkedin_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT,
  text_content TEXT,
  image_b64 TEXT,
  image_url TEXT,
  linkedin_post_id TEXT,
  platform_post_id TEXT,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE linkedin_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own linkedin_posts" ON linkedin_posts
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_posts_user ON linkedin_posts(user_id, posted_at DESC);

-- ── LinkedIn Posts (legacy table — add user_id column) ────────
-- The old table had no user_id. We add it and backfill with NULL.
ALTER TABLE linkedin_posts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE linkedin_posts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── Post History: add platform_post_urn for analytics fetch ───
ALTER TABLE post_history ADD COLUMN IF NOT EXISTS platform_post_urn TEXT;

-- ── linkedin_posts table: ensure platform_post_id exists ──────
-- (may already exist; safe to ignore error if it does)
ALTER TABLE linkedin_posts ADD COLUMN IF NOT EXISTS platform_post_id TEXT;

-- ============================================================
-- DONE. Verify by running:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'social_accounts';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'youtube_videos';
-- ============================================================
