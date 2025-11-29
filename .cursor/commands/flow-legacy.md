# Cursor Agent Overlay in Context

## Overview

Set up **@shipflow/overlay** in a Next.js App Router project so the Cursor Agent can select components via React grab (hold `CMD + C`) and edit anything in context.

Use this command to:

- Detect the correct Next.js app (in monorepos)
- Install and configure `@shipflow/overlay` at the latest version
- Wire up the API route and config
- Render the overlay provider and component in the root layout
- Verify everything is ready for in-context editing

Any text the user types after this command should be treated as **additional requirements or context** (e.g., “use JS instead of TS”, “we use pnpm”, “target the marketing app”, etc.).

---

## Preconditions

Before making changes, follow these checks:

0. **Detect monorepo & target Next.js app**
   - Check if the project appears to be a monorepo, for example by the presence of:
     - A root `package.json` with `workspaces`/`packages`
     - Tooling config such as `turbo.json`, `nx.json`, or multiple `apps/`/`packages/` directories
   - If the project is **not** a monorepo, treat the current workspace as the single Next.js app and continue.
   - If the project **is** a monorepo or there might be **multiple Next.js instances**:
     - **Pause and ask the user** which app to configure, e.g.:
       - “This looks like a monorepo with multiple apps. Which app should I add Shipflow overlay to? (e.g. `apps/web`, `apps/dashboard`, etc.)”
     - Once the user responds, treat that path as the **target Next.js app root** for all further steps (layout, app directory, next config, etc.).

1. **Verify Next.js + App Router**
   - In the **target app** (from step 0 if monorepo):
     - Confirm `next` exists in that app’s `package.json` dependencies or devDependencies.
     - Confirm an App Router structure exists in that app:
       - `app/` **or** `src/app/`
   - If the target project is **not** using the App Router, clearly explain the limitation and **abort** without making changes.

2. **Verify `cursor-agent` CLI availability**
   - Try to detect that the `cursor-agent` CLI is available in `PATH` (for example by using the terminal to run `cursor-agent --version`).
   - If not found, check whether the `CURSOR_AGENT_BIN` environment variable is set (or instruct the user to set it).
   - If neither is available:
     - Warn the user that the overlay will not function correctly without the CLI.
     - Ask whether to continue configuration anyway or stop.

---

## Installation

3. **Install `@shipflow/overlay` as a dev dependency**
   - From the **root of the target app’s package** (or monorepo root if that’s where dependencies are managed), detect the package manager using lockfiles:
     - `pnpm-lock.yaml` → `pnpm add -D @shipflow/overlay`
     - `yarn.lock` → `yarn add -D @shipflow/overlay`
     - `bun.lockb` → `bun add -d @shipflow/overlay`
     - Default → `npm install -D @shipflow/overlay`
   - use @latest to get the latest version
   - Match existing project conventions (e.g., `packageManager` field in `package.json` if present).

---

## Implementation Steps

4. **Create Shipflow overlay API route**
   - In the **target app**, determine the correct App Router path:
     - Prefer `app/api/shipflow/overlay/route.ts`
     - If the project uses JavaScript, use `route.js` instead.
   - Create or update this route file with the following code:

     ```ts
     import { handleShipflowOverlay } from '@shipflow/overlay/next';

     export const runtime = 'nodejs';
     export const dynamic = 'force-dynamic';

     export const POST = handleShipflowOverlay();
     ```

   - Keep code style consistent with the rest of the project (TS vs JS, semicolons, quotes, etc.).

5. **Wrap Next config with `withShipflowOverlay`**
   - Locate the Next config for the **target app**:
     - Common patterns:
       - Monorepo app config: `apps/<app-name>/next.config.ts|mjs|js`
       - Single app: `next.config.ts` or `next.config.mjs` or `next.config.js` at the project root
   - Import `withShipflowOverlay` from `@shipflow/overlay/next`.
   - Wrap the existing config export, for example:
     - example:
       ```ts
       const nextConfig = {
         /* existing config */
       };

       export default withShipflowOverlay(nextConfig);
       ```

   - Preserve all existing config options and plugins and match the existing module format

6. **Create a client component for `ShipflowOverlay` and render it in the root layout**
   - **Step 6a: Create the client component**
     - In the **target app**, create a new client component file:
       - Prefer `components/shipflow-overlay.tsx` or `src/components/shipflow-overlay.tsx` (match the project's component directory structure).
       - If the project uses JavaScript, use `.tsx` → `.jsx` accordingly.
     - Create the component with the following code:

       ```tsx
       'use client';

       import { ShipflowOverlay } from '@shipflow/overlay';

       export function ShipflowOverlayWrapper() {
         return <ShipflowOverlay />;
       }
       ```

     - Keep code style consistent with the rest of the project (TS vs JS, semicolons, quotes, etc.).

   - **Step 6b: Render the component in the root layout**
     - In the **target app**, find the root layout:
       - `app/layout.tsx` or `src/app/layout.tsx`.
     - Use `next/dynamic` to dynamically import the `ShipflowOverlayWrapper` component only in development.
     - **IMPORTANT**: Check if the layout file contains `"use client"` directive:
       - **If the layout has `"use client"`** (Client Component): You can use `{ ssr: false }` in the dynamic options.
       - **If the layout does NOT have `"use client"`** (Server Component): You MUST NOT use `ssr: false`. Either omit the `ssr` option entirely or omit the options object completely. Server Components cannot use `ssr: false` with `next/dynamic`.
     - Example implementation:

       ```tsx
       import dynamic from 'next/dynamic';

       const ShipflowOverlayWrapper = dynamic(() =>
         import('./components/shipflow-overlay').then(
           (mod) => mod.ShipflowOverlayWrapper
         )
       );

       export default function RootLayout({ children }) {
         return (
           <html>
             <body>
               {children}
               {process.env.NODE_ENV === 'development' && (
                 <ShipflowOverlayWrapper />
               )}
             </body>
           </html>
         );
       }
       ```

     

     - Adjust the import path to match the project's component directory structure (e.g., `@/components/shipflow-overlay` if using path aliases, or `../components/shipflow-overlay` if relative paths are used).
     - Keep the JSX structure and styling consistent with existing layout conventions.

---

## Style & Safety

- **Match code style**:
  - Follow the project’s existing patterns:
    - TypeScript vs JavaScript
    - ESM vs CommonJS
    - Semicolons / no semicolons
    - Import order and alias usage
- **Be explicit about changes**:
  - When editing files, briefly explain what was changed and why.
  - If you’re unsure about an existing pattern, choose the most consistent option based on nearby code.

---

## Final Reminders

- Remind the user to **restart the Next.js dev server** for the **target app** after:
  - Installing dependencies
  - Changing `next.config.*`
  - Adding the new API route
- Suggest verifying the overlay by:
  - Running the dev server
  - Opening the app in the browser
  - Using **React grab** (`CMD + C`) to select components and confirm in-context editing works.

---

## Completion Checklist

Use this checklist to verify everything is correctly set up:

- [ ] Monorepo checked; target Next.js app confirmed (if applicable)
- [ ] Project verified as Next.js App Router (`app/` or `src/app/`) in the target app
- [ ] `cursor-agent` CLI or `CURSOR_AGENT_BIN` verified (or user warned)
- [ ] `@shipflow/overlay` installed as a dev dependency using the correct package manager (in the correct package)
- [ ] `app/api/shipflow/overlay/route.(ts|js)` in the target app created with the exact code from step 4
- [ ] The target app's `next.config.*` wrapped with `withShipflowOverlay` while preserving existing config
- [ ] Client component created (`components/shipflow-overlay.tsx` or `src/components/shipflow-overlay.tsx`) with `"use client"` directive that imports `ShipflowOverlay` from `@shipflow/overlay`
- [ ] Target app's root layout updated to dynamically import and render the `ShipflowOverlayWrapper` component only in development using `next/dynamic`
- [ ] User reminded to restart the dev server
