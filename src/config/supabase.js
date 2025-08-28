const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

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
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Admin client for server-side operations (uses service role key)
const supabaseAdmin =
  supabaseServiceRoleKey && supabaseUrl
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

module.exports = {
  supabase,
  supabaseAdmin,
};
