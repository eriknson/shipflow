# Shipflow

**Point-and-click editing for Next.js, powered by Cursor Agent.**

Hold `⌘+C`, click any component, describe the change → Cursor edits the code.

## Setup

### 1. Install Cursor Agent CLI

```bash
# In Cursor, run:
cursor-agent login
```

### 2. Add Shipflow to your Next.js app

```bash
npm install @shipflow/overlay
```

```ts
// next.config.ts
import { withShipflowOverlay } from "@shipflow/overlay/next";
export default withShipflowOverlay({ /* your config */ });
```

```tsx
// app/layout.tsx
import { FlowOverlayProvider } from "@shipflow/overlay";

export default function RootLayout({ children }) {
  return (
    <html><body>
      {children}
      {process.env.NODE_ENV === "development" && <FlowOverlayProvider />}
    </body></html>
  );
}
```

```ts
// app/api/shipflow/overlay/route.ts
import { createNextHandler } from "@shipflow/overlay/next";
export const POST = createNextHandler();
```

### 3. Use it

Run `npm run dev`, hold `⌘+C`, click any element, type your change.

---

**This repo** is an R&D sandbox with a [shadcn dashboard](https://ui.shadcn.com/) for testing Shipflow in context.

MIT © Shipflow
