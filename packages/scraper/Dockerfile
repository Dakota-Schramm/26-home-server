FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

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

FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/scraper/dist ./packages/scraper/dist
COPY --from=builder /app/packages/scraper/package.json ./packages/scraper/package.json
COPY --from=builder /app/packages/scraper/node_modules ./packages/scraper/node_modules

CMD ["node", "packages/scraper/dist/index.js"]
