// ============================================================
// ALEPPO ANCIENT CITY — MASTER ANALYSIS SCRIPT
// Lama Alqahtani | MSc GIS | University of Edinburgh
// Updated: Official OSM boundary + Multi-hazard overlay
//          + Building-level damage counts (OSM footprints)
//          + Sensitivity analysis (Citadel, Souq, Khan al-Wazir)
// ============================================================

// ── 1. STUDY AREA — OFFICIAL OSM BOUNDARY ─────────────────
var ancientCity = ee.FeatureCollection(
  'projects/aleppo-dissertation-489421/assets/ancient_city_boundary'
).geometry();

Map.setCenter(37.1614, 36.1989, 14);

var boundaryOutline = ee.Image().byte().paint({
  featureCollection: ee.FeatureCollection([ee.Feature(ancientCity)]),
  color: 1,
  width: 3
});
Map.addLayer(boundaryOutline, {palette: ['0000FF']}, 'Official OSM Boundary');

// ── 2. IMAGE LOADING FUNCTION ────────────────────────────────
function getImage(startDate, endDate) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(ancientCity)
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
    .sort('CLOUDY_PIXEL_PERCENTAGE')
    .first()
    .clip(ancientCity);
}

// ── 3. LOAD ALL 5 TIMEPOINTS ─────────────────────────────────
var img2017   = getImage('2017-06-01', '2017-09-30');
var img2018   = getImage('2018-06-01', '2018-09-30');
var imgPreEQ  = getImage('2023-01-01', '2023-02-05');
var imgPostEQ = getImage('2023-02-07', '2023-03-31');
var img2024   = getImage('2024-06-01', '2024-09-30');
var imgOneYearPost = getImage('2024-01-15', '2024-02-15');

print('=== IMAGE DATES (verify these look sensible) ===');
print('2017:', img2017.date());
print('2018:', img2018.date());
print('Pre-EQ (Jan 2023):', imgPreEQ.date());
print('Post-EQ (Feb/Mar 2023):', imgPostEQ.date());
print('2024:', img2024.date());
print('One year post-EQ (Feb 2024):', imgOneYearPost.date());

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

// ── 6. BI-TEMPORAL CHANGE 2018 → 2024 ────────────────────────
var change_2018_2024     = ndbi2024.subtract(ndbi2018).rename('delta_NDBI');
var absChange_2018_2024  = change_2018_2024.abs().rename('abs_delta_NDBI');
var ndviChange_2018_2024 = ndvi2024.subtract(ndvi2018).rename('delta_NDVI');

// ── 7. EARTHQUAKE ISOLATION ───────────────────────────────────
var change_EQ    = ndbiPostEQ.subtract(ndbiPreEQ).rename('delta_NDBI_EQ');
var absChange_EQ = change_EQ.abs().rename('abs_delta_NDBI_EQ');

// ── 7B. ONE-YEAR AFTERMATH (Feb 2023 → Feb 2024) ─────────────
var change_Aftermath    = ndbiOneYearPost.subtract(ndbiPostEQ).rename('delta_NDBI_aftermath');
var absChange_Aftermath = change_Aftermath.abs().rename('abs_delta_NDBI_aftermath');

// ── 8B. AFTERMATH DAMAGE CLASSIFICATION (Feb 2023 → Feb 2024) ──
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

// 2018→2024 damage by severity
var areaLow = pixelArea.updateMask(
  absChange_2018_2024.gte(0.15).and(absChange_2018_2024.lt(0.25))
).reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

var areaMod = pixelArea.updateMask(
  absChange_2018_2024.gte(0.25).and(absChange_2018_2024.lt(0.40))
).reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

var areaHigh = pixelArea.updateMask(
  absChange_2018_2024.gte(0.40)
).reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

// EQ damage areas
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

// Vegetation gain
var areaVegGain = pixelArea.updateMask(
  ndviChange_2018_2024.gt(0.05)
).reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

// Pearson correlation
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

// ── 11. MULTI-HAZARD OVERLAY ──────────────────────────────────
// Combines long-term damage (2018→2024) with earthquake damage
// to identify compound-damage zones.
// This MUST come after section 10 since it uses pixelArea/totalArea.
//
// Categories:
// 1 = Long-term damage only (pre-existing change, not EQ-specific)
// 2 = Earthquake damage only (acute EQ event, no prior long-term signal)
// 3 = COMPOUND damage (flagged in BOTH analyses — the core
//     compounding-damage hypothesis: areas already structurally
//     altered before the earthquake that were ALSO hit by it)

var longTermDamaged = absChange_2018_2024.gte(0.15);
var eqDamaged = absChange_EQ.gte(0.10);

var multiHazard = ee.Image(0)
  .where(longTermDamaged.and(eqDamaged.not()), 1)
  .where(longTermDamaged.not().and(eqDamaged), 2)
  .where(longTermDamaged.and(eqDamaged), 3)
  .selfMask()
  .rename('multi_hazard');

var areaLongTermOnly = pixelArea.updateMask(multiHazard.eq(1))
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});
var areaEQOnly = pixelArea.updateMask(multiHazard.eq(2))
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});
var areaCompound = pixelArea.updateMask(multiHazard.eq(3))
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

// ── 11B. EQ vs AFTERMATH OVERLAY ──────────────────────────────
// Does aftermath damage occur in the SAME areas as the acute
// earthquake damage, or in NEW areas not flagged during the
// 15-day window? Built from raw thresholds, not masked
// classification images (see note in section 11).

var eqDamagedRaw = absChange_EQ.gte(0.10);
var aftermathDamagedRaw = absChange_Aftermath.gte(0.12);

var eqVsAftermath = ee.Image(0)
  .where(eqDamagedRaw.and(aftermathDamagedRaw.not()), 1)   // EQ only (stabilised)
  .where(eqDamagedRaw.not().and(aftermathDamagedRaw), 2)   // aftermath only (NEW damage)
  .where(eqDamagedRaw.and(aftermathDamagedRaw), 3)         // persistent/compound damage
  .selfMask()
  .rename('eq_vs_aftermath');

var areaEQOnlyStable = pixelArea.updateMask(eqVsAftermath.eq(1))
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});
var areaAftermathNew = pixelArea.updateMask(eqVsAftermath.eq(2))
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});
var areaPersistent = pixelArea.updateMask(eqVsAftermath.eq(3))
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

print('');
print('=== EQ vs AFTERMATH OVERLAY ===');
print('EQ damage that did NOT continue (stabilised) (m²):', areaEQOnlyStable.get('area'));
print('NEW damage in aftermath year (not in original EQ window) (m²):', areaAftermathNew.get('area'));
print('PERSISTENT damage (both periods) (m²):', areaPersistent.get('area'));
print('% of study area = persistent damage:',
  ee.Number(areaPersistent.get('area')).divide(totalArea.get('area')).multiply(100));
print('% of EQ damage that continued into aftermath:',
  ee.Number(areaPersistent.get('area')).divide(areaEQ.get('area')).multiply(100));

// ── 11C. damage COMPOSITE (4-TIER) ─────────────────────
// Counts how many of the three independent damage analyses
// flag each pixel. More layers flagging a pixel = higher
// damage, since it represents damage detected across
// multiple, independent time windows rather than a single event.
//
// Tier 1 = Low       (0 layers flagged)
// Tier 2 = Moderate  (1 layer flagged)
// Tier 3 = High      (2 layers flagged)
// Tier 4 = Severe    (3 layers flagged — damaged pre-EQ,
//                      hit by EQ, AND continued deteriorating)

var flagLongTerm  = absChange_2018_2024.gte(0.15);
var flagEQ        = absChange_EQ.gte(0.10);
var flagAftermath = absChange_Aftermath.gte(0.12);

var damageScore = flagLongTerm.add(flagEQ).add(flagAftermath)
  .rename('damage_score');

var damageTier = ee.Image(1)
  .where(damageScore.eq(1), 2)
  .where(damageScore.eq(2), 3)
  .where(damageScore.eq(3), 4)
  .rename('damage_tier');

// Statistics
var areaTier1 = pixelArea.updateMask(damageTier.eq(1))
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});
var areaTier2 = pixelArea.updateMask(damageTier.eq(2))
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});
var areaTier3 = pixelArea.updateMask(damageTier.eq(3))
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});
var areaTier4 = pixelArea.updateMask(damageTier.eq(4))
  .reduceRegion({reducer: ee.Reducer.sum(), geometry: ancientCity, scale: 10, maxPixels: 1e9});

print('');
print('=== damage COMPOSITE (4-TIER) ===');
print('Tier 1 - Low (m²):', areaTier1.get('area'));
print('Tier 2 - Moderate (m²):', areaTier2.get('area'));
print('Tier 3 - High (m²):', areaTier3.get('area'));
print('Tier 4 - Severe (m²):', areaTier4.get('area'));
print('% Tier 4 (severe damage):',
  ee.Number(areaTier4.get('area')).divide(totalArea.get('area')).multiply(100));

Map.addLayer(damageTier,
  {min:1, max:4, palette:['#2c7bb6','#ffffbf','#fdae61','#d7191c']},
  '★★★ damage COMPOSITE (1=Low 2=Mod 3=High 4=Severe)', true);

Export.image.toDrive({
  image: damageTier,
  description: 'Aleppo_damage_Composite',
  folder: 'Aleppo_Dissertation',
  fileNamePrefix: 'damage_composite_OSM',
  region: ancientCity, scale: 10, crs: 'EPSG:4326', maxPixels: 1e9
});

// ── 12. PRINT RESULTS ─────────────────────────────────────────
print('');
print('=================================================');
print('RESULTS — ANCIENT CITY ALEPPO (OSM BOUNDARY)');
print('=================================================');
print('Total study area (m²):', totalArea.get('area'));
print('');
print('--- 2018 TO 2024: DAMAGE BY SEVERITY ---');
print('Threshold: |ΔNDBI| ≥ 0.15');
print('Low damage   0.15–0.25 (m²):', areaLow.get('area'));
print('Moderate     0.25–0.40 (m²):', areaMod.get('area'));
print('High         >0.40 (m²):', areaHigh.get('area'));
print('% of study area damaged (≥0.15):',
  ee.Number(areaLow.get('area'))
    .add(areaMod.get('area'))
    .add(areaHigh.get('area'))
    .divide(totalArea.get('area'))
    .multiply(100));
print('');
print('--- EARTHQUAKE ISOLATION (Jan 25 → Feb 9 2023) ---');
print('Threshold: |ΔNDBI| ≥ 0.10');
print('EQ total damage area (m²):', areaEQ.get('area'));
print('EQ low     0.10–0.20 (m²):', areaEQ_low.get('area'));
print('EQ moderate 0.20–0.35 (m²):', areaEQ_mod.get('area'));
print('EQ high    >0.35 (m²):', areaEQ_high.get('area'));
print('% of study area EQ-damaged (≥0.10):',
  ee.Number(areaEQ.get('area'))
    .divide(totalArea.get('area'))
    .multiply(100));
print('');
print('--- VEGETATION GAIN 2018→2024 ---');
print('Vegetation gain area (m²):', areaVegGain.get('area'));
print('');
print('--- SPATIAL CORRELATION ---');
print('Pearson r (NDBI change vs NDVI change):',
  correlation.get('correlation'));
print('(Negative = where buildings lost, vegetation gained)');
print('');
print('=== MULTI-HAZARD OVERLAY RESULTS ===');
print('Long-term damage only (m²):', areaLongTermOnly.get('area'));
print('Earthquake damage only (m²):', areaEQOnly.get('area'));
print('COMPOUND DAMAGE (both) (m²):', areaCompound.get('area'));
print('% of study area = compound damage:',
  ee.Number(areaCompound.get('area')).divide(totalArea.get('area')).multiply(100));
print('% of EQ-damaged area that was ALSO pre-existing damage:',
  ee.Number(areaCompound.get('area')).divide(areaEQ.get('area')).multiply(100));
print('Aftermath change calculated:', absChange_Aftermath);
print('');
print('--- ONE-YEAR AFTERMATH (Feb 2023 → Feb 2024) ---');
print('Threshold: |ΔNDBI| ≥ 0.12');
print('Aftermath damage area (m²):', areaAftermath.get('area'));
print('% of study area aftermath-damaged (≥0.12):',
  ee.Number(areaAftermath.get('area')).divide(totalArea.get('area')).multiply(100));
print('=================================================');

// ── 13. DISPLAY LAYERS ────────────────────────────────────────
Map.addLayer(img2018.select(['B4','B3','B2']), {min:0, max:3000}, '2018 True Colour', false);
Map.addLayer(img2024.select(['B4','B3','B2']), {min:0, max:3000}, '2024 True Colour', false);
Map.addLayer(imgPreEQ.select(['B4','B3','B2']), {min:0, max:3000}, 'Pre-EQ Jan 2023', false);
Map.addLayer(imgPostEQ.select(['B4','B3','B2']), {min:0, max:3000}, 'Post-EQ Feb 2023', false);

Map.addLayer(change_2018_2024,
  {min:-0.3, max:0.3, palette:['#2166ac','white','#d73027']},
  'NDBI Change 2018→2024 (raw)', false);

Map.addLayer(ndviChange_2018_2024,
  {min:-0.3, max:0.3, palette:['#d73027','white','#1a9850']},
  'NDVI Change 2018→2024', false);

Map.addLayer(
  damageClass_2018_2024.updateMask(damageClass_2018_2024.gt(0)),
  {min:1, max:3, palette:['#fee08b','#f46d43','#a50026']},
  'Damage Zones 2018→2024 (1=Low 2=Mod 3=High)', false);

Map.addLayer(
  damageClass_EQ.updateMask(damageClass_EQ.gt(0)),
  {min:1, max:3, palette:['#ffffb2','#fd8d3c','#bd0026']},
  'EQ Damage Zones Jan→Feb 2023', false);

Map.addLayer(multiHazard,
  {min:1, max:3, palette:['#fdae61','#abd9e9','#d7191c']},
  '★★ MULTI-HAZARD OVERLAY (1=LongTerm 2=EQ 3=COMPOUND)', true);

// ── 14. EXPORTS ───────────────────────────────────────────────
Export.image.toDrive({
  image: damageClass_2018_2024,
  description: 'Aleppo_DamageZones_2018_2024_OSM',
  folder: 'Aleppo_Dissertation',
  fileNamePrefix: 'damage_zones_2018_2024_OSM',
  region: ancientCity, scale: 10, crs: 'EPSG:4326', maxPixels: 1e9
});

Export.image.toDrive({
  image: damageClass_EQ,
  description: 'Aleppo_EQ_DamageZones_2023_OSM',
  folder: 'Aleppo_Dissertation',
  fileNamePrefix: 'EQ_damage_zones_2023_OSM',
  region: ancientCity, scale: 10, crs: 'EPSG:4326', maxPixels: 1e9
});

Export.image.toDrive({
  image: change_2018_2024,
  description: 'Aleppo_NDBI_Change_2018_2024_OSM',
  folder: 'Aleppo_Dissertation',
  fileNamePrefix: 'NDBI_change_2018_2024_OSM',
  region: ancientCity, scale: 10, crs: 'EPSG:4326', maxPixels: 1e9
});

Export.image.toDrive({
  image: absChange_EQ,
  description: 'Aleppo_EQ_AbsChange_2023_OSM',
  folder: 'Aleppo_Dissertation',
  fileNamePrefix: 'EQ_abs_change_2023_OSM',
  region: ancientCity, scale: 10, crs: 'EPSG:4326', maxPixels: 1e9
});

Export.image.toDrive({
  image: multiHazard,
  description: 'Aleppo_MultiHazard_Overlay_OSM',
  folder: 'Aleppo_Dissertation',
  fileNamePrefix: 'multi_hazard_overlay_OSM',
  region: ancientCity, scale: 10, crs: 'EPSG:4326', maxPixels: 1e9
});
Export.image.toDrive({
  image: eqVsAftermath,
  description: 'Aleppo_EQ_vs_Aftermath_Overlay',
  folder: 'Aleppo_Dissertation',
  fileNamePrefix: 'eq_vs_aftermath_overlay_OSM',
  region: ancientCity, scale: 10, crs: 'EPSG:4326', maxPixels: 1e9
});

// ── 15. BUILDING-LEVEL DAMAGE COUNTS (OSM) ────────────────────
// Uses OSM building footprints (HOT humanitarian mapping data),
// intersected with each damage layer. Switched from Google Open
// Buildings v3, which has zero coverage in Syria (regional gap +
// explicit conflict-zone exclusion policy — see research log).
// Rule: a building counts as "damaged" if ANY pixel within its
// footprint (+10m buffer for alignment tolerance) is classified
// as damaged in that layer — binary intersection, no % threshold.

var osmBuildings = ee.FeatureCollection(
  'projects/aleppo-dissertation-489421/assets/aleppo_osm_buildings'
)
  .filterBounds(ancientCity)
  .map(function(f) {
    return f.buffer(10); // 10m tolerance for footprint/pixel misalignment
  });

print('');
print('=== BUILDING FOOTPRINT COUNT (OSM) ===');
print('Total buildings in study area (OSM):', osmBuildings.size());

function countDamagedBuildings(damageMask, buildings, label) {
  var withDamageFlag = damageMask.reduceRegions({
    collection: buildings,
    reducer: ee.Reducer.max(), // 1 if any damaged pixel falls in footprint
    scale: 10
  });

  var damagedBuildings = withDamageFlag.filter(ee.Filter.eq('max', 1));

  print(label + ' — damaged building count:', damagedBuildings.size());

  return damagedBuildings;
}

// Long-term, EQ, aftermath — using your raw threshold masks
var longTermDamagedBldgs  = countDamagedBuildings(longTermDamaged, osmBuildings, 'Long-term (2018-2024)');
var eqDamagedBldgs        = countDamagedBuildings(eqDamaged, osmBuildings, 'Earthquake');
var aftermathDamagedBldgs = countDamagedBuildings(aftermathDamagedRaw, osmBuildings, 'Aftermath (1yr)');

// damage tiers — built from your existing damageTier image
var tier1Bldgs = countDamagedBuildings(damageTier.eq(1), osmBuildings, 'damage Tier 1 (Low)');
var tier2Bldgs = countDamagedBuildings(damageTier.eq(2), osmBuildings, 'damage Tier 2 (Moderate)');
var tier3Bldgs = countDamagedBuildings(damageTier.eq(3), osmBuildings, 'damage Tier 3 (High)');
var tier4Bldgs = countDamagedBuildings(damageTier.eq(4), osmBuildings, 'damage Tier 4 (Severe)');

// ── 16. EXPORT BUILDING-LEVEL TABLES ─────────────────────────
Export.table.toDrive({
  collection: eqDamagedBldgs,
  description: 'EQ_Damaged_Buildings_OSM',
  folder: 'Aleppo_Dissertation',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: longTermDamagedBldgs,
  description: 'LongTerm_Damaged_Buildings_OSM',
  folder: 'Aleppo_Dissertation',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: aftermathDamagedBldgs,
  description: 'Aftermath_Damaged_Buildings_OSM',
  folder: 'Aleppo_Dissertation',
  fileFormat: 'CSV'
});

Export.table.toDrive({
  collection: tier4Bldgs,
  description: 'Tier4Severe_Damaged_Buildings_OSM',
  folder: 'Aleppo_Dissertation',
  fileFormat: 'CSV'
});

// ── 17. SENSITIVITY ANALYSIS: ALEPPO CITADEL ─────────────────
// Known damaged location used as an independent validation check.
// Confirmed EQ damage: UNOSAT preliminary damage assessment
// (Pleiades Neo imagery, 8 Feb 2023) found moderate damage to the
// Ottoman Mill tower and surrounding Ottoman-era streets/dwellings;
// Syria's Directorate-General of Antiquities separately confirmed
// collapse of parts of the Ottoman mill, cracked/fallen defensive
// walls, and minaret dome damage.
// Confirmed pre-existing conflict damage: UNITAR-UNOSAT (Jan 2017)
// identified 31 affected historic buildings/areas within the
// Citadel (1 destroyed, several severely/moderately damaged) from
// the 2012-2016 Battle of Aleppo.
// This makes the Citadel a candidate for the COMPOUND damage
// category specifically (flagged in both long-term AND EQ layers),
// directly testing the core multi-hazard hypothesis.

var citadelPoint = ee.Geometry.Point([37.1625, 36.1992]);
var citadelBuffer = citadelPoint.buffer(30); // fallback if single point is noisy

print('');
print('=== SENSITIVITY ANALYSIS: ALEPPO CITADEL ===');
print('Long-term damage flagged at Citadel (point):',
  longTermDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: citadelPoint, scale: 10}));
print('EQ damage flagged at Citadel (point):',
  eqDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: citadelPoint, scale: 10}));
print('Aftermath damage flagged at Citadel (point):',
  aftermathDamagedRaw.reduceRegion({reducer: ee.Reducer.max(), geometry: citadelPoint, scale: 10}));
print('damage tier at Citadel (point):',
  damageTier.reduceRegion({reducer: ee.Reducer.first(), geometry: citadelPoint, scale: 10}));

print('');
print('--- Buffered (30m) version, in case point is noisy ---');
print('Long-term damage flagged at Citadel (30m buffer, any):',
  longTermDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: citadelBuffer, scale: 10}));
print('EQ damage flagged at Citadel (30m buffer, any):',
  eqDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: citadelBuffer, scale: 10}));
print('Aftermath damage flagged at Citadel (30m buffer, any):',
  aftermathDamagedRaw.reduceRegion({reducer: ee.Reducer.max(), geometry: citadelBuffer, scale: 10}));

Map.centerObject(citadelPoint, 18);
Map.addLayer(citadelPoint, {color: 'yellow'}, 'Aleppo Citadel (sensitivity test point)');

// ── 17B. SENSITIVITY ANALYSIS: AL-MADINA SOUQ ────────────────
// OSM's own official statement (7 Feb 2023) confirmed
// "several buildings in the souks have been weakened" by the EQ

var souqPoint = ee.Geometry.Point([37.14971, 36.20084]);
var souqBuffer = souqPoint.buffer(30);

print('');
print('=== SENSITIVITY ANALYSIS: AL-MADINA SOUQ ===');
print('EQ damage flagged at Souq (point):',
  eqDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: souqPoint, scale: 10}));
print('EQ damage flagged at Souq (30m buffer):',
  eqDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: souqBuffer, scale: 10}));

Map.addLayer(souqPoint, {color: 'orange'}, 'Al-Madina Souq (sensitivity test point)');

// ── 17C. SENSITIVITY ANALYSIS: KHAN AL-WAZIR ─────────────────
// Documented in peer-reviewed architectural heritage literature as
// damaged by both the 2012-2016 conflict and the 2023 earthquake

var khanPoint = ee.Geometry.Point([37.159295, 36.200028]);
var khanBuffer = khanPoint.buffer(30);

print('');
print('=== SENSITIVITY ANALYSIS: KHAN AL-WAZIR ===');
print('Long-term damage flagged at Khan al-Wazir (point):',
  longTermDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: khanPoint, scale: 10}));
print('EQ damage flagged at Khan al-Wazir (point):',
  eqDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: khanPoint, scale: 10}));
print('Long-term damage flagged at Khan al-Wazir (30m buffer):',
  longTermDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: khanBuffer, scale: 10}));
print('EQ damage flagged at Khan al-Wazir (30m buffer):',
  eqDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: khanBuffer, scale: 10}));

Map.addLayer(khanPoint, {color: 'red'}, 'Khan al-Wazir (sensitivity test point)');
