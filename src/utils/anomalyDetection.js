// Enhanced Anomaly Detection with Rolling Baselines, Clinical Thresholds, and Context-Aware Alerts

import { extractMetric, getDataForDate, formatMetricLabel } from './dataLoader';
import { calculateCorrelation } from './correlationAnalysis';

// Clinical thresholds for health metrics
const CLINICAL_THRESHOLDS = {
  // Sleep
  sleep_duration_hours: { min: 5, max: 10, critical: { min: 4, max: 12 } },
  sleep_quality_score: { min: 60, max: 100, critical: { min: 40, max: 100 } },
  resting_heart_rate: { min: 50, max: 100, critical: { min: 40, max: 120 } },
  
  // Vitals
  blood_pressure_systolic: { min: 90, max: 140, critical: { min: 80, max: 180 } },
  blood_pressure_diastolic: { min: 60, max: 90, critical: { min: 50, max: 120 } },
  hrv_ms: { min: 30, max: 100, critical: { min: 20, max: 120 } },
  
  // Activity
  steps: { min: 3000, max: 20000, critical: { min: 0, max: 30000 } },
  
  // Nutrition
  calories: { min: 1200, max: 4000, critical: { min: 800, max: 5000 } },
  sugar_g: { min: 0, max: 100, critical: { min: 0, max: 150 } },
  
  // Wellness
  stress_level: { min: 0, max: 10, critical: { min: 0, max: 10 } },
  energy_level: { min: 0, max: 10, critical: { min: 0, max: 10 } }
};

// Calculate rolling mean and standard deviation
export const calculateRollingStats = (data, windowSize = 7) => {
  if (data.length < windowSize) {
    return data.map(() => ({ mean: null, stdDev: null }));
  }
  
  const stats = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      stats.push({ mean: null, stdDev: null });
      continue;
    }
    
    const window = data.slice(i - windowSize + 1, i + 1);
    const mean = window.reduce((sum, val) => sum + val, 0) / windowSize;
    const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / windowSize;
    const stdDev = Math.sqrt(variance);
    
    stats.push({ mean, stdDev });
  }
  
  return stats;
};

// Calculate personal baseline (first N days)
export const calculatePersonalBaseline = (data, baselineDays = 14) => {
  if (data.length < baselineDays) {
    return { mean: null, stdDev: null };
  }
  
  const baseline = data.slice(0, baselineDays);
  const mean = baseline.reduce((sum, val) => sum + val, 0) / baselineDays;
  const variance = baseline.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / baselineDays;
  const stdDev = Math.sqrt(variance);
  
  return { mean, stdDev };
};

// Detect anomalies using rolling baseline
export const detectAnomaliesRolling = (data, windowSize = 7, threshold = 1.5) => {
  const rollingStats = calculateRollingStats(data, windowSize);
  const anomalies = [];
  
  for (let i = windowSize - 1; i < data.length; i++) {
    const value = data[i];
    const stats = rollingStats[i];
    
    if (stats.mean !== null && stats.stdDev !== null && stats.stdDev > 0) {
      const zScore = Math.abs((value - stats.mean) / stats.stdDev);
      
      if (zScore > threshold) {
        anomalies.push({
          index: i,
          value: value,
          mean: stats.mean,
          stdDev: stats.stdDev,
          zScore: zScore,
          deviation: value - stats.mean,
          severity: zScore > 2 ? 'high' : zScore > 1.5 ? 'medium' : 'low'
        });
      }
    }
  }
  
  return anomalies;
};

// Detect anomalies using personal baseline
export const detectAnomaliesBaseline = (data, baselineDays = 14, threshold = 1.5) => {
  const baseline = calculatePersonalBaseline(data, baselineDays);
  const anomalies = [];
  
  if (baseline.mean === null || baseline.stdDev === null) {
    return anomalies;
  }
  
  for (let i = baselineDays; i < data.length; i++) {
    const value = data[i];
    const zScore = Math.abs((value - baseline.mean) / baseline.stdDev);
    
    if (zScore > threshold) {
      anomalies.push({
        index: i,
        value: value,
        mean: baseline.mean,
        stdDev: baseline.stdDev,
        zScore: zScore,
        deviation: value - baseline.mean,
        severity: zScore > 2 ? 'high' : zScore > 1.5 ? 'medium' : 'low'
      });
    }
  }
  
  return anomalies;
};

// Detect consecutive outliers (trend detection)
export const detectConsecutiveOutliers = (anomalies, minConsecutive = 2) => {
  if (anomalies.length < minConsecutive) {
    return [];
  }
  
  // Sort by index to ensure chronological order
  const sortedAnomalies = [...anomalies].sort((a, b) => a.index - b.index);
  
  const consecutiveGroups = [];
  let currentGroup = [sortedAnomalies[0]];
  
  for (let i = 1; i < sortedAnomalies.length; i++) {
    // Check if this anomaly is consecutive to the previous one
    if (sortedAnomalies[i].index === sortedAnomalies[i - 1].index + 1) {
      currentGroup.push(sortedAnomalies[i]);
    } else {
      // End of consecutive sequence
      if (currentGroup.length >= minConsecutive) {
        consecutiveGroups.push(currentGroup);
      }
      currentGroup = [sortedAnomalies[i]];
    }
  }
  
  // Don't forget the last group
  if (currentGroup.length >= minConsecutive) {
    consecutiveGroups.push(currentGroup);
  }
  
  return consecutiveGroups;
};

// Check clinical thresholds
export const checkClinicalThresholds = (metricName, value) => {
  const threshold = CLINICAL_THRESHOLDS[metricName];
  if (!threshold) return null;
  
  const isOutOfRange = value < threshold.min || value > threshold.max;
  const isCritical = value < threshold.critical.min || value > threshold.critical.max;
  
  return {
    isOutOfRange,
    isCritical,
    threshold: threshold,
    value: value
  };
};

// Get all metrics from all data sources
const getAllMetrics = (allData) => {
  const metrics = [];
  
  const sources = ['sleep', 'nutrition', 'activity', 'vitals', 'wellness'];
  
  sources.forEach(sourceName => {
    const source = allData[sourceName];
    if (source?.data?.length > 0) {
      const sample = source.data[0];
      Object.keys(sample).forEach(key => {
        if (key !== 'date' && typeof sample[key] === 'number') {
          metrics.push({
            name: key,
            source: sourceName,
            data: extractMetric(source.data, key),
            dates: source.data.map(row => row.date)
          });
        }
      });
    }
  });
  
  return metrics;
};

// Check if metric should be tracked for anomalies
const shouldTrackAnomalies = (metricName) => {
  // Don't flag anomalies for metrics with normal daily variation
  const excludeMetrics = [
    'wake_time',
    'bedtime',
    'breakfast_time',
    'lunch_time',
    'dinner_time',
    'last_meal_time',
    'workout_time',
    'caffeine_last_time',
    'caffeine_cups', // Daily variation is normal (1-3 cups)
    'snacks_calories', // Too variable
    'meals_count', // Normal variation
    'social_interactions', // Random daily variation
    'screen_time_before_bed' // Varies by schedule
  ];
  
  return !excludeMetrics.some(exclude => metricName.toLowerCase().includes(exclude));
};

// Get minimum practical significance threshold for a metric
const getPracticalThreshold = (metricName) => {
  const thresholds = {
    // Vital signs (medically significant)
    'resting_heart_rate': 5,      // ±5 bpm matters
    'blood_pressure_systolic': 10, // ±10 mmHg matters
    'blood_pressure_diastolic': 8, // ±8 mmHg matters
    'oxygen_saturation': 2,        // ±2% matters
    'body_temperature': 0.5,       // ±0.5°C matters
    'hrv_ms': 10,                  // ±10 ms matters
    
    // Sleep (practically significant)
    'sleep_duration_hours': 1.5,   // ±1.5 hrs matters
    'sleep_quality_score': 15,     // ±15 points matters
    'deep_sleep_hours': 0.5,       // ±0.5 hrs matters
    'rem_sleep_hours': 0.5,        // ±0.5 hrs matters
    
    // Body metrics (slow-changing)
    'weight_kg': 1.5,              // ±1.5 kg matters
    'body_fat_percent': 2,         // ±2% matters (0% is noise!)
    'muscle_mass_kg': 1.0,         // ±1 kg matters
    
    // Daily variation (higher thresholds)
    'calories': 500,               // ±500 cal matters
    'steps': 3000,                 // ±3000 steps matters
    'water_glasses': 3,            // ±3 glasses matters
    'exercise_minutes': 30,        // ±30 min matters
    
    // Wellness scores
    'stress_level': 2,             // ±2 points (0-10 scale)
    'energy_level': 2,             // ±2 points (0-10 scale)
    'mood_score': 2,               // ±2 points (0-10 scale)
    'anxiety_level': 2,            // ±2 points (0-10 scale)
    
    // Nutrition (grams)
    'sugar_g': 20,                 // ±20g matters
    'carbs_g': 50,                 // ±50g matters
    'protein_g': 30,               // ±30g matters
    'fats_g': 20                   // ±20g matters
  };
  
  const metricLower = metricName.toLowerCase();
  for (const [key, value] of Object.entries(thresholds)) {
    if (metricLower.includes(key)) {
      return value;
    }
  }
  
  // Default: require meaningful change
  return Infinity; // If no threshold defined, require very large change
};

// Get minimum consecutive days required for a metric
const getMinConsecutiveDays = (metricName) => {
  const metricLower = metricName.toLowerCase();
  
  // Fast-changing metrics (HR, stress) - 2 days
  if (metricLower.includes('heart_rate') || metricLower.includes('stress') || 
      metricLower.includes('hrv') || metricLower.includes('blood_pressure')) {
    return 2;
  }
  
  // Slow-changing metrics (body fat, weight) - 7 days
  if (metricLower.includes('body_fat') || metricLower.includes('weight') || 
      metricLower.includes('muscle_mass')) {
    return 7;
  }
  
  // Medium-changing metrics (sleep, calories, steps) - 3 days
  return 3;
};

// Check if deviation is practically meaningful
const isPracticallyMeaningful = (metricName, deviation) => {
  const threshold = getPracticalThreshold(metricName);
  return Math.abs(deviation) >= threshold;
};

// Detect all anomalies across all metrics
export const detectAllAnomalies = (allData, options = {}) => {
  const {
    baselineDays = 14,
    rollingWindow = 7,
    threshold = 1.8, // Lowered to 1.8 to catch more anomalies (was 2.0)
    criticalThreshold = 2.5,
    minConsecutive = 2
  } = options;
  
  if (!allData) {
    return [];
  }
  
  const metrics = getAllMetrics(allData);
  
  const allAnomalies = [];
  
  metrics.forEach(metric => {
    // FILTER 1: Skip metrics that shouldn't be tracked
    if (!shouldTrackAnomalies(metric.name)) {
      return;
    }
    
    // Need at least baselineDays + 2 days of data
    if (metric.data.length < baselineDays + 2) {
      return;
    }
    
    // Calculate baseline statistics from first baselineDays values
    // Filter out invalid values for baseline calculation
    const baselineData = metric.data.slice(0, baselineDays).filter(
      v => v !== null && v !== undefined && !isNaN(v) && isFinite(v)
    );
    
    if (baselineData.length < 10) { // Need at least 10 valid baseline points
      return;
    }
    
    const baseline = calculatePersonalBaseline(baselineData, baselineData.length);
    if (baseline.mean === null || baseline.stdDev === null || baseline.stdDev === 0) {
      return;
    }
    
    // Detect anomalies with z-score > 2.0
    const anomalies = [];
    const allZScores = []; // Track all z-scores for debugging
    for (let i = baselineDays; i < metric.data.length; i++) {
      const value = metric.data[i];
      
      // Skip invalid values
      if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        continue;
      }
      
      const zScore = Math.abs((value - baseline.mean) / baseline.stdDev);
      const deviation = value - baseline.mean;
      allZScores.push({ value, zScore, deviation, date: metric.dates[i] });
      
      // FILTER 2: Require statistical significance (z-score > 2.0)
      // But allow very high z-scores (>3.5) even if practical threshold not met
      if (zScore <= threshold) {
        continue;
      }
      
      // FILTER 3: Require practical significance (unless z-score is very high)
      const isPractical = isPracticallyMeaningful(metric.name, deviation);
      if (zScore < 3.5 && !isPractical) {
        continue;
      }
      
      anomalies.push({
        index: i,
        value: value,
        mean: baseline.mean,
        stdDev: baseline.stdDev,
        zScore: zScore,
        deviation: deviation,
        severity: zScore > 3.0 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
        date: metric.dates[i]
      });
    }
    
    if (anomalies.length === 0) {
      return;
    }
    
    // FILTER 4: Require sustained duration (consecutive days)
    const minConsecutiveForMetric = getMinConsecutiveDays(metric.name);
    // First, detect ALL consecutive groups (even if below minimum) to get accurate counts
    const allConsecutiveGroups = detectConsecutiveOutliers(anomalies, 1);
    
    // If no consecutive groups at all, check for severe single-day anomalies
    if (allConsecutiveGroups.length === 0) {
      // Check for severe single-day anomalies (lowered thresholds)
      const severeAnomalies = anomalies.filter(a => {
        if (a.zScore > 2.5) return true; // High z-score (lowered from 3.0)
        if (a.zScore > 2.0 && isPracticallyMeaningful(metric.name, a.deviation)) return true; // Moderate z-score with meaningful effect (lowered from 2.5)
        return false;
      });
      
      if (severeAnomalies.length > 0) {
        // Take the most recent severe anomaly
        const mostRecentSevere = severeAnomalies[severeAnomalies.length - 1];
        allAnomalies.push({
          metric: metric.name,
          metricLabel: formatMetricLabel(metric.name),
          source: metric.source,
          category: metric.source,
          anomalies: [{
            ...mostRecentSevere,
            date: metric.dates[mostRecentSevere.index],
            metricName: metric.name
          }],
          consecutiveDays: 1,
          mean: baseline.mean,
          stdDev: baseline.stdDev
        });
      }
      return;
    }
    
    // Get the most recent consecutive group
    const mostRecentGroup = allConsecutiveGroups[allConsecutiveGroups.length - 1];
    
    // Check if it meets minimum requirement OR if it's severe enough to show anyway
    const meetsMinimum = mostRecentGroup.length >= minConsecutiveForMetric;
    const isSevere = mostRecentGroup.some(a => 
      a.zScore > 2.5 || (a.zScore > 2.0 && isPracticallyMeaningful(metric.name, a.deviation))
    );
    
    // Include if it meets minimum OR is severe (even if below minimum)
    if (meetsMinimum || isSevere) {
      allAnomalies.push({
        metric: metric.name,
        metricLabel: formatMetricLabel(metric.name),
        source: metric.source,
        category: metric.source,
        anomalies: mostRecentGroup.map(anomaly => ({
          ...anomaly,
          date: metric.dates[anomaly.index],
          metricName: metric.name
        })),
        consecutiveDays: mostRecentGroup.length, // This will correctly show 2 if there are 2 days
        mean: baseline.mean,
        stdDev: baseline.stdDev
      });
    }
  });
  
  // Prioritize anomalies by importance and diversity
  // Score = (severity * 3) + (zScore * 2) + (consecutiveDays * 1) + (categoryPriority * 1)
  const getCategoryPriority = (category) => {
    // Prioritize: vitals > sleep > wellness > nutrition > activity
    const priorities = {
      'vitals': 5,      // Most medically important
      'sleep': 4,       // Critical for health
      'wellness': 3,    // Important for quality of life
      'nutrition': 2,   // Important but less urgent
      'activity': 1     // Least urgent
    };
    return priorities[category] || 0;
  };
  
  const sortedAnomalies = allAnomalies
    .map(anomaly => {
      const firstAnomaly = anomaly.anomalies[0];
      const severityScore = firstAnomaly?.severity === 'high' ? 3 : firstAnomaly?.severity === 'medium' ? 2 : 1;
      const zScore = firstAnomaly?.zScore || 0;
      const categoryPriority = getCategoryPriority(anomaly.category || anomaly.source);
      const score = (severityScore * 3) + (zScore * 2) + (anomaly.consecutiveDays * 1) + (categoryPriority * 1);
      return { ...anomaly, _score: score };
    })
    .sort((a, b) => {
      // First by score
      if (Math.abs(a._score - b._score) > 0.5) {
        return b._score - a._score;
      }
      // Then by recency
      const aDate = a.anomalies[a.anomalies.length - 1]?.date || '';
      const bDate = b.anomalies[b.anomalies.length - 1]?.date || '';
      return bDate.localeCompare(aDate);
    })
    // Remove duplicates by category (keep only the highest scoring one per category)
    .filter((anomaly, index, self) => {
      const category = anomaly.category || anomaly.source;
      const firstInCategory = self.findIndex(a => (a.category || a.source) === category);
      return firstInCategory === index;
    })
    .slice(0, 3); // LIMIT: Top 3 most important anomalies only (quality > quantity)
  
  return sortedAnomalies;
};

// Add context to anomalies (correlations, related metrics)
export const addAnomalyContext = (anomaly, allData, date) => {
  const context = {
    correlations: [],
    relatedMetrics: [],
    suggestions: []
  };
  
  // Get data for the anomaly date
  const dateData = getDataForDate(allData, date);
  
  // Find correlations with other metrics on that date
  // This is a simplified version - in production, use the correlation analysis
  const metricName = anomaly.metricName;
  const metricValue = anomaly.value;
  
  // Check for related patterns
  if (metricName === 'sleep_duration_hours' && metricValue < 6) {
    context.suggestions.push('Low sleep duration may affect next-day energy and sugar cravings');
    if (dateData.wellness) {
      context.relatedMetrics.push({
        metric: 'energy_level',
        value: dateData.wellness.energy_level,
        relationship: 'Low sleep typically correlates with lower energy'
      });
    }
  }
  
  if (metricName === 'resting_heart_rate' && metricValue > 75) {
    context.suggestions.push('Elevated resting heart rate may indicate stress or illness');
    if (dateData.wellness) {
      context.relatedMetrics.push({
        metric: 'stress_level',
        value: dateData.wellness.stress_level,
        relationship: 'High stress often elevates heart rate'
      });
    }
  }
  
  if (metricName === 'sugar_g' && metricValue > 80) {
    context.suggestions.push('High sugar intake may lead to energy crashes and affect sleep quality');
  }
  
  if (metricName === 'blood_pressure_systolic' && metricValue > 140) {
    context.suggestions.push('Elevated blood pressure - consider consulting a healthcare professional');
  }
  
  return {
    ...anomaly,
    context: context
  };
};

// Get current anomalies (most recent)
export const getCurrentAnomalies = (allAnomalies, days = 7) => {
  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(now.getDate() - days);
  
  const current = [];
  
  allAnomalies.forEach(metricAnomalies => {
    const recent = metricAnomalies.anomalies.filter(anomaly => {
      const anomalyDate = new Date(anomaly.date);
      return anomalyDate >= cutoffDate;
    });
    
    if (recent.length > 0) {
      current.push({
        ...metricAnomalies,
        anomalies: recent
      });
    }
  });
  
  return current;
};

// Get anomaly statistics
export const getAnomalyStatistics = (allAnomalies) => {
  const stats = {
    total: 0,
    bySeverity: { low: 0, medium: 0, high: 0 },
    byMetric: {},
    consecutiveTrends: 0
  };
  
  allAnomalies.forEach(metricAnomalies => {
    stats.total += metricAnomalies.anomalies.length;
    stats.byMetric[metricAnomalies.metric] = metricAnomalies.anomalies.length;
    stats.consecutiveTrends += metricAnomalies.consecutiveGroups.length;
    
    metricAnomalies.anomalies.forEach(anomaly => {
      stats.bySeverity[anomaly.severity] = (stats.bySeverity[anomaly.severity] || 0) + 1;
    });
  });
  
  return stats;
};

// Format anomaly for display
export const formatAnomalyAlert = (anomaly, allData) => {
  const contextAnomaly = addAnomalyContext(anomaly, allData, anomaly.date);
  
  let message = `${formatMetricLabel(anomaly.metricName)} is ${anomaly.value > (anomaly.mean || 0) ? 'elevated' : 'low'}`;
  
  if (anomaly.mean !== null) {
    const percentDeviation = ((anomaly.deviation / anomaly.mean) * 100).toFixed(1);
    message += ` (${percentDeviation > 0 ? '+' : ''}${percentDeviation}% from baseline)`;
  }
  
  if (contextAnomaly.context.suggestions.length > 0) {
    message += `. ${contextAnomaly.context.suggestions[0]}`;
  }
  
  return {
    id: `${anomaly.metricName}-${anomaly.date}`,
    date: anomaly.date,
    metric: anomaly.metricName,
    value: anomaly.value,
    severity: anomaly.severity,
    message: message,
    context: contextAnomaly.context,
    type: anomaly.type || 'statistical'
  };
};

