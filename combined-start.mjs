import { spawn } from 'node:child_process';

const niro = process.env.RUN_NIRO_SERVICE === 'false'
  ? null
  : spawn(process.execPath, ['nirogaverse/server/dist/app.js'], {
      env: { ...process.env, PORT: process.env.NIRO_PORT || '3000' },
      stdio: 'inherit'
    });

const shutdown = signal => {
  if (niro && !niro.killed) niro.kill(signal);
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

await import('./server.mjs');
