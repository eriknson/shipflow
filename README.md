# Shipflow

Point-and-click editing for Next.js, powered by [Cursor Agent](https://cursor.com/blog/cli) and [React Grab](https://www.react-grab.com/).

Hold `⌘+C`, click any component, describe the change → Cursor edits the code in context.

This repo is an R&D sandbox with a [shadcn dashboard](https://ui.shadcn.com/) for testing [@shipflow/overlay](https://www.npmjs.com/package/@shipflow/overlay).

## Install in one click

Save the [flow command]([https://cursor.com/link/command?name=flow&text=%23+Cursor+Agent+overlay+in+context%0A%0AInstalls+%40shipflow%2Foverlay+for+selecting+components+with+react+grab+(hold+CMD%2BC)+so+you+can+edit+anything+in+context.%0A%0ASteps%3A%0A-+Verify+eligibility+first%3A+Check+for+next+in+package.json+and+app%2F+or+src%2Fapp%2F+directory.+Abort+if+not+App+Router.%0A-+Verify+cursor-agent+CLI+is+in+PATH+or+set+CURSOR_AGENT_BIN+env+var+(warn+if+missing)%0A-+npm+install+-D+%40shipflow%2Foverlay+(detect+package+manager+from+lockfiles)%0A-+Create+app%2Fapi%2Fshipflow%2Foverlay%2Froute.ts%3A+import+%7B+createNextHandler+%7D+from+%22%40shipflow%2Foverlay%2Fnext%22%2C+set+runtime+%3D+%22nodejs%22%2C+dynamic+%3D+%22force-dynamic%22%2C+and+export+POST+%3D+createNextHandler()%0A-+Create+app%2Fshipflow-overlay-provider.tsx+with+use+client+directive+exporting+FlowOverlayProvider+from+%40shipflow%2Foverlay%0A-+Wrap+next.config+with+withShipflowOverlay+from+%40shipflow%2Foverlay%2Fnext%0A-+Render+ShipflowOverlay+component+in+root+layout+after+children%0A%0AMatch+code+style.+Remind+user+to+restart+dev+server.%0A%0AChecklist%3A+Cursor+CLI+verified%2C+Installed%2C+API+route%2C+Provider%2C+Config+wrapped%2C+Layout+updated](https://cursor.com/link/command?name=flow&text=%23+Cursor+Agent+overlay+in+context%0A%0AInstalls+%40shipflow%2Foverlay+for+selecting+components+with+react+grab+(hold+CMD%2BC)+so+you+can+edit+anything+in+context.%0A%0ASteps%3A%0A-+Verify+eligibility+first%3A+Check+for+next+in+package.json+and+app%2F+or+src%2Fapp%2F+directory.+Abort+if+not+App+Router.%0A-+Verify+cursor-agent+CLI+is+in+PATH+or+set+CURSOR_AGENT_BIN+env+var+(warn+if+missing)%0A-+npm+install+-D+%40shipflow%2Foverlay+(detect+package+manager+from+lockfiles)%0A-+Create+app%2Fapi%2Fshipflow%2Foverlay%2Froute.ts+with+this+code%3A+import+%7B+createNextHandler+%7D+from+%22%40shipflow%2Foverlay%2Fnext%22%3B+export+const+runtime+%3D+%22nodejs%22%3B+export+const+dynamic+%3D+%22force-dynamic%22%3B+export+const+POST+%3D+createNextHandler()%3B%0A-+Create+app%2Fshipflow-overlay-provider.tsx+with+use+client+directive+exporting+FlowOverlayProvider+from+%40shipflow%2Foverlay%0A-+Wrap+next.config+with+withShipflowOverlay+from+%40shipflow%2Foverlay%2Fnext%0A-+Render+ShipflowOverlay+component+in+root+layout+after+children%0A%0AMatch+code+style.+Remind+user+to+restart+dev+server.%0A%0AChecklist%3A+Cursor+CLI+verified%2C+Installed%2C+API+route%2C+Provider%2C+Config+wrapped%2C+Layout+updated)) → then run `/flow` in Cursor via the agent chat.

## Manual Setup

**1. Install Cursor Agent CLI**

```bash
curl https://cursor.com/install -fsSL | bash
cursor-agent login
```

**2. Add Shipflow to your Next.js app**

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

**3. Use it**

Run `npm run dev`, hold `⌘+C`, click any element, type your change.

MIT © Shipflow
