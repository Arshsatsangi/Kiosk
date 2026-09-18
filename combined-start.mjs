import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const niroEntry = join(root, 'nirogaverse', 'server', 'dist', 'app.js');

/* Launch the NirogaVerse backend on :3000 only when its build exists AND DATABASE_URL is set.
   Fresh clones or deployments without PostgreSQL still get the full kiosk — the
   AyurVaani tab simply falls back to the built-in offline assessment. */
const hasDb = Boolean(process.env.DATABASE_URL);
const canRunNiro = process.env.RUN_NIRO_SERVICE !== 'false' && existsSync(niroEntry);
const shouldRunNiro = canRunNiro && hasDb;

if (shouldRunNiro) {
  try {
    console.log('[combined-start] Syncing PostgreSQL schema with Prisma...');
    execSync('npx prisma db push --schema=nirogaverse/server/prisma/schema.prisma --skip-generate --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log('[combined-start] ✅ Database schema synced successfully.');
  } catch (err) {
    console.warn('[combined-start] ⚠️ Database sync warning (continuing startup):', err.message);
  }
}

const niro = shouldRunNiro
  ? spawn(process.execPath, ['nirogaverse/server/dist/app.js'], {
      env: { ...process.env, PORT: process.env.NIRO_PORT || '3000' },
      stdio: 'inherit'
    })
  : null;

if (canRunNiro && !hasDb) {
  console.log('[combined-start] ℹ️ DATABASE_URL not set — skipping NirogaVerse DB backend.');
  console.log('[combined-start] MediKiosk will run with built-in zero-dependency offline mode.');
  console.log('[combined-start] To enable database features: add a PostgreSQL DB & DATABASE_URL in Railway.');
} else if (process.env.RUN_NIRO_SERVICE !== 'false' && !existsSync(niroEntry)) {
  console.log('[combined-start] NirogaVerse build not found (nirogaverse/server/dist/app.js).');
  console.log('[combined-start] Kiosk will start without it; AyurVaani uses offline guidance.');
  console.log('[combined-start] To enable the live AI chat:  npm run build');
}

const shutdown = signal => {
  if (niro && !niro.killed) niro.kill(signal);
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

await import('./server.mjs');
