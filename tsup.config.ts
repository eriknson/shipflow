import { defineConfig } from 'tsup';

export default defineConfig([
  // Main entry point - exports client components, needs "use client"
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    banner: {
      js: "'use client';",
    },
  },
  // Register entry point - exports client utilities, needs "use client"
  {
    entry: ['src/register.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: false, // Don't clean on subsequent entries
    banner: {
      js: "'use client';",
    },
  },
  // Next.js entry point - server-side only, no "use client" needed
  {
    entry: ['src/next.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: false,
  },
  // CLI entry point - Node.js CLI tool, no "use client" needed
  {
    entry: ['src/cli.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: false,
  },
]);

