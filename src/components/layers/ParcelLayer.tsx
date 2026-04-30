/**
 * ParcelLayer.tsx — Renders the selected parcel boundary as a Cesium
 * ClassificationPrimitive.
 *
 * WHY ClassificationPrimitive instead of an Entity/Polygon?
 * ==========================================================
 * The app uses Google Photorealistic 3D Tiles, which are rendered as a 3D
 * mesh (not a heightmap terrain). A standard Cesium polygon entity is rendered
 * at a fixed altitude and will be visually hidden *inside* the 3D building
 * mesh — you'd never see it.
 *
 * ClassificationPrimitive is designed specifically for this: it "drapes"
 * geometry over both terrain and 3D tile meshes. With classificationType set
 * to BOTH, the highlight color renders correctly on top of any surface —
 * whether it's the ground, a rooftop, or a building façade.
 *
 * This component:
 *   1. Watches `selectedParcel` in the Zustand store.
 *   2. Removes the previous ClassificationPrimitive when the selection changes.
 *   3. Adds a new one with the parcel's outer ring geometry.
 */

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useStore } from '../../store/useStore';
import { geometryToPositions } from '../../utils/cesiumHelpers';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ParcelLayerProps {
  /** Shared reference to the active Cesium Viewer. */
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ParcelLayer({ viewerRef }: ParcelLayerProps) {
  const selectedParcel = useStore((s) => s.selectedParcel);

  /**
   * We keep a ref to the currently displayed primitive so we can remove it
   * when the selection changes. Using a ref (not state) avoids triggering
   * an extra React render cycle when we add/remove Cesium primitives.
   */
  const primitiveRef = useRef<Cesium.ClassificationPrimitive | null>(null);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // --- Remove the previous primitive -------------------------------------
    // We must explicitly remove the old primitive before adding a new one.
    // Cesium does not manage primitive deduplication — if you forget to remove,
    // you'll accumulate invisible hidden polygons that waste GPU memory.
    if (primitiveRef.current) {
      viewer.scene.primitives.remove(primitiveRef.current);
      primitiveRef.current = null;
    }

    // If no parcel is selected (e.g., after a clear), we're done.
    if (!selectedParcel) return;

    // --- Convert GeoJSON geometry to Cesium positions ----------------------
    // geometryToPositions handles both Polygon and MultiPolygon types and
    // returns an array of Cartesian3 positions representing the outer ring.
    const positions = geometryToPositions(selectedParcel.geometry);
    if (!positions || positions.length < 3) {
      console.warn('[ParcelLayer] Not enough positions to render parcel polygon.');
      return;
    }

    // --- Build the GeometryInstance ----------------------------------------
    // A GeometryInstance wraps the raw geometry with a unique id and
    // appearance attributes. The PolygonGeometry here describes a flat
    // polygon; the ClassificationPrimitive will project it onto whatever
    // surface geometry lies beneath it.
    const geometryInstance = new Cesium.GeometryInstance({
      geometry: new Cesium.PolygonGeometry({
        // The outer ring positions define the parcel boundary.
        polygonHierarchy: new Cesium.PolygonHierarchy(positions),
        // We set arcType to RHUMB (constant bearing geodesic) rather than
        // GEODESIC (great circle), because parcels are small enough that the
        // difference is imperceptible but RHUMB avoids subtle bulging artifacts.
        arcType: Cesium.ArcType.RHUMB,
        // Extremely important for extremely tall Philadelphia skyscrapers:
        // Classification volumes must cover the entire vertical extent of the 3D Tile.
        // We expand the bounding box from just below the ellipsoid up to 1KM high.
        height: -100,
        extrudedHeight: 1000,
      }),
      // An ID allows us to pick this primitive later (future feature).
      id: `parcel-${selectedParcel.properties.BRT_ID}`,
      // Per-instance color attribute applied by PerInstanceColorAppearance.
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          // Amber/gold fill at 50% opacity — visible on dark tiles without
          // obscuring the building geometry beneath.
          Cesium.Color.fromCssColorString('#F59E0B').withAlpha(0.5)
        ),
      },
    });

    // --- Create the ClassificationPrimitive ---------------------------------
    const primitive = new Cesium.ClassificationPrimitive({
      geometryInstances: geometryInstance,

      // PerInstanceColorAppearance reads the color we defined in `attributes`
      // above. It's the simplest appearance for solid-color fill.
      appearance: new Cesium.PerInstanceColorAppearance({
        flat: true, // No lighting — color is always full brightness
      }),

      /**
       * classificationType: BOTH is the critical setting.
       *
       * - TERRAIN: drapes only over terrain (would miss buildings).
       * - CESIUM_3D_TILE: drapes only over 3D Tile meshes (would miss ground).
       * - BOTH: drapes over *all* geometry — what we want for a city parcel
       *         that may span ground level and building footprints.
       */
      classificationType: Cesium.ClassificationType.BOTH,

      // Allow the primitive to render while its async GPU upload is happening.
      // Without this, the primitive is invisible until fully ready.
      asynchronous: false,
    });

    viewer.scene.primitives.add(primitive);
    primitiveRef.current = primitive;

    // Request a re-render so the new primitive appears immediately
    // (necessary because shouldAnimate = false).
    viewer.scene.requestRender();
  }, [selectedParcel, viewerRef]);

  // This component renders nothing into the DOM — all output is in the Cesium canvas.
  return null;
}
