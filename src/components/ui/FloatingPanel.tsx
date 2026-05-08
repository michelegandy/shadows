/**
 * FloatingPanel.tsx — Fixed-position glassmorphic control panel.
 *
 * This is the main UI container. It renders in the top-right corner and
 * contains (in vertical order):
 *   1. App header / branding
 *   2. SearchBar — address input + geocoding trigger
 *   3. PropertyCard — owner/address info, shown after a successful search
 *   4. TimeControls — time-of-day and day-of-year sliders
 *   5. SearchError toast — dismissable error notification
 */

import * as Cesium from 'cesium';
import { useStore } from '../../store/useStore';
import { SearchBar } from './SearchBar';
import { TimeControls } from './TimeControls';
import { ShadeWidget } from './ShadeWidget';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FloatingPanelProps {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

// ---------------------------------------------------------------------------
// Sub-component: Property info card
// ---------------------------------------------------------------------------

function PropertyCard() {
  const parcel = useStore((s) => s.selectedParcel);
  const setSelectedParcel = useStore((s) => s.setSelectedParcel);

  if (!parcel) return null;

  const props = parcel.properties as any;
  const owner = props.OWNER1 || props.owner1 || 'Unknown Owner';
  const address = props.ADDRESS || props.address || 'Unknown Address';

  return (
    <div className="property-card" id="property-card" role="region" aria-label="Selected property">
      <div className="property-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg className="property-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="property-card-title">Selected Property</span>
        </div>
        <button 
          onClick={() => setSelectedParcel(null)}
          className="error-toast-dismiss"
          style={{ position: 'static', margin: 0 }}
          aria-label="Clear selection"
          title="Clear highlighted parcel"
        >
          ✕
        </button>
      </div>
      <div className="property-card-body">
        <p className="property-address">{address}</p>
        <p className="property-owner">{owner}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Error toast
// ---------------------------------------------------------------------------

function ErrorToast() {
  const searchError = useStore((s) => s.searchError);
  const setSearchError = useStore((s) => s.setSearchError);

  if (!searchError) return null;

  return (
    <div className="error-toast" id="error-toast" role="alert" aria-live="assertive">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span className="error-toast-message">{searchError}</span>
      <button
        className="error-toast-dismiss"
        onClick={() => setSearchError(null)}
        aria-label="Dismiss error"
      >
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FloatingPanel({ viewerRef }: FloatingPanelProps) {
  return (
    <div className="floating-panel glass-panel" id="floating-panel" role="complementary" aria-label="Shadow controls">

      {/* Header */}
      <div className="panel-header">
        <div className="panel-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </div>
        <div className="panel-title-group">
          <h1 className="panel-title">Philly Shadow Analyst</h1>
          <p className="panel-subtitle">3D solar shadow explorer</p>
        </div>
      </div>

      <div className="panel-divider" />

      {/* Search */}
      <SearchBar viewerRef={viewerRef} />

      {/* Error toast */}
      <ErrorToast />

      {/* Property info card (only shown after a successful search) */}
      <PropertyCard />

      {/* Shade analysis widget (only shown when a parcel is selected) */}
      {useStore((s) => s.selectedParcel) && <ShadeWidget viewerRef={viewerRef} />}

      <div className="panel-divider" />

      {/* Shadow time controls */}
      <TimeControls />

    </div>
  );
}
