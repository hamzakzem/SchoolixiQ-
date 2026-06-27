import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function parseCliArgs(argv = process.argv.slice(2)) {
  const flags = {
    confirmProduction: false,
    dryRun: false,
    preset: 'smoke',
    testRunId: null,
    skipWrites: true,
    configPath: null,
  };

  for (const arg of argv) {
    if (arg === '--confirm-production') flags.confirmProduction = true;
    else if (arg === '--dry-run') flags.dryRun = true;
    else if (arg.startsWith('--preset=')) flags.preset = arg.split('=')[1];
    else if (arg.startsWith('--testRunId=')) flags.testRunId = arg.split('=')[1];
    else if (arg.startsWith('--test-run-id=')) flags.testRunId = arg.split('=')[1];
    else if (arg === '--allow-writes') flags.skipWrites = false;
    else if (arg.startsWith('--config=')) flags.configPath = arg.split('=')[1];
  }

  return flags;
}

export function loadConfig(configPath) {
  const resolved =
    configPath ||
    process.env.LOAD_TEST_CONFIG ||
    path.join(__dirname, '../config.local.json');

  if (!fs.existsSync(resolved)) {
    const example = path.join(__dirname, '../config.example.json');
    throw new Error(
      `Load-test config not found: ${resolved}\nCopy ${example} to config.local.json and set service account / URLs.`,
    );
  }

  const raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  return {
    environment: raw.environment || 'staging',
    firebaseProjectId: raw.firebaseProjectId || 'yala-safari-iq',
    firestoreDatabaseId: raw.firestoreDatabaseId || '(default)',
    apiKey: raw.apiKey || process.env.FIREBASE_API_KEY || '',
    baseUrl: raw.baseUrl || 'http://localhost:3000',
    backendUrl: raw.backendUrl || raw.baseUrl || 'http://localhost:3000',
    testPassword: raw.testPassword || 'LoadTest!SchoolixIQ2026',
    skipWrites: raw.skipWrites !== false,
    disableFcm: raw.disableFcm !== false,
    budgetUsd: raw.budgetUsd ?? 50,
    serviceAccountPath: raw.serviceAccountPath || null,
    ...raw,
  };
}

export function assertSafeToMutate(config, flags, action = 'mutate') {
  const env = String(config.environment || 'staging').toLowerCase();
  const isProd = env === 'production' || env === 'prod';

  if (isProd && !flags.confirmProduction) {
    console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  BLOCKED: ${action} on PRODUCTION without --confirm-production       ║
║  Prefer a staging Firebase project. If you must use production,  ║
║  tag all data with loadTest:true + testRunId and cleanup after.    ║
╚══════════════════════════════════════════════════════════════════╝`);
    process.exit(1);
  }

  if (!flags.testRunId) {
    console.error('BLOCKED: --testRunId=<id> is required (e.g. prelaunch-20260603-smoke)');
    process.exit(1);
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,63}$/.test(flags.testRunId)) {
    console.error('BLOCKED: testRunId must be 3–64 alphanumeric chars (._- allowed).');
    process.exit(1);
  }
}

export function runsDir(testRunId) {
  return path.join(__dirname, '../.runs', testRunId);
}

export function writeCredentials(testRunId, credentials) {
  const dir = runsDir(testRunId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'credentials.json');
  fs.writeFileSync(file, JSON.stringify(credentials, null, 2));
  return file;
}
