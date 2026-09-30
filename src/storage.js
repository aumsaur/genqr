// Remember inputs in this browser
import { $ } from "./ui/dom.js";
import { state, modes } from "./state.js";

var STORE = "mannaka-qr:v1";
var FIELDS = ["idOne","idMany","font","sizePx","lsize","grid","fg","fg2","tc","bg","ef","eb","pSize","pPaper","pCut",
  "ctUrl","ctText","ctEmail","ctEmailSubj","ctEmailBody","ctTel","ctSmsNum","ctSmsMsg","ctWifiSsid","ctWifiPass","ctWifiEnc","ctWifiHidden",
  "ctVFirst","ctVLast","ctVOrg","ctVTitle","ctVMobile","ctVPhone","ctVEmail","ctVUrl","ctVStreet","ctVCity","ctVState","ctVZip","ctVCountry","ctLat","ctLng"];

export function snapshot(){
  var o = { ctype: state.ctype, view: state.view, modes: JSON.parse(JSON.stringify(modes)) };
  FIELDS.forEach(function(id){ var el = $(id); o[id] = el.type === "checkbox" ? el.checked : el.value; });
  return o;
}
// Put a snapshot back into the form, button groups and zoom. The caller picks the content tab and redraws.
export function restore(o){
  FIELDS.forEach(function(id){
    if (!(id in o)) return;
    var el = $(id);
    if (el.type === "checkbox") el.checked = !!o[id];
    else if (el.tagName === "SELECT") { if ([].some.call(el.options, function(op){ return op.value === o[id]; })) el.value = o[id]; }
    else el.value = o[id];
  });
  // Saves from before the direction buttons kept it as a form field
  if (o.dir && o.modes && !o.modes.dir) o.modes.dir = o.dir;
  if (o.modes) {
    Object.keys(modes).forEach(function(g){
      if (!o.modes[g]) return;
      modes[g] = o.modes[g];
      document.querySelectorAll('[data-group="' + g + '"]').forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.value === modes[g]); });
    });
  }
  state.view = o.view === "actual" ? "actual" : "fit";
  document.querySelectorAll("[data-view]").forEach(function(x){ x.setAttribute("aria-pressed", x.dataset.view === state.view); });
}

var saveTmr;
export function saveSoon(){
  clearTimeout(saveTmr);
  saveTmr = setTimeout(function(){
    try { localStorage.setItem(STORE, JSON.stringify(snapshot())); }
    catch (e) { $("savedNote").textContent = "This browser isn't keeping your inputs, so they'll reset next time."; }
  }, 300);
}
export function loadSaved(){
  try { return JSON.parse(localStorage.getItem(STORE) || "null"); } catch (e) { return null; }
}
export function clearSaved(){
  try { localStorage.removeItem(STORE); } catch (e) {}
}
