import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { get as httpGet } from 'node:http';
import { startHost } from '../../dist/bridge/host.mjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const textOf = result => (result?.content ?? []).filter(item => item.type === 'text').map(item => item.text).join('\n');


function isAlive(pid) {
  if (!Number.isInteger(pid)) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function shellQuote(value) {
  if (process.platform === 'win32') return '"' + value.replace(/"/g, '""') + '"';
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

test('browser bridge: authorization and real FileCommander execution', { timeout: 60000 }, async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'filecommander bridge test '));
  let host;
  let cookie;
  let csrfToken;
  let sessionId;
  let sessionPid;
  let backendPid;
  const backendEntry = fileURLToPath(new URL('../../dist/index.js', import.meta.url));

  async function request(route, { method = 'GET', data, authenticated = true, headers = {} } = {}) {
    return fetch(host.url + route, {
      method,
      headers: {
        ...(authenticated && cookie ? { Cookie: cookie } : {}),
        ...(method !== 'GET' ? { Origin: host.url, 'Content-Type': 'application/json', ...(csrfToken ? { 'X-FC-CSRF': csrfToken } : {}) } : {}),
        ...headers
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) })
    });
  }

  async function submit(tool, args, clientRequestId) {
    const response = await request('/api/call', { method: 'POST', data: { tool, arguments: args, ...(clientRequestId ? { clientRequestId } : {}) } });
    const body = await response.json();
    assert.equal(response.status, 202, JSON.stringify(body));
    assert.ok(body.job?.id, 'submission must return an addressable job');
    return body.job;
  }

  async function waitJob(id, timeout = 15000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const response = await request('/api/jobs/' + encodeURIComponent(id));
      const { job } = await response.json();
      assert.equal(response.status, 200);
      if (['succeeded', 'failed'].includes(job.status)) return job;
      await sleep(25);
    }
    throw new Error('Job did not finish: ' + id);
  }

  async function call(tool, args) {
    const job = await waitJob((await submit(tool, args)).id);
    assert.ok(job.result, JSON.stringify(job));
    return job.result;
  }

  async function readUntil(marker) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const result = await call('fc_read_output', { session_id: sessionId, clear: false });
      const text = textOf(result);
      if (text.includes(marker)) return text;
      await sleep(40);
    }
    throw new Error('Session did not emit ' + marker);
  }

  try {
    host = await startHost({ backendEntry, cwd: temp, port: 0, openBrowser: false, dataDir: temp });
    assert.match(host.url, /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.equal(host.server.address().address, '127.0.0.1');

    await t.test('unauthenticated and foreign-origin clients cannot execute tools', async () => {
      for (const route of ['/api/status', '/api/tools', '/api/jobs']) {
        const response = await request(route, { authenticated: false });
        assert.ok([401, 403].includes(response.status), route + ' must require a session');
      }
      const unauthenticatedCall = await request('/api/call', { method: 'POST', data: { tool: 'fc_list_sessions', arguments: {} }, authenticated: false });
      assert.ok([401, 403].includes(unauthenticatedCall.status));
      const wrongToken = await request('/api/connect', { method: 'POST', authenticated: false, data: { token: 'incorrect-capability' } });
      assert.ok([401, 403].includes(wrongToken.status));
      const foreignConnect = await request('/api/connect', { method: 'POST', authenticated: false, data: { token: host.token }, headers: { Origin: 'https://attacker.invalid' } });
      assert.equal(foreignConnect.status, 403);
      const connect = await request('/api/connect', { method: 'POST', authenticated: false, data: { token: host.token } });
      const body = await connect.json();
      assert.equal(connect.status, 200, JSON.stringify(body));
      const setCookie = connect.headers.get('set-cookie');
      assert.match(setCookie, /HttpOnly/i);
      assert.match(setCookie, /SameSite=Strict/i);
      cookie = setCookie.split(';', 1)[0];
      csrfToken = body.csrfToken;
      assert.ok(csrfToken);

      // fetch owns the Host header; use the raw HTTP client for the rebinding probe.
      const wrongHostStatus = await new Promise((resolve, reject) => {
        const request = httpGet(host.url + '/api/status', { headers: { Host: 'attacker.invalid', Cookie: cookie } }, response => {
          response.resume();
          resolve(response.statusCode);
        });
        request.once('error', reject);
      });
      assert.equal(wrongHostStatus, 403);
      const foreignRead = await request('/api/status', { headers: { Origin: 'https://attacker.invalid' } });
      assert.equal(foreignRead.status, 403);
      const crossSiteRead = await request('/api/status', { headers: { 'Sec-Fetch-Site': 'cross-site' } });
      assert.equal(crossSiteRead.status, 403);
      const wrongCsrf = await request('/api/call', { method: 'POST', data: { tool: 'fc_list_sessions', arguments: {} }, headers: { 'X-FC-CSRF': 'wrong' } });
      assert.equal(wrongCsrf.status, 403);
      const noOrigin = await fetch(host.url + '/api/call', { method: 'POST', headers: { Cookie: cookie, 'X-FC-CSRF': csrfToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ tool: 'fc_list_sessions', arguments: {} }) });
      assert.equal(noOrigin.status, 403);
    });

    await t.test('real tools retain schemas and annotations', async () => {
      const response = await request('/api/tools');
      const { tools } = await response.json();
      assert.equal(response.status, 200);
      assert.equal(tools.length, 50);
      const read = tools.find(tool => tool.name === 'fc_read_file');
      assert.ok(read.inputSchema.properties.path);
      assert.equal(read.annotations.readOnlyHint, true);
      const status = await (await request('/api/status')).json();
      backendPid = status.backend?.pid;
      assert.equal(status.backend?.version, '1.11.6');
      assert.ok(Number.isInteger(backendPid));
    });

    const fixture = path.join(temp, 'roundtrip.txt');
    const sample = 'FileCommander HTTP roundtrip: äöü ß 日本語\n';
    await t.test('read and write through actual FileCommander modify only a temporary fixture', async () => {
      const write = await call('fc_write_file', { path: fixture, content: sample, append: false });
      assert.notEqual(write.isError, true, textOf(write));
      assert.equal(await readFile(fixture, 'utf8'), sample);
      const read = await call('fc_read_file', { path: fixture });
      assert.ok(textOf(read).includes(sample.trim()));
      const invalid = await request('/api/call', { method: 'POST', data: { tool: 'not_a_real_tool', arguments: {} } });
      assert.equal(invalid.status, 400);
    });

    await t.test('backend error text and isError remain visible to the caller', async () => {
      const result = await call('fc_read_file', { path: path.join(temp, 'deliberately-absent.txt') });
      assert.equal(result.isError, true);
      assert.match(textOf(result), /deliberately-absent|ENOENT|not found|no such/i);
      assert.doesNotMatch(textOf(result), /^Open Compute MCP tool failed$/);
    });

    await t.test('retrying a submitted write does not execute it twice', async () => {
      const retryFile = path.join(temp, 'retry.txt');
      const args = { path: retryFile, content: 'ONE\n', append: true };
      const id = 'test-retry-' + Date.now();
      const first = await submit('fc_write_file', args, id);
      const second = await submit('fc_write_file', args, id);
      assert.equal(second.id, first.id);
      await waitJob(first.id);
      assert.equal(await readFile(retryFile, 'utf8'), 'ONE\n');
      const conflict = await request('/api/call', { method: 'POST', data: { tool: 'fc_write_file', arguments: { ...args, content: 'DIFFERENT\n' }, clientRequestId: id } });
      assert.equal(conflict.status, 409);
    });

    await t.test('a long command does not block status and independent reads', async () => {
      const slow = path.join(temp, 'slow.cjs');
      await writeFile(slow, "setTimeout(() => { console.log('slow-command-complete'); }, 2500);\n");
      const job = await submit('fc_execute_command', { command: (process.platform === 'win32' ? '& ' : '') + shellQuote(process.execPath) + ' ' + shellQuote(slow), cwd: temp, timeout: 15000 });
      const read = await call('fc_read_file', { path: fixture });
      assert.ok(textOf(read).includes(sample.trim()));
      const current = await (await request('/api/jobs/' + job.id)).json();
      assert.ok(['queued', 'running'].includes(current.job.status), 'independent file read must complete before the deliberate 2.5s delay');
      const status = await request('/api/status');
      assert.equal(status.status, 200);
      const finished = await waitJob(job.id);
      assert.ok(textOf(finished.result).includes('slow-command-complete'));
    });

    await t.test('interactive process survives separate HTTP tool calls and closes cleanly', async () => {
      const child = path.join(temp, 'session-child.cjs');
      await writeFile(child, [
        "const rl = require('node:readline').createInterface({input:process.stdin});",
        "console.log(JSON.stringify({ready:true,pid:process.pid}));",
        "rl.on('line',line=>{console.log(JSON.stringify({received:line,pid:process.pid}));if(line==='__exit_test__')process.exit(0);});",
        ""
      ].join('\n'));
      const started = await call('fc_start_session', { command: shellQuote(process.execPath), args: [shellQuote(child)], cwd: temp });
      sessionId = textOf(started).match(/session_\d+_\d+/)?.[0];
      assert.ok(sessionId, textOf(started));
      const ready = await readUntil('"ready":true');
      sessionPid = Number(ready.match(/"pid":(\d+)/)?.[1]);
      assert.ok(isAlive(sessionPid));
      await call('fc_send_input', { session_id: sessionId, input: 'one', newline: true });
      const first = await readUntil('"received":"one"');
      await call('fc_send_input', { session_id: sessionId, input: 'two', newline: true });
      const second = await readUntil('"received":"two"');
      assert.ok(first.includes('"pid":' + sessionPid));
      assert.ok(second.includes('"pid":' + sessionPid));
      const status = await (await request('/api/status')).json();
      assert.equal(status.backend.pid, backendPid);
      await call('fc_send_input', { session_id: sessionId, input: '__exit_test__', newline: true });
      for (let i = 0; i < 30 && isAlive(sessionPid); i++) await sleep(50);
      assert.equal(isAlive(sessionPid), false);
      await call('fc_close_session', { session_id: sessionId, force: false });
      const sessions = await call('fc_list_sessions', {});
      assert.ok(!textOf(sessions).includes(sessionId));
      sessionId = undefined;
    });
  } finally {
    if (sessionId && host && cookie) {
      try { await call('fc_send_input', { session_id: sessionId, input: '__exit_test__', newline: true }); } catch {}
      try { await call('fc_close_session', { session_id: sessionId, force: true }); } catch {}
    }
    if (isAlive(sessionPid)) {
      try { process.kill(sessionPid, 'SIGTERM'); } catch {}
    }
    if (host) await host.close();
    if (backendPid) assert.equal(isAlive(backendPid), false, 'host.close must terminate its FileCommander child');
    await rm(temp, { recursive: true, force: true });
  }
});
