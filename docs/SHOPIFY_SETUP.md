# Shopify Companion App Setup (L6)

## Env vars (backend)

```env
SHOPIFY_API_KEY=your_app_api_key      # From Shopify Partner Dashboard → App → API credentials
SHOPIFY_API_SECRET=your_app_secret    # Client secret
BACKEND_URL=https://api.sharkly.co    # For OAuth redirect_uri
FRONTEND_URL=https://app.sharkly.co   # For OAuth success/error redirects
```

## Migrations

Run in order:

1. `2026-03-11_shopify_site_connection.sql` — adds `shopify_domain`, `shopify_access_token` to sites

## Flow

1. **Connect (from Sharkly):** Settings → Integrations → expand Shopify → enter store (e.g. `mystore`) → Connect
2. **OAuth:** Redirects to Shopify, merchant authorizes, callback saves token to site
3. **Publish:** Workspace → "Publish to Shopify" → select blog → Publish

## Remaining (embedded app for App Store)

- Shopify App Bridge embedded UI at `/admin/apps/sharkly`
- Connection status, cluster summary, publish queue
- "Open Sharkly Dashboard" link
