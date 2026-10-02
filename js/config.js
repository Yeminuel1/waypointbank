/* ============================================================
   Backend settings. The publishable/anon key is meant to be public;
   row level security protects the data. Never put the service_role
   (secret) key in this file.
   ============================================================ */
window.WAYPOINT_CONFIG = {
  supabaseUrl: 'https://iajvrntavcqsvulyirgn.supabase.co',
  supabaseAnonKey: 'sb_publishable_u1ee_q6bkPZeV2gIyDjL0w_4M2ed5sP',
  emailDomain: 'users.waypoint-bank.app'  // must match supabase/schema.sql and the edge function
};
