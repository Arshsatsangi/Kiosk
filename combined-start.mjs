import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const niroEntry = join(root, 'nirogaverse', 'server', 'dist', 'app.js');

/* Launch the NirogaVerse backend on :3000 only when its build exists.
   Fresh clones without `npm run build` still get the full kiosk — the
   AyurVaani tab simply falls back to the built-in offline assessment. */
const niro = process.env.RUN_NIRO_SERVICE === 'false' || !existsSync(niroEntry)
  ? null
  : spawn(process.execPath, ['nirogaverse/server/dist/app.js'], {
      env: { ...process.env, PORT: process.env.NIRO_PORT || '3000' },
      stdio: 'inherit'
    });

if (process.env.RUN_NIRO_SERVICE !== 'false' && !niro) {
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
