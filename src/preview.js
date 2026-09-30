// The right-hand column: one code with its scan status, or a sheet of cards for the list
import { $, setStatus } from "./ui/dom.js";
import { state } from "./state.js";
import { opts, getSize } from "./form.js";
import { getContent, parseRows } from "./content.js";
import { QUIET } from "./qr/engine.js";
import { drawCode } from "./qr/render.js";
import { scanCheck, eyesStyled } from "./qr/verify.js";
import { fontsReadyFor } from "./qr/fonts.js";
import { updateSummaries, showLsize, updateFmtUI, applyView, updateSizeHint } from "./panels.js";
import { updatePrintHint } from "./print.js";

function renderOne(){
  var id = $("idOne").value.trim();
  var C = getContent(), data = C.data;
  var cv = $("preview");
  $("dlOne").disabled = !data; $("prOne").disabled = !data;
  updateSummaries();
  fontsReadyFor(opts().font, id);
  if (!data) {
    var c = cv.getContext("2d"); c.clearRect(0,0,cv.width,cv.height);
    setStatus($("status"), "", C.need || "Enter the QR content to see the code.");
    $("oneInfo").textContent = "";
    return;
  }
  var info;
  var px = getSize();
  try { info = drawCode(cv, data, id, opts(), px); applyView(); }
  catch (e) { setStatus($("status"), "warn", "That content is too long for one QR code. Shorten it."); $("dlOne").disabled = true; return; }
  var ok = scanCheck(cv, data, id, opts(), px);
  var perSq = px / (info.n + QUIET * 2);
  var used = Math.round(info.usage * 100) + "% of this code's damage allowance";
  state.lastInfo = info; showLsize(); updatePrintHint(); state.pendingImages = null;
  var atCap = info.boundBy === "corners" && +$("lsize").value / 100 > info.capRatio + 0.001;
  if (info.overLimit) setStatus($("status"), "warn", "Won't scan: the label covers more than this code can recover from (" + used + "). Move the slider back.");
  else if (!ok && info.unsafe) setStatus($("status"), "warn", "Scan check failed at this label size. Move the slider back toward the safe zone.");
  else if (!ok && perSq < 3) setStatus($("status"), "warn", "Scan check failed: at " + px + " px the squares are too small to read. Increase the image size.");
  else if (!ok && (opts().body === "dots" || opts().body === "rounded")) setStatus($("status"), "warn", "Scan check failed. Round dots need more pixels: use a larger image size, or square or connected dots.");
  else if (!ok) setStatus($("status"), "warn", "Scan check failed. The size is safe, so check the colors: the code needs strong contrast against the background.");
  else if (info.unsafe) setStatus($("status"), "warn", "Unsafe: the label uses " + used + ", leaving little room for print wear or glare. Test with a few real phones before printing.");
  else if (id && info.textModules < 1.3) setStatus($("status"), "warn", "Scans fine, but the label is long so the text is small. Try Condensed, or print the code larger.");
  else setStatus($("status"), "ok", "Safe and scan-checked. The label uses " + used + "." + (atCap ? " It's already as big as it can get without covering the corner squares." : "") +
    (eyesStyled(opts()) ? " Styled corner eyes work with phone cameras, but some older scanner apps prefer square ones." : ""));
  if (atCap && info.unsafe && !info.overLimit && ok) setStatus($("status"), "warn", "Unsafe: the label uses " + used + ". It's also as big as it can get without covering the corner squares. Test with real phones before printing.");
  $("oneInfo").textContent = px + " × " + px + " px, " + info.n + " × " + info.n + " grid, " + perSq.toFixed(1) + " px per square";
  updateSizeHint(info.n);
}

var renderToken = 0;
async function renderMany(){
  var token = ++renderToken;
  var ids = parseRows();
  var sheet = $("sheet");
  sheet.innerHTML = "";
  $("dlMany").disabled = $("prMany").disabled = ids.length === 0;
  updateSummaries();
  fontsReadyFor(opts().font, ids.map(function(r){ return r.id; }).join(""));
  $("manyInfo").textContent = ids.length ? ids.length + (ids.length === 1 ? " code" : " codes") : "Paste some lines to see the codes.";
  setStatus($("manyStatus"), "", "");
  var LIMIT = 300;
  var bad = 0, small = 0, tooLong = 0, missing = 0, unsafeN = 0, overN = 0, maxN = 0;
  state.pendingImages = null;
  var o = opts();
  for (var i = 0; i < ids.length; i++) {
    if (token !== renderToken) return;
    var id = ids[i].id, data = ids[i].data;
    var card = document.createElement("div"); card.className = "card";
    var cap = document.createElement("div"); cap.className = "cap";
    var nm = document.createElement("span"); nm.textContent = id || "(no label)"; nm.title = data;
    var fl = document.createElement("span"); fl.className = "flag";
    var ok = true, info = null;
    var cv = document.createElement("canvas");
    if (!data) { ok = false; missing++; }
    else {
      try { info = drawCode(cv, data, id, o, 360); ok = scanCheck(cv, data, id, o, 360); }
      catch (e) { ok = false; tooLong++; }
    }
    if (info) maxN = Math.max(maxN, info.n);
    var isUnsafe = !!(info && info.unsafe), isOver = !!(info && info.overLimit);
    if (isOver) { overN++; ok = false; }
    if (!ok) bad++; else if (isUnsafe) unsafeN++; else if (info && id && info.textModules < 1.3) small++;
    fl.textContent = !data ? "No content" : isOver ? "Won't scan" : !ok ? (isUnsafe ? "Fails" : "Check colors") : isUnsafe ? "Unsafe" : (id && info.textModules < 1.3 ? "Small text" : "Safe");
    fl.classList.add(ok && !isUnsafe && (!id || info.textModules >= 1.3) ? "ok" : "warn");
    if (i < LIMIT) { card.appendChild(cv); cap.appendChild(nm); cap.appendChild(fl); card.appendChild(cap); sheet.appendChild(card); }
    if (i % 6 === 5) {
      $("manyInfo").textContent = "Sizing labels and checking scans: " + (i + 1) + " / " + ids.length;
      await new Promise(function(r){ setTimeout(r, 0); });
    }
  }
  if (token !== renderToken) return;
  $("manyInfo").textContent = ids.length + (ids.length === 1 ? " code" : " codes");
  state.lastMaxN = maxN; updatePrintHint();
  var msgs = [];
  if (missing) msgs.push(missing + " missing QR content (add a comma or tab after the label, then the content)");
  if (tooLong) msgs.push(tooLong + " too long to fit in a QR code");
  if (bad - tooLong - missing - overN > 0) msgs.push((bad - tooLong - missing - overN) + " failed the scan check");
  if (overN) msgs.push(overN + " won't scan at this label size");
  if (unsafeN) msgs.push(unsafeN + " scan here but use an unsafe label size, so test them with real phones");
  if (small) msgs.push(small + " have small text");
  if (ids.length > LIMIT) msgs.push("showing the first " + LIMIT + "; downloads include all " + ids.length);
  if (msgs.length) setStatus($("manyStatus"), bad || small || unsafeN ? "warn" : "", msgs.join(". ") + ".");
  else if (ids.length) setStatus($("manyStatus"), "ok", "All " + ids.length + " codes are safe and passed the scan check.");
}

export function setMode(m){
  state.mode = m; showLsize(); updatePrintHint();
  $("oneView").hidden = m !== "one"; $("manyView").hidden = m !== "many";
  $("labelOneWrap").hidden = m !== "one";
  $("dlOne").hidden = $("prOne").hidden = m !== "one";
  $("dlMany").hidden = $("prMany").hidden = m !== "many";
  updateFmtUI();
  refresh();
}
export function setCtype(t){
  state.ctype = t;
  document.querySelectorAll("[data-ct]").forEach(function(b){ b.setAttribute("aria-selected", b.dataset.ct === t); });
  document.querySelectorAll(".ct").forEach(function(p){ p.hidden = p.dataset.panel !== t; });
  setMode(t === "list" ? "many" : "one");
}

// Redraw soon: edits come in bursts, so wait for a short pause
var tmr;
export function refresh(){
  clearTimeout(tmr);
  tmr = setTimeout(function(){ if (state.mode === "one") renderOne(); else renderMany(); }, state.mode === "one" ? (getSize() > 2048 ? 150 : 40) : 250);
}
// Redraw now, for the first paint
export function renderNow(){
  if (state.mode === "one") renderOne(); else refresh();
}
