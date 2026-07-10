# Dockerfile
# Multi-stage production build for @wedding/api in the monorepo
# Used for deployment on Fly.io

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Step 1: Install all dependencies (including devDependencies for building)
# --ignore-scripts prevents the postinstall prisma generate script from running
# before all source files are copied.
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/realtime/package.json ./packages/realtime/
RUN npm ci --ignore-scripts

# Step 2: Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Build the backend API and all its dependency packages using turborepo
RUN npx turbo build --filter=@wedding/api...

# Step 3: Production runner image
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000

# Copy built artifacts and dependencies
COPY --from=builder /app ./

EXPOSE 4000

CMD ["node", "packages/api/dist/index.js"]
