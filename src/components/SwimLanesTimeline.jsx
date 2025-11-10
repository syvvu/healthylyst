// Swim Lanes Timeline Component
// Visual representation of metrics as horizontal lanes with intensity bars

import React, { useMemo } from 'react';
import { AlertTriangle, Sparkles, Target, FileText, Heart } from 'lucide-react';
import { format } from 'date-fns';

const theme = {
  text: { primary: '#0c4a6e', secondary: '#334155', tertiary: '#64748b' },
  accent: { primary: '#0ea5e9' }
};

const categoryColors = {
  sleep: { light: '#e9d5ff', medium: '#a78bfa', dark: '#8b5cf6' },
  activity: { light: '#d1fae5', medium: '#34d399', dark: '#10b981' },
  nutrition: { light: '#fed7aa', medium: '#fb923c', dark: '#f97316' },
  vitals: { light: '#fee2e2', medium: '#f87171', dark: '#ef4444' },
  wellness: { light: '#dbeafe', medium: '#60a5fa', dark: '#0ea5e9' }
};

const SwimLanesTimeline = ({ 
  layers = [], 
  dates = [], 
  correlations = [], 
  showCorrelations = true,
  onDateClick,
  onLaneClick,
  selectedRange = null,
  eventMarkers = [],
  timingEvents = [],
  zoomLevel = 'week'
}) => {
  // Normalize values for each layer
  const normalizedLayers = useMemo(() => {
    if (!layers || layers.length === 0) {
      return [];
    }
    return layers.map(layer => {
      if (!layer || !layer.data || !Array.isArray(layer.data)) {
        return { ...layer, normalized: [] };
      }
      const values = layer.data.map(d => d?.value).filter(v => v !== null && v !== undefined && !isNaN(v) && isFinite(v));
      if (values.length === 0) {
        return { ...layer, normalized: [] };
      }
      
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      
      // If all values are the same, normalize to 50% so they're visible
      const normalized = layer.data.map(d => {
        if (!d || d.value === null || d.value === undefined || isNaN(d.value) || !isFinite(d.value)) return null;
        if (range === 0) return 50; // All values same, show at 50%
        return ((d.value - min) / range) * 100; // 0-100 scale
      });
      
      return {
        ...layer,
        normalized,
        min,
        max,
        avg: values.reduce((a, b) => a + b, 0) / values.length
      };
    });
  }, [layers]);

  // Get correlation lines for visualization
  const correlationLines = useMemo(() => {
    if (!showCorrelations || !correlations || correlations.length === 0) return [];
    if (!dates || dates.length === 0) return [];
    
    return correlations.slice(0, 5).map(corr => {
      if (!corr) return null;
      const layer1 = normalizedLayers.find(l => l && l.metric === corr.metric1);
      const layer2 = normalizedLayers.find(l => l && l.metric === corr.metric2);
      
      if (!layer1 || !layer2 || !layer1.normalized || !layer2.normalized) return null;
      
      // Find points where correlation is visible
      const points = [];
      dates.forEach((date, idx) => {
        const val1 = layer1.normalized[idx];
        const val2 = layer2.normalized[idx];
        if (val1 !== null && val2 !== null) {
          points.push({
            date,
            index: idx,
            value1: val1,
            value2: val2,
            layer1Idx: normalizedLayers.indexOf(layer1),
            layer2Idx: normalizedLayers.indexOf(layer2)
          });
        }
      });
      
      return {
        ...corr,
        points,
        layer1Idx: normalizedLayers.indexOf(layer1),
        layer2Idx: normalizedLayers.indexOf(layer2)
      };
    }).filter(c => c && c.points.length > 0);
  }, [correlations, showCorrelations, normalizedLayers, dates]);

  const getIntensityColor = (value, category) => {
    if (value === null || value === undefined) return null;
    const colors = categoryColors[category] || categoryColors.wellness;
    const intensity = Math.min(100, Math.max(0, value));
    
    // Always use visible, vibrant colors - never use light colors that look gray
    // For very low values, still use medium color but with higher opacity
    if (intensity < 50) return colors.medium; // Use medium for lower half
    return colors.dark; // Use dark for upper half
  };

  const getBarWidth = (value) => {
    if (value === null || value === undefined) return 0;
    return Math.max(2, value); // Minimum 2px width
  };

  if (!normalizedLayers || normalizedLayers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm" style={{ color: theme.text.tertiary }}>
          No data available for selected metrics
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Swim Lanes */}
      <div className="space-y-1">
        {normalizedLayers.map((layer, layerIdx) => {
          if (!layer) return null;
          const colors = categoryColors[layer.category] || categoryColors.wellness;
          
          return (
            <div key={layer.metric} className="relative">
              {/* Lane Label */}
              <div className="flex items-center mb-1">
                <div 
                  className="w-32 text-sm font-medium pr-2"
                  style={{ color: theme.text.primary }}
                >
                  {layer.label}
                </div>
                {/* Pure color bar - no text labels on events */}
                <div className="flex-1 relative h-8 bg-gray-50 rounded overflow-hidden">
                  {/* Bars for each date */}
                  {dates && dates.length > 0 && dates.map((date, dateIdx) => {
                    const value = layer.normalized[dateIdx];
                    const width = getBarWidth(value);
                    const color = getIntensityColor(value, layer.category);
                    const isSelected = selectedRange && 
                      new Date(date) >= selectedRange.start && 
                      new Date(date) <= selectedRange.end;
                    
                    // If no color (null/undefined value), show transparent
                    if (!color) {
                      return (
                        <div
                          key={date}
                          className="absolute top-0 bottom-0"
                          style={{
                            left: `${(dateIdx / dates.length) * 100}%`,
                            width: `${(1 / dates.length) * 100}%`,
                            backgroundColor: 'transparent'
                          }}
                        />
                      );
                    }
                    
                    // Calculate opacity based on normalized value - ensure good visibility
                    // Higher values = higher opacity, minimum 0.7 for good color visibility
                    const baseOpacity = value !== null && value !== undefined 
                      ? Math.max(0.7, 0.7 + (value / 100) * 0.3) 
                      : 0.3;
                    
                    // Ensure we always use a vibrant color, never gray
                    const finalColor = isSelected ? colors.dark : color;
                    
                    return (
                      <div
                        key={date}
                        className="absolute top-0 bottom-0 cursor-pointer hover:opacity-100 transition-opacity"
                        style={{
                          left: `${(dateIdx / dates.length) * 100}%`,
                          width: `${(1 / dates.length) * 100}%`,
                          backgroundColor: finalColor,
                          opacity: baseOpacity,
                          borderRight: '1px solid rgba(255,255,255,0.3)'
                        }}
                        onClick={() => onDateClick && onDateClick(date, layer)}
                        title={`${date}: ${layer.data[dateIdx]?.value?.toFixed(1) || 'N/A'}`}
                      />
                    );
                  })}
                  
                  {/* Event markers - anomalies and insights */}
                  {eventMarkers && Array.isArray(eventMarkers) && eventMarkers
                    .filter(marker => marker && marker.metric === layer.metric && (marker.type === 'anomaly' || marker.type === 'insight' || marker.type === 'goal' || marker.type === 'risk'))
                    .map((marker, markerIdx) => {
                      const dateIdx = dates.indexOf(marker.date);
                      if (dateIdx === -1) return null;
                      
                      const iconMap = {
                        anomaly: AlertTriangle,
                        insight: Sparkles,
                        goal: Target,
                        note: FileText,
                        risk: Heart
                      };
                      
                      const Icon = iconMap[marker.type] || AlertTriangle;
                      const iconColor = marker.type === 'anomaly' ? '#ef4444' :
                                       marker.type === 'risk' ? '#f59e0b' :
                                       marker.type === 'goal' ? '#10b981' :
                                       theme.accent.primary;
                      
                      return (
                        <div
                          key={markerIdx}
                          className="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none z-10"
                          style={{
                            left: `${(dateIdx / dates.length) * 100}%`,
                            width: `${(1 / dates.length) * 100}%`
                          }}
                        >
                          <Icon 
                            className="w-4 h-4 drop-shadow-lg" 
                            style={{ color: iconColor }}
                            title={marker.label || marker.type}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
              
            </div>
          );
        })}
      </div>
      
      {/* Date labels - aligned with bars (centered on each bar) */}
      {dates && dates.length > 0 && (() => {
        // Parse date string as local date to avoid timezone issues
        const parseLocalDate = (dateStr) => {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day);
        };
        
        return (
          <div className="flex items-center mt-2 h-6">
            {/* Spacer to match the label width (w-32 = 128px) */}
            <div className="w-32 pr-2"></div>
            {/* Date labels container matching the flex-1 bar container */}
            <div className="flex-1 relative">
              {dates.map((date, dateIdx) => {
                // Show approximately 6-7 date labels evenly spaced
                const step = Math.ceil(dates.length / 6);
                if (dateIdx % step !== 0 && dateIdx !== dates.length - 1) return null;
                
                // Center the date label on the bar
                // Bar starts at (dateIdx / dates.length) * 100%
                // Bar width is (1 / dates.length) * 100%
                // Center is at (dateIdx + 0.5) / dates.length * 100%
                const position = ((dateIdx + 0.5) / dates.length) * 100;
                return (
                  <span
                    key={dateIdx}
                    className="absolute text-xs transform -translate-x-1/2"
                    style={{ 
                      color: theme.text.tertiary,
                      left: `${position}%`
                    }}
                  >
                    {format(parseLocalDate(date), 'MMM dd')}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })()}
      
      {/* Correlation legend */}
      {showCorrelations && correlationLines && correlationLines.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-blue-50">
          <div className="mb-2">
            <div className="text-xs font-semibold mb-1" style={{ color: theme.text.primary }}>
              Correlations:
            </div>
            <div className="text-xs leading-relaxed" style={{ color: theme.text.tertiary }}>
              <span className="font-medium">r</span> = correlation strength: closer to ±1 means stronger relationship. Positive (green) = metrics move together, negative (red) = move opposite. <span className="font-medium">[1d]</span> = first metric affects second metric 1 day later.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {correlationLines.slice(0, 5).filter(line => line !== null).map((line, idx) => {
              if (!line) return null;
              const layer1 = normalizedLayers[line.layer1Idx];
              const layer2 = normalizedLayers[line.layer2Idx];
              if (!layer1 || !layer2) return null;
              const isPositive = line.correlation > 0;
              
              return (
                <div
                  key={idx}
                  className="text-xs px-2 py-1 rounded flex items-center gap-1"
                  style={{
                    backgroundColor: isPositive ? '#d1fae5' : '#fee2e2',
                    color: isPositive ? '#065f46' : '#991b1b'
                  }}
                >
                  <div
                    className="w-3 h-0.5"
                    style={{ backgroundColor: isPositive ? '#10b981' : '#ef4444' }}
                  />
                  {layer1?.label} → {layer2?.label}
                  {' '}(r={line.correlation.toFixed(2)})
                  {line.lag > 0 && ` [${line.lag}d]`}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SwimLanesTimeline;

