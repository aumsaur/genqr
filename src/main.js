// Entry point: wire the controls, restore saved inputs, draw the first code
import { $, toast } from "./ui/dom.js";
import { state, modes } from "./state.js";
import { CONTENT_TYPES } from "./content.js";
import { shapeIcon } from "./qr/shapes.js";
import { onFontsLoaded, preloadFonts } from "./qr/fonts.js";
import { refresh, renderNow, setCtype } from "./preview.js";
import { updateFmtUI, updateSummaries, showLsize, updateColorUI, updateImageUI, applyView } from "./panels.js";
import { downloadOne, downloadMany } from "./exporting.js";
import { doPrint, downloadPdf, updatePrintHint } from "./print.js";
import { snapshot, restore, saveSoon, loadSaved, clearSaved } from "./storage.js";
import { initPin } from "./pin.js";
import { setImage, clearImage, restoreImages } from "./images.js";

onFontsLoaded(refresh);

// Content tabs
document.querySelectorAll("[data-ct]").forEach(function(b){
  b.addEventListener("click", function(){ setCtype(b.dataset.ct); saveSoon(); });
});

// Any edit in the steps redraws
document.querySelector(".steps").addEventListener("input", refresh);
document.querySelector(".steps").addEventListener("change", refresh);

// Button groups: colors, shapes, file format
document.querySelectorAll("[data-group]").forEach(function(btn){
  btn.addEventListener("click", function(){
    var g = btn.dataset.group; modes[g] = btn.dataset.value;
    document.querySelectorAll('[data-group="' + g + '"]').forEach(function(b){ b.setAttribute("aria-pressed", b === btn); });
    updateColorUI(); updateFmtUI(); updateImageUI();
    if (g !== "fmt") refresh(); else updateSummaries();
  });
});
["fg","fg2","tc","bg","ef","eb"].forEach(function(id){ $(id).addEventListener("input", updateColorUI); });
document.querySelectorAll('.shapes [data-group]:not([data-group="dir"])').forEach(function(b){ b.innerHTML = shapeIcon(b.dataset.group, b.dataset.value); });
updateColorUI();
$("lsize").addEventListener("input", showLsize); showLsize();
$("dlOne").addEventListener("click", downloadOne);
$("dlMany").addEventListener("click", downloadMany);

// Preview zoom
document.querySelectorAll("[data-view]").forEach(function(b){
  b.addEventListener("click", function(){
    state.view = b.dataset.view;
    document.querySelectorAll("[data-view]").forEach(function(x){ x.setAttribute("aria-pressed", x === b); });
    applyView(); saveSoon();
  });
});

// Logo pickers: the middle logo and the corner logo, by button or by dropping a file
function afterImage(){ updateImageUI(); updateColorUI(); refresh(); }
function wirePicker(slot, prefix){
  var input = $(prefix + "File"), drop = $(prefix + "Drop");
  $(prefix + "Pick").addEventListener("click", function(){ input.click(); });
  input.addEventListener("change", async function(){
    var f = input.files[0]; input.value = "";
    if (f) { await setImage(slot, f); afterImage(); }
  });
  $(prefix + "Clear").addEventListener("click", function(){ clearImage(slot); afterImage(); });
  drop.addEventListener("dragover", function(e){ e.preventDefault(); drop.classList.add("drag"); });
  drop.addEventListener("dragleave", function(){ drop.classList.remove("drag"); });
  drop.addEventListener("drop", async function(e){
    e.preventDefault(); drop.classList.remove("drag");
    var f = e.dataTransfer.files[0];
    if (f) { await setImage(slot, f); afterImage(); }
  });
}
wirePicker("middle", "mid");
wirePicker("corner", "corner");

// Phones: keep a small copy of the preview pinned while scrolling the settings
initPin();

// Remember inputs
var DEFAULTS = null;
function applySnapshot(o){
  if (!o) return;
  restore(o);
  updateColorUI(); updateImageUI(); showLsize();
  setCtype(CONTENT_TYPES.indexOf(o.ctype) >= 0 ? o.ctype : (o.mode === "many" ? "list" : "url"));
}
document.addEventListener("input", saveSoon);
document.addEventListener("change", saveSoon);
document.addEventListener("click", function(e){ if (e.target.closest("[data-group], [data-ct]")) saveSoon(); });
$("resetBtn").addEventListener("click", function(){
  clearSaved(); clearImage("middle"); clearImage("corner");
  applySnapshot(DEFAULTS); refresh(); toast("Reset to the starting settings.");
});

// Printing
$("prOne").addEventListener("click", function(){ doPrint($("prOne")); });
$("prMany").addEventListener("click", function(){ doPrint($("prMany")); });
$("pdfBtn").addEventListener("click", function(){ downloadPdf(); });
$("pdfClose").addEventListener("click", function(){ $("pdfNote").hidden = true; });
["pSize","pPaper"].forEach(function(id){ $(id).addEventListener("change", updatePrintHint); });
["pSize","pPaper","pCut"].forEach(function(id){ $(id).addEventListener("change", function(){ state.pendingImages = null; }); });
updatePrintHint();

// Render once fonts are ready so the canvas text uses them
var fontLoads = preloadFonts();
updateFmtUI();
DEFAULTS = snapshot();
applySnapshot(loadSaved());
applyView();
renderNow();
// Saved logos decode asynchronously; redraw once they're back
restoreImages().then(afterImage);
Promise.all(fontLoads).then(function(){ refresh(); }, function(){});
if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
