// Saving files: use the host's save capability when present (Claude artifacts), otherwise a normal browser download
import { toast } from "./ui/dom.js";

var dlPromise = (window.claude && typeof window.claude.use === "function")
  ? window.claude.use("downloads").catch(function(){ return null; })
  : Promise.resolve(null);
export async function saveFile(filename, blob){
  var dl = await dlPromise;
  if (dl) {
    try { await dl.save({ filename: filename, data: blob }); toast("Saved " + filename); }
    catch (e) {
      var code = e && e.code;
      if (code === "declined") return;
      if (code === "rate_limited") toast("A save prompt is already open.");
      else toast("Couldn't save the file here" + (e && e.message ? ": " + e.message : "."));
    }
    return;
  }
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
}
export function canvasBlob(cv){ return new Promise(function(res){ cv.toBlob(res, "image/png"); }); }
export function safeName(id){
  var s = id.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._]+/, "").slice(0, 80);
  return s || "qr";
}
