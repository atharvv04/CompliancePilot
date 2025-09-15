# syntax=docker/dockerfile:1.6

FROM node:20-bullseye-slim AS deps
WORKDIR /app

# (Optional) If any package might download big binaries at install time (e.g. puppeteer)
# speed things up by skipping downloads in Docker builds:
ENV PUPPETEER_SKIP_DOWNLOAD=1 \
    npm_config_fund=false \
    npm_config_audit=false

COPY package*.json ./
# Cache npm’s tarball cache across builds so "npm ci" gets quicker over time
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:20-bullseye-slim AS build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=1 \
    npm_config_fund=false \
    npm_config_audit=false

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ✂️ Runtime image: only what you need to run
FROM node:20-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy compiled code and only the files needed at runtime
COPY --from=build /app/dist ./dist
COPY package*.json ./

# Install prod deps only, with cache
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# (Optional) Drop privileges
USER node

EXPOSE 3001
CMD ["node", "dist/index.js"]
