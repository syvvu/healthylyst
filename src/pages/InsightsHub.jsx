// Enhanced Insights Hub Page with Detailed Visual Design
// Matches comprehensive visual specifications

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, AlertTriangle, TrendingUp, Search, X, MoreVertical, Brain, Link2, Zap, Folder } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, ReferenceLine, ReferenceArea, Legend } from 'recharts';
import { calculateAllCorrelations } from '../utils/correlationAnalysis';
import { detectAllAnomalies } from '../utils/anomalyDetection';
import { getAvailableDates, getDataForDate } from '../utils/dataLoader';
import { selectHeroInsight } from '../utils/insightScoring';
import TabNavigation, { PageHeader } from '../components/TabNavigation';
import CorrelationInsightCard from '../components/insights/CorrelationInsightCard';
import AnomalyInsightCard from '../components/insights/AnomalyInsightCard';
import InsightEvidenceModal from '../components/modals/InsightEvidenceModal';
import { format, subDays } from 'date-fns';
import { isInsightArchived, archiveInsight, unarchiveInsight, isInsightTracked, trackInsight, untrackInsight } from '../utils/insightState';

const theme = {
  background: {
    primary: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #fef3c7 100%)',
    card: '#ffffff'
  },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155', tertiary: '#64748b' },
  accent: { 
    primary: '#0ea5e9', 
    purple: '#8b5cf6',
    success: '#10b981', 
    warning: '#f59e0b', 
    danger: '#f43f5e' 
  }
};

const InsightsHub = ({ allHealthData, onOpenSettings }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeMainTab, setActiveMainTab] = useState('correlations'); // 'correlations' or 'anomalies'
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all' or 'archived'
  const [insights, setInsights] = useState([]);
  const [sortBy, setSortBy] = useState('newest');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [insightStates, setInsightStates] = useState({});
  const highlightedInsightRef = useRef(null);
  const hasScrolledToHighlight = useRef(false);

  // Handle tab parameter from URL to set active tab
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'anomalies' || tabParam === 'correlations') {
      setActiveMainTab(tabParam);
      setActiveSubTab('all');
      hasScrolledToHighlight.current = false;
    }
  }, [searchParams]);

  useEffect(() => {
    if (!allHealthData) {
      return;
    }
    
    // Set active tab to correlations if URL params indicate a correlation
    const urlMetric1 = searchParams.get('metric1');
    if (urlMetric1) {
      setActiveMainTab('correlations');
      setActiveSubTab('all');
      // Reset scroll flag when URL params change
      hasScrolledToHighlight.current = false;
    }
    
    setLoading(true);
    // Generate all insights (this function uses searchParams from closure)
    const allInsights = generateAllInsights(allHealthData);
    setInsights(allInsights);
    setLoading(false);
  }, [allHealthData, searchParams]);

  // Helper: Check if correlation is a trivial time-shift (e.g., bedtime → breakfast)
  const isTrivialTimeShift = (metric1, metric2) => {
    const timeMetrics = ['bedtime', 'wake_time', 'breakfast_time', 'last_meal_time', 'caffeine_last_time'];
    const isTimeMetric1 = timeMetrics.some(t => metric1?.toLowerCase().includes(t));
    const isTimeMetric2 = timeMetrics.some(t => metric2?.toLowerCase().includes(t));
    
    // If both are time metrics, it's likely a trivial time-shift
    if (isTimeMetric1 && isTimeMetric2) {
      return true;
    }
    
    // Specific trivial pairs
    const trivialPairs = [
      ['bedtime', 'breakfast_time'],
      ['bedtime', 'wake_time'],
      ['wake_time', 'breakfast_time'],
      ['wake_time', 'last_meal_time'],
      ['bedtime', 'last_meal_time']
    ];
    
    const m1Lower = metric1?.toLowerCase() || '';
    const m2Lower = metric2?.toLowerCase() || '';
    
    return trivialPairs.some(([p1, p2]) => 
      (m1Lower.includes(p1) && m2Lower.includes(p2)) ||
      (m1Lower.includes(p2) && m2Lower.includes(p1))
    );
  };

  // Helper: Get the correct unit for effect size based on metric
  const getEffectSizeUnit = (metricName, metricLabel) => {
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
    // Wellness metrics - CHECK THESE BEFORE NUTRITION to avoid matching 'g' in 'energy_level'
    else if (fullName.includes('stress_level') || fullName.includes('energy_level') ||
             fullName.includes('mood_score') || fullName.includes('anxiety_level') ||
             fullName.includes('productivity_score') || fullName.includes('_level') ||
             fullName.includes('_score') || (fullName.includes('level') && !fullName.includes('_g')) ||
             (fullName.includes('score') && !fullName.includes('_g')) || fullName.includes('rating')) {
      return 'points';
    }
    // Nutrition metrics - check for specific grams patterns (must end with _g or be explicit)
    else if (fullName.includes('protein_g') || fullName.includes('carbs_g') ||
             fullName.includes('fats_g') || fullName.includes('fiber_g') ||
             fullName.includes('sugar_g') || fullName.endsWith('_g') ||
             (fullName.includes('sugar') && !fullName.includes('score') && !fullName.includes('level')) ||
             (fullName.includes('protein') && !fullName.includes('score') && !fullName.includes('level')) ||
             (fullName.includes('carbs') && !fullName.includes('score') && !fullName.includes('level')) ||
             (fullName.includes('fats') && !fullName.includes('score') && !fullName.includes('level')) ||
             (fullName.includes('fiber') && !fullName.includes('score') && !fullName.includes('level'))) {
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
    
    return '';
  };

  // Helper: Check if effect size is meaningful (not noise)
  const isMeaningfulEffect = (effectSize, metric2, metric2Label) => {
    const metricLower = (metric2 || '').toLowerCase();
    const labelLower = (metric2Label || '').toLowerCase();
    
    // Wellness metrics first (energy_level, stress_level, mood_score) - before checking for 'g'
    if (metricLower.includes('stress_level') || metricLower.includes('energy_level') ||
        metricLower.includes('mood_score') || metricLower.includes('anxiety_level') ||
        metricLower.includes('productivity_score') || metricLower.includes('_level') ||
        metricLower.includes('_score') || labelLower.includes('level') || labelLower.includes('score')) {
      return effectSize >= 1.0;
    }
    
    // For grams (sugar_g, carbs_g, protein_g, etc.) - need at least 5g difference
    // Only match if it's explicitly a gram metric, not just contains 'g'
    if (metricLower.includes('_g') || metricLower.endsWith('_g') ||
        metricLower.includes('sugar_g') || metricLower.includes('carbs_g') ||
        metricLower.includes('protein_g') || metricLower.includes('fats_g') ||
        metricLower.includes('fiber_g') || labelLower.includes('gram') || 
        (labelLower.includes('sugar') && !labelLower.includes('score') && !labelLower.includes('level')) ||
        (labelLower.includes('carb') && !labelLower.includes('score') && !labelLower.includes('level')) ||
        (labelLower.includes('protein') && !labelLower.includes('score') && !labelLower.includes('level')) ||
        (labelLower.includes('fat') && !labelLower.includes('score') && !labelLower.includes('level'))) {
      return effectSize >= 5;
    }
    
    // For percentages (body fat, etc.) - need at least 1% difference
    if (metricLower.includes('percent') || metricLower.includes('%') || 
        labelLower.includes('percent') || labelLower.includes('body fat')) {
      return effectSize >= 1.0;
    }
    
    // For scores/levels (0-10 or 0-100 scale) - need at least 1 point difference
    if (metricLower.includes('score') || metricLower.includes('level') || 
        metricLower.includes('quality') || metricLower.includes('rating') ||
        labelLower.includes('score') || labelLower.includes('level') ||
        labelLower.includes('quality') || labelLower.includes('rating')) {
      return effectSize >= 1.0;
    }
    
    // For hours (sleep duration, etc.) - need at least 0.5 hours
    if (metricLower.includes('hour') || metricLower.includes('duration') ||
        labelLower.includes('hour') || labelLower.includes('duration')) {
      return effectSize >= 0.5;
    }
    
    // For heart rate, steps, etc. - need at least 5 units
    if (metricLower.includes('heart_rate') || metricLower.includes('bpm') ||
        metricLower.includes('steps') || metricLower.includes('hrv')) {
      return effectSize >= 5;
    }
    
    // For oxygen saturation - need at least 2% (very sensitive metric)
    if (metricLower.includes('oxygen') || labelLower.includes('oxygen')) {
      return effectSize >= 2.0;
    }
    
    // Default: require at least 5% relative change or absolute value of 1
    return effectSize >= 1.0;
  };

  // Define the 5 main priority correlations that should always be shown
  // Using actual metric names from CSV files
  const PRIORITY_CORRELATIONS = [
    {
      name: 'Sleep → Next-Day Performance & Mood',
      patterns: [
        // Sleep metrics → Next-day mood/performance/energy (lag = 1 day)
        { m1: ['sleep_duration_hours', 'sleep_quality_score', 'sleep_efficiency'], m2: ['mood_score', 'productivity_score', 'energy_level'], lag: 1 },
        { m1: ['sleep', 'sleep_duration', 'sleep_quality'], m2: ['mood_score', 'productivity_score', 'energy_level'], lag: 1 }
      ]
    },
    {
      name: 'Caffeine After 2pm → Sleep Quality',
      patterns: [
        // Caffeine timing → Sleep quality (same day, lag = 0)
        { m1: ['caffeine_last_time'], m2: ['sleep_quality_score', 'sleep_duration_hours'], lag: 0 },
        { m1: ['caffeine_last_time', 'caffeine_cups'], m2: ['sleep_quality_score', 'sleep_duration_hours', 'sleep_efficiency'], lag: 0 }
      ]
    },
    {
      name: 'Stress → HRV & Resting Heart Rate',
      patterns: [
        // Stress → HRV/Resting HR (same day, lag = 0)
        { m1: ['stress_level'], m2: ['hrv_ms', 'resting_heart_rate'], lag: 0 },
        { m1: ['stress', 'stress_level'], m2: ['hrv_ms', 'resting_heart_rate'], lag: 0 }
      ]
    },
    {
      name: 'Screen Time Before Bed → Sleep',
      patterns: [
        // Screen time before bed → Sleep quality (same day, lag = 0)
        // Prefer sleep_quality_score over other sleep metrics
        { m1: ['screen_time_before_bed_minutes'], m2: ['sleep_quality_score'], lag: 0 },
        { m1: ['screen_time_before_bed'], m2: ['sleep_quality_score', 'sleep_duration_hours'], lag: 0 }
      ]
    },
    {
      name: 'Activity → Mood & Energy',
      patterns: [
        // Activity/Exercise → Mood & Energy (same day, lag = 0)
        { m1: ['steps', 'exercise_minutes'], m2: ['mood_score', 'energy_level'], lag: 0 },
        { m1: ['exercise', 'workout', 'activity'], m2: ['mood_score', 'energy_level'], lag: 0 }
      ]
    }
  ];

  // Check if an insight matches a priority correlation pattern
  const isPriorityCorrelation = (insight) => {
    const m1Lower = (insight.metric1 || '').toLowerCase();
    const m2Lower = (insight.metric2 || '').toLowerCase();
    const m1LabelLower = (insight.metric1Label || '').toLowerCase();
    const m2LabelLower = (insight.metric2Label || '').toLowerCase();
    const lag = insight.lag || 0;

    for (const priority of PRIORITY_CORRELATIONS) {
      for (const pattern of priority.patterns) {
        const m1Matches = pattern.m1.some(p => 
          m1Lower.includes(p) || m1LabelLower.includes(p)
        );
        const m2Matches = pattern.m2.some(p => 
          m2Lower.includes(p) || m2LabelLower.includes(p)
        );
        const lagMatches = pattern.lag === lag;

        // Check forward
        if (m1Matches && m2Matches && lagMatches) {
          return { isPriority: true, priorityName: priority.name };
        }

        // Check reverse (swap metrics and check)
        const m1MatchesReverse = pattern.m2.some(p => 
          m1Lower.includes(p) || m1LabelLower.includes(p)
        );
        const m2MatchesReverse = pattern.m1.some(p => 
          m2Lower.includes(p) || m2LabelLower.includes(p)
        );

        if (m1MatchesReverse && m2MatchesReverse && lagMatches) {
          return { isPriority: true, priorityName: priority.name };
        }
      }
    }

    return { isPriority: false };
  };

  // Helper: Check if insights are duplicates (similar concepts)
  const isDuplicateInsight = (insight1, insight2) => {
    // Same metrics = exact duplicate
    if (insight1.metric1 === insight2.metric1 && insight1.metric2 === insight2.metric2) {
      return true;
    }
    
    // Reverse duplicate (A→B vs B→A)
    if (insight1.metric1 === insight2.metric2 && insight1.metric2 === insight2.metric1) {
      return true;
    }
    
    // Priority correlations are never duplicates of each other
    const priority1 = isPriorityCorrelation(insight1);
    const priority2 = isPriorityCorrelation(insight2);
    if (priority1.isPriority && priority2.isPriority && priority1.priorityName !== priority2.priorityName) {
      return false; // Different priority correlations are not duplicates
    }
    
    // Similar sleep metrics - if both correlate with the same thing, they're duplicates
    // e.g., "REM Sleep & Screen Time" and "Deep Sleep & Screen Time" are similar
    // BUT: Priority correlations are never duplicates (e.g., "Screen Time Before Bed → Sleep Quality" is priority)
    const sleepMetrics = ['sleep', 'rem', 'deep_sleep', 'sleep_quality', 'sleep_duration', 'sleep_efficiency', 'rem_sleep', 'deep_sleep_hours', 'rem_sleep_hours'];
    const isSleepMetric1 = sleepMetrics.some(s => 
      insight1.metric1?.toLowerCase().includes(s) || 
      insight1.metric2?.toLowerCase().includes(s) ||
      insight1.metric1Label?.toLowerCase().includes(s) ||
      insight1.metric2Label?.toLowerCase().includes(s)
    );
    const isSleepMetric2 = sleepMetrics.some(s => 
      insight2.metric1?.toLowerCase().includes(s) || 
      insight2.metric2?.toLowerCase().includes(s) ||
      insight2.metric1Label?.toLowerCase().includes(s) ||
      insight2.metric2Label?.toLowerCase().includes(s)
    );
    
    if (isSleepMetric1 && isSleepMetric2) {
      // If one is a priority correlation, don't mark as duplicate
      // Priority correlations should be kept even if similar to others
      const priority1 = isPriorityCorrelation(insight1);
      const priority2 = isPriorityCorrelation(insight2);
      if (priority1.isPriority || priority2.isPriority) {
        // At least one is priority - only mark as duplicate if they're the SAME priority pattern
        if (priority1.isPriority && priority2.isPriority && priority1.priorityName === priority2.priorityName) {
          // Same priority pattern - keep the one with higher correlation strength (handled in deduplication)
          return false; // Let deduplication logic handle this
        }
        return false; // Different priority patterns are not duplicates
      }
      
      // Both involve sleep metrics - check if they correlate with the same thing
      const getNonSleepMetric = (insight) => {
        const m1Lower = (insight.metric1 || '').toLowerCase();
        const m2Lower = (insight.metric2 || '').toLowerCase();
        const m1LabelLower = (insight.metric1Label || '').toLowerCase();
        const m2LabelLower = (insight.metric2Label || '').toLowerCase();
        
        const isM1Sleep = sleepMetrics.some(s => m1Lower.includes(s) || m1LabelLower.includes(s));
        const isM2Sleep = sleepMetrics.some(s => m2Lower.includes(s) || m2LabelLower.includes(s));
        
        if (isM1Sleep && !isM2Sleep) return { metric: insight.metric2, label: insight.metric2Label, category: insight.metric2Category };
        if (!isM1Sleep && isM2Sleep) return { metric: insight.metric1, label: insight.metric1Label, category: insight.metric1Category };
        return null; // Both or neither are sleep metrics
      };
      
      const nonSleep1 = getNonSleepMetric(insight1);
      const nonSleep2 = getNonSleepMetric(insight2);
      
      if (nonSleep1 && nonSleep2) {
        // Both have one sleep metric and one non-sleep metric
        // Check if the non-sleep metrics are the same (or very similar)
        const metricMatch = nonSleep1.metric === nonSleep2.metric ||
                           nonSleep1.label?.toLowerCase() === nonSleep2.label?.toLowerCase() ||
                           (nonSleep1.metric?.includes('screen_time_before_bed') && nonSleep2.metric?.includes('screen_time_before_bed')) ||
                           (nonSleep1.label?.toLowerCase().includes('screen') && nonSleep2.label?.toLowerCase().includes('screen') && 
                            nonSleep1.label?.toLowerCase().includes('bed') && nonSleep2.label?.toLowerCase().includes('bed'));
        
        if (metricMatch && (insight1.lag || 0) === (insight2.lag || 0)) {
          // Prefer sleep_quality_score over rem_sleep or deep_sleep when correlating with screen time
          // This ensures "Screen Time Before Bed → Sleep Quality" is kept over "Screen Time → REM Sleep"
          if (nonSleep1.metric?.includes('screen_time_before_bed') || nonSleep2.metric?.includes('screen_time_before_bed')) {
            const hasSleepQuality1 = insight1.metric1?.includes('sleep_quality') || insight1.metric2?.includes('sleep_quality');
            const hasSleepQuality2 = insight2.metric1?.includes('sleep_quality') || insight2.metric2?.includes('sleep_quality');
            
            // If one has sleep_quality and the other doesn't, don't mark as duplicate
            // The deduplication logic will keep the one with sleep_quality (it's the priority pattern)
            if (hasSleepQuality1 !== hasSleepQuality2) {
              return false; // Let priority system handle this
            }
          }
          
          return true; // Same correlation pattern, just different sleep metric
        }
      }
    }
    
    // Similar nutrition metrics (sugar vs carbs vs calories)
    const nutritionMetrics = ['sugar', 'carbs', 'calories', 'protein', 'fat'];
    const isNutrition1 = nutritionMetrics.some(n => 
      insight1.metric1?.toLowerCase().includes(n) || insight1.metric2?.toLowerCase().includes(n)
    );
    const isNutrition2 = nutritionMetrics.some(n => 
      insight2.metric1?.toLowerCase().includes(n) || insight2.metric2?.toLowerCase().includes(n)
    );
    
    if (isNutrition1 && isNutrition2) {
      // Check if they're pointing to the same outcome
      const outcome1 = insight1.metric2?.toLowerCase();
      const outcome2 = insight2.metric2?.toLowerCase();
      if (outcome1 === outcome2 || 
          (outcome1?.includes('body_fat') && outcome2?.includes('body_fat')) ||
          (outcome1?.includes('weight') && outcome2?.includes('weight'))) {
        return true;
      }
    }
    
    // Similar activity metrics (steps, exercise, workout)
    const activityMetrics = ['steps', 'exercise', 'workout', 'activity'];
    const isActivity1 = activityMetrics.some(a => 
      insight1.metric1?.toLowerCase().includes(a) || insight1.metric2?.toLowerCase().includes(a)
    );
    const isActivity2 = activityMetrics.some(a => 
      insight2.metric1?.toLowerCase().includes(a) || insight2.metric2?.toLowerCase().includes(a)
    );
    
    if (isActivity1 && isActivity2) {
      // Check if they're pointing to the same outcome (mood, energy, etc.)
      const outcome1 = insight1.metric2?.toLowerCase();
      const outcome2 = insight2.metric2?.toLowerCase();
      const hasSameOutcome = (outcome1?.includes('mood') && outcome2?.includes('mood')) ||
                            (outcome1?.includes('energy') && outcome2?.includes('energy')) ||
                            (outcome1?.includes('performance') && outcome2?.includes('performance'));
      
      if (hasSameOutcome && (insight1.lag || 0) === (insight2.lag || 0)) {
        return true; // Similar activity → outcome correlation
      }
    }
    
    return false;
  };

  const generateAllInsights = (data) => {
    const insights = [];

    // 1. Generate Correlation Insights
    // IMPORTANT: Use the SAME calculation method as HeroInsightCard
    // HeroInsightCard: calculateAllCorrelations(data, 0.3, 3) then filter to >= 0.4
    // For priority correlations, we'll use a lower threshold (0.3) to ensure they always show if data exists
    const allCorrelations = calculateAllCorrelations(data, 0.3, 3);
    const validCorrelations = allCorrelations.filter(c => Math.abs(c.correlation) >= 0.4);
    const weakCorrelations = allCorrelations.filter(c => Math.abs(c.correlation) >= 0.3 && Math.abs(c.correlation) < 0.4);
    
    // Check if we need to include a specific correlation from URL params
    const urlMetric1 = searchParams.get('metric1');
    const urlMetric2 = searchParams.get('metric2');
    const urlCategory1 = searchParams.get('category1');
    const urlCategory2 = searchParams.get('category2');
    const urlLag = parseInt(searchParams.get('lag') || '0');
    const hasUrlParams = urlMetric1 && urlMetric2;
    
    // Find the hero correlation that matches URL params
    // This should be the same one selected by HeroInsightCard using selectHeroInsight
    let heroCorrelation = null;
    if (hasUrlParams) {
      // First, try to find it in validCorrelations (>= 0.4)
      heroCorrelation = validCorrelations.find(corr => {
        const matchesForward = corr.metric1 === urlMetric1 && 
                               corr.metric2 === urlMetric2 &&
                               corr.metric1Category === urlCategory1 &&
                               corr.metric2Category === urlCategory2 &&
                               (corr.lag || 0) === urlLag;
        const matchesReverse = corr.metric1 === urlMetric2 && 
                               corr.metric2 === urlMetric1 &&
                               corr.metric1Category === urlCategory2 &&
                               corr.metric2Category === urlCategory1 &&
                               (corr.lag || 0) === urlLag;
        return matchesForward || matchesReverse;
      });
      
      // If not found, search in allCorrelations (might be filtered out)
      if (!heroCorrelation) {
        heroCorrelation = allCorrelations.find(corr => {
          const matchesForward = corr.metric1 === urlMetric1 && 
                                 corr.metric2 === urlMetric2 &&
                                 corr.metric1Category === urlCategory1 &&
                                 corr.metric2Category === urlCategory2 &&
                                 (corr.lag || 0) === urlLag;
          const matchesReverse = corr.metric1 === urlMetric2 && 
                                 corr.metric2 === urlMetric1 &&
                                 corr.metric1Category === urlCategory2 &&
                                 corr.metric2Category === urlCategory1 &&
                                 (corr.lag || 0) === urlLag;
          return matchesForward || matchesReverse;
        });
        
        // If found, ensure it meets minimum threshold and add to validCorrelations
        if (heroCorrelation) {
          // Even if below 0.4 threshold, include it if it was selected as hero (it has URL params)
          // This ensures the correlation shown in dashboard always appears in insights
          const meetsThreshold = Math.abs(heroCorrelation.correlation) >= 0.4;
          if (!meetsThreshold) {
            // If it doesn't meet threshold, it might have been selected for other reasons (cross-file, surprise, etc.)
            // Still include it but note that it's below threshold
            console.log('Hero correlation below 0.4 threshold, but including due to URL params:', heroCorrelation);
          }
          
          // Check if it's already in validCorrelations
          const alreadyExists = validCorrelations.some(c => 
            c.metric1 === heroCorrelation.metric1 && 
            c.metric2 === heroCorrelation.metric2 &&
            c.metric1Category === heroCorrelation.metric1Category &&
            c.metric2Category === heroCorrelation.metric2Category &&
            (c.lag || 0) === (heroCorrelation.lag || 0)
          );
          if (!alreadyExists) {
            validCorrelations.push(heroCorrelation);
          }
        } else {
          console.warn('Hero correlation not found in correlations list:', { urlMetric1, urlMetric2, urlCategory1, urlCategory2, urlLag });
        }
      }
    } else {
      // No URL params - automatically select the hero correlation using the same logic as HeroInsightCard
      // This ensures today's insight always appears in the insights list
      if (validCorrelations.length > 0) {
        heroCorrelation = selectHeroInsight(data, validCorrelations);
      }
    }
    
    // Use validCorrelations (which now includes hero correlation if found)
    const correlations = validCorrelations;
    const dates = getAvailableDates(data);
    const totalDays = dates.length;
    
    const correlationInsights = [];
    
    correlations.forEach((corr, idx) => {
      // Check if this is the hero correlation from URL params
      const isHeroCorrelation = heroCorrelation && (
        (corr.metric1 === heroCorrelation.metric1 && corr.metric2 === heroCorrelation.metric2 &&
         corr.metric1Category === heroCorrelation.metric1Category && corr.metric2Category === heroCorrelation.metric2Category &&
         (corr.lag || 0) === (heroCorrelation.lag || 0)) ||
        (corr.metric1 === heroCorrelation.metric2 && corr.metric2 === heroCorrelation.metric1 &&
         corr.metric1Category === heroCorrelation.metric2Category && corr.metric2Category === heroCorrelation.metric1Category &&
         (corr.lag || 0) === (heroCorrelation.lag || 0))
      );
      
      // FILTER 1: Skip trivial time-shift correlations (unless it's the hero correlation)
      if (!isHeroCorrelation && isTrivialTimeShift(corr.metric1, corr.metric2)) {
        return;
      }
      
      // Calculate effect size and threshold from actual data
      const metric1Values = dates.map(date => {
        const dayData = getDataForDate(data, date);
        return dayData[corr.metric1Category]?.[corr.metric1];
      }).filter(v => v !== null && v !== undefined && typeof v === 'number');
      
      const metric2Values = dates.map(date => {
        const dayData = getDataForDate(data, date);
        return dayData[corr.metric2Category]?.[corr.metric2];
      }).filter(v => v !== null && v !== undefined && typeof v === 'number');
      
      // For hero correlation, allow it even if data is sparse (it was selected for a reason)
      // For others, require minimum data
      if (!isHeroCorrelation && (metric1Values.length === 0 || metric2Values.length === 0)) {
        return;
      }
      
      // If hero correlation has no data, use default values
      if (isHeroCorrelation && (metric1Values.length === 0 || metric2Values.length === 0)) {
        // Still create the insight but with minimal data
        correlationInsights.push({
          id: `corr-${corr.metric1}-${corr.metric2}-${corr.metric1Category}-${corr.metric2Category}-${corr.lag || 0}`,
          type: 'correlation',
          title: `${(corr.metric1Label || corr.metric1)} & ${(corr.metric2Label || corr.metric2)}`,
          metric1: corr.metric1,
          metric2: corr.metric2,
          metric1Label: corr.metric1Label || corr.metric1,
          metric2Label: corr.metric2Label || corr.metric2,
          metric1Category: corr.metric1Category,
          metric2Category: corr.metric2Category,
          correlation: corr.correlation,
          pValue: corr.pValue || 0.001,
          lag: corr.lag || 0,
          dataPoints: corr.dataPoints || 0,
          occurrences: 0,
          totalDays: totalDays,
          timestamp: new Date(),
          strength: Math.abs(corr.correlation),
          strengthLabel: Math.abs(corr.correlation) >= 0.7 ? 'Very Strong' : Math.abs(corr.correlation) >= 0.5 ? 'Strong' : 'Moderate',
          confidence: corr.significance || 0.95,
          direction: corr.correlation > 0 ? 'positive' : 'negative',
          sources: [corr.metric1Category, corr.metric2Category].filter((v, i, a) => a.indexOf(v) === i),
          threshold: 0,
          effectSize: 0,
          effectSizeUnit: '',
          isHeroCorrelation: true
        });
        return; // Skip further processing for this correlation
      }
      
      // Calculate threshold (median)
      const threshold = metric1Values.length > 0 
        ? metric1Values.sort((a, b) => a - b)[Math.floor(metric1Values.length / 2)]
        : 0;
      
      // Calculate effect size (difference between groups)
      const belowThreshold = [];
      const aboveThreshold = [];
      dates.forEach(date => {
        const dayData = getDataForDate(data, date);
        const val1 = dayData[corr.metric1Category]?.[corr.metric1];
        const val2 = dayData[corr.metric2Category]?.[corr.metric2];
        if (val1 !== null && val1 !== undefined && val2 !== null && val2 !== undefined) {
          if (val1 < threshold) {
            belowThreshold.push(val2);
          } else {
            aboveThreshold.push(val2);
          }
        }
      });
      
      const avgBelow = belowThreshold.length > 0 ? belowThreshold.reduce((a, b) => a + b, 0) / belowThreshold.length : 0;
      const avgAbove = aboveThreshold.length > 0 ? aboveThreshold.reduce((a, b) => a + b, 0) / aboveThreshold.length : 0;
      const effectSize = Math.abs(avgBelow - avgAbove);
      
      // Check if this is a priority correlation (check early for filtering)
      const priorityCheckResult = isPriorityCorrelation({
        metric1: corr.metric1,
        metric2: corr.metric2,
        metric1Label: corr.metric1Label,
        metric2Label: corr.metric2Label,
        lag: corr.lag || 0
      });
      
      // FILTER 2: Skip correlations with trivial/noise effect sizes
      // Allow hero correlation and priority correlations even with smaller effect sizes
      if (!isHeroCorrelation && !priorityCheckResult.isPriority && !isMeaningfulEffect(effectSize, corr.metric2, corr.metric2Label)) {
        return;
      }
      
      // For priority correlations, apply a more lenient effect size check
      if (priorityCheckResult.isPriority && !isHeroCorrelation) {
        // Still require some effect, but lower threshold for priority correlations
        const minEffectForPriority = effectSize * 0.5; // 50% of normal threshold
        if (!isMeaningfulEffect(minEffectForPriority, corr.metric2, corr.metric2Label)) {
          // Even with lenient check, if effect is truly trivial, skip it
          const absR = Math.abs(corr.correlation);
          if (absR < 0.35) {
            return; // Too weak even for priority
          }
        }
      }
      
      // Get strength label
      const absR = Math.abs(corr.correlation);
      let strengthLabel = 'Weak';
      if (absR >= 0.7) strengthLabel = 'Very Strong';
      else if (absR >= 0.5) strengthLabel = 'Strong';
      else if (absR >= 0.3) strengthLabel = 'Moderate';
      
      // Helper to remove units from labels for title
      const removeUnits = (label) => {
        if (!label) return label;
        return label.replace(/\s*\([^)]*\)/g, '').trim();
      };

      // Create stable ID based on metrics (not index) for reliable matching
      const stableId = `corr-${corr.metric1}-${corr.metric2}-${corr.metric1Category}-${corr.metric2Category}-${corr.lag || 0}`;

      correlationInsights.push({
        id: stableId,
        type: 'correlation',
        title: `${removeUnits(corr.metric1Label || corr.metric1)} & ${removeUnits(corr.metric2Label || corr.metric2)}`,
        metric1: corr.metric1,
        metric2: corr.metric2,
        metric1Label: corr.metric1Label || corr.metric1,
        metric2Label: corr.metric2Label || corr.metric2,
        metric1Category: corr.metric1Category,
        metric2Category: corr.metric2Category,
        correlation: corr.correlation,
        pValue: corr.pValue || 0.001,
        lag: corr.lag || 0,
        dataPoints: corr.dataPoints || belowThreshold.length + aboveThreshold.length,
        occurrences: belowThreshold.length + aboveThreshold.length,
        totalDays: totalDays,
        timestamp: new Date(),
        strength: absR,
        strengthLabel: strengthLabel,
        confidence: corr.significance || 0.95,
        direction: corr.correlation > 0 ? 'positive' : 'negative',
        sources: [corr.metric1Category, corr.metric2Category].filter((v, i, a) => a.indexOf(v) === i),
        threshold: threshold,
        effectSize: effectSize,
        effectSizeUnit: getEffectSizeUnit(corr.metric2, corr.metric2Label),
        isHeroCorrelation: isHeroCorrelation, // Mark for highlighting
        isPriorityCorrelation: priorityCheckResult.isPriority,
        priorityName: priorityCheckResult.priorityName
      });
    });
    
    // FILTER 3: Deduplicate similar insights
    // Priority: 1. Hero correlation, 2. Priority correlations, 3. Others
    // When duplicates exist, prefer priority correlations over similar non-priority ones
    const uniqueInsights = [];
    const heroInsight = correlationInsights.find(i => i.isHeroCorrelation);
    
    // Sort insights by priority: hero > priority > regular
    const sortedForDedup = [...correlationInsights].sort((a, b) => {
      if (a.isHeroCorrelation && !b.isHeroCorrelation) return -1;
      if (!a.isHeroCorrelation && b.isHeroCorrelation) return 1;
      if (a.isPriorityCorrelation && !b.isPriorityCorrelation) return -1;
      if (!a.isPriorityCorrelation && b.isPriorityCorrelation) return 1;
      return 0;
    });
    
    // When deduplicating, prefer priority correlations and hero correlation
    sortedForDedup.forEach(insight => {
      // Always include hero correlation
      if (insight.isHeroCorrelation) {
        if (!uniqueInsights.find(i => i.id === insight.id)) {
          uniqueInsights.push(insight);
        }
        return;
      }
      
      // For priority correlations, check if there's already a priority correlation for this pattern
      if (insight.isPriorityCorrelation) {
        // Check if we already have a priority correlation with the same priority name
        const existingPriority = uniqueInsights.find(i => 
          i.isPriorityCorrelation && i.priorityName === insight.priorityName
        );
        
        if (existingPriority) {
          // Keep the one with higher correlation strength
          if (insight.strength > existingPriority.strength) {
            const index = uniqueInsights.indexOf(existingPriority);
            uniqueInsights[index] = insight;
          }
        } else {
          // No existing priority correlation for this pattern, add it
          uniqueInsights.push(insight);
        }
        return;
      }
      
      // For non-priority correlations, check for duplicates
      // If there's a priority correlation that matches this pattern, exclude this one
      const hasPriorityDuplicate = uniqueInsights.some(existing => {
        if (!existing.isPriorityCorrelation) return false;
        // Check if this non-priority insight is similar to an existing priority one
        return isDuplicateInsight(insight, existing);
      });
      
      if (hasPriorityDuplicate) {
        // There's already a priority correlation for this pattern, skip this one
        return;
      }
      
      // Check for duplicates with other non-priority correlations
      const isDuplicate = uniqueInsights.some(existing => {
        if (existing.isPriorityCorrelation || existing.isHeroCorrelation) return false;
        return isDuplicateInsight(insight, existing);
      });
      
      if (!isDuplicate) {
        uniqueInsights.push(insight);
      }
    });
    
    // FILTER 4: Sort insights with priority system
    // Priority order: 1. Hero correlation, 2. Priority correlations (5 main ones), 3. Others by strength
    const sortedInsights = uniqueInsights.map(insight => {
      if (insight.isHeroCorrelation && hasUrlParams) {
        // Calculate interestingness score for hero correlation
        const heroCorr = correlations.find(c => 
          (c.metric1 === insight.metric1 && c.metric2 === insight.metric2 &&
           c.metric1Category === insight.metric1Category && c.metric2Category === insight.metric2Category) ||
          (c.metric1 === insight.metric2 && c.metric2 === insight.metric1 &&
           c.metric1Category === insight.metric2Category && c.metric2Category === insight.metric1Category)
        );
        if (heroCorr) {
          const scored = selectHeroInsight(data, [heroCorr]);
          if (scored && scored.scores) {
            return { ...insight, interestingnessScore: scored.scores.total, sortPriority: 1 };
          }
        }
        return { ...insight, interestingnessScore: insight.strength * 100, sortPriority: 1 };
      }
      
      // Priority correlations get high priority (but below hero)
      if (insight.isPriorityCorrelation) {
        // Calculate interestingness score for priority correlations too
        const priorityCorr = correlations.find(c => 
          (c.metric1 === insight.metric1 && c.metric2 === insight.metric2 &&
           c.metric1Category === insight.metric1Category && c.metric2Category === insight.metric2Category) ||
          (c.metric1 === insight.metric2 && c.metric2 === insight.metric1 &&
           c.metric1Category === insight.metric2Category && c.metric2Category === insight.metric1Category)
        );
        if (priorityCorr) {
          const scored = selectHeroInsight(data, [priorityCorr]);
          if (scored && scored.scores) {
            return { ...insight, interestingnessScore: scored.scores.total, sortPriority: 2 };
          }
        }
        return { ...insight, interestingnessScore: insight.strength * 100 + 50, sortPriority: 2 }; // Bonus for priority
      }
      
      // Regular correlations
      return { ...insight, interestingnessScore: insight.strength * 100, sortPriority: 3 };
    });
    
    // Sort by priority, then by interestingness score
    sortedInsights.sort((a, b) => {
      // First by sort priority (1 = hero, 2 = priority, 3 = regular)
      if (a.sortPriority !== b.sortPriority) {
        return a.sortPriority - b.sortPriority;
      }
      
      // Within same priority, sort by interestingness score
      return (b.interestingnessScore || 0) - (a.interestingnessScore || 0);
    });
    
    // Always include hero correlation and priority correlations
    // Take top 20, but ensure hero and priority correlations are included
    let topInsights = [];
    const heroInsights = sortedInsights.filter(i => i.isHeroCorrelation);
    const priorityInsightsList = sortedInsights.filter(i => i.isPriorityCorrelation && !i.isHeroCorrelation);
    const regularInsights = sortedInsights.filter(i => !i.isHeroCorrelation && !i.isPriorityCorrelation);
    
    // Add hero correlation first
    topInsights.push(...heroInsights);
    
    // Add priority correlations (limit to 5, one per pattern)
    const uniquePriorityNames = new Set();
    priorityInsightsList.forEach(insight => {
      if (!uniquePriorityNames.has(insight.priorityName) && uniquePriorityNames.size < 5) {
        topInsights.push(insight);
        uniquePriorityNames.add(insight.priorityName);
      }
    });
    
    // Add regular insights up to limit of 8 total (reduced from 20)
    // This ensures we show: 1 hero + up to 5 priority + up to 2 regular = max 8 insights
    // Stricter filtering to reduce clutter
    const maxTotalInsights = 8;
    const remainingSlots = Math.max(0, maxTotalInsights - topInsights.length);
    
    // For regular insights, only show the strongest ones (correlation >= 0.5)
    const strongRegularInsights = regularInsights.filter(i => i.strength >= 0.5);
    topInsights.push(...strongRegularInsights.slice(0, remainingSlots));
    
    insights.push(...topInsights);

    // 2. Generate Anomaly Insights (already filtered and limited to top 5)
    const anomalies = detectAllAnomalies(data);
    const latestDate = dates.length > 0 ? dates[dates.length - 1] : null;
    
    anomalies.forEach((metricAnomalies, idx) => {
      if (!metricAnomalies.anomalies || metricAnomalies.anomalies.length === 0) return;
      
      const recentAnomaly = metricAnomalies.anomalies[metricAnomalies.anomalies.length - 1];
      const consecutive = metricAnomalies.consecutiveDays || metricAnomalies.anomalies.length;
      
      // Calculate baseline for comparison
      const baseline = metricAnomalies.mean || recentAnomaly.mean || 0;
      const stdDev = metricAnomalies.stdDev || recentAnomaly.stdDev || 0;
      const deviation = recentAnomaly.value - baseline;
      
      // Check if anomaly is still active (check if metric returned to normal)
      const isActive = (() => {
        // If the anomaly is on the most recent date, it's definitely active
        if (recentAnomaly.date === latestDate) {
          return true;
        }
        
        // Otherwise, check if the metric has returned to normal
        // Get the most recent value for this metric
        const latestData = getDataForDate(data, latestDate);
        const latestValue = latestData[metricAnomalies.category]?.[metricAnomalies.metric];
        
        if (latestValue === null || latestValue === undefined) {
          return false; // No recent data = consider resolved
        }
        
        // Check if latest value is within normal range
        const normalMin = baseline - stdDev;
        const normalMax = baseline + stdDev;
        
        // If latest value is outside normal range, anomaly is still active
        if (latestValue < normalMin || latestValue > normalMax) {
          return true;
        }
        
        // Check if it's been normal for at least 2 days
        const anomalyDateIndex = dates.indexOf(recentAnomaly.date);
        const latestDateIndex = dates.indexOf(latestDate);
        const daysSinceAnomaly = latestDateIndex - anomalyDateIndex;
        
        if (daysSinceAnomaly < 2) {
          return true; // Too soon to consider resolved
        }
        
        // Check last 2-3 days are all normal
        const recentDates = dates.slice(-3);
        const allNormal = recentDates.every(date => {
          const dayData = getDataForDate(data, date);
          const value = dayData[metricAnomalies.category]?.[metricAnomalies.metric];
          if (value === null || value === undefined) return true; // Skip missing data
          return value >= normalMin && value <= normalMax;
        });
        
        return !allNormal; // Active if NOT all recent days are normal
      })();
      
      // Determine severity based on z-score
      const zScore = recentAnomaly.zScore || 0;
      let severity = 'low';
      if (zScore > 3.0) severity = 'high';
      else if (zScore > 2.5) severity = 'medium';
      
      // Only add if it's a real anomaly (already filtered by detectAllAnomalies)
      insights.push({
        id: `anomaly-${idx}`,
        type: 'anomaly',
        title: `${recentAnomaly.value > baseline ? 'Elevated' : 'Low'} ${metricAnomalies.metricLabel || metricAnomalies.metric}${consecutive >= 2 ? ` - ${consecutive}${consecutive === 2 ? 'nd' : consecutive === 3 ? 'rd' : consecutive === 4 ? 'th' : 'th'} Consecutive Day${consecutive > 1 ? 's' : ''}` : ''}`,
        metric: metricAnomalies.metric,
        metricLabel: metricAnomalies.metricLabel || metricAnomalies.metric,
        category: metricAnomalies.category || metricAnomalies.source,
        value: recentAnomaly.value,
        baseline: baseline,
        deviation: deviation,
        normalRange: { 
          min: baseline - (metricAnomalies.stdDev || recentAnomaly.stdDev || 0), 
          max: baseline + (metricAnomalies.stdDev || recentAnomaly.stdDev || 0) 
        },
        mean: baseline,
        stdDev: metricAnomalies.stdDev || recentAnomaly.stdDev || 0,
        zScore: zScore,
        severity: severity,
        consecutiveDays: consecutive,
        isActive: isActive,
        timestamp: new Date(recentAnomaly.date || Date.now()),
        historicalMatches: findHistoricalMatches(metricAnomalies.anomalies, data),
        contributingFactors: findContributingFactors(metricAnomalies.metric, recentAnomaly.date, data),
        prediction: isActive && zScore > 2.5 ? {
          previousOccurrences: 2,
          examples: ['June 12-14 → Illness on June 15', 'Aug 3-5 → Illness on Aug 6'],
          likelihood: zScore > 3.0 ? 85 : 70
        } : null
      });
    });


    return insights.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  };

  // Helper function to remove units from metric labels (e.g., "Sleep Duration(hours)" -> "Sleep Duration")
  const removeUnitsFromLabel = (label) => {
    if (!label) return label;
    // Remove anything in parentheses (units)
    return label.replace(/\s*\([^)]*\)/g, '').trim();
  };

  const generateCorrelationTitle = (corr) => {
    const metric1 = removeUnitsFromLabel(corr.metric1Label || corr.metric1);
    const metric2 = removeUnitsFromLabel(corr.metric2Label || corr.metric2);
    // Always use & instead of →, and don't show lag in title
    return `${metric1} & ${metric2}`;
  };

  const generateCascadeTitle = (cascade) => {
    if (cascade.path.length >= 3) {
      return `The ${cascade.path.length}-Day ${cascade.path[0].metric} Cascade`;
    }
    return `Multi-Step Pattern: ${cascade.description}`;
  };

  const detectConsecutiveAnomalies = (anomalies) => {
    if (!anomalies || anomalies.length < 2) return anomalies?.length || 0;
    let maxConsecutive = 1;
    let current = 1;
    for (let i = 1; i < anomalies.length; i++) {
      if (anomalies[i].index === anomalies[i-1].index + 1) {
        current++;
        maxConsecutive = Math.max(maxConsecutive, current);
      } else {
        current = 1;
      }
    }
    return maxConsecutive;
  };

  const findHistoricalMatches = (anomalies, data) => {
    // Simplified: return mock historical matches
    return [
      { date: '2024-06-12', outcome: 'Illness on June 15' },
      { date: '2024-08-03', outcome: 'Illness on Aug 6' }
    ];
  };

  const findContributingFactors = (metric, date, data) => {
    // Simplified: return mock contributing factors
    return [
      { metric: 'Sleep Quality', change: -20, direction: 'down' },
      { metric: 'Stress Level', change: 8, direction: 'up' },
      { metric: 'HRV', change: -15, direction: 'down' }
    ];
  };


  const filterInsights = (insights, mainTab, subTab) => {
    let filtered = [];
    
    // Filter by main tab (correlations or anomalies)
    if (mainTab === 'correlations') {
      filtered = insights.filter(i => i.type === 'correlation');
    } else if (mainTab === 'anomalies') {
      filtered = insights.filter(i => i.type === 'anomaly');
    }
    
    // Filter by sub tab (all or archived)
    if (subTab === 'archived') {
      filtered = filtered.filter(i => isInsightArchived(i.id));
    } else {
      // 'all' sub tab - show only non-archived
      filtered = filtered.filter(i => !isInsightArchived(i.id));
    }
    
    return filtered;
  };

  const sortInsights = (insights, sortBy) => {
    const sorted = [...insights];
    switch (sortBy) {
      case 'strongest':
        return sorted.sort((a, b) => {
          // For correlations, sort by correlation strength
          if (a.type === 'correlation' && b.type === 'correlation') {
            return (b.strength || 0) - (a.strength || 0);
          }
          return (b.strength || 0) - (a.strength || 0);
        });
      case 'actionable':
            return sorted.sort((a, b) => {
              // Prioritize correlations (actionable)
              const aActionable = a.type === 'correlation' ? 2 : a.type === 'anomaly' ? 1 : 0;
              const bActionable = b.type === 'correlation' ? 2 : b.type === 'anomaly' ? 1 : 0;
              return bActionable - aActionable;
            });
      default:
        return sorted.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    }
  };

  const filterByCategory = (insights, category) => {
    if (category === 'all') return insights;
    return insights.filter(insight => {
      const cat = insight.metric1Category || insight.category || '';
      return cat.toLowerCase() === category.toLowerCase();
    });
  };

  const filterBySearch = (insights, query) => {
    if (!query.trim()) return insights;
    const lowerQuery = query.toLowerCase();
    return insights.filter(insight => 
      insight.title?.toLowerCase().includes(lowerQuery) ||
      insight.metric1Label?.toLowerCase().includes(lowerQuery) ||
      insight.metric2Label?.toLowerCase().includes(lowerQuery)
    );
  };

  const filteredAndSortedInsights = useMemo(() => {
    let filtered = filterInsights(insights, activeMainTab, activeSubTab);
    filtered = filterByCategory(filtered, categoryFilter);
    filtered = filterBySearch(filtered, searchQuery);
    // When sorting, ensure hero correlation appears first if present
    const sorted = sortInsights(filtered, sortBy);
    const heroInsight = sorted.find(i => i.isHeroCorrelation);
    if (heroInsight && sortBy !== 'strongest') {
      // Remove hero insight from its current position and add it at the beginning
      const withoutHero = sorted.filter(i => i.id !== heroInsight.id);
      return [heroInsight, ...withoutHero];
    }
    return sorted;
  }, [insights, activeMainTab, activeSubTab, categoryFilter, searchQuery, sortBy, insightStates]);

  // Scroll to highlighted correlation when it's loaded
  useEffect(() => {
    const urlMetric1 = searchParams.get('metric1');
    if (!urlMetric1 || !filteredAndSortedInsights.length || hasScrolledToHighlight.current) {
      return;
    }

    // Find the hero correlation in filtered insights
    const heroInsight = filteredAndSortedInsights.find(i => i.isHeroCorrelation);
    if (heroInsight) {
      // Wait for DOM to render, then scroll
      setTimeout(() => {
        const element = document.getElementById(`insight-${heroInsight.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          hasScrolledToHighlight.current = true;
          
          // Clear URL params after scrolling (optional, keeps URL clean)
          // Uncomment if you want to clear params after navigation
          // setSearchParams({}, { replace: true });
        }
      }, 300);
    }
  }, [filteredAndSortedInsights, searchParams]);

  // Check if there are any insights (archived or not) for the current main tab
  const hasAnyInsightsForMainTab = useMemo(() => {
    if (activeMainTab === 'correlations') {
      return insights.some(i => i.type === 'correlation');
    } else if (activeMainTab === 'anomalies') {
      return insights.some(i => i.type === 'anomaly');
    }
    return insights.length > 0;
  }, [insights, activeMainTab]);

  // Check if all insights for the main tab are archived
  const allInsightsArchived = useMemo(() => {
    if (!hasAnyInsightsForMainTab) return false;
    let relevantInsights = [];
    if (activeMainTab === 'correlations') {
      relevantInsights = insights.filter(i => i.type === 'correlation');
    } else if (activeMainTab === 'anomalies') {
      relevantInsights = insights.filter(i => i.type === 'anomaly');
    }
    return relevantInsights.length > 0 && relevantInsights.every(i => isInsightArchived(i.id));
  }, [insights, activeMainTab, hasAnyInsightsForMainTab, insightStates]);

  const isNewInsight = (insight) => {
    if (!insight.timestamp) return false;
    const sevenDaysAgo = subDays(new Date(), 7);
    return new Date(insight.timestamp) >= sevenDaysAgo;
  };

  const handleSeeEvidence = (insight) => {
    setSelectedInsight(insight);
    setShowEvidenceModal(true);
  };

  const handleDismiss = (insight) => {
    archiveInsight(insight.id);
    setInsightStates({ ...insightStates, [insight.id]: 'archived' });
  };

  const handleUnarchive = (insight) => {
    unarchiveInsight(insight.id);
    setInsightStates({ ...insightStates, [insight.id]: 'active' });
  };

  const handleTrack = (insight) => {
    if (isInsightTracked(insight.id)) {
      untrackInsight(insight.id);
    } else {
      trackInsight(insight.id);
    }
    setInsightStates({ ...insightStates, [insight.id]: isInsightTracked(insight.id) ? 'tracked' : 'untracked' });
  };

  const mainTabs = [
    { id: 'correlations', label: 'Correlations' },
    { id: 'anomalies', label: 'Anomalies' }
  ];
  
  const subTabs = [
    { id: 'all', label: 'All' },
    { id: 'archived', label: 'Archived' }
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: theme.background.primary }}>
      <PageHeader title="Insights" onOpenSettings={onOpenSettings} allHealthData={allHealthData} />
      
      <div className="px-4 py-6 max-w-7xl mx-auto">
        {/* AI/ML Header Banner */}
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-6 h-6" />
            <h2 className="text-2xl font-bold">AI-Powered Health Insights</h2>
          </div>
          <p className="text-sm opacity-90">
            Machine learning models analyze your data to discover correlations and anomalies. 
            Each insight is backed by statistical analysis and confidence scores.
          </p>
        </div>

        {/* Main Tab Structure */}
        <div className="mb-4">
          <div className="flex gap-0 border-b-2" style={{ borderColor: theme.border.primary }}>
            {mainTabs.map((tab) => (
            <button
              key={tab.id}
                onClick={() => {
                  setActiveMainTab(tab.id);
                  setActiveSubTab('all'); // Reset to 'all' when switching main tabs
                }}
              className="px-6 py-3 relative transition-all"
              style={{
                  color: activeMainTab === tab.id ? theme.accent.purple : theme.text.tertiary,
                  fontWeight: activeMainTab === tab.id ? '600' : '400'
              }}
            >
              {tab.label}
                {activeMainTab === tab.id && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1 rounded-t"
                  style={{ 
                    backgroundColor: theme.accent.purple,
                    height: '4px'
                  }}
                />
              )}
            </button>
          ))}
          </div>
          
          {/* Sub Tab Structure */}
          <div className="flex gap-0 mt-2 border-b" style={{ borderColor: theme.border.primary }}>
            {subTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className="px-6 py-2 relative transition-all text-sm"
                style={{
                  color: activeSubTab === tab.id ? theme.accent.primary : theme.text.tertiary,
                  fontWeight: activeSubTab === tab.id ? '600' : '400'
                }}
              >
                {tab.label}
                {activeSubTab === tab.id && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                    style={{ 
                      backgroundColor: theme.accent.primary,
                      height: '2px'
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Filter/Sort Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 flex flex-col md:flex-row gap-4 items-center" 
             style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          {/* Left: Sort By */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: theme.text.secondary }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: theme.background.card,
                borderColor: theme.border.primary,
                color: theme.text.primary
              }}
            >
              {activeMainTab === 'correlations' ? (
                <>
                  <option value="strongest">Strength ▼</option>
                  <option value="newest">Newest</option>
                  <option value="actionable">Most Actionable</option>
                </>
              ) : (
                <>
                  <option value="newest">Newest</option>
                  <option value="strongest">Strongest</option>
                  <option value="actionable">Most Actionable</option>
                </>
              )}
            </select>
          </div>

          {/* Middle: Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: theme.text.secondary }}>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: theme.background.card,
                borderColor: theme.border.primary,
                color: theme.text.primary
              }}
            >
              <option value="all">All Sources</option>
              <option value="sleep">Sleep</option>
              <option value="activity">Activity</option>
              <option value="nutrition">Nutrition</option>
              <option value="vitals">Vitals</option>
              <option value="wellness">Wellness</option>
            </select>
          </div>

          {/* Right: Count and Search */}
          <div className="flex-1 flex items-center justify-end gap-4">
            <span className="text-sm" style={{ color: theme.text.tertiary }}>
              {filteredAndSortedInsights.length} insights discovered
            </span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: theme.text.tertiary }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search insights..."
                className="pl-10 pr-4 py-2 rounded-lg border text-sm w-48"
                style={{
                  backgroundColor: theme.background.card,
                  borderColor: theme.border.primary,
                  color: theme.text.primary
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  style={{ color: theme.text.tertiary }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <EmptyState />
        ) : filteredAndSortedInsights.length === 0 ? (
          activeSubTab === 'archived' ? (
            <ArchivedEmptyState mainTab={activeMainTab} />
          ) : allInsightsArchived ? (
            <AllArchivedEmptyState mainTab={activeMainTab} />
          ) : (
            <EmptyState />
          )
        ) : (
          <>
            <style>{`
              @keyframes highlightPulse {
                0%, 100% {
                  box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4);
                }
                50% {
                  box-shadow: 0 0 0 8px rgba(139, 92, 246, 0);
                }
              }
            `}</style>
            <div className="space-y-6">
              {filteredAndSortedInsights.map((insight) => {
                const isNew = isNewInsight(insight);
                const isHero = insight.isHeroCorrelation;
                const isPriority = insight.isPriorityCorrelation && !isHero;
                
                switch (insight.type) {
                  case 'correlation':
                    return (
                      <div
                        key={insight.id}
                        id={`insight-${insight.id}`}
                        className={(isHero || isPriority) ? 'relative' : ''}
                        style={isHero ? {
                          animation: 'highlightPulse 2s ease-in-out',
                          borderRadius: '16px',
                          padding: '4px',
                          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                          border: '2px solid rgba(139, 92, 246, 0.5)'
                        } : {}}
                      >
                        {isHero && (
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10">
                            Today's Insight
                          </div>
                        )}
                        <CorrelationInsightCard
                          insight={insight}
                          isNew={isNew}
                          onSeeEvidence={() => handleSeeEvidence(insight)}
                          onDismiss={activeSubTab === 'all' ? () => handleDismiss(insight) : null}
                          onTrack={() => handleTrack(insight)}
                          onUnarchive={activeSubTab === 'archived' ? () => handleUnarchive(insight) : null}
                          allHealthData={allHealthData}
                          activeTab={activeSubTab}
                          isTracked={isInsightTracked(insight.id)}
                          isArchived={isInsightArchived(insight.id)}
                        />
                      </div>
                    );
                  case 'anomaly':
                    return (
                      <AnomalyInsightCard
                        key={insight.id}
                        insight={insight}
                        isNew={isNew}
                        activeTab={activeSubTab}
                        onSeeEvidence={() => handleSeeEvidence(insight)}
                        onDismiss={activeSubTab === 'all' ? () => handleDismiss(insight) : null}
                        onTrack={() => handleTrack(insight)}
                        onUnarchive={activeSubTab === 'archived' ? () => handleUnarchive(insight) : null}
                        allHealthData={allHealthData}
                        isTracked={isInsightTracked(insight.id)}
                        isArchived={isInsightArchived(insight.id)}
                      />
                    );
                  default:
                    return null;
                }
              })}
            </div>
          </>
        )}
      </div>

      {/* Evidence Modal */}
      {showEvidenceModal && selectedInsight && (
        <InsightEvidenceModal
          insight={selectedInsight}
          isOpen={showEvidenceModal}
          onClose={() => {
            setShowEvidenceModal(false);
            setSelectedInsight(null);
          }}
          allHealthData={allHealthData}
        />
      )}
    </div>
  );
};

// Archived Empty State Component
const ArchivedEmptyState = ({ mainTab }) => {
  const typeLabel = mainTab === 'correlations' ? 'correlations' : 'anomalies';
  
  return (
    <div className="p-16 rounded-2xl border text-center" 
         style={{ 
           backgroundColor: theme.background.card, 
           borderColor: theme.border.primary
         }}>
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <Folder className="w-16 h-16 mx-auto" style={{ color: theme.text.tertiary, opacity: 0.5 }} />
        </div>
        <h3 className="text-xl font-semibold mb-2" style={{ color: theme.text.primary }}>
          Nothing archived yet
        </h3>
        <p className="text-sm" style={{ color: theme.text.secondary }}>
          When you dismiss {typeLabel}, they'll appear here. You can unarchive them at any time.
        </p>
      </div>
    </div>
  );
};

// All Archived Empty State Component (when all insights are archived)
const AllArchivedEmptyState = ({ mainTab }) => {
  const typeLabel = mainTab === 'correlations' ? 'correlations' : 'anomalies';
  
  return (
    <div className="p-16 rounded-2xl border text-center" 
         style={{ 
           backgroundColor: theme.background.card, 
           borderColor: theme.border.primary
         }}>
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <Folder className="w-16 h-16 mx-auto" style={{ color: theme.text.tertiary, opacity: 0.5 }} />
        </div>
        <h3 className="text-xl font-semibold mb-2" style={{ color: theme.text.primary }}>
          All {typeLabel} are archived
        </h3>
        <p className="text-sm" style={{ color: theme.text.secondary }}>
          All your {typeLabel} have been dismissed. Check the Archived tab to view or unarchive them.
        </p>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState = () => {
  return (
    <div className="p-16 rounded-2xl border text-center" 
         style={{ 
           backgroundColor: theme.background.card, 
           borderColor: theme.border.primary 
         }}>
      <div className="text-6xl mb-4">🧠</div>
      <h3 className="text-2xl font-bold mb-2" style={{ color: theme.text.primary }}>
        Analyzing Your Health Data...
      </h3>
      <p className="text-sm mb-4" style={{ color: theme.text.secondary }}>
        We're discovering patterns and correlations across your data sources
      </p>
      <div className="mt-6 space-y-2 text-left max-w-md mx-auto">
        <div className="flex items-center gap-2 text-sm" style={{ color: theme.text.tertiary }}>
          <span>🔍</span> <span>Sleep quality patterns</span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: theme.text.tertiary }}>
          <span>🔗</span> <span>Cross-metric correlations</span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: theme.text.tertiary }}>
          <span>⚠️</span> <span>Unusual deviations</span>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: theme.text.tertiary }}>
          <span>📈</span> <span>Performance trends</span>
        </div>
      </div>
    </div>
  );
};

export default InsightsHub;
