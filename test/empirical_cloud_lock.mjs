/**
 * Empirical test: Validates cloudSafeRename behavior with real file locks.
 *
 * Windows-specific. On other platforms it prints a skip message.
 *
 * Key insight: The Windows Cloud Files filter (cldflt.sys) intercepts rename()
 * and returns EPERM/EACCES — NOT EBUSY. Copy+delete works because the file
 * is not actively locked, just filtered. Our trigger set is EPERM/EACCES/EXDEV.
 *
 * A real file lock (FileShare.Read) returns EBUSY, which is NOT in our trigger
 * set — correctly, because copy+delete cannot fully move a file that another
 * process holds open (delete would also fail).
 *
 * This test verifies both behaviors:
 *  - EBUSY (file lock) → cloudSafeRename correctly rethrows (not a cloud lock)
 *  - Normal rename (no lock) → fast path works
 *  - Injected EPERM → fallback works end-to-end
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

const CLOUD_LOCK_ERRORS = new Set(['EPERM', 'EACCES', 'EXDEV']);

async function cloudSafeRename(sourcePath, destPath, renameFn = fs.rename) {
  try {
    await renameFn(sourcePath, destPath);
    return { usedFallback: false };
  } catch (renameError) {
    const code = renameError.code;
    if (!code || !CLOUD_LOCK_ERRORS.has(code)) {
      throw renameError;
    }

    const stats = await fs.stat(sourcePath);

    if (stats.isDirectory()) {
      await fs.cp(sourcePath, destPath, { recursive: true });
    } else {
      await fs.copyFile(sourcePath, destPath);
    }

    const destStats = await fs.stat(destPath);
    if (stats.isFile() && destStats.size !== stats.size) {
      await fs.rm(destPath, { recursive: true, force: true });
      throw new Error(`Copy verification failed: expected ${stats.size} bytes, got ${destStats.size} bytes`);
    }

    try {
      if (stats.isDirectory()) {
        await fs.rm(sourcePath, { recursive: true });
      } else {
        await fs.unlink(sourcePath);
      }
    } catch (deleteError) {
      if (deleteError.code === 'EPERM' && process.platform === 'win32') {
        try {
          await fs.chmod(sourcePath, 0o666);
          await fs.unlink(sourcePath);
        } catch {
          throw new Error(`Copied to destination but cannot delete source (still locked): ${sourcePath}`);
        }
      } else {
        throw deleteError;
      }
    }

    return { usedFallback: true };
  }
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function holdFileLock(filePath) {
  const ps = spawn('powershell.exe', [
    '-NoProfile', '-Command',
    `$fs = [System.IO.File]::Open('${filePath.replace(/'/g, "''")}', 'Open', 'Read', 'Read'); ` +
    `Write-Host 'LOCKED'; ` +
    `[Console]::In.ReadLine(); ` +
    `$fs.Close()`
  ], { stdio: ['pipe', 'pipe', 'pipe'] });

  await new Promise((resolve, reject) => {
    ps.stdout.on('data', (data) => {
      if (data.toString().includes('LOCKED')) resolve();
    });
    ps.on('error', reject);
    setTimeout(() => reject(new Error('Timeout waiting for lock')), 10000);
  });

  return {
    release: () => {
      ps.stdin.write('\n');
      ps.stdin.end();
      return new Promise(resolve => ps.on('close', resolve));
    }
  };
}

async function main() {
  console.log('=== Empirical Cloud-Lock Test ===\n');

  if (process.platform !== 'win32') {
    console.log('SKIP: This test is Windows-specific (cldflt.sys simulation).');
    process.exit(0);
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fc-cloud-test-'));
  console.log(`Temp dir: ${tmpDir}\n`);

  let passed = 0;
  let failed = 0;

  try {
    // --- Test 1: Real file lock (EBUSY) is NOT triggered ---
    console.log('--- Test 1: Real file lock (EBUSY) correctly rejected ---');
    const srcFile = path.join(tmpDir, 'locked.txt');
    const dstFile = path.join(tmpDir, 'should_not_move.txt');
    await fs.writeFile(srcFile, 'locked content', 'utf-8');

    const lock = await holdFileLock(srcFile);
    console.log('  File locked (FileShare.Read — produces EBUSY)');

    try {
      await cloudSafeRename(srcFile, dstFile);
      console.log('  FAIL: cloudSafeRename() should have thrown EBUSY');
      failed++;
    } catch (err) {
      if (err.code === 'EBUSY') {
        console.log(`  SUCCESS: EBUSY correctly rethrown (not in trigger set)`);
        console.log(`  Source still exists: ${await exists(srcFile)}`);
        passed++;
      } else {
        console.log(`  FAIL: unexpected error: ${err.message}`);
        failed++;
      }
    }

    await lock.release();
    console.log('  Lock released\n');

    // --- Test 2: Normal rename (no lock) uses fast path ---
    console.log('--- Test 2: Normal rename uses fast path ---');
    const normalSrc = path.join(tmpDir, 'normal.txt');
    const normalDst = path.join(tmpDir, 'normal_moved.txt');
    await fs.writeFile(normalSrc, 'no lock here', 'utf-8');

    const normalResult = await cloudSafeRename(normalSrc, normalDst);
    if (!normalResult.usedFallback &&
        await fs.readFile(normalDst, 'utf-8') === 'no lock here' &&
        !(await exists(normalSrc))) {
      console.log('  SUCCESS: Fast path, content verified, source removed');
      passed++;
    } else {
      console.log('  FAIL: unexpected result');
      failed++;
    }

    // --- Test 3: Simulated EPERM (cldflt.sys) triggers fallback ---
    console.log('\n--- Test 3: Simulated EPERM triggers copy+delete fallback ---');
    const cldfltSrc = path.join(tmpDir, 'cldflt_file.txt');
    const cldfltDst = path.join(tmpDir, 'cldflt_moved.txt');
    await fs.writeFile(cldfltSrc, 'cloud filtered content', 'utf-8');

    const fakeCldflt = async () => {
      const err = new Error('EPERM: operation not permitted');
      err.code = 'EPERM';
      throw err;
    };

    const result = await cloudSafeRename(cldfltSrc, cldfltDst, fakeCldflt);
    const content = await fs.readFile(cldfltDst, 'utf-8');
    const srcGone = !(await exists(cldfltSrc));

    if (result.usedFallback && content === 'cloud filtered content' && srcGone) {
      console.log('  SUCCESS: Fallback used, content verified, source removed');
      passed++;
    } else {
      console.log(`  FAIL: fallback=${result.usedFallback}, content=${content}, srcGone=${srcGone}`);
      failed++;
    }

    // --- Test 4: Simulated EXDEV triggers fallback ---
    console.log('\n--- Test 4: Simulated EXDEV triggers copy+delete fallback ---');
    const xdevSrc = path.join(tmpDir, 'xdev.txt');
    const xdevDst = path.join(tmpDir, 'xdev_moved.txt');
    await fs.writeFile(xdevSrc, 'cross device', 'utf-8');

    const fakeXdev = async () => {
      const err = new Error('EXDEV: cross-device link');
      err.code = 'EXDEV';
      throw err;
    };

    const xdevResult = await cloudSafeRename(xdevSrc, xdevDst, fakeXdev);
    const xdevContent = await fs.readFile(xdevDst, 'utf-8');
    const xdevSrcGone = !(await exists(xdevSrc));

    if (xdevResult.usedFallback && xdevContent === 'cross device' && xdevSrcGone) {
      console.log('  SUCCESS: Fallback used, content verified, source removed');
      passed++;
    } else {
      console.log(`  FAIL: fallback=${xdevResult.usedFallback}, srcGone=${xdevSrcGone}`);
      failed++;
    }

  } finally {
    console.log('\n--- Cleanup ---');
    await fs.rm(tmpDir, { recursive: true, force: true });
    console.log(`  Cleaned up ${tmpDir}`);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
