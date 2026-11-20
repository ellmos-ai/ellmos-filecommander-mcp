import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const entry = fileURLToPath(new URL('../../dist/index.js', import.meta.url));

test('bridge CLI validates options without starting a listener', () => {
  const help = spawnSync(process.execPath, [entry, 'bridge', '--help'], { encoding: 'utf8', timeout: 15000 });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage: ellmos-filecommander bridge/);
  assert.doesNotMatch(help.stdout, /#token=/);
  for (const args of [['--port', '65536'], ['--port', '1.5'], ['--host', '0.0.0.0']]) {
    const invalid = spawnSync(process.execPath, [entry, 'bridge', ...args], { encoding: 'utf8', timeout: 15000 });
    assert.equal(invalid.status, 1, invalid.stderr);
    assert.doesNotMatch(invalid.stdout, /#token=/);
  }
});

test('built CLI starts its own backend from another cwd and shuts down', { timeout: 30_000 }, async t => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'fc bridge cli '));
  const child = spawn(process.execPath, [entry, 'bridge', '--no-open', '--port', '0', '--cwd', cwd], {
    cwd, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false,
    env: { ...process.env, NO_UPDATE_NOTIFIER: '1' },
  });
  let stderr = '';
  let output = '';
  let backendPid;
  let launched;
  let timer;
  const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  const ready = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Bridge startup timed out: ' + stderr)), 15000);
    child.once('error', reject);
    child.once('exit', code => { if (!launched) reject(new Error('Bridge exited before ready: ' + code + ' ' + stderr)); });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+\/#token=[A-Za-z0-9_-]+/);
      if (match && !launched) {
        launched = new URL(match[0]);
        clearTimeout(timer);
        resolve(launched);
      }
    });
  });
  t.after(async () => {
    clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null) {
      // Best-effort cleanup if an assertion fails before the normal HTTP shutdown.
      if (launched) {
        try {
          const response = await fetch(launched.origin + '/api/connect', {
            method: 'POST', headers: { Origin: launched.origin, 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: new URLSearchParams(launched.hash.slice(1)).get('token') }),
          });
          const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
          const { csrfToken } = await response.json();
          await fetch(launched.origin + '/api/shutdown', {
            method: 'POST', headers: { Origin: launched.origin, 'Content-Type': 'application/json', Cookie: cookie, 'X-FC-CSRF': csrfToken }, body: '{}',
          });
        } catch {}
      }
      const kill = setTimeout(() => child.kill(), 5000);
      await exited;
      clearTimeout(kill);
    }
    if (backendPid) {
      try { process.kill(backendPid, 'SIGTERM'); } catch {}
    }
    await rm(cwd, { recursive: true, force: true });
  });
  const url = await ready;
  const response = await fetch(url.origin + '/api/connect', {
    method: 'POST', headers: { Origin: url.origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: new URLSearchParams(url.hash.slice(1)).get('token') }),
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';', 1)[0];
  const { csrfToken } = await response.json();
  const statusResponse = await fetch(url.origin + '/api/status', { headers: { Cookie: cookie } });
  const status = await statusResponse.json();
  backendPid = status.backend.pid;
  assert.equal(statusResponse.status, 200);
  assert.equal(status.cwd, cwd);
  assert.equal(status.backend.toolCount, 50);
  assert.equal(status.backend.version, '1.11.6');
  assert.equal(status.appDir, fileURLToPath(new URL('../../', import.meta.url)).replace(/[\\/]$/, ''));
  assert.notEqual(backendPid, child.pid);
  const stop = await fetch(url.origin + '/api/shutdown', {
    method: 'POST', headers: { Origin: url.origin, 'Content-Type': 'application/json', Cookie: cookie, 'X-FC-CSRF': csrfToken }, body: '{}',
  });
  assert.equal(stop.status, 202);
  assert.deepEqual(await exited, { code: 0, signal: null });
  assert.throws(() => process.kill(backendPid, 0));
  backendPid = undefined;
});
