// Paint a code: to a canvas (preview, PNG, print, PDF) or as SVG markup
import { QUIET, layoutCode, labelPos, infoFrom } from "./engine.js";
import { f2, codePaths } from "./shapes.js";
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

export function drawCode(canvas, data, text, opt, px){
  var L = layoutCode(data, text, opt, px), P = codePaths(L, opt);
  canvas.width = px; canvas.height = px; canvas._n = L.n;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = opt.bg; ctx.fillRect(0, 0, px, px);
  var fill = makeFill(ctx, opt, L.s, L.n);
  var custom = opt.eyeMode === "custom";
  ctx.fillStyle = fill; ctx.fill(new Path2D(P.body));
  ctx.fillStyle = custom ? opt.ef : fill; ctx.fill(new Path2D(P.frames), "evenodd");
  ctx.fillStyle = custom ? opt.eb : fill; ctx.fill(new Path2D(P.balls));
  if (L.hasText) {
    ctx.fillStyle = opt.labelMode === "match" ? fill : opt.tc;
    ctx.font = fontString(opt.font, L.fontPx);
    applyStretch(ctx, opt.font);
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    var p = labelPos(L);
    ctx.fillText(text, p.x, p.y);
  }
  return infoFrom(L);
}

function xmlEsc(t){ return String(t).replace(/[&<>"']/g, function(ch){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[ch]; }); }
export function svgFor(data, text, opt, px){
  var L = layoutCode(data, text, opt, px), P = codePaths(L, opt);
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
  var out = '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" viewBox="0 0 ' + px + " " + px + '">';
  out += "<style><![CDATA[@import url('" + FONT_CSS_URL + "');]]></style>";
  if (defs) out += "<defs>" + defs + "</defs>";
  out += '<rect width="' + px + '" height="' + px + '" fill="' + opt.bg + '"/>';
  out += '<path fill="' + fill + '" d="' + P.body + '"/>';
  out += '<path fill="' + (custom ? opt.ef : fill) + '" fill-rule="evenodd" d="' + P.frames + '"/>';
  out += '<path fill="' + (custom ? opt.eb : fill) + '" d="' + P.balls + '"/>';
  if (L.hasText) {
    var F = FONTS[opt.font], p = labelPos(L);
    // textLength pins the label to the measured width, so a substitute font can't push it past its box
    out += '<text x="' + f2(p.x) + '" y="' + f2(p.y) + '" font-family="' + xmlEsc(F.css) + '" font-weight="' + F.weight + '"' +
      (F.stretch !== "100%" ? ' font-stretch="extra-condensed"' : "") +
      ' font-size="' + f2(L.fontPx) + '" textLength="' + f2(L.tm.adv) + '" lengthAdjust="spacingAndGlyphs" fill="' +
      (opt.labelMode === "match" ? fill : opt.tc) + '">' + xmlEsc(text) + "</text>";
  }
  return out + "</svg>";
}
