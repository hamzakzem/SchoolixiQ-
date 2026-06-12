# Cloud Run backend-only image — no Capacitor/mobile frontend dependencies.
FROM node:22-slim AS build

WORKDIR /src
COPY server.ts firebase-applet-config.json ./
COPY backend/package.json backend/package-lock.json ./backend/
COPY backend/schoolPermanentDelete.mjs backend/roleHierarchy.ts ./backend/

WORKDIR /src/backend
RUN npm ci
RUN npm run build

FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /src/backend/server.mjs ./server.mjs
COPY firebase-applet-config.json ./

EXPOSE 8080
CMD ["node", "server.mjs"]
