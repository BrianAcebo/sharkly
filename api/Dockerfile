# syntax = docker/dockerfile:1
# Build context: api/ (set Root Directory to "api" in Fly dashboard for GitHub deploys)
ARG NODE_VERSION=20.18.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

ENV NODE_ENV="production"

# Install Chromium and its dependencies in the base image so it's available
# at runtime (Puppeteer needs it in the final container, not just during build).
# --no-install-recommends keeps the layer as small as possible.
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
        chromium \
        fonts-liberation \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libcairo2 \
        libcups2 \
        libdbus-1-3 \
        libdrm2 \
        libgbm1 \
        libglib2.0-0 \
        libnss3 \
        libpango-1.0-0 \
        libx11-6 \
        libxcb1 \
        libxcomposite1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxrandr2 \
        libxshmfence1 \
        libxtst6 \
        xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use the system Chromium instead of downloading its own.
# This avoids a ~300MB Chrome download during npm install.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 \
    && rm -rf /var/lib/apt/lists/*

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