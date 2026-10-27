# End-to-end tests (Firebase emulators)

Runs the real site against local Firebase emulators with one test school and an
account for every role (super admin, platform/school assistant, admin, staff,
teacher, parent, guard, distributor). Nothing touches production data.

```bash
# 1. Emulators (uses firestore.rules / storage.rules from the repo)
npx firebase-tools emulators:start --config firebase.e2e.json --project yala-safari-iq --only auth,firestore,storage

# 2. Seed test data (password for every account: Test@12345)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
  GCLOUD_PROJECT=yala-safari-iq npx tsx scripts/e2e/seed-emulator.ts

# 3. Build the site against the emulators and start the server
VITE_USE_FIREBASE_EMULATORS=1 npx vite build && npm run build:server
FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
  FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 GCLOUD_PROJECT=yala-safari-iq \
  NODE_ENV=production PORT=3500 node dist/server.mjs

# 4. Tests
node scripts/e2e/crawl-roles.cjs http://localhost:3500 /tmp/e2e-out   # every role, every tab
node scripts/e2e/functional-tests.mjs http://localhost:3500           # main write flows
```

Do not deploy a build made with `VITE_USE_FIREBASE_EMULATORS=1`.
