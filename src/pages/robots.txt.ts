import type { APIRoute } from "astro";

// Allow the item + hub pages; point crawlers at the sitemap. Never disallow a page
// we mean to index.
export const GET: APIRoute = ({ site }) => {
  const body = `User-agent: *\nAllow: /\nSitemap: ${new URL("/sitemap.xml", site).href}\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
};
