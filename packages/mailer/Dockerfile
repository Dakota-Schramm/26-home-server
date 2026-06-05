FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/mailer/package.json ./packages/mailer/

RUN pnpm install --frozen-lockfile --filter=@home-server/shared --filter=@home-server/mailer

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/mailer ./packages/mailer

RUN pnpm --filter=@home-server/shared run build
RUN pnpm --filter=@home-server/mailer run build

FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/mailer/dist ./packages/mailer/dist
COPY --from=builder /app/packages/mailer/package.json ./packages/mailer/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/mailer/node_modules ./packages/mailer/node_modules

EXPOSE 3001
CMD ["node", "packages/mailer/dist/index.js"]
