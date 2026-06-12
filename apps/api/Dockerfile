FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN addgroup -S app && adduser -S app -G app
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
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
RUN echo "shamefully-hoist=true" >> .npmrc
RUN pnpm install --no-frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN echo "shamefully-hoist=true" >> .npmrc
RUN pnpm --filter @nih/database generate
RUN pnpm --filter @nih/config build
RUN pnpm --filter @nih/database build
RUN pnpm --filter @nih/common build
RUN pnpm --filter @nih/queues build
RUN pnpm --filter @nih/feed build
RUN pnpm --filter @nih/llm build
RUN pnpm --filter @nih/auth build
RUN pnpm --filter @nih/ner build
RUN pnpm --filter @nih/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=app:app /app/apps/api/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules

COPY --from=builder --chown=app:app /app/libs/config/package.json ./libs/config/package.json
COPY --from=builder --chown=app:app /app/libs/config/dist ./libs/config/dist

COPY --from=builder --chown=app:app /app/libs/database/package.json ./libs/database/package.json
COPY --from=builder --chown=app:app /app/libs/database/dist ./libs/database/dist
COPY --from=builder --chown=app:app /app/libs/database/prisma ./libs/database/prisma

COPY --from=builder --chown=app:app /app/libs/queues/package.json ./libs/queues/package.json
COPY --from=builder --chown=app:app /app/libs/queues/dist ./libs/queues/dist

COPY --from=builder --chown=app:app /app/libs/auth/package.json ./libs/auth/package.json
COPY --from=builder --chown=app:app /app/libs/auth/dist ./libs/auth/dist

COPY --from=builder --chown=app:app /app/libs/feed/package.json ./libs/feed/package.json
COPY --from=builder --chown=app:app /app/libs/feed/dist ./libs/feed/dist

COPY --from=builder --chown=app:app /app/libs/common/package.json ./libs/common/package.json
COPY --from=builder --chown=app:app /app/libs/common/dist ./libs/common/dist

COPY --from=builder --chown=app:app /app/libs/llm/package.json ./libs/llm/package.json
COPY --from=builder --chown=app:app /app/libs/llm/dist ./libs/llm/dist

COPY --from=builder --chown=app:app /app/libs/ner/package.json ./libs/ner/package.json
COPY --from=builder --chown=app:app /app/libs/ner/dist ./libs/ner/dist

COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown app:app ./docker-entrypoint.sh

USER app
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
