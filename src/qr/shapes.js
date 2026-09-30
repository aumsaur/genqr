// Shapes: one geometry for the canvas preview, PNG, SVG and print
import { QUIET } from "./engine.js";

export function f2(v){ return Math.round(v * 100) / 100; }
function rr(x, y, w, h, tl, tr, br, bl){
  var d = "M" + f2(x + tl) + " " + f2(y) + "H" + f2(x + w - tr);
  if (tr) d += "A" + f2(tr) + " " + f2(tr) + " 0 0 1 " + f2(x + w) + " " + f2(y + tr);
  d += "V" + f2(y + h - br);
  if (br) d += "A" + f2(br) + " " + f2(br) + " 0 0 1 " + f2(x + w - br) + " " + f2(y + h);
  d += "H" + f2(x + bl);
  if (bl) d += "A" + f2(bl) + " " + f2(bl) + " 0 0 1 " + f2(x) + " " + f2(y + h - bl);
  d += "V" + f2(y + tl);
  if (tl) d += "A" + f2(tl) + " " + f2(tl) + " 0 0 1 " + f2(x + tl) + " " + f2(y);
  return d + "Z";
}
function circ(cx, cy, r){
  return "M" + f2(cx - r) + " " + f2(cy) + "a" + f2(r) + " " + f2(r) + " 0 1 0 " + f2(2 * r) + " 0a" + f2(r) + " " + f2(r) + " 0 1 0 " + f2(-2 * r) + " 0Z";
}
// A square of size z at (x, y) in one of the eye styles. corners = which two corners a leaf rounds.
function eyeShape(style, x, y, z, rRound, rLeaf, leaf){
  if (style === "circle") return circ(x + z / 2, y + z / 2, z / 2);
  if (style === "rounded") return rr(x, y, z, z, rRound, rRound, rRound, rRound);
  if (style === "leaf") return rr(x, y, z, z, leaf.tl ? rLeaf : 0, leaf.tr ? rLeaf : 0, leaf.br ? rLeaf : 0, leaf.bl ? rLeaf : 0);
  return rr(x, y, z, z, 0, 0, 0, 0);
}
export function codePaths(L, opt){
  var Q = L.Q, n = Q.n, s = L.s, o = QUIET * s, qr = Q.qr, b = L.box;
  function inFinder(r, c){ return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7); }
  function inBox(r, c){ return L.hasLabel && c >= b.x0 && c < b.x0 + b.w && r >= b.y0 && r < b.y0 + b.h; }
  function on(r, c){ return r >= 0 && c >= 0 && r < n && c < n && qr.isDark(r, c) && !inFinder(r, c) && !inBox(r, c); }
  var body = [], shape = opt.body || "square";
  for (var r = 0; r < n; r++) {
    for (var c = 0; c < n; c++) {
      if (!on(r, c)) continue;
      var x = o + c * s, y = o + r * s;
      if (shape === "dots") body.push(circ(x + s / 2, y + s / 2, s * 0.46));
      else if (shape === "rounded") body.push(rr(x + s * 0.04, y + s * 0.04, s * 0.92, s * 0.92, s * .3, s * .3, s * .3, s * .3));
      else if (shape === "fluid") {
        var R = s / 2, up = on(r - 1, c), dn = on(r + 1, c), lf = on(r, c - 1), rt = on(r, c + 1);
        body.push(rr(x, y, s, s, !up && !lf ? R : 0, !up && !rt ? R : 0, !dn && !rt ? R : 0, !dn && !lf ? R : 0));
      } else {
        var x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + s), y1 = Math.round(y + s);
        body.push("M" + x0 + " " + y0 + "H" + x1 + "V" + y1 + "H" + x0 + "Z");
      }
    }
  }
  var frames = [], balls = [];
  [[0, 0, { tl: 1, br: 1 }], [0, n - 7, { tr: 1, bl: 1 }], [n - 7, 0, { bl: 1, tr: 1 }]].forEach(function(e){
    var x = o + e[1] * s, y = o + e[0] * s;
    frames.push(eyeShape(opt.eyeFrame, x, y, 7 * s, 2 * s, 3 * s, e[2]));
    frames.push(eyeShape(opt.eyeFrame, x + s, y + s, 5 * s, 1.2 * s, 2 * s, e[2]));
    balls.push(eyeShape(opt.eyeBall, x + 2 * s, y + 2 * s, 3 * s, 0.9 * s, 1.3 * s, e[2]));
  });
  return { body: body.join(""), frames: frames.join(""), balls: balls.join("") };
}

// The 3 × 3 center of each corner eye, where a corner logo goes
export function eyeCenters(L){
  var n = L.Q.n, s = L.s, o = QUIET * s;
  return [[0, 0], [0, n - 7], [n - 7, 0]].map(function(e){
    return { x: o + (e[1] + 2) * s, y: o + (e[0] + 2) * s, w: 3 * s, h: 3 * s };
  });
}

// Small previews for the shape buttons, drawn with the same geometry
export function shapeIcon(group, value){
  var s = 8, parts = "";
  if (group === "body") {
    var pat = [[1,1,0],[1,0,1],[0,1,1]];
    var shape = value, d = "";
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
      if (!pat[r][c]) continue;
      var x = 4 + c * s, y = 4 + r * s;
      if (shape === "dots") d += circ(x + s / 2, y + s / 2, s * 0.46);
      else if (shape === "rounded") d += rr(x + s * .04, y + s * .04, s * .92, s * .92, s * .3, s * .3, s * .3, s * .3);
      else if (shape === "fluid") {
        var on = function(rr_, cc_){ return rr_ >= 0 && cc_ >= 0 && rr_ < 3 && cc_ < 3 && pat[rr_][cc_]; };
        var R = s / 2, up = on(r - 1, c), dn = on(r + 1, c), lf = on(r, c - 1), rt = on(r, c + 1);
        d += rr(x, y, s, s, !up && !lf ? R : 0, !up && !rt ? R : 0, !dn && !rt ? R : 0, !dn && !lf ? R : 0);
      } else d += rr(x, y, s, s, 0, 0, 0, 0);
    }
    return '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="' + d + '"/></svg>';
  }
  var leaf = { tl: 1, br: 1 };
  if (group === "eyeFrame") {
    parts = eyeShape(value, 2, 2, 28, 8, 12, leaf) + eyeShape(value, 6, 6, 20, 5, 8, leaf);
    return '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="' + parts + '"/></svg>';
  }
  parts = eyeShape(value, 6, 6, 20, 6, 9, leaf);
  return '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="' + parts + '"/></svg>';
}
