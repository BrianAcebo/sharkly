.PHONY: dev dev-api dev-app dev-marketing dev-ngrok stop install install-all fly-deploy db-start db-stop db-pull db-reset db-logs

# One command to run everything locally (API, app, marketing, ngrok)
dev:
	@(cd api && npm run dev) & \
	(cd ui/app && npm run dev) & \
	(cd ui/marketing && npm run dev) & \
	(cd api && npm run ngrok) & \
	wait

# Individual services
dev-api:
	cd api && npm run dev

dev-app:
	cd ui/app && npm run dev

dev-marketing:
	cd ui/marketing && npm run dev

dev-ngrok:
	cd api && npm run ngrok

# Stop dev servers and free ports
stop:
	cd api && npx tsx ../scripts/stop-dev.ts 3000

# Lint all projects (uses ui/app's eslint)
lint:
	cd ui/app && npx eslint ../../api/src ../../ui/app/src ../../ui/marketing/src

# Install deps in each project
install:
	cd api && npm install
	cd ui/app && npm install
	cd ui/marketing && npm install

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
