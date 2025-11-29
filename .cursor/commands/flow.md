# Shipflow Overlay Setup

Configure @shipflow/overlay in a Next.js App Router project for in-context component editing.

Steps:

1. Detect monorepo and identify the target Next.js app - ask if ambiguous

2. Verify App Router exists and next is in package.json. Abort if not App Router, explain this only works with App Router, and suggest refactoring

3. Verify cursor-agent CLI is available and authenticated via cursor-agent --version, or check if CURSOR_AGENT_BIN env is set. Warn and install if missing

4. Install @shipflow/overlay at latest as a dev dependency using the project package manager

5. Create API route at app/api/shipflow/overlay/route.ts by importing createNextHandler from @shipflow/overlay/next, setting runtime to nodejs, setting dynamic to force-dynamic, and exporting POST as the result of calling createNextHandler directly. The createNextHandler function returns a route handler function that already handles all request/response logic, so it should be exported directly rather than being called inside another function.

6. Wrap Next config by importing withShipflowOverlay from @shipflow/overlay/next, passing it the existing Next configuration object, and making the wrapped result the default export

7. Create client component at components/shipflow-overlay.tsx that starts with use client directive, imports ShipflowOverlay from @shipflow/overlay and useEffect/useState from react, exposes a ShipflowOverlayWrapper component that uses a mounted state initialized to false, sets mounted to true in a useEffect on mount, returns null if not mounted, and returns the ShipflowOverlay component when mounted. This pattern ensures client-only rendering without using next/dynamic with ssr:false which is forbidden in Server Components

8. Update root layout by directly importing ShipflowOverlayWrapper from the components/shipflow-overlay file and rendering that wrapper inside body during dev only

9. Match the project code style for TS/JS, semicolons, and imports. Remind the user to restart the dev server when done to use the shipflow agent overlay by holding CMD C on the localhost frontend