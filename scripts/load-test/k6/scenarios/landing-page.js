import { fetchPage } from '../lib/http-check.js';
import { firestoreGet } from '../lib/firestore.js';
import { getConfig } from '../lib/config.js';

export function runLandingPage(ctx) {
  const config = getConfig();

  fetchPage(config.baseUrl, '/', 'landing_home');

  // Public system config read (footer partners) — no auth
  if (ctx.token) {
    firestoreGet(config.projectId, ctx.token, 'system/config', { name: 'landing_config' });
  }
}
