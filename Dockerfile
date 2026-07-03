# Packages the app into one lean, runnable image. This is essentially what gets
# deployed later, so it is built properly: a multi-stage build that ships only
# production dependencies and the compiled output, run as a non-root user.

# --- build stage: compile TypeScript to dist/ ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install all deps (incl. dev) against the lockfile for a reproducible build.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- runtime stage: only what's needed to run ---
FROM node:22-alpine AS runtime
# Default to production; Compose overrides this to `local` for the local mirror.
ENV NODE_ENV=production
WORKDIR /app

# Production dependencies only.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled app and the runtime config files (the local config is harmless; in
# production NODE_ENV=production reads from GCP, not these files).
COPY --from=builder /app/dist ./dist
COPY config ./config

# Run as the unprivileged built-in `node` user, not root.
USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
