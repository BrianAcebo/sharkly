# ---------- build ----------
    FROM node:20-alpine AS build
    WORKDIR /app
    
    COPY package*.json ./
    RUN npm ci
    
    COPY tsconfig.json ./tsconfig.json
    COPY src ./src
    # copy any other API-only code (e.g., ./routes if outside src)
    
    RUN npm run build
    
    # ---------- runtime ----------
    FROM node:20-alpine AS runtime
    WORKDIR /app
    
    ENV NODE_ENV=production
    ENV PORT=3001
    
    COPY package*.json ./
    RUN npm ci --omit=dev
    
    COPY --from=build /app/server-dist ./server-dist
    
    EXPOSE 3001
    CMD ["node", "server-dist/index.js"]
    