export var $ = function(id){ return document.getElementById(id); };

var toastTimer;
export function toast(msg){
  var t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(function(){ t.classList.remove("show"); }, 2600);
}

export function setStatus(el, kind, msg){
  el.className = "status" + (kind ? " " + kind : "");
  el.innerHTML = "";
  if (!msg) return;
  var d = document.createElement("span"); d.className = "dot";
  var t = document.createElement("span"); t.textContent = msg;
  el.appendChild(d); el.appendChild(t);
}
