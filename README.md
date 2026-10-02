# Waypoint — Online Banking

A self-contained, single-file demo of an online banking site: marketing
pages, account opening with a custom CAPTCHA, and a client-side banking
app (dashboard, accounts, transfers, cards) backed by fake data stored
in the browser's `localStorage`.

Portfolio project: a simulated bank. No real money, accounts or personal data.

It runs in two modes:

- **Demo mode** (default, `js/config.js` empty): everything is stored in the
  browser's `localStorage`. Works offline, but data is per-browser.
- **Supabase mode** (`js/config.js` filled in): everything is stored in a
  Supabase database and works from any device. See *Backend setup* below.

## Run locally

No build step. Just open `index.html` in a browser, or serve the folder
with any static file server, e.g.:

```
npx serve .
```

## Deploy on Vercel

1. Push this repo to GitHub.
2. In Vercel, click **Add New → Project** and import the repo.
3. Framework preset: **Other** (it's picked automatically — plain
   static HTML, no build command needed).
4. Click **Deploy**.

Every push to `main` will auto-redeploy.

## Structure

```
index.html                          page markup
css/style.css                       all styles
js/script.js                        app logic (routing, state, rendering)
js/backend.js                       Supabase layer (unused in demo mode)
js/config.js                        Supabase URL + anon key
supabase/schema.sql                 database tables, security rules, functions
supabase/functions/admin-users/     edge function for admin-only actions
vercel.json                         serves index.html for every route
```

## Backend setup (Supabase)

1. Create a project at supabase.com.
2. **SQL Editor → New query**, paste all of `supabase/schema.sql`, click **Run**.
3. **Authentication → Providers → Email**: turn **off** "Confirm email".
4. **Authentication → Users → Add user**: create your own admin login
   (email + password, tick *Auto Confirm User*). Then in the SQL Editor run
   (use your email):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
5. Deploy the edge function (it creates customer logins and resets
   passwords — things a browser must never be allowed to do):
   ```
   npm i -g supabase
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy admin-users
   ```
6. Copy **Project Settings → API → Project URL** and the **anon public** key
   into `js/config.js`. (The anon key is meant to be public. Never put the
   `service_role` key in the website.)
7. Push to GitHub; Vercel redeploys automatically.
8. Open `/#/admin-login`, sign in with the admin **email** from step 4, and
   use **Add customer**. Customers who use *Open an account* show up as
   *Pending* for you to approve.

How it fits together: customers sign in with Supabase Auth (their username
becomes `username@users.waypoint-bank.app` behind the scenes). Row level
security means a customer can only ever read their own record, and only
admins can read everyone's. Suspending an account is enforced in the
database too — a suspended customer's saves are refused even if they bypass
the website. If you change `users.waypoint-bank.app`, change it in
`js/config.js`, `supabase/schema.sql` and the edge function together.

Money safety: in Supabase mode a customer's browser can **not** change balances. Transfers, wires, Zelle,
bill pay and check deposits all go through the `do_move` database function, which re-checks the account
status, access code, ownership of the accounts, available funds, fees and limits on the server. `save_my_data`
ignores any balances/transactions sent by the browser. Only admins (balance edits, adjustments) can change
them directly.

Known limits (fine for a portfolio, not for real money): access codes are stored in readable form so admins
can see them; photos are stored inside the database record, so keep them small; mobile check deposits are
credited instantly (capped at $10,000) because there is no real check to verify.

## Demo logins (demo mode only)

| Role | Username | Password | Access / transfer code |
|---|---|---|---|
| Client | `alexmorgan` | `alex2026` | `482915` |
| Client | `jordanlee` | `jordan2026` | `730264` |
| Admin (`#/admin-login`) | `admin` | `waypoint2026` | — |

Client sign-in is two steps: username + password, then the personal access
code the admin set for that customer (shown with their photo and name).
The same code is asked again before any money leaves an account
(transfers, Zelle, bill pay). Admins set/change it, edit profile details and
edit balances from **Admin → customer → Edit**.

## Account status (suspend / hold)

In **Admin → customer → Account status** choose *Active*, *Suspended* or
*On hold* and optionally write the message the customer will see. A
restricted customer sees the suspension page (with the message and the
bank's phone/email) when they log in, and — if they're already signed in —
on their next click or transfer. *Lift suspension* restores access.

Other admin additions: edit the join date ("Customer since"), issue a debit
or credit card (name, expiry, credit limit) and delete cards.

## Mobile

Below 880px the client area switches to an app-style layout: slim header,
bottom tab bar (Home, Accounts, Send, Cards, More), a "More" sheet,
swipeable account cards, list-style transactions and bottom-sheet code
prompts. The public site gets a full-screen menu drawer.
