import { useState, useEffect } from 'react';
import * as Cesium from 'cesium';
// removed flyToCoordinates

interface NavigationControlsProps {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

export function NavigationControls({ viewerRef }: NavigationControlsProps) {
  // 'pan' is default Cesium left-drag. 'rotate' overrides left-drag to tilt/orbit.
  const [interactionMode, setInteractionMode] = useState<'pan' | 'rotate'>('pan');

  useEffect(() => {
    const ssc = viewerRef.current?.scene.screenSpaceCameraController;
    if (!ssc) return;

    if (interactionMode === 'rotate') {
      // Re-map left drag to orbit/tilt, and move pan to middle drag
      ssc.translateEventTypes = Cesium.CameraEventType.MIDDLE_DRAG;
      ssc.tiltEventTypes = [
        Cesium.CameraEventType.LEFT_DRAG,
        Cesium.CameraEventType.PINCH,
        { eventType: Cesium.CameraEventType.LEFT_DRAG, modifier: Cesium.KeyboardEventModifier.CTRL },
        { eventType: Cesium.CameraEventType.RIGHT_DRAG, modifier: Cesium.KeyboardEventModifier.CTRL }
      ];
    } else {
      // Revert to Cesium defaults
      ssc.translateEventTypes = Cesium.CameraEventType.LEFT_DRAG;
      ssc.tiltEventTypes = [
        Cesium.CameraEventType.MIDDLE_DRAG,
        Cesium.CameraEventType.PINCH,
        { eventType: Cesium.CameraEventType.LEFT_DRAG, modifier: Cesium.KeyboardEventModifier.CTRL },
        { eventType: Cesium.CameraEventType.RIGHT_DRAG, modifier: Cesium.KeyboardEventModifier.CTRL }
      ];
    }
  }, [interactionMode, viewerRef]);

  const panAmount = 200; // meters to zoom per click

  const goHome = () => {
    if (viewerRef.current) {
      // Sweeping oblique view of Center City skyline
      viewerRef.current.camera.flyTo({
        // Position the camera south of Center City, up high
        destination: Cesium.Cartesian3.fromDegrees(-75.1652, 39.9350, 1200),
        orientation: {
          // Look due north into the skyline
          heading: Cesium.Math.toRadians(0),
          // Angled pitch (-35 degrees) to see the 3D building profiles
          pitch: Cesium.Math.toRadians(-35),
          roll: 0
        },
        duration: 2.0
      });
    }
  };

  const zoomIn = () => { viewerRef.current?.camera.zoomIn(panAmount); viewerRef.current?.scene.requestRender(); };
  const zoomOut = () => { viewerRef.current?.camera.zoomOut(panAmount); viewerRef.current?.scene.requestRender(); };
  
  const resetCompass = () => {
    if (viewerRef.current) {
      // Maintain current position and pitch, just snap heading to true North
      const camera = viewerRef.current.camera;
      camera.flyTo({
        destination: camera.position,
        orientation: {
          heading: 0,
          pitch: camera.pitch,
          roll: camera.roll
        },
        duration: 1.0
      });
    }
  };

  return (
    <div className="arcgis-nav-stack" aria-label="Camera navigation tools">
      
      {/* Group 1: Home */}
      <div className="nav-box">
        <button onClick={goHome} className="nav-btn-stack" aria-label="Default view" title="Default view">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>

      {/* Group 2: Zoom */}
      <div className="nav-box column">
        <button onClick={zoomIn} className="nav-btn-stack has-border-bottom" aria-label="Zoom in" title="Zoom in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button onClick={zoomOut} className="nav-btn-stack" aria-label="Zoom out" title="Zoom out">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      {/* Group 3: Interaction Mode */}
      <div className="nav-box column">
        <button 
          onClick={() => setInteractionMode('pan')} 
          className={`nav-btn-stack has-border-bottom ${interactionMode === 'pan' ? 'active-mode' : ''}`} 
          aria-label="Pan mode" title="Pan mode"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="12" y1="2" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <polyline points="9 5 12 2 15 5"></polyline>
            <polyline points="9 19 12 22 15 19"></polyline>
            <polyline points="19 9 22 12 19 15"></polyline>
            <polyline points="5 9 2 12 5 15"></polyline>
          </svg>
        </button>
        <button 
          onClick={() => setInteractionMode('rotate')} 
          className={`nav-btn-stack ${interactionMode === 'rotate' ? 'active-mode' : ''}`} 
          aria-label="Rotate mode" title="Orbit/Rotate mode"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 11-.23-9.57l4-4"></path>
          </svg>
        </button>
      </div>

      {/* Group 4: Compass */}
      <div className="nav-box compass-box">
        <button onClick={resetCompass} className="nav-btn-stack compass-btn" aria-label="Reset North" title="Reset North">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </button>
      </div>

    </div>
  );
}
