// UI state shared across modules. Everything else is read from the form when it's needed.
export var state = {
  mode: "one",          // "one": a single code; "many": one code per line of the list
  ctype: "url",         // selected content tab
  view: "fit",          // preview zoom: "fit" or "actual"
  lastInfo: null,       // sizing facts for the code in the preview
  lastMaxN: 0,          // finest grid among the list codes, for the square-size hint
  pendingImages: null   // print images already rendered for the current settings
};

// Pressed button in each [data-group] button group
export var modes = { codeMode: "solid", labelMode: "solid", eyeMode: "same", body: "square", eyeFrame: "square", eyeBall: "square", fmt: "png" };
