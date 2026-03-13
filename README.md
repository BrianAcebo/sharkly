# Sharkly

SEO and content intelligence platform. This repo contains three self-contained applications, each with its own `package.json`, build, and deployment targets.

## Architecture

```
sharkly/
├── api/              # Express backend → Fly.io
├── ui/
│   ├── app/          # React (Vite) frontend → app.sharkly.co (Vercel)
│   └── marketing/    # Astro marketing site → sharkly.co (Vercel)
├── Makefile          # Local dev and tooling
└── .env              # Single env file (loaded by all apps from root)
```

| Project      | Stack    | Deploy to | Purpose                    |
|-------------|----------|-----------|----------------------------|
| **api**      | Express  | Fly.io    | REST API, webhooks, workers |
| **ui/app**   | React + Vite | Vercel | Main app (dashboard, workspace) |
| **ui/marketing** | Astro | Vercel | Marketing site (landing, blog, pricing) |

There is no root `package.json`. Each app is independent and deployable on its own. Local development uses the Makefile.

## Prerequisites

- Node.js 20+
- Docker (for Supabase)
- [Fly CLI](https://fly.io/docs/hub/reference/install/) (for API deploy)

## Quick start

```bash
make install    # Install deps in api, ui/app, ui/marketing
make dev        # Start API, app, marketing, and ngrok in parallel
```

- App: http://localhost:5173
- Marketing: http://localhost:4321
- API: http://localhost:3000
- Ngrok tunnel (if configured): see terminal output

## Makefile commands

### Development

| Command          | Description                                             |
|------------------|---------------------------------------------------------|
| `make dev`       | Run API, app, marketing, and ngrok in parallel          |
| `make dev-api`   | Run only the API                                        |
| `make dev-app`   | Run only the React app                                  |
| `make dev-marketing` | Run only the Astro marketing site                  |
| `make dev-ngrok` | Run ngrok tunnel for the API                            |
| `make stop`      | Stop dev servers and free ports                         |

### Install

| Command          | Description                                             |
|------------------|---------------------------------------------------------|
| `make install`   | Run `npm install` in api, ui/app, and ui/marketing      |

### Deploy

| Command          | Description                                             |
|------------------|---------------------------------------------------------|
| `make fly-deploy`| Deploy API to Fly.io (run from repo root)               |

### Database (Supabase)

| Command          | Description                                             |
|------------------|---------------------------------------------------------|
| `make db-start`  | Start Supabase Docker stack                             |
| `make db-stop`   | Stop Supabase stack                                     |
| `make db-pull`   | Pull latest Supabase images                             |
| `make db-reset`  | Reset DB (destroy volumes and recreate)                  |
| `make db-logs`   | Tail Supabase logs                                      |

### Lint

| Command          | Description                                             |
|------------------|---------------------------------------------------------|
| `make lint`      | Run ESLint across api, ui/app, and ui/marketing         |

## Environment

Keep a single `.env` at the repo root. The API loads it via `api/src/loadEnv.ts`, and the Vite app uses `envDir` in `ui/app/vite.config.ts` to read from the root. Add no env files under `api/` or `ui/` for local dev.

## Deployment

### API (Fly.io)

From the repo root:

```bash
make fly-deploy
```

The Dockerfile and `fly.toml` live in `api/`. The build context is the repo root.

### App & Marketing (Vercel)

Configure two Vercel projects:

1. **App**: Root Directory = `ui/app`
2. **Marketing**: Root Directory = `ui/marketing`

Each uses its own `package.json` and build scripts.
