// Label typefaces. Japanese characters fall through to Noto Sans JP in every style.
export var FONTS = {
  bold:   { css: '"Archivo", "Noto Sans JP", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif', weight: 800, stretch: "100%" },
  narrow: { css: '"Archivo", "Noto Sans JP", "Hiragino Sans", "Yu Gothic", "Arial Narrow", system-ui, sans-serif', weight: 750, stretch: "62%" },
  mono:   { css: '"JetBrains Mono", "Noto Sans JP", "Hiragino Sans", "Yu Gothic", ui-monospace, Menlo, Consolas, monospace', weight: 700, stretch: "100%" }
};
// Same stylesheet as the <link> in index.html. SVG exports @import it so the label keeps its font.
export var FONT_CSS_URL = "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&family=JetBrains+Mono:wght@700&family=Noto+Sans+JP:wght@700;800&display=swap";

export function fontString(key, px){
  var f = FONTS[key];
  return f.weight + " " + px + "px " + f.css;
}
export function applyStretch(ctx, key){
  if ("fontStretch" in ctx) {
    var map = {"62%":"extra-condensed","100%":"normal"};
    try { ctx.fontStretch = map[FONTS[key].stretch] || "normal"; } catch(e){}
  }
}
function fontSpec(key){
  var f = FONTS[key];
  return (f.stretch !== "100%" ? "extra-condensed " : "") + f.weight + " 40px " + f.css;
}

// Web fonts arrive in pieces (Japanese especially, split by character range), so load the
// pieces a label needs before sizing it, then redraw once they're in.
var fontState = {};
var onLoaded = function(){};
export function onFontsLoaded(fn){ onLoaded = fn; }
export function fontsReadyFor(key, text){
  if (!text || !document.fonts || !document.fonts.load) return true;
  var k = key + "|" + text;
  if (fontState[k] === true) return true;
  if (!fontState[k]) {
    fontState[k] = "loading";
    document.fonts.load(fontSpec(key), text).then(function(){ fontState[k] = true; onLoaded(); }, function(){ fontState[k] = true; });
  }
  return false;
}
// Wait for every piece the labels need, before building files
export async function loadFontsFor(key, texts){
  if (!document.fonts || !document.fonts.load) return;
  try { await document.fonts.load(fontSpec(key), texts.join("")); } catch (e) {}
}
// Start loading the Latin faces so the first draw uses them
export function preloadFonts(){
  try {
    return [
      document.fonts.load('800 40px "Archivo"'), document.fonts.load('extra-condensed 750 40px "Archivo"'),
      document.fonts.load('700 40px "JetBrains Mono"')
    ];
  } catch(e){ return []; }
}
