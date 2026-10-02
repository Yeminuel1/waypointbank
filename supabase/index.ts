// Edge Function: admin-users
// Does the things a browser must never be allowed to do: create customer logins,
// change a customer's password or username, and delete a login.
// Every call is checked: the caller must be signed in AND listed in the `admins` table.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Must match `emailDomain` in js/config.js and the domain in supabase/schema.sql
const DOMAIN = Deno.env.get('EMAIL_DOMAIN') ?? 'users.waypoint-bank.app';
const toEmail = (u: string) => `${u.trim().toLowerCase()}@${DOMAIN}`;
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1. who is calling?
    const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: 'Not signed in' }, 401);

    // 2. are they an admin?
    const admin = createClient(url, service);
    const { data: isAdmin } = await admin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
    if (!isAdmin) return json({ error: 'Admins only' }, 403);

    const body = await req.json();

    switch (body.action) {
      case 'create': {
        const c = body.customer;
        if (!c || !USERNAME_RE.test(c.username ?? '')) return json({ error: 'Username must be 3–30 letters, numbers, dots, dashes or underscores.' }, 400);
        if (!body.password || String(body.password).length < 6) return json({ error: 'Password must be at least 6 characters.' }, 400);
        const { data: created, error } = await admin.auth.admin.createUser({
          email: toEmail(c.username), password: body.password, email_confirm: true,
          user_metadata: { username: c.username, name: c.data?.name ?? '' },
        });
        if (error) return json({ error: /already/i.test(error.message) ? 'That username is already taken.' : error.message }, 400);
        const id = created.user!.id;
        const { error: e2 } = await admin.from('customers').upsert({
          id, username: c.username, status: c.status ?? 'approved', suspend_message: c.suspend_message ?? '',
          member_since: c.member_since ?? new Date().toISOString().slice(0, 10), data: c.data ?? {},
        });
        if (e2) return json({ error: e2.message }, 400);
        await admin.from('customer_secrets').upsert({ customer_id: id, access_code: c.access_code ?? '' });
        return json({ id });
      }
      case 'set_password': {
        if (!body.password || String(body.password).length < 6) return json({ error: 'Password must be at least 6 characters.' }, 400);
        const { error } = await admin.auth.admin.updateUserById(body.id, { password: body.password });
        return error ? json({ error: error.message }, 400) : json({ ok: true });
      }
      case 'set_username': {
        if (!USERNAME_RE.test(body.username ?? '')) return json({ error: 'Username must be 3–30 letters, numbers, dots, dashes or underscores.' }, 400);
        const { error } = await admin.auth.admin.updateUserById(body.id, { email: toEmail(body.username), email_confirm: true });
        if (error) return json({ error: /already/i.test(error.message) ? 'That username is already taken.' : error.message }, 400);
        const { error: e2 } = await admin.from('customers').update({ username: body.username }).eq('id', body.id);
        return e2 ? json({ error: e2.message }, 400) : json({ ok: true });
      }
      case 'delete': {
        const { error } = await admin.auth.admin.deleteUser(body.id); // customers row cascades
        return error ? json({ error: error.message }, 400) : json({ ok: true });
      }
      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    return json({ error: String((err as Error).message ?? err) }, 500);
  }
});
