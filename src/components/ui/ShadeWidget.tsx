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
 * 4. Once the math is done, it looks at the percentage and uses the `getCropRecommendations` 
 *    function to tell you what vegetables and trees you can grow there.
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

interface CropRec {
  name: string;
  time: string;
  plantMonths: number[];
}

interface Recommendations {
  category: string;
  color: string;
  veggies: CropRec[];
  trees: CropRec[];
}

function getCropRecommendations(shade: number, startMonth: number, endMonth: number): Recommendations {
  let recs: Recommendations;

  if (shade < 25) {
    recs = {
      category: 'Full Sun',
      color: '#facc15', // yellow
      veggies: [
        { name: 'Tomatoes', time: 'May', plantMonths: [4] },
        { name: 'Peppers', time: 'May', plantMonths: [4] },
        { name: 'Cucumbers', time: 'May', plantMonths: [4] },
        { name: 'Melons', time: 'May', plantMonths: [4] }
      ],
      trees: [
        { name: 'White Oak', time: 'Spring/Fall', plantMonths: [2, 3, 4, 8, 9, 10] },
        { name: 'Tulip Poplar', time: 'Spring/Fall', plantMonths: [2, 3, 4, 8, 9, 10] },
        { name: 'Pitch Pine', time: 'Spring', plantMonths: [2, 3, 4] }
      ]
    };
  } else if (shade < 50) {
    recs = {
      category: 'Partial Sun / Shade',
      color: '#a3e635', // lime
      veggies: [
        { name: 'Carrots', time: 'Apr & Aug', plantMonths: [3, 7] },
        { name: 'Beets', time: 'Apr & Aug', plantMonths: [3, 7] },
        { name: 'Beans', time: 'May', plantMonths: [4] },
        { name: 'Peas', time: 'Mar & Aug', plantMonths: [2, 7] }
      ],
      trees: [
        { name: 'Eastern Redbud', time: 'Spring/Fall', plantMonths: [2, 3, 4, 8, 9, 10] },
        { name: 'Flowering Dogwood', time: 'Spring', plantMonths: [2, 3, 4] },
        { name: 'Pawpaw', time: 'Spring', plantMonths: [2, 3, 4] }
      ]
    };
  } else {
    recs = {
      category: 'Full Shade',
      color: '#4ade80', // green
      veggies: [
        { name: 'Lettuce', time: 'Mar & Sep', plantMonths: [2, 8] },
        { name: 'Spinach', time: 'Mar & Sep', plantMonths: [2, 8] },
        { name: 'Kale', time: 'Mar & Aug', plantMonths: [2, 7] }
      ],
      trees: [
        { name: 'American Beech', time: 'Spring/Fall', plantMonths: [2, 3, 4, 8, 9, 10] },
        { name: 'Eastern Hemlock', time: 'Spring/Fall', plantMonths: [2, 3, 4, 8, 9, 10] },
        { name: 'Spicebush', time: 'Spring', plantMonths: [2, 3, 4] }
      ]
    };
  }

  // Filter crops that can be planted during the user's chosen month range
  const isMonthInRange = (m: number, start: number, end: number) => {
    if (start <= end) return m >= start && m <= end;
    return m >= start || m <= end;
  };

  recs.veggies = recs.veggies.filter(v => v.plantMonths.some(m => isMonthInRange(m, startMonth, endMonth)));
  recs.trees = recs.trees.filter(t => t.plantMonths.some(m => isMonthInRange(m, startMonth, endMonth)));

  return recs;
}

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
          
          {(() => {
            const recs = getCropRecommendations(shadePercentage, startMonth, endMonth);
            return (
              <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', borderLeft: `3px solid ${recs.color}` }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>{recs.category} Crops</p>
                
                <div style={{ marginBottom: '8px' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>Vegetables</p>
                  {recs.veggies.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#d4d4d8' }}>
                      {recs.veggies.map(v => (
                        <li key={v.name} style={{ marginBottom: '2px' }}>
                          <strong>{v.name}</strong> <span style={{ color: '#71717a' }}>• Plant in {v.time}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: 0, fontSize: '11px', color: '#71717a' }}>No vegetables for this planting window.</p>
                  )}
                </div>

                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase' }}>Nursery Trees</p>
                  {recs.trees.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#d4d4d8' }}>
                      {recs.trees.map(t => (
                        <li key={t.name} style={{ marginBottom: '2px' }}>
                          <strong>{t.name}</strong> <span style={{ color: '#71717a' }}>• Plant in {t.time}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: 0, fontSize: '11px', color: '#71717a' }}>No trees for this planting window.</p>
                  )}
                </div>
              </div>
            );
          })()}

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
