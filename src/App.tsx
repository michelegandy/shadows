/**
 * App.tsx — Root application component.
 *
 * BEGINNER GUIDE:
 * App.tsx is the "container" that holds all the different pieces of our screen together.
 * 
 * Think of it like a sandwich:
 * 1. The bottom layer is the <Globe /> (the 3D map).
 * 2. On top of that is the <ParcelLayer /> (the colored shapes drawn over properties).
 * 3. Floating above everything are the <FloatingPanel /> and <NavigationControls /> (the UI menus).
 *
 * We use a React "ref" (`viewerRef`) to hold onto the 3D map engine once it starts.
 * A "ref" is like a sticky note that remembers something important without causing 
 * React to constantly redraw the screen every time the map moves.
 */

import { useRef } from 'react';
import * as Cesium from 'cesium';
import { Globe } from './components/globe/Globe';
import { ParcelLayer } from './components/layers/ParcelLayer';
import { FloatingPanel } from './components/ui/FloatingPanel';
import { NavigationControls } from './components/ui/NavigationControls';

function App() {
  /**
   * The shared Viewer reference. Globe.tsx writes the initialized Viewer into
   * this ref on mount. ParcelLayer and FloatingPanel read from it.
   */
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  return (
    <div id="app-root" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Full-screen 3D globe — renders into its own absolutely-positioned div */}
      <Globe viewerRef={viewerRef} />

      {/* Imperative Cesium layer — renders nothing to DOM, only Cesium primitives */}
      <ParcelLayer viewerRef={viewerRef} />

      {/* Overlay UI panel — positioned via CSS, sits on top of the canvas */}
      <FloatingPanel viewerRef={viewerRef} />
      
      {/* On-screen navigation controls for mouse-free interaction */}
      <NavigationControls viewerRef={viewerRef} />
    </div>
  );
}

export default App;
