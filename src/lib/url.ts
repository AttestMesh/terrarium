// Prefix an absolute site path with the configured base so internal links work both
// at root (tailnet/local) and under a subpath ("/terrarium" on GitHub Pages). Astro
// auto-prefixes its own bundled assets, but NOT raw <a href> strings — use this.
const BASE = import.meta.env.BASE_URL; // "/" or "/terrarium/"

export function url(path = "/"): string {
  const base = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE; // "" or "/terrarium"
  return base + (path.startsWith("/") ? path : `/${path}`);
}
