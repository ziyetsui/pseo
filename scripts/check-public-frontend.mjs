#!/usr/bin/env node
// Local/CI engineering fixture check. This does not consume or publish a CMS snapshot.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const children = new Set();
function start(command, args, options) {
  const child = spawn(command, args, { ...options, detached: process.platform !== 'win32' });
  children.add(child);
  child.once('close', () => children.delete(child));
  return child;
}
function signalChild(child, signal) {
  try {
    if (process.platform === 'win32') child.kill(signal);
    else if (child.pid) process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}
async function stop(child) {
  if (!children.has(child)) return;
  const closed = new Promise(resolve => child.once('close', resolve));
  signalChild(child, 'SIGTERM');
  const timer = setTimeout(() => signalChild(child, 'SIGKILL'), 3000);
  try { await closed; } finally { clearTimeout(timer); }
}
let interrupted = false;
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  process.on(signal, () => {
    if (interrupted) return;
    interrupted = true;
    void Promise.all([...children].map(stop)).finally(() => process.exit(code));
  });
}
function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = start(command, args, { cwd: root, env, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (!interrupted) code === 0 ? resolve() : reject(new Error(`${command} failed (${signal ?? code})`));
    });
  });
}

await run(process.execPath, ['infra/bin/content.mjs', 'validate']);
await run(process.execPath, ['infra/bin/content.mjs', 'build']);
const manifest = JSON.parse(await readFile(path.join(root, 'infra/generated/static/build-manifest.json'), 'utf8'));
const site = JSON.parse(await readFile(path.join(root, 'content/site.json'), 'utf8'));
const reservation = createServer();
await new Promise((resolve, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', resolve); });
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const api = start(path.join(root, 'backend/.venv/bin/python'), ['-m', 'uvicorn', 'pseo.main:app', '--host', '127.0.0.1', '--port', String(port), '--no-access-log'], {
  cwd: root,
  env: { ...process.env, PSEO_REPOSITORY_ROOT: root, PSEO_ENVIRONMENT: 'development', PSEO_PUBLIC_BASE_URL: origin },
  stdio: ['ignore', 'inherit', 'inherit'],
});
let startupError;
api.once('error', error => { startupError = error; });
try {
  let healthy = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (startupError) throw startupError;
    if (api.exitCode !== null) throw new Error(`Local API exited with ${api.exitCode}`);
    try {
      const response = await fetch(`${origin}/healthz`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        const health = await response.json();
        if (health.indexRevision !== manifest.contentRevision) throw new Error('Backend/compiler fixture revision mismatch');
        healthy = true;
        break;
      }
    } catch (error) {
      if (error.message === 'Backend/compiler fixture revision mismatch') throw error;
    }
    await delay(200);
  }
  if (!healthy) throw new Error('Local API did not become ready');
  const env = {
    ...process.env,
    FRONTEND_DATA_MODE: 'public-api',
    FRONTEND_API_URL: origin,
    FRONTEND_CONTRACT_API_URL: origin,
    FRONTEND_EXPECTED_REVISION: manifest.contentRevision,
    FRONTEND_SITE_URL: site.canonicalOrigin,
    FRONTEND_STATIC_DIR: path.join(root, 'infra/generated/static'),
  };
  await run('pnpm', ['--dir', 'frontend', 'exec', 'vitest', 'run', '--config', 'tests/api.integration.config.ts'], env);
  await run('pnpm', ['--dir', 'frontend', 'build'], env);
  await run('pnpm', ['--dir', 'frontend', 'check:static'], env);
  console.log(`PUBLIC FRONTEND ENGINEERING CHAIN PASSED: ${manifest.contentRevision}; repository fixture, not CMS publication`);
} finally {
  await stop(api);
}
