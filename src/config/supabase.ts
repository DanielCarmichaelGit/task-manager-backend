import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only throw error in production, allow graceful degradation in development
if (
  process.env.NODE_ENV === "production" &&
  (!supabaseUrl || !supabaseAnonKey)
) {
  throw new Error("Missing Supabase environment variables");
}

// Client for user operations (uses anon key)
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Admin client for server-side operations (uses service role key)
const supabaseAdmin: SupabaseClient | null =
  supabaseServiceRoleKey && supabaseUrl
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

export { supabase, supabaseAdmin };
