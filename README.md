# Waypoint — Online Banking

A self-contained, single-file demo of an online banking site: marketing
pages, account opening with a custom CAPTCHA, and a client-side banking
app (dashboard, accounts, transfers, cards) backed by fake data stored
in the browser's `localStorage`.

There is no backend: all data lives in the browser's `localStorage`, so
changes made in the admin panel only show up in the same browser.

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
index.html    page markup
css/style.css all styles
js/script.js  all app logic (routing, state, rendering)
vercel.json   serves index.html for every route
```

## Demo logins

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
