import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('Vercel build rejects local/Sites data runtimes before invoking Next', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'ff-deployment-target-'));
  try {
    for (const runtime of ['cloudflare', 'node']) {
      const result = spawnSync(process.execPath, ['scripts/run-framework.mjs', 'build'], {
        env: { ...process.env, VERCEL: '1', APP_RUNTIME: runtime, SITES_RUNTIME_ROOT: root },
        encoding: 'utf8',
      });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Vercel: external database and private material storage/);
      assert.doesNotMatch(result.stdout, /Creating an optimized production build/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
