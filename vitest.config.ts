import { getViteConfig } from "astro/config";

// Clones the house config (dstack-info): happy-dom, globals, e2e excluded so
// Playwright specs under ./e2e never run under Vitest.
export default getViteConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{astro,idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,e2e,playwright-report,test-results}.config.*",
      "**/e2e/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", ".astro/", "e2e/", "**/*.config.*", "**/.*"],
    },
  },
});
