# @shipflow/overlay

Shipflow combines React Grab with Cursor Agent so any React project can select and edit components in context.

## What is React Grab?

React Grab is a powerful browser-based tool that enables you to select React components directly from your running application. When you hold **CMD+C** (or **Ctrl+C** on Windows/Linux) while hovering over a component, React Grab captures:

- **HTML Frame**: The rendered HTML structure of the selected component
- **Code Location**: The exact file path and line numbers where the component is defined

This captured information is then seamlessly sent to Cursor Agent, allowing you to edit components with full context awareness. The overlay provides visual feedback with highlighted outlines and shimmer effects when components are selected, making it easy to see what you're working with.

React Grab works by intercepting clipboard operations and extracting component metadata from React's component tree, enabling a smooth workflow from visual selection to code editing.

## Installation

```bash
npm install -D @shipflow/overlay
```

## Quickstart

1. **Wrap your Next config**:

   ```ts
   // next.config.ts
   import { withShipflowOverlay } from '@shipflow/overlay/next';

   const nextConfig = {
     /* your config */
   };

   export default withShipflowOverlay(nextConfig, {
     logClipboardEndpoint: '/api/log-clipboard',
   });
   ```

2. **Render `ShipflowOverlay` in your root layout**:

   Import `ShipflowOverlay` directly from `@shipflow/overlay` using `next/dynamic` for optimal performance. The implementation differs based on whether your layout is a Server Component or Client Component:

   **For Server Component layouts** (no `"use client"` directive):

   ```tsx
   // app/layout.tsx
   import dynamic from 'next/dynamic';

   const ShipflowOverlay = dynamic(() =>
     import('@shipflow/overlay').then((mod) => ({
       default: mod.ShipflowOverlay,
     })),
   );

   export default function RootLayout({
     children,
   }: {
     children: React.ReactNode;
   }) {
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

   **For Client Component layouts** (has `"use client"` directive):

   ```tsx
   // app/layout.tsx
   'use client';

   import dynamic from 'next/dynamic';

   const ShipflowOverlay = dynamic(
     () =>
       import('@shipflow/overlay').then((mod) => ({
         default: mod.ShipflowOverlay,
       })),
     { ssr: false },
   );

   export default function RootLayout({
     children,
   }: {
     children: React.ReactNode;
   }) {
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

3. **Wire the API route**:

   ```ts
   // app/api/shipflow/overlay/route.ts
   import { createNextHandler } from '@shipflow/overlay/next';

   export const runtime = 'nodejs';
   export const dynamic = 'force-dynamic';
   export const POST = createNextHandler();
   ```

4. **Cursor CLI**: The package automatically searches for `cursor-agent` in PATH and common installation directories. If not found, set `CURSOR_AGENT_BIN` to the absolute path.

## CLI helper

```bash
npx shipflow-overlay init
```

Scaffolds the provider and API route, checks for `cursor-agent`, and adds `CURSOR_AGENT_BIN` to `.env.example`.

## Configuration

**Next.js config:**

```ts
withShipflowOverlay(config, {
  enableInProduction?: boolean;  // Enable in production (default: false)
});
```

**API handler:**

```ts
createNextHandler({
  cursorAgentBinary?: string;     // Custom binary path
  timeoutMs?: number;             // Timeout in ms (default: 240000)
  allowInProduction?: boolean;    // Allow in production (default: false)
});
```

**Environment variables:**

- `CURSOR_AGENT_BIN`: Absolute path to `cursor-agent` (if not in PATH)
- `SHIPFLOW_OVERLAY_ENABLED`: Set to `"true"` to enable overlay
- `SHIPFLOW_OVERLAY_AGENT_TIMEOUT_MS`: Timeout in milliseconds

## License

MIT © Shipflow
