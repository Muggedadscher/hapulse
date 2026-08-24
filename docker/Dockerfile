# Stage 1: Build
#
# Pinned to BUILDPLATFORM so the npm build always runs natively on the builder's
# own architecture. The output is a static site — HTML, CSS and JS with no
# native binaries — so it is identical whatever platform produced it, and only
# the nginx stage below needs to be built per target architecture. Without this,
# a multi-arch build would run `npm ci && npm run build` under QEMU emulation
# for every non-native target, turning a one-minute build into fifteen.
FROM --platform=$BUILDPLATFORM node:24-alpine AS builder

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY apps/dashboard/package.json ./apps/dashboard/

RUN npm ci

# Copy source
COPY . .

RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=builder /app/apps/dashboard/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
