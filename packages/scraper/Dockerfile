FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/scraper/package.json ./packages/scraper/

RUN npm install --workspace=packages/shared --workspace=packages/scraper

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/scraper ./packages/scraper

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/scraper

FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/scraper/dist ./packages/scraper/dist
COPY --from=builder /app/packages/scraper/package.json ./packages/scraper/package.json
COPY --from=builder /app/packages/scraper/node_modules ./packages/scraper/node_modules

CMD ["node", "packages/scraper/dist/index.js"]
