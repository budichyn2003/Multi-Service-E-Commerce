# --- Build stage -------------------------------------------------------------
FROM node:22-alpine AS build
# Slow-network resilience: raise npm timeouts/retries (fetch defaults are tight).
ENV NPM_CONFIG_FETCH_RETRIES=10 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=600000
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts
COPY . .
RUN npm run build

# --- Runtime stage -----------------------------------------------------------
FROM node:22-alpine
RUN adduser -D -u 10001 appuser
USER appuser
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
