// Advanced Correlation Analysis with Time-Lagged Correlations
// Includes same-day correlations, time-lagged cross-correlations, and multi-variable regression

import { extractMetric, calculateCorrelation, formatMetricLabel } from './dataLoader';

// Calculate Pearson correlation coefficient (re-exported for convenience)
export { calculateCorrelation };

// Convert time string or number to numeric hours for correlation analysis
const timeToHours = (time) => {
  if (!time) return null;
  // Handle "HH:MM" format (e.g., "14:45")
  if (typeof time === 'string' && time.includes(':')) {
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h + (m / 60); // Convert to decimal hours (e.g., "14:45" -> 14.75)
  }
  // Already a number
  return typeof time === 'number' ? time : parseFloat(time);
};

// Check if a metric name is time-based
const isTimeMetric = (metricName) => {
  return metricName?.includes('time') || 
         metricName?.includes('caffeine_last_time') ||
         metricName?.includes('bedtime') ||
         metricName?.includes('wake_time') ||
         metricName?.includes('breakfast_time') ||
         metricName?.includes('lunch_time') ||
         metricName?.includes('dinner_time');
};

// Calculate time-lagged correlation (cross-correlation)
export const calculateTimeLaggedCorrelation = (x, y, maxLag = 3) => {
  if (x.length !== y.length || x.length < maxLag + 1) {
    return { correlation: 0, lag: 0, significance: 0 };
  }
  
  let bestCorrelation = 0;
  let bestLag = 0;
  const correlations = [];
  
  // Test correlations at different lag times (0 to maxLag days)
  for (let lag = 0; lag <= maxLag; lag++) {
    const xShifted = x.slice(0, x.length - lag);
    const yShifted = y.slice(lag);
    
    if (xShifted.length < 5) continue; // Need minimum data points
    
    const correlation = calculateCorrelation(xShifted, yShifted);
    correlations.push({ lag, correlation });
    
    if (Math.abs(correlation) > Math.abs(bestCorrelation)) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }
  
  // Calculate statistical significance (simplified p-value approximation)
  const n = x.length - bestLag;
  const tStat = Math.abs(bestCorrelation) * Math.sqrt((n - 2) / (1 - bestCorrelation * bestCorrelation));
  const significance = Math.min(1, Math.max(0, 1 - (2 * (1 - Math.abs(tStat) / 3)))); // Simplified significance
  
  return {
    correlation: bestCorrelation,
    lag: bestLag,
    significance: significance,
    allLags: correlations
  };
};

// Extract metric aligned by date (ensures data points match the same dates)
const extractMetricAligned = (data, metricName) => {
  return data
    .map(row => ({ date: row.date, value: row[metricName] }))
    .filter(item => item.date && item.value !== undefined && item.value !== null && typeof item.value === 'number')
    .map(item => item.value);
};

// Get all metrics from all data sources with date alignment
export const getAllMetrics = (allData) => {
  const metrics = [];
  
  // Get all unique dates across all sources
  const allDates = new Set();
  [allData.sleep, allData.nutrition, allData.activity, allData.vitals, allData.wellness].forEach(source => {
    if (source?.data) {
      source.data.forEach(row => {
        if (row.date) allDates.add(row.date);
      });
    }
  });
  const sortedDates = Array.from(allDates).sort();
  
  // Helper to extract metric values aligned by date
  // Returns array where each index corresponds to sortedDates[index]
  // Uses undefined for dates where the metric has no data
  // Converts time strings to numeric hours for correlation analysis
  const extractAligned = (sourceData, metricName) => {
    const dateMap = new Map();
    const isTime = isTimeMetric(metricName);
    
    sourceData.forEach(row => {
      if (row.date && row[metricName] !== undefined && row[metricName] !== null) {
        let value = row[metricName];
        
        // Convert time strings to numeric hours
        if (isTime) {
          value = timeToHours(value);
        }
        
        // Only include if it's a valid number (after conversion if needed)
        if (value !== null && typeof value === 'number' && !isNaN(value)) {
          dateMap.set(row.date, value);
        }
      }
    });
    // Return array aligned by date, keeping undefined for missing dates
    // This ensures indices correspond to the same dates across all metrics
    return sortedDates.map(date => dateMap.get(date));
  };
  
  // Sleep metrics
  if (allData.sleep?.data?.length > 0) {
    const sample = allData.sleep.data[0];
    Object.keys(sample).forEach(key => {
      // Include numeric values OR time-based metrics (which may be strings)
      if (key !== 'date' && (typeof sample[key] === 'number' || isTimeMetric(key))) {
        const alignedData = extractAligned(allData.sleep.data, key);
        const validCount = alignedData.filter(val => val !== undefined).length;
        if (validCount > 5) { // Only include if we have enough valid data points
          metrics.push({
            name: key,
            label: formatMetricLabel(key),
            category: 'sleep',
            source: 'sleep',
            data: alignedData
          });
        }
      }
    });
  }
  
  // Nutrition metrics
  if (allData.nutrition?.data?.length > 0) {
    const sample = allData.nutrition.data[0];
    Object.keys(sample).forEach(key => {
      // Include numeric values OR time-based metrics (which may be strings)
      if (key !== 'date' && (typeof sample[key] === 'number' || isTimeMetric(key))) {
        const alignedData = extractAligned(allData.nutrition.data, key);
        const validCount = alignedData.filter(val => val !== undefined).length;
        if (validCount > 5) {
          metrics.push({
            name: key,
            label: formatMetricLabel(key),
            category: 'nutrition',
            source: 'nutrition',
            data: alignedData
          });
        }
      }
    });
  }
  
  // Activity metrics
  if (allData.activity?.data?.length > 0) {
    const sample = allData.activity.data[0];
    Object.keys(sample).forEach(key => {
      if (key !== 'date' && typeof sample[key] === 'number') {
        const alignedData = extractAligned(allData.activity.data, key);
        const validCount = alignedData.filter(val => val !== undefined).length;
        if (validCount > 5) {
          metrics.push({
            name: key,
            label: formatMetricLabel(key),
            category: 'activity',
            source: 'activity',
            data: alignedData
          });
        }
      }
    });
  }
  
  // Vitals metrics
  if (allData.vitals?.data?.length > 0) {
    const sample = allData.vitals.data[0];
    Object.keys(sample).forEach(key => {
      if (key !== 'date' && typeof sample[key] === 'number') {
        const alignedData = extractAligned(allData.vitals.data, key);
        const validCount = alignedData.filter(val => val !== undefined).length;
        if (validCount > 5) {
          metrics.push({
            name: key,
            label: formatMetricLabel(key),
            category: 'vitals',
            source: 'vitals',
            data: alignedData
          });
        }
      }
    });
  }
  
  // Wellness metrics
  if (allData.wellness?.data?.length > 0) {
    const sample = allData.wellness.data[0];
    Object.keys(sample).forEach(key => {
      if (key !== 'date' && typeof sample[key] === 'number') {
        const alignedData = extractAligned(allData.wellness.data, key);
        const validCount = alignedData.filter(val => val !== undefined).length;
        if (validCount > 5) {
          metrics.push({
            name: key,
            label: formatMetricLabel(key),
            category: 'wellness',
            source: 'wellness',
            data: alignedData
          });
        }
      }
    });
  }
  
  return metrics;
};

// Calculate all correlations (same-day and time-lagged) for all metric pairs
export const calculateAllCorrelations = (allData, minCorrelation = 0.3, maxLag = 3) => {
  const metrics = getAllMetrics(allData);
  const correlations = [];
  
  for (let i = 0; i < metrics.length; i++) {
    for (let j = i + 1; j < metrics.length; j++) {
      const metric1 = metrics[i];
      const metric2 = metrics[j];
      
      // Skip if comparing the same metric
      if (metric1.name === metric2.name) {
        continue;
      }
      
      // Skip derived/calculated metrics that aren't meaningful for insights
      const derivedMetrics = [
        'snacks_calories', // Calculated as calories - breakfast - lunch - dinner
        'breakfast_calories', // Component of calories
        'lunch_calories', // Component of calories
        'dinner_calories', // Component of calories
        'distance_km', // Calculated from steps
        'floors_climbed', // Calculated from steps
        'active_minutes', // Calculated from steps
        'calories_burned' // Calculated from steps/activity
      ];
      
      if (derivedMetrics.includes(metric1.name) || derivedMetrics.includes(metric2.name)) {
        continue; // Skip correlations involving derived metrics
      }
      
      // Skip trivial same-category correlations (not meaningful insights)
      // These are obvious relationships within the same domain
      const trivialSameCategoryPairs = [
        // Sleep category - obvious relationships
        ['sleep_duration_hours', 'sleep_quality_score'],
        ['sleep_duration_hours', 'deep_sleep_hours'],
        ['sleep_duration_hours', 'rem_sleep_hours'],
        ['deep_sleep_hours', 'rem_sleep_hours'],
        ['sleep_quality_score', 'deep_sleep_hours'],
        ['sleep_quality_score', 'sleep_efficiency'],
        ['resting_heart_rate', 'hrv_ms'], // Both from sleep tracking
        
        // Activity category - mathematically related
        ['steps', 'distance_km'],
        ['steps', 'active_minutes'],
        ['steps', 'floors_climbed'],
        ['steps', 'calories_burned'],
        ['active_minutes', 'exercise_minutes'],
        ['avg_heart_rate', 'max_heart_rate'],
        
        // Nutrition category - component relationships
        ['calories', 'protein_g'],
        ['calories', 'carbs_g'],
        ['calories', 'fats_g'],
        ['calories', 'breakfast_calories'],
        ['calories', 'lunch_calories'],
        ['calories', 'dinner_calories'],
        ['calories', 'snacks_calories'],
        ['sugar_g', 'carbs_g'], // Sugar is part of carbs
        
        // Vitals category - related measurements
        ['blood_pressure_systolic', 'blood_pressure_diastolic'],
        ['weight_kg', 'body_fat_percent'],
        ['weight_kg', 'muscle_mass_kg'],
        ['body_fat_percent', 'muscle_mass_kg'],
        
        // Wellness category - related subjective measures
        ['stress_level', 'anxiety_level'],
        ['energy_level', 'mood_score'],
        ['mood_score', 'productivity']
      ];
      
      const isTrivialPair = trivialSameCategoryPairs.some(([m1, m2]) => 
        (metric1.name === m1 && metric2.name === m2) || 
        (metric1.name === m2 && metric2.name === m1)
      );
      
      if (isTrivialPair) {
        continue; // Skip obvious trivial pairs
      }
      
      // Same-day correlation - align data by date
      // For metrics from the same source, they're already aligned by row
      // For cross-source metrics, they're aligned by the sortedDates array
      const validPairs = [];
      const minLength = Math.min(metric1.data.length, metric2.data.length);
      
      for (let k = 0; k < minLength; k++) {
        const val1 = metric1.data[k];
        const val2 = metric2.data[k];
        // Both values must be valid numbers (not undefined, null, NaN, or Infinity)
        if (typeof val1 === 'number' && typeof val2 === 'number' && 
            !isNaN(val1) && !isNaN(val2) && 
            isFinite(val1) && isFinite(val2) &&
            val1 !== null && val2 !== null) {
          validPairs.push({ x: val1, y: val2 });
        }
      }
      
      if (validPairs.length < 5) continue; // Need at least 5 valid pairs
      
      const x = validPairs.map(p => p.x);
      const y = validPairs.map(p => p.y);
      const sameDayCorr = calculateCorrelation(x, y);
      
      // Check if correlation is valid (not NaN or Infinity)
      if (isNaN(sameDayCorr) || !isFinite(sameDayCorr)) continue;
      
      // Cap correlation at reasonable values (perfect correlations are suspicious)
      const cappedCorr = Math.max(-0.99, Math.min(0.99, sameDayCorr));
      
      // Skip if same category and very high correlation (likely related measurements, not insights)
      // Focus on cross-category correlations which reveal behavioral patterns
      if (metric1.category === metric2.category && 
          metric1.source === metric2.source &&
          Math.abs(cappedCorr) > 0.85) {
        continue; // Skip high same-category correlations (not meaningful insights)
      }
      
      // Prioritize cross-category correlations (these are meaningful insights)
      // Same-day correlations are less interesting than time-lagged cross-category ones
      // But we'll still include them if they're moderate and cross-category
      const isCrossCategory = metric1.category !== metric2.category;
      const isTimeLagged = false; // This is same-day
      
      // For same-day correlations, only include if:
      // 1. Cross-category (more interesting), OR
      // 2. Moderate correlation (not too obvious)
      if (!isCrossCategory && Math.abs(cappedCorr) > 0.75) {
        continue; // Skip high same-category same-day correlations
      }
      
      if (Math.abs(cappedCorr) >= minCorrelation) {
          // Calculate statistical significance for same-day correlations too
          const n = validPairs.length;
          const tStat = Math.abs(cappedCorr) * Math.sqrt((n - 2) / (1 - cappedCorr * cappedCorr));
          const significance = Math.min(1, Math.max(0, 1 - (2 * (1 - Math.abs(tStat) / 3)))); // Simplified significance
          
          correlations.push({
            metric1: metric1.name,
            metric1Label: metric1.label,
            metric1Category: metric1.category,
            metric2: metric2.name,
            metric2Label: metric2.label,
            metric2Category: metric2.category,
            correlation: cappedCorr,
            dataPoints: validPairs.length,
            lag: 0,
            significance: significance, // Now calculated for same-day too
            strength: Math.abs(cappedCorr) > 0.7 ? 'strong' : Math.abs(cappedCorr) > 0.5 ? 'moderate' : 'weak',
            direction: cappedCorr > 0 ? 'positive' : 'negative',
            type: 'same-day'
          });
      }
      
      // Time-lagged correlations (metric1 → metric2)
      // Use the same valid pairs for consistency
      if (validPairs.length > maxLag + 5) {
        const x = validPairs.map(p => p.x);
        const y = validPairs.map(p => p.y);
        const laggedCorr = calculateTimeLaggedCorrelation(x, y, maxLag);
        
        // Cap and validate lagged correlation
        if (isNaN(laggedCorr.correlation) || !isFinite(laggedCorr.correlation)) continue;
        const cappedLaggedCorr = Math.max(-0.99, Math.min(0.99, laggedCorr.correlation));
        
        if (Math.abs(cappedLaggedCorr) >= minCorrelation && laggedCorr.lag > 0) {
          correlations.push({
            metric1: metric1.name,
            metric1Label: metric1.label,
            metric1Category: metric1.category,
            metric2: metric2.name,
            metric2Label: metric2.label,
            metric2Category: metric2.category,
            correlation: cappedLaggedCorr,
            dataPoints: validPairs.length,
            lag: laggedCorr.lag,
            significance: laggedCorr.significance,
            strength: Math.abs(cappedLaggedCorr) > 0.7 ? 'strong' : Math.abs(cappedLaggedCorr) > 0.5 ? 'moderate' : 'weak',
            direction: cappedLaggedCorr > 0 ? 'positive' : 'negative',
            type: 'time-lagged',
            allLags: laggedCorr.allLags
          });
        }
      }
    }
  }
  
  // Sort by absolute correlation value (strongest first)
  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
};

// Generate correlation heatmap data
export const generateCorrelationHeatmap = (allData, minCorrelation = 0.3) => {
  const metrics = getAllMetrics(allData);
  const heatmapData = [];
  
  for (let i = 0; i < metrics.length; i++) {
    for (let j = 0; j < metrics.length; j++) {
      if (i === j) {
        heatmapData.push({
          x: metrics[i].name,
          y: metrics[j].name,
          value: 1,
          correlation: 1
        });
      } else {
        const metric1 = metrics[i];
        const metric2 = metrics[j];
        
        if (metric1.data.length === metric2.data.length && metric1.data.length > 5) {
          const correlation = calculateCorrelation(metric1.data, metric2.data);
          
          if (Math.abs(correlation) >= minCorrelation) {
            heatmapData.push({
              x: metric1.name,
              y: metric2.name,
              value: Math.abs(correlation),
              correlation: correlation
            });
          }
        }
      }
    }
  }
  
  return {
    data: heatmapData,
    metrics: metrics.map(m => ({ name: m.name, label: m.label, category: m.category }))
  };
};

// Multi-variable linear regression (simplified)
export const multiVariableRegression = (dependentVar, independentVars) => {
  // Simple implementation: y = a + b1*x1 + b2*x2 + ...
  // Using least squares method
  
  if (dependentVar.length === 0 || independentVars.length === 0) {
    return null;
  }
  
  const n = dependentVar.length;
  if (n < independentVars[0].data.length) {
    return null;
  }
  
  // For simplicity, we'll use a basic approach
  // In production, use a proper linear algebra library
  
  // Calculate individual correlations
  const coefficients = independentVars.map(indVar => {
    const corr = calculateCorrelation(dependentVar, indVar.data);
    return {
      variable: indVar.name,
      coefficient: corr,
      correlation: corr
    };
  });
  
  // Calculate R-squared (coefficient of determination)
  const meanY = dependentVar.reduce((a, b) => a + b, 0) / n;
  const totalSumSquares = dependentVar.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  
  // Simplified R-squared calculation
  const avgCorr = coefficients.reduce((sum, c) => sum + Math.abs(c.correlation), 0) / coefficients.length;
  const rSquared = Math.min(1, Math.max(0, avgCorr * avgCorr));
  
  return {
    coefficients: coefficients,
    rSquared: rSquared,
    n: n
  };
};

// Predict value using multi-variable regression
export const predictWithRegression = (regression, independentValues) => {
  if (!regression || !regression.coefficients) return null;
  
  let prediction = 0;
  regression.coefficients.forEach((coef, idx) => {
    if (independentValues[idx] !== undefined) {
      prediction += coef.coefficient * independentValues[idx];
    }
  });
  
  return prediction;
};

// Get top correlations for a specific metric
export const getTopCorrelationsForMetric = (allData, metricName, topN = 10, includeLagged = true) => {
  const allCorrelations = calculateAllCorrelations(allData, 0.3, includeLagged ? 3 : 0);
  
  const relevant = allCorrelations.filter(corr => 
    corr.metric1 === metricName || corr.metric2 === metricName
  );
  
  return relevant.slice(0, topN);
};

// Analyze specific pattern (e.g., sleep → next-day sugar)
export const analyzePattern = (allData, metric1Name, metric2Name, maxLag = 3) => {
  // Don't allow comparing a metric with itself
  if (metric1Name === metric2Name) {
    return null;
  }
  
  const metrics = getAllMetrics(allData);
  const metric1 = metrics.find(m => m.name === metric1Name);
  const metric2 = metrics.find(m => m.name === metric2Name);
  
  if (!metric1 || !metric2) {
    return null;
  }
  
  // Same-day correlation
  const sameDay = calculateCorrelation(metric1.data, metric2.data);
  
  // Time-lagged correlation
  const lagged = calculateTimeLaggedCorrelation(metric1.data, metric2.data, maxLag);
  
  return {
    metric1: {
      name: metric1.name,
      label: metric1.label,
      category: metric1.category
    },
    metric2: {
      name: metric2.name,
      label: metric2.label,
      category: metric2.category
    },
    sameDayCorrelation: sameDay,
    laggedCorrelation: lagged,
    bestLag: lagged.lag,
    bestCorrelation: Math.abs(lagged.correlation) > Math.abs(sameDay) ? lagged.correlation : sameDay
  };
};

// Get correlation matrix for visualization
export const getCorrelationMatrix = (allData, metrics = null) => {
  const allMetrics = metrics || getAllMetrics(allData);
  const matrix = [];
  
  for (let i = 0; i < allMetrics.length; i++) {
    const row = [];
    for (let j = 0; j < allMetrics.length; j++) {
      if (i === j) {
        row.push(1);
      } else {
        const metric1 = allMetrics[i];
        const metric2 = allMetrics[j];
        
        if (metric1.data.length === metric2.data.length && metric1.data.length > 5) {
          row.push(calculateCorrelation(metric1.data, metric2.data));
        } else {
          row.push(0);
        }
      }
    }
    matrix.push(row);
  }
  
  return {
    matrix: matrix,
    labels: allMetrics.map(m => ({ name: m.name, label: m.label, category: m.category }))
  };
};

