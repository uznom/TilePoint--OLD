# ==============================================================================
# Stage 1: Build Frontend Assets
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and scripts
COPY . .

# Run pre-build security audit and compile frontend into dist/
RUN npm run test:secrets && npm run build

# ==============================================================================
# Stage 2: Production Server Runtime
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend source code, schema, and static public assets
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/schema.sql ./schema.sql
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public

# Ensure non-root node user owns application directory
RUN chown -R node:node /app

# Switch to non-root user for container security
USER node

EXPOSE 3000

# Production Health Check against internal Express /api/health endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
