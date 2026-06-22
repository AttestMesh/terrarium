import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";

// Static catalog: the "read API" is static JSON emitted into ./public + generated
// pages. SEO is load-bearing, so output is fully static/prerendered.
// `site` powers absolute canonical URLs + sitemap; override via TERRARIUM_SITE at build.
export default defineConfig({
  // `||`, not `??`: an unset GitHub repo variable expands to "" in CI (a non-null
  // empty string), which Astro rejects as an invalid URL. Treat "" as unset.
  site: process.env.TERRARIUM_SITE || "https://terrarium.example",
  // "/" at root (tailnet/local); "/terrarium" on GitHub Pages (project subpath).
  base: process.env.TERRARIUM_BASE || "/",
  output: "static",
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
    // allow the dev/preview server to answer requests addressed to the tailnet host
    preview: { allowedHosts: [".tail39cb2e.ts.net"] },
    server: { allowedHosts: [".tail39cb2e.ts.net"] },
  },
});
