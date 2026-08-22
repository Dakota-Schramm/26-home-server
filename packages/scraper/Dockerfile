FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/scraper/package.json ./packages/scraper/

RUN pnpm install --frozen-lockfile --filter=@home-server/shared --filter=@home-server/scraper

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/scraper ./packages/scraper

RUN pnpm --filter=@home-server/shared run build
RUN pnpm --filter=@home-server/scraper run build

FROM node:22-bookworm-slim
WORKDIR /app

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/scraper/dist ./packages/scraper/dist
COPY --from=builder /app/packages/scraper/package.json ./packages/scraper/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/scraper/node_modules ./packages/scraper/node_modules

RUN packages/scraper/node_modules/.bin/playwright install --with-deps chromium

CMD ["node", "packages/scraper/dist/index.js"]
