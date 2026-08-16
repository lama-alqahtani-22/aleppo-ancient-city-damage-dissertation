// ── 6. BI-TEMPORAL CHANGE 2018 → 2024 ────────────────────────
var change_2018_2024     = ndbi2024.subtract(ndbi2018).rename('delta_NDBI');
var absChange_2018_2024  = change_2018_2024.abs().rename('abs_delta_NDBI');
var ndviChange_2018_2024 = ndvi2024.subtract(ndvi2018).rename('delta_NDVI');

// ── 7. EARTHQUAKE ISOLATION ───────────────────────────────────
var change_EQ    = ndbiPostEQ.subtract(ndbiPreEQ).rename('delta_NDBI_EQ');
var absChange_EQ = change_EQ.abs().rename('abs_delta_NDBI_EQ');

// ── 7A. ONE-YEAR AFTERMATH (Feb 2023 → Feb 2024) ─────────────
var change_Aftermath    = ndbiOneYearPost.subtract(ndbiPostEQ).rename('delta_NDBI_aftermath');
var absChange_Aftermath = change_Aftermath.abs().rename('abs_delta_NDBI_aftermath');

// ── 7B. AFTERMATH DAMAGE CLASSIFICATION (Feb 2023 → Feb 2024) ──
// Threshold: |ΔNDBI| ≥ 0.12
// Rationale: Al-Razi Hospital one-year stability test shows only
// 0.007 NDBI change over this period — threshold is ~17x noise
// floor, positioned between the 15-day EQ threshold (0.10) and
// the 6-year long-term threshold (0.15), consistent with the
// intermediate time window.
//
// Classes: 1=Low(0.12-0.22) 2=Moderate(0.22-0.37) 3=High(>0.37)

var damageClass_Aftermath = ee.Image(0)
  .where(absChange_Aftermath.gte(0.12).and(absChange_Aftermath.lt(0.22)), 1)
  .where(absChange_Aftermath.gte(0.22).and(absChange_Aftermath.lt(0.37)), 2)
  .where(absChange_Aftermath.gte(0.37), 3)
  .selfMask()
  .updateMask(absChange_Aftermath.gte(0.12))
  .rename('aftermath_damage_class');

// ── 8. DAMAGE CLASSIFICATION — 2018 TO 2024 ──────────────────
// Threshold: |ΔNDBI| ≥ 0.15
// Rationale: Al-Razi Hospital summer stability test (2018→2024)
// shows 6-year NDBI change of only 0.004 on a known stable
// building (ICRC confirmed functioning Jan 2026).
// Short-term winter stability test (47 non-adjacent year-pairs)
// shows maximum change of 0.042.
// Threshold of 0.15 is 37x the long-term noise floor —
// conservative and empirically grounded.
//
// Classes: 1=Low(0.15-0.25) 2=Moderate(0.25-0.40) 3=High(>0.40)

var damageClass_2018_2024 = ee.Image(0)
  .where(absChange_2018_2024.gte(0.15).and(absChange_2018_2024.lt(0.25)), 1)
  .where(absChange_2018_2024.gte(0.25).and(absChange_2018_2024.lt(0.40)), 2)
  .where(absChange_2018_2024.gte(0.40), 3)
  .selfMask()
  .updateMask(absChange_2018_2024.gte(0.15))
  .rename('damage_class');

// ── 9. EARTHQUAKE DAMAGE CLASSIFICATION ──────────────────────
// Threshold: |ΔNDBI| ≥ 0.10 for short 15-day window
// Mean |ΔNDBI| across study area in EQ window = 0.043
//
// Classes: 1=Low(0.10-0.20) 2=Moderate(0.20-0.35) 3=High(>0.35)

var damageClass_EQ = ee.Image(0)
  .where(absChange_EQ.gte(0.10).and(absChange_EQ.lt(0.20)), 1)
  .where(absChange_EQ.gte(0.20).and(absChange_EQ.lt(0.35)), 2)
  .where(absChange_EQ.gte(0.35), 3)
  .selfMask()
  .updateMask(absChange_EQ.gte(0.10))
  .rename('EQ_damage_class');

// ── 10. STATISTICS SETUP ──────────────────────────────────────
var pixelArea = ee.Image.pixelArea();

var totalArea = pixelArea.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: ancientCity,
  scale: 10,
  maxPixels: 1e9
});

// ── 10A. 2018→2024 damage by severity ──
var areaLow = pixelArea.updateMask(
  absChange_2018_2024.gte(0.15).and(absChange_2018_2024.lt(0.25))
).reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

var areaMod = pixelArea.updateMask(
  absChange_2018_2024.gte(0.25).and(absChange_2018_2024.lt(0.40))
).reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

var areaHigh = pixelArea.updateMask(
  absChange_2018_2024.gte(0.40)
).reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

// ── 10B. EQ damage areas ──
var areaEQ = pixelArea.updateMask(
  absChange_EQ.gte(0.10)
).reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

var areaEQ_low = pixelArea.updateMask(
  absChange_EQ.gte(0.10).and(absChange_EQ.lt(0.20))
).reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

var areaEQ_mod = pixelArea.updateMask(
  absChange_EQ.gte(0.20).and(absChange_EQ.lt(0.35))
).reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

var areaEQ_high = pixelArea.updateMask(
  absChange_EQ.gte(0.35)
).reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

// ── 10C. Vegetation gain ──
var areaVegGain = pixelArea.updateMask(
  ndviChange_2018_2024.gt(0.05)
).reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

// ── 10D. Pearson correlation ──
var correlation = change_2018_2024.select('delta_NDBI')
  .addBands(ndviChange_2018_2024.select('delta_NDVI'))
  .reduceRegion({
    reducer: ee.Reducer.pearsonsCorrelation(),
    geometry: ancientCity,
    scale: 10,
    maxPixels: 1e9
  });
  var areaAftermath = pixelArea.updateMask(
  absChange_Aftermath.gte(0.12)
).reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});
