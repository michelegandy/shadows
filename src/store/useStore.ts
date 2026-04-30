/**
 * useStore.ts — Global State Management.
 *
 * BEGINNER GUIDE:
 * What is "State"? State is simply the memory of our application. It remembers 
 * things like "what property is currently selected?" or "what time is it on the slider?"
 *
 * Why Zustand? In React, sharing memory between completely different parts of the 
 * screen (like the map and the UI panel) can be messy. You usually have to pass data 
 * through a bunch of middleman components (called "prop drilling"). 
 * 
 * Zustand gives us a single, global "store" (think of it as a shared brain). 
 * Any component in the app can instantly read from or write to this brain without 
 * having to pass props.
 */

import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A GeoJSON Feature returned from the PWD Parcels ArcGIS endpoint.
 * We only type the fields we use; the rest are ignored.
 */
export interface ParcelFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][]; // Polygon or MultiPolygon rings
  };
  properties: {
    OWNER1: string;
    ADDRESS: string;
    BRT_ID: string;
  };
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface AppState {
  /** The currently highlighted parcel, or null if none selected. */
  selectedParcel: ParcelFeature | null;

  /**
   * Minute of the day (0–1440).
   * 0 = midnight, 720 = noon, 1440 = midnight again.
   * This drives viewer.clock.currentTime.
   */
  minuteOfDay: number;

  /**
   * Day of year (1–365).
   * 1 = Jan 1, 365 = Dec 31 (or 366 on leap years, capped here).
   * This changes the sun's declination, producing seasonal shadow variation.
   */
  dayOfYear: number;

  /** True while the AIS search request is in-flight. */
  isSearching: boolean;

  /**
   * Non-null when a search error needs to be surfaced to the user via toast.
   * Set to null to dismiss.
   */
  searchError: string | null;

  /** True while the annual shade analysis is running. */
  isAnalyzingShade: boolean;

  /** Progress of the annual shade analysis (0-100). */
  shadeAnalysisProgress: number;

  /** The computed shade percentage for the selected parcel in the given range, or null if not computed. */
  shadePercentage: number | null;

  // ---- Actions ----

  setSelectedParcel: (parcel: ParcelFeature | null) => void;
  setMinuteOfDay: (minute: number) => void;
  setDayOfYear: (day: number) => void;
  setIsSearching: (loading: boolean) => void;
  setSearchError: (error: string | null) => void;
  setIsAnalyzingShade: (analyzing: boolean) => void;
  setShadeAnalysisProgress: (progress: number) => void;
  setShadePercentage: (percentage: number | null) => void;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useStore = create<AppState>((set) => ({
  // Default state: no parcel, noon on day 172 (≈ summer solstice in Philly),
  // so users see dramatic shadows immediately on load.
  selectedParcel: null,
  minuteOfDay: 720, // noon
  dayOfYear: 172,   // ~June 21, summer solstice
  isSearching: false,
  searchError: null,
  isAnalyzingShade: false,
  shadeAnalysisProgress: 0,
  shadePercentage: null,

  setSelectedParcel: (parcel) => set({ selectedParcel: parcel }),
  setMinuteOfDay: (minute) => set({ minuteOfDay: minute }),
  setDayOfYear: (day) => set({ dayOfYear: day }),
  setIsSearching: (loading) => set({ isSearching: loading }),
  setSearchError: (error) => set({ searchError: error }),
  setIsAnalyzingShade: (analyzing) => set({ isAnalyzingShade: analyzing }),
  setShadeAnalysisProgress: (progress) => set({ shadeAnalysisProgress: progress }),
  setShadePercentage: (percentage) => set({ shadePercentage: percentage }),
}));
