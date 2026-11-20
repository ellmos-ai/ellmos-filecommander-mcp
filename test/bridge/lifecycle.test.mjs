import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startHost } from '../../dist/bridge/host.mjs';

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function isAlive(pid) {
  if (!Number.isInteger(pid)) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function harness(t) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'fc-bridge-lifecycle-'));
  const backendEntry = path.join(cwd, 'fixture.cjs');
  const callsFile = path.join(cwd, 'calls.txt');
  const pidsFile = path.join(cwd, 'pids.txt');
  await writeFile(backendEntry, [
    "const fs = require('node:fs');",
    "const readline = require('node:readline');",
    "const callsFile = " + JSON.stringify(callsFile) + ";",
    "fs.appendFileSync(" + JSON.stringify(pidsFile) + ",String(process.pid)+'\\n');",
    "const send = (id, result) => process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,result})+'\\n');",
    "readline.createInterface({input:process.stdin}).on('line', line => {",
    "  const m = JSON.parse(line);",
    "  if(m.method==='initialize') send(m.id,{protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'bridge-lifecycle-fixture',version:'1'}});",
    "  else if(m.method==='tools/list') send(m.id,{tools:[{name:'bridge_test_echo',description:'Test fixture',inputSchema:{type:'object'}}]});",
    "  else if(m.method==='tools/call') { fs.appendFileSync(callsFile,'called\\n'); send(m.id,{content:[{type:'text',text:'fixture result'}]}); }",
    "});",
    ""
  ].join('\n'));
  const host = await startHost({ backendEntry, cwd, port: 0, openBrowser: false });
  const realClose = host.client.close.bind(host.client);
  const realStart = host.client.start.bind(host.client);
  const releases = [];
  const pids = new Set([host.client.status.pid]);
  t.after(async () => {
    for (const release of releases) release();
    // Always restore and directly close the client as well: failure cleanup must
    // also work against an implementation whose cached host.close finished early.
    host.client.start = realStart;
    host.client.close = realClose;
    await host.close();
    await realClose();
    await rm(cwd, { recursive: true, force: true });
  });
  const response = await fetch(host.url + '/api/connect', {
    method: 'POST',
    headers: { Origin: host.url, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: host.token })
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';', 1)[0];
  const { csrfToken } = await response.json();
  const headers = {
    Origin: host.url,
    'Content-Type': 'application/json',
    Cookie: cookie,
    'X-FC-CSRF': csrfToken
  };
  const post = (route, body = {}) => fetch(host.url + route, {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  const postStatus = (route, body = {}) => post(route, body)
    .then(async response => { await response.text(); return response.status; })
    .catch(() => 0); // Shutdown may destroy the HTTP response socket.
  return {
    host, cwd, backendEntry, callsFile, pidsFile, cookie, headers, realClose, realStart, pids, post, postStatus,
    releaseOnCleanup(gate) { releases.push(gate.resolve); },
    async calls() { return await readFile(callsFile, 'utf8').catch(error => {
      if (error.code === 'ENOENT') return '';
      throw error;
    }); }
  };
}

for (const window of ['old close', 'new start']) {
  test('shutdown joins a restart waiting in ' + window, { timeout: 15_000 }, async t => {
    const h = await harness(t);
    const entered = deferred();
    const release = deferred();
    const shutdownClosedBackend = deferred();
    const startFinished = deferred();
    h.releaseOnCleanup(release);
    let closeCalls = 0;
    let startCalls = 0;
    let closed = false;
    let startedAfterClosed = false;
    let didFinishStart = false;
    let closedBeforeStartFinished = false;
    h.host.closed.then(() => {
      closed = true;
      if (window === 'new start' && !didFinishStart) closedBeforeStartFinished = true;
    });

    h.host.client.close = async () => {
      const call = ++closeCalls;
      if (window === 'old close' && call === 1) {
        entered.resolve();
        await release.promise;
      }
      await h.realClose();
      if (call === 2) shutdownClosedBackend.resolve();
    };
    h.host.client.start = async () => {
      startCalls++;
      if (window === 'new start') {
        entered.resolve();
        await release.promise;
      }
      startedAfterClosed ||= closed;
      const result = await h.realStart();
      h.pids.add(h.host.client.status.pid);
      didFinishStart = true;
      startFinished.resolve();
      return result;
    };

    const restartResponse = h.postStatus('/api/restart-backend');
    await entered.promise;
    const stopping = h.host.close();
    await shutdownClosedBackend.promise;
    // Let the close continuation run before releasing the accepted start.
    // All race windows are controlled by gates rather than sleeps.
    await Promise.resolve();
    release.resolve();
    if (window === 'new start') await startFinished.promise;
    await stopping;
    const status = await restartResponse;
    assert.ok(status === 503 || status === 0, 'a stopped restart cannot report success');
    assert.equal(startedAfterClosed, false);
    assert.equal(closedBeforeStartFinished, false,
      'host.closed must not resolve before an accepted backend start has settled');
    if (window === 'old close') assert.equal(startCalls, 0);
    if (window === 'new start') assert.equal(startCalls, 1);
    assert.equal(h.host.client.status.alive, false);
    for (const pid of h.pids) assert.equal(isAlive(pid), false, 'owned backend must exit');
  });
}

async function beginPartialCall(h) {
  const observed = deferred();
  const observe = req => {
    if (req.url === '/api/call' && req.method === 'POST') {
      h.host.server.off('request', observe);
      observed.resolve();
    }
  };
  // The host's request listener was registered first. By the time this listener
  // runs, its initial ready check passed and readJson is waiting for more bytes.
  h.host.server.on('request', observe);
  const payload = JSON.stringify({
    tool: 'bridge_test_echo', arguments: {}, clientRequestId: 'late-json-body'
  });
  let req;
  const response = new Promise((resolve, reject) => {
    req = httpRequest(h.host.url + '/api/call', {
      method: 'POST',
      headers: { ...h.headers, 'Content-Length': Buffer.byteLength(payload) }
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
  // Attach the rejection branch immediately, before a shutdown can close it.
  const settled = response.catch(error => ({ status: 0, error }));
  req.write(payload.slice(0, 1));
  await observed.promise;
  return { finish: () => req.end(payload.slice(1)), destroy: () => req.destroy(), response: settled };
}

test('a call whose JSON body arrives during restart is rejected', { timeout: 15_000 }, async t => {
  const h = await harness(t);
  const entered = deferred();
  const release = deferred();
  h.releaseOnCleanup(release);
  let closeCalls = 0;
  h.host.client.close = async () => {
    if (++closeCalls === 1) {
      entered.resolve();
      await release.promise;
    }
    await h.realClose();
  };

  const partial = await beginPartialCall(h);
  h.releaseOnCleanup({ resolve: partial.destroy });
  const restartResponse = h.postStatus('/api/restart-backend');
  await entered.promise;
  partial.finish();
  const result = await partial.response;
  assert.equal(result.status, 503);
  assert.equal(await h.calls(), '');
  const jobsResponse = await fetch(h.host.url + '/api/jobs', { headers: { Cookie: h.cookie } });
  assert.equal(jobsResponse.status, 200);
  assert.deepEqual((await jobsResponse.json()).jobs, []);

  release.resolve();
  assert.equal(await restartResponse, 200);
});

test('a call begun before restart cannot execute on the replacement backend', { timeout: 15_000 }, async t => {
  const h = await harness(t);
  const partial = await beginPartialCall(h);
  h.releaseOnCleanup({ resolve: partial.destroy });
  const previousPid = h.host.client.status.pid;
  assert.equal(await h.postStatus('/api/restart-backend'), 200);
  assert.notEqual(h.host.client.status.pid, previousPid);
  partial.finish();
  const result = await partial.response;
  assert.equal(result.status, 503);
  assert.equal(await h.calls(), '');
  const jobsResponse = await fetch(h.host.url + '/api/jobs', { headers: { Cookie: h.cookie } });
  assert.deepEqual((await jobsResponse.json()).jobs, []);
});

test('a call whose JSON body arrives after shutdown is never executed', { timeout: 15_000 }, async t => {
  const h = await harness(t);
  const partial = await beginPartialCall(h);
  h.releaseOnCleanup({ resolve: partial.destroy });
  assert.equal(await h.postStatus('/api/shutdown'), 202);
  partial.finish();
  const result = await partial.response;
  assert.ok(result.status === 503 || result.status === 0,
    'a late call must be rejected or disconnected, never accepted');
  await h.host.closed;
  assert.equal(await h.calls(), '');
});

test('two loopback bridge ports keep independent browser cookies', { timeout: 15_000 }, async t => {
  const first = await harness(t);
  const second = await harness(t);
  const firstName = first.cookie.split('=', 1)[0];
  const secondName = second.cookie.split('=', 1)[0];
  assert.notEqual(first.host.port, second.host.port);
  assert.notEqual(firstName, secondName);
  const combined = first.cookie + '; ' + second.cookie;
  for (const h of [first, second]) {
    const response = await fetch(h.host.url + '/api/status', { headers: { Cookie: combined } });
    assert.equal(response.status, 200);
    const state = await response.json();
    assert.equal(state.port, h.host.port);
    assert.equal(state.backend.pid, h.host.client.status.pid);
  }
});

test('an occupied port closes only the backend started by the failed host', { timeout: 15_000 }, async t => {
  const h = await harness(t);
  const firstPid = h.host.client.status.pid;
  let unexpectedHost;
  try {
    await assert.rejects(async () => {
      unexpectedHost = await startHost({
        backendEntry: h.backendEntry, cwd: h.cwd, port: h.host.port, openBrowser: false
      });
    }, error => error.code === 'EADDRINUSE');
  } finally {
    if (unexpectedHost) await unexpectedHost.close();
  }
  const startedPids = (await readFile(h.pidsFile, 'utf8')).trim().split(/\r?\n/).map(Number);
  assert.equal(startedPids.length, 2);
  assert.equal(startedPids[0], firstPid);
  assert.notEqual(startedPids[1], firstPid);
  assert.equal(isAlive(firstPid), true, 'the existing host remains active');
  assert.equal(isAlive(startedPids[1]), false, 'the failed host cleans up its own backend');
  const response = await fetch(h.host.url + '/api/status', { headers: { Cookie: h.cookie } });
  assert.equal(response.status, 200);
});
