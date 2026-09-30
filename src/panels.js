// Small pieces of the settings panel that follow the current state: summaries, hints, the label-size bar, zoom
import { $ } from "./ui/dom.js";
import { state, modes } from "./state.js";
import { getSize } from "./form.js";
import { getContent, parseRows } from "./content.js";
import { QUIET } from "./qr/engine.js";

export function updateFmtUI(){
  var f = modes.fmt, one = state.mode === "one";
  $("dlOne").textContent = "Download " + f.toUpperCase();
  $("dlMany").textContent = f === "pdf" ? "Download all as PDF" : "Download all (" + f.toUpperCase() + " in a zip)";
  $("fmtHint").textContent =
    f === "svg" ? "SVG stays sharp at any size. The label uses web fonts, so a design app without them may show a similar font instead." :
    f === "pdf" ? (one ? "One page, exactly the printed size set in step 5." : "All codes on printable pages, laid out as set in step 5.") :
    "PNG at the image size set in step 5.";
}

// One-line summary next to each step's title, so closed steps still show their settings
export function updateSummaries(){
  var C = state.mode === "one" ? getContent().data : "";
  $("sumContent").textContent = state.mode === "many" ? parseRows().length + " lines" : (C ? C.replace(/\s+/g, " ").slice(0, 40) : "");
  $("sumLabel").textContent = (state.mode === "one" ? $("idOne").value.trim() : "from the list") + ", " + $("lsize").value + "%";
  $("sumColors").textContent = modes.codeMode === "gradient" ? "Gradient" : "Solid";
  var nm = function(g){ var b = document.querySelector('[data-group="' + g + '"][aria-pressed="true"]'); return b ? b.getAttribute("aria-label").toLowerCase() : ""; };
  $("sumShapes").textContent = nm("body") + " dots, " + nm("eyeFrame") + " eyes";
  $("sumSize").textContent = getSize() + " px, printed " + $("pSize").selectedOptions[0].textContent.split(" (")[0];
}

// Label size readout, and where the "won't scan" zone starts on the bar for the code in the preview
export function showLsize(){
  var v = +$("lsize").value, o = $("lsizeOut"), sl = $("lsize"), info = state.lastInfo;
  var one = state.mode === "one" && info && info.limitRatio > 0;
  var byBudget = one && info.boundBy === "budget";
  var lim = one ? (byBudget ? info.limitRatio : info.capRatio) * 100 : Infinity;
  var over = v > lim + 0.1;
  var txt;
  if (over && byBudget) txt = v + "%, won't scan";
  else if (over) txt = v + "%, can't grow past " + Math.round(lim) + "% (corner squares)";
  else if (v > 100) txt = v + "%, unsafe";
  else txt = v === 100 ? "100%, largest safe" : v + "%, safe";
  o.textContent = txt;
  o.classList.toggle("unsafe", v > 100 && !(over && byBudget));
  o.classList.toggle("over", over && byBudget);
  var pos = isFinite(lim) ? Math.min(100, Math.max(38.3, (lim - 40) / 160 * 100)) : 100;
  sl.style.setProperty("--lim", pos + "%");
  $("zBad").hidden = pos >= 99;
  $("zBad").textContent = byBudget ? "Won't scan" : "Max";
}

export function updateColorUI(){
  var g = modes.codeMode === "gradient";
  $("fg2Wrap").hidden = !g; $("dirWrap").hidden = !g;
  $("fgName").textContent = g ? "Start color" : "Color";
  $("tcWrap").hidden = modes.labelMode === "match";
  $("eyeColors").hidden = modes.eyeMode !== "custom";
  // Contrast against the background (WCAG formula): below 3:1 is hard for cameras too
  var cols = [$("fg").value].concat(g ? [$("fg2").value] : []).concat(modes.labelMode === "solid" ? [$("tc").value] : [])
    .concat(modes.eyeMode === "custom" ? [$("ef").value, $("eb").value] : []);
  var worst = Math.min.apply(null, cols.map(function(c){ return contrast(c, $("bg").value); }));
  var h = $("colorHint");
  if (worst < 3) { h.textContent = "Low contrast: one of the colors is too close to the background. Phones may not read the code."; h.classList.add("warnText"); }
  else { h.textContent = "Keep the code dark on a light background for reliable scanning."; h.classList.remove("warnText"); }
}
function lum(hex){
  var v = [1,3,5].map(function(i){ var c = parseInt(hex.substr(i,2),16)/255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); });
  return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2];
}
function contrast(a, b){ var x = lum(a), y = lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }

// Preview zoom
export function applyView(){
  var cv = $("preview"), t = $("tape"), dpr = window.devicePixelRatio || 1;
  t.classList.toggle("actual", state.view === "actual");
  if (state.view === "actual") { cv.style.width = (cv.width / dpr) + "px"; cv.classList.add("px"); }
  else { cv.style.width = ""; cv.classList.toggle("px", cv.width < 380 * dpr); }
}

export function updateSizeHint(n){
  var h = $("sizeHint"), raw = $("sizePx").value.trim(), v = parseInt(raw.replace(/[^0-9]/g, ""), 10), px = getSize();
  h.classList.remove("warnText");
  if (!raw || !isFinite(v)) { h.textContent = "Type a size in pixels, for example 1024. Using " + px + " px for now."; h.classList.add("warnText"); return; }
  if (v !== px) { h.textContent = "Sizes run from 64 to 4096 px. Using " + px + " px."; h.classList.add("warnText"); return; }
  if (n) {
    var per = px / (n + QUIET * 2), need = Math.ceil(4 * (n + QUIET * 2));
    if (per < 4) { h.textContent = "Only " + per.toFixed(1) + " px per square: the code will look blocky and may not scan. Use at least " + need + " px for this code."; h.classList.add("warnText"); return; }
  }
  h.textContent = "Square image, so one number sets both sides (64 to 4096).";
}
