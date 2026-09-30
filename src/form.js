// Settings read from the form
import { $ } from "./ui/dom.js";
import { state, modes } from "./state.js";

// Image size typed as text: whole pixels, 64 to 4096
export function getSize(){
  var raw = $("sizePx").value.replace(/[^0-9]/g, "");
  var v = parseInt(raw, 10);
  if (!isFinite(v)) v = 1024;
  return Math.max(64, Math.min(4096, v));
}
export function opts(){
  return { fg: $("fg").value, fg2: $("fg2").value, dir: modes.dir, codeMode: modes.codeMode,
           tc: $("tc").value, labelMode: modes.labelMode, bg: $("bg").value,
           eyeMode: modes.eyeMode, ef: $("ef").value, eb: $("eb").value,
           body: modes.body, eyeFrame: modes.eyeFrame, eyeBall: modes.eyeBall,
           font: $("font").value, scale: +$("lsize").value / 100, grid: $("grid").value,
           cornerImg: cornerImage() };
}

// What goes in the middle of a code: its text, or the logo when Image is picked (null until one is chosen)
export function labelFor(text){
  return modes.labelKind === "image" ? state.images.middle : text;
}
// The logo for the corner eye centers, or null to draw the center shape
export function cornerImage(){
  if (modes.eyeFill !== "image") return null;
  return modes.cornerSrc === "own" ? state.images.corner : state.images.middle;
}
// An image the settings ask for but that hasn't been chosen yet, as a prompt; "" when nothing is missing
export function missingImage(){
  if (modes.labelKind === "image" && !state.images.middle) return "Choose an image for the middle.";
  if (modes.eyeFill === "image" && !cornerImage()) return modes.cornerSrc === "own" ? "Choose an image for the corners." : "Choose an image for the middle first, or pick Different image for the corners.";
  return "";
}
