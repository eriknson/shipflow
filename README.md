# @shipflow/overlay

Shipflow combines React Grab with Cursor Agent so any React project can select and edit components in context.

## Installation

```bash
npm install -D @shipflow/overlay
```

## Quickstart

1. **Wrap your Next config**:

   ```ts
   // next.config.ts
   import { withShipflowOverlay } from "@shipflow/overlay/next";

   const nextConfig = {
     /* your config */
   };

   export default withShipflowOverlay(nextConfig, {
     logClipboardEndpoint: "/api/log-clipboard",
   });
   ```

2. **Expose the provider**:

   ```tsx
   // app/shipflow-overlay-provider.tsx
   'use client';
   import { FlowOverlayProvider } from "@shipflow/overlay";

   export function ShipflowOverlay() {
     return <FlowOverlayProvider />;
   }
   ```

3. **Render in your layout (dev only)**:

   ```tsx
   // app/layout.tsx
   import { ShipflowOverlay } from "./shipflow-overlay-provider";

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     const enabled =
       process.env.NODE_ENV === "development" ||
       process.env.SHIPFLOW_OVERLAY_ENABLED === "true";

     return (
       <html lang="en">
         <body>
           {children}
           {enabled ? <ShipflowOverlay /> : null}
         </body>
       </html>
     );
   }
   ```

4. **Wire the API route**:

   ```ts
   // app/api/shipflow/overlay/route.ts
   import { createNextHandler } from "@shipflow/overlay/next";

   export const runtime = "nodejs";
   export const dynamic = "force-dynamic";
   export const POST = createNextHandler();
   ```

5. **Cursor CLI**: The package automatically searches for `cursor-agent` in PATH and common installation directories. If not found, set `CURSOR_AGENT_BIN` to the absolute path.

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

