/**
 * TimeControls.tsx — Dual slider controls for time-of-day and day-of-year.
 *
 * These sliders drive the sun position in the CesiumJS viewer by updating
 * the viewer.clock.currentTime (via Zustand → Globe's useEffect sync).
 *
 * Time of Day (0–1440 minutes):
 *   - Maps 0 (midnight) → 720 (noon) → 1440 (midnight again).
 *   - We use minutes rather than hours for finer shadow resolution.
 *
 * Day of Year (1–365):
 *   - Maps Jan 1 → Dec 31.
 *   - This controls the sun's declination (height in the sky at a given time),
 *     which determines seasonal shadow length and direction.
 *   - In summer the sun is high → short shadows.
 *   - In winter the sun is low → long shadows that reach further.
 */

import { useStore } from '../../store/useStore';
import { formatMinuteOfDay, formatDayOfYear } from '../../utils/dateUtils';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimeControls() {
  const minuteOfDay = useStore((s) => s.minuteOfDay);
  const dayOfYear = useStore((s) => s.dayOfYear);
  const setMinuteOfDay = useStore((s) => s.setMinuteOfDay);
  const setDayOfYear = useStore((s) => s.setDayOfYear);

  return (
    <div className="time-controls">

      {/* ------------------------------------------------------------------ */}
      {/* Time of Day slider                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="slider-group">
        <div className="slider-header">
          <label htmlFor="time-slider" className="slider-label">
            <svg className="slider-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            Time of Day
          </label>
          <span className="slider-value" id="time-display">
            {formatMinuteOfDay(minuteOfDay)}
          </span>
        </div>
        <input
          id="time-slider"
          className="slider"
          type="range"
          min={0}
          max={1440}
          step={1}
          value={minuteOfDay}
          onChange={(e) => setMinuteOfDay(Number(e.target.value))}
          aria-label="Time of day"
          aria-valuetext={formatMinuteOfDay(minuteOfDay)}
        />
        <div className="slider-ticks">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>Noon</span>
          <span>6 PM</span>
          <span>12 AM</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Day of Year slider                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="slider-group">
        <div className="slider-header">
          <label htmlFor="day-slider" className="slider-label">
            <svg className="slider-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Day of Year
          </label>
          <span className="slider-value" id="day-display">
            {formatDayOfYear(dayOfYear)}
          </span>
        </div>
        <input
          id="day-slider"
          className="slider"
          type="range"
          min={1}
          max={365}
          step={1}
          value={dayOfYear}
          onChange={(e) => setDayOfYear(Number(e.target.value))}
          aria-label="Day of year"
          aria-valuetext={formatDayOfYear(dayOfYear)}
        />
        <div className="slider-ticks">
          <span>Jan</span>
          <span>Mar</span>
          <span>Jun</span>
          <span>Sep</span>
          <span>Dec</span>
        </div>
      </div>

    </div>
  );
}
