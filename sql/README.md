# SQL schema and migrations

- **migrations/** — Applied in order. Schema changes only (no `INSERT` of user data, auth tokens, or GSC tokens).
- **schema*.sql**, **copied_schema.sql** — Full schema dumps for reference. **Structure only.** Do not add dumps that contain `INSERT ... VALUES` for `auth.*`, `refresh_tokens`, `gsc_tokens`, or any table that stores OAuth/API tokens.
- **Production data** — Never commit `sql/chunks/prod_data*.sql` or any file with real token or PII data. See [docs/SECRETS.md](../docs/SECRETS.md).
