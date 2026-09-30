// Content types: turn the form into the text the QR code holds
import { $ } from "./ui/dom.js";
import { state } from "./state.js";

export var CONTENT_TYPES = ["url", "text", "email", "tel", "sms", "wifi", "vcard", "geo", "list"];

function v(id){ return $(id).value.trim(); }
function wifiEsc(t){ return t.replace(/([\\;,:"])/g, "\\$1"); }
function vcEsc(t){ return t.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1"); }

// The data for the selected tab, or { data: "", need: "what's missing" }
export function getContent(){
  switch (state.ctype) {
    case "url": {
      var u = v("ctUrl");
      if (!u) return { data: "", need: "Enter a link to make the code." };
      if (!/^[a-z][a-z0-9+.-]*:/i.test(u) && /\./.test(u)) u = "https://" + u;
      return { data: u };
    }
    case "text": {
      var t = $("ctText").value;
      return t.trim() ? { data: t } : { data: "", need: "Enter some text to make the code." };
    }
    case "email": {
      var a = v("ctEmail");
      if (!a) return { data: "", need: "Enter an email address to make the code." };
      var q = [];
      if (v("ctEmailSubj")) q.push("subject=" + encodeURIComponent(v("ctEmailSubj")));
      if ($("ctEmailBody").value.trim()) q.push("body=" + encodeURIComponent($("ctEmailBody").value.trim()));
      return { data: "mailto:" + a + (q.length ? "?" + q.join("&") : "") };
    }
    case "tel": {
      var n = v("ctTel").replace(/[^0-9+*#]/g, "");
      return n ? { data: "tel:" + n } : { data: "", need: "Enter a phone number to make the code." };
    }
    case "sms": {
      var sn = v("ctSmsNum").replace(/[^0-9+*#]/g, "");
      if (!sn) return { data: "", need: "Enter a phone number to make the code." };
      return { data: "SMSTO:" + sn + ":" + $("ctSmsMsg").value.trim() };
    }
    case "wifi": {
      var ssid = $("ctWifiSsid").value;
      if (!ssid.trim()) return { data: "", need: "Enter the network name to make the code." };
      var enc = $("ctWifiEnc").value, pw = $("ctWifiPass").value;
      var d = "WIFI:T:" + enc + ";S:" + wifiEsc(ssid) + ";";
      if (enc !== "nopass") d += "P:" + wifiEsc(pw) + ";";
      if ($("ctWifiHidden").checked) d += "H:true;";
      return { data: d + ";" };
    }
    case "vcard": {
      var first = v("ctVFirst"), last = v("ctVLast"), org = v("ctVOrg");
      if (!first && !last && !org) return { data: "", need: "Enter a name or company to make the code." };
      var lines = ["BEGIN:VCARD", "VERSION:3.0",
        "N:" + vcEsc(last) + ";" + vcEsc(first) + ";;;",
        "FN:" + vcEsc([first, last].filter(Boolean).join(" ") || org)];
      if (org) lines.push("ORG:" + vcEsc(org));
      if (v("ctVTitle")) lines.push("TITLE:" + vcEsc(v("ctVTitle")));
      if (v("ctVMobile")) lines.push("TEL;TYPE=CELL:" + v("ctVMobile"));
      if (v("ctVPhone")) lines.push("TEL;TYPE=WORK:" + v("ctVPhone"));
      if (v("ctVEmail")) lines.push("EMAIL:" + v("ctVEmail"));
      if (v("ctVUrl")) lines.push("URL:" + v("ctVUrl"));
      if (v("ctVStreet") || v("ctVCity") || v("ctVState") || v("ctVZip") || v("ctVCountry"))
        lines.push("ADR:;;" + [v("ctVStreet"), v("ctVCity"), v("ctVState"), v("ctVZip"), v("ctVCountry")].map(vcEsc).join(";"));
      lines.push("END:VCARD");
      return { data: lines.join("\r\n") };
    }
    case "geo": {
      var la = parseFloat(v("ctLat")), lo = parseFloat(v("ctLng"));
      if (!v("ctLat") || !v("ctLng")) return { data: "", need: "Enter a latitude and longitude to make the code." };
      if (!(la >= -90 && la <= 90) || !(lo >= -180 && lo <= 180)) return { data: "", need: "Latitude runs from -90 to 90 and longitude from -180 to 180." };
      return { data: "geo:" + la + "," + lo };
    }
  }
  return { data: "" };
}

// Each line: ID then content, split on the first tab, or else the first comma
export function parseRows(){
  return $("idMany").value.split(/\r?\n/).map(function(line){
    if (!line.trim()) return null;
    var i = line.indexOf("\t");
    if (i === -1) {
      // First comma of any kind: , 、 ，
      var hits = [",", "、", "，"].map(function(ch){ return line.indexOf(ch); }).filter(function(x){ return x >= 0; });
      i = hits.length ? Math.min.apply(null, hits) : -1;
    }
    if (i === -1) return { id: line.trim(), data: "" };
    return { id: line.slice(0, i).trim(), data: line.slice(i + 1).trim() };
  }).filter(Boolean);
}
