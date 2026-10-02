/* ============================================================
   DEMO STATE — fictional data, persisted locally per browser.
   Multiple customers live under state.customers; state.currentCustomerId
   is whoever is logged into the member-facing app right now.
   ============================================================ */
const STORAGE_KEY = 'waypoint-state-v3';

function seedState() {
  const alex = {
    id: 'cust_alex', name: 'Alex Morgan', username: 'alexmorgan', password: 'alex2026', status: 'approved', email: 'alex@waypoint-demo.com', photo: null,
    phone: '(555) 014-2281', dob: '1988-04-12', address: '214 Harbor Street, Apt 5B, Portland, ME 04101', transferCode: '482915', memberSince: '2019-03-08',
    accounts: [
      {
        id: 'chk', type: 'Everyday Checking', number: '••••4821', balance: 4382.10,
        transactions: [
          { id: 'tx1', date: '2026-09-19', desc: 'Paycheck deposit', cat: 'Income', amount: 2140.00 },
          { id: 'tx2', date: '2026-09-18', desc: 'Harborline Grocery', cat: 'Groceries', amount: -64.32 },
          { id: 'tx3', date: '2026-09-16', desc: 'Riverside Coffee Co.', cat: 'Dining', amount: -6.75 },
          { id: 'tx4', date: '2026-09-15', desc: 'Transfer to Savings', cat: 'Transfer', amount: -300.00 },
          { id: 'tx5', date: '2026-09-12', desc: 'Northline Electric', cat: 'Utilities', amount: -88.40 },
          { id: 'tx6', date: '2026-09-08', desc: 'Waypoint ATM Withdrawal', cat: 'Cash', amount: -60.00 },
        ]
      },
      {
        id: 'sav', type: 'Foundation Savings', number: '••••1092', balance: 18650.44,
        transactions: [
          { id: 'tx7', date: '2026-09-15', desc: 'Transfer from Checking', cat: 'Transfer', amount: 300.00 },
          { id: 'tx8', date: '2026-09-01', desc: 'Monthly interest', cat: 'Interest', amount: 22.14 },
          { id: 'tx9', date: '2026-08-15', desc: 'Transfer from Checking', cat: 'Transfer', amount: 300.00 },
          { id: 'tx10', date: '2026-08-01', desc: 'Monthly interest', cat: 'Interest', amount: 21.98 },
        ]
      }
    ],
    cards: [
      { id: 'debit', kind: 'Debit', label: 'Everyday Checking Debit', number: '4821', holder: 'Alex Morgan', expiry: '12/29', frozen: false },
      { id: 'credit', kind: 'Credit', label: 'Waypoint Rewards Credit', number: '7734', holder: 'Alex Morgan', expiry: '05/28', balance: 612.30, limit: 5000, frozen: false },
    ]
  };

  const jordan = {
    id: 'cust_jordan', name: 'Jordan Lee', username: 'jordanlee', password: 'jordan2026', status: 'approved', email: 'jordan@waypoint-demo.com', photo: null,
    phone: '(555) 019-7734', dob: '1994-11-02', address: '88 Maple Avenue, Burlington, VT 05401', transferCode: '730264', memberSince: '2022-06-21',
    accounts: [
      {
        id: 'cust_jordan_chk', type: 'Everyday Checking', number: '••••2256', balance: 1180.55,
        transactions: [
          { id: 'tx11', date: '2026-09-20', desc: 'Paycheck deposit', cat: 'Income', amount: 1450.00 },
          { id: 'tx12', date: '2026-09-17', desc: 'Riverside Coffee Co.', cat: 'Dining', amount: -5.25 },
          { id: 'tx13', date: '2026-09-10', desc: 'Northline Electric', cat: 'Utilities', amount: -64.10 },
        ]
      }
    ],
    cards: [
      { id: 'cust_jordan_debit', kind: 'Debit', label: 'Everyday Checking Debit', number: '3391', holder: 'Jordan Lee', expiry: '08/28', frozen: false }
    ]
  };

  return { customers: [alex, jordan], currentCustomerId: alex.id };
}

let state = null;

function loadState() {
  if (Backend.enabled) { state = { customers: [], currentCustomerId: null }; return; }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.customers) && parsed.customers.length) { state = parsed; normalizeState(); return; }
    }
  } catch (e) { console.warn('Could not read saved demo state', e); }
  state = seedState();
}

/* Older saved data may be missing the newer profile / code fields. */
function normalizeState() {
  const seeded = {};
  seedState().customers.forEach(c => { seeded[c.id] = c; });
  state.customers.forEach(c => {
    const d = seeded[c.id] || {};
    ['phone','dob','address','memberSince'].forEach(k => { if (c[k] === undefined) c[k] = d[k] || ''; });
    if (c.transferCode === undefined) c.transferCode = d.transferCode || '';
    if (c.suspendMessage === undefined) c.suspendMessage = '';
  });
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}

/* ---------------- Account status: active / suspended / on hold ---------------- */
const BANK_PHONE = '(240) 242-7078';
const BANK_PHONE_HREF = 'tel:+12402427078';
const BANK_EMAIL = 'support@waypoint.com';
const DEFAULT_SUSPEND_MSG = 'Your account has been suspended. You can\'t sign in to banking, make transfers or payments until the suspension is lifted. Please contact the bank to have it lifted.';
const DEFAULT_HOLD_MSG = 'A hold has been placed on your account. Transfers and payments are unavailable while it is in place. Please contact the bank so it can be reviewed and lifted.';

function isRestricted(c) { return !!c && (c.status === 'suspended' || c.status === 'hold'); }

function statusBadge(c) {
  const base = 'class="tx-cat" style="';
  if (c.status === 'pending') return `<span ${base}color:var(--rust); border-color:var(--rust);">Pending</span>`;
  if (c.status === 'suspended') return `<span ${base}color:#fff; background:var(--rust); border-color:var(--rust);">Suspended</span>`;
  if (c.status === 'hold') return `<span ${base}color:#241a0c; background:var(--brass-bright); border-color:var(--brass);">On hold</span>`;
  return `<span class="tx-cat">Active</span>`;
}

/* Reads the latest saved data (the admin may have changed something in another tab). */
function readStored() {
  if (Backend.enabled) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const p = JSON.parse(raw); if (p && Array.isArray(p.customers)) return p; }
  } catch (e) {}
  return null;
}
function reloadFromStorage() {
  if (Backend.enabled) return;
  const p = readStored();
  if (p && p.customers.length) { state.customers = p.customers; normalizeState(); }
}
/* Light-weight sync that keeps object references intact: status + message only. */
function syncStatuses() {
  const p = readStored();
  if (!p) return;
  p.customers.forEach(sc => {
    const mine = state.customers.find(c => c.id === sc.id);
    if (mine) { mine.status = sc.status; mine.suspendMessage = sc.suspendMessage || ''; }
  });
}

function appVisible() { return !document.getElementById('app-view').classList.contains('hide'); }

/* If the logged-in customer has been suspended / put on hold, kick them to the suspension page. */
function enforceSuspension() {
  if (!appVisible()) return false;
  syncStatuses();
  const c = getCurrentCustomer();
  if (!isRestricted(c)) return false;
  try {
    sessionStorage.setItem('waypoint-suspended', c.id);
    sessionStorage.removeItem('waypoint-verified');
  } catch (e) {}
  if (typeof closeCodeModal === 'function') closeCodeModal();
  location.hash = '#/suspended';
  return true;
}

/* ---- Remote (Supabase) saving: debounced, only sends what changed ---- */
const lastSaved = {};                       // customer id -> row JSON last known on the server
const lastData = {};                        // customer id -> `data` JSON last known on the server
let saveTimer = null;
const rowJson = c => JSON.stringify(Backend.toRow(c));

function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.remove('hide');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.add('hide'), 4500);
}
function adminActive() { return location.hash.startsWith('#/admin') && isAdminAuthed(); }

function queueRemoteSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushRemote, 250);
}
async function flushRemote() {
  saveTimer = null;
  try {
    if (adminActive()) {
      for (const c of state.customers) {
        const j = rowJson(c) + '|' + (c.transferCode || '');
        if (lastSaved[c.id] === j) continue;
        // Only send balances/cards/profile when they actually changed — a status change
        // must never overwrite a customer's recent transfers with a stale copy.
        const dj = JSON.stringify(Backend.toRow(c).data);
        await Backend.adminSave(c, lastData[c.id] !== dj);
        lastSaved[c.id] = j; lastData[c.id] = dj;
      }
    } else {
      const c = getCurrentCustomer();
      if (c && lastSaved[c.id] !== undefined && lastSaved[c.id] !== rowJson(c)) {
        await Backend.saveMine(c); lastSaved[c.id] = rowJson(c);
      }
    }
  } catch (err) {
    console.error('Save failed', err);
    toast('Could not save changes: ' + ((err && err.message) || 'please try again'));
    if (!adminActive()) { await refreshMine(); enforceSuspension(); }
  }
}
function markAdminSaved() {
  state.customers.forEach(c => {
    lastSaved[c.id] = rowJson(c) + '|' + (c.transferCode || '');
    lastData[c.id] = JSON.stringify(Backend.toRow(c).data);
  });
}

/* Pull this customer's latest record (balances the admin changed, status, etc.). */
function adoptMine(mine) {
  const existing = state.customers.find(c => c.id === mine.id);
  state.customers = [mine];
  state.currentCustomerId = mine.id;
  lastSaved[mine.id] = rowJson(mine);
  return !existing || JSON.stringify(Backend.toRow(existing).data) !== JSON.stringify(Backend.toRow(mine).data);
}
async function refreshMine() {
  if (!Backend.enabled || adminActive() || saveTimer) return;
  const mine = await Backend.loadMine();
  if (!mine) return;
  const changed = adoptMine(mine);
  if (changed && appVisible()) render();
}
function startRemoteWatch(id) {
  Backend.subscribeMine(id, async () => {
    await refreshMine();
    if (!enforceSuspension() && location.hash === '#/suspended') renderSuspended();
  });
}

function saveState() {
  if (Backend.enabled) { queueRemoteSave(); return; }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Could not save demo state — image may be too large for local storage', e); }
}

function fmt(n) {
  const neg = n < 0;
  const v = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (neg ? '-$' : '$') + v;
}
function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getCurrentCustomer() {
  return state.customers.find(c => c.id === state.currentCustomerId) || state.customers[0];
}
function getAccount(id) {
  const cust = getCurrentCustomer();
  return cust ? cust.accounts.find(a => a.id === id) : null;
}

/* A small circular photo, or initials if no photo has been uploaded. */
function avatarHTML(cust, size) {
  size = size || 36;
  if (cust && cust.photo) {
    return `<img src="${cust.photo}" alt="${cust.name}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex:none;">`;
  }
  const initials = ((cust && cust.name) || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const fs = Math.round(size * 0.4);
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--brass);color:#241a0c;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${fs}px;flex:none;">${initials}</div>`;
}

/* Standard-format card: ID-1 proportions, chip, embossed number, network mark. */
function cardMarkup(c) {
  return `
    <div class="bankcard ${c.kind === 'Debit' ? 'debit' : 'credit'} ${c.frozen ? 'frozen' : ''}">
      <div class="bc-top">
        <div class="bc-chip"></div>
        <span class="bc-kind">${c.kind}</span>
      </div>
      <div class="bc-number">•••• •••• •••• ${c.number}</div>
      <div class="bc-bottom">
        <div>
          <div class="bc-name">${(c.holder || '').toUpperCase()}</div>
          <div class="bc-expiry">VALID THRU ${c.expiry || '12/29'}</div>
        </div>
        <div class="bc-network"><span class="c1"></span><span class="c2"></span></div>
      </div>
    </div>
  `;
}

function newTxId() { return 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 10000); }

/* Creates a new customer record: one checking account + one debit card.
   status 'approved' can log in immediately; 'pending' needs an admin to approve it first. */
function createCustomer(opts) {
  const customer = buildCustomer(opts);
  state.customers.push(customer);
  return customer;
}
function buildCustomer({ name, username, email, password, photo, startingBalance, status, phone, address, dob, transferCode }) {
  const id = 'cust_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const acctNum = '••••' + String(1000 + Math.floor(Math.random() * 9000));
  const cardNum = String(1000 + Math.floor(Math.random() * 9000));
  const customer = {
    id, name, email: email || '',
    username: (username || name.toLowerCase().replace(/\s+/g, '')),
    password: password || '',
    status: status || 'pending',
    photo: photo || null,
    phone: phone || '', address: address || '', dob: dob || '',
    transferCode: transferCode || '',
    suspendMessage: '',
    memberSince: new Date().toISOString().slice(0, 10),
    accounts: [{ id: id + '_chk', type: 'Everyday Checking', number: acctNum, balance: startingBalance || 0, transactions: [] }],
    cards: [{ id: id + '_debit', kind: 'Debit', label: 'Everyday Checking Debit', number: cardNum, holder: name, expiry: '12/29', frozen: false }]
  };
  return customer;
}

/* ---------------- View switching (public / login / app) ---------------- */
function showOnly(id) {
  ['public-view','login-view','verify-view','suspended-view','app-view'].forEach(v => {
    document.getElementById(v).classList.toggle('hide', v !== id);
  });
  window.scrollTo(0,0);
}

const STATIC_PAGES = ['home','personal','business','open-account','about','faq','terms','privacy','security','contact','admin-login'];
function showPublicPage(name) {
  document.querySelectorAll('.public-page').forEach(el => {
    el.classList.toggle('hide', el.id !== 'page-' + name);
  });
  window.scrollTo(0,0);
  if (name === 'open-account') {
    generateCaptcha();
    const form = document.getElementById('open-account-form');
    const success = document.getElementById('open-account-success');
    if (form) form.classList.remove('hide');
    if (success) success.classList.add('hide');
  }
}

/* Two-step sign-in: username + password, then the personal access code the bank set for you. */
function getVerifiedId() {
  try { return sessionStorage.getItem('waypoint-verified'); } catch (e) { return null; }
}
function getPendingId() {
  try { return sessionStorage.getItem('waypoint-pending'); } catch (e) { return null; }
}

function handleLogin(e) {
  e.preventDefault();
  const uname = document.getElementById('li-user').value.trim().toLowerCase();
  const pass = document.getElementById('li-pass').value;
  const errEl = document.getElementById('login-error');

  if (Backend.enabled) { handleLoginRemote(uname, pass, errEl); return; }

  reloadFromStorage();
  const match = state.customers.find(c => c.username.toLowerCase() === uname);

  if (!match) {
    errEl.textContent = 'No account found with that username.';
    errEl.classList.remove('hide');
    return;
  }
  if (match.status === 'pending') {
    errEl.textContent = 'Your account is still pending admin approval.';
    errEl.classList.remove('hide');
    return;
  }
  if (match.password !== pass) {
    errEl.textContent = 'Incorrect password.';
    errEl.classList.remove('hide');
    return;
  }

  errEl.classList.add('hide');
  if (isRestricted(match)) {
    try {
      sessionStorage.setItem('waypoint-suspended', match.id);
      sessionStorage.removeItem('waypoint-pending');
      sessionStorage.removeItem('waypoint-verified');
    } catch (err) {}
    document.getElementById('li-pass').value = '';
    location.hash = '#/suspended';
    return;
  }
  try {
    sessionStorage.setItem('waypoint-pending', match.id);
    sessionStorage.removeItem('waypoint-verified');
  } catch (err) {}
  document.getElementById('li-pass').value = '';
  location.hash = '#/verify';
}

async function handleLoginRemote(uname, pass, errEl) {
  errEl.classList.add('hide');
  const r = await Backend.login(uname, pass);
  const fail = msg => { errEl.textContent = msg; errEl.classList.remove('hide'); };
  if (r.error) return fail(r.error);
  if (r.pending) return fail('Your account is still pending admin approval.');
  adoptMine(r.customer);
  startRemoteWatch(r.customer.id);
  document.getElementById('li-pass').value = '';
  try {
    sessionStorage.removeItem('waypoint-verified');
    if (isRestricted(r.customer)) {
      sessionStorage.setItem('waypoint-suspended', r.customer.id);
      sessionStorage.removeItem('waypoint-pending');
      location.hash = '#/suspended';
    } else {
      sessionStorage.setItem('waypoint-pending', r.customer.id);
      location.hash = '#/verify';
    }
  } catch (err) { fail('Your browser is blocking session storage.'); }
}

function renderVerify() {
  const cust = state.customers.find(c => c.id === getPendingId());
  const el = document.getElementById('verify-card');
  if (!cust) { location.hash = '#/login'; return; }
  const noCode = !(Backend.enabled ? cust.hasCode : cust.transferCode);
  el.innerHTML = `
    <div class="brand" style="color:var(--text); margin-bottom:22px;"><span class="mark" style="background:var(--brass);"></span>Waypoint</div>
    <div style="display:flex; flex-direction:column; align-items:center; text-align:center; margin-bottom:22px;">
      ${avatarHTML(cust, 96)}
      <h2 style="margin:16px 0 4px; font-size:1.5rem;">Welcome, ${esc(cust.name)}</h2>
      <p style="margin:0; color:var(--text-soft); font-size:0.9rem;">Enter your access code to continue.</p>
    </div>
    ${noCode ? `
      <div class="confirm-note" style="border-color:var(--rust); color:var(--rust); background:rgba(163,70,50,0.08);">
        Your access code hasn't been set up yet. Please contact the bank so an administrator can set one for you.
      </div>
    ` : `
      <form onsubmit="handleVerify(event)">
        <div class="field"><label for="vf-code">Access code</label>
          <input id="vf-code" class="code-input" type="password" inputmode="numeric" autocomplete="off" placeholder="••••••" required autofocus>
        </div>
        <div id="verify-error" class="hide" style="color:var(--rust); font-size:0.85rem; margin-bottom:14px;">That code isn't right. Please try again.</div>
        <button type="submit" class="btn btn-primary btn-block">Continue</button>
      </form>
    `}
    <p class="login-note"><a href="#/login" style="color:var(--moss);" onclick="cancelVerify()">Not ${esc(cust.name.split(' ')[0])}? Back to log in</a></p>
  `;
  const input = document.getElementById('vf-code');
  if (input) setTimeout(() => input.focus(), 50);
}

function cancelVerify() {
  try { sessionStorage.removeItem('waypoint-pending'); } catch (e) {}
}

async function handleVerify(e) {
  e.preventDefault();
  const cust = state.customers.find(c => c.id === getPendingId());
  if (!cust) { location.hash = '#/login'; return; }
  const entered = document.getElementById('vf-code').value.trim();
  const ok = Backend.enabled ? await Backend.checkCode(entered) : (!!cust.transferCode && entered === String(cust.transferCode));
  if (!ok) {
    document.getElementById('verify-error').classList.remove('hide');
    document.getElementById('vf-code').value = '';
    return;
  }
  try {
    sessionStorage.setItem('waypoint-verified', cust.id);
    sessionStorage.removeItem('waypoint-pending');
  } catch (err) {}
  state.currentCustomerId = cust.id;
  saveState();
  location.hash = '#/app/dashboard';
}

function renderSuspended() {
  reloadFromStorage();
  let id = null;
  try { id = sessionStorage.getItem('waypoint-suspended'); } catch (e) {}
  const cust = state.customers.find(c => c.id === id);
  const el = document.getElementById('suspended-card');
  if (!cust) { location.hash = '#/login'; return; }

  const lockIcon = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';

  if (!isRestricted(cust)) {
    el.innerHTML = `
      <div class="susp-icon ok">${lockIcon}</div>
      <h2>Good news, ${esc(cust.name.split(' ')[0])}</h2>
      <p class="susp-msg">The restriction on your account has been lifted. You can log in again.</p>
      <a class="btn btn-primary btn-block" href="#/login" onclick="clearSuspendedSession()">Log in</a>`;
    return;
  }

  const hold = cust.status === 'hold';
  const msg = (cust.suspendMessage || '').trim() || (hold ? DEFAULT_HOLD_MSG : DEFAULT_SUSPEND_MSG);
  el.innerHTML = `
    <div class="susp-icon ${hold ? 'hold' : ''}">${lockIcon}</div>
    <div class="susp-badge ${hold ? 'hold' : ''}">${hold ? 'On hold' : 'Suspended'}</div>
    <h2>${hold ? 'Your account is on hold' : 'Your account is suspended'}</h2>
    <div class="susp-who">${avatarHTML(cust, 36)}<span>${esc(cust.name)}</span></div>
    <p class="susp-msg">${esc(msg).replace(/\n/g, '<br>')}</p>
    <div class="susp-contact">
      <div class="susp-contact-title">Contact the bank to lift this ${hold ? 'hold' : 'suspension'}</div>
      <a class="btn btn-primary btn-block" href="${BANK_PHONE_HREF}">Call ${BANK_PHONE}</a>
      <a class="btn btn-ghost btn-block" href="mailto:${BANK_EMAIL}?subject=${encodeURIComponent('Account ' + (hold ? 'hold' : 'suspension') + ' — ' + cust.username)}">Email ${BANK_EMAIL}</a>
      <div class="susp-hours">Mon–Fri, 8am–7pm ET</div>
    </div>
    <button type="button" class="btn btn-ghost btn-block" style="margin-top:6px;" onclick="suspendedLeave()">Log out</button>
  `;
}
function clearSuspendedSession() { try { sessionStorage.removeItem('waypoint-suspended'); } catch (e) {} }
function suspendedLeave() { clearSuspendedSession(); logout(); }

function logout() {
  if (Backend.enabled) { Backend.logout(); state.customers = []; state.currentCustomerId = null; }
  try {
    sessionStorage.removeItem('waypoint-verified');
    sessionStorage.removeItem('waypoint-pending');
    sessionStorage.removeItem('waypoint-suspended');
  } catch (e) {}
  location.hash = '#/';
}

/* ---- Mobile layer: public drawer, "More" sheet, scroll lock ---- */
function syncScrollLock() {
  const more = document.getElementById('more-sheet'), drawer = document.getElementById('public-drawer');
  const open = (more && !more.classList.contains('hide')) || (drawer && !drawer.classList.contains('hide'));
  document.body.classList.toggle('no-scroll', !!open);
}
function togglePublicNav() {
  const d = document.getElementById('public-drawer');
  d.classList.toggle('hide');
  syncScrollLock();
}
function closePublicNav() {
  const d = document.getElementById('public-drawer');
  if (d) d.classList.add('hide');
  syncScrollLock();
}
function openMore() { document.getElementById('more-sheet').classList.remove('hide'); syncScrollLock(); }
function closeMore() { const m = document.getElementById('more-sheet'); if (m) m.classList.add('hide'); syncScrollLock(); }
const MORE_PAGES = ['zelle', 'bills', 'deposit', 'settings'];

/* ---------------- Router ----------------
   Every page has its own real, shareable URL:
   #/              marketing home
   #/about         about page
   #/faq           FAQ page
   #/terms         terms of service
   #/privacy       privacy policy
   #/security      security page
   #/personal      personal banking
   #/business      business banking
   #/contact       contact page
   #/admin-login   staff sign-in (gated)
   #/admin         admin dashboard (requires sign-in)
   #/login         login
   #/app/dashboard account dashboard
   #/app/accounts  accounts list
   #/app/accounts/:id   single account detail
   #/app/transfers transfers
   #/app/zelle     Zelle
   #/app/bills     bill pay
   #/app/deposit   mobile check deposit
   #/app/cards     cards
   #/app/settings  profile & security
   #/verify        access-code step after login
   #/suspended     shown instead of the app when an account is suspended / on hold
------------------------------------------- */
let currentPage = 'dashboard';
let currentAccountId = null;

function routeFromHash() {
  const hash = location.hash || '#/';
  closePublicNav();
  closeMore();
  if (typeof closeCodeModal === 'function') closeCodeModal();

  if (hash === '#/' || hash === '#') {
    showOnly('public-view');
    showPublicPage('home');
    return;
  }

  if (hash === '#/login') {
    showOnly('login-view');
    return;
  }

  if (hash === '#/suspended') {
    showOnly('suspended-view');
    renderSuspended();
    return;
  }

  if (hash === '#/verify') {
    if (!getPendingId()) { location.hash = '#/login'; return; }
    showOnly('verify-view');
    renderVerify();
    return;
  }

  if (hash.startsWith('#/app')) {
    const verifiedId = getVerifiedId();
    if (!verifiedId) {
      let suspId = null;
      try { suspId = sessionStorage.getItem('waypoint-suspended'); } catch (e) {}
      if (suspId) { location.hash = '#/suspended'; return; }
      location.hash = '#/login'; return;
    }
    if (!state.customers.some(c => c.id === verifiedId)) { location.hash = '#/login'; return; }
    reloadFromStorage();
    if (!state.customers.some(c => c.id === verifiedId)) { location.hash = '#/login'; return; }
    state.currentCustomerId = verifiedId;
    if (isRestricted(getCurrentCustomer())) {
      try { sessionStorage.setItem('waypoint-suspended', verifiedId); sessionStorage.removeItem('waypoint-verified'); } catch (e) {}
      location.hash = '#/suspended';
      return;
    }
    const parts = hash.slice('#/app'.length).split('/').filter(Boolean);
    currentPage = parts[0] || 'dashboard';
    currentAccountId = parts[1] || null;
    const cust = getCurrentCustomer();
    document.getElementById('sidebar-who').innerHTML =
      avatarHTML(cust, 34) + `<span style="color:var(--text-on-ink); font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(cust.name)}</span>`;
    document.querySelectorAll('.app-nav .navlink').forEach(b => {
      b.classList.toggle('active', b.dataset.page === currentPage);
    });
    document.getElementById('app-topbar-who').innerHTML = avatarHTML(cust, 34);
    document.querySelectorAll('.app-tabbar .tab').forEach(t => {
      t.classList.toggle('active', t.dataset.page === currentPage || (t.dataset.page === 'more' && MORE_PAGES.includes(currentPage)));
    });
    document.getElementById('app-sidebar').classList.remove('mobile-open');
    showOnly('app-view');
    render();
    return;
  }

  if (hash === '#/admin') {
    if (!isAdminAuthed()) { location.hash = '#/admin-login'; return; }
    showOnly('public-view');
    showPublicPage('admin');
    adminView = 'list';
    adminSelectedId = null;
    adminEditing = false;
    renderAdmin();
    if (Backend.enabled) adminReload();
    return;
  }

  const staticName = STATIC_PAGES.find(p => hash === '#/' + p);
  if (staticName) {
    showOnly('public-view');
    showPublicPage(staticName);
    return;
  }

  // Anything else (e.g. a bare in-page anchor like "#products") is left alone
  // so the browser's native anchor scrolling can handle it on the current page.
}

function render() {
  const main = document.getElementById('app-main');
  if (currentPage === 'dashboard') main.innerHTML = renderDashboard();
  else if (currentPage === 'accounts') {
    main.innerHTML = currentAccountId ? renderAccountDetail(currentAccountId) : renderAccountsList();
  }
  else if (currentPage === 'transfers') main.innerHTML = renderTransfers();
  else if (currentPage === 'zelle') main.innerHTML = renderZelle();
  else if (currentPage === 'bills') main.innerHTML = renderBills();
  else if (currentPage === 'deposit') main.innerHTML = renderDeposit();
  else if (currentPage === 'cards') main.innerHTML = renderCards();
  else if (currentPage === 'settings') main.innerHTML = renderSettings();
  else main.innerHTML = renderDashboard();
}

/* ---------------- Dashboard ---------------- */
function renderDashboard() {
  const cust = getCurrentCustomer();
  const totalBal = cust.accounts.reduce((s,a) => s + a.balance, 0);
  const allTx = cust.accounts.flatMap(a => a.transactions.map(t => ({...t, acct: a.type})))
    .sort((a,b) => b.date.localeCompare(a.date)).slice(0,6);

  return `
    <div class="page-head">
      <div style="display:flex; align-items:center; gap:14px;">
        ${avatarHTML(cust, 50)}
        <div>
          <h1>Good to see you, ${esc(cust.name.split(' ')[0])}</h1>
          <div class="sub">Total balance across all accounts: ${fmt(totalBal)}</div>
        </div>
      </div>
      <a class="btn btn-brass hide-m" href="#/app/transfers">Make a transfer</a>
    </div>

    <div class="quick-actions">
      <a class="card qa" href="#/app/transfers"><span class="qa-ic">⇄</span>Transfer</a>
      <a class="card qa" href="#/app/zelle"><span class="qa-ic">Z</span>Zelle®</a>
      <a class="card qa" href="#/app/bills"><span class="qa-ic">▤</span>Pay bills</a>
      <a class="card qa" href="#/app/deposit"><span class="qa-ic">⬒</span>Deposit check</a>
      <a class="card qa" href="#/app/cards"><span class="qa-ic">▭</span>Cards</a>
      <a class="card qa" href="#/app/settings"><span class="qa-ic">⚙</span>Settings</a>
    </div>

    <div class="acct-grid">
      ${cust.accounts.map(a => `
        <a class="card acct-card" href="#/app/accounts/${a.id}">
          <div class="label"><span>${a.type}</span><span>${a.number}</span></div>
          <div class="bal">${fmt(a.balance)}</div>
          <div class="num">Available balance</div>
        </a>
      `).join('')}
    </div>

    <div class="card card-pad">
      <div class="section-title">Recent activity</div>
      <div class="table-scroll">
        <table class="tx stack">
          <thead><tr><th>Date</th><th>Description</th><th>Account</th><th>Category</th><th style="text-align:right;">Amount</th></tr></thead>
          <tbody>
            ${allTx.map(t => `
              <tr>
                <td class="c-date">${fmtDate(t.date)}</td>
                <td class="c-desc">${esc(t.desc)}<div class="m-meta">${fmtDate(t.date)} · ${esc(t.acct)} · ${esc(t.cat)}</div></td>
                <td class="c-acct">${esc(t.acct)}</td>
                <td class="c-cat"><span class="tx-cat">${esc(t.cat)}</span></td>
                <td style="text-align:right;" class="c-amt amt ${t.amount<0?'neg':'pos'}">${fmt(t.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ---------------- Accounts ---------------- */
function renderAccountsList() {
  const cust = getCurrentCustomer();
  return `
    <div class="page-head">
      <div><h1>Accounts</h1><div class="sub">${cust.accounts.length} open accounts</div></div>
    </div>
    <div class="accounts-list-page">
      ${cust.accounts.map(a => `
        <a class="card accrow" href="#/app/accounts/${a.id}">
          <div>
            <div style="font-weight:600;">${a.type}</div>
            <div class="num" style="color:var(--text-soft); font-size:0.85rem;">${a.number}</div>
          </div>
          <div class="bal">${fmt(a.balance)}</div>
        </a>
      `).join('')}
    </div>
  `;
}

function renderAccountDetail(id) {
  const a = getAccount(id);
  if (!a) return renderAccountsList();
  const tx = [...a.transactions].sort((x,y) => y.date.localeCompare(x.date));
  return `
    <div class="page-head">
      <div>
        <a href="#/app/accounts" style="font-size:0.85rem; color:var(--text-soft); text-decoration:none;">← All accounts</a>
        <h1 style="margin-top:6px;">${a.type}</h1>
        <div class="sub">${a.number}</div>
      </div>
      <div style="text-align:right;">
        <div class="sub">Available balance</div>
        <div style="font-family:'Fraunces',serif; font-size:1.9rem;">${fmt(a.balance)}</div>
      </div>
    </div>
    <div class="card card-pad">
      <div class="section-title">Transaction history</div>
      <div class="table-scroll">
        <table class="tx stack">
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th style="text-align:right;">Amount</th></tr></thead>
          <tbody>
            ${tx.map(t => `
              <tr>
                <td class="c-date">${fmtDate(t.date)}</td>
                <td class="c-desc">${esc(t.desc)}<div class="m-meta">${fmtDate(t.date)} · ${esc(t.cat)}</div></td>
                <td class="c-cat"><span class="tx-cat">${esc(t.cat)}</span></td>
                <td style="text-align:right;" class="c-amt amt ${t.amount<0?'neg':'pos'}">${fmt(t.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ---------------- Transfer code (required for every money movement) ----------------
   Any action that sends money out opens this prompt first. The code is the
   one the bank's admin set for the customer in the admin area.
------------------------------------------------------------------------------------ */
let pendingCodeAction = null;
let verifiedCode = '';   // code the customer just typed; re-checked by the server with every money move

function requireCode(summary, onSuccess) {
  const cust = getCurrentCustomer();
  pendingCodeAction = onSuccess;
  document.getElementById('code-modal-summary').textContent = summary;
  document.getElementById('code-modal-input').value = '';
  const err = document.getElementById('code-modal-error');
  if (!cust.transfersBlocked && !(Backend.enabled ? cust.hasCode : cust.transferCode)) {
    err.textContent = 'No transfer code has been set on your account yet. Please contact the bank.';
    err.classList.remove('hide');
    document.getElementById('code-modal-confirm').disabled = true;
  } else {
    // A transfer block is not announced here; the full page appears after "Confirm & send".
    err.classList.add('hide');
    document.getElementById('code-modal-confirm').disabled = false;
  }
  document.getElementById('code-modal').classList.remove('hide');
  setTimeout(() => document.getElementById('code-modal-input').focus(), 50);
}

function closeCodeModal() {
  pendingCodeAction = null;
  document.getElementById('code-modal').classList.add('hide');
}

async function confirmCodeModal(e) {
  e.preventDefault();
  const cust = getCurrentCustomer();
  const entered = document.getElementById('code-modal-input').value.trim();
  const err = document.getElementById('code-modal-error');
  if (cust.transfersBlocked) {
    closeCodeModal();
    showTransferBlocked(cust);
    return;
  }
  const ok = Backend.enabled ? await Backend.checkCode(entered) : (!!cust.transferCode && entered === String(cust.transferCode));
  if (!ok) {
    err.textContent = 'Incorrect transfer code. The transfer was not sent.';
    err.classList.remove('hide');
    document.getElementById('code-modal-input').value = '';
    return;
  }
  const action = pendingCodeAction;
  closeCodeModal();
  verifiedCode = entered;
  if (action) action();
}

/* ---------------- Transfer blocked: full page shown after "Confirm & send" ---------------- */
function closeTransferBlocked() { const m = document.getElementById('transfer-blocked-page'); if (m) m.remove(); document.body.classList.remove('no-scroll'); }
function showTransferBlocked(cust) {
  const msg = (cust.transfersMessage || '').trim() || 'Transfers on your account are temporarily unavailable. Please contact the bank.';
  const lockIcon = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
  closeTransferBlocked();
  const el = document.createElement('div');
  el.id = 'transfer-blocked-page'; el.className = 'fullpage-overlay'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = `<div class="login-card susp-card">
    <div class="susp-icon">${lockIcon}</div>
    <div class="susp-badge">Transfer not sent</div>
    <h2>Transfers are unavailable</h2>
    <div class="susp-who">${avatarHTML(cust, 36)}<span>${esc(cust.name)}</span></div>
    <p class="susp-msg">${esc(msg).replace(/\n/g, '<br>')}</p>
    <div class="susp-contact">
      <div class="susp-contact-title">Contact the bank to have transfers re-enabled</div>
      <a class="btn btn-primary btn-block" href="${BANK_PHONE_HREF}">Call ${BANK_PHONE}</a>
      <a class="btn btn-ghost btn-block" href="mailto:${BANK_EMAIL}?subject=${encodeURIComponent('Transfers unavailable — ' + cust.username)}">Email ${BANK_EMAIL}</a>
      <div class="susp-hours">Mon–Fri, 8am–7pm ET</div>
    </div>
    <button type="button" class="btn btn-ghost btn-block" style="margin-top:6px;" onclick="closeTransferBlocked()">Back to my account</button>
  </div>`;
  document.body.appendChild(el);
  document.body.classList.add('no-scroll');
}

/* ---------------- Shared helpers for sending money ---------------- */
function showErr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hide');
}
function hideErr(id) { document.getElementById(id).classList.add('hide'); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

function acctOptions(cust) {
  return cust.accounts.map(a => `<option value="${a.id}">${esc(a.type)} (${a.number}) — ${fmt(a.balance)}</option>`).join('');
}

/* Takes money out of an account, with an optional separate fee line. */
function debitAccount(from, amt, desc, cat, fee, feeDesc) {
  const date = todayStr();
  from.balance = +(from.balance - amt - (fee || 0)).toFixed(2);
  from.transactions.unshift({ id: newTxId(), date, desc, cat, amount: -amt });
  if (fee) from.transactions.unshift({ id: newTxId(), date, desc: feeDesc || 'Fee', cat: 'Fee', amount: -fee });
}

function recentByCat(cust, cats, n) {
  return cust.accounts.flatMap(a => a.transactions.filter(t => cats.includes(t.cat)).map(t => ({ ...t, acct: a.type })))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, n || 5);
}

function recentList(items, emptyText) {
  return items.length ? `
    <table class="tx stack"><tbody>
      ${items.map(t => `
        <tr><td class="c-date">${fmtDate(t.date)}</td>
        <td class="c-desc">${esc(t.desc)}<br><span style="color:var(--text-soft); font-size:0.78rem;">${esc(t.acct)}</span><div class="m-meta">${fmtDate(t.date)}</div></td>
        <td style="text-align:right;" class="c-amt amt ${t.amount < 0 ? 'neg' : 'pos'}">${fmt(t.amount)}</td></tr>
      `).join('')}
    </tbody></table>` : `<div class="empty-state">${emptyText}</div>`;
}

function successNote(msg) {
  return `<div class="confirm-note" style="margin-bottom:18px;">${msg}</div>`;
}
let flashMessage = '';
function flash(msg) { flashMessage = msg; render(); flashMessage = ''; }
function takeFlash() { return flashMessage ? successNote(flashMessage) : ''; }


/* Remote mode: money moves are done by the database (do_move), never by this browser. */
function sendArgs(from, amt, desc, cat, fee, feeDesc) {
  return { kind: 'send', from: from.id, amount: amt, desc, cat, fee: fee || 0, feeDesc };
}
async function serverMove(op, okMsg) {
  try {
    await Backend.move(op, verifiedCode);
    const mine = await Backend.loadMine();
    if (mine) adoptMine(mine);
    flash(okMsg);
    showReceipt(op);
  } catch (err) {
    toast((err && err.message) || 'Could not complete that. Please try again.');
    const mine = await Backend.loadMine();
    if (mine) adoptMine(mine);
    render();
  } finally { verifiedCode = ''; }
}


/* ---------------- Success / receipt screen ---------------- */
function closeReceipt() { const m = document.getElementById('receipt-modal'); if (m) m.remove(); }
function showReceipt(op) {
  const cust = getCurrentCustomer(); if (!cust) return;
  const acct = id => cust.accounts.find(a => a.id === id);
  const from = acct(op.from), to = acct(op.to);
  const fee = op.kind === 'send' ? (op.fee || 0) : 0;
  const label = a => a ? `${esc(a.type)} ${esc(a.number)}` : '—';
  const ref = 'WP' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const rows = [];
  let title = 'Transfer successful', after = null;
  if (op.kind === 'transfer') {
    rows.push(['From', label(from)], ['To', label(to)]);
    if (op.desc) rows.push(['Memo', esc(op.desc)]);
    after = from;
  } else if (op.kind === 'deposit') {
    title = 'Deposit received';
    rows.push(['Deposited to', label(to)]);
    after = to;
  } else {
    title = op.cat === 'Bills' ? 'Payment successful' : op.cat === 'Zelle' ? 'Zelle® payment sent' : 'Wire transfer sent';
    rows.push(['From', label(from)], ['Details', esc(op.desc || '')]);
    if (fee) rows.push(['Fee', fmt(fee)], ['Total debited', fmt(op.amount + fee)]);
    after = from;
  }
  rows.push(['Date', new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })]);
  if (after) rows.push(['New balance', fmt(after.balance)]);
  rows.push(['Reference', ref]);
  closeReceipt();
  const el = document.createElement('div');
  el.id = 'receipt-modal'; el.className = 'modal-backdrop'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = `<div class="modal">
    <div class="receipt-check"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></div>
    <h2 style="margin:0; text-align:center; font-size:1.3rem;">${title}</h2>
    <div class="receipt-amt">${fmt(op.amount)}</div>
    ${rows.map(r => `<div class="receipt-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}
    <button type="button" class="btn btn-primary btn-block" style="margin-top:20px;" onclick="closeReceipt()">Done</button>
  </div>`;
  document.body.appendChild(el);
}

/* ---------------- Transfers ---------------- */
let transferTab = 'own';
function setTransferTab(tab) { transferTab = tab; render(); }

const TRANSFER_TABS = [
  ['own', 'Between my accounts'],
  ['domestic', 'Domestic (US bank)'],
  ['international', 'International']
];

function renderTransfers() {
  const cust = getCurrentCustomer();
  const opts = acctOptions(cust);
  const tabs = TRANSFER_TABS.map(([k, label]) =>
    `<button type="button" class="tab-btn ${transferTab === k ? 'active' : ''}" onclick="setTransferTab('${k}')">${label}</button>`).join('');

  let panel = '';
  let recent = [];
  if (transferTab === 'own') {
    recent = recentByCat(cust, ['Transfer']);
    panel = `
      <div class="section-title">Move money between your accounts</div>
      <form onsubmit="submitTransfer(event)">
        <div class="field"><label for="tf-from">From</label><select id="tf-from">${opts}</select></div>
        <div class="field"><label for="tf-to">To</label><select id="tf-to">${opts}</select></div>
        <div class="field"><label for="tf-amt">Amount</label>
          <div class="amount-input"><span>$</span><input id="tf-amt" type="number" min="0.01" step="0.01" placeholder="0.00" required></div></div>
        <div class="field"><label for="tf-memo">Memo (optional)</label><input id="tf-memo" type="text" placeholder="e.g. Rent, savings goal"></div>
        <div id="tf-error" class="hide err"></div>
        <button type="submit" class="btn btn-primary btn-block">Continue</button>
      </form>`;
  } else if (transferTab === 'domestic') {
    recent = recentByCat(cust, ['Domestic']);
    panel = `
      <div class="section-title">Send to a US bank account</div>
      <form onsubmit="submitDomesticTransfer(event)">
        <div class="field"><label for="dm-from">From</label><select id="dm-from">${opts}</select></div>
        <div class="field"><label for="dm-name">Recipient name</label><input id="dm-name" type="text" required></div>
        <div class="field"><label for="dm-bank">Recipient bank</label><input id="dm-bank" type="text" placeholder="e.g. First National Bank" required></div>
        <div class="field"><label for="dm-routing">Routing number (9 digits)</label><input id="dm-routing" type="text" inputmode="numeric" maxlength="9" required></div>
        <div class="field"><label for="dm-acct">Account number</label><input id="dm-acct" type="text" inputmode="numeric" required></div>
        <div class="field"><label for="dm-type">Account type</label><select id="dm-type"><option>Checking</option><option>Savings</option></select></div>
        <div class="field"><label for="dm-speed">Speed</label>
          <select id="dm-speed"><option value="ach">Standard ACH — 1–3 business days (free)</option><option value="wire">Domestic wire — same day ($25 fee)</option></select></div>
        <div class="field"><label for="dm-amt">Amount</label>
          <div class="amount-input"><span>$</span><input id="dm-amt" type="number" min="0.01" step="0.01" placeholder="0.00" required></div></div>
        <div class="field"><label for="dm-memo">Memo (optional)</label><input id="dm-memo" type="text"></div>
        <div id="dm-error" class="hide err"></div>
        <button type="submit" class="btn btn-primary btn-block">Continue</button>
      </form>`;
  } else {
    recent = recentByCat(cust, ['International']);
    panel = `
      <div class="section-title">International wire</div>
      <form onsubmit="submitInternationalTransfer(event)">
        <div class="field"><label for="intl-from">From</label><select id="intl-from">${opts}</select></div>
        <div class="field"><label for="intl-name">Recipient name</label><input id="intl-name" type="text" required></div>
        <div class="field"><label for="intl-country">Recipient country</label><input id="intl-country" type="text" placeholder="e.g. Germany" required></div>
        <div class="field"><label for="intl-iban">IBAN / account number</label><input id="intl-iban" type="text" required></div>
        <div class="field"><label for="intl-swift">SWIFT / BIC code</label><input id="intl-swift" type="text" required></div>
        <div class="field"><label for="intl-amt">Amount</label>
          <div class="amount-input"><span>$</span><input id="intl-amt" type="number" min="0.01" step="0.01" placeholder="0.00" required></div></div>
        <div class="field"><label for="intl-purpose">Purpose (optional)</label><input id="intl-purpose" type="text" placeholder="e.g. Family support"></div>
        <p style="font-size:0.8rem; color:var(--text-soft); margin:-4px 0 14px;">A flat $${WIRE_FEE} wire fee applies.</p>
        <div id="intl-error" class="hide err"></div>
        <button type="submit" class="btn btn-primary btn-block">Continue</button>
      </form>`;
  }

  return `
    <div class="page-head"><div><h1>Transfers</h1><div class="sub">Move money between your accounts, to another US bank, or abroad. A transfer code is needed to send.</div></div></div>
    <div class="transfer-layout">
      <div class="card card-pad transfer-form">
        <div class="tabs">${tabs}</div>
        ${takeFlash()}
        ${panel}
      </div>
      <div class="card card-pad">
        <div class="section-title">Recent ${transferTab === 'own' ? 'transfers' : transferTab === 'domestic' ? 'domestic transfers' : 'wires'}</div>
        ${recentList(recent, 'Nothing here yet.')}
      </div>
    </div>
  `;
}

function submitTransfer(e) {
  e.preventDefault();
  const fromId = document.getElementById('tf-from').value;
  const toId = document.getElementById('tf-to').value;
  const amt = parseFloat(document.getElementById('tf-amt').value);
  const memo = document.getElementById('tf-memo').value.trim();
  hideErr('tf-error');

  if (fromId === toId) return showErr('tf-error', 'Choose two different accounts.');
  if (!amt || amt <= 0) return showErr('tf-error', 'Enter an amount greater than $0.');
  const from = getAccount(fromId), to = getAccount(toId);
  if (amt > from.balance) return showErr('tf-error', `Insufficient funds in ${from.type}.`);

  requireCode(`Move ${fmt(amt)} from ${from.type} to ${to.type}.`, () => {
    if (Backend.enabled) return serverMove({ kind: 'transfer', from: fromId, to: toId, amount: amt, desc: memo }, `Done — ${fmt(amt)} moved to ${to.type}.`);
    const date = todayStr();
    from.balance = +(from.balance - amt).toFixed(2);
    to.balance = +(to.balance + amt).toFixed(2);
    from.transactions.unshift({ id: newTxId(), date, desc: memo ? `Transfer to ${to.type} — ${memo}` : `Transfer to ${to.type}`, cat: 'Transfer', amount: -amt });
    to.transactions.unshift({ id: newTxId(), date, desc: memo ? `Transfer from ${from.type} — ${memo}` : `Transfer from ${from.type}`, cat: 'Transfer', amount: amt });
    saveState();
    flash(`Done — ${fmt(amt)} moved to ${to.type}.`);
    showReceipt({ kind: 'transfer', from: fromId, to: toId, amount: amt, desc: memo });
  });
}

const DOMESTIC_WIRE_FEE = 25;

function submitDomesticTransfer(e) {
  e.preventDefault();
  const from = getAccount(document.getElementById('dm-from').value);
  const name = document.getElementById('dm-name').value.trim();
  const bank = document.getElementById('dm-bank').value.trim();
  const routing = document.getElementById('dm-routing').value.trim();
  const acctNo = document.getElementById('dm-acct').value.trim();
  const speed = document.getElementById('dm-speed').value;
  const memo = document.getElementById('dm-memo').value.trim();
  const amt = parseFloat(document.getElementById('dm-amt').value);
  hideErr('dm-error');

  if (!/^\d{9}$/.test(routing)) return showErr('dm-error', 'Routing numbers are exactly 9 digits.');
  if (!/^\d{4,17}$/.test(acctNo)) return showErr('dm-error', 'Enter a valid account number (4–17 digits).');
  if (!amt || amt <= 0) return showErr('dm-error', 'Enter an amount greater than $0.');
  const fee = speed === 'wire' ? DOMESTIC_WIRE_FEE : 0;
  if (amt + fee > from.balance) return showErr('dm-error', `Insufficient funds — this comes to ${fmt(amt + fee)} including fees.`);

  requireCode(`Send ${fmt(amt)} to ${name} at ${bank} (account ending ${acctNo.slice(-4)})${fee ? ` plus a ${fmt(fee)} wire fee` : ''}.`, () => {
    const label = speed === 'wire' ? 'Domestic wire' : 'ACH transfer';
    if (Backend.enabled) return serverMove(sendArgs(from, amt, `${label} to ${name} (${bank} ••••${acctNo.slice(-4)})${memo ? ' — ' + memo : ''}`, 'Domestic', fee, 'Domestic wire fee'), `${label} of ${fmt(amt)} to ${esc(name)} has been submitted.`);
    debitAccount(from, amt, `${label} to ${name} (${bank} ••••${acctNo.slice(-4)})${memo ? ' — ' + memo : ''}`, 'Domestic', fee, 'Domestic wire fee');
    saveState();
    flash(`${label} of ${fmt(amt)} to ${esc(name)} has been submitted.`);
    showReceipt(sendArgs(from, amt, `${label} to ${name} (${bank} ••••${acctNo.slice(-4)})${memo ? ' — ' + memo : ''}`, 'Domestic', fee, 'Domestic wire fee'));
  });
}

const WIRE_FEE = 15;

function submitInternationalTransfer(e) {
  e.preventDefault();
  const from = getAccount(document.getElementById('intl-from').value);
  const name = document.getElementById('intl-name').value.trim();
  const country = document.getElementById('intl-country').value.trim();
  const amt = parseFloat(document.getElementById('intl-amt').value);
  const purpose = document.getElementById('intl-purpose').value.trim();
  hideErr('intl-error');

  if (!amt || amt <= 0) return showErr('intl-error', 'Enter an amount greater than $0.');
  const total = +(amt + WIRE_FEE).toFixed(2);
  if (total > from.balance) return showErr('intl-error', `Insufficient funds — this wire plus the $${WIRE_FEE} fee comes to ${fmt(total)}.`);

  requireCode(`Wire ${fmt(amt)} to ${name} in ${country}, plus a ${fmt(WIRE_FEE)} fee.`, () => {
    if (Backend.enabled) return serverMove(sendArgs(from, amt, `Wire to ${name} (${country})${purpose ? ' — ' + purpose : ''}`, 'International', WIRE_FEE, 'International wire fee'), `Wire of ${fmt(amt)} to ${esc(name)} has been submitted.`);
    debitAccount(from, amt, `Wire to ${name} (${country})${purpose ? ' — ' + purpose : ''}`, 'International', WIRE_FEE, 'International wire fee');
    saveState();
    flash(`Wire of ${fmt(amt)} to ${esc(name)} has been submitted.`);
    showReceipt(sendArgs(from, amt, `Wire to ${name} (${country})${purpose ? ' — ' + purpose : ''}`, 'International', WIRE_FEE, 'International wire fee'));
  });
}

/* ---------------- Zelle ---------------- */
const ZELLE_LIMIT = 2500;

function renderZelle() {
  const cust = getCurrentCustomer();
  const recent = recentByCat(cust, ['Zelle'], 6);
  return `
    <div class="page-head"><div><h1>Zelle®</h1><div class="sub">Send money to friends and family using their email or U.S. mobile number.</div></div></div>
    <div class="transfer-layout">
      <div class="card card-pad transfer-form">
        ${takeFlash()}
        <div class="section-title">Send money</div>
        <form onsubmit="submitZelle(event)">
          <div class="field"><label for="zl-from">From</label><select id="zl-from">${acctOptions(cust)}</select></div>
          <div class="field"><label for="zl-to">Recipient email or mobile number</label><input id="zl-to" type="text" placeholder="name@email.com or (555) 123-4567" required></div>
          <div class="field"><label for="zl-name">Recipient name (optional)</label><input id="zl-name" type="text"></div>
          <div class="field"><label for="zl-amt">Amount</label>
            <div class="amount-input"><span>$</span><input id="zl-amt" type="number" min="0.01" step="0.01" placeholder="0.00" required></div></div>
          <div class="field"><label for="zl-memo">Message (optional)</label><input id="zl-memo" type="text" placeholder="e.g. Dinner"></div>
          <p style="font-size:0.8rem; color:var(--text-soft); margin:-4px 0 14px;">Limit ${fmt(ZELLE_LIMIT)} per transaction. Only send to people you know and trust.</p>
          <div id="zl-error" class="hide err"></div>
          <button type="submit" class="btn btn-primary btn-block">Continue</button>
        </form>
      </div>
      <div class="card card-pad">
        <div class="section-title">Recent Zelle activity</div>
        ${recentList(recent, 'No Zelle payments yet.')}
      </div>
    </div>
  `;
}

function submitZelle(e) {
  e.preventDefault();
  const from = getAccount(document.getElementById('zl-from').value);
  const to = document.getElementById('zl-to').value.trim();
  const name = document.getElementById('zl-name').value.trim();
  const memo = document.getElementById('zl-memo').value.trim();
  const amt = parseFloat(document.getElementById('zl-amt').value);
  hideErr('zl-error');

  const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to);
  const isPhone = to.replace(/\D/g, '').length >= 10;
  if (!isEmail && !isPhone) return showErr('zl-error', 'Enter a valid email address or a 10-digit mobile number.');
  if (!amt || amt <= 0) return showErr('zl-error', 'Enter an amount greater than $0.');
  if (amt > ZELLE_LIMIT) return showErr('zl-error', `Zelle payments are limited to ${fmt(ZELLE_LIMIT)} per transaction.`);
  if (amt > from.balance) return showErr('zl-error', `Insufficient funds in ${from.type}.`);

  const who = name || to;
  requireCode(`Send ${fmt(amt)} with Zelle® to ${who}.`, () => {
    if (Backend.enabled) return serverMove(sendArgs(from, amt, `Zelle to ${who}${memo ? ' — ' + memo : ''}`, 'Zelle'), `${fmt(amt)} sent to ${esc(who)} with Zelle®.`);
    debitAccount(from, amt, `Zelle to ${who}${memo ? ' — ' + memo : ''}`, 'Zelle');
    saveState();
    flash(`${fmt(amt)} sent to ${esc(who)} with Zelle®.`);
    showReceipt(sendArgs(from, amt, `Zelle to ${who}${memo ? ' — ' + memo : ''}`, 'Zelle'));
  });
}

/* ---------------- Bill pay ---------------- */
const BILLERS = ['Northline Electric', 'Harborline Water & Sewer', 'Metro Fiber Internet', 'Cascade Mobile', 'Evergreen Insurance', 'City Property Tax', 'Other biller'];

function renderBills() {
  const cust = getCurrentCustomer();
  const recent = recentByCat(cust, ['Bills'], 6);
  return `
    <div class="page-head"><div><h1>Pay bills</h1><div class="sub">Pay utilities, insurance, and other bills from your account.</div></div></div>
    <div class="transfer-layout">
      <div class="card card-pad transfer-form">
        ${takeFlash()}
        <div class="section-title">New payment</div>
        <form onsubmit="submitBill(event)">
          <div class="field"><label for="bp-from">Pay from</label><select id="bp-from">${acctOptions(cust)}</select></div>
          <div class="field"><label for="bp-payee">Biller</label><select id="bp-payee">${BILLERS.map(b => `<option>${b}</option>`).join('')}</select></div>
          <div class="field"><label for="bp-ref">Account / reference number</label><input id="bp-ref" type="text" required></div>
          <div class="field"><label for="bp-amt">Amount</label>
            <div class="amount-input"><span>$</span><input id="bp-amt" type="number" min="0.01" step="0.01" placeholder="0.00" required></div></div>
          <div id="bp-error" class="hide err"></div>
          <button type="submit" class="btn btn-primary btn-block">Continue</button>
        </form>
      </div>
      <div class="card card-pad">
        <div class="section-title">Recent bill payments</div>
        ${recentList(recent, 'No bill payments yet.')}
      </div>
    </div>
  `;
}

function submitBill(e) {
  e.preventDefault();
  const from = getAccount(document.getElementById('bp-from').value);
  const payee = document.getElementById('bp-payee').value;
  const ref = document.getElementById('bp-ref').value.trim();
  const amt = parseFloat(document.getElementById('bp-amt').value);
  hideErr('bp-error');
  if (!amt || amt <= 0) return showErr('bp-error', 'Enter an amount greater than $0.');
  if (amt > from.balance) return showErr('bp-error', `Insufficient funds in ${from.type}.`);

  requireCode(`Pay ${fmt(amt)} to ${payee}.`, () => {
    if (Backend.enabled) return serverMove(sendArgs(from, amt, `Bill payment — ${payee} (${ref})`, 'Bills'), `${fmt(amt)} paid to ${esc(payee)}.`);
    debitAccount(from, amt, `Bill payment — ${payee} (${ref})`, 'Bills');
    saveState();
    flash(`${fmt(amt)} paid to ${esc(payee)}.`);
    showReceipt(sendArgs(from, amt, `Bill payment — ${payee} (${ref})`, 'Bills'));
  });
}

/* ---------------- Mobile check deposit ---------------- */
function renderDeposit() {
  const cust = getCurrentCustomer();
  const recent = recentByCat(cust, ['Deposit'], 6);
  return `
    <div class="page-head"><div><h1>Deposit a check</h1><div class="sub">Snap the front and back of your check and deposit it to your account.</div></div></div>
    <div class="transfer-layout">
      <div class="card card-pad transfer-form">
        ${takeFlash()}
        <div class="section-title">Check deposit</div>
        <form onsubmit="submitDeposit(event)">
          <div class="field"><label for="dp-to">Deposit to</label><select id="dp-to">${acctOptions(cust)}</select></div>
          <div class="field"><label for="dp-amt">Check amount</label>
            <div class="amount-input"><span>$</span><input id="dp-amt" type="number" min="0.01" step="0.01" placeholder="0.00" required></div></div>
          <div class="field"><label for="dp-front">Front of check</label><input id="dp-front" type="file" accept="image/*" capture="environment" required></div>
          <div class="field"><label for="dp-back">Back of check (endorsed)</label><input id="dp-back" type="file" accept="image/*" capture="environment" required></div>
          <p style="font-size:0.8rem; color:var(--text-soft); margin:-4px 0 14px;">Write "For mobile deposit only at Waypoint" and sign the back. Keep the check for 14 days.</p>
          <div id="dp-error" class="hide err"></div>
          <button type="submit" class="btn btn-primary btn-block">Deposit check</button>
        </form>
      </div>
      <div class="card card-pad">
        <div class="section-title">Recent deposits</div>
        ${recentList(recent, 'No check deposits yet.')}
      </div>
    </div>
  `;
}

function submitDeposit(e) {
  e.preventDefault();
  const to = getAccount(document.getElementById('dp-to').value);
  const amt = parseFloat(document.getElementById('dp-amt').value);
  hideErr('dp-error');
  if (!amt || amt <= 0) return showErr('dp-error', 'Enter an amount greater than $0.');
  if (Backend.enabled) return serverMove({ kind: 'deposit', to: to.id, amount: amt, desc: 'Mobile check deposit', cat: 'Deposit' }, `${fmt(amt)} deposited to ${esc(to.type)}.`);
  to.balance = +(to.balance + amt).toFixed(2);
  to.transactions.unshift({ id: newTxId(), date: todayStr(), desc: 'Mobile check deposit', cat: 'Deposit', amount: amt });
  saveState();
  flash(`${fmt(amt)} deposited to ${esc(to.type)}.`);
  showReceipt({ kind: 'deposit', to: to.id, amount: amt });
}

/* ---------------- Settings (profile & security) ---------------- */
function renderSettings() {
  const cust = getCurrentCustomer();
  const row = (label, value) => `<div class="info-row"><span>${label}</span><b>${value ? esc(value) : '—'}</b></div>`;
  const since = cust.memberSince ? new Date(cust.memberSince + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const dob = cust.dob ? new Date(cust.dob + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  return `
    <div class="page-head"><div><h1>Settings</h1><div class="sub">Your personal information and security.</div></div></div>
    <div class="transfer-layout">
      <div>
        <div class="card card-pad" style="margin-bottom:22px;">
          <div style="display:flex; align-items:center; gap:16px; margin-bottom:18px;">
            ${avatarHTML(cust, 72)}
            <div><div style="font-family:'Fraunces',serif; font-size:1.3rem;">${esc(cust.name)}</div><div style="color:var(--text-soft); font-size:0.88rem;">@${esc(cust.username)}</div></div>
          </div>
          <div class="section-title">Personal information</div>
          <div class="info-grid">
            ${row('Full name', cust.name)}
            ${row('Email', cust.email)}
            ${row('Phone', cust.phone)}
            ${row('Date of birth', dob)}
            ${row('Home address', cust.address)}
            ${row('Customer since', since)}
          </div>
          <p style="font-size:0.8rem; color:var(--text-soft); margin:14px 0 0;">To update your name, address, or other details, please contact the bank.</p>
        </div>
        <div class="card card-pad">
          <div class="section-title">Your accounts</div>
          <div class="info-grid">
            ${cust.accounts.map(a => row(a.type, a.number)).join('')}
            ${cust.cards.map(c => row(c.label, '•••• ' + c.number)).join('')}
          </div>
        </div>
      </div>
      <div>
        <div class="card card-pad" style="margin-bottom:22px;">
          <div class="section-title">Security</div>
          <div class="info-grid">
            ${row('Access / transfer code', cust.transferCode ? 'Set by the bank (••••••)' : 'Not set — contact the bank')}
          </div>
          <p style="font-size:0.8rem; color:var(--text-soft); margin:12px 0 0;">You enter this code after logging in and before sending any money. Only the bank can change it. Never share it.</p>
        </div>
        <div class="card card-pad">
          <div class="section-title">Change password</div>
          ${takeFlash()}
          <form onsubmit="submitChangePassword(event)">
            <div class="field"><label for="pw-cur">Current password</label><input id="pw-cur" type="password" required autocomplete="off"></div>
            <div class="field"><label for="pw-new">New password</label><input id="pw-new" type="password" minlength="6" required autocomplete="off"></div>
            <div class="field"><label for="pw-new2">Confirm new password</label><input id="pw-new2" type="password" minlength="6" required autocomplete="off"></div>
            <div id="pw-error" class="hide err"></div>
            <button type="submit" class="btn btn-primary btn-block">Update password</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function submitChangePassword(e) {
  e.preventDefault();
  const cust = getCurrentCustomer();
  const cur = document.getElementById('pw-cur').value;
  const n1 = document.getElementById('pw-new').value;
  const n2 = document.getElementById('pw-new2').value;
  hideErr('pw-error');
  if (cur !== cust.password) return showErr('pw-error', 'Your current password is incorrect.');
  if (n1.length < 6) return showErr('pw-error', 'Use at least 6 characters.');
  if (n1 !== n2) return showErr('pw-error', "The new passwords don't match.");
  cust.password = n1;
  saveState();
  flash('Your password has been updated.');
}

/* ---------------- Cards ---------------- */
function renderCards() {
  const cust = getCurrentCustomer();
  return `
    <div class="page-head"><div><h1>Cards</h1><div class="sub">Freeze a card instantly if it's ever lost or misplaced.</div></div></div>
    ${cust.cards.length ? '' : '<div class="card card-pad empty-state">No cards on your account yet. Contact the bank to request one.</div>'}
    <div class="cards-grid">
      ${cust.cards.map(c => `
        <div>
          ${cardMarkup(c)}
          <div class="card-controls">
            <label class="toggle ${c.frozen ? 'on' : ''}" onclick="toggleFreeze('${c.id}')">
              <span class="sw"></span> ${c.frozen ? 'Card frozen' : 'Freeze card'}
            </label>
            ${c.kind === 'Credit' ? `<span style="font-size:0.8rem; color:var(--text-soft);">${fmt(c.balance)} owed · Limit ${fmt(c.limit)}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function toggleFreeze(id) {
  const cust = getCurrentCustomer();
  const c = cust.cards.find(c => c.id === id);
  c.frozen = !c.frozen;
  saveState();
  render();
}

/* ---------------- Open an account + custom captcha ----------------
   Third-party CAPTCHA services (reCAPTCHA, hCaptcha, etc.) load scripts
   from hosts this page's content-security policy doesn't allow, so they
   cannot run here. This is a real, functioning CAPTCHA of our own:
   a randomly generated, distorted code rendered to a canvas each time,
   checked client-side before the account form can submit.
-------------------------------------------------------------------- */
let captchaText = '';

function generateCaptcha() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L ambiguity
  captchaText = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  drawCaptcha();
}

function drawCaptcha() {
  const canvas = document.getElementById('captcha-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#F4F1E6';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = 'rgba(27,42,38,0.18)';
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.lineTo(Math.random() * w, Math.random() * h);
    ctx.stroke();
  }

  const slot = w / captchaText.length;
  for (let i = 0; i < captchaText.length; i++) {
    ctx.save();
    ctx.translate(slot * i + slot / 2, h / 2 + (Math.random() * 10 - 5));
    ctx.rotate(Math.random() * 0.6 - 0.3);
    ctx.font = `${26 + Math.random() * 8}px Fraunces, serif`;
    ctx.fillStyle = '#1B2A26';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(captchaText[i], 0, 0);
    ctx.restore();
  }

  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = 'rgba(27,42,38,0.1)';
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function refreshCaptcha() {
  generateCaptcha();
  const input = document.getElementById('oa-captcha');
  if (input) input.value = '';
  document.getElementById('oa-captcha-error').classList.add('hide');
}

function handleOpenAccount(e) {
  e.preventDefault();
  const captchaErrEl = document.getElementById('oa-captcha-error');
  const unameErrEl = document.getElementById('oa-username-error');
  unameErrEl.classList.add('hide');

  const entered = document.getElementById('oa-captcha').value.trim().toUpperCase();
  if (entered !== captchaText) {
    captchaErrEl.classList.remove('hide');
    refreshCaptcha();
    return;
  }
  captchaErrEl.classList.add('hide');

  const name = document.getElementById('oa-name').value.trim() || 'New Member';
  const email = document.getElementById('oa-email').value.trim();
  const username = document.getElementById('oa-username').value.trim();
  const password = document.getElementById('oa-password').value;

  if (Backend.enabled) {
    Backend.signUp({ name, email, username, password }).then(r => {
      if (r.error) {
        unameErrEl.textContent = r.error;
        unameErrEl.classList.remove('hide');
        refreshCaptcha();
        return;
      }
      document.getElementById('open-account-form').classList.add('hide');
      document.getElementById('open-account-success').classList.remove('hide');
    });
    return;
  }

  if (state.customers.some(c => c.username.toLowerCase() === username.toLowerCase())) {
    unameErrEl.textContent = 'That username is already taken.';
    unameErrEl.classList.remove('hide');
    refreshCaptcha();
    return;
  }

  createCustomer({ name, username, email, password, startingBalance: 0, status: 'pending' });
  saveState();

  document.getElementById('open-account-form').classList.add('hide');
  document.getElementById('open-account-success').classList.remove('hide');
}

/* ---------------- Contact form ---------------- */
function handleContact(e) {
  e.preventDefault();
  document.getElementById('contact-form').classList.add('hide');
  document.getElementById('contact-success').classList.remove('hide');
}

/* ---------------- Admin ----------------
   A second, genuinely gated login separate from the member demo login:
   it checks real credentials and keeps you signed out of /admin until
   you pass them. Session-only (clears when the browser tab closes).
------------------------------------------- */
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'waypoint2026';

function isAdminAuthed() {
  try { return sessionStorage.getItem('waypoint-admin-authed') === '1'; }
  catch (e) { return false; }
}

function handleAdminLogin(e) {
  e.preventDefault();
  const u = document.getElementById('admin-user').value.trim();
  const p = document.getElementById('admin-pass').value;
  const errEl = document.getElementById('admin-login-error');

  if (Backend.enabled) {
    Backend.adminLogin(u, p).then(async r => {
      if (r.error) { errEl.textContent = r.error; errEl.classList.remove('hide'); return; }
      try {
        state.customers = await Backend.adminLoad();
        markAdminSaved();
        sessionStorage.setItem('waypoint-admin-authed', '1');
      } catch (err) { errEl.textContent = 'Signed in, but could not load customers: ' + Backend.nice(err); errEl.classList.remove('hide'); return; }
      errEl.classList.add('hide');
      location.hash = '#/admin';
    });
    return;
  }

  if (u === ADMIN_USER && p === ADMIN_PASS) {
    try { sessionStorage.setItem('waypoint-admin-authed', '1'); } catch (e) {}
    errEl.classList.add('hide');
    location.hash = '#/admin';
  } else {
    errEl.classList.remove('hide');
  }
}

function adminLogout() {
  if (Backend.enabled) { Backend.adminLogout(); state.customers = []; }
  try { sessionStorage.removeItem('waypoint-admin-authed'); } catch (e) {}
  location.hash = '#/';
}

let adminView = 'list';       // 'list' | 'add' | 'detail'
let adminSelectedId = null;
let adminEditing = false;
let adminIssuing = false;
let adminAddingAcct = false;
let adminNotice = '';

function adminGoList()  { adminView = 'list';  adminSelectedId = null; adminEditing = false; adminIssuing = false; adminAddingAcct = false; renderAdmin(); if (Backend.enabled) adminReload(); }

/* Remote mode: re-read every customer (their transfers change balances while the admin is looking). */
async function adminReload(quiet) {
  if (!Backend.enabled || !adminActive()) return;
  try {
    const rows = await Backend.adminLoad();
    if (saveTimer) return;                      // don't overwrite edits that haven't been saved yet
    state.customers = rows;
    markAdminSaved();
    if (!quiet && adminView === 'list') renderAdminList();
  } catch (err) { toast('Could not refresh customers: ' + Backend.nice(err)); }
}
function adminGoAdd()   { adminView = 'add';   renderAdmin(); }
async function adminGoDetail(id, editing) {
  if (Backend.enabled) await adminReload(true);    // open the customer with their latest server data
  adminView = 'detail'; adminSelectedId = id; adminEditing = !!editing; adminIssuing = false; adminAddingAcct = false; adminNotice = ''; renderAdmin();
}
function adminStartEdit(id) { adminEditing = true; renderAdminDetail(id); }
function adminCancelEdit(id) { adminEditing = false; renderAdminDetail(id); }

function renderAdmin() {
  if (adminView === 'add') return renderAdminAdd();
  if (adminView === 'detail' && adminSelectedId) return renderAdminDetail(adminSelectedId);
  return renderAdminList();
}

function renderAdminList() {
  const el = document.getElementById('admin-main');
  if (!el) return;
  el.innerHTML = `
    <div class="page-head">
      <div><h1>Admin — customers</h1><div class="sub">${state.customers.length} registered customers</div></div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-brass btn-sm" onclick="adminGoAdd()">+ Add customer</button>
        ${Backend.enabled ? '<button class="btn btn-ghost btn-sm" onclick="adminReload()">↻ Refresh</button>' : ''}
        <button class="btn btn-ghost btn-sm" onclick="adminLogout()">Log out</button>
      </div>
    </div>
    <div class="card">
      <div class="table-scroll">
        <table class="tx stack admin-table">
          <thead><tr><th></th><th>Name</th><th>Username</th><th>Email</th><th>Status</th><th style="text-align:right;">Total balance</th><th></th></tr></thead>
          <tbody>
            ${state.customers.map(c => `
              <tr style="cursor:pointer;" onclick="adminGoDetail('${c.id}')">
                <td class="a-avatar">${avatarHTML(c, 36)}</td>
                <td class="a-name" style="font-weight:600;">${esc(c.name)}<div class="m-meta">@${esc(c.username)}${c.email ? ' · ' + esc(c.email) : ''}</div></td>
                <td class="c-user">@${esc(c.username)}</td>
                <td class="c-email">${esc(c.email) || '—'}</td>
                <td class="a-status">${statusBadge(c)}</td>
                <td class="a-total" style="text-align:right;">${fmt(c.accounts.reduce((s,a) => s + a.balance, 0))}</td>
                <td class="a-act" style="text-align:right; white-space:nowrap;">
                  <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); adminGoDetail('${c.id}', true)">Edit</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAdminAdd() {
  const el = document.getElementById('admin-main');
  if (!el) return;
  el.innerHTML = `
    <a href="#" onclick="adminGoList();return false;" style="font-size:0.85rem; color:var(--text-soft); text-decoration:none;">← All customers</a>
    <div class="page-head" style="margin-top:10px;"><div><h1>Add a customer</h1><div class="sub">Creates a login, a checking account, and a debit card.</div></div></div>
    <form class="card card-pad" style="max-width:480px;" onsubmit="handleAddCustomer(event)">
      <div class="field"><label for="admin-new-name">Full name</label><input id="admin-new-name" type="text" required></div>
      <div class="field"><label for="admin-new-username">Username (for their login)</label><input id="admin-new-username" type="text" required></div>
      <div class="field"><label for="admin-new-password">Password (for their login)</label><input id="admin-new-password" type="text" required></div>
      <div class="field"><label for="admin-new-email">Email</label><input id="admin-new-email" type="email"></div>
      <div class="field"><label for="admin-new-phone">Phone</label><input id="admin-new-phone" type="text"></div>
      <div class="field"><label for="admin-new-dob">Date of birth</label><input id="admin-new-dob" type="date"></div>
      <div class="field"><label for="admin-new-address">Home address</label><input id="admin-new-address" type="text"></div>
      <div class="field"><label for="admin-new-code">Access / transfer code</label><input id="admin-new-code" type="text" inputmode="numeric" placeholder="e.g. 482915" required></div>
      <div class="field"><label for="admin-new-balance">Starting checking balance</label><div class="amount-input"><span>$</span><input id="admin-new-balance" type="number" step="0.01" value="0"></div></div>
      <div class="field"><label for="admin-new-photo">Photo</label><input id="admin-new-photo" type="file" accept="image/*"></div>
      <p style="font-size:0.8rem; color:var(--text-soft); margin:-8px 0 16px;">This photo appears at the top of their account when they log in. Use a small image — it's stored in the browser. Customers you add here are approved automatically.</p>
      <div id="admin-new-error" class="hide" style="color:var(--rust); font-size:0.85rem; margin-bottom:14px;">That username is already taken.</div>
      <div style="display:flex; gap:10px;">
        <button type="submit" class="btn btn-primary">Create customer</button>
        <button type="button" class="btn btn-ghost" onclick="adminGoList()">Cancel</button>
      </div>
    </form>
  `;
}

function handleAddCustomer(e) {
  e.preventDefault();
  const name = document.getElementById('admin-new-name').value.trim();
  const username = document.getElementById('admin-new-username').value.trim();
  const password = document.getElementById('admin-new-password').value;
  const email = document.getElementById('admin-new-email').value.trim();
  const phone = document.getElementById('admin-new-phone').value.trim();
  const dob = document.getElementById('admin-new-dob').value;
  const address = document.getElementById('admin-new-address').value.trim();
  const transferCode = document.getElementById('admin-new-code').value.trim();
  const startingBalance = parseFloat(document.getElementById('admin-new-balance').value) || 0;
  const file = document.getElementById('admin-new-photo').files[0];

  if (state.customers.some(c => c.username.toLowerCase() === username.toLowerCase())) {
    document.getElementById('admin-new-error').classList.remove('hide');
    return;
  }

  async function finish(photo) {
    if (Backend.enabled) {
      const errEl = document.getElementById('admin-new-error');
      const draft = buildCustomer({ name, username, email, password, photo, startingBalance, status: 'approved', phone, dob, address, transferCode });
      try {
        await Backend.adminCall('create', { password, customer: Object.assign(Backend.toRow(draft), { access_code: transferCode }) });
      } catch (err) { errEl.textContent = err.message; errEl.classList.remove('hide'); return; }
      try { state.customers = await Backend.adminLoad(); markAdminSaved(); } catch (err) {}
      adminGoList();
      return;
    }
    createCustomer({ name, username, email, password, photo, startingBalance, status: 'approved', phone, dob, address, transferCode });
    saveState();
    adminGoList();
  }

  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => finish(ev.target.result);
    reader.readAsDataURL(file);
  } else {
    finish(null);
  }
}

function renderAdminDetail(id) {
  const el = document.getElementById('admin-main');
  const c = state.customers.find(x => x.id === id);
  if (!el) return;
  if (!c) { adminGoList(); return; }

  const pendingBanner = c.status === 'pending' ? `
    <div class="card card-pad" style="margin-bottom:20px; border-left:3px solid var(--rust);">
      <div class="section-title" style="color:var(--rust);">Pending approval</div>
      <p style="color:var(--text-soft); margin:0 0 14px;">This application hasn't been approved yet — they can't log in until you do.</p>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-primary btn-sm" onclick="adminApproveCustomer('${c.id}')">Approve</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--rust); border-color:var(--rust);" onclick="adminRejectCustomer('${c.id}')">Reject &amp; delete</button>
      </div>
    </div>
  ` : '';

  el.innerHTML = `
    <a href="#" onclick="adminGoList();return false;" style="font-size:0.85rem; color:var(--text-soft); text-decoration:none;">← All customers</a>
    <div class="page-head" style="margin-top:10px;">
      <div style="display:flex; align-items:center; gap:14px;">
        ${avatarHTML(c, 54)}
        <div><h1>${esc(c.name)} ${c.status !== 'approved' ? statusBadge(c) : ''}</h1><div class="sub">@${esc(c.username)} · ${esc(c.email) || 'no email on file'}</div></div>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-ghost btn-sm" style="color:var(--rust); border-color:var(--rust);" onclick="adminDeleteCustomer('${c.id}')">Delete customer</button>
      </div>
    </div>

    ${pendingBanner}
    ${adminStatusHTML(c)}

    ${adminEditing ? adminEditFormHTML(c) : adminProfileHTML(c)}

    <div class="card card-pad" style="margin-bottom:24px;">
      <div class="section-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span>Accounts</span>
        <button class="btn ${adminAddingAcct ? 'btn-ghost' : 'btn-brass'} btn-sm" onclick="adminToggleAddAcct()">${adminAddingAcct ? 'Cancel' : '+ Add account'}</button>
      </div>
      ${adminAddingAcct ? adminAddAcctFormHTML(c) : '<p style="font-size:0.85rem; color:var(--text-soft); margin:0;">Add a savings, checking or other account for this customer.</p>'}
    </div>

    <div class="acct-grid">
      ${c.accounts.map(a => `
        <div class="card acct-card" style="cursor:default;">
          <div class="label"><span>${a.type}</span><span>${a.number}</span></div>
          <div class="bal">${fmt(a.balance)}</div>
          <div class="num">Current balance</div>
        </div>
      `).join('')}
    </div>

    <div class="card card-pad" style="margin-bottom:24px;">
      <div class="section-title">Add a transaction</div>
      <form class="tx-add-form" onsubmit="submitAdminAddTransaction(event,'${c.id}')">
        <div class="field" style="margin:0;"><label>Account</label>
          <select id="admin-tx-account">${c.accounts.map(a => `<option value="${a.id}">${a.type}</option>`).join('')}</select>
        </div>
        <div class="field" style="margin:0;"><label>Date</label><input id="admin-tx-date" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        <div class="field" style="margin:0;"><label>Description</label><input id="admin-tx-desc" type="text" placeholder="e.g. Fee reversal" required></div>
        <div class="field" style="margin:0;"><label>Amount</label><div class="amount-input"><span>$</span><input id="admin-tx-amount" type="number" step="0.01" required></div></div>
        <button type="submit" class="btn btn-brass">Add</button>
      </form>
      <p style="font-size:0.8rem; color:var(--text-soft); margin-top:10px;">Negative for a charge or withdrawal. Updates the account balance too.</p>
    </div>

    ${c.accounts.map(a => `
      <div class="card card-pad" style="margin-bottom:24px;">
        <div class="section-title" style="display:flex; justify-content:space-between; align-items:center;">
          <span>${a.type} — history</span>
          <button class="btn btn-ghost btn-sm" onclick="adminGenerateActivity('${c.id}','${a.id}')">✨ Generate activity</button>
        </div>
        <div class="table-scroll">
          <table class="tx stack">
            <thead><tr><th>Date</th><th>Description</th><th>Category</th><th style="text-align:right;">Amount</th><th></th></tr></thead>
            <tbody>
              ${[...a.transactions].sort((x,y) => y.date.localeCompare(x.date)).map(t => `
                <tr>
                  <td class="c-date">${fmtDate(t.date)}</td>
                  <td class="c-desc">${esc(t.desc)}<div class="m-meta">${fmtDate(t.date)} · ${esc(t.cat)}</div></td>
                  <td class="c-cat"><span class="tx-cat">${esc(t.cat)}</span></td>
                  <td style="text-align:right;" class="c-amt amt ${t.amount<0?'neg':'pos'}">${fmt(t.amount)}</td>
                  <td class="c-act"><button class="btn btn-ghost btn-sm" style="padding:4px 10px; color:var(--rust); border-color:var(--rust);" onclick="adminDeleteTransaction('${c.id}','${a.id}','${t.id}')">Remove</button></td>
                </tr>
              `).join('') || `<tr><td colspan="5" class="c-act" style="text-align:center; color:var(--text-soft);">No transactions yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}

    <div class="card card-pad">
      <div class="section-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span>Cards</span>
        <button class="btn ${adminIssuing ? 'btn-ghost' : 'btn-brass'} btn-sm" onclick="adminToggleIssue()">${adminIssuing ? 'Cancel' : '+ Issue card'}</button>
      </div>
      ${adminIssuing ? adminIssueFormHTML(c) : ''}
      ${c.cards.length ? '' : '<div class="empty-state" style="padding:26px 10px;">No cards issued yet.</div>'}
      <div class="cards-grid">
        ${c.cards.map(card => `
          <div>
            ${cardMarkup(card)}
            <div class="card-controls">
              <label class="toggle ${card.frozen ? 'on' : ''}" onclick="adminToggleFreeze('${c.id}','${card.id}')"><span class="sw"></span> ${card.frozen ? 'Frozen' : 'Freeze card'}</label>
              <button class="btn btn-ghost btn-sm" style="color:var(--rust); border-color:var(--rust);" onclick="adminDeleteCard('${c.id}','${card.id}')">Delete card</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function adminProfileHTML(c) {
  const row = (label, value) => `<div class="info-row"><span>${label}</span><b>${value ? esc(value) : '—'}</b></div>`;
  return `
    <div class="card card-pad" style="margin-bottom:20px;">
      <div class="section-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span>Customer details</span>
        <button class="btn btn-brass btn-sm" onclick="adminStartEdit('${c.id}')">✎ Edit</button>
      </div>
      <div class="info-grid">
        ${row('Full name', c.name)}
        ${row('Username', c.username)}
        ${row('Email', c.email)}
        ${row('Phone', c.phone)}
        ${row('Date of birth', c.dob)}
        ${row('Home address', c.address)}
        ${row('Access / transfer code', c.transferCode || 'NOT SET — customer cannot log in or send money')}
        ${row('Customer since', c.memberSince ? new Date(c.memberSince + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '')}
      </div>
    </div>
  `;
}

function adminEditFormHTML(c) {
  return `
    <div class="card card-pad" style="margin-bottom:20px; border-left:3px solid var(--brass);">
      <div class="section-title">Editing customer</div>
      <form onsubmit="submitEditCustomer(event,'${c.id}')">
        <div class="form-cols">
          <div class="field"><label>Full name</label><input id="admin-edit-name" type="text" value="${esc(c.name)}" required></div>
          <div class="field"><label>Username</label><input id="admin-edit-username" type="text" value="${esc(c.username)}" required></div>
          <div class="field"><label>Email</label><input id="admin-edit-email" type="email" value="${esc(c.email)}"></div>
          <div class="field"><label>Phone</label><input id="admin-edit-phone" type="text" value="${esc(c.phone)}"></div>
          <div class="field"><label>Date of birth</label><input id="admin-edit-dob" type="date" value="${esc(c.dob)}"></div>
          <div class="field"><label>Home address</label><input id="admin-edit-address" type="text" value="${esc(c.address)}"></div>
          <div class="field"><label>Customer since (join date)</label><input id="admin-edit-since" type="date" value="${esc(c.memberSince)}"></div>
          <div class="field"><label>Access / transfer code</label><input id="admin-edit-code" type="text" inputmode="numeric" value="${esc(c.transferCode)}" placeholder="Required for login and every transfer"></div>
          <div class="field"><label>Reset password (leave blank to keep current)</label><input id="admin-edit-password" type="text" placeholder="New password"></div>
        </div>
        <div class="field"><label>Photo</label><input id="admin-edit-photo" type="file" accept="image/*"></div>
        <p style="font-size:0.8rem; color:var(--text-soft); margin:-8px 0 18px;">The photo is shown on the customer's code screen and dashboard. Leave empty to keep the current photo.</p>

        <div class="section-title" style="margin-top:6px;">Account balances</div>
        <div class="form-cols">
          ${c.accounts.map((a, i) => `
            <div class="field"><label>${esc(a.type)} ${esc(a.number)}</label>
              <div class="amount-input"><span>$</span><input id="admin-edit-bal-${i}" type="number" step="0.01" value="${a.balance.toFixed(2)}"></div></div>
          `).join('')}
        </div>
        <p style="font-size:0.8rem; color:var(--text-soft); margin:-4px 0 18px;">Changing a balance adds a "Balance adjustment" line to that account's history so the numbers still add up.</p>

        <div id="admin-edit-error" class="hide" style="color:var(--rust); font-size:0.85rem; margin-bottom:14px;">That username is taken by someone else.</div>
        <div style="display:flex; gap:10px;">
          <button type="submit" class="btn btn-primary btn-sm">Save changes</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="adminCancelEdit('${c.id}')">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

/* Account status card: Active / Suspended / On hold, with the message the customer will see. */
function adminStatusHTML(c) {
  if (c.status === 'pending') return '';
  const restricted = isRestricted(c);
  const note = adminNotice ? `<div class="confirm-note" style="margin-bottom:14px;">${esc(adminNotice)}</div>` : '';
  adminNotice = '';
  return `
    <div class="card card-pad" style="margin-bottom:20px; border-left:3px solid ${restricted ? 'var(--rust)' : 'var(--moss)'};">
      <div class="section-title" style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
        <span>Account status</span>${statusBadge(c)}
      </div>
      ${note}
      ${restricted ? `<p style="margin:0 0 14px; color:var(--text-soft); font-size:0.9rem;">This customer sees the suspension page when they log in, and on any click or transfer if they're already signed in.</p>` : ''}
      <form onsubmit="adminApplyStatus(event,'${c.id}')">
        <div class="form-cols">
          <div class="field"><label for="admin-status">Status</label>
            <select id="admin-status">
              <option value="approved" ${c.status === 'approved' ? 'selected' : ''}>Active</option>
              <option value="suspended" ${c.status === 'suspended' ? 'selected' : ''}>Suspended</option>
              <option value="hold" ${c.status === 'hold' ? 'selected' : ''}>On hold</option>
            </select></div>
        </div>
        <div class="field"><label for="admin-status-msg">Message shown to the customer (optional)</label>
          <textarea id="admin-status-msg" class="textarea" rows="3" placeholder="Leave blank to use the standard message asking them to contact the bank.">${esc(c.suspendMessage)}</textarea></div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button type="submit" class="btn btn-primary btn-sm">Apply status</button>
          ${restricted ? `<button type="button" class="btn btn-ghost btn-sm" onclick="adminLiftRestriction('${c.id}')">Lift suspension</button>` : ''}
        </div>
      </form>
      <div style="border-top:1px solid var(--line); margin-top:20px; padding-top:18px;">
        <div class="section-title" style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <span>Transfers</span>
          <span class="badge" style="${c.transfersBlocked ? 'color:var(--rust);' : ''}">${c.transfersBlocked ? 'Blocked' : 'Allowed'}</span>
        </div>
        <p style="margin:0 0 14px; color:var(--text-soft); font-size:0.9rem;">Block this customer from sending money (transfers, wires, Zelle, bill pay) while they can still log in and see their accounts.</p>
        <form onsubmit="adminApplyTransfers(event,'${c.id}')">
          <div class="form-cols">
            <div class="field"><label for="admin-tf-block">Transfers</label>
              <select id="admin-tf-block"><option value="0" ${c.transfersBlocked ? '' : 'selected'}>Allowed</option><option value="1" ${c.transfersBlocked ? 'selected' : ''}>Blocked</option></select></div>
          </div>
          <div class="field"><label for="admin-tf-msg">Message shown to the customer (optional)</label>
            <textarea id="admin-tf-msg" class="textarea" rows="2" placeholder="Leave blank for the standard message asking them to contact the bank.">${esc(c.transfersMessage || '')}</textarea></div>
          <button type="submit" class="btn btn-primary btn-sm">Apply</button>
        </form>
      </div>
    </div>
  `;
}

function adminApplyTransfers(e, id) {
  e.preventDefault();
  const c = state.customers.find(x => x.id === id);
  c.transfersBlocked = document.getElementById('admin-tf-block').value === '1';
  c.transfersMessage = document.getElementById('admin-tf-msg').value.trim();
  adminNotice = c.transfersBlocked ? 'Transfers blocked for this customer.' : 'Transfers allowed again.';
  saveState();
  renderAdminDetail(id);
}

function adminApplyStatus(e, id) {
  e.preventDefault();
  const c = state.customers.find(x => x.id === id);
  const status = document.getElementById('admin-status').value;
  c.status = status;
  c.suspendMessage = document.getElementById('admin-status-msg').value.trim();
  adminNotice = status === 'approved' ? 'Account is active.' : (status === 'hold' ? 'Account put on hold.' : 'Account suspended.');
  saveState();
  renderAdminDetail(id);
}

function adminLiftRestriction(id) {
  const c = state.customers.find(x => x.id === id);
  c.status = 'approved';
  c.suspendMessage = '';
  adminNotice = 'Restriction lifted — the customer can log in and transfer again.';
  saveState();
  renderAdminDetail(id);
}

/* Cards: issue (debit or credit) and delete */
function adminToggleAddAcct() { adminAddingAcct = !adminAddingAcct; renderAdminDetail(adminSelectedId); }

function adminAddAcctFormHTML(c) {
  return `
    <form class="card-issue-form" onsubmit="adminSubmitAddAccount(event,'${c.id}')">
      <div class="form-cols">
        <div class="field"><label for="newacct-type">Account type</label>
          <input id="newacct-type" type="text" list="newacct-types" value="Foundation Savings" maxlength="40" required>
          <datalist id="newacct-types"><option value="Foundation Savings"><option value="Everyday Checking"><option value="High-Yield Savings"><option value="Money Market"><option value="Business Checking"></datalist></div>
        <div class="field"><label for="newacct-bal">Opening balance</label>
          <div class="amount-input"><span>$</span><input id="newacct-bal" type="number" min="0" step="0.01" value="0"></div></div>
      </div>
      <div style="display:flex; gap:10px; margin-bottom:6px;">
        <button type="submit" class="btn btn-primary btn-sm">Add account</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="adminToggleAddAcct()">Cancel</button>
      </div>
    </form>
  `;
}

function adminSubmitAddAccount(e, custId) {
  e.preventDefault();
  const c = state.customers.find(x => x.id === custId);
  const type = document.getElementById('newacct-type').value.trim();
  const bal = Math.max(0, parseFloat(document.getElementById('newacct-bal').value) || 0);
  if (!type) return;
  let last4;
  do { last4 = String(1000 + Math.floor(Math.random() * 9000)); } while (c.accounts.some(a => a.number === '••••' + last4));
  const acct = { id: 'acct_' + Date.now().toString(36) + Math.floor(Math.random() * 1000), type, number: '••••' + last4, balance: +bal.toFixed(2), transactions: [] };
  if (bal > 0) acct.transactions.push({ id: newTxId(), date: todayStr(), desc: 'Opening deposit', cat: 'Deposit', amount: +bal.toFixed(2) });
  c.accounts.push(acct);
  adminAddingAcct = false;
  saveState();
  renderAdminDetail(custId);
}

function adminToggleIssue() { adminIssuing = !adminIssuing; renderAdminDetail(adminSelectedId); }

function defaultExpiry() {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, '0') + '/' + String((d.getFullYear() + 5) % 100).padStart(2, '0');
}

function adminIssueFormHTML(c) {
  return `
    <form class="card-issue-form" onsubmit="adminSubmitIssueCard(event,'${c.id}')">
      <div class="form-cols">
        <div class="field"><label for="issue-kind">Card type</label>
          <select id="issue-kind" onchange="document.getElementById('issue-limit-wrap').classList.toggle('hide', this.value !== 'Credit')">
            <option value="Debit">Debit</option><option value="Credit">Credit</option>
          </select></div>
        <div class="field"><label for="issue-holder">Name on card</label><input id="issue-holder" type="text" value="${esc(c.name)}" required></div>
        <div class="field"><label for="issue-expiry">Expiry (MM/YY)</label><input id="issue-expiry" type="text" value="${defaultExpiry()}" placeholder="MM/YY" pattern="(0[1-9]|1[0-2])/[0-9]{2}" maxlength="5" required></div>
        <div class="field hide" id="issue-limit-wrap"><label for="issue-limit">Credit limit</label>
          <div class="amount-input"><span>$</span><input id="issue-limit" type="number" min="0" step="100" value="5000"></div></div>
      </div>
      <div style="display:flex; gap:10px; margin-bottom:22px;">
        <button type="submit" class="btn btn-primary btn-sm">Issue card</button>
        <button type="button" class="btn btn-ghost btn-sm" onclick="adminToggleIssue()">Cancel</button>
      </div>
    </form>
  `;
}

function adminSubmitIssueCard(e, custId) {
  e.preventDefault();
  const c = state.customers.find(x => x.id === custId);
  const kind = document.getElementById('issue-kind').value;
  const holder = document.getElementById('issue-holder').value.trim() || c.name;
  const expiry = document.getElementById('issue-expiry').value.trim() || defaultExpiry();
  let number;
  do { number = String(1000 + Math.floor(Math.random() * 9000)); } while (c.cards.some(k => k.number === number));
  const card = {
    id: custId + '_card' + Date.now(), kind,
    label: kind === 'Credit' ? 'Waypoint Rewards Credit' : 'Everyday Checking Debit',
    number, holder, expiry, frozen: false
  };
  if (kind === 'Credit') { card.balance = 0; card.limit = parseFloat(document.getElementById('issue-limit').value) || 5000; }
  c.cards.push(card);
  adminIssuing = false; adminAddingAcct = false;
  saveState();
  renderAdminDetail(custId);
}

function adminDeleteCard(custId, cardId) {
  const c = state.customers.find(x => x.id === custId);
  const card = c.cards.find(k => k.id === cardId);
  if (!card) return;
  if (!confirm(`Delete the ${card.kind.toLowerCase()} card ending ${card.number}? The customer will no longer see it.`)) return;
  c.cards = c.cards.filter(k => k.id !== cardId);
  saveState();
  renderAdminDetail(custId);
}

function adminApproveCustomer(id) {
  const c = state.customers.find(x => x.id === id);
  c.status = 'approved';
  saveState();
  renderAdminDetail(id);
}

async function adminRejectCustomer(id) {
  if (!confirm('Reject and delete this application? This cannot be undone.')) return;
  if (Backend.enabled) {
    try { await Backend.adminCall('delete', { id }); } catch (err) { toast(err.message); return; }
  }
  state.customers = state.customers.filter(c => c.id !== id);
  delete lastSaved[id];
  saveState();
  adminGoList();
}

function submitEditCustomer(e, custId) {
  e.preventDefault();
  const c = state.customers.find(x => x.id === custId);
  const val = id => document.getElementById(id).value;
  const name = val('admin-edit-name').trim();
  const username = val('admin-edit-username').trim();
  const email = val('admin-edit-email').trim();
  const phone = val('admin-edit-phone').trim();
  const dob = val('admin-edit-dob');
  const address = val('admin-edit-address').trim();
  const code = val('admin-edit-code').trim();
  const since = val('admin-edit-since');
  const newPass = val('admin-edit-password');
  const file = document.getElementById('admin-edit-photo').files[0];
  const errEl = document.getElementById('admin-edit-error');

  if (state.customers.some(x => x.id !== custId && x.username.toLowerCase() === username.toLowerCase())) {
    errEl.classList.remove('hide');
    return;
  }
  errEl.classList.add('hide');

  async function finish(photo) {
    if (Backend.enabled) {
      try {
        if (username !== c.username) await Backend.adminCall('set_username', { id: c.id, username });
        if (newPass) await Backend.adminCall('set_password', { id: c.id, password: newPass });
      } catch (err) { errEl.textContent = err.message; errEl.classList.remove('hide'); return; }
    }
    c.name = name; c.username = username; c.email = email;
    c.phone = phone; c.dob = dob; c.address = address; c.transferCode = code;
    if (since) c.memberSince = since;
    if (newPass && !Backend.enabled) c.password = newPass;
    if (photo) c.photo = photo;
    c.cards.forEach(card => { card.holder = name; }); // keep card names in sync

    const today = todayStr();
    c.accounts.forEach((a, i) => {
      const input = document.getElementById('admin-edit-bal-' + i);
      if (!input) return;
      const nb = parseFloat(input.value);
      if (isNaN(nb)) return;
      const diff = +(nb - a.balance).toFixed(2);
      if (diff !== 0) {
        a.balance = +nb.toFixed(2);
        a.transactions.unshift({ id: newTxId(), date: today, desc: 'Balance adjustment', cat: 'Admin', amount: diff });
      }
    });

    adminEditing = false;
    saveState();
    renderAdminDetail(custId);
  }

  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => finish(ev.target.result);
    reader.readAsDataURL(file);
  } else {
    finish(null);
  }
}

function submitAdminAddTransaction(e, custId) {
  e.preventDefault();
  const c = state.customers.find(x => x.id === custId);
  const accId = document.getElementById('admin-tx-account').value;
  const date = document.getElementById('admin-tx-date').value || new Date().toISOString().slice(0, 10);
  const desc = document.getElementById('admin-tx-desc').value.trim() || 'Admin adjustment';
  const amt = parseFloat(document.getElementById('admin-tx-amount').value);
  if (!amt) return;

  const acc = c.accounts.find(a => a.id === accId);
  acc.balance = +(acc.balance + amt).toFixed(2);
  acc.transactions.unshift({ id: newTxId(), date, desc, cat: 'Admin', amount: amt });
  saveState();
  renderAdminDetail(custId);
}

function adminDeleteTransaction(custId, acctId, txId) {
  const c = state.customers.find(x => x.id === custId);
  const acc = c.accounts.find(a => a.id === acctId);
  const idx = acc.transactions.findIndex(t => t.id === txId);
  if (idx === -1) return;
  acc.balance = +(acc.balance - acc.transactions[idx].amount).toFixed(2);
  acc.transactions.splice(idx, 1);
  saveState();
  renderAdminDetail(custId);
}

/* Auto-generated realistic activity, spread over the last 28 days. */
const ACTIVITY_TEMPLATES = [
  { desc: 'Harborline Grocery', cat: 'Groceries', range: [-95, -20] },
  { desc: 'Riverside Coffee Co.', cat: 'Dining', range: [-8, -3] },
  { desc: 'Northline Electric', cat: 'Utilities', range: [-110, -40] },
  { desc: 'Waypoint ATM Withdrawal', cat: 'Cash', range: [-100, -20] },
  { desc: 'Paycheck deposit', cat: 'Income', range: [1200, 2400] },
  { desc: 'Streamline Subscriptions', cat: 'Subscriptions', range: [-20, -9] },
  { desc: 'Corner Hardware', cat: 'Shopping', range: [-60, -15] },
  { desc: 'Monthly interest', cat: 'Interest', range: [5, 25] },
];

function adminGenerateActivity(custId, acctId) {
  const c = state.customers.find(x => x.id === custId);
  const acc = c.accounts.find(a => a.id === acctId);
  for (let i = 0; i < 6; i++) {
    const t = ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
    const amount = +(t.range[0] + Math.random() * (t.range[1] - t.range[0])).toFixed(2);
    const d = new Date();
    d.setDate(d.getDate() - (Math.floor(Math.random() * 28) + 1));
    acc.transactions.push({ id: newTxId(), date: d.toISOString().slice(0, 10), desc: t.desc, cat: t.cat, amount });
    acc.balance = +(acc.balance + amount).toFixed(2);
  }
  saveState();
  renderAdminDetail(custId);
}

function adminToggleFreeze(custId, cardId) {
  const c = state.customers.find(x => x.id === custId);
  const card = c.cards.find(k => k.id === cardId);
  card.frozen = !card.frozen;
  saveState();
  renderAdminDetail(custId);
}

async function adminDeleteCustomer(id) {
  if (!confirm('Delete this customer? This cannot be undone.')) return;
  if (Backend.enabled) {
    try { await Backend.adminCall('delete', { id }); } catch (err) { toast(err.message); return; }
    state.customers = state.customers.filter(c => c.id !== id);
    delete lastSaved[id];
    adminGoList();
    return;
  }
  state.customers = state.customers.filter(c => c.id !== id);
  if (!state.customers.length) state.customers = seedState().customers;
  if (state.currentCustomerId === id) state.currentCustomerId = state.customers[0].id;
  saveState();
  adminGoList();
}

/* ---------------- Init ---------------- */
loadState();
if (Backend.enabled) {
  const lbl = document.querySelector('label[for="admin-user"]');
  if (lbl) lbl.textContent = 'Admin email';
  const si = document.getElementById('admin-user'); if (si) si.type = 'email';
}
/* Suspension guard: once logged in, any click or form submit re-checks the account status. */
['click', 'submit'].forEach(type => {
  document.addEventListener(type, e => {
    if (enforceSuspension()) { e.preventDefault(); e.stopPropagation(); }
  }, true);
});
/* If the admin changes the status in another tab, react straight away. */
window.addEventListener('storage', e => {
  if (e.key === STORAGE_KEY) {
    if (!enforceSuspension()) syncStatuses();
    if (location.hash === '#/suspended') renderSuspended();
  }
});
window.addEventListener('hashchange', routeFromHash);

/* Remote mode: pick up an existing session (page refresh) before drawing the first screen. */
async function restoreRemote() {
  try {
    if (location.hash.startsWith('#/admin')) {
      if (await Backend.adminRestore()) {
        try { sessionStorage.setItem('waypoint-admin-authed', '1'); } catch (e) {}
        state.customers = await Backend.adminLoad();
        markAdminSaved();
      } else {
        try { sessionStorage.removeItem('waypoint-admin-authed'); } catch (e) {}
      }
    } else {
      const mine = await Backend.loadMine();
      if (mine) { adoptMine(mine); startRemoteWatch(mine.id); }
    }
  } catch (err) { console.warn('Could not restore session', err); }
}
if (Backend.enabled) {
  restoreRemote().then(routeFromHash);
  // Fallback if realtime is unavailable: re-check the account every 10 seconds.
  setInterval(async () => {
    if (adminActive() || !(appVisible() || location.hash === '#/suspended')) return;
    await refreshMine();
    if (!enforceSuspension() && location.hash === '#/suspended') renderSuspended();
  }, 10000);
} else {
  routeFromHash();
}
