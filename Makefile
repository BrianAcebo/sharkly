.PHONY: dev dev-api dev-app dev-marketing dev-ngrok dev-video dev-video-worker dev-video-all video video-down video-textures stop install install-all fly-deploy db-start db-stop db-pull db-reset db-logs

# Full local stack: API, React app, marketing, ngrok. Redis for blog-to-video is only started by make video.
dev:
	@bash scripts/ensure-redis-dev.sh
	@(cd api && npm run dev) & \
	(cd ui/app && npm run dev) & \
	(cd ui/marketing && npm run dev) & \
	(cd api && npm run ngrok) & \
	wait

build:
	cd api && npm run build && \
	cd ../ui/app && npm run build && \
	cd ../marketing && npm run build

# Individual services
dev-api:
	cd api && npm run dev

dev-app:
	cd ui/app && npm run dev

dev-marketing:
	cd ui/marketing && npm run dev

dev-ngrok:
	cd api && npm run ngrok

# Blog-to-video FastAPI (video-service) — port 8000; set VIDEO_SERVICE_URL=http://localhost:8000 in repo root .env (see docs/blog-to-video-spec.md §16)
# macOS: `brew install ffmpeg` (provides ffmpeg + ffprobe for assemble/mux). Optional: REMOTION_CONCURRENCY=2 in .env to reduce CPU/fan during Remotion renders.
# POSIX sh: cannot append `-m …` after a subshell `(...)` — use if/fi so `-m` is on the same command as the interpreter.
dev-video:
	cd video-service && if [ -x .venv/bin/python ]; then .venv/bin/python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000; else python3 -m uvicorn main:app --reload --host 127.0.0.1 --port 8000; fi

# RQ worker for video-service (Redis must be up — use `make video` or Docker Redis)
# macOS: default RQ fork + Objective-C runtime aborts the work horse ("objc_initializeAfterForkError").
#   We set OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES and use SimpleWorker (no fork) on Darwin only.
dev-video-worker:
	cd video-service && \
	REDIS_URL="$${REDIS_URL:-redis://localhost:6379}" && export REDIS_URL && \
	export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES && \
	RQ_WORKER_OPT="" && \
	if [ "$$(uname -s)" = "Darwin" ]; then RQ_WORKER_OPT="-w rq.worker.SimpleWorker"; fi && \
	if [ -x .venv/bin/rq ]; then .venv/bin/rq worker $$RQ_WORKER_OPT --url "$$REDIS_URL" default; else rq worker $$RQ_WORKER_OPT --url "$$REDIS_URL" default; fi

# Blog-to-video only: Redis (Docker) + FastAPI + RQ worker. Ctrl+C stops the two processes; `make video-down` stops Redis.
# Redis: `make dev` may already have created sharkly-dev-redis via docker run (ensure-redis-dev.sh). Compose cannot
# adopt that container, so `compose up` would error on duplicate name — reuse it with docker start when it exists.
video:
	@if docker inspect sharkly-dev-redis >/dev/null 2>&1; then \
		docker start sharkly-dev-redis >/dev/null; \
	else \
		docker compose -f video-service/docker-compose.redis.yml up -d; \
	fi
	($(MAKE) dev-video) & \
	($(MAKE) dev-video-worker) & \
	wait

video-down:
	-docker compose -f video-service/docker-compose.redis.yml down
	-docker rm -f sharkly-dev-redis 2>/dev/null || true

# Same as `make video` but assumes Redis is already on localhost:6379
dev-video-all:
	($(MAKE) dev-video) & \
	($(MAKE) dev-video-worker) & \
	wait

# Stop dev servers and free ports
stop:
	cd api && npx tsx ../scripts/stop-dev.ts 3000

# Lint all projects (uses ui/app's eslint)
lint:
	cd ui/app && npx eslint ../../api/src ../../ui/app/src ../../ui/marketing/src

# Install deps in each project (one shell so ulimit applies; avoids ENFILE on macOS when limit is low)
install:
	ulimit -n 65536 2>/dev/null || true; \
	cd api && npm install && \
	cd ../ui/app && npm install && \
	cd ../marketing && npm install

# Regenerate Remotion shader textures (optional; PNGs are committed under video-templates/public/textures).
video-textures:
	cd video-service/video-templates && npm run generate-textures

install-video:
	cd video-service && \
	(test -d .venv || python3 -m venv .venv) && \
	.venv/bin/python -m pip install --upgrade pip setuptools wheel && \
	.venv/bin/pip install -r requirements.txt && \
	cd video-templates && npm ci

install-all: install
	
# Supabase / DB
db-start:
	docker compose -f supabase/docker/docker-compose.yml up -d

db-stop:
	docker compose -f supabase/docker/docker-compose.yml down

db-pull:
	docker compose -f supabase/docker/docker-compose.yml pull

db-reset:
	docker compose -f supabase/docker/docker-compose.yml down -v
	docker compose -f supabase/docker/docker-compose.yml up -d

db-logs:
	docker compose -f supabase/docker/docker-compose.yml logs -f kong db auth rest studio
