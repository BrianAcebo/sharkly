# Secrets and sensitive data

**Never commit secrets.** This repo must not contain:

- Google OAuth client secrets (`GOOGLE_CLIENT_SECRET`, any `GOCSPX-*` value)
- Supabase service role key (only anon key may be in client env for public usage)
- Stripe secret keys, webhook secrets
- Shopify API secret
- Ngrok or other API tokens
- Any `.env` or `.env.*` file with real values

## If you pulled code/data from another database or repo

1. **Assume secrets were exposed.** Rotate every credential that might have been in the source:
   - [Google Cloud Console](https://console.cloud.google.com/apis/credentials): create a new OAuth 2.0 client secret, revoke the old one.
   - Supabase: Dashboard → Project Settings → API → rotate `service_role` if it was ever in the other project/env.
   - Stripe: create new secret key, revoke the old one.
   - Shopify: regenerate API secret in Partner Dashboard.
   - Ngrok: regenerate authtoken at dashboard.ngrok.com.
2. **Keep secrets only in `.env`** (and ensure `.env` is in `.gitignore`). Use `.env.example` with placeholders for documentation, never real values.
3. **SQL and Supabase:** Commit **schema only** (CREATE TABLE, migrations). Never commit:
   - `INSERT INTO auth.*` or any table that stores `refresh_token`, `provider_access_token`, `encrypted_refresh_token`, etc.
   - Dumps from production or staging that contain token columns with data.

## What is safe in the repo

- `sql/migrations/` — schema changes only (no INSERT of user/auth/gsc token data).
- `sql/schema*.sql`, `sql/copied_schema.sql` — **structure only** (column names like `provider_refresh_token` are definitions, not values). Do not add files that contain `INSERT ... VALUES (...)` for auth or `gsc_tokens` tables.
- `supabase/docker/` — config only; `supabase/docker/volumes/` is gitignored (real DB data stays local).

## Check before pushing

```bash
# Fail if any tracked file contains a Google OAuth secret pattern
git grep -n 'GOCSPX-' -- '*.sql' '*.ts' '*.tsx' '*.json' '*.yml' '*.yaml' '*.md' 2>/dev/null && echo "LEAK: remove secret" && exit 1 || true
```

If you find a secret in history, rotate the credential and consider [removing it from git history](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
