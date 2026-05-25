FROM node:20-alpine AS base
RUN addgroup -S app && adduser -S app -G app
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/
COPY libs/config/package.json ./libs/config/
COPY libs/database/package.json ./libs/database/
COPY libs/queues/package.json ./libs/queues/
COPY libs/llm/package.json ./libs/llm/
COPY libs/feed/package.json ./libs/feed/
COPY libs/ner/package.json ./libs/ner/
COPY libs/auth/package.json ./libs/auth/
COPY libs/common/package.json ./libs/common/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @nih/database generate
RUN pnpm --filter @nih/worker build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=app:app /app/apps/worker/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/libs/database/prisma ./libs/database/prisma

USER app
CMD ["node", "dist/main.js"]
