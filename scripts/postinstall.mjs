#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function runGenerateOnce() {
  const prismaBin = process.platform === 'win32'
    ? path.join('node_modules', '.bin', 'prisma.cmd')
    : path.join('node_modules', '.bin', 'prisma');

  const env = { ...process.env };
  // Workaround Windows file-lock issues by using the binary engine during generation
  if (process.platform === 'win32' && !env.PRISMA_CLIENT_ENGINE_TYPE) {
    env.PRISMA_CLIENT_ENGINE_TYPE = 'binary';
  }

  const res = spawnSync(prismaBin, ['generate'], {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  });
  return { status: res.status ?? 1, error: res.error };
}

async function main() {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { status } = runGenerateOnce();
    if (status === 0) {
      process.exit(0);
      return;
    }
    // On Windows, clear possibly locked engine file and retry
    if (process.platform === 'win32') {
      const clientDir = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
      try {
        if (fs.existsSync(clientDir)) {
          fs.rmSync(clientDir, { recursive: true, force: true });
        }
      } catch {}
    }
    if (attempt < maxAttempts) {
      await delay(800);
      continue;
    }
  }

  // Final failure path
  console.error('\nPrisma generate failed. On Windows, this can be caused by file locks on query_engine-windows.dll.node.');
  console.error('Suggested fixes:');
  console.error('- Close any running Node/Next/VSCode TS server processes that may lock files');
  console.error('- Temporarily pause antivirus or exclude the project directory');
  console.error('- Delete node_modules/.prisma and re-run: npx prisma generate');
  console.error('- As a workaround, set PRISMA_CLIENT_ENGINE_TYPE=binary before generating');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

