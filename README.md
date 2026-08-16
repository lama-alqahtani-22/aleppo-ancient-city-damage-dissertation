# Aleppo Ancient City: Multi-Hazard damage Assessment

Google Earth Engine and QGIS code for a multi-temporal, satellite-based 
assessment of compound damage in Aleppo's Ancient City, Syria - 
measuring the interaction between conflict-related building damage 
(2012-2016) and earthquake damage from the February 2023 earthquake.

MSc Geographic Information Science dissertation, University of Edinburgh, 2026.
Author: Lama Alqahtani - Supervisor: Gary Watmough

## Overview
This repository contains the full Google Earth Engine (GEE) JavaScript 
codebase used to:
- Load and process Sentinel-2 imagery across five timepoints (2018, 
  January/February 2023, February 2024, 2024)
- Calculate NDBI and NDVI change indices
- Classify long-term, earthquake, and one-year aftermath building damage
- Construct a multi-hazard overlay and four-tier damage composite
- Quantify building-level damage using OpenStreetMap footprints
- Validate results against independently documented damage at known sites
- Test the significance of compound damage overlap via a Monte Carlo
  spatial permutation test (Python)

Full methodology and results are documented in the accompanying 

## Repository Structure
scripts/
├── aleppo_master_analysis.js #                  Full original analysis script
└── appendix/ # Script split by processing stage,
├── 01_boundary_and_imagery.js # matching Part II Appendix B
├── 02_index_calculation_NDBI_NDVI.js
├── 03_change_detection_thresholds.js
├── 04_multi_hazard_overlay.js
├── 05_building_footprints.js
├── 06_damage_analysis.js
└── 07_significance_testing.py # Spatial permutation test (Part II, 5.2)

## Data Sources
- Sentinel-2 Level-2A Surface Reflectance (COPERNICUS/S2_SR_HARMONIZED), 
  via Google Earth Engine
- Study area boundary: official UNESCO/OpenStreetMap-aligned polygon
- Building footprints: OpenStreetMap (extracted via Overpass Turbo)
- Validation reference data: UNOSAT (2023), Kasmo (2023), UNESCO (2023)

Full data index with metadata is available in the dissertation's 
Technical Report, Appendix D.

## Note
Scripts are organised for readability and correspond to sections of the 
Technical Report; several JS scripts depend on variables defined in earlier 
stages of the pipeline and are not intended to run independently outside 
the context of the full `aleppo_master_analysis.js` script.

`07_significance_testing.py` is standalone and runs outside GEE. It requires
the two damage-classification GeoTIFFs and the boundary shapefile exported
from the JS pipeline (see Part II, Section 4.2), plus Python 3.12, rasterio
1.5.1, geopandas 1.1.4, numpy 2.4.4, and matplotlib 3.10.8.

Full methodology and results are documented in the accompanying
dissertation (Part I: Research Paper, Part II: Technical Report).
