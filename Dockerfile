# syntax=docker/dockerfile:1

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 avance

COPY --chown=avance:nodejs package.json tsconfig.json ./
COPY --chown=avance:nodejs prisma ./prisma
COPY --chown=avance:nodejs src ./src

USER avance

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/v1/tenants || exit 1

CMD ["node", "--experimental-strip-types", "src/server/standalone-server.mjs"]
