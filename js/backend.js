/* ============================================================
   Backend layer — talks to Supabase when js/config.js is filled in.
   When it isn't, Backend.enabled is false and script.js keeps using
   localStorage exactly as before.

   Two separate Supabase clients (each keeps its session in this tab's
   sessionStorage): one for customers, one for admins — so the admin
   panel and the customer app never share a login.
   ============================================================ */
const Backend = (() => {
  const cfg = window.WAYPOINT_CONFIG || {};
  const enabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && window.supabase.createClient);
  const DOMAIN = cfg.emailDomain || 'users.waypoint-bank.app';

  if (!enabled && cfg.supabaseUrl && !(window.supabase && window.supabase.createClient)) {
    console.warn('Supabase library failed to load — running in browser-only demo mode.');
  }

  function make(storageKey) {
    return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { storageKey, storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
  }
  const clientSb = enabled ? make('waypoint-client-auth') : null;
  const adminSb = enabled ? make('waypoint-admin-auth') : null;

  const toEmail = u => String(u).trim().toLowerCase() + '@' + DOMAIN;
  const USERNAME_RE = /^[a-z0-9._-]{3,30}$/i;
  const nice = err => {
    const m = (err && err.message) || String(err || 'Something went wrong');
    if (/invalid login/i.test(m)) return 'Incorrect username or password.';
    if (/already|registered|duplicate/i.test(m)) return 'That username is already taken.';
    if (/password/i.test(m) && /6|short|least/i.test(m)) return 'Password must be at least 6 characters.';
    return m;
  };

  /* DB row  <->  the customer object the app already uses */
  function fromRow(row, secret) {
    return Object.assign({}, row.data || {}, {
      id: row.id, username: row.username, status: row.status,
      suspendMessage: row.suspend_message || '', memberSince: row.member_since || '',
      transferCode: secret ? secret.access_code : '', password: ''
    });
  }
  function toRow(c) {
    const { id, username, status, suspendMessage, memberSince, transferCode, password, hasCode, ...data } = c;
    return { username, status, suspend_message: suspendMessage || '', member_since: memberSince || null, data };
  }

  let channel = null;

  const api = {
    enabled, USERNAME_RE, fromRow, toRow, nice,

    /* ---------- customers ---------- */
    async signUp({ username, password, name, email }) {
      if (!USERNAME_RE.test(username)) return { error: 'Username must be 3–30 letters, numbers, dots, dashes or underscores.' };
      const { error } = await clientSb.auth.signUp({
        email: toEmail(username), password, options: { data: { username, name, email } }
      });
      if (error) return { error: nice(error) };
      await clientSb.auth.signOut();   // they stay signed out until an admin approves them
      return {};
    },

    async login(username, password) {
      const { data, error } = await clientSb.auth.signInWithPassword({ email: toEmail(username), password });
      if (error) return { error: nice(error) };
      const mine = await api.loadMine();
      if (!mine) { await clientSb.auth.signOut(); return { error: 'No account found with that username.' }; }
      if (mine.status === 'pending') { await clientSb.auth.signOut(); return { pending: true }; }
      return { customer: mine };
    },

    /* The signed-in customer's own record (null if nobody is signed in). */
    async loadMine() {
      const { data: s } = await clientSb.auth.getSession();
      const uid = s && s.session && s.session.user && s.session.user.id;
      if (!uid) return null;
      const { data: row, error } = await clientSb.from('customers').select('*').eq('id', uid).maybeSingle();
      if (error || !row) return null;
      const c = fromRow(row);
      const { data: has } = await clientSb.rpc('has_access_code');
      c.hasCode = !!has;
      c.transferCode = '';            // customers never receive their code
      return c;
    },

    async saveMine(customer) {
      const { error } = await clientSb.rpc('save_my_data', { p_data: toRow(customer).data });
      if (error) throw error;
    },
    /* Money moves run inside the database (do_move): it checks the code, balance and fees itself. */
    async move(op, code) {
      const { error } = await clientSb.rpc('do_move', {
        p_kind: op.kind, p_from: op.from || null, p_to: op.to || null, p_amount: op.amount,
        p_fee: op.fee || 0, p_desc: op.desc || '', p_cat: op.cat || '', p_fee_desc: op.feeDesc || '',
        p_code: String(code || '')
      });
      if (error) throw new Error(error.message);
    },
    async checkCode(code) {
      const { data, error } = await clientSb.rpc('check_access_code', { p_code: String(code) });
      return !error && data === true;
    },
    subscribeMine(id, onChange) {
      api.unsubscribe();
      try {
        channel = clientSb.channel('mine-' + id)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: 'id=eq.' + id }, onChange)
          .subscribe();
      } catch (e) { console.warn('Realtime unavailable, falling back to polling', e); }
    },
    unsubscribe() {
      if (channel) { try { clientSb.removeChannel(channel); } catch (e) {} channel = null; }
    },
    async logout() { api.unsubscribe(); try { await clientSb.auth.signOut(); } catch (e) {} },

    /* ---------- admin ---------- */
    async adminLogin(email, password) {
      const { data, error } = await adminSb.auth.signInWithPassword({ email: String(email).trim(), password });
      if (error) return { error: 'Incorrect email or password.' };
      const ok = await api.adminRestore();
      if (!ok) { await adminSb.auth.signOut(); return { error: 'That account is not an admin.' }; }
      return {};
    },
    async adminRestore() {
      const { data: s } = await adminSb.auth.getSession();
      const uid = s && s.session && s.session.user && s.session.user.id;
      if (!uid) return false;
      const { data } = await adminSb.from('admins').select('user_id').eq('user_id', uid).maybeSingle();
      return !!data;
    },
    async adminLoad() {
      const [cs, ss] = await Promise.all([
        adminSb.from('customers').select('*'),
        adminSb.from('customer_secrets').select('*')
      ]);
      if (cs.error) throw cs.error;
      const secrets = {};
      (ss.data || []).forEach(s => { secrets[s.customer_id] = s; });
      return (cs.data || []).map(r => fromRow(r, secrets[r.id]))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    },
    async adminSave(c, withData) {
      const row = toRow(c);
      if (withData === false) delete row.data;       // status-only change: leave balances/cards alone
      const r1 = await adminSb.from('customers').update(row).eq('id', c.id);
      if (r1.error) throw r1.error;
      const r2 = await adminSb.from('customer_secrets').upsert({ customer_id: c.id, access_code: c.transferCode || '' });
      if (r2.error) throw r2.error;
    },
    async adminCall(action, payload) {
      const { data, error } = await adminSb.functions.invoke('admin-users', { body: Object.assign({ action }, payload) });
      let msg = data && data.error;
      if (!msg && error) {
        try { const j = await error.context.json(); msg = j.error; } catch (e) { msg = error.message; }
      }
      if (msg) throw new Error(msg);
      return data;
    },
    async adminLogout() { try { await adminSb.auth.signOut(); } catch (e) {} }
  };
  return api;
})();
