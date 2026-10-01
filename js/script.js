/* ============================================================
   DEMO STATE — fictional data, persisted locally per browser
   ============================================================ */
const STORAGE_KEY = 'waypoint-state-v1';

function seedState() {
  return {
    memberName: 'Alex Morgan',
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
      { id: 'debit', kind: 'Debit', label: 'Everyday Checking Debit', number: '4821', linkedAccount: 'chk', frozen: false },
      { id: 'credit', kind: 'Credit', label: 'Waypoint Rewards Credit', number: '7734', balance: 612.30, limit: 5000, frozen: false },
    ]
  };
}

let state = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { state = JSON.parse(raw); return; }
  } catch (e) { console.warn('Could not read saved demo state', e); }
  state = seedState();
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Could not save demo state', e); }
}

function fmt(n) {
  const neg = n < 0;
  const v = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (neg ? '-$' : '$') + v;
}
function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function getAccount(id) { return state.accounts.find(a => a.id === id); }

/* ---------------- View switching (public / login / app) ---------------- */
function showOnly(id) {
  ['public-view','login-view','app-view'].forEach(v => {
    document.getElementById(v).classList.toggle('hide', v !== id);
  });
  window.scrollTo(0,0);
}

const STATIC_PAGES = ['home','personal','business','contact','open-account','about','faq','terms','privacy','security'];
function showPublicPage(name) {
  document.querySelectorAll('.public-page').forEach(el => {
    el.classList.toggle('hide', el.id !== 'page-' + name);
  });
  window.scrollTo(0,0);
  closePublicNav();
  if (name === 'open-account') generateCaptcha();
  if (name === 'contact') resetContactForm();
}

/* ---------------- Mobile nav (public site) ---------------- */
function togglePublicNav() {
  const nav = document.getElementById('mobile-nav');
  const open = nav.classList.toggle('hide') === false;
  document.querySelector('#public-view .menu-toggle').setAttribute('aria-expanded', String(open));
}
function closePublicNav() {
  const nav = document.getElementById('mobile-nav');
  if (!nav) return;
  nav.classList.add('hide');
  const t = document.querySelector('#public-view .menu-toggle');
  if (t) t.setAttribute('aria-expanded', 'false');
}

/* ---------------- Contact form ----------------
   Concept site: there is no backend, so the message is validated and
   confirmed on screen but not actually sent anywhere. To make it real,
   POST the fields below to a form service or your own API in handleContact.
------------------------------------------------ */
function handleContact(e) {
  e.preventDefault();
  const name = document.getElementById('ct-name').value.trim();
  const email = document.getElementById('ct-email').value.trim();
  const message = document.getElementById('ct-message').value.trim();
  const errEl = document.getElementById('ct-error');
  errEl.classList.add('hide');

  if (!name) return showContactError('Please enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showContactError('Please enter a valid email address.');
  if (message.length < 10) return showContactError('Please tell us a little more in your message.');

  document.getElementById('contact-success-text').textContent =
    `Thanks, ${name.split(' ')[0]}. A banker will get back to you at ${email} soon. If it's urgent, call (240) 242-7078.`;
  document.getElementById('contact-form').classList.add('hide');
  const ok = document.getElementById('contact-success');
  ok.classList.remove('hide');
  ok.focus();
}
function showContactError(msg) {
  const errEl = document.getElementById('ct-error');
  errEl.textContent = msg;
  errEl.classList.remove('hide');
}
function resetContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.reset();
  form.classList.remove('hide');
  document.getElementById('contact-success').classList.add('hide');
  document.getElementById('ct-error').classList.add('hide');
}

function handleLogin(e) {
  e.preventDefault();
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
   #/personal      personal banking
   #/business      business banking
   #/contact       contact page with form
   #/about         about page
   #/faq           FAQ page
   #/terms         terms of service
   #/privacy       privacy policy
   #/security      security page
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
    document.getElementById('sidebar-who').textContent = state.memberName;
    document.querySelectorAll('.app-nav .navlink').forEach(b => {
      b.classList.toggle('active', b.dataset.page === currentPage);
    });
    document.getElementById('app-sidebar').classList.remove('mobile-open');
    showOnly('app-view');
    render();
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
  const totalBal = state.accounts.reduce((s,a) => s + a.balance, 0);
  const allTx = state.accounts.flatMap(a => a.transactions.map(t => ({...t, acct: a.type})))
    .sort((a,b) => b.date.localeCompare(a.date)).slice(0,6);

  return `
    <div class="page-head">
      <div>
        <h1>Good to see you, ${state.memberName.split(' ')[0]}</h1>
        <div class="sub">Total balance across all accounts: ${fmt(totalBal)}</div>
      </div>
      <a class="btn btn-brass" href="#/app/transfers">Make a transfer</a>
    </div>

    <div class="acct-grid">
      ${state.accounts.map(a => `
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
  return `
    <div class="page-head">
      <div><h1>Accounts</h1><div class="sub">${state.accounts.length} open accounts</div></div>
    </div>
    <div class="accounts-list-page">
      ${state.accounts.map(a => `
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
  const opts = state.accounts.map(a => `<option value="${a.id}">${a.type} (${a.number}) — ${fmt(a.balance)}</option>`).join('');
  const recentTransfers = state.accounts.flatMap(a => a.transactions.filter(t => t.cat === 'Transfer').map(t => ({...t, acct: a.type})))
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
  return `
    <div class="page-head"><div><h1>Cards</h1><div class="sub">Freeze a card instantly if it's ever lost or misplaced.</div></div></div>
    <div class="cards-grid">
      ${state.cards.map(c => `
        <div>
          <div class="bankcard ${c.kind==='Debit'?'debit':'credit'} ${c.frozen?'frozen':''}">
            <div class="bc-top"><span>Waypoint ${c.kind}</span><span>${c.frozen ? 'Frozen' : 'Active'}</span></div>
            <div class="bc-num">•••• •••• •••• ${c.number}</div>
            <div class="bc-bottom">
              <span>${c.label}</span>
              <span>${c.kind === 'Credit' ? fmt(c.balance) + ' owed' : ''}</span>
            </div>
          </div>
          <div class="card-controls">
            <label class="toggle ${c.frozen ? 'on' : ''}" onclick="toggleFreeze('${c.id}')">
              <span class="sw"></span> ${c.frozen ? 'Card frozen' : 'Freeze card'}
            </label>
            ${c.kind === 'Credit' ? `<span style="font-size:0.8rem; color:var(--text-soft);">Limit ${fmt(c.limit)}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function toggleFreeze(id) {
  const c = state.cards.find(c => c.id === id);
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

  const name = document.getElementById('oa-name').value.trim();
  if (name) state.memberName = name;
  saveState();
  location.hash = '#/app/dashboard';
}

/* ---------------- Init ---------------- */
loadState();
window.addEventListener('hashchange', routeFromHash);
routeFromHash();
