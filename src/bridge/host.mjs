import http from 'node:http';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HTML, CLIENT_JS, STYLE_CSS } from './ui.mjs';
import { createMcpStdioClient } from './mcp-client.mjs';

export const VERSION = '0.1.1';
const MAX_BODY = 4 * 1024 * 1024;
const MAX_RESULT = 8 * 1024 * 1024;
const MAX_JOBS = 80;
const MAX_RUNNING = 16;
const MAX_RETAINED_BYTES = 32 * 1024 * 1024;
const SESSION_AGE = 8 * 60 * 60 * 1000;
const randomToken = () => randomBytes(32).toString('base64url');
const now = () => new Date().toISOString();
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

function equalSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}

function json(res, status, value, extra = {}) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), ...extra });
  res.end(body);
}

async function readJson(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
    throw new HttpError(415, 'JSON_REQUIRED', 'Bitte application/json senden.');
  }
  const length = Number(req.headers['content-length']);
  if (Number.isFinite(length) && length > MAX_BODY) throw new HttpError(413, 'BODY_TOO_LARGE', 'Auftrag ist größer als 4 MiB.');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY) throw new HttpError(413, 'BODY_TOO_LARGE', 'Auftrag ist größer als 4 MiB.');
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!isObject(parsed)) throw new Error('object required');
    return parsed;
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Ein gültiges JSON-Objekt wird benötigt.');
  }
}

function boundedResult(result) {
  const raw = JSON.stringify(result ?? null);
  const bytes = Buffer.byteLength(raw);
  if (bytes <= MAX_RESULT) return { result, resultBytes: bytes, resultTruncated: false };
  const contents = [];
  let budget = 1024 * 1024;
  for (const item of Array.isArray(result?.content) ? result.content : []) {
    if (!budget) break;
    if (item.type === 'text') {
      const text = String(item.text || '').slice(0, budget);
      contents.push({ type: 'text', text });
      budget -= text.length;
    }
  }
  contents.push({ type: 'text', text: '\n[Ergebnis größer als 8 MiB: Vorschau gekürzt. Datei in kleineren Abschnitten lesen.]' });
  return { result: { content: contents, ...(result?.isError === true ? { isError: true } : {}) }, resultBytes: bytes, resultTruncated: true };
}

async function openUrl(url) {
  return new Promise(resolve => {
    let command;
    let args;
    if (process.platform === 'win32') {
      command = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'rundll32.exe');
      args = ['url.dll,FileProtocolHandler', url];
    } else if (process.platform === 'darwin') {
      command = '/usr/bin/open';
      args = [url];
    } else {
      command = 'xdg-open';
      args = [url];
    }
    const child = spawn(command, args, { shell: false, windowsHide: true, stdio: 'ignore', detached: true });
    // A successful spawn does not imply that the OS accepted the URL.
    const timer = setTimeout(() => resolve(false), 3000);
    child.once('error', () => { clearTimeout(timer); resolve(false); });
    child.once('exit', code => { clearTimeout(timer); resolve(code === 0); });
    child.once('spawn', () => { child.unref(); });
  });
}

export async function startHost({ backendEntry, cwd = process.cwd(), port = 47832, openBrowser = true, dataDir = '', starterPath = '' } = {}) {
  if (typeof backendEntry !== 'string' || !path.isAbsolute(backendEntry)) throw new TypeError('backendEntry must be an absolute path');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new TypeError('Invalid HTTP port');
  const client = createMcpStdioClient({ command: process.execPath, args: [backendEntry], cwd, env: { NO_UPDATE_NOTIFIER: '1' } });
  await client.start();
  let tools;
  try { tools = await client.listTools(); }
  catch (error) { await client.close(); throw error; }
  const token = randomToken();
  const sessions = new Map();
  const jobs = new Map();
  const idempotency = new Map();
  // Bounded tombstones prevent an evicted request ID from executing again.
  // A Bloom filter can reject a new ID in the rare false-positive case, but
  // cannot turn an old ID into a second write. No per-call quota is introduced.
  const seenRequestIds = Buffer.alloc(8 * 1024 * 1024);
  function requestIdBits(id) {
    const digest = createHash('sha256').update(id).digest();
    return Array.from({ length: 5 }, (_, index) => digest.readUInt32LE(index * 4) & ((1 << 26) - 1));
  }
  function wasRequestSeen(id) {
    return requestIdBits(id).every(bit => (seenRequestIds[bit >>> 3] & (1 << (bit & 7))) !== 0);
  }
  function rememberRequest(id) {
    for (const bit of requestIdBits(id)) seenRequestIds[bit >>> 3] |= 1 << (bit & 7);
  }
  let actualPort;
  let origin;
  let closing = false;
  let restarting = false;
  let restartTask = null;
  let backendGeneration = 0;
  let closePromise;
  let resolveClosed;
  const closed = new Promise(resolve => { resolveClosed = resolve; });
  const startedAt = now();

  function jobSummary(job) {
    return { id: job.id, tool: job.tool, status: job.status, createdAt: job.createdAt, startedAt: job.startedAt,
      completedAt: job.completedAt, clientRequestId: job.clientRequestId, resultBytes: job.resultBytes,
      resultTruncated: job.resultTruncated, isError: job.result?.isError === true, error: job.error };
  }

  function pruneJobs() {
    const finished = [...jobs.values()].filter(job => job.status === 'succeeded' || job.status === 'failed');
    let retained = [...jobs.values()].reduce((sum, job) => sum + (job.retainedBytes || 0), 0);
    for (const job of finished) {
      if (jobs.size <= MAX_JOBS && retained <= MAX_RETAINED_BYTES) break;
      retained -= job.retainedBytes || 0;
      jobs.delete(job.id);
    }
    while (idempotency.size > 1000) {
      const candidate = [...idempotency.entries()].find(([, value]) => !jobs.has(value.id));
      if (!candidate) break;
      idempotency.delete(candidate[0]);
    }
  }

  function authenticate(req) {
    const pairs = String(req.headers.cookie || '').split(';').map(item => item.trim());
    const cookiePrefix = `fc_session_${actualPort}=`;
    const cookie = pairs.find(item => item.startsWith(cookiePrefix))?.slice(cookiePrefix.length);
    const session = cookie && sessions.get(cookie);
    if (!session || session.expires < Date.now()) {
      if (cookie) sessions.delete(cookie);
      throw new HttpError(401, 'NOT_CONNECTED', 'Verbindung fehlt oder ist abgelaufen. Den Startlink erneut öffnen.');
    }
    return session;
  }

  function checkOrigin(req, mutation = false) {
    const supplied = req.headers.origin;
    if ((mutation && supplied !== origin) || (supplied !== undefined && supplied !== origin)) {
      throw new HttpError(403, 'ORIGIN_REJECTED', 'Diese Herkunft darf FileCommander nicht bedienen.');
    }
    if (req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'CROSS_SITE_REJECTED', 'Seitenübergreifender Zugriff abgelehnt.');
  }

  function status(session) {
    const backend = client.status;
    return { version: VERSION, startedAt, cwd, dataDir, starterPath,
      appDir: path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url)))), platform: process.platform, node: process.version,
      origin, port: actualPort, csrfToken: session.csrfToken, state: closing ? 'stopping' : restarting ? 'restarting' : backend.alive ? 'ready' : 'error',
      backend: { name: backend.serverInfo?.name, version: backend.serverInfo?.version, toolCount: tools.length,
        pid: backend.pid, alive: backend.alive, pendingRequests: backend.pendingRequests, lastError: backend.lastError,
        stderrTail: backend.stderrTail },
      limits: { requestBytes: MAX_BODY, resultBytes: MAX_RESULT, retainedJobs: MAX_JOBS, concurrentJobs: MAX_RUNNING, sessionHours: 8 },
    };
  }

  async function runJob(job, args) {
    job.status = 'running';
    job.startedAt = now();
    try {
      Object.assign(job, boundedResult(await client.callTool(job.tool, args)));
      job.status = job.result?.isError === true ? 'failed' : 'succeeded';
      job.retainedBytes = Buffer.byteLength(JSON.stringify(job.result ?? null));
    } catch (error) {
      job.status = 'failed';
      job.error = { code: error.code || 'TOOL_FAILED', message: String(error.message || error), ...(error.details ? { details: error.details } : {}) };
      job.retainedBytes = Buffer.byteLength(JSON.stringify(job.error));
    }
    job.completedAt = now();
    pruneJobs();
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try {
      if (req.headers.host !== `127.0.0.1:${actualPort}`) throw new HttpError(403, 'HOST_REJECTED', 'Host nicht erlaubt. Bitte den ausgegebenen Startlink verwenden.');
      const parsed = new URL(req.url, origin);
      const pathname = parsed.pathname;
      checkOrigin(req, req.method !== 'GET' && req.method !== 'HEAD');
      if (req.method === 'GET' && ['/', '/app.js', '/style.css'].includes(pathname)) {
        const body = pathname === '/' ? HTML : pathname === '/app.js' ? CLIENT_JS : STYLE_CSS;
        res.writeHead(200, { 'Content-Type': pathname === '/' ? 'text/html; charset=utf-8' : pathname === '/app.js' ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8' });
        return res.end(body);
      }
      if (req.method === 'GET' && pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
      if (req.method === 'POST' && pathname === '/api/connect') {
        const input = await readJson(req);
        if (!equalSecret(input.token, token)) throw new HttpError(403, 'INVALID_TOKEN', 'Startschlüssel ungültig. Bitte den Startlink aus dem Terminal öffnen.');
        for (const [id, value] of sessions) if (value.expires < Date.now()) sessions.delete(id);
        while (sessions.size >= 16) sessions.delete(sessions.keys().next().value);
        const cookie = randomToken();
        const session = { csrfToken: randomToken(), expires: Date.now() + SESSION_AGE };
        sessions.set(cookie, session);
        return json(res, 200, { ok: true, csrfToken: session.csrfToken }, {
          'Set-Cookie': `fc_session_${actualPort}=${cookie}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_AGE / 1000}`,
        });
      }
      if (!pathname.startsWith('/api/')) throw new HttpError(404, 'NOT_FOUND', 'Nicht gefunden.');
      const session = authenticate(req);
      if (req.method !== 'GET' && req.method !== 'HEAD' && !equalSecret(req.headers['x-fc-csrf'], session.csrfToken)) {
        throw new HttpError(403, 'CSRF_REJECTED', 'Sitzungsschlüssel fehlt. Seite neu laden.');
      }
      if (req.method === 'GET' && pathname === '/api/status') return json(res, 200, status(session));
      if (req.method === 'GET' && pathname === '/api/tools') return json(res, 200, { tools });
      if (req.method === 'GET' && pathname === '/api/jobs') return json(res, 200, { jobs: [...jobs.values()].reverse().map(jobSummary) });
      if (req.method === 'GET' && /^\/api\/jobs\/[a-zA-Z0-9_-]+$/.test(pathname)) {
        const job = jobs.get(pathname.slice('/api/jobs/'.length));
        if (!job) throw new HttpError(404, 'JOB_NOT_FOUND', 'Auftrag nicht mehr im begrenzten Verlauf vorhanden.');
        const { retainedBytes, ...publicJob } = job;
        return json(res, 200, { job: publicJob });
      }
      if (req.method === 'POST' && pathname === '/api/call') {
        if (closing || restarting || !client.status.alive) throw new HttpError(503, 'BACKEND_UNAVAILABLE', 'FileCommander ist momentan nicht bereit.');
        const generation = backendGeneration;
        const input = await readJson(req);
        if (generation !== backendGeneration || closing || restarting || !client.status.alive) throw new HttpError(503, 'BACKEND_UNAVAILABLE', 'FileCommander ist momentan nicht bereit.');
        if (typeof input.tool !== 'string' || !tools.some(tool => tool.name === input.tool)) throw new HttpError(400, 'UNKNOWN_TOOL', 'Unbekanntes FileCommander-Werkzeug.');
        if (!isObject(input.arguments)) throw new HttpError(400, 'INVALID_ARGUMENTS', 'arguments muss ein JSON-Objekt sein.');
        if (input.clientRequestId !== undefined && (typeof input.clientRequestId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(input.clientRequestId))) {
          throw new HttpError(400, 'INVALID_REQUEST_ID', 'Ungültige clientRequestId.');
        }
        const fingerprint = createHash('sha256').update(JSON.stringify([input.tool, input.arguments])).digest('hex');
        if (input.clientRequestId && idempotency.has(input.clientRequestId)) {
          const previous = idempotency.get(input.clientRequestId);
          if (previous.fingerprint !== fingerprint) throw new HttpError(409, 'REQUEST_ID_CONFLICT', 'Diese Auftrags-ID gehört zu anderen Argumenten.');
          const existing = jobs.get(previous.id);
          if (!existing) throw new HttpError(410, 'JOB_EXPIRED', 'Der Auftrag wurde bereits angenommen, ist aber nicht mehr im Verlauf. Nicht blind wiederholen.');
          return json(res, 202, { job: jobSummary(existing), duplicate: true });
        }
        if (input.clientRequestId && wasRequestSeen(input.clientRequestId)) {
          throw new HttpError(410, 'JOB_EXPIRED', 'Diese Auftrags-ID kann bereits ausgeführt worden sein. Zustand prüfen, bevor ein neuer Auftrag erstellt wird.');
        }
        if ([...jobs.values()].filter(job => job.status === 'running' || job.status === 'queued').length >= MAX_RUNNING) {
          throw new HttpError(429, 'TOO_MANY_JOBS', 'Zu viele gleichzeitige Aufträge. Bitte laufende Aufträge abwarten.');
        }
        const job = { id: randomBytes(12).toString('base64url'), tool: input.tool, status: 'queued', createdAt: now(), clientRequestId: input.clientRequestId };
        jobs.set(job.id, job);
        if (input.clientRequestId) {
          rememberRequest(input.clientRequestId);
          idempotency.set(input.clientRequestId, { id: job.id, fingerprint });
        }
        json(res, 202, { job: jobSummary(job) });
        // Each MCP request has an independent ID; long execution never serializes reads.
        void runJob(job, input.arguments);
        return;
      }
      if (req.method === 'POST' && pathname === '/api/restart-backend') {
        await readJson(req);
        if (restarting || closing) throw new HttpError(409, 'BUSY', 'Backend wird bereits umgeschaltet.');
        if ([...jobs.values()].some(job => job.status === 'running' || job.status === 'queued')) throw new HttpError(409, 'JOBS_RUNNING', 'Noch laufende Aufträge zuerst abschließen lassen.');
        restarting = true;
        backendGeneration++;
        const thisRestart = (async () => {
          await client.close();
          if (closing) throw new HttpError(503, 'BACKEND_UNAVAILABLE', 'FileCommander wird beendet.');
          await client.start();
          if (closing) throw new HttpError(503, 'BACKEND_UNAVAILABLE', 'FileCommander wird beendet.');
          const nextTools = await client.listTools();
          if (closing) throw new HttpError(503, 'BACKEND_UNAVAILABLE', 'FileCommander wird beendet.');
          tools = nextTools;
        })();
        restartTask = thisRestart;
        try {
          await thisRestart;
          return json(res, 200, { ok: true, status: status(session) });
        } finally {
          restarting = false;
          if (restartTask === thisRestart) restartTask = null;
        }
      }
      if (req.method === 'POST' && pathname === '/api/shutdown') {
        await readJson(req);
        closing = true;
        json(res, 202, { ok: true, message: 'FileCommander wird beendet.' });
        setTimeout(() => { void close(); }, 100);
        return;
      }
      throw new HttpError(404, 'NOT_FOUND', 'Nicht gefunden.');
    } catch (error) {
      if (!res.headersSent && !res.destroyed) json(res, error.status || 500, { error: { code: error.code || 'INTERNAL_ERROR', message: String(error.message || 'Interner Fehler') } });
      else if (!res.writableEnded) res.destroy();
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 50;
  server.on('clientError', (_error, socket) => { socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); });

  async function close() {
    if (closePromise) return closePromise;
    closing = true;
    closePromise = (async () => {
      const stopped = new Promise(resolve => server.close(resolve));
      server.closeIdleConnections?.();
      const pendingRestart = restartTask;
      await client.close();
      if (pendingRestart) await pendingRestart.catch(() => {});
      await client.close();
      server.closeAllConnections?.();
      await stopped;
      sessions.clear();
      resolveClosed();
    })();
    return closePromise;
  }

  try {
    await new Promise((resolve, reject) => {
      const onError = error => reject(error);
      server.once('error', onError);
      server.listen(port, '127.0.0.1', () => { server.off('error', onError); resolve(); });
    });
  } catch (error) {
    await client.close();
    throw error;
  }
  actualPort = server.address().port;
  origin = `http://127.0.0.1:${actualPort}`;
  const launchUrl = `${origin}/#token=${token}`;
  const browserOpened = openBrowser ? await openUrl(launchUrl) : false;
  return { server, url: origin, launchUrl, token, port: actualPort, client, close, closed, browserOpened };
}
