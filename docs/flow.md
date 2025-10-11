# 10dlccheck - Code Flow

This document maps how the key files and endpoints connect in the repository. Use it as a quick reference while navigating the code.

## High-level summary

- Frontend site: `index.html` + `app.js` — primary UI where users paste SMS text and run checks.
- Compliance rules: `compliance/rules.js` — client-side rules loaded by `app.js`; also edited via admin UI.
- Admin UI: `admin/admin-rules.html` + `api/sbg-rules.js` — view and edit rules and lenders (in-memory store, protected by `RULES_ADMIN_KEY`).
- Server API endpoints in `api/`:
  - `api/check.js` — (server-side analyzer) accepts POST text and returns issues/tips. Used by the extension or other clients.
  - `api/global-count.js` — GET/POST for site-wide count backed by Upstash KV (if configured). Frontend fetches GET and POST to increment.
  - `api/log.js` — POST error logger (optional Slack webhook).
  - `api/sbg-rules.js` — admin GET/PUT for rules and lenders.

## File relationships (flow chart)

```mermaid
flowchart TD
  subgraph Frontend
    A[index.html]
    B[app.js]
    C[compliance/rules.js]
  end

  subgraph Admin
    D[admin/admin-rules.html]
    E[api/sbg-rules.js]
  end

  subgraph API
    F[api/check.js]
    G[api/global-count.js]
    H[api/log.js]
  end

  A --> B
  B --> C
  B -->|POST /api/global-count (increment)| G
  B -->|GET /api/global-count| G
  B -->|POST to worker| I[Cloudflare worker suggest endpoint]
  D --> E
  E --> C
  F -->|optional Upstash| J[Upstash Redis]
  G -->|optional KV| K[Upstash KV]
  H -->|optional Slack| L[Slack webhook]

  click C "./compliance/rules.js" "Open rules.js"
  click E "./api/sbg-rules.js" "Open sbg-rules.js"
  click F "./api/check.js" "Open check.js"
```

Notes:
- The frontend (`app.js`) first attempts to `fetch('/compliance/rules.js')` and `eval()` it to set `window.COMPLIANCE_RULES`. If that fails it falls back to `complianceRulesFallback` inside `app.js`.
- The admin UI (`admin/admin-rules.html`) reads/writes the admin in-memory store via `GET/PUT /api/sbg-rules`. The PUT requires the `RULES_ADMIN_KEY` environment variable to match the `X-Admin-Key` request header.
- The `api/check.js` route performs a lightweight server-side analysis and optionally increments a counter in Upstash Redis via environment variables `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- `api/global-count.js` is the persistent counter used by the main site UI. If KV envs are missing it responds with `total: null` so the frontend uses its local estimate.

## Quick walkthrough

1. User opens `index.html` which loads `app.js`.
2. `app.js` loads `compliance/rules.js` from `/compliance/rules.js` and sets `RULES`.
3. User pastes a message and clicks "Check Compliance". `app.js` runs `performComplianceCheck()` (local rules) and renders with `displayResults()`.
4. `app.js` calls `getSuggestions()` (Cloudflare worker) to request a cleaned suggestion, and `POST /api/global-count` to increment the site counter.
5. Site admin can visit `admin/admin-rules.html` to edit rules; that page uses `GET` and `PUT` to `/api/sbg-rules` which stores edits in-memory (serverless lifetime).
6. `api/check.js` and `api/log.js` provide server-side analysis and logging for other clients (extension, integrations).

## Where to look next

- To trace UI rendering: `app.js` -> `displayResults()` -> DOM elements in `index.html`.
- To modify rules: edit `compliance/rules.js` or use `admin/admin-rules.html` which writes to `api/sbg-rules.js` in-memory store.
- To hook persistent counters: configure `KV_REST_API_URL` and `KV_REST_API_TOKEN` in environment for `api/global-count.js`.

---

If you want, I can also:
- Generate a PNG/SVG of the Mermaid diagram and add it to the repo.
- Produce a more detailed sequence diagram for the extension flows (pill vs right-click).
- Create a small README section that documents local development steps to run/test the API handlers.
