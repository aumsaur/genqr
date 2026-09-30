import { defineConfig, loadEnv } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { fileURLToPath } from "node:url";

// Where the built page is served. Used for sitemap.xml (and robots.txt when it's the domain root).
// Set SITE_URL in .env, or: SITE_URL=https://example.com/ npm run build
const DEFAULT_SITE_URL = "https://aumsaur.github.io/genqr/";

const unused = fileURLToPath(new URL("./src/vendor/unused.js", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    // Everything (scripts, styles) is inlined into one index.html, like the original draft
    plugins: [viteSingleFile(), sitemap(env.SITE_URL || DEFAULT_SITE_URL)],
    resolve: {
      alias: { html2canvas: unused, dompurify: unused, canvg: unused }
    }
  };
});

// Emits sitemap.xml next to index.html. robots.txt is only read at the root of a domain,
// so it's emitted (pointing at the sitemap) only when the site lives there.
function sitemap(siteUrl) {
  const url = new URL(siteUrl);
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  const loc = url.href.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return {
    name: "genqr-sitemap",
    apply: "build",
    generateBundle() {
      const lastmod = new Date().toISOString().slice(0, 10);
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source:
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>\n` +
          "</urlset>\n"
      });
      if (url.pathname === "/") {
        this.emitFile({
          type: "asset",
          fileName: "robots.txt",
          source: `User-agent: *\nAllow: /\n\nSitemap: ${url.href}sitemap.xml\n`
        });
      }
    }
  };
}
