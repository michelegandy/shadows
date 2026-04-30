/**
 * solarAnalysis.ts — The Core 3D Raycasting Math.
 *
 * BEGINNER GUIDE:
 * This file is the mathematical heart of the application. It figures out if a property 
 * is shaded by firing virtual lasers (rays) at the sun.
 * 
 * Here is how it works:
 * 1. Test Points: It lays down a 10x10 grid of points over the property boundary.
 * 2. Ground Height: It asks the 3D map exactly how high the ground is at each point.
 * 3. Time Travel: It loops through the months you selected, checking the time every 2 hours 
 *    during daylight.
 * 4. Lasers (Raycasting): At every point and every time, it fires a laser directly toward 
 *    the sun's exact astronomical position.
 * 5. Hit Testing: If the laser hits a 3D building or a tree before it reaches the sun, 
 *    we count that spot as "shaded".
 */

import * as Cesium from 'cesium';
import bbox from '@turf/bbox';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import type { ParcelFeature } from '../store/useStore';

/**
 * Calculates the approximate percentage of the year a parcel is in shade.
 * This is a client-side estimation that uses raycasting against currently loaded 3D tiles.
 * 
 * @param viewer The Cesium Viewer instance
 * @param parcel The selected parcel feature
 * @param onProgress Callback to report progress (0-100)
 * @returns Promise resolving to the percentage (0-100) of time in shade
 */
export async function calculateShadeInRange(
  viewer: Cesium.Viewer,
  parcel: ParcelFeature,
  startMonth: number,
  endMonth: number,
  onProgress: (progress: number) => void
): Promise<number> {
  /**
   * STEP 1: Generate a Grid of Test Points
   * To figure out the average shade of the whole property, we can't just test 
   * one spot. We imagine a 10x10 grid (like a checkerboard) floating over the property.
   * We only keep the points that land perfectly inside the property lines.
   */
  // @ts-ignore Turf types can sometimes be strict about GeoJSON definitions
  const bounds = bbox(parcel); 
  const [minX, minY, maxX, maxY] = bounds;
  
  const points: number[][] = [];
  const resolution = 10; // 10x10 grid over the bounding box
  const stepX = (maxX - minX) / resolution;
  const stepY = (maxY - minY) / resolution;
  
  // We ensure step > 0 to avoid infinite loops on perfectly straight lines
  if (stepX > 0 && stepY > 0) {
    for (let x = minX; x <= maxX; x += stepX) {
      for (let y = minY; y <= maxY; y += stepY) {
        const pt = point([x, y]);
        // @ts-ignore
        if (booleanPointInPolygon(pt, parcel)) {
          points.push([x, y]);
        }
      }
    }
  }

  // Fallback if the parcel is too small or irregular for the grid resolution
  if (points.length === 0) {
    points.push([(minX + maxX) / 2, (minY + maxY) / 2]);
  }

  /**
   * STEP 2: Find the True Ground Height
   * The points we just made are flat (2D). But the real world has hills!
   * We ask Cesium to check the Google 3D Tiles and tell us exactly how high 
   * the ground is at each point. 
   */
  const cartesians = points.map(p => Cesium.Cartesian3.fromDegrees(p[0], p[1]));
  
  // Use clampToHeightMostDetailed to query the height from 3D tiles/terrain
  let validPoints: Cesium.Cartesian3[] = [];
  try {
    const clamped = await viewer.scene.clampToHeightMostDetailed(cartesians);
    validPoints = clamped.filter(c => c !== undefined) as Cesium.Cartesian3[];
  } catch (err) {
    console.warn("Failed to clamp to height most detailed. Falling back to synchronous clamping.", err);
    // Fallback if the most detailed fails or is unsupported
    validPoints = cartesians.map(c => viewer.scene.clampToHeight(c)).filter(c => c !== undefined) as Cesium.Cartesian3[];
  }

  if (validPoints.length === 0) {
    // If we still have no valid heights, just use WGS84 surface (less accurate but won't crash)
    validPoints = cartesians;
  }

  /**
   * Add a "Plant Offset"
   * If we fire our laser exactly from the dirt, it might accidentally hit the dirt 
   * itself! We raise each point by 0.5 meters (about knee-height) so our virtual 
   * plants have room to "breathe" above the ground.
   */
  const offsetPoints = validPoints.map(p => {
    const normal = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(p);
    const offset = Cesium.Cartesian3.multiplyByScalar(normal, 0.5, new Cesium.Cartesian3());
    return Cesium.Cartesian3.add(p, offset, new Cesium.Cartesian3());
  });

  /**
   * STEP 3: Time Travel (Sampling the Sun's Path)
   * The sun moves throughout the year. We loop through the exact Start and End 
   * months the user picked. For the 21st of every month in that range, we pause 
   * time every 2 hours during daylight (8am to 4pm).
   */
  const times: Cesium.JulianDate[] = [];
  let m = startMonth;
  while (true) {
    for (let hour = 8; hour <= 16; hour += 2) {
      // Note: 2023 is a standard non-leap year. UTC time is offset to roughly align with local daytime.
      const date = new Date(Date.UTC(2023, m, 21, hour + 5, 0, 0)); 
      times.push(Cesium.JulianDate.fromDate(date));
    }
    if (m === endMonth) break;
    m = (m + 1) % 12;
  }

  const totalRays = times.length * offsetPoints.length;
  let shadedRays = 0;
  let processedRays = 0;
  const batchSize = 20;

  /**
   * STEP 4: Fire the Lasers! (Raycasting)
   * Now the heavy lifting: For every single point on the ground, at every single 
   * time block we just created, we fire a virtual laser at the sun.
   */
  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    
    // Compute sun position in Earth-fixed coordinates
    const sunPosInertial = Cesium.Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(time);
    let icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
    
    // Rarely, the transform matrix might not be available
    if (!icrfToFixed) {
      icrfToFixed = Cesium.Transforms.computeTemeToPseudoFixedMatrix(time);
    }
    
    const sunPosFixed = Cesium.Matrix3.multiplyByVector(icrfToFixed, sunPosInertial, new Cesium.Cartesian3());

    for (let j = 0; j < offsetPoints.length; j++) {
      const origin = offsetPoints[j];
      
      const direction = Cesium.Cartesian3.normalize(
        Cesium.Cartesian3.subtract(sunPosFixed, origin, new Cesium.Cartesian3()),
        new Cesium.Cartesian3()
      );

      const ray = new Cesium.Ray(origin, direction);
      
      // Perform the intersection test against rendered primitives
      // @ts-ignore - Type definitions may not include pickFromRay
      const hit = viewer.scene.pickFromRay(ray);
      
      /**
       * Hit Testing:
       * Does the laser hit a building, a tree, or a hill before it escapes 
       * into space? If yes, that spot is in the shade!
       */
      if (hit && hit.object) {
         shadedRays++;
      }

      processedRays++;
      
      // Yield to the browser event loop periodically to keep the UI responsive
      if (processedRays % batchSize === 0) {
        onProgress(Math.round((processedRays / totalRays) * 100));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  onProgress(100);
  return Math.round((shadedRays / totalRays) * 100);
}
