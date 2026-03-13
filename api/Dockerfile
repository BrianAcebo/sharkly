# syntax = docker/dockerfile:1
# Build context: api/ (set Root Directory to "api" in Fly dashboard for GitHub deploys)
ARG NODE_VERSION=20.18.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

ENV NODE_ENV="production"

FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .

RUN npm run build
RUN npm prune --omit=dev

FROM base

COPY --from=build /app /app

WORKDIR /app

EXPOSE 3000
CMD [ "node", "dist/index.js" ]
