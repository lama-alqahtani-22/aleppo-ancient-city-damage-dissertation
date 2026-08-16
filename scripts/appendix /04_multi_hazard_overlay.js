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

// ── 11C. DAMAGE COMPOSITE (4-TIER) ─────────────────────
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
print('=== DAMAGE COMPOSITE (4-TIER) ===');
print('Tier 1 - Low (m²):', areaTier1.get('area'));
print('Tier 2 - Moderate (m²):', areaTier2.get('area'));
print('Tier 3 - High (m²):', areaTier3.get('area'));
print('Tier 4 - Severe (m²):', areaTier4.get('area'));
print('% Tier 4 (severe damage):',
  ee.Number(areaTier4.get('area')).divide(totalArea.get('area')).multiply(100));

Map.addLayer(damageTier,
  {min:1, max:4, palette:['#2c7bb6','#ffffbf','#fdae61','#d7191c']},
  '★★★ DAMAGE COMPOSITE (1=Low 2=Mod 3=High 4=Severe)', true);

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
