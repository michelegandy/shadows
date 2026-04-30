/**
 * ShadeWidget.tsx — The Solar Potential User Interface.
 *
 * BEGINNER GUIDE:
 * This is a React Component. A component is just a reusable piece of the UI 
 * (like a custom HTML tag). 
 *
 * How this widget works:
 * 1. It "listens" to the global store (useStore) to see if a property is selected.
 * 2. It holds its own small memory (React "state") for things like "Start Month"
 *    and "End Month".
 * 3. When you click "Calculate Shade", it triggers the heavy 3D math in `solarAnalysis.ts`.
 * 4. Once the math is done, it displays the percentage of the property in shade.
 */

import React, { useState } from 'react';
import * as Cesium from 'cesium';
import { useStore } from '../../store/useStore';
import { calculateShadeInRange } from '../../utils/solarAnalysis';

const MONTHS = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
];


interface ShadeWidgetProps {
  viewerRef: React.MutableRefObject<Cesium.Viewer | null>;
}

export function ShadeWidget({ viewerRef }: ShadeWidgetProps) {
  const selectedParcel = useStore((s) => s.selectedParcel);
  const isAnalyzingShade = useStore((s) => s.isAnalyzingShade);
  const shadeAnalysisProgress = useStore((s) => s.shadeAnalysisProgress);
  const shadePercentage = useStore((s) => s.shadePercentage);
  
  const setIsAnalyzingShade = useStore((s) => s.setIsAnalyzingShade);
  const setShadeAnalysisProgress = useStore((s) => s.setShadeAnalysisProgress);
  const setShadePercentage = useStore((s) => s.setShadePercentage);

  const [error, setError] = useState<string | null>(null);
  const [startMonth, setStartMonth] = useState<number>(0);
  const [endMonth, setEndMonth] = useState<number>(11);

  if (!selectedParcel) return null;

  const handleCalculate = async () => {
    if (!viewerRef.current) return;
    
    setError(null);
    setIsAnalyzingShade(true);
    setShadeAnalysisProgress(0);
    setShadePercentage(null);

    try {
      const percentage = await calculateShadeInRange(
        viewerRef.current,
        selectedParcel,
        startMonth,
        endMonth,
        (progress) => setShadeAnalysisProgress(progress)
      );
      setShadePercentage(percentage);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to calculate shade');
    } finally {
      setIsAnalyzingShade(false);
    }
  };

  return (
    <div className="shade-widget" style={{ marginTop: '16px', padding: '16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#fff' }}>Solar Potential</h3>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#a1a1aa', marginBottom: '4px' }}>Start Month</label>
          <select 
            value={startMonth} 
            onChange={(e) => setStartMonth(Number(e.target.value))}
            disabled={isAnalyzingShade}
            style={{ width: '100%', padding: '6px', background: '#27272a', color: '#fff', border: '1px solid #3f3f46', borderRadius: '4px', fontSize: '12px' }}
          >
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#a1a1aa', marginBottom: '4px' }}>End Month</label>
          <select 
            value={endMonth} 
            onChange={(e) => setEndMonth(Number(e.target.value))}
            disabled={isAnalyzingShade}
            style={{ width: '100%', padding: '6px', background: '#27272a', color: '#fff', border: '1px solid #3f3f46', borderRadius: '4px', fontSize: '12px' }}
          >
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {shadePercentage !== null ? (
        <div style={{ marginBottom: '8px' }}>
          <p style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#facc15' }}>
            {shadePercentage}% <span style={{ fontSize: '13px', color: '#a1a1aa', fontWeight: 400 }}>in shade</span>
          </p>
          

          <button 
            onClick={handleCalculate}
            disabled={isAnalyzingShade}
            style={{ 
              marginTop: '12px', 
              padding: '6px 12px', 
              fontSize: '12px', 
              background: 'transparent', 
              border: '1px solid #52525b', 
              color: '#d4d4d8', 
              borderRadius: '4px', 
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Recalculate
          </button>
        </div>
      ) : (
        <button 
          onClick={handleCalculate}
          disabled={isAnalyzingShade}
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: isAnalyzingShade ? '#3f3f46' : '#facc15', 
            color: isAnalyzingShade ? '#a1a1aa' : '#18181b', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: isAnalyzingShade ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => {
            if (!isAnalyzingShade) e.currentTarget.style.background = '#eab308';
          }}
          onMouseOut={(e) => {
            if (!isAnalyzingShade) e.currentTarget.style.background = '#facc15';
          }}
        >
          {isAnalyzingShade ? 'Running Simulation...' : 'Calculate Shade'}
        </button>
      )}

      {isAnalyzingShade && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ width: '100%', height: '6px', background: '#3f3f46', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${shadeAnalysisProgress}%`, height: '100%', background: '#facc15', transition: 'width 0.2s ease-out' }} />
          </div>
          <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#a1a1aa', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {shadeAnalysisProgress}% Complete
          </p>
        </div>
      )}

      {error && (
        <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#ef4444' }}>
          {error}
        </p>
      )}
      
      <p style={{ margin: '12px 0 0 0', fontSize: '11px', color: '#71717a', lineHeight: 1.4 }}>
        *Estimation uses raycasting against 3D buildings currently loaded in the camera view. Results may vary depending on camera zoom.
      </p>
    </div>
  );
}
