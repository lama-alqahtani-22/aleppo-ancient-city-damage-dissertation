"""
Spatial permutation test for compound damage overlap significance.

Inputs: damage_zones_2018_2024_OSM.tif, EQ_damage_zones_2023_OSM.tif,
        ancient_city_boundary shapefile (all exported/sourced as described
        in Part II, Sections 4.2 and Appendix A).

Corresponds to Part II, Section 5.2 "Statistical Significance Testing" and
Appendix C of the Technical Report.
"""

import rasterio
import geopandas as gpd
from rasterio.features import rasterize
import numpy as np
import matplotlib.pyplot as plt

np.random.seed(42)  # fixed seed for reproducibility

# --- File paths (update to local paths as needed) ---
EQ_DAMAGE_TIF = 'EQ_damage_zones_2023_OSM.tif'
LONGTERM_DAMAGE_TIF = 'damage_zones_2018_2024_OSM.tif'
BOUNDARY_SHP = 'ancient_city_boundary.shp'

# --- Load damage layers ---
with rasterio.open(EQ_DAMAGE_TIF) as src:
    transform = src.transform
    shape = src.shape
    eq = src.read(1)
with rasterio.open(LONGTERM_DAMAGE_TIF) as src:
    lt = src.read(1)

# --- Rasterize study boundary onto the same grid ---
gdf = gpd.read_file(BOUNDARY_SHP)
boundary_mask = rasterize(
    [(geom, 1) for geom in gdf.geometry],
    out_shape=shape, transform=transform, fill=0, dtype='uint8'
).astype(bool)

# --- True pixel area (geographic CRS -> geodesic area at study latitude) ---
px_area = 80.53044141083956  # m^2, calibrated against known study area (3,440,077 m^2)

eq_bin = (eq >= 1) & boundary_mask
lt_bin = (lt >= 1) & boundary_mask

observed_overlap_px = (eq_bin & lt_bin).sum()
observed_overlap_m2 = observed_overlap_px * px_area

# --- Permutation test: toroidal shift of long-term layer, re-masked each time ---
n_perms = 5000
rows, cols = shape
null_overlaps_px = np.empty(n_perms, dtype=np.int64)

for i in range(n_perms):
    dx = np.random.randint(0, cols)
    dy = np.random.randint(0, rows)
    shifted_lt = np.roll(np.roll(lt_bin, dy, axis=0), dx, axis=1)
    shifted_lt_masked = shifted_lt & boundary_mask
    null_overlaps_px[i] = (eq_bin & shifted_lt_masked).sum()

null_overlaps_m2 = null_overlaps_px * px_area

p_value = (null_overlaps_px >= observed_overlap_px).sum() / n_perms
mean_null = null_overlaps_m2.mean()
std_null = null_overlaps_m2.std()
z_score = (observed_overlap_m2 - mean_null) / std_null

print(f"Observed compound damage: {observed_overlap_m2:.0f} m2")
print(f"Null distribution (n={n_perms}): mean={mean_null:.0f} m2, "
      f"std={std_null:.0f} m2, max={null_overlaps_m2.max():.0f} m2")
print(f"z-score: {z_score:.2f}")
print(f"p-value: <{1/n_perms:.4f}" if p_value == 0 else f"p-value: {p_value:.4f}")
