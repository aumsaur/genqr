// Uploaded logos: one for the middle, one for the corner eye centers.
// Each is shrunk, trimmed of transparent edges, and remembered in this browser.
import { toast } from "./ui/dom.js";
import { state } from "./state.js";

var KEY = "mannaka-qr:image:";
var MAX = 1024;   // longest side kept, enough for a 4096 px export

function loadImg(src){
  return new Promise(function(res, rej){ var i = new Image(); i.onload = function(){ res(i); }; i.onerror = rej; i.src = src; });
}
// Bounds of the pixels that aren't transparent, so the logo itself (not its padding) is what gets sized
function opaqueBounds(ctx, W, H){
  var d = ctx.getImageData(0, 0, W, H).data, x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
    if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
// File → PNG data URL, at most MAX px on the longest side, transparent edges trimmed
async function prepare(file){
  var url = URL.createObjectURL(file);
  try {
    var img = await loadImg(url);
    // SVGs without a width and height report 0; draw those at MAX
    var w = img.naturalWidth || MAX, h = img.naturalHeight || MAX, k = Math.min(1, MAX / Math.max(w, h));
    var cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
    var ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    var b = opaqueBounds(ctx, cv.width, cv.height);
    if (!b) return null;
    if (b.w !== cv.width || b.h !== cv.height) {
      var out = document.createElement("canvas"); out.width = b.w; out.height = b.h;
      out.getContext("2d").drawImage(cv, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
      cv = out;
    }
    return cv.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}
async function use(slot, src, name){
  var img = await loadImg(src);
  state.images[slot] = { img: img, src: src, w: img.naturalWidth, h: img.naturalHeight, name: name };
}

export async function setImage(slot, file){
  if (!file || !/^image\//.test(file.type)) { toast("That file isn't an image."); return; }
  var src;
  try { src = await prepare(file); } catch (e) { toast("Couldn't read that image."); return; }
  if (!src) { toast("That image is completely transparent."); return; }
  await use(slot, src, file.name);
  try { localStorage.setItem(KEY + slot, JSON.stringify({ src: src, name: file.name })); }
  catch (e) { toast("The image works, but it's too big to remember here, so it'll be gone next visit."); }
}
export function clearImage(slot){
  state.images[slot] = null;
  try { localStorage.removeItem(KEY + slot); } catch (e) {}
}
export async function restoreImages(){
  for (var slot of ["middle", "corner"]) {
    try {
      var o = JSON.parse(localStorage.getItem(KEY + slot) || "null");
      if (o && o.src) await use(slot, o.src, o.name);
    } catch (e) {}
  }
}
