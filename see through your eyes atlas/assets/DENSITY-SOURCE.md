# Globe occurrence layer

Source: [GBIF Maps API](https://techdocs.gbif.org/en/openapi/v2/maps).
`occurrence-density.json` contains a dated local snapshot and the exact source URLs.
Refresh with `python build-density.py` from the atlas project directory.

The build decodes the official EPSG:4326 vector tiles, keeps the center and
`total` occurrence count of each occupied square, and excludes tile-buffer cells.
For display, source cell counts are summed into 1.5掳 longitude/latitude bins.
The 335,147 occupied source cells become 99,898 rendered bins (about 70% fewer),
preserving the total record count. The grid is angular, not equal-area.
No synthetic distribution or land-mask dots are added. Ocean observations remain.
Green tone and dot size use log10(1 + count), saturated at 100,000 records.
An occupied cell is not one species or one individual; recording effort, repeated
observations, and source coverage affect the pattern. This is not species richness
or an equal-area scientific density estimate. Nearby species results still use
iNaturalist and therefore need not match the GBIF layer.

The snapshot is loaded locally, with an explicit geography-only fallback on error.
Cartesian positions are precomputed once; rotation redraws on demand, without
an idle animation loop. Dragging, click selection and keyboard selection were
checked in Chromium; low-end device performance has not been benchmarked.
