import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { startHost, VERSION } from './host.mjs';

const HELP = `FileCommander browser bridge (optional)

Usage: ellmos-filecommander bridge [options]
       node dist/index.js bridge [options]

  --cwd <directory>  Working directory (default: current directory)
  --port <0-65535>   Local port (default: 47832; 0 chooses an available port)
  --no-open         Print the connection link without opening a browser
  --help, -h        Show this help

The bridge listens only on 127.0.0.1 and starts this installation's stdio
MCP server. Keep this console open. Stop with Ctrl+C or the page's stop button.
Without the bridge subcommand, FileCommander uses its normal stdio transport.
The local browser API is not an HTTP MCP endpoint.
`;

export async function runBridge(args = process.argv.slice(3)) {
  const { values } = parseArgs({
    args,
    options: {
      cwd: { type: 'string' },
      port: { type: 'string', default: '47832' },
      'no-open': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values.help) {
    console.log(HELP);
    return;
  }
  if (!/^\d+$/.test(values.port) || Number(values.port) > 65535) {
    throw new Error('--port must be an integer from 0 to 65535.');
  }
  const cwd = path.resolve(values.cwd ?? process.cwd());
  let directory;
  try { directory = await stat(cwd); }
  catch { throw new Error('Working directory does not exist: ' + cwd); }
  if (!directory.isDirectory()) throw new Error('--cwd must name an existing directory: ' + cwd);

  let host;
  let stopping = false;
  const onSignal = () => {
    stopping = true;
    if (host) void host.close().catch(error => {
      console.error('Bridge shutdown failed:', error.message);
      process.exitCode = 1;
    });
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  try {
    host = await startHost({
      backendEntry: fileURLToPath(new URL('../index.js', import.meta.url)),
      cwd,
      port: Number(values.port),
      openBrowser: !values['no-open'],
    });
    if (stopping) {
      await host.close();
      return;
    }
    console.log('FileCommander Bridge ' + VERSION);
    console.log('Working directory: ' + cwd);
    console.log('Local page: ' + host.url);
    console.log('Keep this console open. Stop: Ctrl+C.');
    console.log('\nConnection link for this running bridge (keep private):\n' + host.launchUrl);
    if (!values['no-open'] && !host.browserOpened) {
      console.log('Open the complete connection link above in your local browser.');
    }
    await host.closed;
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      throw new Error('The local port is in use. Choose --port 0 or another --port value.');
    }
    throw error;
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);
    if (host) await host.close();
  }
}
