// Metrics Tab - Individual metric pages with category navigation
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, Download, BarChart3, Trophy, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import TabNavigation, { PageHeader } from '../components/TabNavigation';
import ExportDataModal from '../components/modals/ExportDataModal';
import CorrelationExplanationModal from '../components/modals/CorrelationExplanationModal';
import { getAvailableDates, getDataForDate, formatMetricLabel, getMetricUnit } from '../utils/dataLoader';
import { calculateAllCorrelations } from '../utils/correlationAnalysis';
import { format } from 'date-fns';

const theme = {
  background: { primary: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #fef3c7 100%)', card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155' },
  accent: { primary: '#0ea5e9' }
};

const metricCategories = {
  sleep: ['Sleep Duration', 'Sleep Quality', 'Deep Sleep', 'REM Sleep', 'Sleep Efficiency', 'Awakenings', 'Deep Sleep %', 'REM Sleep %', 'Bedtime', 'Wake Time'],
  activity: ['Steps', 'Active Minutes', 'Exercise Minutes', 'Calories Burned', 'Distance', 'Avg Heart Rate', 'Max Heart Rate', 'VO2 Max', 'Workout Performance Rating', 'Floors Climbed'],
  nutrition: ['Calories', 'Protein', 'Carbs', 'Fats', 'Fiber', 'Sugar', 'Caffeine Cups', 'Caffeine Last Time', 'Meals Count'],
  'heart-health': ['Resting Heart Rate', 'HRV', 'Blood Pressure', 'Blood Pressure Diastolic'],
  'body-metrics': ['Weight', 'Body Fat', 'Muscle Mass', 'Body Temperature', 'Oxygen Saturation'],
  wellness: ['Energy Level', 'Mood Score', 'Stress Level', 'Anxiety Level', 'Productivity', 'Meditation', 'Outdoor Time', 'Screen Time', 'Screen Time Before Bed', 'Social Interactions', 'Alcohol Units']
};

const MetricsTab = ({ allHealthData, onOpenSettings }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'sleep');
  const [selectedMetric, setSelectedMetric] = useState(searchParams.get('metric') || 'Sleep Duration');
  const [timeRange, setTimeRange] = useState('30D');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCorrelationExplanation, setShowCorrelationExplanation] = useState(false);
  const [selectedCorrelation, setSelectedCorrelation] = useState(null);
  const [metricData, setMetricData] = useState(null);
  const [correlations, setCorrelations] = useState([]);
  const [personalBest, setPersonalBest] = useState(null);
  const [personalWorst, setPersonalWorst] = useState(null);

  useEffect(() => {
    if (allHealthData && selectedMetric) {
      loadMetricData();
    }
  }, [allHealthData, selectedMetric, timeRange]);

  const loadMetricData = () => {
    if (!allHealthData) return;

    const dates = getAvailableDates(allHealthData);
    const days = timeRange === '7D' ? 7 : timeRange === '30D' ? 30 : timeRange === '90D' ? 90 : dates.length;
    const recentDates = dates.slice(-days);

    const data = recentDates.map(date => {
      const dayData = getDataForDate(allHealthData, date);
      let value = null;

      // Helper function to convert metric name to field name
      const metricNameToField = (metricName) => {
        // First try exact match
        const exactMap = {
          'Sleep Duration': 'sleep_duration_hours',
          'Sleep Quality': 'sleep_quality_score',
          'Deep Sleep': 'deep_sleep_hours',
          'REM Sleep': 'rem_sleep_hours',
          'Sleep Efficiency': 'sleep_efficiency',
          'Awakenings': 'awakenings',
          'Deep Sleep %': 'deep_sleep_percent',
          'REM Sleep %': 'rem_sleep_percent',
          'Steps': 'steps',
          'Active Minutes': 'active_minutes',
          'Exercise Minutes': 'exercise_minutes',
          'Calories Burned': 'calories_burned',
          'Distance': 'distance_km',
          'Avg Heart Rate': 'avg_heart_rate',
          'Max Heart Rate': 'max_heart_rate',
          'VO2 Max': 'vo2_max',
          'Calories': 'calories',
          'Protein': 'protein_g',
          'Carbs': 'carbs_g',
          'Fats': 'fats_g',
          'Fiber': 'fiber_g',
          'Sugar': 'sugar_g',
          'Caffeine Cups': 'caffeine_cups',
          'Caffeine Last Time': 'caffeine_last_time',
          'Meals Count': 'meals_count',
          'Resting Heart Rate': 'resting_heart_rate',
          'HRV': 'hrv_ms',
          'Blood Pressure': 'blood_pressure_systolic',
          'Blood Pressure Diastolic': 'blood_pressure_diastolic',
          'Weight': 'weight_kg',
          'Body Fat': 'body_fat_percent',
          'Muscle Mass': 'muscle_mass_kg',
          'Body Temperature': 'body_temperature_c',
          'Oxygen Saturation': 'oxygen_saturation',
          'Energy Level': 'energy_level',
          'Mood Score': 'mood_score',
          'Stress Level': 'stress_level',
          'Anxiety Level': 'anxiety_level',
          'Productivity': 'productivity_score',
          'Meditation': 'meditation_minutes',
          'Outdoor Time': 'outdoor_time_hours',
          'Screen Time': 'screen_time_hours',
          'Screen Time Before Bed': 'screen_time_before_bed_minutes',
          'Workout Performance Rating': 'workout_performance_rating',
          'Social Interactions': 'social_interactions',
          'Alcohol Units': 'alcohol_units',
          'Bedtime': 'bedtime',
          'Wake Time': 'wake_time',
          'Floors Climbed': 'floors_climbed'
        };
        
        if (exactMap[metricName]) {
          return exactMap[metricName];
        }
        
        // Try converting display name to field name (e.g., "Wake Time" -> "wake_time")
        const fieldName = metricName.toLowerCase().replace(/\s+/g, '_');
        return fieldName;
      };

      // Map metric names to data fields
      const metricMap = {
        // Sleep metrics
        'Sleep Duration': dayData.sleep?.sleep_duration_hours,
        'Sleep Quality': dayData.sleep?.sleep_quality_score,
        'Deep Sleep': dayData.sleep?.deep_sleep_hours,
        'REM Sleep': dayData.sleep?.rem_sleep_hours,
        'Sleep Efficiency': dayData.sleep?.sleep_efficiency,
        'Awakenings': dayData.sleep?.awakenings,
        'Deep Sleep %': dayData.sleep?.deep_sleep_percent,
        'REM Sleep %': dayData.sleep?.rem_sleep_percent,
        'Bedtime': dayData.sleep?.bedtime,
        'Wake Time': dayData.sleep?.wake_time,
        // Activity metrics
        'Steps': dayData.activity?.steps,
        'Active Minutes': dayData.activity?.active_minutes,
        'Exercise Minutes': dayData.activity?.exercise_minutes,
        'Calories Burned': dayData.activity?.calories_burned,
        'Distance': dayData.activity?.distance_km,
        'Avg Heart Rate': dayData.activity?.avg_heart_rate,
        'Max Heart Rate': dayData.activity?.max_heart_rate,
        'VO2 Max': dayData.activity?.vo2_max,
        'Workout Performance Rating': dayData.activity?.workout_performance_rating || dayData.wellness?.workout_performance_rating,
        'Floors Climbed': dayData.activity?.floors_climbed,
        // Nutrition metrics
        'Calories': dayData.nutrition?.calories,
        'Protein': dayData.nutrition?.protein_g,
        'Carbs': dayData.nutrition?.carbs_g,
        'Fats': dayData.nutrition?.fats_g,
        'Fiber': dayData.nutrition?.fiber_g,
        'Sugar': dayData.nutrition?.sugar_g,
        'Caffeine Cups': dayData.nutrition?.caffeine_cups,
        'Caffeine Last Time': dayData.nutrition?.caffeine_last_time,
        'Meals Count': dayData.nutrition?.meals_count,
        // Heart Health metrics
        'Resting Heart Rate': dayData.vitals?.resting_heart_rate || dayData.sleep?.resting_heart_rate,
        'HRV': dayData.vitals?.hrv_ms || dayData.sleep?.hrv_ms,
        'Blood Pressure': dayData.vitals?.blood_pressure_systolic ? 
          dayData.vitals.blood_pressure_systolic : null,
        'Blood Pressure Diastolic': dayData.vitals?.blood_pressure_diastolic,
        // Body Metrics
        'Weight': dayData.vitals?.weight_kg,
        'Body Fat': dayData.vitals?.body_fat_percent,
        'Muscle Mass': dayData.vitals?.muscle_mass_kg,
        'Body Temperature': dayData.vitals?.body_temperature_c,
        'Oxygen Saturation': dayData.vitals?.oxygen_saturation,
        // Wellness metrics
        'Energy Level': dayData.wellness?.energy_level,
        'Mood Score': dayData.wellness?.mood_score,
        'Stress Level': dayData.wellness?.stress_level,
        'Anxiety Level': dayData.wellness?.anxiety_level,
        'Productivity': dayData.wellness?.productivity_score,
        'Meditation': dayData.wellness?.meditation_minutes,
        'Outdoor Time': dayData.wellness?.outdoor_time_hours,
        'Screen Time': dayData.wellness?.screen_time_hours,
        'Screen Time Before Bed': dayData.wellness?.screen_time_before_bed_minutes,
        'Social Interactions': dayData.wellness?.social_interactions,
        'Alcohol Units': dayData.wellness?.alcohol_units
      };

      value = metricMap[selectedMetric];
      
      // If not found in map, try dynamic lookup
      if (value === undefined) {
        const fieldName = metricNameToField(selectedMetric);
        
        // Search through all data sources
        const sources = [
          { data: dayData.sleep, name: 'sleep' },
          { data: dayData.activity, name: 'activity' },
          { data: dayData.nutrition, name: 'nutrition' },
          { data: dayData.vitals, name: 'vitals' },
          { data: dayData.wellness, name: 'wellness' }
        ];
        
        for (const source of sources) {
          if (source.data && source.data[fieldName] !== undefined) {
            value = source.data[fieldName];
            break;
          }
        }
        
      }
      
      // Convert to number if it's not null/undefined
      if (value !== null && value !== undefined) {
        const numValue = typeof value === 'number' ? value : parseFloat(value);
        value = !isNaN(numValue) && isFinite(numValue) ? numValue : null;
      } else {
        value = null;
      }

      // Parse date string as local date to avoid timezone issues
      // Date strings like "2025-11-09" should be treated as local dates, not UTC
      const parseLocalDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      };
      
      return {
        date: format(parseLocalDate(date), 'MMM dd'),
        fullDate: date,
        value: value
      };
    });
    
    // Keep all data points for chart, but filter nulls for statistics
    const dataWithValues = data.filter(d => d.value !== null && !isNaN(d.value));

    const values = dataWithValues.map(d => d.value);
    
    // Handle empty data case
    if (values.length === 0) {
      setMetricData({
        chartData: data,
        current: null,
        average: null,
        median: null,
        min: null,
        max: null,
        consistency: 0
      });
      setCorrelations([]);
      return;
    }
    
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];

    // Calculate normal range (1 standard deviation from mean)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const normalMin = avg - stdDev;
    const normalMax = avg + stdDev;

    // Find personal best and worst
    const bestDataPoint = dataWithValues.reduce((best, current) => 
      current.value > (best?.value || -Infinity) ? current : best, null
    );
    const worstDataPoint = dataWithValues.reduce((worst, current) => 
      current.value < (worst?.value || Infinity) ? current : worst, null
    );

    setPersonalBest(bestDataPoint);
    setPersonalWorst(worstDataPoint);

    // Add normal range to each data point
    const chartDataWithRange = data.map(d => ({
      ...d,
      normalMin: isFinite(normalMin) ? normalMin : null,
      normalMax: isFinite(normalMax) ? normalMax : null
    }));

    setMetricData({
      chartData: chartDataWithRange, // Keep all data points including nulls for chart
      current: dataWithValues.length > 0 ? dataWithValues[dataWithValues.length - 1]?.value : null,
      average: isNaN(avg) ? null : avg,
      median: isNaN(median) ? null : median,
      min: isFinite(min) ? min : null,
      max: isFinite(max) ? max : null,
      normalMin: isFinite(normalMin) ? normalMin : null,
      normalMax: isFinite(normalMax) ? normalMax : null,
      consistency: calculateConsistency(values)
    });

    // Load correlations for this specific metric
    const metricFieldMap = {
      // Sleep metrics
      'Sleep Duration': 'sleep_duration_hours',
      'Sleep Quality': 'sleep_quality_score',
      'Deep Sleep': 'deep_sleep_hours',
      'REM Sleep': 'rem_sleep_hours',
      'Sleep Efficiency': 'sleep_efficiency',
      'Awakenings': 'awakenings',
      'Deep Sleep %': 'deep_sleep_percent',
      'REM Sleep %': 'rem_sleep_percent',
      // Activity metrics
      'Steps': 'steps',
      'Active Minutes': 'active_minutes',
      'Exercise Minutes': 'exercise_minutes',
      'Calories Burned': 'calories_burned',
      'Distance': 'distance_km',
      'Avg Heart Rate': 'avg_heart_rate',
      'Max Heart Rate': 'max_heart_rate',
      'VO2 Max': 'vo2_max',
      // Nutrition metrics
      'Calories': 'calories',
      'Protein': 'protein_g',
      'Carbs': 'carbs_g',
      'Fats': 'fats_g',
      'Fiber': 'fiber_g',
      'Sugar': 'sugar_g',
      'Caffeine Cups': 'caffeine_cups',
      'Caffeine Last Time': 'caffeine_last_time',
      'Meals Count': 'meals_count',
      // Heart Health metrics
      'Resting Heart Rate': 'resting_heart_rate',
      'HRV': 'hrv_ms',
      'Blood Pressure': 'blood_pressure_systolic',
      'Blood Pressure Diastolic': 'blood_pressure_diastolic',
      // Body Metrics
      'Weight': 'weight_kg',
      'Body Fat': 'body_fat_percent',
      'Muscle Mass': 'muscle_mass_kg',
      'Body Temperature': 'body_temperature_c',
      'Oxygen Saturation': 'oxygen_saturation',
      // Wellness metrics
      'Energy Level': 'energy_level',
      'Mood Score': 'mood_score',
      'Stress Level': 'stress_level',
      'Anxiety Level': 'anxiety_level',
      'Productivity': 'productivity_score',
      'Meditation': 'meditation_minutes',
      'Outdoor Time': 'outdoor_time_hours',
      'Screen Time': 'screen_time_hours',
      'Screen Time Before Bed': 'screen_time_before_bed_minutes',
      'Workout Performance Rating': 'workout_performance_rating',
      'Social Interactions': 'social_interactions',
      'Alcohol Units': 'alcohol_units',
      'Bedtime': 'bedtime',
      'Wake Time': 'wake_time',
      'Floors Climbed': 'floors_climbed'
    };

    // Helper to convert display name to field name
    const displayNameToField = (displayName) => {
      if (metricFieldMap[displayName]) {
        return metricFieldMap[displayName];
      }
      // Try converting display name to field name
      return displayName.toLowerCase().replace(/\s+/g, '_');
    };

    const metricFieldName = displayNameToField(selectedMetric);
    
    // Get the category of the selected metric
    const getMetricCategory = (metricName) => {
      const metricFieldMap = {
        // Sleep metrics
        'sleep_duration_hours': 'sleep',
        'sleep_quality_score': 'sleep',
        'deep_sleep_hours': 'sleep',
        'rem_sleep_hours': 'sleep',
        'sleep_efficiency': 'sleep',
        'awakenings': 'sleep',
        'deep_sleep_percent': 'sleep',
        'rem_sleep_percent': 'sleep',
        // Activity metrics
        'steps': 'activity',
        'active_minutes': 'activity',
        'exercise_minutes': 'activity',
        'calories_burned': 'activity',
        'distance_km': 'activity',
        'avg_heart_rate': 'activity',
        'max_heart_rate': 'activity',
        'vo2_max': 'activity',
        'workout_performance_rating': 'activity',
        'floors_climbed': 'activity',
        // Nutrition metrics
        'calories': 'nutrition',
        'protein_g': 'nutrition',
        'carbs_g': 'nutrition',
        'fats_g': 'nutrition',
        'fiber_g': 'nutrition',
        'sugar_g': 'nutrition',
        'caffeine_cups': 'nutrition',
        'caffeine_last_time': 'nutrition',
        'meals_count': 'nutrition',
        // Vitals metrics
        'resting_heart_rate': 'vitals',
        'hrv_ms': 'vitals',
        'blood_pressure_systolic': 'vitals',
        'blood_pressure_diastolic': 'vitals',
        'weight_kg': 'vitals',
        'body_fat_percent': 'vitals',
        'muscle_mass_kg': 'vitals',
        'body_temperature_c': 'vitals',
        'oxygen_saturation': 'vitals',
        // Wellness metrics
        'energy_level': 'wellness',
        'mood_score': 'wellness',
        'stress_level': 'wellness',
        'anxiety_level': 'wellness',
        'productivity_score': 'wellness',
        'meditation_minutes': 'wellness',
        'outdoor_time_hours': 'wellness',
        'screen_time_hours': 'wellness',
        'screen_time_before_bed_minutes': 'wellness',
        'social_interactions': 'wellness',
        'alcohol_units': 'wellness',
        'bedtime': 'wellness',
        'wake_time': 'wellness'
      };
      return metricFieldMap[metricName] || null;
    };
    
    const selectedMetricCategory = getMetricCategory(metricFieldName);
    
    const allCorrs = calculateAllCorrelations(allHealthData, 0.3, 3);
    
    // Filter correlations where this metric is metric1 (what this metric affects)
    // AND exclude same-category correlations (e.g., sleep -> sleep is meaningless)
    const relevantCorrs = allCorrs.filter(corr => {
      // Check multiple ways the metric might be identified
      const metric1Field = corr.metric1;
      const metric1Label = corr.metric1Label || formatMetricLabel(corr.metric1);
      
      const matchesMetric = metric1Field === metricFieldName || 
             metric1Label === selectedMetric ||
             metric1Label.toLowerCase().replace(/\s+/g, '_') === metricFieldName ||
             corr.metric1 === metricFieldName;
      
      if (!matchesMetric) return false;
      
      // Exclude same-category correlations
      const metric2Category = corr.metric2Category;
      if (selectedMetricCategory && metric2Category && selectedMetricCategory === metric2Category) {
        return false; // Skip same-category correlations
      }
      
      return true;
    });
    
    // Sort by correlation strength and take top 5
    const sortedCorrs = relevantCorrs
      .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
      .slice(0, 5);
    
    setCorrelations(sortedCorrs);
  };

  const calculateConsistency = (values) => {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100; // Coefficient of variation
    return Math.max(0, 100 - cv * 10); // Convert to 0-100 score
  };

  const getTrend = () => {
    if (!metricData || metricData.chartData.length < 2) return 'stable';
    const recent = metricData.chartData.slice(-7);
    const older = metricData.chartData.slice(-14, -7);
    if (recent.length === 0 || older.length === 0) return 'stable';
    const recentAvg = recent.reduce((a, b) => a + b.value, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b.value, 0) / older.length;
    const diff = (recentAvg - olderAvg) / olderAvg;
    return diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : 'stable';
  };

  if (!allHealthData) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Individual metric view (always show a metric, default to Sleep Duration)
  const TrendIcon = getTrend() === 'up' ? TrendingUp : getTrend() === 'down' ? TrendingDown : Minus;

  const handleExport = (exportData) => {
    if (exportData.format === 'csv') {
      const csv = [
        ['Date', selectedMetric],
        ...exportData.data.map(d => [
          d.fullDate,
          d.value !== null ? d.value : ''
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedMetric.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    } else {
      // PDF export would require a library like jsPDF
      alert('PDF export coming soon!');
    }
  };


  return (
    <div className="min-h-screen pb-20" style={{ background: theme.background.primary }}>
      <PageHeader title={selectedMetric} onOpenSettings={onOpenSettings} allHealthData={allHealthData} />
      
      <div className="flex gap-4 px-4 py-6 max-w-7xl mx-auto">
        {/* Left Sidebar - Category List */}
        <div className="hidden md:block w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-lg p-4 sticky top-4" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text.secondary }}>Categories</h3>
            <div className="space-y-1">
              {Object.keys(metricCategories).map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    // When switching categories, select the first metric in that category
                    const firstMetric = metricCategories[category]?.[0];
                    if (firstMetric) {
                      setSelectedMetric(firstMetric);
                    }
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedCategory === category ? 'font-semibold' : ''
                  }`}
                  style={{
                    backgroundColor: selectedCategory === category ? theme.accent.primary + '20' : 'transparent',
                    color: selectedCategory === category ? theme.accent.primary : theme.text.secondary
                  }}
                >
                  {category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border.primary }}>
              <h4 className="text-xs font-semibold mb-2" style={{ color: theme.text.secondary }}>Metrics</h4>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {metricCategories[selectedCategory]?.map((metric) => (
                  <button
                    key={metric}
                    onClick={() => setSelectedMetric(metric)}
                    className={`w-full text-left px-3 py-1.5 rounded text-xs transition-all ${
                      selectedMetric === metric ? 'font-semibold' : ''
                    }`}
                    style={{
                      backgroundColor: selectedMetric === metric ? theme.accent.primary + '20' : 'transparent',
                      color: selectedMetric === metric ? theme.accent.primary : theme.text.secondary
                    }}
                  >
                    {metric}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2" style={{ color: theme.text.primary }}>
                  {selectedMetric}
                </h2>
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-4xl font-bold" style={{ color: theme.accent.primary }}>
                    {metricData?.current?.toFixed(1) || 'N/A'}
                  </span>
                  <TrendIcon className={`w-6 h-6 ${
                    getTrend() === 'up' ? 'text-green-500' : 
                    getTrend() === 'down' ? 'text-red-500' : 
                    'text-gray-400'
                  }`} />
                </div>
                {/* Personal Best/Worst Indicators */}
                <div className="flex gap-4 text-sm">
                  {personalBest && (
                    <div className="flex items-center gap-1" style={{ color: theme.text.secondary }}>
                      <Trophy className="w-4 h-4" style={{ color: '#f59e0b' }} />
                      <span>Best: {personalBest.value.toFixed(1)} ({(() => {
                        const [year, month, day] = personalBest.fullDate.split('-').map(Number);
                        return format(new Date(year, month - 1, day), 'MMM dd');
                      })()})</span>
                    </div>
                  )}
                  {personalWorst && (
                    <div className="flex items-center gap-1" style={{ color: theme.text.secondary }}>
                      <AlertCircle className="w-4 h-4" style={{ color: '#ef4444' }} />
                      <span>Worst: {personalWorst.value.toFixed(1)} ({(() => {
                        const [year, month, day] = personalWorst.fullDate.split('-').map(Number);
                        return format(new Date(year, month - 1, day), 'MMM dd');
                      })()})</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowExportModal(true)}
                  className="p-2 rounded-lg border"
                  style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
                  title="Export Data"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {['7D', '30D', '90D', 'All'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  timeRange === range ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: timeRange === range ? theme.accent.primary : 'transparent',
                  color: timeRange === range ? 'white' : theme.text.secondary
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        {metricData && (
          <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
            {/* Time Range Selector */}
            <div className="flex gap-2 mb-4">
              {['7D', '30D', '90D', 'All'].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm ${
                    timeRange === range ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: timeRange === range ? theme.accent.primary : 'transparent',
                    color: timeRange === range ? 'white' : theme.text.secondary
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
              <ComposedChart data={metricData.chartData}>
                <defs>
                  <linearGradient id="normalRangeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.accent.primary} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={theme.accent.primary} stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#bae6fd" />
                <XAxis dataKey="date" stroke={theme.text.secondary} />
                <YAxis 
                  stroke={theme.text.secondary}
                  label={{ 
                    value: (() => {
                      // Get metric field name from selected metric
                      const metricFieldMap = {
                        'Sleep Duration': 'sleep_duration_hours',
                        'Sleep Quality': 'sleep_quality_score',
                        'Deep Sleep': 'deep_sleep_hours',
                        'REM Sleep': 'rem_sleep_hours',
                        'Sleep Efficiency': 'sleep_efficiency',
                        'Awakenings': 'awakenings',
                        'Deep Sleep %': 'deep_sleep_percent',
                        'REM Sleep %': 'rem_sleep_percent',
                        'Steps': 'steps',
                        'Active Minutes': 'active_minutes',
                        'Exercise Minutes': 'exercise_minutes',
                        'Calories Burned': 'calories_burned',
                        'Distance': 'distance_km',
                        'Avg Heart Rate': 'avg_heart_rate',
                        'Max Heart Rate': 'max_heart_rate',
                        'VO2 Max': 'vo2_max',
                        'Calories': 'calories',
                        'Protein': 'protein_g',
                        'Carbs': 'carbs_g',
                        'Fats': 'fats_g',
                        'Fiber': 'fiber_g',
                        'Sugar': 'sugar_g',
                        'Caffeine Cups': 'caffeine_cups',
                        'Caffeine Last Time': 'caffeine_last_time',
                        'Meals Count': 'meals_count',
                        'Resting Heart Rate': 'resting_heart_rate',
                        'HRV': 'hrv_ms',
                        'Blood Pressure': 'blood_pressure_systolic',
                        'Blood Pressure Diastolic': 'blood_pressure_diastolic',
                        'Weight': 'weight_kg',
                        'Body Fat': 'body_fat_percent',
                        'Muscle Mass': 'muscle_mass_kg',
                        'Body Temperature': 'body_temperature_c',
                        'Oxygen Saturation': 'oxygen_saturation',
                        'Energy Level': 'energy_level',
                        'Mood Score': 'mood_score',
                        'Stress Level': 'stress_level',
                        'Anxiety Level': 'anxiety_level',
                        'Productivity': 'productivity_score',
                        'Meditation': 'meditation_minutes',
                        'Outdoor Time': 'outdoor_time_hours',
                        'Screen Time': 'screen_time_hours',
                        'Screen Time Before Bed': 'screen_time_before_bed_minutes',
                        'Workout Performance Rating': 'workout_performance_rating',
                        'Social Interactions': 'social_interactions',
                        'Alcohol Units': 'alcohol_units',
                        'Bedtime': 'bedtime',
                        'Wake Time': 'wake_time',
                        'Floors Climbed': 'floors_climbed'
                      };
                      const fieldName = metricFieldMap[selectedMetric] || selectedMetric.toLowerCase().replace(/\s+/g, '_');
                      const unit = getMetricUnit(fieldName);
                      return unit ? `(${unit})` : '';
                    })(), 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: theme.text.secondary, fontSize: '12px' }
                  }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg border shadow-lg" style={{ borderColor: theme.border.primary }}>
                          <p className="font-semibold mb-1" style={{ color: theme.text.primary }}>
                            {label}
                          </p>
                          <p className="text-sm" style={{ color: theme.text.secondary }}>
                            Value: <span style={{ color: theme.accent.primary, fontWeight: 'bold' }}>
                              {data.value !== null ? data.value.toFixed(1) : 'N/A'}
                            </span>
                          </p>
                          {data.fullDate && (
                            <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>
                              {(() => {
                                const [year, month, day] = data.fullDate.split('-').map(Number);
                                return format(new Date(year, month - 1, day), 'MMM dd, yyyy');
                              })()}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Normal Range Shaded Area */}
                {metricData.normalMin !== null && metricData.normalMax !== null && (
                  <Area
                    type="monotone"
                    dataKey="normalMax"
                    stroke="none"
                    fill="url(#normalRangeGradient)"
                    yAxisId={0}
                    connectNulls={false}
                  />
                )}
                {/* Normal Range Reference Lines */}
                {metricData.normalMin !== null && metricData.normalMax !== null && (
                  <>
                    <ReferenceLine y={metricData.normalMin} stroke={theme.accent.primary} strokeDasharray="3 3" strokeOpacity={0.4} label="Normal Min" />
                    <ReferenceLine y={metricData.normalMax} stroke={theme.accent.primary} strokeDasharray="3 3" strokeOpacity={0.4} label="Normal Max" />
                  </>
                )}
                <ReferenceLine y={metricData.average} stroke="#06b6d4" strokeDasharray="5 5" label="Average" />
                <Line type="monotone" dataKey="value" stroke={theme.accent.primary} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Statistics */}
        {metricData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border" style={{ borderColor: theme.border.primary }}>
              <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Average</p>
              <p className="text-xl font-bold" style={{ color: theme.text.primary }}>
                {metricData.average !== null && !isNaN(metricData.average) ? metricData.average.toFixed(1) : 'N/A'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border" style={{ borderColor: theme.border.primary }}>
              <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Median</p>
              <p className="text-xl font-bold" style={{ color: theme.text.primary }}>
                {metricData.median !== null && !isNaN(metricData.median) ? metricData.median.toFixed(1) : 'N/A'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border" style={{ borderColor: theme.border.primary }}>
              <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Range</p>
              <p className="text-xl font-bold" style={{ color: theme.text.primary }}>
                {metricData.min !== null && metricData.max !== null && 
                 isFinite(metricData.min) && isFinite(metricData.max)
                  ? `${metricData.min.toFixed(1)} - ${metricData.max.toFixed(1)}`
                  : 'N/A'}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border" style={{ borderColor: theme.border.primary }}>
              <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Consistency</p>
              <p className="text-xl font-bold" style={{ color: theme.text.primary }}>
                {metricData.consistency !== null && !isNaN(metricData.consistency) ? metricData.consistency.toFixed(0) : '0'}%
              </p>
            </div>
          </div>
        )}

        {/* Correlations - AI-Discovered */}
        {correlations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-lg font-bold" style={{ color: theme.text.primary }}>
                Correlations:
              </h3>
              <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                ML Analysis
              </span>
            </div>
            <p className="text-sm mb-4 opacity-75" style={{ color: theme.text.secondary }}>
              Machine learning models identified these relationships in your data
            </p>
            {/* Data Quality Warning */}
            <div className="mb-4 p-3 rounded-lg border" style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}>
              <div className="flex items-start gap-2">
                <span className="text-sm">⚠️</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold mb-1" style={{ color: '#92400e' }}>
                    Demo Data Notice
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: '#78350f' }}>
                    This app is currently using synthetic demo data. Correlations may appear stronger than they would with real-world data. 
                    With only 30 days of data, these correlations should be interpreted as patterns rather than definitive relationships. 
                    Real health data typically shows correlations in the 30-70% range.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {correlations.map((corr, idx) => {
                // Get the affected metric name (metric2)
                const affectedMetricName = corr.metric2Label || formatMetricLabel(corr.metric2);
                
                // Map back to display name for navigation
                const reverseMetricMap = {
                  'sleep_duration_hours': 'Sleep Duration',
                  'sleep_quality_score': 'Sleep Quality',
                  'deep_sleep_hours': 'Deep Sleep',
                  'rem_sleep_hours': 'REM Sleep',
                  'steps': 'Steps',
                  'active_minutes': 'Active Minutes',
                  'exercise_minutes': 'Exercise Minutes',
                  'calories_burned': 'Calories Burned',
                  'calories': 'Calories',
                  'protein_g': 'Protein',
                  'carbs_g': 'Carbs',
                  'resting_heart_rate': 'Resting Heart Rate',
                  'hrv_ms': 'HRV',
                  'blood_pressure_systolic': 'Blood Pressure',
                  'weight_kg': 'Weight',
                  'body_fat_percent': 'Body Fat',
                  'muscle_mass_kg': 'Muscle Mass',
                  'energy_level': 'Energy Level',
                  'mood_score': 'Mood Score',
                  'stress_level': 'Stress Level',
                  // Additional metrics that might appear in correlations
                  'sleep_efficiency': 'Sleep Efficiency',
                  'awakenings': 'Awakenings',
                  'deep_sleep_percent': 'Deep Sleep %',
                  'rem_sleep_percent': 'REM Sleep %',
                  'distance_km': 'Distance',
                  'avg_heart_rate': 'Avg Heart Rate',
                  'max_heart_rate': 'Max Heart Rate',
                  'vo2_max': 'VO2 Max',
                  'fats_g': 'Fats',
                  'fiber_g': 'Fiber',
                  'sugar_g': 'Sugar',
                  'caffeine_cups': 'Caffeine Cups',
                  'caffeine_last_time': 'Caffeine Last Time',
                  'meals_count': 'Meals Count',
                  'blood_pressure_diastolic': 'Blood Pressure Diastolic',
                  'body_temperature_c': 'Body Temperature',
                  'oxygen_saturation': 'Oxygen Saturation',
                  'anxiety_level': 'Anxiety Level',
                  'productivity_score': 'Productivity',
                  'meditation_minutes': 'Meditation',
                  'outdoor_time_hours': 'Outdoor Time',
                  'screen_time_hours': 'Screen Time',
                  'screen_time_before_bed_minutes': 'Screen Time Before Bed',
                  'workout_performance_rating': 'Workout Performance Rating',
                  'social_interactions': 'Social Interactions',
                  'alcohol_units': 'Alcohol Units',
                  'bedtime': 'Bedtime',
                  'wake_time': 'Wake Time',
                  'floors_climbed': 'Floors Climbed'
                };
                
                // Try to find display name, fallback to formatted field name
                let displayMetricName = reverseMetricMap[corr.metric2];
                if (!displayMetricName) {
                  // Use the label from correlation if available
                  displayMetricName = corr.metric2Label || affectedMetricName;
                }
                const correlationPercent = (Math.abs(corr.correlation) * 100).toFixed(0);
                const isTimeLagged = corr.type === 'time-lagged';
                
                // Calculate sample size warning
                const sampleSize = corr.dataPoints || 0;
                const isSmallSample = sampleSize < 30;
                const isVeryHighCorrelation = Math.abs(corr.correlation) > 0.9;
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedCorrelation(corr);
                      setShowCorrelationExplanation(true);
                    }}
                    className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-all"
                    style={{ borderColor: theme.border.primary }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span style={{ color: theme.text.primary }}>
                          {affectedMetricName}
                        </span>
                        {isTimeLagged && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded" 
                                style={{ 
                                  backgroundColor: theme.accent.secondary + '20',
                                  color: theme.accent.secondary
                                }}>
                            {corr.lag}-day lag
                          </span>
                        )}
                        {isSmallSample && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded" 
                                style={{ 
                                  backgroundColor: '#fef3c7',
                                  color: '#92400e'
                                }}
                                title={`Based on ${sampleSize} data points - small sample size`}>
                            ⚠️ Small sample
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          corr.direction === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {corr.direction === 'positive' ? '↑' : '↓'}
                        </span>
                        <span className={`text-sm font-semibold ${isVeryHighCorrelation ? 'text-orange-600' : ''}`} style={{ color: isVeryHighCorrelation ? '#ea580c' : theme.text.primary }}>
                          {correlationPercent}%
                        </span>
                      </div>
                    </div>
                    {corr.metric2Category && (
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs" style={{ color: theme.text.tertiary }}>
                          {corr.metric2Category.charAt(0).toUpperCase() + corr.metric2Category.slice(1)} category
                        </p>
                        {sampleSize > 0 && (
                          <p className="text-xs" style={{ color: theme.text.tertiary }}>
                            {sampleSize} data points
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Modals */}
      {showExportModal && metricData && (
        <ExportDataModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          metricName={selectedMetric}
          chartData={metricData.chartData}
          onExport={handleExport}
        />
      )}

      {showCorrelationExplanation && selectedCorrelation && (
        <CorrelationExplanationModal
          isOpen={showCorrelationExplanation}
          onClose={() => {
            setShowCorrelationExplanation(false);
            setSelectedCorrelation(null);
          }}
          correlation={selectedCorrelation}
          allHealthData={allHealthData}
        />
      )}
    </div>
  );
};

export default MetricsTab;

