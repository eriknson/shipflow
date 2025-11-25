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

5. **Install the Cursor CLI**: make sure `cursor-agent` is in your `PATH`, or set `CURSOR_AGENT_BIN` to the absolute path.

## CLI helper

The package ships with a scaffold command:

```bash
npx shipflow-overlay init
```

It checks for the Cursor CLI, creates the provider and API route stubs, and appends a `CURSOR_AGENT_BIN=` line to `.env.example`.

## License

MIT © Shipflow

