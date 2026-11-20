/*
 * Adapted from Cowork Protocol's mcp-stdio-client.js, commit
 * 0e0b615f601b79648e0d47c15b8f6b6ce6fa612e.
 * https://github.com/ellmos-ai/cowork-protocol
 *
 * MIT License
 * Copyright (c) 2026 Lukas Geiger
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';

const MAX_LINE = 32 * 1024 * 1024;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export class McpStdioClientError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'McpStdioClientError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export function createMcpStdioClient({
  command = process.execPath,
  args = [],
  cwd = process.cwd(),
  env = {},
  requestTimeoutMs = 330_000,
  spawnImpl = spawn,
} = {}) {
  if (typeof command !== 'string' || !command || !Array.isArray(args) ||
      args.some(value => typeof value !== 'string') || typeof cwd !== 'string') {
    throw new TypeError('Invalid MCP executable, arguments or working directory');
  }
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 100 || requestTimeoutMs > 600_000) {
    throw new TypeError('MCP timeout must be between 100 and 600000 milliseconds');
  }
  let child = null;
  let alive = false;
  let starting = null;
  let closing = null;
  let nextId = 1;
  let stdoutBuffer = '';
  let stderrTail = '';
  let serverInfo = null;
  let lastError = null;
  let exited = Promise.resolve();
  const pending = new Map();

  function rejectPending(error) {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    pending.clear();
  }

  function writeMessage(message) {
    if (!alive || !child?.stdin?.writable) {
      throw new McpStdioClientError('MCP_UNAVAILABLE', 'FileCommander läuft nicht. Backend neu starten.');
    }
    child.stdin.write(JSON.stringify(message) + '\n', 'utf8');
  }

  function handleMessage(message) {
    if (!message || message.jsonrpc !== '2.0') return;
    if (typeof message.method === 'string' && message.id !== undefined) {
      // No sampling, elicitation or other model/UI capabilities are advertised.
      if (message.method === 'ping') writeMessage({ jsonrpc: '2.0', id: message.id, result: {} });
      else writeMessage({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'Method not supported by FileCommander Bridge' } });
      return;
    }
    if (message.id === undefined) return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.error) {
      entry.reject(new McpStdioClientError('MCP_REQUEST_FAILED', String(message.error.message || 'FileCommander rejected the request'), {
        code: message.error.code,
        data: message.error.data,
      }));
    } else {
      entry.resolve(message.result);
    }
  }

  function failProtocol(message) {
    lastError = message;
    rejectPending(new McpStdioClientError('MCP_PROTOCOL_ERROR', message));
    // Stop parsing rather than interpreting a tail of an overlong frame as JSON.
    child?.stdout?.destroy();
    void close();
  }

  function handleStdout(chunk) {
    stdoutBuffer += chunk;
    let newline;
    while ((newline = stdoutBuffer.indexOf('\n')) !== -1) {
      if (newline > MAX_LINE) return failProtocol('FileCommander response exceeded the 32 MiB line limit.');
      const line = stdoutBuffer.slice(0, newline).trim();
      if (Buffer.byteLength(line) > MAX_LINE) return failProtocol('FileCommander response exceeded the 32 MiB line limit.');
      stdoutBuffer = stdoutBuffer.slice(newline + 1);
      if (!line) continue;
      try { handleMessage(JSON.parse(line)); }
      catch (error) { return failProtocol('Invalid MCP JSON response: ' + error.message); }
    }
    if (Buffer.byteLength(stdoutBuffer) > MAX_LINE) failProtocol('FileCommander response exceeded the 32 MiB line limit.');
  }

  function request(method, params = {}, timeoutMs = requestTimeoutMs) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        try { writeMessage({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: id, reason: 'Client request timeout' } }); } catch {}
        reject(new McpStdioClientError('MCP_TIMEOUT', 'Zeitlimit erreicht. Der Auftrag kann im Backend noch laufen; vor einer Wiederholung den Zustand prüfen.'));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      try { writeMessage({ jsonrpc: '2.0', id, method, params }); }
      catch (error) {
        clearTimeout(timer);
        pending.delete(id);
        reject(error);
      }
    });
  }

  async function start() {
    if (starting) return starting;
    if (alive && serverInfo) return serverInfo;
    if (closing) await closing;
    starting = (async () => {
      stdoutBuffer = '';
      stderrTail = '';
      serverInfo = null;
      lastError = null;
      const spawnedChild = spawnImpl(command, [...args], {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        shell: false,
        // Own POSIX process group permits scoped cleanup of sessions we started.
        detached: process.platform !== 'win32',
      });
      child = spawnedChild;
      alive = true;
      let resolveSpawnExit;
      exited = new Promise(resolve => { resolveSpawnExit = resolve; });
      spawnedChild.stdout.setEncoding('utf8');
      spawnedChild.stderr.setEncoding('utf8');
      // All events belong to this generation. A force-killed child can deliver
      // late stream/exit events after a new backend has already been started.
      spawnedChild.stdout.on('data', chunk => { if (child === spawnedChild) handleStdout(chunk); });
      spawnedChild.stderr.on('data', chunk => {
        if (child === spawnedChild) stderrTail = (stderrTail + chunk).slice(-8192);
      });
      spawnedChild.stdin.on('error', error => {
        if (child !== spawnedChild) return;
        lastError = error.message;
        rejectPending(new McpStdioClientError('MCP_STDIN_FAILED', error.message));
      });
      spawnedChild.once('error', error => {
        resolveSpawnExit();
        if (child !== spawnedChild) return;
        alive = false;
        lastError = error.message;
        rejectPending(new McpStdioClientError('MCP_START_FAILED', error.message));
      });
      spawnedChild.once('exit', (code, signal) => {
        resolveSpawnExit();
        if (child !== spawnedChild) return;
        alive = false;
        lastError = closing ? null : `FileCommander exited (${signal || code}).`;
        rejectPending(new McpStdioClientError('MCP_EXITED', lastError || 'FileCommander wurde beendet.'));
      });
      try {
        const initialized = await request('initialize', {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'ellmos-filecommander-bridge', version: '0.1.1' },
        }, 30_000);
        if (!initialized || typeof initialized.protocolVersion !== 'string' || !initialized.serverInfo) {
          throw new McpStdioClientError('MCP_INVALID_HANDSHAKE', 'FileCommander lieferte keine gültige MCP-Initialisierung.');
        }
        serverInfo = initialized.serverInfo;
        writeMessage({ jsonrpc: '2.0', method: 'notifications/initialized' });
        return serverInfo;
      } catch (error) {
        lastError = error.message;
        await close();
        throw error;
      }
    })();
    try { return await starting; }
    finally { starting = null; }
  }

  async function listTools() {
    const tools = [];
    let cursor;
    const seenCursors = new Set();
    do {
      const result = await request('tools/list', cursor ? { cursor } : {}, 30_000);
      if (!Array.isArray(result?.tools)) throw new McpStdioClientError('MCP_INVALID_TOOLS', 'Invalid MCP tool list.');
      tools.push(...result.tools);
      cursor = result.nextCursor;
      if (cursor && seenCursors.has(cursor)) throw new McpStdioClientError('MCP_INVALID_TOOLS', 'Repeated tools/list cursor.');
      if (cursor) seenCursors.add(cursor);
      if (tools.length > 2000) throw new McpStdioClientError('MCP_INVALID_TOOLS', 'Too many MCP tools.');
    } while (cursor);
    return tools;
  }

  async function close() {
    if (closing) return closing;
    closing = (async () => {
      const ownedChild = child;
      const ownedExited = exited;
      const pid = ownedChild?.pid;
      rejectPending(new McpStdioClientError('MCP_CLOSED', 'FileCommander-Verbindung wurde beendet.'));
      if (pid) {
        if (process.platform === 'win32' && alive) {
          // Kill only this backend and its descendants, while its PID still exists.
          await new Promise(resolve => {
            const taskkill = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe');
            const killer = spawn(taskkill, ['/PID', String(pid), '/T', '/F'], { shell: false, windowsHide: true, stdio: 'ignore' });
            const timer = setTimeout(() => { killer.kill(); ownedChild.kill(); resolve(); }, 3000);
            const done = () => { clearTimeout(timer); resolve(); };
            killer.once('error', () => { ownedChild.kill(); done(); });
            killer.once('exit', done);
          });
        } else if (process.platform !== 'win32') {
          try { process.kill(-pid, 'SIGTERM'); } catch { try { ownedChild.kill('SIGTERM'); } catch {} }
        } else {
          try { ownedChild.kill(); } catch {}
        }
        await Promise.race([ownedExited, delay(1000)]);
        if (process.platform !== 'win32') {
          try { process.kill(-pid, 'SIGKILL'); } catch {}
        } else if (alive) {
          try { ownedChild.kill('SIGKILL'); } catch {}
        }
        await Promise.race([ownedExited, delay(1000)]);
      }
      if (child === ownedChild) {
        alive = false;
        serverInfo = null;
        child = null;
      }
    })();
    try { await closing; }
    finally { closing = null; }
  }

  return {
    start,
    listTools,
    callTool(name, arguments_ = {}, timeoutMs = requestTimeoutMs) {
      if (typeof name !== 'string' || !name || name.length > 128) throw new TypeError('Invalid MCP tool name');
      // Preserve isError and original content: a tool failure is not a protocol failure.
      return request('tools/call', { name, arguments: arguments_ }, timeoutMs);
    },
    close,
    get status() { return { alive, pid: child?.pid ?? null, serverInfo, pendingRequests: pending.size, stderrTail, lastError }; },
  };
}
