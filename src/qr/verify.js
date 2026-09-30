// Scan check: decode the drawn code with jsQR and make sure it reads back the same content
import jsQR from "jsqr";
import { drawCode } from "./render.js";

// Styled corner eyes read fine on phone cameras, but the in-page decoder expects square ones.
// So when eyes are styled, check a copy with square eyes: the data, label, dots and colors still have to pass.
var altCanvas = document.createElement("canvas");
export function eyesStyled(o){ return o.eyeFrame !== "square" || o.eyeBall !== "square"; }
export function scanCheck(cv, data, id, o, px){
  if (!eyesStyled(o)) return verify(cv, data);
  var plain = Object.assign({}, o, { eyeFrame: "square", eyeBall: "square" });
  drawCode(altCanvas, data, id, plain, px);
  return verify(altCanvas, data);
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
