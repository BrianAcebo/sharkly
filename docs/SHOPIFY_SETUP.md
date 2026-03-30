# Shopify Companion App Setup (L6)

## Env vars

**Backend:**

```env
SHOPIFY_API_KEY=your_app_api_key      # From Shopify Partner Dashboard → App → API credentials
SHOPIFY_API_SECRET=your_app_secret    # Client secret (also used for webhook HMAC)
SHOPIFY_REDIRECT_URI=                 # OAuth callback URL. Controls which redirect is active.
                                    # Prod: https://sharkly-api.fly.dev/auth/shopify/callback
                                    # Local: http://localhost:3000/auth/shopify/callback
BACKEND_URL=https://sharkly-api.fly.dev   # Express backend (Fly.io). api.sharkly.co is Supabase, NOT the backend.
FRONTEND_URL=https://app.sharkly.co  # For OAuth success/error redirects
MARKETING_URL=https://sharkly.co     # For app-redirect → signup (optional, falls back to FRONTEND_URL)
```

## Migrations

Run in order:

1. `2026-03-11_shopify_site_connection.sql` — adds `shopify_domain`, `shopify_access_token` to sites
2. `2026-03-12_shopify_pending_tokens.sql` — pending tokens for companion app install (15 min TTL)

## Flow

1. **Connect (from Sharkly):** Settings → Integrations → expand Shopify → enter store (e.g. `mystore`) → Connect
2. **OAuth:** Redirects to Shopify, merchant authorizes, callback saves token to site
3. **Publish:** Workspace → "Publish to Shopify" → select blog → Publish

## OAuth callback flow (companion app install)

When a merchant installs from the App Store: after exchanging the code for a token, the callback stores a pending token row in Supabase keyed to the shop domain (15 min TTL), then redirects to `https://app.sharkly.co/auth/shopify?shop={shop}`. The React page at that route handles login/signup and attaches the token on completion.

## Shopify Partner Dashboard — Redirect URLs

Add **both** URLs to "Allowed redirection URL(s)". The active one is controlled by `SHOPIFY_REDIRECT_URI`:

- `https://sharkly-api.fly.dev/auth/shopify/callback`
- `http://localhost:3000/auth/shopify/callback`

## App URL (App Store installs)

The Shopify app has no embedded UI. When a merchant installs from the App Store and opens the app in Shopify Admin, the App URL is loaded.

**Option A — Companion flow (OAuth first):** Set App URL to `https://sharkly-api.fly.dev/auth/shopify/install`. This starts OAuth, stores pending token, redirects to `https://app.sharkly.co/auth/shopify?shop={shop}` for login/signup.

**Option B — Direct signup:** Set App URL to `https://sharkly-api.fly.dev/api/shopify/app-redirect`. Shopify appends `?shop=store.myshopify.com`; the endpoint redirects to `https://sharkly.co/signup?shopify_store=store.myshopify.com` so the merchant can create a Sharkly account and connect from Settings → Integrations.

## Mandatory webhooks (GDPR + App Store compliance)

Shopify’s automated checks require **both**:

1. **Registered HTTPS URLs** for the three [mandatory compliance topics](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance) in the **Partner Dashboard** (same host as your running API — **not** Supabase `api.sharkly.co`).
2. **HMAC verification** using your app’s **client secret** (`SHOPIFY_API_SECRET`). Invalid signature → **401**; valid → **200** quickly.

### Where to register (Partner Dashboard)

1. [Shopify Partners](https://partners.shopify.com) → **Apps** → your app.
2. Open **Versions** → your active app version (or **App setup** / **Configuration**, depending on UI).
3. Find **Mandatory compliance webhooks** (or **Privacy** / **GDPR webhooks**).
4. Enter the **full HTTPS URLs** below (replace the host with your production API if different, e.g. same origin as `SHOPIFY_REDIRECT_URI`).

### Exact URLs (path must match Express routes)

Use your real API base (example: Fly deploy):

| Compliance topic (Shopify) | Full URL (example) |
|----------------------------|--------------------|
| **Customer data request** (`customers/data_request`) | `https://sharkly-api.fly.dev/webhooks/shopify/customers/data_request` |
| **Customer redact** (`customers/redact`) | `https://sharkly-api.fly.dev/webhooks/shopify/customers/redact` |
| **Shop redact** (`shop/redact`) | `https://sharkly-api.fly.dev/webhooks/shopify/shop/redact` |

Optional (recommended, not one of the three mandatory compliance topics):

| Topic | Full URL (example) |
|-------|---------------------|
| `app/uninstalled` | `https://sharkly-api.fly.dev/webhooks/shopify/app-uninstalled` |

### Server behavior

- **Method:** `POST` only, `Content-Type: application/json`, raw body preserved (see `api/src/index.ts` — `express.raw` **before** `express.json()`).
- **Headers:** Verifies `X-Shopify-Hmac-Sha256` with HMAC-SHA256 of the **raw** body and `SHOPIFY_API_SECRET`. Missing/invalid HMAC → **401 Unauthorized** (required by Shopify).
- **Success:** **200** after handling (empty body is fine).

### Common submission failures

- Compliance URLs still point at **localhost**, a tunnel that is down, or **Supabase** instead of the Express API.
- **`SHOPIFY_API_SECRET`** on Fly (or prod) does not match the app’s **Client secret** in the Partner Dashboard (e.g. after rotating the secret).
- Typo in path: URLs must match the table (slashes under `/webhooks/shopify/…`, same shape as topic names).

### `shopify.app.toml` (Shopify CLI apps only)

If you later manage the app with the CLI, subscribe compliance webhooks as in [Shopify’s docs](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance#subscribe-to-compliance-webhooks). This repo’s production app is **Express on Fly**; registration is normally via the Partner Dashboard, not TOML.

## Signup with Shopify store

- **URL:** `https://sharkly.co/signup?shopify_store=store.myshopify.com`
- SignUpForm shows a notice and stores the value in sessionStorage. After signup, user can connect the store from Settings → Integrations.
