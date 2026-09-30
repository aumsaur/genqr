// Settings read from the form
import { $ } from "./ui/dom.js";
import { modes } from "./state.js";

// Image size typed as text: whole pixels, 64 to 4096
export function getSize(){
  var raw = $("sizePx").value.replace(/[^0-9]/g, "");
  var v = parseInt(raw, 10);
  if (!isFinite(v)) v = 1024;
  return Math.max(64, Math.min(4096, v));
}
export function opts(){
  return { fg: $("fg").value, fg2: $("fg2").value, dir: $("dir").value, codeMode: modes.codeMode,
           tc: $("tc").value, labelMode: modes.labelMode, bg: $("bg").value,
           eyeMode: modes.eyeMode, ef: $("ef").value, eb: $("eb").value,
           body: modes.body, eyeFrame: modes.eyeFrame, eyeBall: modes.eyeBall,
           font: $("font").value, scale: +$("lsize").value / 100, grid: $("grid").value };
}
