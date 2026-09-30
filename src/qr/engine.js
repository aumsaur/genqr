// Grid choice and label sizing: how big the label can get before the code stops scanning.
import qrcode, { getRSBlocks, stringToBytesUTF8 } from "../vendor/qrcode.js";
import { fontString, applyStretch } from "./fonts.js";

qrcode.stringToBytes = stringToBytesUTF8;

export var QUIET = 4;

// Build the QR matrix for some data, plus the layout facts needed to size the label
function buildQR(data, type){
  var qr = qrcode(type || 0, "H");
  qr.addData(data, "Byte");
  qr.make();
  var n = qr.getModuleCount(), t = qr.getTypeNumber();
  var blocks = getRSBlocks(t, "H");
  var dc = blocks.map(function(b){ return b.dataCount; });
  var ec = blocks.map(function(b){ return b.totalCount - b.dataCount; });
  // Codewords are interleaved across blocks: record which block each one belongs to
  var blockOf = [], i, r;
  var maxDc = Math.max.apply(null, dc), maxEc = Math.max.apply(null, ec);
  for (i = 0; i < maxDc; i++) for (r = 0; r < blocks.length; r++) if (i < dc[r]) blockOf.push(r);
  for (i = 0; i < maxEc; i++) for (r = 0; r < blocks.length; r++) if (i < ec[r]) blockOf.push(r);
  // Each block can fix up to half its error-correction codewords
  var budget = ec.map(function(e){ return Math.floor(e / 2); });
  return { qr: qr, n: n, t: t, map: qr.getCodewordMap(), blockOf: blockOf, budget: budget, nBlocks: blocks.length };
}

// Measure text at a given px size
function measure(ctx, text, key, px){
  ctx.font = fontString(key, px);
  applyStretch(ctx, key);
  var m = ctx.measureText(text);
  var asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
  if (!(asc >= 0)) { asc = px * 0.72; desc = px * 0.02; }
  var left = m.actualBoundingBoxLeft, right = m.actualBoundingBoxRight;
  var hasBox = typeof left === "number" && typeof right === "number" && isFinite(left) && isFinite(right);
  var w = hasBox ? left + right : m.width;
  return { w: w, asc: asc, desc: desc, left: hasBox ? left : 0, adv: m.width };
}

// Squares a label must never cover: the three corner targets with their format info, and version info
function hardForbidden(Q, r, c){
  var n = Q.n;
  if (r < 9 && c < 9) return true;
  if (r < 9 && c >= n - 8) return true;
  if (r >= n - 8 && c < 9) return true;
  if (Q.t >= 7 && ((r < 6 && c >= n - 11 && c < n - 8) || (c < 6 && r >= n - 11 && r < n - 8))) return true;
  return false;
}

// How much of the error-correction budget a label uses up, counting only the squares it actually flips:
// dark squares hidden by the label's white box, and light squares the letters cover.
// 1.0 = the most the code can possibly recover from. Infinity = it would cover a corner target.
export var SAFE_USAGE = 0.5;   // safe: keeps half the recovery budget spare for print wear, glare and angle
var K = 8;                     // sampling resolution, pixels per square
var probe = document.createElement("canvas");
var probeCtx = probe.getContext("2d", { willReadFrequently: true });

function labelBox(Q, ref, s, px){
  var padX = 0.8 * s, padY = 0.6 * s;
  var w = ref.w * px / 100, h = (ref.asc + ref.desc) * px / 100;
  return { bw: Math.max(1, Math.ceil((w + 2 * padX) / s)), bh: Math.max(1, Math.ceil((h + 2 * padY) / s)) };
}

function labelUsage(Q, ref, s, px, text, fontKey){
  var n = Q.n, b = labelBox(Q, ref, s, px), bw = b.bw, bh = b.bh;
  if (bw > n || bh > n) return { usage: Infinity, bw: bw, bh: bh, corners: true };
  // When the box can't sit exactly centered, it may shift half a square either way: keep whichever works best
  var xs = uniq([Math.floor((n - bw) / 2), Math.ceil((n - bw) / 2)]);
  var ys = uniq([Math.floor((n - bh) / 2), Math.ceil((n - bh) / 2)]);
  var spots = [], r, c;
  xs.forEach(function(x){ ys.forEach(function(y){
    for (var rr = y; rr < y + bh; rr++) for (var cc = x; cc < x + bw; cc++) if (hardForbidden(Q, rr, cc)) return;
    spots.push([x, y]);
  }); });
  if (!spots.length) return { usage: Infinity, bw: bw, bh: bh, corners: true };

  // Render the label at K px per square and read each square the way a scanner would (its middle)
  var f = K / s, W = bw * K, H = bh * K;
  probe.width = W; probe.height = H;
  probeCtx.fillStyle = "#fff"; probeCtx.fillRect(0, 0, W, H);
  probeCtx.fillStyle = "#000";
  probeCtx.font = fontString(fontKey, px * f); applyStretch(probeCtx, fontKey);
  probeCtx.textBaseline = "alphabetic"; probeCtx.textAlign = "left";
  var k = px / 100 * f;
  probeCtx.fillText(text, W / 2 - ref.w * k / 2 + ref.left * k, H / 2 + (ref.asc - ref.desc) * k / 2);
  var img = probeCtx.getImageData(0, 0, W, H).data;

  var a = Math.floor(K * 0.3), z = Math.ceil(K * 0.7), dark = [];
  for (r = 0; r < bh; r++) {
    dark.push([]);
    for (c = 0; c < bw; c++) {
      var sum = 0, cnt = 0;
      for (var yy = r * K + a; yy < r * K + z; yy++) for (var xx = c * K + a; xx < c * K + z; xx++) { sum += img[(yy * W + xx) * 4]; cnt++; }
      dark[r].push(sum / cnt < 128);
    }
  }
  var best = null;
  spots.forEach(function(sp){
    var x0 = sp[0], y0 = sp[1], hit = {}, perBlock = new Array(Q.nBlocks).fill(0), timing = false;
    for (var r2 = 0; r2 < bh; r2++) for (var c2 = 0; c2 < bw; c2++) {
      var R = y0 + r2, C = x0 + c2;
      if (dark[r2][c2] === Q.qr.isDark(R, C)) continue;      // unchanged square: no harm done
      if (R === 6 || C === 6) timing = true;
      var cw = Q.map[R][C];
      if (cw >= 0 && !hit[cw]) { hit[cw] = 1; perBlock[Q.blockOf[cw]]++; }
    }
    var u = 0;
    for (var i = 0; i < Q.nBlocks; i++) u = Math.max(u, perBlock[i] / Q.budget[i]);
    // The timing line helps phones find the grid; changing it is never counted as safe
    if (timing) u = Math.max(u, SAFE_USAGE + 0.01);
    if (!best || u < best.usage) best = { usage: u, bw: bw, bh: bh, x0: x0, y0: y0, corners: false };
  });
  return best;
}
function uniq(a){ return a.filter(function(v, i){ return a.indexOf(v) === i; }); }

// Largest font size whose label stays within the given usage
function maxPxFor(Q, ref, s, limit, text, fontKey, steps){
  var lo = 0, hi = Q.n * s * 2;
  for (var i = 0; i < (steps || 20); i++) {
    var mid = (lo + hi) / 2;
    if (labelUsage(Q, ref, s, mid, text, fontKey).usage <= limit) lo = mid; else hi = mid;
  }
  return lo;
}

// Short content fits a small grid, but a small grid has little room between its corner squares.
// "Auto" tries a few larger grids and keeps the one where the label can be biggest.
function pickGrid(data, text, opt, px, ctx){
  var Q = buildQR(data);
  if (opt.grid !== "auto" || !text) return Q;
  var best = Q, bestSize = -1;
  var ref = measure(ctx, text, opt.font, 100);
  for (var t = Q.t; t <= Math.min(40, Q.t + 4); t++) {
    var Qt = t === Q.t ? Q : buildQR(data, t);
    // A finer grid needs enough pixels: keep at least 4 px per square
    if (t > Q.t && px / (Qt.n + QUIET * 2) < 4) break;
    var st = px / (Qt.n + QUIET * 2);
    var safe = maxPxFor(Qt, ref, st, SAFE_USAGE, text, opt.font, 14);
    var size = safe / px;
    if (size > bestSize * 1.04) { best = Qt; bestSize = size; }
  }
  return best;
}

// Everything about one code except the painting: grid, label box and font size.
// The label is sized from this code's own layout: scale 1 = largest safe size.
var measureCanvas = document.createElement("canvas");
export function layoutCode(data, text, opt, px){
  var ctx = measureCanvas.getContext("2d");
  var Q = pickGrid(data, text, opt, px, ctx), n = Q.n;
  var s = px / (n + QUIET * 2);
  var L = { Q: Q, n: n, s: s, px: px, hasText: !!(text && text.length), text: text,
            box: { x0: 0, y0: 0, w: 0, h: 0 }, fontPx: 0, tm: null,
            safeTextModules: 0, usage: 0, limitRatio: 0, capRatio: 0, boundBy: "" };
  if (L.hasText) {
    var ref = measure(ctx, text, opt.font, 100);
    var safePx = maxPxFor(Q, ref, s, SAFE_USAGE, text, opt.font);
    var limitPx = maxPxFor(Q, ref, s, 1, text, opt.font);
    var hardPx = maxPxFor(Q, ref, s, 1e9, text, opt.font);
    // What stops the label growing: the damage allowance, or the corner squares
    L.boundBy = limitPx >= hardPx * 0.995 ? "corners" : "budget";
    L.limitRatio = safePx > 0 ? limitPx / safePx : 0;
    L.capRatio = safePx > 0 ? hardPx / safePx : 0;
    L.safeTextModules = (safePx * (ref.asc + ref.desc) / 100) / s;
    L.fontPx = Math.max(1, Math.min(safePx * (opt.scale || 1), hardPx));
    var U = labelUsage(Q, ref, s, L.fontPx, text, opt.font);
    L.box = { x0: U.x0, y0: U.y0, w: U.bw, h: U.bh };
    L.usage = U.usage;
    L.tm = measure(ctx, text, opt.font, L.fontPx);
  }
  return L;
}
export function labelPos(L){
  var s = L.s, b = L.box, tm = L.tm;
  var cx = (QUIET + b.x0 + b.w / 2) * s, cy = (QUIET + b.y0 + b.h / 2) * s;
  return { x: cx - tm.w / 2 + tm.left, y: cy + (tm.asc - tm.desc) / 2 };
}
export function infoFrom(L){
  return {
    n: L.n, version: L.Q.t,
    textModules: L.safeTextModules,   // text height at the largest safe size (for the "long label" hint)
    usage: L.usage,                   // share of the recovery budget used
    unsafe: L.usage > SAFE_USAGE,
    overLimit: L.usage > 1,           // past what the code can recover from, even printed perfectly
    limitRatio: L.limitRatio, capRatio: L.capRatio, boundBy: L.boundBy
  };
}
