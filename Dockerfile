# Cloud Run backend — official build path (use: gcloud run deploy --source .)
# Requires Dockerfile at repo root; Cloud Build uses this image, not Buildpacks.
FROM node:22-slim AS build

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Entry + shared modules (canonical sources live at repo root)
COPY server.ts notificationPushDispatch.ts firebase-applet-config.json ./

# Backend-local modules (delete helpers, role hierarchy, messaging cleanup)
COPY backend/schoolPermanentDelete.mjs backend/userPermanentDelete.mjs backend/schoolMessageCleanup.mjs backend/userConversationPurge.mjs backend/messagingAccess.mjs backend/distributorCommissions.mjs backend/distributorApproval.mjs backend/roleHierarchy.ts ./

RUN npm run build

FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/backend/server.mjs ./server.mjs
COPY --from=build /app/backend/firebase-applet-config.json ./firebase-applet-config.json

EXPOSE 8080
CMD ["node", "server.mjs"]
