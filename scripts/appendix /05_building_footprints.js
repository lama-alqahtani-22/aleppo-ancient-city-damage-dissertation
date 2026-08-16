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
