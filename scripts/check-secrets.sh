#!/usr/bin/env bash
# Fail if tracked files contain known secret patterns. Run in CI or before push.
# Usage: ./scripts/check-secrets.sh

set -e
PATTERNS=(
  'GOCSPX-[a-zA-Z0-9_-]+'   # Google OAuth client secret
  'sk_live_[a-zA-Z0-9]+'    # Stripe live secret key
  'whsec_[a-zA-Z0-9]+'      # Stripe webhook secret
)
FOUND=0
for pat in "${PATTERNS[@]}"; do
  if git grep -E -n "$pat" -- ':!.env' ':!*.env' ':!docs/SECRETS.md' ':!scripts/check-secrets.sh' ':!supabase/docker/docker-compose.yml' 2>/dev/null; then
    FOUND=1
  fi
done
if [ "$FOUND" -eq 1 ]; then
  echo "ERROR: Possible secret detected in tracked files. Remove it and rotate the credential. See docs/SECRETS.md"
  exit 1
fi
echo "check-secrets: no known patterns in tracked files"
