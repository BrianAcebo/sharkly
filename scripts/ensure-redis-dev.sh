#!/usr/bin/env bash
# Best-effort: detect Redis on localhost:6379 (used by blog-to-video RQ when you run the video stack).
# Does NOT start Docker or redis-server — those are only for `make video` (see Makefile).
# Exits 0 always.

set -u

PORT="${REDIS_DEV_PORT:-6379}"
URL="redis://127.0.0.1:${PORT}"

redis_up() {
	if command -v redis-cli >/dev/null 2>&1; then
		redis-cli -u "${URL}" ping >/dev/null 2>&1
		return $?
	fi
	if command -v nc >/dev/null 2>&1; then
		nc -z 127.0.0.1 "${PORT}" >/dev/null 2>&1
		return $?
	fi
	# Bash /dev/tcp (not POSIX sh)
	if exec 3<>/dev/tcp/127.0.0.1/"${PORT}" 2>/dev/null; then
		exec 3<&-
		exec 3>&-
		return 0
	fi
	return 1
}

if redis_up; then
	exit 0
fi

echo "[dev] Nothing listening on port ${PORT} (Redis). Blog-to-video jobs need Redis — run \`make video\` to start it, or: brew install redis && brew services start redis" >&2
exit 0
