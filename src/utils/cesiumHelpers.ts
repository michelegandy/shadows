/**
 * cesiumHelpers.ts — Utility functions for Cesium camera and geometry work.
 *
 * These helpers are kept in one place so the coordinate math is documented,
 * tested, and not scattered across components.
 */

import * as Cesium from 'cesium';

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

/**
 * Smoothly fly the camera to a set of WGS-84 coordinates.
 *
 * We use a fixed range (altitude) and pitch angle tuned for inspecting
 * individual Philadelphia parcels — close enough to see the building and its
 * shadow, but wide enough to include adjacent context.
 *
 * @param viewer     - The active Cesium Viewer instance.
 * @param longitude  - WGS-84 longitude in decimal degrees.
 * @param latitude   - WGS-84 latitude in decimal degrees.
 */
export function flyToCoordinates(
  viewer: Cesium.Viewer,
  longitude: number,
  latitude: number
): void {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      longitude,
      latitude,
      300 // metres above the surface; gives a good oblique view of the block
    ),
    orientation: {
      // A heading of 0 is due North. We start North-facing so the UI is
      // consistent across searches.
      heading: Cesium.Math.toRadians(0),
      // Negative pitch tilts the camera down toward the ground.
      // -90° gives a true top-down straight overhead view of the parcel boundaries.
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
    duration: 2.0, // seconds — smooth but not sluggish
  });
}

// ---------------------------------------------------------------------------
// Geometry conversion
// ---------------------------------------------------------------------------

/**
 * Convert a GeoJSON Polygon ring (array of [lng, lat] pairs) to an array
 * of Cesium Cartesian3 positions.
 *
 * GeoJSON uses [longitude, latitude] order (x, y), while humans often
 * think [lat, lng]. Cesium's fromDegreesArray expects a flat array of
 * alternating [lon, lat, lon, lat, ...] values.
 *
 * @param ring - A GeoJSON coordinate ring: [[lng, lat], [lng, lat], ...]
 * @returns Flat array of Cesium Cartesian3 positions.
 */
export function geoJsonRingToCartesian3(
  ring: number[][]
): Cesium.Cartesian3[] {
  // Flatten [[lng, lat], ...] → [lng, lat, lng, lat, ...]
  // We skip the closing coordinate (last point == first point in GeoJSON)
  // because Cesium's polygon handles closure automatically.
  const flatCoords: number[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    flatCoords.push(ring[i][0], ring[i][1]); // lon, lat
  }

  return Cesium.Cartesian3.fromDegreesArray(flatCoords);
}

/**
 * Extract the outer ring from a GeoJSON Polygon or MultiPolygon geometry
 * and convert it to Cesium Cartesian3 positions.
 *
 * For MultiPolygon, we use only the first (typically largest) polygon.
 * This covers the vast majority of Philadelphia parcels which are single
 * contiguous shapes.
 *
 * @param geometry - A GeoJSON geometry object (Polygon or MultiPolygon).
 * @returns Flat array of Cartesian3 positions, or null if geometry type unknown.
 */
export function geometryToPositions(
  geometry: { type: string; coordinates: number[][][] | number[][][][] }
): Cesium.Cartesian3[] | null {
  if (geometry.type === 'Polygon') {
    // Polygon coordinates: [outerRing, ...optionalHoles]
    const outerRing = (geometry.coordinates as number[][][])[0];
    return geoJsonRingToCartesian3(outerRing);
  }

  if (geometry.type === 'MultiPolygon') {
    // MultiPolygon coordinates: [polygon0, polygon1, ...]
    // Each polygon: [outerRing, ...holes]
    const firstOuterRing = (geometry.coordinates as number[][][][])[0][0];
    return geoJsonRingToCartesian3(firstOuterRing);
  }

  console.warn('[cesiumHelpers] Unknown geometry type:', geometry.type);
  return null;
}
