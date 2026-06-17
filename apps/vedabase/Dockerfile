FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/vedabase/package.json ./apps/vedabase/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json
COPY packages/domain-types/package.json ./packages/domain-types/package.json
COPY packages/i18n/package.json ./packages/i18n/package.json

RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN corepack enable
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/vedabase ./apps/vedabase
COPY packages ./packages

RUN pnpm --dir apps/vedabase run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/vedabase/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/vedabase/.next/static ./apps/vedabase/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/vedabase/public ./apps/vedabase/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/vedabase/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/vedabase/server.js"]
