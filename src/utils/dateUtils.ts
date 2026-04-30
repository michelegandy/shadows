/**
 * dateUtils.ts — Helpers for converting slider values to Cesium JulianDates.
 *
 * CesiumJS represents time internally as a JulianDate (a continuous count of
 * days since noon on January 1, 4713 BC). All time-related Cesium APIs expect
 * this format. Our UI works in human-friendly units (minute of day, day of
 * year) so we need helpers to translate between the two.
 */

import { JulianDate } from 'cesium';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Philadelphia's UTC offset in hours for standard time (EST = UTC-5).
 * We use standard time year-round for simplicity; daylight saving would shift
 * shadow times by one hour but the relative shadow pattern remains correct.
 */
const PHILLY_UTC_OFFSET_HOURS = -5;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert a minute-of-day value and day-of-year value to a Cesium JulianDate.
 *
 * @param dayOfYear  - Day of year, 1-indexed (1 = Jan 1, 365 = Dec 31).
 * @param minuteOfDay - Minute of day, 0–1440 (0 = midnight, 720 = noon).
 * @param year       - Calendar year (defaults to current year).
 * @returns A Cesium JulianDate representing the specified local time in Philly.
 */
export function sliderValuesToJulianDate(
  dayOfYear: number,
  minuteOfDay: number,
  year: number = new Date().getFullYear()
): JulianDate {
  // --- Step 1: Reconstruct a JS Date from day-of-year + year ---------------
  // JS Date months are 0-indexed, so we start at Jan 1 (month 0) and add
  // (dayOfYear - 1) days to get the correct calendar date.
  const date = new Date(year, 0, dayOfYear);

  // --- Step 2: Extract hours and minutes from minuteOfDay ------------------
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;

  // --- Step 3: Convert local Philadelphia time to UTC -----------------------
  // CesiumJS JulianDate.fromDate expects a JS Date. We construct a UTC Date
  // by compensating for Philadelphia's UTC offset (EST = UTC-5).
  const utcHours = hours - PHILLY_UTC_OFFSET_HOURS; // e.g., noon local = 17:00 UTC

  const utcDate = new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),   // JS Date months are already 0-indexed
      date.getDate(),
      utcHours,
      minutes,
      0
    )
  );

  // --- Step 4: Convert to JulianDate ----------------------------------------
  return JulianDate.fromDate(utcDate);
}

/**
 * Format a minute-of-day value (0–1440) to a human-readable time string.
 * Example: 780 → "1:00 PM"
 */
export function formatMinuteOfDay(minute: number): string {
  const totalMinutes = Math.max(0, Math.min(1439, minute));
  const hours24 = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Format a day-of-year value (1–365) to a short date string.
 * Example: 91 → "Apr 1"
 */
export function formatDayOfYear(
  dayOfYear: number,
  year: number = new Date().getFullYear()
): string {
  const date = new Date(year, 0, dayOfYear);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
