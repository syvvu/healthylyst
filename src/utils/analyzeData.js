// Advanced Data Analysis Functions
// Translated from Python to JavaScript

import { calculateAllCorrelations, getAllMetrics } from './correlationAnalysis';
import { calculateCorrelation, getAvailableDates } from './dataLoader';
import { calculateRollingStats } from './anomalyDetection';

/**
 * Find cascading correlations across multiple files
 * Examples: 
 * - sleep_quality_score → workout_performance_rating (next day)
 * - caffeine_last_time → sleep_quality_score
 * - stress_level → hrv_ms / resting_heart_rate
 * - screen_time_before_bed_minutes → sleep_quality_score
 * - workout_performance_rating → mood_score / energy_level
 */
export const findCascades = (allData, maxSteps = 3, minCorrelation = 0.4) => {
  const allCorrs = calculateAllCorrelations(allData, minCorrelation, 3);
  const cascades = [];
  
  // Build a graph of correlations
  const correlationGraph = {};
  
  allCorrs.forEach(corr => {
    if (!correlationGraph[corr.metric1]) {
      correlationGraph[corr.metric1] = [];
    }
    correlationGraph[corr.metric1].push({
      target: corr.metric2,
      correlation: corr.correlation,
      lag: corr.lag || 0,
      source: corr.metric1Category,
      targetCategory: corr.metric2Category
    });
  });
  
  // Find paths of length 2-3
  const findPaths = (startMetric, visited = new Set(), path = [], depth = 0) => {
    if (depth >= maxSteps || visited.has(startMetric)) {
      if (path.length >= 2) {
        // Check if this is a cross-file cascade
        const sources = new Set(path.map(p => p.source));
        if (sources.size >= 2) {
          cascades.push({
            path: [...path],
            steps: path.length,
            crossFile: sources.size,
            description: path.map((p, i) => 
              i === 0 ? p.metric : `→ ${p.metric}`
            ).join(' ')
          });
        }
      }
      return;
    }
    
    visited.add(startMetric);
    const connections = correlationGraph[startMetric] || [];
    
    connections.forEach(conn => {
      if (Math.abs(conn.correlation) >= minCorrelation) {
        findPaths(
          conn.target,
          new Set(visited),
          [...path, {
            metric: conn.target,
            correlation: conn.correlation,
            lag: conn.lag,
            source: conn.targetCategory
          }],
          depth + 1
        );
      }
    });
  };
  
  // Start from each metric
  Object.keys(correlationGraph).forEach(startMetric => {
    findPaths(startMetric);
  });
  
  // Remove duplicates and sort by strength
  const uniqueCascades = cascades.filter((cascade, idx, self) => 
    idx === self.findIndex(c => c.description === cascade.description)
  );
  
  return uniqueCascades
    .sort((a, b) => {
      const aStrength = a.path.reduce((sum, p) => sum + Math.abs(p.correlation), 0) / a.path.length;
      const bStrength = b.path.reduce((sum, p) => sum + Math.abs(p.correlation), 0) / b.path.length;
      return bStrength - aStrength;
    })
    .slice(0, 10); // Top 10 cascades
};

/**
 * Detect threshold effects: "Below X, outcome is bad. Above X, outcome is good"
 */
export const findThresholdEffects = (allData, metricInput, metricOutput) => {
  const metrics = getAllMetrics(allData);
  const inputMetric = metrics.find(m => m.name === metricInput);
  const outputMetric = metrics.find(m => m.name === metricOutput);
  
  if (!inputMetric || !outputMetric) return null;
  
  // Align data by date
  const alignedData = [];
  const minLength = Math.min(inputMetric.data.length, outputMetric.data.length);
  
  for (let i = 0; i < minLength; i++) {
    const inputVal = inputMetric.data[i];
    const outputVal = outputMetric.data[i];
    
    if (typeof inputVal === 'number' && typeof outputVal === 'number' &&
        !isNaN(inputVal) && !isNaN(outputVal) && 
        isFinite(inputVal) && isFinite(outputVal)) {
      alignedData.push({ input: inputVal, output: outputVal });
    }
  }
  
  if (alignedData.length < 10) return null;
  
  // Sort by input value
  alignedData.sort((a, b) => a.input - b.input);
  
  // Divide into 5 quantiles
  const quantileSize = Math.floor(alignedData.length / 5);
  const quantiles = [];
  
  for (let i = 0; i < 5; i++) {
    const start = i * quantileSize;
    const end = i === 4 ? alignedData.length : (i + 1) * quantileSize;
    const quantileData = alignedData.slice(start, end);
    
    const avgOutput = quantileData.reduce((sum, d) => sum + d.output, 0) / quantileData.length;
    const avgInput = quantileData.reduce((sum, d) => sum + d.input, 0) / quantileData.length;
    
    quantiles.push({
      bin: i,
      label: ['very_low', 'low', 'medium', 'high', 'very_high'][i],
      avgInput,
      avgOutput,
      count: quantileData.length
    });
  }
  
  // Find inflection point (largest jump between quantiles)
  let maxJump = 0;
  let thresholdIdx = 0;
  
  for (let i = 0; i < quantiles.length - 1; i++) {
    const jump = Math.abs(quantiles[i + 1].avgOutput - quantiles[i].avgOutput);
    if (jump > maxJump) {
      maxJump = jump;
      thresholdIdx = i;
    }
  }
  
  const thresholdValue = quantiles[thresholdIdx].avgInput;
  const effectSize = quantiles[thresholdIdx + 1].avgOutput - quantiles[thresholdIdx].avgOutput;
  
  return {
    input: metricInput,
    output: metricOutput,
    thresholdBin: thresholdIdx,
    thresholdValue,
    effectSize,
    quantiles,
    insight: `Your optimal ${inputMetric.label} is around ${thresholdValue.toFixed(1)}. Below this, ${outputMetric.label} tends to be ${effectSize < 0 ? 'lower' : 'higher'}.`
  };
};

/**
 * Find conditional correlations: "When X is low, Y affects Z. When X is high, Y doesn't matter"
 */
export const findConditionalCorrelations = (allData, conditionMetric, metricA, metricB) => {
  const metrics = getAllMetrics(allData);
  const condition = metrics.find(m => m.name === conditionMetric);
  const metric1 = metrics.find(m => m.name === metricA);
  const metric2 = metrics.find(m => m.name === metricB);
  
  if (!condition || !metric1 || !metric2) return null;
  
  // Align all three metrics
  const alignedData = [];
  const minLength = Math.min(condition.data.length, metric1.data.length, metric2.data.length);
  
  for (let i = 0; i < minLength; i++) {
    const condVal = condition.data[i];
    const val1 = metric1.data[i];
    const val2 = metric2.data[i];
    
    if (typeof condVal === 'number' && typeof val1 === 'number' && typeof val2 === 'number' &&
        !isNaN(condVal) && !isNaN(val1) && !isNaN(val2) &&
        isFinite(condVal) && isFinite(val1) && isFinite(val2)) {
      alignedData.push({ condition: condVal, metric1: val1, metric2: val2 });
    }
  }
  
  if (alignedData.length < 10) return null;
  
  // Calculate threshold (median or specific value)
  const sortedConditions = [...alignedData].sort((a, b) => a.condition - b.condition);
  const medianCondition = sortedConditions[Math.floor(sortedConditions.length / 2)].condition;
  
  // Split into high and low groups
  const highGroup = alignedData.filter(d => d.condition >= medianCondition);
  const lowGroup = alignedData.filter(d => d.condition < medianCondition);
  
  if (highGroup.length < 5 || lowGroup.length < 5) return null;
  
  // Calculate correlations in each group
  const highCorr = calculateCorrelation(
    highGroup.map(d => d.metric1),
    highGroup.map(d => d.metric2)
  );
  
  const lowCorr = calculateCorrelation(
    lowGroup.map(d => d.metric1),
    lowGroup.map(d => d.metric2)
  );
  
  const difference = Math.abs(lowCorr - highCorr);
  
  if (difference > 0.3 && !isNaN(highCorr) && !isNaN(lowCorr)) {
    return {
      condition: conditionMetric,
      conditionLabel: condition.label,
      metricA,
      metricALabel: metric1.label,
      metricB,
      metricBLabel: metric2.label,
      correlationWhenHigh: highCorr,
      correlationWhenLow: lowCorr,
      difference,
      insight: `${metric1.label} affects ${metric2.label} differently based on ${condition.label}. ` +
               `When ${condition.label} is high: r=${highCorr.toFixed(2)}, ` +
               `when low: r=${lowCorr.toFixed(2)}`
    };
  }
  
  return null;
};

/**
 * Detect weekly patterns (day-of-week effects)
 */
export const detectWeeklyPatterns = (allData, metricName) => {
  const metrics = getAllMetrics(allData);
  const metric = metrics.find(m => m.name === metricName);
  
  if (!metric) return null;
  
  // Get dates from the first data source
  const dates = getAvailableDates(allData);
  if (dates.length === 0) return null;
  
  // Group by day of week
  const dayOfWeekData = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: []
  };
  
  dates.forEach((date, idx) => {
    if (idx < metric.data.length && typeof metric.data[idx] === 'number' && 
        !isNaN(metric.data[idx]) && isFinite(metric.data[idx])) {
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (dayOfWeekData[dayName]) {
        dayOfWeekData[dayName].push(metric.data[idx]);
      }
    }
  });
  
  // Calculate averages
  const weeklyAvg = {};
  const weeklyStd = {};
  
  Object.keys(dayOfWeekData).forEach(day => {
    const values = dayOfWeekData[day];
    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
      const std = Math.sqrt(variance);
      
      weeklyAvg[day] = avg;
      weeklyStd[day] = std;
    }
  });
  
  // Find peak and trough
  const days = Object.keys(weeklyAvg);
  const values = days.map(day => weeklyAvg[day]);
  const maxIdx = values.indexOf(Math.max(...values));
  const minIdx = values.indexOf(Math.min(...values));
  
  const peakDay = days[maxIdx];
  const troughDay = days[minIdx];
  const meanValue = values.reduce((a, b) => a + b, 0) / values.length;
  const variationPct = ((Math.max(...values) - Math.min(...values)) / meanValue) * 100;
  
  return {
    metric: metricName,
    metricLabel: metric.label,
    peakDay,
    peakValue: weeklyAvg[peakDay],
    troughDay,
    troughValue: weeklyAvg[troughDay],
    variationPct,
    weeklyAvg,
    weeklyStd,
    insight: `Your ${metric.label} peaks on ${peakDay} and dips on ${troughDay} (±${variationPct.toFixed(0)}%)`
  };
};

/**
 * Get correlation network data for visualization
 */
export const getCorrelationNetwork = (allData, minCorrelation = 0.4) => {
  const allCorrs = calculateAllCorrelations(allData, minCorrelation, 3);
  const metrics = getAllMetrics(allData);
  
  // Create nodes (metrics)
  const nodes = metrics.map(metric => ({
    id: metric.name,
    label: metric.label,
    category: metric.category,
    source: metric.source
  }));
  
  // Create edges (correlations)
  const edges = allCorrs
    .filter(corr => Math.abs(corr.correlation) >= minCorrelation)
    .map(corr => ({
      source: corr.metric1,
      target: corr.metric2,
      correlation: corr.correlation,
      strength: Math.abs(corr.correlation),
      direction: corr.direction,
      lag: corr.lag || 0,
      type: corr.type || 'same-day'
    }));
  
  // Find cascades
  const cascades = findCascades(allData, 3, minCorrelation);
  
  return {
    nodes,
    edges,
    cascades
  };
};

/**
 * Get multi-layer timeline data
 */
export const getMultiLayerTimeline = (allData, selectedMetrics = [], dateRange = null) => {
  const metrics = getAllMetrics(allData);
  const dates = getAvailableDates(allData);
  
  // Filter dates if range provided
  // Normalize all dates to strings for consistent comparison
  const normalizeDate = (date) => {
    if (typeof date === 'string') {
      return date.split('T')[0]; // Get YYYY-MM-DD part
    }
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return String(date);
  };
  
  let filteredDates = dates.map(normalizeDate);
  if (dateRange) {
    const startStr = normalizeDate(dateRange.start);
    const endStr = normalizeDate(dateRange.end);
    filteredDates = dates
      .map(normalizeDate)
      .filter(dateStr => {
        return dateStr >= startStr && dateStr <= endStr;
      });
  }
  
  // If no metrics selected, use top correlated metrics
  let metricsToShow = selectedMetrics;
  if (metricsToShow.length === 0) {
    const allCorrs = calculateAllCorrelations(allData, 0.4, 3);
    const topMetrics = new Set();
    allCorrs.slice(0, 10).forEach(corr => {
      topMetrics.add(corr.metric1);
      topMetrics.add(corr.metric2);
    });
    metricsToShow = Array.from(topMetrics).slice(0, 4);
  }
  
  // Build timeline data
  // Note: getAllMetrics already aligns data by date, so metric.data[i] corresponds to dates[i]
  // We need to use the same date array that getAllMetrics used for alignment
  const allDates = getAvailableDates(allData);
  const sortedDates = Array.from(allDates).sort();
  
  const layers = metricsToShow.map(metricName => {
    const metric = metrics.find(m => m.name === metricName);
    if (!metric) {
      return null;
    }
    
    // metric.data is already aligned with sortedDates from getAllMetrics
    // Normalize sortedDates to strings for consistent comparison
    const sortedDatesStr = sortedDates.map(normalizeDate);
    
    // Create a map for quick lookup: date string -> value
    const dateValueMap = new Map();
    sortedDatesStr.forEach((dateStr, idx) => {
      if (metric.data && idx < metric.data.length) {
        const val = metric.data[idx];
        if (val !== undefined && val !== null && typeof val === 'number' && !isNaN(val) && isFinite(val)) {
          dateValueMap.set(dateStr, val);
        }
      }
    });
    
    // Now map filteredDates (already normalized to strings) to data points
    const dataPoints = filteredDates.map((dateStr) => {
      // Direct lookup using normalized date string
      const value = dateValueMap.get(dateStr);
      
      return {
        date: dateStr,
        value: value !== undefined ? value : null
      };
    });
    
    // Only return layer if it has at least some data
    const validDataPoints = dataPoints.filter(d => d.value !== null).length;
    if (validDataPoints === 0) {
      return null;
    }
    
    return {
      metric: metricName,
      label: metric.label,
      category: metric.category,
      source: metric.source,
      data: dataPoints
    };
  }).filter(layer => layer !== null);
  
  // Get correlations between selected metrics
  const allCorrs = calculateAllCorrelations(allData, 0.3, 3);
  const relevantCorrs = allCorrs.filter(corr => 
    metricsToShow.includes(corr.metric1) && metricsToShow.includes(corr.metric2)
  );
  
  return {
    layers,
    correlations: relevantCorrs,
    dateRange: {
      start: filteredDates[0],
      end: filteredDates[filteredDates.length - 1]
    }
  };
};

