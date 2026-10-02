/* ============================================================
   DEMO STATE — fictional data, persisted locally per browser.
   Multiple customers live under state.customers; state.currentCustomerId
   is whoever is logged into the member-facing app right now.
   ============================================================ */
const STORAGE_KEY = 'waypoint-state-v2';

function seedState() {
  const alex = {
    id: 'cust_alex', name: 'Alex Morgan', username: 'alexmorgan', email: 'alex@waypoint-demo.com', photo: null,
    accounts: [
      {
        id: 'chk', type: 'Everyday Checking', number: '••••4821', balance: 4382.10,
        transactions: [
          { date: '2026-09-19', desc: 'Paycheck deposit', cat: 'Income', amount: 2140.00 },
          { date: '2026-09-18', desc: 'Harborline Grocery', cat: 'Groceries', amount: -64.32 },
          { date: '2026-09-16', desc: 'Riverside Coffee Co.', cat: 'Dining', amount: -6.75 },
          { date: '2026-09-15', desc: 'Transfer to Savings', cat: 'Transfer', amount: -300.00 },
          { date: '2026-09-12', desc: 'Northline Electric', cat: 'Utilities', amount: -88.40 },
          { date: '2026-09-08', desc: 'Waypoint ATM Withdrawal', cat: 'Cash', amount: -60.00 },
        ]
      },
      {
        id: 'sav', type: 'Foundation Savings', number: '••••1092', balance: 18650.44,
        transactions: [
          { date: '2026-09-15', desc: 'Transfer from Checking', cat: 'Transfer', amount: 300.00 },
          { date: '2026-09-01', desc: 'Monthly interest', cat: 'Interest', amount: 22.14 },
          { date: '2026-08-15', desc: 'Transfer from Checking', cat: 'Transfer', amount: 300.00 },
          { date: '2026-08-01', desc: 'Monthly interest', cat: 'Interest', amount: 21.98 },
        ]
      }
    ],
    cards: [
      { id: 'debit', kind: 'Debit', label: 'Everyday Checking Debit', number: '4821', holder: 'Alex Morgan', expiry: '12/29', frozen: false },
      { id: 'credit', kind: 'Credit', label: 'Waypoint Rewards Credit', number: '7734', holder: 'Alex Morgan', expiry: '05/28', balance: 612.30, limit: 5000, frozen: false },
    ]
  };

  const jordan = {
    id: 'cust_jordan', name: 'Jordan Lee', username: 'jordanlee', email: 'jordan@waypoint-demo.com', photo: null,
    accounts: [
      {
        id: 'cust_jordan_chk', type: 'Everyday Checking', number: '••••2256', balance: 1180.55,
        transactions: [
          { date: '2026-09-20', desc: 'Paycheck deposit', cat: 'Income', amount: 1450.00 },
          { date: '2026-09-17', desc: 'Riverside Coffee Co.', cat: 'Dining', amount: -5.25 },
          { date: '2026-09-10', desc: 'Northline Electric', cat: 'Utilities', amount: -64.10 },
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.customers) && parsed.customers.length) { state = parsed; return; }
    }
  } catch (e) { console.warn('Could not read saved demo state', e); }
  state = seedState();
}

function saveState() {
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

/* Creates a new customer record: one checking account + one debit card. */
function createCustomer({ name, username, email, photo, startingBalance }) {
  const id = 'cust_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const acctNum = '••••' + String(1000 + Math.floor(Math.random() * 9000));
  const cardNum = String(1000 + Math.floor(Math.random() * 9000));
  const customer = {
    id, name, email: email || '',
    username: (username || name.toLowerCase().replace(/\s+/g, '')),
    photo: photo || null,
    accounts: [{ id: id + '_chk', type: 'Everyday Checking', number: acctNum, balance: startingBalance || 0, transactions: [] }],
    cards: [{ id: id + '_debit', kind: 'Debit', label: 'Everyday Checking Debit', number: cardNum, holder: name, expiry: '12/29', frozen: false }]
  };
  state.customers.push(customer);
  return customer;
}

/* ---------------- View switching (public / login / app) ---------------- */
function showOnly(id) {
  ['public-view','login-view','app-view'].forEach(v => {
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
  if (name === 'open-account') generateCaptcha();
}

function handleLogin(e) {
  e.preventDefault();
  const uname = document.getElementById('li-user').value.trim().toLowerCase();
  const match = state.customers.find(c => c.username.toLowerCase() === uname);
  state.currentCustomerId = (match || state.customers[0]).id;
  saveState();
  location.hash = '#/app/dashboard';
}
function logout() {
  location.hash = '#/';
}

function toggleMobileNav() {
  document.getElementById('app-sidebar').classList.toggle('mobile-open');
}

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
   #/app/cards     cards
------------------------------------------- */
let currentPage = 'dashboard';
let currentAccountId = null;

function routeFromHash() {
  const hash = location.hash || '#/';

  if (hash === '#/' || hash === '#') {
    showOnly('public-view');
    showPublicPage('home');
    return;
  }

  if (hash === '#/login') {
    showOnly('login-view');
    return;
  }

  if (hash.startsWith('#/app')) {
    const parts = hash.slice('#/app'.length).split('/').filter(Boolean);
    currentPage = parts[0] || 'dashboard';
    currentAccountId = parts[1] || null;
    const cust = getCurrentCustomer();
    document.getElementById('sidebar-who').innerHTML =
      avatarHTML(cust, 34) + `<span style="color:var(--text-on-ink); font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${cust.name}</span>`;
    document.querySelectorAll('.app-nav .navlink').forEach(b => {
      b.classList.toggle('active', b.dataset.page === currentPage);
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
    renderAdmin();
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
  else if (currentPage === 'cards') main.innerHTML = renderCards();
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
          <h1>Good to see you, ${cust.name.split(' ')[0]}</h1>
          <div class="sub">Total balance across all accounts: ${fmt(totalBal)}</div>
        </div>
      </div>
      <a class="btn btn-brass" href="#/app/transfers">Make a transfer</a>
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
        <table class="tx">
          <thead><tr><th>Date</th><th>Description</th><th>Account</th><th>Category</th><th style="text-align:right;">Amount</th></tr></thead>
          <tbody>
            ${allTx.map(t => `
              <tr>
                <td>${fmtDate(t.date)}</td>
                <td>${t.desc}</td>
                <td>${t.acct}</td>
                <td><span class="tx-cat">${t.cat}</span></td>
                <td style="text-align:right;" class="amt ${t.amount<0?'neg':'pos'}">${fmt(t.amount)}</td>
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
        <table class="tx">
          <thead><tr><th>Date</th><th>Description</th><th>Category</th><th style="text-align:right;">Amount</th></tr></thead>
          <tbody>
            ${tx.map(t => `
              <tr>
                <td>${fmtDate(t.date)}</td>
                <td>${t.desc}</td>
                <td><span class="tx-cat">${t.cat}</span></td>
                <td style="text-align:right;" class="amt ${t.amount<0?'neg':'pos'}">${fmt(t.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ---------------- Transfers ---------------- */
function renderTransfers() {
  const cust = getCurrentCustomer();
  const opts = cust.accounts.map(a => `<option value="${a.id}">${a.type} (${a.number}) — ${fmt(a.balance)}</option>`).join('');
  const recentTransfers = cust.accounts.flatMap(a => a.transactions.filter(t => t.cat === 'Transfer').map(t => ({...t, acct: a.type})))
    .sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);

  return `
    <div class="page-head"><div><h1>Transfers</h1><div class="sub">Move money between your own Waypoint accounts, instantly.</div></div></div>
    <div class="transfer-layout">
      <div class="card card-pad transfer-form">
        <div class="section-title">New transfer</div>
        <form onsubmit="submitTransfer(event)">
          <div class="field">
            <label for="tf-from">From</label>
            <select id="tf-from">${opts}</select>
          </div>
          <div class="field">
            <label for="tf-to">To</label>
            <select id="tf-to">${opts}</select>
          </div>
          <div class="field">
            <label for="tf-amt">Amount</label>
            <div class="amount-input"><span>$</span><input id="tf-amt" type="number" min="0.01" step="0.01" placeholder="0.00" required></div>
          </div>
          <div class="field">
            <label for="tf-memo">Memo (optional)</label>
            <input id="tf-memo" type="text" placeholder="e.g. Rent, savings goal">
          </div>
          <div id="tf-error" class="hide" style="color:var(--rust); font-size:0.85rem; margin-bottom:14px;"></div>
          <button type="submit" class="btn btn-primary btn-block">Transfer funds</button>
        </form>
      </div>
      <div class="card card-pad">
        <div class="section-title">Recent transfers</div>
        ${recentTransfers.length ? `
          <table class="tx">
            <tbody>
              ${recentTransfers.map(t => `
                <tr><td>${fmtDate(t.date)}</td><td>${t.desc}<br><span style="color:var(--text-soft); font-size:0.78rem;">${t.acct}</span></td>
                <td style="text-align:right;" class="amt ${t.amount<0?'neg':'pos'}">${fmt(t.amount)}</td></tr>
              `).join('')}
            </tbody>
          </table>
        ` : `<div class="empty-state">No transfers yet.</div>`}
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
  const errEl = document.getElementById('tf-error');
  errEl.classList.add('hide');

  if (fromId === toId) { errEl.textContent = 'Choose two different accounts.'; errEl.classList.remove('hide'); return; }
  if (!amt || amt <= 0) { errEl.textContent = 'Enter an amount greater than $0.'; errEl.classList.remove('hide'); return; }
  const from = getAccount(fromId), to = getAccount(toId);
  if (amt > from.balance) { errEl.textContent = `Insufficient funds in ${from.type}.`; errEl.classList.remove('hide'); return; }

  const today = new Date().toISOString().slice(0,10);
  from.balance = +(from.balance - amt).toFixed(2);
  to.balance = +(to.balance + amt).toFixed(2);
  from.transactions.unshift({ date: today, desc: memo ? `Transfer to ${to.type} — ${memo}` : `Transfer to ${to.type}`, cat: 'Transfer', amount: -amt });
  to.transactions.unshift({ date: today, desc: memo ? `Transfer from ${from.type} — ${memo}` : `Transfer from ${from.type}`, cat: 'Transfer', amount: amt });
  saveState();
  render();
}

/* ---------------- Cards ---------------- */
function renderCards() {
  const cust = getCurrentCustomer();
  return `
    <div class="page-head"><div><h1>Cards</h1><div class="sub">Freeze a card instantly if it's ever lost or misplaced.</div></div></div>
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
  const entered = document.getElementById('oa-captcha').value.trim().toUpperCase();
  const errEl = document.getElementById('oa-captcha-error');

  if (entered !== captchaText) {
    errEl.classList.remove('hide');
    refreshCaptcha();
    return;
  }
  errEl.classList.add('hide');

  const name = document.getElementById('oa-name').value.trim() || 'New Member';
  const email = document.getElementById('oa-email').value.trim();
  const username = document.getElementById('oa-username').value.trim();

  const existing = state.customers.find(c => c.username.toLowerCase() === username.toLowerCase());
  const customer = existing || createCustomer({ name, username, email, startingBalance: 0 });
  state.currentCustomerId = customer.id;
  saveState();
  location.hash = '#/app/dashboard';
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

  if (u === ADMIN_USER && p === ADMIN_PASS) {
    try { sessionStorage.setItem('waypoint-admin-authed', '1'); } catch (e) {}
    errEl.classList.add('hide');
    location.hash = '#/admin';
  } else {
    errEl.classList.remove('hide');
  }
}

function adminLogout() {
  try { sessionStorage.removeItem('waypoint-admin-authed'); } catch (e) {}
  location.hash = '#/';
}

let adminView = 'list';       // 'list' | 'add' | 'detail'
let adminSelectedId = null;

function adminGoList()  { adminView = 'list';  adminSelectedId = null; renderAdmin(); }
function adminGoAdd()   { adminView = 'add';   renderAdmin(); }
function adminGoDetail(id) { adminView = 'detail'; adminSelectedId = id; renderAdmin(); }

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
        <button class="btn btn-ghost btn-sm" onclick="adminLogout()">Log out</button>
      </div>
    </div>
    <div class="card">
      <div class="table-scroll">
        <table class="tx">
          <thead><tr><th></th><th>Name</th><th>Username</th><th>Email</th><th style="text-align:right;">Total balance</th></tr></thead>
          <tbody>
            ${state.customers.map(c => `
              <tr style="cursor:pointer;" onclick="adminGoDetail('${c.id}')">
                <td>${avatarHTML(c, 32)}</td>
                <td style="font-weight:600;">${c.name}</td>
                <td>@${c.username}</td>
                <td>${c.email || '—'}</td>
                <td style="text-align:right;">${fmt(c.accounts.reduce((s,a) => s + a.balance, 0))}</td>
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
      <div class="field"><label for="admin-new-email">Email</label><input id="admin-new-email" type="email"></div>
      <div class="field"><label for="admin-new-balance">Starting checking balance</label><div class="amount-input"><span>$</span><input id="admin-new-balance" type="number" step="0.01" value="0"></div></div>
      <div class="field"><label for="admin-new-photo">Photo</label><input id="admin-new-photo" type="file" accept="image/*"></div>
      <p style="font-size:0.8rem; color:var(--text-soft); margin:-8px 0 16px;">This photo appears at the top of their account when they log in. Use a small image — it's stored in the browser.</p>
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
  const email = document.getElementById('admin-new-email').value.trim();
  const startingBalance = parseFloat(document.getElementById('admin-new-balance').value) || 0;
  const file = document.getElementById('admin-new-photo').files[0];

  function finish(photo) {
    createCustomer({ name, username, email, photo, startingBalance });
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

  el.innerHTML = `
    <a href="#" onclick="adminGoList();return false;" style="font-size:0.85rem; color:var(--text-soft); text-decoration:none;">← All customers</a>
    <div class="page-head" style="margin-top:10px;">
      <div style="display:flex; align-items:center; gap:14px;">
        ${avatarHTML(c, 54)}
        <div><h1>${c.name}</h1><div class="sub">@${c.username} · ${c.email || 'no email on file'}</div></div>
      </div>
      <button class="btn btn-ghost btn-sm" style="color:var(--rust); border-color:var(--rust);" onclick="adminDeleteCustomer('${c.id}')">Delete customer</button>
    </div>

    <div class="card card-pad" style="margin-bottom:20px;">
      <div class="section-title">Replace photo</div>
      <input type="file" accept="image/*" onchange="handleReplacePhoto(event,'${c.id}')">
      <p style="font-size:0.8rem; color:var(--text-soft); margin:8px 0 0;">Shown at the top of their account when they log in.</p>
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
      <div class="section-title">Adjust a balance</div>
      <form onsubmit="submitAdminAdjustment(event,'${c.id}')" style="display:grid; grid-template-columns:1.3fr 1fr 1.3fr auto; gap:12px; align-items:end;">
        <div class="field" style="margin:0;"><label>Account</label>
          <select id="admin-adj-account">${c.accounts.map(a => `<option value="${a.id}">${a.type}</option>`).join('')}</select>
        </div>
        <div class="field" style="margin:0;"><label>Amount</label>
          <div class="amount-input"><span>$</span><input id="admin-adj-amount" type="number" step="0.01" required></div>
        </div>
        <div class="field" style="margin:0;"><label>Reason</label><input id="admin-adj-reason" type="text" placeholder="e.g. Fee reversal"></div>
        <button type="submit" class="btn btn-brass">Apply</button>
      </form>
      <p style="font-size:0.8rem; color:var(--text-soft); margin-top:10px;">Use a negative amount to deduct funds.</p>
    </div>

    <div class="card card-pad">
      <div class="section-title" style="display:flex; justify-content:space-between; align-items:center;">
        <span>Cards</span>
        <button class="btn btn-ghost btn-sm" onclick="adminIssueCard('${c.id}')">+ Issue card</button>
      </div>
      <div class="cards-grid">
        ${c.cards.map(card => `
          <div>
            ${cardMarkup(card)}
            <div class="card-controls">
              <label class="toggle ${card.frozen ? 'on' : ''}" onclick="adminToggleFreeze('${c.id}','${card.id}')"><span class="sw"></span> ${card.frozen ? 'Frozen' : 'Freeze card'}</label>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function submitAdminAdjustment(e, custId) {
  e.preventDefault();
  const c = state.customers.find(x => x.id === custId);
  const accId = document.getElementById('admin-adj-account').value;
  const amt = parseFloat(document.getElementById('admin-adj-amount').value);
  const reason = document.getElementById('admin-adj-reason').value.trim() || 'Admin adjustment';
  if (!amt) return;

  const acc = c.accounts.find(a => a.id === accId);
  acc.balance = +(acc.balance + amt).toFixed(2);
  const today = new Date().toISOString().slice(0, 10);
  acc.transactions.unshift({ date: today, desc: reason, cat: 'Admin', amount: amt });
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

function adminIssueCard(custId) {
  const c = state.customers.find(x => x.id === custId);
  const kind = c.cards.length % 2 === 0 ? 'Debit' : 'Credit';
  const card = {
    id: custId + '_card' + Date.now(), kind, number: String(1000 + Math.floor(Math.random() * 9000)),
    holder: c.name, expiry: '12/29', frozen: false
  };
  if (kind === 'Credit') { card.balance = 0; card.limit = 5000; }
  c.cards.push(card);
  saveState();
  renderAdminDetail(custId);
}

function adminDeleteCustomer(id) {
  if (!confirm('Delete this customer? This cannot be undone.')) return;
  state.customers = state.customers.filter(c => c.id !== id);
  if (!state.customers.length) state.customers = seedState().customers;
  if (state.currentCustomerId === id) state.currentCustomerId = state.customers[0].id;
  saveState();
  adminGoList();
}

function handleReplacePhoto(e, custId) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const c = state.customers.find(x => x.id === custId);
    c.photo = ev.target.result;
    saveState();
    renderAdminDetail(custId);
  };
  reader.readAsDataURL(file);
}

/* ---------------- Init ---------------- */
loadState();
window.addEventListener('hashchange', routeFromHash);
routeFromHash();
