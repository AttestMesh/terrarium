import type { APIRoute } from "astro";
import { allIntegrations, byCategory } from "../lib/catalog.ts";

// Item + hub pages only — never the client-side filter fragments (no crawlable
// result URLs), so the catalog can't generate thin/zero-result indexable pages.
export const GET: APIRoute = ({ site }) => {
  const paths = [
    "/",
    ...[...byCategory().keys()].map((c) => `/categories/${c}`),
    ...allIntegrations().map((i) => `/specimens/${i.id}`),
  ];
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paths.map((p) => `  <url><loc>${new URL(p, site).href}</loc></url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};
