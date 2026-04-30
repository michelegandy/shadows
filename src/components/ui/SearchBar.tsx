/**
 * SearchBar.tsx — Address search input with AIS geocoding integration.
 *
 * Orchestrates the full search flow:
 *   1. User types an address and submits the form.
 *   2. useAISSearch fetches geocoded data (coordinates + OPA account num).
 *   3. useParcelQuery fetches the parcel GeoJSON using the OPA account num.
 *   4. On success: camera flies to the address, parcel is stored in Zustand.
 *   5. On error: error message is stored in Zustand for toast display.
 */

import { useState, useEffect } from 'react';
import * as Cesium from 'cesium';
import { useIonSearch } from '../../hooks/useIonSearch';
import { useParcelQuery } from '../../hooks/useParcelQuery';
import { useStore } from '../../store/useStore';
import { flyToCoordinates } from '../../utils/cesiumHelpers';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SearchBarProps {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SearchBar({ viewerRef }: SearchBarProps) {
  /** The text currently in the input field. */
  const [inputValue, setInputValue] = useState('');

  /**
   * The address string that has been *submitted* (user pressed Enter or
   * clicked Search). This is what triggers the React Query fetch.
   * Keeping it separate from inputValue means typing doesn't fire requests.
   */
  const [submittedAddress, setSubmittedAddress] = useState('');

  const setSelectedParcel = useStore((s) => s.setSelectedParcel);
  const setSearchError = useStore((s) => s.setSearchError);

  // -------------------------------------------------------------------------
  // Data hooks
  // -------------------------------------------------------------------------

  const ionQuery = useIonSearch(submittedAddress, viewerRef.current?.scene);
  
  // Chain: only query parcels once we have coordinates from Ion
  const searchCoords = ionQuery.data ? [ionQuery.data.longitude, ionQuery.data.latitude] as [number, number] : null;
  const parcelQuery = useParcelQuery(searchCoords);

  // -------------------------------------------------------------------------
  // Side effects — react to query results
  // -------------------------------------------------------------------------

  useEffect(() => {
    // Ion query succeeded → fly camera to coordinates
    if (ionQuery.data && viewerRef.current) {
      flyToCoordinates(viewerRef.current, ionQuery.data.longitude, ionQuery.data.latitude);
      setSearchError(null);
    }
  }, [ionQuery.data, viewerRef, setSearchError]);

  useEffect(() => {
    // Parcel query succeeded → store GeoJSON in Zustand
    if (parcelQuery.data) {
      setSelectedParcel(parcelQuery.data);
    }
  }, [parcelQuery.data, setSelectedParcel]);

  useEffect(() => {
    // Ion error → surface message to user via toast
    if (ionQuery.error) {
      setSearchError(ionQuery.error.message);
    }
  }, [ionQuery.error, setSearchError]);

  useEffect(() => {
    // Parcel error → surface message
    if (parcelQuery.error) {
      setSearchError(parcelQuery.error.message);
    }
  }, [parcelQuery.error, setSearchError]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Clear previous selection before the new search resolves.
    setSelectedParcel(null);
    setSearchError(null);

    // Setting submittedAddress enables the query (enabled: address.length > 0).
    // If the same address is submitted again, React Query uses the cache.
    setSubmittedAddress(trimmed);
  }

  const isLoading = ionQuery.isFetching || parcelQuery.isFetching;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <form className="search-form" onSubmit={handleSubmit} role="search">
      <div className="search-input-row">
        <input
          id="address-search-input"
          className="search-input"
          type="text"
          placeholder="Search a Philadelphia address…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          aria-label="Philadelphia address search"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          id="address-search-btn"
          className="search-btn"
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          aria-label="Search"
        >
          {isLoading ? (
            <span className="spinner" aria-label="Loading" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
