# -----------------------------------
# STAGE 1: BUILDER
# -----------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# 🔴 THE FIX: Catch ALL necessary Next.js variables before building
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID

RUN npm run build

# -----------------------------------
# STAGE 2: RUNNER (Production)
# -----------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

# Next.js standalone magic (only brings what's strictly necessary)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Standalone mode creates a clean node server.js instead of 'npm start' overhead
CMD ["node", "server.js"]