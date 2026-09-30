// Scan check: decode the drawn code with jsQR and make sure it reads back the same content
import jsQR from "jsqr";
import { drawCode } from "./render.js";

// Styled corner eyes read fine on phone cameras, but the in-page decoder expects square ones.
// So when eyes are styled, check a copy with square eyes: the data, label, dots and colors still have to pass.
// Corner logos are judged separately by cornerLogoOk(), for the same reason.
var altCanvas = document.createElement("canvas");
export function eyesStyled(o){ return o.eyeFrame !== "square" || (!o.cornerImg && o.eyeBall !== "square"); }
export function scanCheck(cv, data, label, o, px){
  if (!eyesStyled(o) && !o.cornerImg) return verify(cv, data);
  var plain = Object.assign({}, o, { eyeFrame: "square", eyeBall: "square", cornerImg: null });
  drawCode(altCanvas, data, label, plain, px);
  return verify(altCanvas, data);
}
// A corner logo replaces the dark 3 × 3 center of an eye. Phones find a code by scanning across the eyes
// for dark, light, DARK, light, dark in 1:1:3:1:1 steps, so the logo has to read as dark straight across
// its middle, both ways, and over most of its area. A filled disc passes; a wide wordmark or a pale logo doesn't.
var logoCanvas = document.createElement("canvas");
var logoChecks = new WeakMap();
export function cornerLogoOk(pic, bg){
  var hit = logoChecks.get(pic);
  if (hit && hit.bg === bg) return hit.ok;
  var S = 30, c = logoCanvas.getContext("2d", { willReadFrequently: true });
  logoCanvas.width = logoCanvas.height = S;
  c.fillStyle = bg; c.fillRect(0, 0, S, S);
  var k = Math.min(S / pic.w, S / pic.h), w = pic.w * k, h = pic.h * k;
  c.drawImage(pic.img, (S - w) / 2, (S - h) / 2, w, h);
  var d = c.getImageData(0, 0, S, S).data, all = 0, across = 0, down = 0;
  for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
    var p = (y * S + x) * 4;
    if (0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2] >= 128) continue;
    all++;
    if (y >= 12 && y < 18) across++;   // the middle fifth, read left to right
    if (x >= 12 && x < 18) down++;     // and top to bottom
  }
  var ok = all / (S * S) >= 0.6 && across / (6 * S) >= 0.85 && down / (6 * S) >= 0.85;
  logoChecks.set(pic, { bg: bg, ok: ok });
  return ok;
}

// Verify with a decoder
function verifyScale(src){ return Math.max(1, (src.width / ((src._n || 29) + 8)) / 6); }
var checkCanvas = document.createElement("canvas");
function verify(src, expected){
  // Read it the way a camera sees it: at a few resolutions, from sharp down to about 7 px per square,
  // where round dots blend together as they do in a real photo
  var total = (src._n || 29) + 8, first = Math.min(src.width, Math.max(480, Math.round(src.width / verifyScale(src))));
  var sizes = [first, Math.round(total * 9), Math.round(total * 7)].filter(function(z, i, a){
    return z <= src.width && z >= total * 3 && a.indexOf(z) === i;
  });
  if (!sizes.length) sizes = [src.width];
  var c = checkCanvas.getContext("2d", { willReadFrequently: true });
  for (var i = 0; i < sizes.length; i++) {
    var size = sizes[i];
    checkCanvas.width = size; checkCanvas.height = size;
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    c.drawImage(src, 0, 0, size, size);
    var res = jsQR(c.getImageData(0, 0, size, size).data, size, size, { inversionAttempts: "attemptBoth" });
    if (res && res.data === expected) return true;
  }
  return false;
}
