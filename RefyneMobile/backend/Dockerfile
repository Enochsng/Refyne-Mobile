# Refyne backend — Node.js API (Stripe, Supabase, Express). No DB container: Supabase is cloud-hosted.
#
# Local image:
#   cd RefyneMobile/backend && docker build -t refyne-backend .
# From monorepo root:
#   docker build -f RefyneMobile/backend/Dockerfile -t refyne-backend RefyneMobile/backend
# Run with env file:
#   cp .env.example .env   # then fill secrets
#   docker compose up --build

FROM node:20-alpine AS base
WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Application code
COPY . .

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs \
  && chown -R nodejs:nodejs /app
USER nodejs

ENV NODE_ENV=production
EXPOSE 3001

# No wget in slim image — use node for healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
