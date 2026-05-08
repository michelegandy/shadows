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

import React, { useState, useEffect } from 'react';
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
  const [cropDisplayCount, setCropDisplayCount] = useState<number>(3);
  const [selectedCategory, setSelectedCategory] = useState<'vegetables' | 'herbs' | 'flowers' | null>(null);
  
  interface PlantRec {
    name: string;
    season: string;
  }
  const [recommendedPlants, setRecommendedPlants] = useState<{vegetables: PlantRec[], herbs: PlantRec[], flowers: PlantRec[]} | null>(null);

  useEffect(() => {
    if (shadePercentage !== null) {
      const fullSun = {
        vegetables: ['Tomatoes', 'Peppers', 'Cucumbers', 'Eggplant', 'Corn', 'Zucchini', 'Melons', 'Okra', 'Sweet Potatoes', 'Beans', 'Pumpkins', 'Squash'],
        herbs: ['Basil', 'Rosemary', 'Thyme', 'Oregano', 'Sage', 'Lavender', 'Dill', 'Fennel', 'Lemongrass', 'Cilantro'],
        flowers: ['Zinnias', 'Marigolds', 'Sunflowers', 'Cosmos', 'Petunias', 'Echinacea', 'Dahlias', 'Black-eyed Susans', 'Peonies', 'Salvia']
      };
      
      const partialShade = {
        vegetables: ['Lettuce', 'Spinach', 'Kale', 'Carrots', 'Radishes', 'Beets', 'Broccoli', 'Peas', 'Cabbage', 'Cauliflower', 'Kohlrabi', 'Turnips'],
        herbs: ['Parsley', 'Cilantro', 'Chives', 'Mint', 'Lemon Balm', 'Tarragon', 'Chervil', 'Catnip', 'Anise', 'Coriander'],
        flowers: ['Impatiens', 'Begonias', 'Fuchsias', 'Columbine', 'Bleeding Heart', 'Astilbe', 'Forget-me-nots', 'Hydrangea', 'Pansies', 'Lobelia']
      };
      
      const fullShade = {
        vegetables: ['Arugula', 'Swiss Chard', 'Mustard Greens', 'Endive', 'Bok Choy', 'Scallions', 'Mache', 'Watercress', 'Sorrel', 'Microgreens'],
        herbs: ['Mint', 'Chervil', 'Sweet Cicely', 'Lemon Balm', 'Woodruff', 'Parsley', 'Mitsuba', 'Angelica', 'Corsican Mint', 'Spicebush'],
        flowers: ['Hostas', 'Ferns', 'Heuchera', 'Lily of the Valley', 'Torenia', 'Astilbe', 'Caladium', 'Coleus', 'Foxglove', 'Primrose']
      };

      const plantMonths: Record<string, number[]> = {
        'Tomatoes': [4, 5, 6, 7, 8, 9], 'Peppers': [4, 5, 6, 7, 8, 9], 'Cucumbers': [4, 5, 6, 7, 8], 'Eggplant': [4, 5, 6, 7, 8, 9], 'Corn': [4, 5, 6, 7], 'Zucchini': [4, 5, 6, 7, 8], 'Melons': [4, 5, 6, 7, 8], 'Okra': [4, 5, 6, 7, 8, 9], 'Sweet Potatoes': [4, 5, 6, 7, 8, 9], 'Beans': [4, 5, 6, 7, 8], 'Pumpkins': [4, 5, 6, 7, 8, 9], 'Squash': [4, 5, 6, 7, 8, 9],
        'Lettuce': [2, 3, 4, 8, 9, 10], 'Spinach': [2, 3, 4, 8, 9, 10], 'Kale': [2, 3, 4, 8, 9, 10, 11], 'Carrots': [2, 3, 4, 7, 8, 9], 'Radishes': [2, 3, 4, 8, 9, 10], 'Beets': [2, 3, 4, 7, 8, 9], 'Broccoli': [2, 3, 4, 7, 8, 9], 'Peas': [2, 3, 4], 'Cabbage': [2, 3, 4, 7, 8, 9, 10], 'Cauliflower': [2, 3, 4, 7, 8, 9], 'Kohlrabi': [2, 3, 4, 8, 9], 'Turnips': [2, 3, 4, 8, 9, 10],
        'Arugula': [2, 3, 4, 8, 9, 10], 'Swiss Chard': [3, 4, 5, 6, 7, 8, 9], 'Mustard Greens': [2, 3, 4, 8, 9, 10], 'Endive': [2, 3, 4, 8, 9], 'Bok Choy': [2, 3, 4, 8, 9, 10], 'Scallions': [2, 3, 4, 5, 6, 7, 8, 9], 'Mache': [1, 2, 3, 9, 10, 11], 'Watercress': [2, 3, 4, 5, 8, 9, 10], 'Sorrel': [2, 3, 4, 5, 6, 7, 8, 9], 'Microgreens': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        'Basil': [4, 5, 6, 7, 8, 9], 'Rosemary': [3, 4, 5, 6, 7, 8, 9, 10], 'Thyme': [3, 4, 5, 6, 7, 8, 9, 10], 'Oregano': [3, 4, 5, 6, 7, 8, 9, 10], 'Sage': [3, 4, 5, 6, 7, 8, 9, 10], 'Lavender': [4, 5, 6, 7, 8], 'Dill': [3, 4, 5, 6, 7], 'Fennel': [4, 5, 6, 7, 8], 'Lemongrass': [4, 5, 6, 7, 8], 'Cilantro': [2, 3, 4, 8, 9, 10], 'Parsley': [3, 4, 5, 6, 7, 8, 9], 'Chives': [3, 4, 5, 6, 7, 8, 9], 'Mint': [3, 4, 5, 6, 7, 8, 9], 'Lemon Balm': [4, 5, 6, 7, 8, 9], 'Tarragon': [4, 5, 6, 7, 8], 'Chervil': [2, 3, 4, 8, 9], 'Catnip': [4, 5, 6, 7, 8, 9], 'Anise': [4, 5, 6, 7, 8], 'Coriander': [2, 3, 4, 8, 9], 'Sweet Cicely': [3, 4, 5, 6, 7], 'Woodruff': [4, 5, 6, 7], 'Mitsuba': [3, 4, 5, 8, 9], 'Angelica': [4, 5, 6, 7], 'Corsican Mint': [4, 5, 6, 7, 8], 'Spicebush': [3, 4, 5, 6, 7, 8, 9],
        'Zinnias': [4, 5, 6, 7, 8, 9], 'Marigolds': [4, 5, 6, 7, 8, 9], 'Sunflowers': [4, 5, 6, 7, 8], 'Cosmos': [4, 5, 6, 7, 8, 9], 'Petunias': [4, 5, 6, 7, 8, 9], 'Echinacea': [5, 6, 7, 8], 'Dahlias': [5, 6, 7, 8, 9], 'Black-eyed Susans': [5, 6, 7, 8], 'Peonies': [4, 5], 'Salvia': [4, 5, 6, 7, 8, 9], 'Impatiens': [4, 5, 6, 7, 8, 9], 'Begonias': [4, 5, 6, 7, 8, 9], 'Fuchsias': [4, 5, 6, 7, 8, 9], 'Columbine': [3, 4, 5], 'Bleeding Heart': [3, 4, 5], 'Astilbe': [5, 6, 7], 'Forget-me-nots': [3, 4, 5], 'Hydrangea': [5, 6, 7, 8], 'Pansies': [2, 3, 4, 8, 9, 10], 'Lobelia': [4, 5, 6, 7], 'Hostas': [4, 5, 6, 7, 8, 9], 'Ferns': [3, 4, 5, 6, 7, 8, 9, 10], 'Heuchera': [4, 5, 6, 7, 8, 9], 'Lily of the Valley': [3, 4, 5], 'Torenia': [5, 6, 7, 8], 'Caladium': [5, 6, 7, 8], 'Coleus': [5, 6, 7, 8, 9], 'Foxglove': [4, 5, 6], 'Primrose': [2, 3, 4]
      };

      const selectedMonths: number[] = [];
      if (startMonth <= endMonth) {
        for (let i = startMonth; i <= endMonth; i++) selectedMonths.push(i);
      } else {
        for (let i = startMonth; i <= 11; i++) selectedMonths.push(i);
        for (let i = 0; i <= endMonth; i++) selectedMonths.push(i);
      }

      let pool = fullSun;
      if (shadePercentage >= 30 && shadePercentage < 60) {
        pool = partialShade;
      } else if (shadePercentage >= 60) {
        pool = fullShade;
      }

      const filterBySeason = (arr: string[]) => arr.filter(plant => {
        const months = plantMonths[plant] || [0,1,2,3,4,5,6,7,8,9,10,11];
        return selectedMonths.some(m => months.includes(m));
      });

      const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
      const getRandom = (arr: string[], count: number) => {
        const selected = [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
        return selected.map(plantName => {
          const months = plantMonths[plantName] || [0];
          const earliestVal = months[0];
          const latestVal = months[months.length - 1];
          const earliestStr = SHORT_MONTHS[earliestVal];
          const latestStr = SHORT_MONTHS[latestVal];
          const seasonStr = earliestVal === latestVal ? earliestStr : `${earliestStr}-${latestStr}`;
          return { name: plantName, season: seasonStr };
        });
      };

      setRecommendedPlants({
        vegetables: getRandom(filterBySeason(pool.vegetables), 12),
        herbs: getRandom(filterBySeason(pool.herbs), 12),
        flowers: getRandom(filterBySeason(pool.flowers), 12),
      });
      setCropDisplayCount(3);
      setSelectedCategory(null);
    } else {
      setRecommendedPlants(null);
    }
  }, [shadePercentage, startMonth, endMonth]);

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
      
      <div style={{ marginBottom: '16px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
        <div style={{ fontSize: '10px', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Selected Property</div>
        <div style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>{selectedParcel.properties.ADDRESS || (selectedParcel.properties as any).address || 'Unknown Address'}</div>
      </div>

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
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 600, color: shadePercentage < 30 ? '#facc15' : shadePercentage < 60 ? '#fb923c' : '#60a5fa' }}>
            {shadePercentage < 30 ? '☀️ Full Sun' : shadePercentage < 60 ? '⛅ Partial Shade' : '☁️ Full Shade'}
          </p>
          
          <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#fff' }}>Zone 7 Recommendations</h4>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#a1a1aa' }}>
              Based on your shade level ({shadePercentage < 30 ? 'Full Sun' : shadePercentage < 60 ? 'Partial Shade' : 'Full Shade'}), try planting:
            </p>
            {recommendedPlants && (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {(['vegetables', 'herbs', 'flowers'] as const).map(cat => {
                    const isActive = selectedCategory === cat;
                    let baseBg = '#dcfce7';
                    let baseColor = '#14532d';
                    
                    if (cat === 'herbs') { baseBg = '#fef08a'; baseColor = '#713f12'; }
                    else if (cat === 'flowers') { baseBg = '#fbcfe8'; baseColor = '#831843'; }

                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(selectedCategory === cat ? null : cat);
                          setCropDisplayCount(3);
                        }}
                        style={{
                          flex: 1,
                          padding: '6px',
                          fontSize: '12px',
                          background: baseBg,
                          border: isActive ? '2px solid #fff' : '2px solid transparent',
                          color: baseColor,
                          borderRadius: '4px',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                          transition: 'all 0.2s',
                          fontWeight: isActive ? 700 : 500,
                          opacity: isActive ? 1 : 0.6,
                          boxShadow: isActive ? '0 0 8px rgba(255,255,255,0.3)' : 'none',
                          transform: isActive ? 'scale(1.05)' : 'scale(1)'
                        }}
                        onMouseOver={(e) => {
                          if (!isActive) e.currentTarget.style.opacity = '0.8';
                        }}
                        onMouseOut={(e) => {
                          if (!isActive) e.currentTarget.style.opacity = '0.6';
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
                
                {selectedCategory && (
                  <>
                    <div style={{ marginBottom: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '4px' }}>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#a1a1aa' }}>
                        {recommendedPlants[selectedCategory].slice(0, cropDisplayCount).map(c => (
                          <li key={c.name} style={{ marginBottom: '8px' }}>
                            <strong style={{ color: '#e4e4e7', fontSize: '13px' }}>{c.name}</strong><br/>
                            <span style={{ fontSize: '10px', color: '#71717a' }}>{c.season}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      {cropDisplayCount < 12 && recommendedPlants[selectedCategory].length > cropDisplayCount && (
                        <button
                          onClick={() => setCropDisplayCount(prev => Math.min(prev + 3, 12))}
                          style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid #3f3f46',
                            color: '#d4d4d8',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        >
                          More crops
                        </button>
                      )}
                      {cropDisplayCount > 3 && (
                        <button
                          onClick={() => setCropDisplayCount(prev => Math.max(prev - 3, 3))}
                          style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '12px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid #3f3f46',
                            color: '#d4d4d8',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        >
                          Less crops
                        </button>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
            <a 
              href="https://extension.psu.edu/programs/master-gardener/counties/philadelphia" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ fontSize: '12px', color: '#60a5fa', textDecoration: 'none' }}
            >
              Learn more at Penn State Extension
            </a>
          </div>

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
