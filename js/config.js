/* ============================================================
   Backend settings.
   Leave supabaseUrl / supabaseAnonKey empty to run in browser-only demo mode
   (data stays in this browser's localStorage).
   Fill them in to store everything in Supabase and reach it from any device.
   The anon key is meant to be public — row level security protects the data.
   Never put the service_role key in this file.
   ============================================================ */
window.WAYPOINT_CONFIG = {
  supabaseUrl: '',        // e.g. 'https://abcdxyz.supabase.co'
  supabaseAnonKey: '',    // Project Settings → API → anon public key
  emailDomain: 'users.waypoint-bank.app'  // must match supabase/schema.sql and the edge function
};
