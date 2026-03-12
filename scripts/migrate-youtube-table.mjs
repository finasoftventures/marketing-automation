// This script creates the youtube_videos table using the Supabase management API
// Run with: node scripts/migrate-youtube-table.mjs

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env.local
const envPath = path.resolve(".", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

// For DDL we use the REST API with rpc or direct SQL via management API
// We can use the Supabase JS client rpc to run raw SQL via pg_execute
const supabase = createClient(supabaseUrl, serviceRoleKey);

const sql = `
CREATE TABLE IF NOT EXISTS public.youtube_videos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text,
  description      text,
  operation_name   text,
  youtube_video_id text,
  status           text NOT NULL DEFAULT 'generating',
  error            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'youtube_videos' AND policyname = 'Users can manage their own videos'
  ) THEN
    CREATE POLICY "Users can manage their own videos"
      ON public.youtube_videos FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;
`;

const { data, error } = await supabase.rpc("run_sql", { query: sql });

if (error) {
  console.error("Migration failed:", error);
  console.log("\n⚠️  Could not auto-create table via RPC.");
  console.log("Please run the following SQL manually in Supabase SQL Editor:\n");
  console.log(sql);
} else {
  console.log("✅ youtube_videos table created successfully!");
}
