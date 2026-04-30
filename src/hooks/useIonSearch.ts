import { useQuery } from '@tanstack/react-query';
import * as Cesium from 'cesium';

export interface IonSearchResult {
  displayName: string;
  longitude: number;
  latitude: number;
  rectangle?: Cesium.Rectangle;
}

async function geocodeAddress(query: string, scene: Cesium.Scene): Promise<IonSearchResult> {
  const searchTerm = query.toLowerCase().includes('philadelphia')
    ? query
    : `${query}, Philadelphia, PA`;

  const geocoder = new Cesium.IonGeocoderService({ scene });
  const results = await geocoder.geocode(searchTerm);

  if (!results || results.length === 0) {
    throw new Error('No addresses found for that query.');
  }

  // Take the best match
  const bestMatch = results[0];
  let lon = 0;
  let lat = 0;

  // Destination can be a Cartesian3 or a Rectangle.
  // Ion geocoder typically returns a Cartesian3 for specific addresses,
  // or a Rectangle for larger areas like zip codes or neighborhoods.
  if (bestMatch.destination instanceof Cesium.Rectangle) {
    const center = Cesium.Rectangle.center(bestMatch.destination);
    lon = Cesium.Math.toDegrees(center.longitude);
    lat = Cesium.Math.toDegrees(center.latitude);
  } else if (bestMatch.destination instanceof Cesium.Cartesian3) {
    const cartographic = Cesium.Cartographic.fromCartesian(bestMatch.destination);
    lon = Cesium.Math.toDegrees(cartographic.longitude);
    lat = Cesium.Math.toDegrees(cartographic.latitude);
  }

  return {
    displayName: bestMatch.displayName,
    longitude: lon,
    latitude: lat,
    rectangle: bestMatch.destination instanceof Cesium.Rectangle ? bestMatch.destination : undefined
  };
}

export function useIonSearch(query: string | null, scene?: Cesium.Scene) {
  return useQuery<IonSearchResult, Error>({
    queryKey: ['ion-search', query],
    queryFn: () => geocodeAddress(query!, scene!),
    enabled: !!query && query.trim().length > 0 && !!scene,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: 1,
  });
}
