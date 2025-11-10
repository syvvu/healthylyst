// Multi-Factor Insight Scoring System
// Prioritizes interesting, cross-domain insights over obvious correlations

import { getDataForDate, getAvailableDates } from './dataLoader';

// Factor 1: Correlation Strength (25% weight)
export function getCorrelationScore(r) {
  const absR = Math.abs(r);
  
  // Minimum threshold
  if (absR < 0.4) return 0;
  
  // Normalize 0.4 - 1.0 to 0 - 100 scale
  return ((absR - 0.4) / 0.6) * 100;
}

// Factor 2: Cross-File Factor (30% weight) - MOST IMPORTANT
export function getCrossFileScore(metric1Category, metric2Category) {
  // Same category = boring
  if (metric1Category === metric2Category) {
    return 0;
  }
  
  // Different categories = data unification proof
  // Bonus points for "distant" categories
  const categoryDistance = {
    'sleep-nutrition': 100,      // Very different domains
    'nutrition-sleep': 100,
    'sleep-activity': 90,         // Different domains
    'activity-sleep': 90,
    'nutrition-activity': 85,     // Different domains
    'activity-nutrition': 85,
    'activity-wellness': 70,      // Somewhat related
    'wellness-activity': 70,
    'sleep-wellness': 75,         // Somewhat related
    'wellness-sleep': 75,
    'wellness-nutrition': 80,     // Different domains
    'nutrition-wellness': 80,
    'vitals-sleep': 95,           // Vitals crosses with anything is interesting
    'sleep-vitals': 95,
    'vitals-activity': 95,
    'activity-vitals': 95,
    'vitals-nutrition': 95,
    'nutrition-vitals': 95,
    'vitals-wellness': 95,
    'wellness-vitals': 95
  };
  
  const key = `${metric1Category}-${metric2Category}`;
  return categoryDistance[key] || 60; // Default if not in map
}

// Factor 3: Surprise Factor (20% weight)
export function getSurpriseScore(metric1, metric2) {
  const m1Lower = metric1.toLowerCase();
  const m2Lower = metric2.toLowerCase();
  
  // Define "obvious" relationships (low surprise)
  const obviousPairs = [
    ['workout_performance', 'mood'],        // Everyone knows this
    ['workout_performance', 'energy'],      // Obvious
    ['exercise_minutes', 'calories_burned'], // Trivial
    ['sleep_quality', 'energy_level'],      // Expected
    ['stress_level', 'mood'],               // Obvious
    ['steps', 'calories_burned'],           // Direct relationship
    ['workout', 'mood'],
    ['exercise', 'energy'],
    ['steps', 'distance']
  ];
  
  // Check if this is an obvious pair
  for (const [m1, m2] of obviousPairs) {
    if ((m1Lower.includes(m1) && m2Lower.includes(m2)) ||
        (m1Lower.includes(m2) && m2Lower.includes(m1))) {
      return 20; // Low surprise score
    }
  }
  
  // Non-obvious relationships get high score
  const surprisingPairs = [
    ['sleep', 'sugar'],                     // Time-delayed cravings
    ['caffeine', 'sleep'],                  // Timing matters
    ['resting_heart_rate', 'illness'],      // Predictive
    ['hydration', 'energy'],                // Often overlooked
    ['meal_timing', 'weight'],              // When, not just what
    ['screen_time_before_bed', 'sleep'],    // Modern insight
    ['social_interactions', 'sleep'],       // Non-obvious
    ['caffeine_last_time', 'sleep'],
    ['sleep_duration', 'caffeine_last_time'], // Sleep duration affects caffeine timing
    ['sleep', 'caffeine_last_time'],        // Sleep affects caffeine timing
    ['screen_time', 'sleep'],
    ['sleep', 'sugar_intake'],
    ['sleep', 'sugar_afternoon']
  ];
  
  for (const [concept1, concept2] of surprisingPairs) {
    if ((m1Lower.includes(concept1) && m2Lower.includes(concept2)) ||
        (m1Lower.includes(concept2) && m2Lower.includes(concept1))) {
      return 100; // High surprise score
    }
  }
  
  // Default: moderately surprising
  return 60;
}

// Factor 4: Actionability (15% weight)
export function getActionabilityScore(metric1, metric2) {
  const m1Lower = metric1.toLowerCase();
  const m2Lower = metric2.toLowerCase();
  
  // Controllable input metrics (user can change these)
  const controllable = [
    'caffeine_cups',
    'caffeine_last_time',
    'water_glasses',
    'screen_time_before_bed',
    'bedtime',
    'meal_last_time',
    'dinner_time',
    'workout_time',
    'meditation_minutes',
    'alcohol_units'
  ];
  
  // Check if either metric is controllable
  const metric1Controllable = controllable.some(c => m1Lower.includes(c));
  const metric2Controllable = controllable.some(c => m2Lower.includes(c));
  
  if (metric1Controllable || metric2Controllable) {
    return 100; // Highly actionable - user can change behavior
  }
  
  // Less controllable but still somewhat actionable
  const somewhatControllable = [
    'sleep_duration',
    'exercise_minutes',
    'stress_level',
    'calories'
  ];
  
  const metric1Somewhat = somewhatControllable.some(c => m1Lower.includes(c));
  const metric2Somewhat = somewhatControllable.some(c => m2Lower.includes(c));
  
  if (metric1Somewhat || metric2Somewhat) {
    return 60; // Somewhat actionable
  }
  
  // Both metrics are outcomes (not very actionable)
  return 20;
}

// Helper to convert time string to numeric hours
const timeToHours = (time) => {
  if (!time) return null;
  if (typeof time === 'string' && time.includes(':')) {
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h + (m / 60);
  }
  return typeof time === 'number' ? time : parseFloat(time);
};

// Factor 5: Impact Magnitude (10% weight)
export function getImpactScore(correlation, allHealthData) {
  if (!correlation || !allHealthData) return 0;
  
  try {
    const { metric1Category, metric1, metric2Category, metric2 } = correlation;
    
    // Check if metrics are time-based
    const isTimeMetric = (name) => name?.includes('time') || name?.includes('bedtime') || name?.includes('wake_time');
    const m1IsTime = isTimeMetric(metric1);
    const m2IsTime = isTimeMetric(metric2);
    
    // Get all data points
    const dates = getAvailableDates(allHealthData);
    const values = dates.map(date => {
      const dayData = getDataForDate(allHealthData, date);
      let x = dayData[metric1Category]?.[metric1];
      let y = dayData[metric2Category]?.[metric2];
      
      // Convert time strings to numeric hours
      if (m1IsTime && x != null) x = timeToHours(x);
      if (m2IsTime && y != null) y = timeToHours(y);
      
      return { x, y };
    }).filter(v => v.x != null && v.y != null && typeof v.x === 'number' && typeof v.y === 'number' && !isNaN(v.x) && !isNaN(v.y));
    
    if (values.length < 5) return 0;
    
    // Split into low/high groups by median
    const sorted = [...values].sort((a, b) => a.x - b.x);
    const median = sorted[Math.floor(sorted.length / 2)].x;
    
    const lowGroup = values.filter(v => v.x < median).map(v => v.y);
    const highGroup = values.filter(v => v.x >= median).map(v => v.y);
    
    if (lowGroup.length === 0 || highGroup.length === 0) return 0;
    
    const lowAvg = lowGroup.reduce((a, b) => a + b, 0) / lowGroup.length;
    const highAvg = highGroup.reduce((a, b) => a + b, 0) / highGroup.length;
    const difference = Math.abs(highAvg - lowAvg);
    
    // Calculate pooled standard deviation for Cohen's d
    const lowVariance = lowGroup.reduce((sum, v) => sum + Math.pow(v - lowAvg, 2), 0) / lowGroup.length;
    const highVariance = highGroup.reduce((sum, v) => sum + Math.pow(v - highAvg, 2), 0) / highGroup.length;
    const pooledStd = Math.sqrt((lowVariance + highVariance) / 2);
    
    if (pooledStd === 0) return 0;
    
    const cohensD = difference / pooledStd;
    
    // Cohen's d interpretation:
    // < 0.2: trivial
    // 0.2-0.5: small
    // 0.5-0.8: medium
    // > 0.8: large
    
    if (cohensD < 0.2) return 10;
    if (cohensD < 0.5) return 40;
    if (cohensD < 0.8) return 70;
    return 100; // Large effect
  } catch (error) {
    console.error('Error calculating impact score:', error);
    return 0;
  }
}

// Complete Selection Algorithm
export function selectHeroInsight(allHealthData, correlations) {
  if (!correlations || correlations.length === 0) return null;
  
  // Score each correlation
  const scoredCorrelations = correlations.map(corr => {
    const corrScore = getCorrelationScore(corr.correlation) * 0.25;
    const crossFileScore = getCrossFileScore(corr.metric1Category, corr.metric2Category) * 0.30;
    const surpriseScore = getSurpriseScore(corr.metric1, corr.metric2) * 0.20;
    const actionScore = getActionabilityScore(corr.metric1, corr.metric2) * 0.15;
    const impactScore = getImpactScore(corr, allHealthData) * 0.10;
    
    const totalScore = corrScore + crossFileScore + surpriseScore + actionScore + impactScore;
    
    return {
      ...corr,
      scores: {
        correlation: corrScore,
        crossFile: crossFileScore,
        surprise: surpriseScore,
        actionability: actionScore,
        impact: impactScore,
        total: totalScore
      }
    };
  });
  
  // Sort by total score
  scoredCorrelations.sort((a, b) => b.scores.total - a.scores.total);
  
  // Return top insight
  return scoredCorrelations[0];
}

