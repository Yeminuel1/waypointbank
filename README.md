# Waypoint — Online Banking (concept site)

A self-contained, single-file demo of an online banking site: marketing
pages, account opening with a custom CAPTCHA, and a client-side banking
app (dashboard, accounts, transfers, cards) backed by fake data stored
in the browser's `localStorage`.

This is a **concept design, not a real financial institution** — no
backend, no real authentication, no real money movement.

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
