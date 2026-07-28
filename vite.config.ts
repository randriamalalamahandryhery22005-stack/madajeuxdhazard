// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";

export default defineConfig({
  // Deployment target. Inside Lovable the preset is always Cloudflare; on an
  // external CI (Netlify, EdgeOne, …) set NITRO_PRESET to pick the target,
  // e.g. NITRO_PRESET=netlify or NITRO_PRESET=static.
  nitro: process.env.NITRO_PRESET
    ? { preset: process.env.NITRO_PRESET }
    : true,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        // Compatibility shim so the ported pages keep their original imports.
        "react-router-dom": path.resolve(
          import.meta.dirname,
          "./src/compat/react-router-dom.tsx",
        ),
      },
    },
  },
});
