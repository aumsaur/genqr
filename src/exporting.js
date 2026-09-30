// Downloads: PNG, SVG or PDF for one code; a zip or a PDF for the list
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { $, toast } from "./ui/dom.js";
import { state, modes } from "./state.js";
import { opts, getSize, labelFor } from "./form.js";
import { getContent, parseRows } from "./content.js";
import { drawCode, svgFor } from "./qr/render.js";
import { loadFontsFor } from "./qr/fonts.js";
import { saveFile, canvasBlob, safeName } from "./files.js";
import { downloadPdf } from "./print.js";

export async function downloadOne(){
  var id = $("idOne").value.trim(), label = labelFor(id), data = getContent().data; if (!data) return;
  await loadFontsFor(opts().font, [typeof label === "string" ? label : ""]);
  // With a logo in the middle the text field is hidden, so don't name the file after it
  var name = safeName(modes.labelKind === "image" ? "qr-code" : (id || "qr-code")), fmt = modes.fmt;
  if (fmt === "svg") {
    await saveFile(name + ".svg", new Blob([svgFor(data, label, opts(), getSize())], { type: "image/svg+xml" }));
  } else if (fmt === "pdf") {
    await saveFile(name + ".pdf", singlePdf(data, label));
  } else {
    var cv = document.createElement("canvas");
    drawCode(cv, data, label, opts(), getSize());
    await saveFile(name + ".png", await canvasBlob(cv));
  }
}
// One code on a page exactly the printed size, rendered at 600 dpi
function singlePdf(data, label){
  var cm = +$("pSize").value, mm = cm * 10;
  var px = Math.min(4096, Math.max(1024, Math.round(cm / 2.54 * 600)));
  var cv = document.createElement("canvas");
  drawCode(cv, data, label, opts(), px);
  // compress: without it jsPDF stores the image uncompressed, several MB per code
  var doc = new jsPDF({ unit: "mm", format: [mm, mm], compress: true });
  doc.addImage(cv.toDataURL("image/png"), "PNG", 0, 0, mm, mm);
  return doc.output("blob");
}

export async function downloadMany(){
  var ids = parseRows(); if (!ids.length) return;
  await loadFontsFor(opts().font, ids.map(function(r){ return r.id; }));
  if (modes.fmt === "pdf") { state.pendingImages = null; await downloadPdf($("dlMany")); return; }
  var svg = modes.fmt === "svg";
  var btn = $("dlMany"); btn.disabled = true;
  var btnText = btn.textContent;
  var zip = new JSZip(), used = {}, px = getSize(), o = opts(), skipped = 0;
  var cv = document.createElement("canvas");
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i].id, label = labelFor(id);
    if (!ids[i].data) { skipped++; continue; }
    var out;
    try { out = svg ? svgFor(ids[i].data, label, o, px) : (drawCode(cv, ids[i].data, label, o, px), await canvasBlob(cv)); }
    catch (e) { skipped++; continue; }
    var base = safeName(id), name = base, k = 2;
    while (used[name]) name = base + "-" + (k++);
    used[name] = 1;
    zip.file(name + (svg ? ".svg" : ".png"), out);
    if (i % 5 === 0) btn.textContent = "Building " + (i + 1) + " / " + ids.length;
  }
  btn.textContent = "Zipping…";
  var blob = await zip.generateAsync({ type: "blob" });
  btn.textContent = btnText; btn.disabled = false;
  if (skipped) toast(skipped + (skipped === 1 ? " line had" : " lines had") + " no content or was too long, and was left out.".replace(/was/g, skipped === 1 ? "was" : "were"));
  await saveFile("qr-codes-" + ids.length + (svg ? "-svg" : "") + ".zip", blob);
}
