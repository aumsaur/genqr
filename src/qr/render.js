// Paint a code: to a canvas (preview, PNG, print, PDF) or as SVG markup
import { QUIET, layoutCode, labelPos, imageRect, infoFrom } from "./engine.js";
import { f2, codePaths, eyeCenters } from "./shapes.js";
import { FONTS, FONT_CSS_URL, fontString, applyStretch } from "./fonts.js";

// Where a gradient runs, shared by canvas and SVG
function gradGeom(opt, s, n){
  var a = QUIET * s, z = (QUIET + n) * s, m = (a + z) / 2;
  switch (opt.dir) {
    case "tb":  return { kind: "linear", x1: 0, y1: a, x2: 0, y2: z };
    case "dd":  return { kind: "linear", x1: a, y1: a, x2: z, y2: z };
    case "du":  return { kind: "linear", x1: a, y1: z, x2: z, y2: a };
    case "rad": return { kind: "radial", cx: m, cy: m, r: (z - a) * 0.72 };
    default:    return { kind: "linear", x1: a, y1: 0, x2: z, y2: 0 };
  }
}
function makeFill(ctx, opt, s, n){
  if (opt.codeMode !== "gradient") return opt.fg;
  var G = gradGeom(opt, s, n), g;
  g = G.kind === "radial" ? ctx.createRadialGradient(G.cx, G.cy, 0, G.cx, G.cy, G.r) : ctx.createLinearGradient(G.x1, G.y1, G.x2, G.y2);
  g.addColorStop(0, opt.fg); g.addColorStop(1, opt.fg2);
  return g;
}

// Fit a logo inside a square, keeping its shape
function fitInside(pic, r){
  var k = Math.min(r.w / pic.w, r.h / pic.h), w = pic.w * k, h = pic.h * k;
  return { x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, w: w, h: h };
}

// label: text, or a logo from src/images.js. opt.cornerImg: a logo for the corner eye centers, or null.
export function drawCode(canvas, data, label, opt, px){
  var L = layoutCode(data, label, opt, px), P = codePaths(L, opt);
  canvas.width = px; canvas.height = px; canvas._n = L.n;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = opt.bg; ctx.fillRect(0, 0, px, px);
  var fill = makeFill(ctx, opt, L.s, L.n);
  var custom = opt.eyeMode === "custom";
  ctx.fillStyle = fill; ctx.fill(new Path2D(P.body));
  ctx.fillStyle = custom ? opt.ef : fill; ctx.fill(new Path2D(P.frames), "evenodd");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  if (opt.cornerImg) eyeCenters(L).forEach(function(r){
    var f = fitInside(opt.cornerImg, r);
    ctx.drawImage(opt.cornerImg.img, f.x, f.y, f.w, f.h);
  });
  else { ctx.fillStyle = custom ? opt.eb : fill; ctx.fill(new Path2D(P.balls)); }
  if (L.hasLabel && L.image) {
    var ir = imageRect(L);
    ctx.drawImage(L.label.img, ir.x, ir.y, ir.w, ir.h);
  } else if (L.hasLabel) {
    ctx.fillStyle = opt.labelMode === "match" ? fill : opt.tc;
    ctx.font = fontString(opt.font, L.fontPx);
    applyStretch(ctx, opt.font);
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    var p = labelPos(L);
    ctx.fillText(label, p.x, p.y);
  }
  return infoFrom(L);
}

function xmlEsc(t){ return String(t).replace(/[&<>"']/g, function(ch){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[ch]; }); }
export function svgFor(data, label, opt, px){
  var L = layoutCode(data, label, opt, px), P = codePaths(L, opt);
  var defs = "", fill = opt.fg;
  if (opt.codeMode === "gradient") {
    var G = gradGeom(opt, L.s, L.n);
    var stops = '<stop offset="0" stop-color="' + opt.fg + '"/><stop offset="1" stop-color="' + opt.fg2 + '"/>';
    defs = G.kind === "radial"
      ? '<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="' + f2(G.cx) + '" cy="' + f2(G.cy) + '" r="' + f2(G.r) + '">' + stops + "</radialGradient>"
      : '<linearGradient id="g" gradientUnits="userSpaceOnUse" x1="' + f2(G.x1) + '" y1="' + f2(G.y1) + '" x2="' + f2(G.x2) + '" y2="' + f2(G.y2) + '">' + stops + "</linearGradient>";
    fill = "url(#g)";
  }
  var custom = opt.eyeMode === "custom";
  // Logos are embedded as PNG data. xlink:href rather than href, so older design apps read them too.
  var corner = opt.cornerImg, cfit = corner ? fitInside(corner, { x: 0, y: 0, w: 3 * L.s, h: 3 * L.s }) : null;
  if (corner) defs += '<image id="c" width="' + f2(cfit.w) + '" height="' + f2(cfit.h) + '" preserveAspectRatio="none" xlink:href="' + corner.src + '"/>';
  var out = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + px + '" height="' + px + '" viewBox="0 0 ' + px + " " + px + '">';
  if (L.hasLabel && !L.image) out += "<style><![CDATA[@import url('" + FONT_CSS_URL + "');]]></style>";
  if (defs) out += "<defs>" + defs + "</defs>";
  out += '<rect width="' + px + '" height="' + px + '" fill="' + opt.bg + '"/>';
  out += '<path fill="' + fill + '" d="' + P.body + '"/>';
  out += '<path fill="' + (custom ? opt.ef : fill) + '" fill-rule="evenodd" d="' + P.frames + '"/>';
  if (corner) eyeCenters(L).forEach(function(r){
    out += '<use xlink:href="#c" x="' + f2(r.x + cfit.x) + '" y="' + f2(r.y + cfit.y) + '"/>';
  });
  else out += '<path fill="' + (custom ? opt.eb : fill) + '" d="' + P.balls + '"/>';
  if (L.hasLabel && L.image) {
    var ir = imageRect(L);
    out += '<image x="' + f2(ir.x) + '" y="' + f2(ir.y) + '" width="' + f2(ir.w) + '" height="' + f2(ir.h) + '" preserveAspectRatio="none" xlink:href="' + L.label.src + '"/>';
  } else if (L.hasLabel) {
    var F = FONTS[opt.font], p = labelPos(L);
    // textLength pins the label to the measured width, so a substitute font can't push it past its box
    out += '<text x="' + f2(p.x) + '" y="' + f2(p.y) + '" font-family="' + xmlEsc(F.css) + '" font-weight="' + F.weight + '"' +
      (F.stretch !== "100%" ? ' font-stretch="extra-condensed"' : "") +
      ' font-size="' + f2(L.fontPx) + '" textLength="' + f2(L.tm.adv) + '" lengthAdjust="spacingAndGlyphs" fill="' +
      (opt.labelMode === "match" ? fill : opt.tc) + '">' + xmlEsc(label) + "</text>";
  }
  return out + "</svg>";
}
