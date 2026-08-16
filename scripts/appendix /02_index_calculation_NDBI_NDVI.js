// ── 4. INDEX FUNCTIONS ───────────────────────────────────────
function calcNDBI(image) {
  return image.normalizedDifference(['B11', 'B8']).rename('NDBI');
}
function calcNDVI(image) {
  return image.normalizedDifference(['B8', 'B4']).rename('NDVI');
}

// ── 5. CALCULATE INDICES ─────────────────────────────────────
var ndbi2017   = calcNDBI(img2017);
var ndbi2018   = calcNDBI(img2018);
var ndbiPreEQ  = calcNDBI(imgPreEQ);
var ndbiPostEQ = calcNDBI(imgPostEQ);
var ndbi2024   = calcNDBI(img2024);
var ndbiOneYearPost = calcNDBI(imgOneYearPost);

var ndvi2018 = calcNDVI(img2018);
var ndvi2024 = calcNDVI(img2024);
