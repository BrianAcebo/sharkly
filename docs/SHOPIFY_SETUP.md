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

## Mandatory webhooks (GDPR + uninstall)

Register these in Shopify Partner Dashboard (or via API). **Base URL:** `https://sharkly-api.fly.dev`.

| Topic | URL | Purpose |
|-------|-----|---------|
| `customers/redact` | `POST /webhooks/shopify/customers-redact` | Customer requested data deletion. Sharkly stores no customer data — respond 200. |
| `shop/redact` | `POST /webhooks/shopify/shop-redact` | 48h after uninstall. Clears `shopify_domain` and `shopify_access_token` for that shop; site and content preserved. |
| `customers/data_request` | `POST /webhooks/shopify/customers-data-request` | Customer requested their data. We store no customer PII — respond 200. |
| `app/uninstalled` | `POST /webhooks/shopify/app-uninstalled` | App uninstalled. Same as shop/redact: clear tokens for that shop. |

All webhooks verify `X-Shopify-Hmac-SHA256` using `SHOPIFY_API_SECRET` and respond 200 after processing.

## Signup with Shopify store

- **URL:** `https://sharkly.co/signup?shopify_store=store.myshopify.com`
- SignUpForm shows a notice and stores the value in sessionStorage. After signup, user can connect the store from Settings → Integrations.
