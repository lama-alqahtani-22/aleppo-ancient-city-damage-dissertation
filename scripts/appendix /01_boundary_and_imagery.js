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
