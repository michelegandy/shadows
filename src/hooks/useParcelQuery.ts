/**
 * useParcelQuery.ts — React Query hook for the Philadelphia Water Department
 * (PWD) Parcels ArcGIS REST Feature Service.
 *
 * Given an OPA account number (BRT_ID), this hook fetches the GeoJSON polygon
 * representing the parcel boundary. This geometry is later rendered in
 * ParcelLayer.tsx as a Cesium ClassificationPrimitive.
 *
 * ArcGIS REST API docs:
 * https://services.arcgis.com/fLeYwv7uS3PkizuK/arcgis/rest/services/PWD_PARCELS/FeatureServer/0
 */

import { useQuery } from '@tanstack/react-query';
import { distance, center, point } from '@turf/turf';
import type { ParcelFeature } from '../store/useStore';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARCELS_URL =
  'https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/PWD_PARCELS/FeatureServer/0/query';

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

/**
 * Fetch parcel GeoJSON from the PWD ArcGIS Feature Service via Spatial Query.
 */
export async function fetchParcelByCoords(lon: number, lat: number): Promise<ParcelFeature> {
  const buildParams = (extraParams: Record<string, string> = {}) => new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'OWNER1,ADDRESS,BRT_ID',
    f: 'geojson',
    inSR: '4326',
    outSR: '4326',
    returnGeometry: 'true',
    ...extraParams,
  });

  // Step 1: Try exact intersection
  let response = await fetch(`${PARCELS_URL}?${buildParams().toString()}`);
  if (!response.ok) {
    throw new Error(`ArcGIS API error ${response.status}: ${response.statusText}`);
  }
  let data = await response.json();

  // Step 2: Fallback to 50m buffer search
  if (!data.features || data.features.length === 0) {
    response = await fetch(`${PARCELS_URL}?${buildParams({ distance: '50', units: 'esriSRUnit_Meter' }).toString()}`);
    if (!response.ok) {
      throw new Error(`ArcGIS API error ${response.status}: ${response.statusText}`);
    }
    data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      throw new Error(`No property boundaries found near this coordinate.`);
    }

    // Find the nearest feature
    const searchPoint = point([lon, lat]);
    let nearestFeature = data.features[0];
    let minDistance = Infinity;

    for (const feature of data.features) {
      const featureCenter = center(feature);
      const dist = distance(searchPoint, featureCenter, { units: 'meters' });
      if (dist < minDistance) {
        minDistance = dist;
        nearestFeature = feature;
      }
    }
    return nearestFeature as ParcelFeature;
  }

  return data.features[0] as ParcelFeature;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook that fetches the intersected parcel polygon given coordinates.
 */
export function useParcelQuery(coords: [number, number] | null) {
  return useQuery<ParcelFeature, Error>({
    queryKey: ['parcel', coords],
    queryFn: () => fetchParcelByCoords(coords![0], coords![1]),

    // Only run when we have valid coordinates
    enabled: !!coords,

    // Parcel geometry is stable — cache for 30 minutes.
    staleTime: 1000 * 60 * 30,

    retry: 1,
  });
}
