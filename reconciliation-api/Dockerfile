# Build context is the monorepo root because reconciliation-api depends on the
# reconciliation-engine workspace package.
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY sp-api-service/package.json ./sp-api-service/
COPY reconciliation-engine/package.json ./reconciliation-engine/
COPY reconciliation-api/package.json ./reconciliation-api/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile --filter "reconciliation-api..."
COPY reconciliation-engine ./reconciliation-engine
COPY reconciliation-api ./reconciliation-api
RUN pnpm --filter reconciliation-engine build \
  && pnpm --filter reconciliation-api build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
WORKDIR /app/reconciliation-api
EXPOSE 4000
CMD ["node", "dist/index.js"]
