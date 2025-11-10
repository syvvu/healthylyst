// Correlation Insight Card Component
// Matches detailed visual specifications

import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { getAvailableDates, getDataForDate } from '../../utils/dataLoader';
import { generateContent } from '../../utils/geminiClient';
import { withCache } from '../../utils/aiCache';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155', tertiary: '#64748b' },
  accent: { 
    primary: '#0ea5e9', 
    purple: '#8b5cf6',
    success: '#10b981', 
    warning: '#f59e0b', 
    danger: '#ef4444' 
  }
};

const CorrelationInsightCard = ({ insight, isNew, onSeeEvidence, onDismiss, onTrack, onUnarchive, allHealthData, activeTab = 'all', isTracked = false, isArchived = false }) => {
  const [scatterData, setScatterData] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    if (insight && allHealthData) {
      const dates = getAvailableDates(allHealthData);
      const data = dates.map(date => {
        const dayData = getDataForDate(allHealthData, date);
        const value1 = dayData[insight.metric1Category]?.[insight.metric1];
        const value2 = dayData[insight.metric2Category]?.[insight.metric2];
        
        if (value1 !== null && value1 !== undefined && value2 !== null && value2 !== undefined) {
          return { x: value1, y: value2, date };
        }
        return null;
      }).filter(d => d !== null);
      
      setScatterData(data);
    }
  }, [insight, allHealthData]);

  // Generate AI summary for the insight
  useEffect(() => {
    if (!insight || !allHealthData) return;

    const generateAISummary = async () => {
      setLoadingSummary(true);
      
      const cacheParams = {
        correlation: {
          metric1: insight.metric1Label || insight.metric1,
          metric2: insight.metric2Label || insight.metric2,
          correlation: insight.correlation
        }
      };

      try {
        const summary = await withCache('correlationSummary', cacheParams, async () => {
          // Format all CSV data for the prompt
          const formatCSVData = (data, categoryName) => {
            if (!data?.data || data.data.length === 0) return '';
            
            const headers = Object.keys(data.data[0]).filter(key => key !== 'date');
            let csvText = `\n${categoryName.toUpperCase()} DATA (${data.data.length} records):\n`;
            csvText += `Date,${headers.join(',')}\n`;
            
            data.data.forEach(row => {
              const date = row.date || '';
              const values = headers.map(header => {
                const val = row[header];
                if (val === null || val === undefined) return '';
                if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
                return val;
              });
              csvText += `${date},${values.join(',')}\n`;
            });
            
            return csvText;
          };
          
          // Build complete CSV data section
          let csvDataSection = '\n=== COMPLETE HEALTH DATASET ===\n';
          csvDataSection += formatCSVData(allHealthData.sleep, 'SLEEP');
          csvDataSection += formatCSVData(allHealthData.nutrition, 'NUTRITION');
          csvDataSection += formatCSVData(allHealthData.activity, 'ACTIVITY');
          csvDataSection += formatCSVData(allHealthData.vitals, 'VITALS');
          csvDataSection += formatCSVData(allHealthData.wellness, 'WELLNESS');
          csvDataSection += '\n=== END OF DATASET ===\n';

          const prompt = `You are a supportive health coach. Generate a ONE-LINE summary (max 15 words) for this health correlation insight.

CORRELATION DATA:
- Metric 1: ${insight.metric1Label || insight.metric1} (${insight.metric1Category})
- Metric 2: ${insight.metric2Label || insight.metric2} (${insight.metric2Category})
- Correlation strength: ${(Math.abs(insight.correlation) * 100).toFixed(0)}% (${insight.strengthLabel || 'Strong'})
- Pattern: When ${insight.metric1Label} is ${insight.threshold ? (insight.metric1?.includes('sleep') ? `${insight.threshold.toFixed(1)} hours` : `${insight.threshold.toFixed(1)}`) : 'below threshold'}, ${insight.metric2Label} changes by ${insight.effectSize?.toFixed(1) || 'significant amount'}${insight.effectSizeUnit || ''}
- Time relationship: ${insight.lag > 0 ? `${insight.lag} day(s) later` : 'same day'}
- Direction: ${insight.direction === 'positive' ? 'positive' : 'negative'}

${csvDataSection}

IMPORTANT GUIDELINES:
- Write ONE clear, concise sentence (max 15 words)
- Use simple, friendly language
- Focus on the actionable insight, not technical details
- Make it personal and relevant
- Avoid jargon like "correlation coefficient" or "r="

Example format: "Better sleep leads to lower sugar cravings the next day" or "Late afternoon caffeine disrupts your sleep quality"

Generate ONLY the one-line summary, no quotes, no extra text:`;

          const response = await generateContent(prompt, { temperature: 0.8, maxTokens: 50, context: 'insights_correlations' });
          if (response.success && response.text) {
            return response.text.trim().replace(/^["']|["']$/g, '');
          }
          throw new Error('AI generation failed');
        });

        setAiSummary(summary);
      } catch (error) {
        console.error('Error generating AI summary:', error);
        // Fallback to a simple description
        const fallback = `When ${insight.metric1Label || insight.metric1} changes, ${insight.metric2Label || insight.metric2} responds ${insight.lag > 0 ? `${insight.lag} day(s) later` : 'the same day'}`;
        setAiSummary(fallback);
      } finally {
        setLoadingSummary(false);
      }
    };

    generateAISummary();
  }, [insight, allHealthData]);

  // Get color for strength label based on strength level
  const getStrengthColor = (strengthLabel) => {
    const label = (strengthLabel || '').toLowerCase();
    if (label.includes('very strong')) {
      return { bg: '#10b981', text: '#ffffff' }; // Green
    } else if (label.includes('strong')) {
      return { bg: '#3b82f6', text: '#ffffff' }; // Blue
    } else if (label.includes('moderate')) {
      return { bg: '#f59e0b', text: '#ffffff' }; // Orange
    } else {
      return { bg: '#94a3b8', text: '#ffffff' }; // Gray for weak
    }
  };

  // Calculate threshold dynamically from data
  const calculateThreshold = () => {
    if (scatterData.length === 0) return 0;
    const sorted = [...scatterData].sort((a, b) => a.x - b.x);
    return sorted[Math.floor(sorted.length / 2)].x;
  };
  
  const threshold = calculateThreshold();
  
  // Determine threshold based on metric type
  let thresholdLabel = threshold.toFixed(1);
  if (insight.metric1?.includes('sleep') || insight.metric1?.includes('duration')) {
    thresholdLabel = `${threshold.toFixed(1)} hours`;
  } else if (insight.metric1?.includes('caffeine') || insight.metric1?.includes('time')) {
    thresholdLabel = `${Math.round(threshold)}:00`;
  }
  
  const goodValues = scatterData.filter(d => d.x >= threshold);
  const poorValues = scatterData.filter(d => d.x < threshold);
  
  const avgGood = goodValues.length > 0 
    ? goodValues.reduce((sum, d) => sum + d.y, 0) / goodValues.length 
    : 0;
  const avgPoor = poorValues.length > 0 
    ? poorValues.reduce((sum, d) => sum + d.y, 0) / poorValues.length 
    : 0;
  
  const diff = Math.abs(avgPoor - avgGood);
  
  // Determine unit for metric2 (same logic as HeroInsightCard)
  const getUnitForMetric = (metricName, metricLabel) => {
    const name = (metricName || '').toLowerCase();
    const label = (metricLabel || '').toLowerCase();
    const fullName = name || label;
    
    // Activity metrics
    if (fullName.includes('steps') || fullName.includes('floors_climbed') || 
        fullName.includes('meals_count') || fullName.includes('social_interactions') ||
        fullName.includes('awakenings')) {
      return 'count';
    } else if (fullName.includes('distance_km') || fullName.includes('distance')) {
      return 'km';
    } else if (fullName.includes('calories_burned') || fullName.includes('calories') ||
               fullName.includes('breakfast_calories') || fullName.includes('lunch_calories') ||
               fullName.includes('dinner_calories') || fullName.includes('snacks_calories')) {
      return 'calories';
    } else if (fullName.includes('active_minutes') || fullName.includes('exercise_minutes') ||
               fullName.includes('meditation_minutes') || fullName.includes('screen_time_before_bed_minutes') ||
               fullName.includes('wake_time_consistency_minutes') || fullName.includes('bedtime_consistency_minutes')) {
      return 'minutes';
    } else if (fullName.includes('workout_start_time') || fullName.includes('workout_end_time') ||
               fullName.includes('caffeine_last_time') || fullName.includes('breakfast_time') ||
               fullName.includes('lunch_time') || fullName.includes('dinner_time') ||
               fullName.includes('bedtime') || fullName.includes('wake_time') ||
               (fullName.includes('time') && !fullName.includes('minutes') && !fullName.includes('hours'))) {
      return 'hours';
    } else if (fullName.includes('heart_rate') || fullName.includes('bpm')) {
      return 'bpm';
    } else if (fullName.includes('hrv_ms') || fullName.includes('hrv')) {
      return 'ms';
    } else if (fullName.includes('vo2_max') || fullName.includes('vo2')) {
      return 'ml/kg/min';
    } else if (fullName.includes('workout_performance_rating') || fullName.includes('performance_rating')) {
      return 'points';
    }
    // Sleep metrics
    else if (fullName.includes('sleep_duration_hours') || fullName.includes('deep_sleep_hours') ||
             fullName.includes('rem_sleep_hours') || fullName.includes('outdoor_time_hours') ||
             fullName.includes('screen_time_hours') || (fullName.includes('hours') && 
             !fullName.includes('heart_rate') && !fullName.includes('consistency'))) {
      return 'hours';
    } else if (fullName.includes('sleep_quality_score') || fullName.includes('quality_score')) {
      return 'points';
    } else if (fullName.includes('deep_sleep_percent') || fullName.includes('rem_sleep_percent') ||
               fullName.includes('sleep_efficiency') || fullName.includes('body_fat_percent') ||
               fullName.includes('oxygen_saturation') || fullName.includes('percent') ||
               fullName.includes('%')) {
      return '%';
    }
    // Nutrition metrics
    else if (fullName.includes('protein_g') || fullName.includes('carbs_g') ||
             fullName.includes('fats_g') || fullName.includes('fiber_g') ||
             fullName.includes('sugar_g') || fullName.includes('_g') ||
             (fullName.includes('sugar') && !fullName.includes('score')) ||
             (fullName.includes('protein') && !fullName.includes('score')) ||
             (fullName.includes('carbs') && !fullName.includes('score')) ||
             (fullName.includes('fats') && !fullName.includes('score')) ||
             (fullName.includes('fiber') && !fullName.includes('score'))) {
      return 'g';
    } else if (fullName.includes('caffeine_cups') || fullName.includes('cups')) {
      return 'cups';
    } else if (fullName.includes('alcohol_units') || fullName.includes('alcohol')) {
      return 'units';
    }
    // Vitals metrics
    else if (fullName.includes('weight_kg') || fullName.includes('muscle_mass_kg') ||
             fullName.includes('weight') || fullName.includes('muscle_mass')) {
      return 'kg';
    } else if (fullName.includes('blood_pressure_systolic') || fullName.includes('blood_pressure_diastolic') ||
               fullName.includes('blood_pressure')) {
      return 'mmHg';
    } else if (fullName.includes('body_temperature_c') || fullName.includes('temperature')) {
      return '°C';
    }
    // Wellness metrics
    else if (fullName.includes('stress_level') || fullName.includes('energy_level') ||
             fullName.includes('mood_score') || fullName.includes('anxiety_level') ||
             fullName.includes('productivity_score') || fullName.includes('_level') ||
             fullName.includes('_score') || fullName.includes('level') ||
             fullName.includes('score') || fullName.includes('rating')) {
      return 'points';
    }
    
    return '';
  };

  // Generate threshold text (same logic as HeroInsightCard)
  const getThresholdText = () => {
    const metric1Label = (insight.metric1Label || insight.metric1).toLowerCase();
    
    if (insight.metric1?.includes('sleep') || insight.metric1?.includes('duration')) {
      return `sleep less than ${thresholdLabel}`;
    }
    if (insight.metric1?.includes('caffeine') || insight.metric1?.includes('time')) {
      return `consume caffeine after ${thresholdLabel}`;
    }
    return `${metric1Label} less than ${thresholdLabel}`;
  };

  // Generate impact text with proper units (same logic as HeroInsightCard)
  const getImpactText = () => {
    const metric2Label = (insight.metric2Label || insight.metric2).toLowerCase();
    const unit = getUnitForMetric(insight.metric2, insight.metric2Label);
    const isNegative = insight.correlation < 0;
    
    // Handle time-based metrics (stored as hours)
    if (unit === 'hours' && (insight.metric2?.includes('time') || insight.metric2Label?.includes('time'))) {
      const hours = Math.abs(diff);
      const minutes = Math.round((hours % 1) * 60);
      const wholeHours = Math.floor(hours);
      
      let timeStr = '';
      if (wholeHours > 0 && minutes > 0) {
        timeStr = `${wholeHours} hour${wholeHours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else if (wholeHours > 0) {
        timeStr = `${wholeHours} hour${wholeHours > 1 ? 's' : ''}`;
      } else if (minutes > 0) {
        timeStr = `${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else {
        timeStr = `${hours.toFixed(1)} hours`;
      }
      
      return `is ${timeStr} ${isNegative ? 'earlier' : 'later'}`;
    }
    
    // Handle grams
    if (unit === 'g') {
      return `consume ${diff.toFixed(0)}g more ${metric2Label.includes('sugar') ? 'sugar' : metric2Label}`;
    }
    
    // Handle points
    if (unit === 'points') {
      return `is ${diff.toFixed(1)} points ${isNegative ? 'lower' : 'higher'}`;
    }
    
    // Handle hours
    if (unit === 'hours') {
      return `is ${diff.toFixed(1)} hours ${isNegative ? 'less' : 'more'}`;
    }
    
    // Handle minutes
    if (unit === 'minutes') {
      return `is ${diff.toFixed(0)} minutes ${isNegative ? 'less' : 'more'}`;
    }
    
    // Handle percentage
    if (unit === '%') {
      return `is ${diff.toFixed(1)}% ${isNegative ? 'lower' : 'higher'}`;
    }
    
    // Handle calories
    if (unit === 'calories') {
      return `is ${diff.toFixed(0)} calories ${isNegative ? 'less' : 'more'}`;
    }
    
    // Handle count
    if (unit === 'count') {
      return `is ${diff.toFixed(0)} ${isNegative ? 'less' : 'more'}`;
    }
    
    // Handle other units
    if (unit === 'km') {
      return `is ${diff.toFixed(1)} km ${isNegative ? 'less' : 'more'}`;
    } else if (unit === 'bpm') {
      return `is ${diff.toFixed(0)} bpm ${isNegative ? 'lower' : 'higher'}`;
    } else if (unit === 'ms') {
      return `is ${diff.toFixed(0)} ms ${isNegative ? 'lower' : 'higher'}`;
    } else if (unit === 'kg') {
      return `is ${diff.toFixed(1)} kg ${isNegative ? 'less' : 'more'}`;
    } else if (unit === 'mmHg') {
      return `is ${diff.toFixed(0)} mmHg ${isNegative ? 'lower' : 'higher'}`;
    } else if (unit === '°C') {
      return `is ${diff.toFixed(1)}°C ${isNegative ? 'lower' : 'higher'}`;
    } else if (unit === 'cups') {
      return `is ${diff.toFixed(1)} cup${Math.abs(diff) !== 1 ? 's' : ''} ${isNegative ? 'less' : 'more'}`;
    } else if (unit === 'units') {
      return `is ${diff.toFixed(1)} unit${Math.abs(diff) !== 1 ? 's' : ''} ${isNegative ? 'less' : 'more'}`;
    } else if (unit === 'ml/kg/min') {
      return `is ${diff.toFixed(1)} ml/kg/min ${isNegative ? 'lower' : 'higher'}`;
    }
    
    // Default fallback
    return `is ${diff.toFixed(1)} ${isNegative ? 'less' : 'more'}`;
  };

  // Generate description text with proper causality and units
  const getDescription = () => {
    // Use lag to determine causality direction (same as HeroInsightCard)
    // If lag > 0, metric1 on day N → metric2 on day N+lag, so metric1 is cause
    const causeMetric = insight.lag > 0 ? {
      label: insight.metric1Label || insight.metric1,
      name: insight.metric1
    } : {
      label: insight.metric1Label || insight.metric1,
      name: insight.metric1
    };
    const effectMetric = {
      label: insight.metric2Label || insight.metric2,
      name: insight.metric2
    };
    
    const thresholdText = getThresholdText();
    const impactText = getImpactText();
    const lagText = insight.lag > 0 ? ` ${insight.lag} day${insight.lag > 1 ? 's' : ''} later` : ' the same day';
    
    return `When you ${thresholdText}, your ${effectMetric.label.toLowerCase()} ${impactText}${lagText}`;
  };

  const isCorrelationsTab = activeTab === 'correlations';

  // Helper function to format correlation title (remove units, use &)
  const formatCorrelationTitle = () => {
    if (insight.title) return insight.title;
    // Remove units from labels and use & instead of →
    const removeUnits = (label) => {
      if (!label) return label;
      return label.replace(/\s*\([^)]*\)/g, '').trim();
    };
    const metric1 = removeUnits(insight.metric1Label);
    const metric2 = removeUnits(insight.metric2Label);
    return `${metric1} & ${metric2}`;
  };

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl"
      style={{ 
        borderColor: theme.border.primary, 
        borderWidth: '1px',
        borderLeftWidth: '4px',
        borderLeftColor: theme.accent.purple
      }}
    >
      {/* Header Section - All Insights Tab Format */}
      {!isCorrelationsTab && (
        <>
          {/* Title */}
          <h3 className="text-2xl font-bold mb-4" style={{ color: theme.text.primary }}>
            {formatCorrelationTitle()}
          </h3>

          {/* Strength and Stats */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {(() => {
                const strengthLabel = insight.strengthLabel || 'Moderate';
                const strengthColor = getStrengthColor(strengthLabel);
                return (
                  <span 
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ 
                      backgroundColor: strengthColor.bg,
                      color: strengthColor.text
                    }}
                  >
                    {strengthLabel}
                  </span>
                );
              })()}
              {isTracked && (
                <span 
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ 
                    backgroundColor: theme.accent.primary + '20',
                    color: theme.accent.primary
                  }}
                >
                  📌 Tracked
                </span>
              )}
              {isArchived && (
                <span 
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ 
                    backgroundColor: theme.text.tertiary + '20',
                    color: theme.text.tertiary
                  }}
                >
                  📦 Archived
                </span>
              )}
            </div>
            <p className="text-base mb-2" style={{ color: theme.text.secondary }}>
              {loadingSummary ? (
                <span className="opacity-50">Generating AI insight...</span>
              ) : (
                aiSummary || getDescription()
              )}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs" style={{ color: theme.text.tertiary }}>
                Sources: {insight.sources?.map(s => `${s}.csv`).join(' + ') || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={onSeeEvidence}
              className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
              style={{ 
                backgroundColor: theme.accent.purple,
                color: 'white'
              }}
            >
              See details
            </button>
            {onTrack && (
              <button
                onClick={onTrack}
                className={`px-4 py-2 rounded-lg border font-medium transition-all hover:bg-gray-50 ${
                  isTracked ? 'opacity-60' : ''
                }`}
                style={{ 
                  borderColor: isTracked ? theme.accent.primary : theme.border.primary,
                  color: isTracked ? theme.accent.primary : theme.text.primary,
                  backgroundColor: isTracked ? theme.accent.primary + '10' : 'transparent'
                }}
              >
                {isTracked ? '✓ Tracked' : 'Track This'}
              </button>
            )}
            {onUnarchive ? (
            <button
                onClick={onUnarchive}
              className="px-4 py-2 rounded-lg border font-medium transition-all hover:bg-gray-50"
              style={{ 
                borderColor: theme.border.primary,
                color: theme.text.primary
              }}
            >
                Unarchive
            </button>
            ) : onDismiss ? (
            <button
                onClick={onDismiss}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-50"
              style={{ color: theme.text.tertiary }}
            >
              Dismiss
            </button>
            ) : null}
          </div>
        </>
      )}

      {/* Correlations Tab Format - Removed (tab no longer exists) */}
      {false && isCorrelationsTab && (
        <>
          {/* Title */}
          <h3 className="text-2xl font-bold mb-4" style={{ color: theme.text.primary }}>
            {formatCorrelationTitle()}
          </h3>

          {/* Stats Header - Exact format: r = -0.68 • p < 0.001 • Very Strong */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                r = {insight.correlation?.toFixed(2) || '0.00'}
              </span>
              <span>•</span>
              <span className="text-sm" style={{ color: theme.text.secondary }}>
                p &lt; {(insight.pValue || 0.001).toFixed(3)}
              </span>
              <span>•</span>
              <span className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                {insight.strengthLabel || 'Very Strong'}
              </span>
            </div>
          </div>

          {/* Scatter Plot */}
            <div className="h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.border.primary} opacity={0.3} />
                  <XAxis 
                    dataKey="x" 
                    name={insight.metric1Label}
                    label={{ value: insight.metric1Label, position: 'insideBottom', offset: -5 }}
                    stroke={theme.text.tertiary}
                  />
                  <YAxis 
                    dataKey="y" 
                    name={insight.metric2Label}
                    label={{ value: insight.metric2Label, angle: -90, position: 'insideLeft' }}
                    stroke={theme.text.tertiary}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        return (
                          <div className="bg-white p-2 border rounded shadow-lg">
                            <p style={{ color: theme.text.primary }}>
                              {insight.metric1Label}: {payload[0].payload.x?.toFixed(1)}
                            </p>
                            <p style={{ color: theme.text.primary }}>
                              {insight.metric2Label}: {payload[0].payload.y?.toFixed(1)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {scatterData.length > 0 && (
                    <ReferenceArea 
                      x1={threshold} 
                      x2={Math.max(...scatterData.map(d => d.x))} 
                      fill={theme.accent.success + '20'} 
                      fillOpacity={0.3}
                    />
                  )}
                  {scatterData.length > 0 && (
                    <ReferenceArea 
                      x1={Math.min(...scatterData.map(d => d.x))} 
                      x2={threshold} 
                      fill={theme.accent.danger + '20'} 
                      fillOpacity={0.3}
                    />
                  )}
                  <Scatter 
                    data={scatterData} 
                    fill={theme.accent.primary}
                    fillOpacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Correlation Details - Exact format from spec */}
            <div className="space-y-2 text-sm mb-4">
              <div>
                <span className="font-semibold" style={{ color: theme.text.primary }}>Cross-File: </span>
                <span style={{ color: theme.text.secondary }}>
                  {insight.metric1Category}.csv → {insight.metric2Category}.csv
                </span>
              </div>
              <div>
                <span className="font-semibold" style={{ color: theme.text.primary }}>Time Lag: </span>
                <span style={{ color: theme.text.secondary }}>
                  {insight.lag > 0 ? `+${insight.lag} day${insight.lag > 1 ? 's' : ''}` : 'Same-Day'}
                </span>
              </div>
              <div>
                <span className="font-semibold" style={{ color: theme.text.primary }}>Occurrences: </span>
                <span style={{ color: theme.text.secondary }}>
                  {insight.occurrences || insight.dataPoints || 0} / {insight.totalDays || 60} days ({insight.totalDays ? Math.round(((insight.occurrences || 0) / insight.totalDays) * 100) : 0}%)
                </span>
              </div>
              <div>
                <span className="font-semibold" style={{ color: theme.text.primary }}>Effect Size: </span>
                <span style={{ color: theme.text.secondary }}>
                  {insight.effectSize?.toFixed(insight.effectSizeUnit === 'g' ? 0 : 1) || diff.toFixed(insight.effectSizeUnit === 'g' || insight.effectSizeUnit === 'count' || insight.effectSizeUnit === 'bpm' ? 0 : 1)}{insight.effectSizeUnit || ''} difference
                </span>
              </div>
              <div>
                <span className="font-semibold" style={{ color: theme.text.primary }}>Threshold: </span>
                <span style={{ color: theme.text.secondary }}>
                  {insight.threshold ? (insight.metric1?.includes('sleep') ? `${insight.threshold.toFixed(1)} hours sleep` : `${insight.threshold.toFixed(1)}`) : thresholdLabel}
                </span>
              </div>
            </div>
            
            {/* Action Buttons for Correlations Tab */}
            <div className="flex gap-3">
              <button
                onClick={onSeeEvidence}
                className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                style={{ 
                  backgroundColor: theme.accent.purple,
                  color: 'white'
                }}
              >
                See details
              </button>
              <button
                className="px-4 py-2 rounded-lg border font-medium transition-all hover:bg-gray-50"
                style={{ 
                  borderColor: theme.border.primary,
                  color: theme.text.primary
                }}
              >
                Start Experiment
              </button>
            </div>
        </>
      )}
    </div>
  );
};

export default CorrelationInsightCard;
