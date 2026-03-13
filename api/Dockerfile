# syntax = docker/dockerfile:1
# Build context must be repo root (run: fly deploy --config api/fly.toml from root)
ARG NODE_VERSION=20.18.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

ENV NODE_ENV="production"

FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Copy api
COPY api/package.json api/package-lock.json ./
RUN npm ci --include=dev

COPY api/ ./

RUN npm run build
RUN npm prune --omit=dev

FROM base

COPY --from=build /app /app

WORKDIR /app

EXPOSE 3000
CMD [ "node", "dist/index.js" ]
