// Printing: a sheet of codes at the printed size, with a PDF fallback when the print dialog is blocked
import { jsPDF } from "jspdf";
import { $, toast } from "./ui/dom.js";
import { state } from "./state.js";
import { opts } from "./form.js";
import { getContent, parseRows } from "./content.js";
import { QUIET } from "./qr/engine.js";
import { drawCode } from "./qr/render.js";
import { saveFile } from "./files.js";

function printItems(){
  if (state.mode === "one") {
    var d = getContent().data;
    return d ? [{ id: $("idOne").value.trim(), data: d }] : [];
  }
  return parseRows().filter(function(r){ return r.data; });
}
export function updatePrintHint(){
  var n = state.mode === "one" ? (state.lastInfo && state.lastInfo.n) : state.lastMaxN;
  var h = $("pHint");
  var w = +$("pSize").value * 10, per = pageLayout().perPage;
  var txt = per + (per === 1 ? " code" : " codes") + " per page.";
  h.classList.remove("warnText");
  if (n) {
    var mm = w / (n + QUIET * 2);
    txt += " Squares print at " + mm.toFixed(2) + " mm" + (state.mode === "many" ? " on the finest grid" : "") + ".";
    if (mm < 0.4) { txt += " That's too small for most phones: pick a larger printed size."; h.classList.add("warnText"); }
    else if (mm < 0.6) txt += " Fine up close; go larger if people scan from a distance.";
  }
  h.textContent = txt;
}
function pageLayout(){
  var P = $("pPaper").value === "a4" ? [210, 297] : [215.9, 279.4];
  var m = 10, gap = 6, w = +$("pSize").value * 10;
  var cols = Math.max(1, Math.floor((P[0] - 2 * m - 3 + gap) / (w + gap)));
  var rows = Math.max(1, Math.floor((P[1] - 2 * m - 3 + gap) / (w + gap)));
  return { P: P, m: m, gap: gap, w: w, cols: cols, rows: rows, perPage: cols * rows };
}
function printPx(){ return Math.min(2048, Math.max(512, Math.round(+$("pSize").value / 2.54 * 300))); }

async function renderPrintImages(btn){
  var items = printItems(), out = [], px = printPx(), o = opts(), cv = document.createElement("canvas");
  var label = btn.textContent;
  for (var i = 0; i < items.length; i++) {
    try { drawCode(cv, items[i].data, items[i].id, o, px); } catch (e) { continue; }
    out.push(cv.toDataURL("image/png"));
    if (items.length > 1 && i % 4 === 0) { btn.textContent = "Preparing " + (i + 1) + " / " + items.length; await new Promise(function(r){ setTimeout(r, 0); }); }
  }
  btn.textContent = label;
  return out;
}

var printFired = false;
window.addEventListener("beforeprint", function(){ printFired = true; });

export async function doPrint(btn){
  if (!printItems().length) { toast("Add QR content first."); return; }
  btn.disabled = true;
  var imgs = await renderPrintImages(btn);
  btn.disabled = false;
  if (!imgs.length) { toast("Nothing to print: the content is too long for a QR code."); return; }
  state.pendingImages = imgs;
  var w = +$("pSize").value, sheet = $("printSheet"), L = pageLayout();
  $("pageStyle").textContent = "@page{size:" + ($("pPaper").value === "a4" ? "A4" : "letter") + " portrait;margin:10mm}";
  sheet.innerHTML = "";
  // One block per page, same grid as the PDF, so a row never splits across pages
  var page = null;
  var loads = imgs.map(function(src, i){
    if (i % L.perPage === 0) {
      page = document.createElement("div"); page.className = "ppage";
      page.style.gridTemplateColumns = "repeat(" + L.cols + ", " + w + "cm)";
      sheet.appendChild(page);
    }
    var d = document.createElement("div");
    d.className = "pitem" + ($("pCut").checked ? " cut" : "");
    d.style.width = w + "cm"; d.style.height = w + "cm";
    var im = document.createElement("img"); im.alt = ""; im.src = src;
    d.appendChild(im); page.appendChild(d);
    return im.decode ? im.decode().catch(function(){}) : Promise.resolve();
  });
  await Promise.all(loads);
  printFired = false;
  try { window.print(); } catch (e) {}
  // If the browser blocked the print dialog, offer a PDF instead
  setTimeout(function(){ if (!printFired) $("pdfNote").hidden = false; }, 1200);
}

export async function downloadPdf(btnArg){
  var btn = btnArg && btnArg.nodeType ? btnArg : $("pdfBtn"), orig = btn.textContent;
  var imgs = state.pendingImages || await renderPrintImages(btn);
  if (!imgs.length) return;
  btn.disabled = true; btn.textContent = "Building PDF…";
  var letter = $("pPaper").value === "letter";
  // compress: without it jsPDF stores every image uncompressed
  var doc = new jsPDF({ unit: "mm", format: letter ? "letter" : "a4", compress: true });
  var Lo = pageLayout(), m = Lo.m + 1.5, gap = Lo.gap, w = Lo.w, cols = Lo.cols, perPage = Lo.perPage;
  for (var i = 0; i < imgs.length; i++) {
    var k = i % perPage;
    if (i > 0 && k === 0) doc.addPage();
    var x = m + (k % cols) * (w + gap), y = m + Math.floor(k / cols) * (w + gap);
    doc.addImage(imgs[i], "PNG", x, y, w, w);
    if ($("pCut").checked) {
      doc.setDrawColor(140); doc.setLineWidth(0.25); doc.setLineDashPattern([1.2, 1.2], 0);
      doc.rect(x - 1.5, y - 1.5, w + 3, w + 3);
    }
  }
  var blob = doc.output("blob");
  btn.disabled = false; btn.textContent = orig;
  $("pdfNote").hidden = true;
  await saveFile("qr-codes-print.pdf", blob);
}
