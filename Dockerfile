# 21K School Dronacharya: one Node service (web app, API, room sockets and the media server).
# Runs on the school's own server with docker-compose.yml (Postgres, HTTPS proxy, optional AI).
FROM node:22-bookworm-slim AS build
WORKDIR /app
# The media server (mediasoup) builds a small native worker if no prebuilt one fits this machine
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip build-essential && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build && npm prune --omit=dev --legacy-peer-deps

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
# Production dependencies (with the media worker already built) from the build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json package-lock.json server.ts tsconfig.json ./
COPY src ./src
COPY docs ./docs
COPY public ./public
# Uploads, recordings and (without DATABASE_URL) the embedded database: mount a volume here
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
# Media: one UDP + TCP port per worker, from MEDIA_PORT (default 40000)
EXPOSE 40000-40003/udp 40000-40003/tcp
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "server.ts"]
