#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const HELP_TEXT = `shipflow-overlay <command>

Commands:
  init        Scaffold Shipflow overlay files into the current Next.js project.
  help        Display this message.
`;

const API_ROUTE_TEMPLATE = `import { createNextHandler } from "@shipflow/overlay/next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createNextHandler();

export const POST = handler;
`;

const PROVIDER_TEMPLATE = `'use client';

import { FlowOverlayProvider } from "@shipflow/overlay";

export function ShipflowOverlay() {
  return <FlowOverlayProvider />;
}
`;

const README_TEMPLATE = [
  '# Shipflow Overlay Setup',
  '',
  '1. Ensure `cursor-agent` is installed and available on your PATH. If you installed it elsewhere, set `CURSOR_AGENT_BIN` in your environment.',
  '2. Import `ShipflowOverlay` from `app/shipflow-overlay-provider` and render it in `app/layout.tsx` (ideally inside `<body>`) gated to development mode.',
  '3. Update `next.config.mjs` to wrap your config with `withShipflowOverlay` from `@shipflow/overlay/next`.',
  '4. Restart `npm run dev`.',
].join('\n');

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function createFileIfMissing(filePath: string, content: string) {
  if (existsSync(filePath)) {
    return false;
  }
  ensureDir(filePath);
  writeFileSync(filePath, content, 'utf8');
  return true;
}

function checkCursorAgent(): string | null {
  const whichCommand = process.platform === 'win32' ? 'where' : 'which';
  const lookup = spawnSync(whichCommand, ['cursor-agent'], {
    encoding: 'utf8',
  });
  if (!lookup.error && lookup.status === 0 && lookup.stdout) {
    const resolvedPath = lookup.stdout.split(/\r?\n/).find(Boolean);
    if (resolvedPath) {
      return resolvedPath.trim();
    }
  }
  return null;
}

function appendEnvHint(filePath: string, binaryPath: string | null) {
  const lines: string[] = [
    '# Cursor CLI binary path for Shipflow overlay',
    'CURSOR_AGENT_BIN=' + (binaryPath ?? ''),
  ];
  if (existsSync(filePath)) {
    const current = readFileSync(filePath, 'utf8');
    if (current.includes('CURSOR_AGENT_BIN')) {
      return false;
    }
    const next = current.endsWith('\n') ? current : `${current}\n`;
    writeFileSync(filePath, `${next}${lines.join('\n')}\n`, 'utf8');
    return true;
  }
  writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
  return true;
}

async function runInit() {
  const cwd = process.cwd();
  console.log('▶ Setting up Shipflow overlay in', cwd);

  const agentPath = checkCursorAgent();
  if (!agentPath) {
    console.warn(
      '⚠️  cursor-agent was not found on PATH. Install it via Cursor (https://cursor.sh) or set CURSOR_AGENT_BIN.',
    );
  } else {
    console.log('✓ cursor-agent located at', agentPath);
  }

  const apiRouteCreated = createFileIfMissing(
    path.join(cwd, 'app', 'api', 'shipflow', 'overlay', 'route.ts'),
    API_ROUTE_TEMPLATE,
  );
  console.log(
    apiRouteCreated
      ? '✓ Created app/api/shipflow/overlay/route.ts'
      : '• app/api/shipflow/overlay/route.ts already exists',
  );

  const providerCreated = createFileIfMissing(
    path.join(cwd, 'app', 'shipflow-overlay-provider.tsx'),
    PROVIDER_TEMPLATE,
  );
  console.log(
    providerCreated
      ? '✓ Created app/shipflow-overlay-provider.tsx'
      : '• app/shipflow-overlay-provider.tsx already exists',
  );

  const readmeCreated = createFileIfMissing(
    path.join(cwd, 'SHIPFLOW_SETUP.md'),
    README_TEMPLATE,
  );
  console.log(
    readmeCreated
      ? '✓ Added SHIPFLOW_SETUP.md'
      : '• SHIPFLOW_SETUP.md already exists',
  );

  const envAppended = appendEnvHint(path.join(cwd, '.env.example'), agentPath);
  console.log(
    envAppended
      ? '✓ Added CURSOR_AGENT_BIN hint to .env.example'
      : '• .env.example already contains CURSOR_AGENT_BIN',
  );

  console.log('\nNext steps:');
  console.log(
    '  1. Wrap your next.config with withShipflowOverlay from @shipflow/overlay/next.',
  );
  console.log(
    '  2. Import ShipflowOverlay from app/shipflow-overlay-provider and render it inside app/layout.tsx (development only).',
  );
  console.log('  3. Restart your dev server.');
}

async function main() {
  const [, , command] = process.argv;

  switch (command) {
    case 'init':
      await runInit();
      break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      console.log(HELP_TEXT);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP_TEXT);
      process.exitCode = 1;
  }
}

void main();
