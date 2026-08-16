// ── 17. DAMAGE ANALYSIS: ALEPPO CITADEL ─────────────────
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
print('=== DAMAGE ANALYSIS: ALEPPO CITADEL ===');
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

// ── 17B. DAMAGE ANALYSIS: AL-MADINA SOUQ *site tested but not included*  ────────────────
// OSM's own official statement (7 Feb 2023) confirmed
// "several buildings in the souks have been weakened" by the EQ

var souqPoint = ee.Geometry.Point([37.14971, 36.20084]);
var souqBuffer = souqPoint.buffer(30);

print('');
print('=== DAMAGE ANALYSIS: AL-MADINA SOUQ ===');
print('EQ damage flagged at Souq (point):',
  eqDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: souqPoint, scale: 10}));
print('EQ damage flagged at Souq (30m buffer):',
  eqDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: souqBuffer, scale: 10}));

Map.addLayer(souqPoint, {color: 'orange'}, 'Al-Madina Souq (sensitivity test point)');

// ── 17C. DAMAGE ANALYSIS: KHAN AL-WAZIR ─────────────────
// Documented in peer-reviewed architectural heritage literature as
// damaged by both the 2012-2016 conflict and the 2023 earthquake

var khanPoint = ee.Geometry.Point([37.159295, 36.200028]);
var khanBuffer = khanPoint.buffer(30);

print('');
print('=== DAMAGE ANALYSIS: KHAN AL-WAZIR ===');
print('Long-term damage flagged at Khan al-Wazir (point):',
  longTermDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: khanPoint, scale: 10}));
print('EQ damage flagged at Khan al-Wazir (point):',
  eqDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: khanPoint, scale: 10}));
print('Long-term damage flagged at Khan al-Wazir (30m buffer):',
  longTermDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: khanBuffer, scale: 10}));
print('EQ damage flagged at Khan al-Wazir (30m buffer):',
  eqDamaged.reduceRegion({reducer: ee.Reducer.max(), geometry: khanBuffer, scale: 10}));

Map.addLayer(khanPoint, {color: 'red'}, 'Khan al-Wazir (sensitivity test point)');
