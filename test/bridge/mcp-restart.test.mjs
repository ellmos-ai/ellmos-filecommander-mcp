import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createMcpStdioClient } from '../../dist/bridge/mcp-client.mjs';

test('a force-stopped backend cannot invalidate its replacement', { timeout: 15000 }, async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'filecommander-restart-test-'));
  const fixture = path.join(temp, 'delayed-exit.cjs');
  await writeFile(fixture, [
    "const readline = require('node:readline');",
    "process.on('SIGTERM',()=>{});",
    "const send = (id,result)=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,result})+'\\n');",
    "readline.createInterface({input:process.stdin}).on('line',line=>{",
    "  const request=JSON.parse(line);",
    "  if(request.method==='initialize')send(request.id,{protocolVersion:'2025-06-18',capabilities:{tools:{}},serverInfo:{name:'lifecycle-fixture',version:'1'}});",
    "  else if(request.method==='tools/list')send(request.id,{tools:[]});",
    "});",
    ""
  ].join('\n'));
  const client = createMcpStdioClient({ command: process.execPath, args: [fixture], cwd: temp, requestTimeoutMs: 3000 });
  try {
    await client.start();
    const firstPid = client.status.pid;
    await client.close();
    await client.start();
    assert.notEqual(client.status.pid, firstPid);
    // Let any late exit/stdin/stdout events from the first process arrive.
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(client.status.alive, true);
    assert.deepEqual(await client.listTools(), []);
    assert.equal(client.status.lastError, null);
  } finally {
    await client.close();
    await rm(temp, { recursive: true, force: true });
  }
});
