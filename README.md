# Mannaka QR

真ん中 (mannaka): right in the middle. A browser tool that makes QR codes with your own text in the center, and sizes that text so phones can still scan the code.

The label is not a picture pasted on top. For each code the app works out which squares the label actually flips, counts them against each error-correction block's recovery budget, and finds the largest label that leaves half the budget spare. Every result is then decoded with jsQR to confirm it still reads.

Everything runs in the browser: no server, no uploads.

Built with plain JavaScript modules, bundled by Vite into a single HTML file.

## Features

- Content types: link, text, email, phone, SMS, WiFi, contact (vCard), location, or a pasted list for many codes at once. Until there's content, a gray placeholder shows the current style
- In the middle: text (bold, condensed or monospace, with Japanese support from Noto Sans JP) or a logo. A logo is sized with the same damage-allowance math as text
- Corner eye centers: a shape, or a logo (the middle one, or a different image). A corner logo has to read as dark and solid, and the app checks that
- Colors, gradients (direction picked from swatches), dot shapes and corner-eye shapes, with a contrast warning
- PNG, SVG and PDF downloads. The list mode downloads a zip or a multi-page PDF
- Print sheets at an exact printed size with cut lines, plus a PDF fallback when printing is blocked
- Side by side on desktops and tablets. On phones, a small copy of the code stays pinned in the corner while you scroll the settings
- Inputs and logos are remembered in `localStorage`

## Project structure

```
mannaka-qr/
├── index.html            # Markup for the whole page
├── vite.config.js        # Single-file build, sitemap.xml / robots.txt, jsPDF extras stubbed out
├── .env.example          # SITE_URL for the sitemap
├── .github/workflows/
│   └── deploy.yml        # Build and publish to GitHub Pages on push to main
└── src/
    ├── main.js           # Entry: wires controls, restores saved inputs, first draw
    ├── state.js          # Shared UI state (mode, content tab, zoom, button groups)
    ├── form.js           # Reads settings from the form: opts(), getSize(), which label or logo to use
    ├── content.js        # Content tabs → the text the QR holds; list parsing
    ├── preview.js        # Single-code preview and list sheet, scan status, redraw scheduling
    ├── panels.js         # Step summaries, label-size bar, color and size hints, zoom
    ├── exporting.js      # PNG / SVG / PDF / zip downloads
    ├── print.js          # Print sheet, PDF fallback, print hints
    ├── images.js         # Uploaded logos: shrink, trim, remember
    ├── pin.js            # Phones: pinned copy of the preview
    ├── storage.js        # Remember inputs in this browser
    ├── files.js          # Save a file (Claude artifact downloads, or a normal download)
    ├── styles.css
    ├── ui/dom.js         # $, toast, setStatus
    ├── qr/
    │   ├── engine.js     # Grid choice + label sizing against the error-correction budget
    │   ├── shapes.js     # Dot and eye geometry (shared by canvas, SVG, icons)
    │   ├── render.js     # Draw to canvas, or build SVG
    │   ├── verify.js     # jsQR scan check, corner logo check
    │   └── fonts.js      # Label fonts and web-font loading
    └── vendor/
        ├── qrcode.js     # qrcode-generator 2.0.4, patched (see below)
        └── unused.js     # Empty stand-in for jsPDF's optional html2canvas / dompurify / canvg
```

## Running

```bash
npm install
npm run dev       # dev server with HMR -> http://localhost:5173
npm run build     # -> dist/index.html (everything inlined) + dist/sitemap.xml
npm run preview   # serve dist/
```

`dist/index.html` is self-contained apart from Google Fonts, so it can be hosted anywhere static or published as a Claude artifact.

## Deploying

Pushing to `main` builds and publishes the site to GitHub Pages at **https://aumsaur.github.io/mannaka-qr/**, through `.github/workflows/deploy.yml`. You can also run the workflow by hand from the Actions tab.

One-time setup on a new repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Until then the "Setup Pages" step fails.

The workflow sets `SITE_URL` from the repo's Pages address, so the sitemap follows the repo name or a custom domain without any config.

## Sitemap and search indexing

The build writes `dist/sitemap.xml` for the address in `SITE_URL`. On GitHub Pages the workflow sets it for you. For local builds the default is `https://aumsaur.github.io/mannaka-qr/`. To change it, copy `.env.example` to `.env` and edit it, or run:

```bash
SITE_URL=https://qr.example.com/ npm run build
```

When `SITE_URL` is the root of a domain, the build also writes `robots.txt` pointing at the sitemap. Crawlers only read `robots.txt` at the domain root, so the file is skipped for a sub-path like a GitHub project page.

Google doesn't require you to submit anything. It finds pages through links, so a link from your GitHub profile or a repo README is enough, but that can take weeks. To speed it up and see the page's status:

1. Deploy the site.
2. In [Google Search Console](https://search.google.com/search-console), add a **URL prefix** property for `SITE_URL`. To verify it, either add the `<meta name="google-site-verification">` tag it gives you to `index.html`, or put its HTML file in a `public/` folder (Vite copies `public/` into `dist/` as-is). Then rebuild and deploy.
3. Under **Sitemaps**, submit `sitemap.xml`.
4. Under **URL Inspection**, enter the page URL and click **Request indexing**.

[Bing Webmaster Tools](https://www.bing.com/webmasters) can import the property straight from Search Console.

## The patched QR library

`src/vendor/qrcode.js` is [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 2.0.4 with small additions, each marked `Mannaka QR`:

- `qr.getCodewordMap()`: for every module, the index of the codeword it carries. This is how the sizing knows which error-correction block a covered square costs.
- `qr.getTypeNumber()`: the version chosen by `make()`.
- `getRSBlocks(typeNumber, level)`: the block layout for a version and level.
- `stringToBytesUTF8`: the UTF-8 encoder from the package's `qrcode_UTF8.mjs`.

To update the library, re-apply those additions to the new version's `dist/qrcode.mjs`.

## Credits

- [QR Code Generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase, MIT
- [jsQR](https://github.com/cozmo/jsQR) by Cosmo Wolfe, Apache 2.0
- [JSZip](https://github.com/Stuk/jszip) by Stuart Knightley and contributors, MIT
- [jsPDF](https://github.com/parallax/jsPDF) by James Hall, yWorks GmbH and contributors, MIT
- Typefaces Archivo, JetBrains Mono and Noto Sans JP, SIL Open Font License

QR Code is a registered trademark of DENSO WAVE INCORPORATED.
