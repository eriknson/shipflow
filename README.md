# @shipflow/overlay

A Next.js overlay that integrates React Grab with Cursor Agent, enabling visual component selection and context-aware editing directly from your running application.

## Overview

Select React components in your browser using **CMD+C** (or **Ctrl+C** on Windows/Linux) while hovering. The overlay captures component metadata—rendered HTML and source location—and sends it to Cursor Agent for editing with full context.

## Installation

```bash
npm install -D @shipflow/overlay
```

## Quickstart

### Option 1: Use the CLI (Recommended)

```bash
npx shipflow-overlay init
```

This scaffolds the necessary files and checks for `cursor-agent`.

### Option 2: Manual Setup

1. **Wrap your Next.js config:**

   ```ts
   // next.config.ts
   import { withShipflowOverlay } from '@shipflow/overlay/next';

   export default withShipflowOverlay({
     /* your config */
   });
   ```

2. **Add the overlay to your root layout:**

   **Server Component layout:**

   ```tsx
   // app/layout.tsx
   import dynamic from 'next/dynamic';

   const ShipflowOverlay = dynamic(() =>
     import('@shipflow/overlay').then((mod) => ({
       default: mod.ShipflowOverlay,
     })),
   );

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en">
         <body>
           {children}
           {process.env.NODE_ENV === 'development' && <ShipflowOverlay />}
         </body>
       </html>
     );
   }
   ```

   **Client Component layout:**

   ```tsx
   // app/layout.tsx
   'use client';

   import dynamic from 'next/dynamic';

   const ShipflowOverlay = dynamic(
     () => import('@shipflow/overlay').then((mod) => ({ default: mod.ShipflowOverlay })),
     { ssr: false },
   );

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en">
         <body>
           {children}
           {process.env.NODE_ENV === 'development' && <ShipflowOverlay />}
         </body>
       </html>
     );
   }
   ```

3. **Create the API route:**

   ```ts
   // app/api/shipflow/overlay/route.ts
   import { createNextHandler } from '@shipflow/overlay/next';

   export const runtime = 'nodejs';
   export const dynamic = 'force-dynamic';
   export const POST = createNextHandler();
   ```

4. **Configure Cursor Agent:**

   The package automatically searches for `cursor-agent` in PATH. If not found, set `CURSOR_AGENT_BIN` in your environment:

   ```bash
   CURSOR_AGENT_BIN=/path/to/cursor-agent
   ```

## Configuration

### Next.js Config

```ts
withShipflowOverlay(config, {
  enableInProduction?: boolean; // default: false
});
```

### API Handler

```ts
createNextHandler({
  cursorAgentBinary?: string;    // Custom binary path
  timeoutMs?: number;             // default: 240000
  allowInProduction?: boolean;    // default: false
});
```

### Environment Variables

- `CURSOR_AGENT_BIN` - Absolute path to `cursor-agent` (if not in PATH)
- `SHIPFLOW_OVERLAY_ENABLED` - Set to `"true"` to enable overlay
- `SHIPFLOW_OVERLAY_AGENT_TIMEOUT_MS` - Timeout in milliseconds

## License

MIT © Shipflow
