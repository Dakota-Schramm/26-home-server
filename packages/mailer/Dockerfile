FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/mailer/package.json ./packages/mailer/

RUN npm install --workspace=packages/shared --workspace=packages/mailer

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/mailer ./packages/mailer

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/mailer

FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/mailer/dist ./packages/mailer/dist
COPY --from=builder /app/packages/mailer/package.json ./packages/mailer/package.json
COPY --from=builder /app/packages/mailer/node_modules ./packages/mailer/node_modules

EXPOSE 3001
CMD ["node", "packages/mailer/dist/index.js"]
