import type { APIRoute } from "astro";
import { url } from "../lib/url.ts";

// Allow the item + hub pages; point crawlers at the sitemap. Never disallow a page
// we mean to index.
export const GET: APIRoute = ({ site }) => {
  const body = `User-agent: *\nAllow: /\nSitemap: ${new URL(url("/sitemap.xml"), site).href}\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
};
