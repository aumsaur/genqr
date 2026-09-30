// Phones: the preview sits above the settings and scrolls away, so a small copy stays pinned in the corner
import { $ } from "./ui/dom.js";
import { state } from "./state.js";

var narrow = window.matchMedia("(max-width: 759px)");   // same breakpoint as the one-column layout in styles.css
var previewInView = true;

export function initPin(){
  new IntersectionObserver(function(entries){
    previewInView = entries[0].isIntersecting;
    updatePin();
  }, { threshold: 0.2 }).observe($("tape"));
  narrow.addEventListener("change", updatePin);
  $("pin").addEventListener("click", function(){
    var smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("oneView").scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  });
}

// Show or hide the pin, and copy the current preview and its status into it
export function updatePin(){
  var pin = $("pin");
  var show = narrow.matches && !previewInView && state.mode === "one" && !$("dlOne").disabled;
  pin.hidden = !show;
  if (!show) return;
  var src = $("preview"), cv = $("pinCanvas"), size = Math.round(112 * (window.devicePixelRatio || 1));
  if (cv.width !== size) { cv.width = size; cv.height = size; }
  var ctx = cv.getContext("2d");
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, size, size);
  var status = $("status");
  pin.dataset.kind = status.classList.contains("ok") ? "ok" : status.classList.contains("warn") ? "warn" : "";
  pin.title = status.textContent;
}
