import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";

// Static catalog: the "read API" is static JSON emitted into ./public + generated
// pages. SEO is load-bearing, so output is fully static/prerendered.
// `site` powers absolute canonical URLs + sitemap; override via TERRARIUM_SITE at build.
export default defineConfig({
  site: process.env.TERRARIUM_SITE ?? "https://terrarium.example",
  output: "static",
  integrations: [svelte()],
  vite: {
    plugins: [tailwindcss()],
  },
});
