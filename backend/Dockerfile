# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm ci
COPY prisma ./prisma
COPY prisma.config.ts ./

ARG DATABASE_URL=postgresql://x:x@localhost:5432/x
RUN DATABASE_URL="$DATABASE_URL" npx prisma generate
ENV NODE_ENV=development

# ── builder ───────────────────────────────────────────────────────────────────
FROM development AS builder
COPY . .
RUN npm run build

# ── production ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app
COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
ENV NODE_ENV=production
USER node
