-- ============================================================
-- InvestorRaise AutoPilot — COMPLETE FRESH SCHEMA
-- Drops everything and recreates from scratch
-- Run in Supabase SQL Editor > New Query
-- ============================================================

-- ── Drop all tables (order matters due to FK constraints) ──
DROP TABLE IF EXISTS post_history CASCADE;
DROP TABLE IF EXISTS linkedin_posts CASCADE;
DROP TABLE IF EXISTS youtube_videos CASCADE;
DROP TABLE IF EXISTS generation_queue CASCADE;
DROP TABLE IF EXISTS ai_insights CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS content_plan CASCADE;
DROP TABLE IF EXISTS knowledge_base CASCADE;
DROP TABLE IF EXISTS social_accounts CASCADE;
DROP TABLE IF EXISTS brand_profile CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ── Drop functions & triggers ──
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- ── Enable UUID extension ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════
-- USERS
-- ════════════════════════════════════════════════════════════
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  -- AI Voice Profile
  persona TEXT,                        -- Who they are (role, experience, story)
  niche_description TEXT,              -- What topics they cover
  writing_style TEXT,                  -- How they write (e.g. "direct, data-driven, slightly humorous")
  target_audience TEXT,                -- Who reads their posts (e.g. "B2B SaaS founders, Series A stage")
  content_goals TEXT,                  -- Why they post (e.g. "thought leadership, hiring, lead gen")
  avoid_topics TEXT,                   -- Topics to never post about
  -- Writing Samples (last 3 best posts in their own words — AI learns from these)
  writing_sample_1 TEXT,
  writing_sample_2 TEXT,
  writing_sample_3 TEXT,
  -- Posting Preferences
  posting_frequency TEXT DEFAULT '5',  -- posts per week
  linkedin_url TEXT,                   -- LinkedIn profile URL
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- BRAND PROFILE
-- ════════════════════════════════════════════════════════════
CREATE TABLE brand_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  -- Scheduling
  posting_time TEXT DEFAULT '08:00',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  posting_days TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday'],
  notification_email BOOLEAN DEFAULT TRUE,
  automation_mode TEXT DEFAULT 'semi_auto' CHECK (automation_mode IN ('full_auto', 'semi_auto', 'manual')),
  autopilot_paused BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- SOCIAL ACCOUNTS
-- ════════════════════════════════════════════════════════════
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'youtube', 'instagram')),
  platform_account_name TEXT,
  platform_account_id TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  profile_picture TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- ════════════════════════════════════════════════════════════
-- LINKEDIN POSTS
-- ════════════════════════════════════════════════════════════
CREATE TABLE linkedin_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT,
  text_content TEXT,
  image_b64 TEXT,         -- stored truncated to 50k chars for preview
  image_url TEXT,         -- future: GCS URL if we offload images
  linkedin_post_id TEXT,  -- LinkedIn's ugcPost ID (e.g. "7240123456789012345")
  platform_post_id TEXT,  -- same as linkedin_post_id (alias kept for analytics join)
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- YOUTUBE VIDEOS
-- ════════════════════════════════════════════════════════════
CREATE TABLE youtube_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  youtube_video_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  gcs_video_url TEXT,
  operation_name TEXT,
  hook_sentence TEXT,        -- the voiceover hook generated by Gemini
  visual_direction TEXT,     -- the visual prompt sent to Veo
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','generating','ready','uploading','published','failed')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- POST HISTORY (Analytics)
-- Join key: platform_post_urn = 'urn:li:ugcPost:{linkedin_post_id}'
-- ════════════════════════════════════════════════════════════
CREATE TABLE post_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'youtube')),
  platform_post_urn TEXT NOT NULL,     -- e.g. urn:li:ugcPost:12345 or youtube video id
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE(user_id, platform_post_urn)
);

-- ════════════════════════════════════════════════════════════
-- CONTENT PLAN (for cron autopilot)
-- ════════════════════════════════════════════════════════════
CREATE TABLE content_plan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  angle TEXT,
  hook TEXT,
  planned_date DATE NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'writing', 'written', 'published', 'skipped', 'failed')),
  generated_post_id UUID REFERENCES linkedin_posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ════════════════════════════════════════════════════════════
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Brand profile
CREATE POLICY "brand_profile_all" ON brand_profile FOR ALL USING (auth.uid() = user_id);

-- Social accounts
CREATE POLICY "social_accounts_all" ON social_accounts FOR ALL USING (auth.uid() = user_id);

-- LinkedIn posts
CREATE POLICY "linkedin_posts_all" ON linkedin_posts FOR ALL USING (auth.uid() = user_id);

-- YouTube videos
CREATE POLICY "youtube_videos_all" ON youtube_videos FOR ALL USING (auth.uid() = user_id);

-- Post history
CREATE POLICY "post_history_all" ON post_history FOR ALL USING (auth.uid() = user_id);

-- Content plan
CREATE POLICY "content_plan_all" ON content_plan FOR ALL USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "notifications_all" ON notifications FOR ALL USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════
CREATE INDEX idx_social_accounts_user ON social_accounts(user_id);
CREATE INDEX idx_social_accounts_platform ON social_accounts(user_id, platform);
CREATE INDEX idx_linkedin_posts_user ON linkedin_posts(user_id, posted_at DESC);
CREATE INDEX idx_linkedin_posts_id ON linkedin_posts(linkedin_post_id);
CREATE INDEX idx_youtube_videos_user ON youtube_videos(user_id, created_at DESC);
CREATE INDEX idx_post_history_user ON post_history(user_id, platform, fetched_at DESC);
CREATE INDEX idx_post_history_urn ON post_history(platform_post_urn);
CREATE INDEX idx_content_plan_user ON content_plan(user_id, planned_date);
CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- ════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ════════════════════════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_brand_profile_updated_at
  BEFORE UPDATE ON brand_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON social_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_youtube_videos_updated_at
  BEFORE UPDATE ON youtube_videos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_content_plan_updated_at
  BEFORE UPDATE ON content_plan FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create user row on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Done! Verify with:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- ============================================================
