/**
 * Globe.tsx — The 3D Map Component.
 *
 * BEGINNER GUIDE:
 * This file is responsible for drawing the actual 3D world on your screen.
 * We use a library called CesiumJS to do this.
 *
 * Here's what happens in this file:
 * 1. When the app starts, we create a new `Cesium.Viewer` inside an empty HTML <div>.
 * 2. We load "Google Photorealistic 3D Tiles" which gives us the 3D buildings and trees.
 * 3. We turn on shadows and tie the sun's position to our app's slider controls.
 * 4. We use `useEffect` (a React tool) to say: "Every time the user moves a slider, 
 *    update the time in the 3D world and redraw the shadows."
 */

import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useStore } from '../../store/useStore';
import { sliderValuesToJulianDate } from '../../utils/dateUtils';
import { fetchParcelByCoords } from '../../hooks/useParcelQuery';
import { flyToCoordinates } from '../../utils/cesiumHelpers';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GlobeProps {
  /** Ref owned by App.tsx. Globe writes the Viewer instance into it. */
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Globe({ viewerRef }: GlobeProps) {
  /** The DOM element that Cesium renders into. */
  const containerRef = useRef<HTMLDivElement>(null);

  const minuteOfDay = useStore((s) => s.minuteOfDay);
  const dayOfYear = useStore((s) => s.dayOfYear);

  // -------------------------------------------------------------------------
  // Viewer initialization — runs once on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;

    // --- Token setup --------------------------------------------------------
    // The Cesium Ion token must be set before any Ion assets are loaded.
    // If the token is missing we warn loudly rather than silently failing.
    const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
    if (!token) {
      console.warn(
        '[Globe] VITE_CESIUM_ION_TOKEN is not set. ' +
        'Copy .env.example to .env and add your token.'
      );
    } else {
      Cesium.Ion.defaultAccessToken = token;
    }

    // --- Create the Viewer --------------------------------------------------
    // We disable most default UI widgets because we provide our own glassmorphic
    // control panel. Keeping widgets off also improves initial render performance.
    const viewer = new Cesium.Viewer(containerRef.current, {
      // Disable the default timeline and animation widgets — we control time
      // via our own sliders.
      animation: false,
      timeline: false,
      // Disable the base layer picker; we only use Google 3D Tiles.
      baseLayerPicker: false,
      // Disable the geocoder widget — we have our own search bar.
      geocoder: false,
      // Disable the home button — we manage camera flyTo ourselves.
      homeButton: false,
      // Disable the scene mode picker; we always use 3D.
      sceneModePicker: false,
      // Disable the navigation help button.
      navigationHelpButton: false,
      // Disable default terrain — Google 3D Tiles supply their own.
      terrainProvider: undefined,
      // Cesium automatically requests WebGL 2 when available; no override needed.
    });

    // Store in the shared ref so other components can access the viewer.
    viewerRef.current = viewer;

    // --- Load Google Photorealistic 3D Tiles --------------------------------
    // Cesium Ion asset 2275207 is Google's photorealistic mesh of the entire
    // Earth. It includes buildings, trees, and terrain as a single tiled mesh,
    // which is essential for casting accurate shadows onto real structures.
    Cesium.createGooglePhotorealistic3DTileset({
      // Disable Google's default credits/attribution overlay to avoid UI clutter.
      // (We still respect attribution requirements via Cesium's built-in credit display.)
    })
      .then((tileset) => {
        // Google 3D Tiles do not provide surface normals, so switching to a PBR 
        // lighting model makes them turn completely black because Cesium can't 
        // calculate light reflections. 
        // Instead, we use an UNLIT model and inject a custom fragment shader that
        // smoothly dims the tile colors based on the sun's position relative to the horizon.
        tileset.customShader = new Cesium.CustomShader({
          lightingModel: Cesium.LightingModel.UNLIT,
          fragmentShaderText: `
            void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
              // The up vector for any point on the globe is simply the normalized ECEF position
              vec3 up = normalize(fsInput.attributes.positionWC);
              
              // Calculate the sun's altitude angle relative to this fragment's zenith
              float sunDot = dot(up, czm_sunDirectionWC);
              
              // Smooth transition starting about 30 mins before sunset (0.1) and 
              // resolving to full darkness exactly at the horizon (0.0).
              float daylightMix = smoothstep(0.0, 0.1, sunDot);
              
              // Base brightness: 100% white during the day, nearly pitch-black at night
              vec3 dayColor = vec3(1.0);
              vec3 nightColor = vec3(0.01, 0.015, 0.025); 
              
              vec3 timeTint = mix(nightColor, dayColor, daylightMix);
              
              material.diffuse *= timeTint;
            }
          `
        });

        viewer.scene.primitives.add(tileset);

        // Fly to an oblique view of the Center City skyline on initial load.
        viewer.camera.flyTo({
          // Position the camera south of Center City, up high (matches Home button config)
          destination: Cesium.Cartesian3.fromDegrees(-75.1652, 39.9350, 1200),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-35),
            roll: 0,
          },
          duration: 0, // Instant on first load
        });
      })
      .catch((err) => {
        console.error('[Globe] Failed to load Google 3D Tiles:', err);
      });

    // --- Shadow & Lighting configuration ------------------------------------
    // Shadows require two things to be enabled:
    //   1. viewer.shadows = true  →  tells Cesium to compute shadow maps each frame
    //   2. terrainShadows = ENABLED  →  allows the terrain/mesh to both cast & receive
    viewer.shadows = true;
    viewer.terrainShadows = Cesium.ShadowMode.ENABLED;

    // Enable dynamic atmosphere lighting so the sky and fog tint correctly
    // during sunrise, sunset, and night.
    // @ts-ignore
    viewer.scene.dynamicAtmosphereLighting = true;
    // @ts-ignore
    viewer.scene.dynamicAtmosphereLightingFromSun = true;

    // Hide the base globe! Google 3D Tiles provide the entire earth surface.
    // The base globe doesn't share our custom day/night shader, so when it 
    // pokes through the tileset's ground, it looks unnaturally bright at night.
    // Hiding it ensures uniform darkness and prevents Z-fighting.
    viewer.scene.globe.show = false;

    // Shadow map tuning:
    //  - maximumDistance: Shadows are only computed within this radius of the
    //    camera. Reducing from the default (~500k m) to 5000m dramatically
    //    improves shadow quality close-up while keeping performance acceptable.
    //  - size: The shadow map texture resolution in pixels. 2048 provides a
    //    good balance; use 4096 on high-end GPUs for crisper parcel edges.
    //  - softShadows: Slightly blurs shadow edges for a more realistic look.
    //  - fadingEnabled: Disabled here because we want instant, hard shadows right 
    //    up to the exact mathematical sunset.
    viewer.shadowMap.maximumDistance = 5000;
    viewer.shadowMap.size = 2048;
    viewer.shadowMap.softShadows = true;
    viewer.shadowMap.fadingEnabled = false;

    // --- Clock configuration ------------------------------------------------
    // We take full control of the clock. Setting clockStep to SYSTEM_CLOCK
    // would make time advance in real-time; we want TICK_DEPENDENT so time
    // only changes when we explicitly set currentTime from the sliders.
    viewer.clock.shouldAnimate = false;
    viewer.clock.clockStep = Cesium.ClockStep.TICK_DEPENDENT;

    // --- Map Click to Select Parcel -----------------------------------------
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(async (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      if (!viewer.scene.pickPositionSupported) return;

      // Pick the 3D position where the user clicked
      const pickedObject = viewer.scene.pick(click.position);
      if (pickedObject) {
        const position = viewer.scene.pickPosition(click.position);
        if (position) {
          const cartographic = Cesium.Cartographic.fromCartesian(position);
          const lon = Cesium.Math.toDegrees(cartographic.longitude);
          const lat = Cesium.Math.toDegrees(cartographic.latitude);
          
          try {
            useStore.getState().setIsSearching(true);
            const parcel = await fetchParcelByCoords(lon, lat);
            useStore.getState().setSelectedParcel(parcel);
            useStore.getState().setSearchError(null);
            flyToCoordinates(viewer, lon, lat);
          } catch (err: any) {
            useStore.getState().setSearchError(err.message || 'Could not find parcel at clicked location.');
          } finally {
            useStore.getState().setIsSearching(false);
          }
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // --- Cleanup ------------------------------------------------------------
    return () => {
      // Destroying the viewer releases WebGL context and removes DOM children.
      // This is essential to prevent "context lost" errors if the component
      // ever remounts (which StrictMode would trigger — hence we disable it).
      if (!viewer.isDestroyed()) {
        handler.destroy();
        viewer.destroy();
      }
      viewerRef.current = null;
    };
  }, []); // Empty deps: run only once on mount/unmount

  // -------------------------------------------------------------------------
  // Sync clock time when sliders change
  // -------------------------------------------------------------------------
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Convert slider values → JulianDate and push to the viewer clock.
    // The viewer re-renders immediately because we manually tick the clock.
    const julianDate = sliderValuesToJulianDate(dayOfYear, minuteOfDay);
    viewer.clock.currentTime = julianDate;

    // Requesting a render is necessary because shouldAnimate = false means
    // Cesium won't redraw automatically; it only redraws on user interaction
    // or explicit render requests.
    viewer.scene.requestRender();

    // --- Fix for night time "under-earth" shadow streaks ---
    // Because we disabled fadingEnabled on the shadowMap to keep sunset shadows
    // sharp, Cesium will attempt to cast shadows even when the sun is below the 
    // horizon, shining "up" through the earth and creating chaotic bright streaks.
    // We geometrically calculate if the sun is below Philadelphia's horizon and 
    // instantly turn off the shadow engine at night to prevent this glitch.
    try {
      const sunPosition = Cesium.Simon1994PlanetaryPositions.computeSunPositionInEarthInertialFrame(julianDate);
      // Transform safety fallback in case exact transform data hasn't loaded yet
      const transform = Cesium.Transforms.computeTemeToPseudoFixedMatrix(julianDate) 
                     ?? Cesium.Transforms.computeIcrfToFixedMatrix(julianDate);
                     
      if (transform) {
        const sunPositionFixed = Cesium.Matrix3.multiplyByVector(transform, sunPosition, new Cesium.Cartesian3());
        const phillyPosition = Cesium.Cartesian3.fromDegrees(-75.1652, 39.9526);
        const up = Cesium.Cartesian3.normalize(phillyPosition, new Cesium.Cartesian3());
        const sunDir = Cesium.Cartesian3.normalize(sunPositionFixed, new Cesium.Cartesian3());
        
        // Dot product > 0 means sun is above horizon
        viewer.shadows = Cesium.Cartesian3.dot(up, sunDir) > 0;
      }
    } catch(e) {
      // Fallback if math fails before frames initialize
      viewer.shadows = true; 
    }
  }, [minuteOfDay, dayOfYear, viewerRef]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      id="cesium-container"
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
    />
  );
}
