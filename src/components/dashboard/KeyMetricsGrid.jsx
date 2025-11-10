// Key Metrics Grid Component
// Shows 3 default metrics with ability to add more

import React, { useState, useEffect } from 'react';
import { Moon, Zap, Candy, Dumbbell, Heart, Smile, TrendingUp, TrendingDown, Minus, Sparkles, AlertTriangle, Plus, X, Activity, Droplet, Apple, Scale, Thermometer, Gauge, Brain, Coffee, Clock } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { getDataForDate, getAvailableDates } from '../../utils/dataLoader';
import { format } from 'date-fns';

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

const KeyMetricsGrid = ({ allHealthData, selectedDate, onMetricClick }) => {
  const [metrics, setMetrics] = useState([]);
  const [selectedMetricIds, setSelectedMetricIds] = useState(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('dashboardSelectedMetrics');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return ['sleep_quality', 'energy_level', 'stress_level'];
      }
    }
    return ['sleep_quality', 'energy_level', 'stress_level']; // Default 3 metrics
  });
  const [showAddMetricModal, setShowAddMetricModal] = useState(false);

  useEffect(() => {
    if (!allHealthData || !selectedDate) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const todayData = getDataForDate(allHealthData, dateStr);
    const dates = getAvailableDates(allHealthData);
    const recentDates = dates.slice(-7);
    
    // Store recentDates in scope for use in metric calculations
    const getRecentDates = () => recentDates;

    const getChartData = (category, metricKey) => {
      return recentDates.map(d => {
        const dayData = getDataForDate(allHealthData, d);
        const value = dayData[category]?.[metricKey];
        return { date: d, value: value !== null && value !== undefined ? value : 0 };
      });
    };

    const getTrend = (current, baseline, lowerIsBetter = false) => {
      if (current === null || current === undefined || baseline === null || baseline === undefined || baseline === 0) {
        return { direction: 'stable', percent: 0 };
      }
      const diff = current - baseline;
      const percent = Math.abs((diff / baseline) * 100);
      
      // Only show trend if change is significant (>5%)
      if (percent < 5) return { direction: 'stable', percent: 0 };
      
      if (lowerIsBetter) {
        if (diff < -0.05 * baseline) return { direction: 'up', percent }; // Lower is better, so negative diff is improvement
        if (diff > 0.05 * baseline) return { direction: 'down', percent };
      } else {
        if (diff > 0.05 * baseline) return { direction: 'up', percent };
        if (diff < -0.05 * baseline) return { direction: 'down', percent };
      }
      return { direction: 'stable', percent: 0 };
    };

    // Calculate averages for trend comparison
    const sleepValues = recentDates.map(d => getDataForDate(allHealthData, d).sleep?.sleep_quality_score).filter(v => v);
    const avgSleep = sleepValues.length > 0 ? sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length : 0;
    
    const energyValues = recentDates.map(d => getDataForDate(allHealthData, d).wellness?.energy_level).filter(v => v);
    const avgEnergy = energyValues.length > 0 ? energyValues.reduce((a, b) => a + b, 0) / energyValues.length : 0;
    
    const sugarValues = recentDates.map(d => getDataForDate(allHealthData, d).nutrition?.sugar_afternoon_g).filter(v => v);
    const avgSugar = sugarValues.length > 0 ? sugarValues.reduce((a, b) => a + b, 0) / sugarValues.length : 0;
    
    const workoutValues = recentDates.map(d => getDataForDate(allHealthData, d).activity?.workout_performance_rating).filter(v => v);
    const avgWorkout = workoutValues.length > 0 ? workoutValues.reduce((a, b) => a + b, 0) / workoutValues.length : 0;
    
    const hrValues = recentDates.map(d => {
      const dayData = getDataForDate(allHealthData, d);
      return dayData.vitals?.resting_heart_rate || dayData.activity?.resting_heart_rate;
    }).filter(v => v);
    const avgHR = hrValues.length > 0 ? hrValues.reduce((a, b) => a + b, 0) / hrValues.length : 0;
    
    const stressValues = recentDates.map(d => getDataForDate(allHealthData, d).wellness?.stress_level).filter(v => v);
    const avgStress = stressValues.length > 0 ? stressValues.reduce((a, b) => a + b, 0) / stressValues.length : 0;

    // Define all available metrics with their IDs
    const allMetricsMap = {
      'sleep_quality': {
        id: 'sleep_quality',
        name: 'Sleep Quality',
        icon: Moon,
        color: '#3B82F6',
        bgColor: '#F0F9FF',
        borderColor: '#3B82F6',
        value: todayData?.sleep?.sleep_quality_score || 0,
        unit: '/100',
        source: 'sleep.csv',
        category: 'sleep',
        metricField: 'Sleep Quality',
        trend: getTrend(todayData?.sleep?.sleep_quality_score, avgSleep),
        chartData: getChartData('sleep', 'sleep_quality_score'),
        description: (() => {
          const current = todayData?.sleep?.sleep_quality_score || 0;
          if (current > avgSleep * 1.1) return 'Above your average';
          if (current < avgSleep * 0.9) return 'Below your average';
          return 'Matches your average';
        })(),
        hasAlert: false,
        hasInsight: false
      },
      'energy_level': {
        id: 'energy_level',
        name: 'Energy Level',
        icon: Zap,
        color: '#F59E0B',
        bgColor: '#FFF9E6',
        borderColor: '#F59E0B',
        value: todayData?.wellness?.energy_level || 0,
        unit: '/10',
        source: 'wellness.csv',
        category: 'wellness',
        metricField: 'Energy Level',
        trend: getTrend(todayData?.wellness?.energy_level, avgEnergy),
        chartData: getChartData('wellness', 'energy_level'),
        description: (() => {
          const current = todayData?.wellness?.energy_level || 0;
          if (current > avgEnergy * 1.1) return 'Above your average';
          if (current < avgEnergy * 0.9) return 'Below your average';
          return 'Matches your average';
        })(),
        hasAlert: false,
        hasInsight: false
      },
      'stress_level': {
        id: 'stress_level',
        name: 'Stress Level',
        icon: Smile,
        color: '#EC4899',
        bgColor: '#FDF2F8',
        borderColor: '#EC4899',
        value: todayData?.wellness?.stress_level || 0,
        unit: '/10',
        source: 'wellness.csv',
        category: 'wellness',
        metricField: 'Stress Level',
        trend: getTrend(todayData?.wellness?.stress_level, avgStress, true), // Lower is better
        chartData: getChartData('wellness', 'stress_level'),
        description: (() => {
          const current = todayData?.wellness?.stress_level || 0;
          if (current < avgStress * 0.9) return 'Lower than usual';
          if (current > avgStress * 1.1) return 'Higher than usual';
          return 'Matches your average';
        })(),
        hasAlert: false,
        hasInsight: false
      },
      'sugar_intake': {
        id: 'sugar_intake',
        name: 'Sugar Intake',
        icon: Candy,
        color: '#F97316',
        bgColor: '#FFF7ED',
        borderColor: '#F97316',
        value: todayData?.nutrition?.sugar_afternoon_g || todayData?.nutrition?.sugar_g || 0,
        unit: 'g',
        source: 'nutrition.csv',
        category: 'nutrition',
        metricField: 'Sugar',
        trend: getTrend(todayData?.nutrition?.sugar_afternoon_g || todayData?.nutrition?.sugar_g, avgSugar, true),
        chartData: getChartData('nutrition', 'sugar_afternoon_g').length > 0 
          ? getChartData('nutrition', 'sugar_afternoon_g')
          : getChartData('nutrition', 'sugar_g'),
        description: (() => {
          const current = todayData?.nutrition?.sugar_afternoon_g || todayData?.nutrition?.sugar_g || 0;
          if (current > avgSugar * 1.1) return 'Above your average';
          if (current < avgSugar * 0.9) return 'Below your average';
          return 'Matches your average';
        })(),
        hasAlert: false,
        hasInsight: false
      },
      'workout_performance': {
        id: 'workout_performance',
        name: 'Workout Performance',
        icon: Dumbbell,
        color: '#10B981',
        bgColor: '#F0FDF4',
        borderColor: '#10B981',
        value: todayData?.activity?.workout_performance_rating || 0,
        unit: '/10',
        source: 'activity.csv',
        category: 'activity',
        metricField: 'Workout Performance',
        trend: getTrend(todayData?.activity?.workout_performance_rating, avgWorkout),
        chartData: getChartData('activity', 'workout_performance_rating'),
        description: (() => {
          const current = todayData?.activity?.workout_performance_rating || 0;
          if (current > avgWorkout * 1.1) return 'Exceeding your baseline';
          if (current < avgWorkout * 0.9) return 'Below your baseline';
          return 'Matches your baseline';
        })(),
        hasAlert: false,
        hasInsight: false,
        goalBadge: '🎯 Goal: Fitness'
      },
      'resting_heart_rate': {
        id: 'resting_heart_rate',
        name: 'Resting Heart Rate',
        icon: Heart,
        color: '#EF4444',
        bgColor: '#FEF2F2',
        borderColor: '#EF4444',
        value: todayData?.vitals?.resting_heart_rate || todayData?.activity?.resting_heart_rate || 0,
        unit: 'bpm',
        source: 'vitals.csv',
        category: 'heart-health',
        metricField: 'Resting Heart Rate',
        trend: getTrend(todayData?.vitals?.resting_heart_rate || todayData?.activity?.resting_heart_rate, avgHR, true),
        chartData: getChartData('vitals', 'resting_heart_rate').length > 0
          ? getChartData('vitals', 'resting_heart_rate')
          : getChartData('activity', 'resting_heart_rate'),
        description: (() => {
          const currentHR = todayData?.vitals?.resting_heart_rate || todayData?.activity?.resting_heart_rate || 0;
          const hrValues = recentDates.map(d => {
            const dayData = getDataForDate(allHealthData, d);
            return dayData.vitals?.resting_heart_rate || dayData.activity?.resting_heart_rate;
          }).filter(v => v !== null && v !== undefined);
          
          if (hrValues.length === 0) {
            if (currentHR > 64) return 'Above typical range (58-64)';
            if (currentHR < 58) return 'Below typical range (58-64)';
            return 'Within typical range';
          }
          
          const userAvg = hrValues.reduce((a, b) => a + b, 0) / hrValues.length;
          const userStd = Math.sqrt(hrValues.reduce((sum, v) => sum + Math.pow(v - userAvg, 2), 0) / hrValues.length) || 1;
          const normalMin = Math.max(50, userAvg - userStd);
          const normalMax = Math.min(100, userAvg + userStd);
          
          if (currentHR > normalMax) return `Above your normal range (${normalMin.toFixed(0)}-${normalMax.toFixed(0)})`;
          if (currentHR < normalMin) return `Below your normal range (${normalMin.toFixed(0)}-${normalMax.toFixed(0)})`;
          return 'Within your normal range';
        })(),
        hasAlert: (() => {
          const currentHR = todayData?.vitals?.resting_heart_rate || todayData?.activity?.resting_heart_rate || 0;
          if (!currentHR) return false;
          const hrValues = recentDates.map(d => {
            const dayData = getDataForDate(allHealthData, d);
            return dayData.vitals?.resting_heart_rate || dayData.activity?.resting_heart_rate;
          }).filter(v => v !== null && v !== undefined);
          if (hrValues.length === 0) return currentHR > 64;
          const userAvg = hrValues.reduce((a, b) => a + b, 0) / hrValues.length;
          const userStd = Math.sqrt(hrValues.reduce((sum, v) => sum + Math.pow(v - userAvg, 2), 0) / hrValues.length) || 1;
          return currentHR > userAvg + 2 * userStd;
        })(),
        alertText: (() => {
          const currentHR = todayData?.vitals?.resting_heart_rate || todayData?.activity?.resting_heart_rate || 0;
          if (!currentHR) return '';
          const hrValues = recentDates.map(d => {
            const dayData = getDataForDate(allHealthData, d);
            return dayData.vitals?.resting_heart_rate || dayData.activity?.resting_heart_rate;
          }).filter(v => v !== null && v !== undefined);
          if (hrValues.length === 0) return currentHR > 64 ? 'Elevated' : '';
          const userAvg = hrValues.reduce((a, b) => a + b, 0) / hrValues.length;
          const userStd = Math.sqrt(hrValues.reduce((sum, v) => sum + Math.pow(v - userAvg, 2), 0) / hrValues.length) || 1;
          const threshold = userAvg + 2 * userStd;
          let consecutiveDays = 0;
          for (let i = recentDates.length - 1; i >= 0; i--) {
            const dayData = getDataForDate(allHealthData, recentDates[i]);
            const hr = dayData.vitals?.resting_heart_rate || dayData.activity?.resting_heart_rate;
            if (hr && hr > threshold) {
              consecutiveDays++;
            } else {
              break;
            }
          }
          if (currentHR > threshold) {
            if (consecutiveDays >= 2) return `Day ${consecutiveDays} of elevation`;
            return 'Elevated';
          }
          return '';
        })(),
        normalRange: (() => {
          const hrValues = recentDates.map(d => {
            const dayData = getDataForDate(allHealthData, d);
            return dayData.vitals?.resting_heart_rate || dayData.activity?.resting_heart_rate;
          }).filter(v => v !== null && v !== undefined);
          if (hrValues.length === 0) return { min: 58, max: 64 };
          const userAvg = hrValues.reduce((a, b) => a + b, 0) / hrValues.length;
          const userStd = Math.sqrt(hrValues.reduce((sum, v) => sum + Math.pow(v - userAvg, 2), 0) / hrValues.length) || 1;
          return { min: Math.max(50, userAvg - userStd), max: Math.min(100, userAvg + userStd) };
        })(),
        hasInsight: false
      }
    };

    // Helper function to get metric data from CSV
    const getMetricValue = (id, category, todayData) => {
      const metricFieldMap = {
        // Sleep metrics
        'sleep_duration': todayData?.sleep?.sleep_duration_hours,
        'deep_sleep': todayData?.sleep?.deep_sleep_hours,
        'rem_sleep': todayData?.sleep?.rem_sleep_hours,
        'sleep_efficiency': todayData?.sleep?.sleep_efficiency,
        // Activity metrics
        'steps': todayData?.activity?.steps,
        'active_minutes': todayData?.activity?.active_minutes,
        'exercise_minutes': todayData?.activity?.exercise_minutes,
        'calories_burned': todayData?.activity?.calories_burned,
        'distance': todayData?.activity?.distance_km,
        'avg_heart_rate': todayData?.activity?.avg_heart_rate,
        'max_heart_rate': todayData?.activity?.max_heart_rate,
        'vo2_max': todayData?.activity?.vo2_max,
        // Nutrition metrics
        'calories': todayData?.nutrition?.calories,
        'protein': todayData?.nutrition?.protein_g,
        'carbs': todayData?.nutrition?.carbs_g,
        'fats': todayData?.nutrition?.fats_g,
        'fiber': todayData?.nutrition?.fiber_g,
        'sodium': todayData?.nutrition?.sodium_mg,
        // Heart Health metrics (check vitals first, then activity)
        'resting_heart_rate': todayData?.vitals?.resting_heart_rate || todayData?.activity?.resting_heart_rate,
        'hrv': todayData?.vitals?.hrv_ms || todayData?.activity?.hrv_ms || todayData?.sleep?.hrv_ms,
        'blood_pressure': todayData?.vitals?.blood_pressure_systolic,
        'blood_pressure_diastolic': todayData?.vitals?.blood_pressure_diastolic,
        // Body Metrics
        'weight': todayData?.vitals?.weight_kg,
        'body_fat': todayData?.vitals?.body_fat_percent,
        'muscle_mass': todayData?.vitals?.muscle_mass_kg,
        'body_temperature': todayData?.vitals?.body_temperature_c,
        'oxygen_saturation': todayData?.vitals?.oxygen_saturation,
        // Wellness metrics
        'mood_score': todayData?.wellness?.mood_score,
        'anxiety_level': todayData?.wellness?.anxiety_level,
        'productivity': todayData?.wellness?.productivity_score,
        'meditation': todayData?.wellness?.meditation_minutes,
        'outdoor_time': todayData?.wellness?.outdoor_time_hours,
        'screen_time': todayData?.wellness?.screen_time_hours
      };
      return metricFieldMap[id] || null;
    };

    const getMetricChartData = (id, category) => {
      const chartFieldMap = {
        'sleep_duration': 'sleep_duration_hours',
        'deep_sleep': 'deep_sleep_hours',
        'rem_sleep': 'rem_sleep_hours',
        'sleep_efficiency': 'sleep_efficiency',
        'steps': 'steps',
        'active_minutes': 'active_minutes',
        'exercise_minutes': 'exercise_minutes',
        'calories_burned': 'calories_burned',
        'distance': 'distance_km',
        'avg_heart_rate': 'avg_heart_rate',
        'max_heart_rate': 'max_heart_rate',
        'vo2_max': 'vo2_max',
        'calories': 'calories',
        'protein': 'protein_g',
        'carbs': 'carbs_g',
        'fats': 'fats_g',
        'fiber': 'fiber_g',
        'sodium': 'sodium_mg',
        'sugar_intake': 'sugar_afternoon_g', // Special case - will handle fallback below
        'resting_heart_rate': 'resting_heart_rate',
        'hrv': 'hrv_ms',
        'blood_pressure': 'blood_pressure_systolic',
        'blood_pressure_diastolic': 'blood_pressure_diastolic',
        'weight': 'weight_kg',
        'body_fat': 'body_fat_percent',
        'muscle_mass': 'muscle_mass_kg',
        'body_temperature': 'body_temperature_c',
        'oxygen_saturation': 'oxygen_saturation',
        'mood_score': 'mood_score',
        'anxiety_level': 'anxiety_level',
        'productivity': 'productivity_score',
        'meditation': 'meditation_minutes',
        'outdoor_time': 'outdoor_time_hours',
        'screen_time': 'screen_time_hours'
      };
      
      const fieldName = chartFieldMap[id];
      if (!fieldName) return [];
      
      // Determine which data source to use
      let dataSource = null;
      if (category === 'sleep') dataSource = 'sleep';
      else if (category === 'activity') dataSource = 'activity';
      else if (category === 'nutrition') dataSource = 'nutrition';
      else if (category === 'heart-health') {
        // For heart-health, check vitals first, then activity, then sleep
        return recentDates.map(d => {
          const dayData = getDataForDate(allHealthData, d);
          return { 
            date: d, 
            value: dayData.vitals?.[fieldName] || dayData.activity?.[fieldName] || dayData.sleep?.[fieldName] || 0 
          };
        });
      } else if (category === 'body-metrics') dataSource = 'vitals';
      else if (category === 'wellness') dataSource = 'wellness';
      
      if (!dataSource) return [];
      
      // Special handling for sugar_intake - check sugar_afternoon_g first, then sugar_g
      if (id === 'sugar_intake') {
        return recentDates.map(d => {
          const dayData = getDataForDate(allHealthData, d);
          const value = dayData.nutrition?.sugar_afternoon_g || dayData.nutrition?.sugar_g;
          return { date: d, value: value !== null && value !== undefined ? value : 0 };
        });
      }
      
      return recentDates.map(d => {
        const dayData = getDataForDate(allHealthData, d);
        const value = dayData[dataSource]?.[fieldName];
        return { date: d, value: value !== null && value !== undefined ? value : 0 };
      });
    };

    const getMetricUnit = (id, category) => {
      const unitMap = {
        'sleep_duration': 'hrs',
        'deep_sleep': 'hrs',
        'rem_sleep': 'hrs',
        'sleep_efficiency': '%',
        'steps': '',
        'active_minutes': 'min',
        'exercise_minutes': 'min',
        'calories_burned': 'cal',
        'distance': 'km',
        'avg_heart_rate': 'bpm',
        'max_heart_rate': 'bpm',
        'vo2_max': '',
        'calories': 'cal',
        'protein': 'g',
        'carbs': 'g',
        'fats': 'g',
        'fiber': 'g',
        'sodium': 'mg',
        'resting_heart_rate': 'bpm',
        'hrv': 'ms',
        'blood_pressure': 'mmHg',
        'blood_pressure_diastolic': 'mmHg',
        'weight': 'kg',
        'body_fat': '%',
        'muscle_mass': 'kg',
        'body_temperature': '°C',
        'oxygen_saturation': '%',
        'mood_score': '/10',
        'anxiety_level': '/10',
        'productivity': '/10',
        'meditation': 'min',
        'outdoor_time': 'hrs',
        'screen_time': 'hrs'
      };
      return unitMap[id] || '';
    };

    const getMetricColor = (category) => {
      const colorMap = {
        'sleep': '#3B82F6',
        'activity': '#10B981',
        'nutrition': '#F97316',
        'heart-health': '#EF4444',
        'body-metrics': '#8B5CF6',
        'wellness': '#EC4899'
      };
      return colorMap[category] || '#64748b';
    };

    const getMetricBgColor = (category) => {
      const bgColorMap = {
        'sleep': '#F0F9FF',
        'activity': '#F0FDF4',
        'nutrition': '#FFF7ED',
        'heart-health': '#FEF2F2',
        'body-metrics': '#F5F3FF',
        'wellness': '#FDF2F8'
      };
      return bgColorMap[category] || '#F9FAFB';
    };

    // Filter metrics based on selectedMetricIds
    // For metrics not in allMetricsMap, create a metric object with real data
    const filteredMetrics = selectedMetricIds
      .map(id => {
        if (allMetricsMap[id]) {
          return allMetricsMap[id];
        }
        // Create metric object with real data for metrics not in allMetricsMap
        const availableMetricsToAddLocal = {
          'sleep_duration': { name: 'Sleep Duration', icon: Moon, category: 'sleep', metricField: 'Sleep Duration' },
          'deep_sleep': { name: 'Deep Sleep', icon: Moon, category: 'sleep', metricField: 'Deep Sleep' },
          'rem_sleep': { name: 'REM Sleep', icon: Moon, category: 'sleep', metricField: 'REM Sleep' },
          'sleep_efficiency': { name: 'Sleep Efficiency', icon: Moon, category: 'sleep', metricField: 'Sleep Efficiency' },
          'workout_performance': { name: 'Workout Performance', icon: Dumbbell, category: 'activity', metricField: 'Workout Performance' },
          'steps': { name: 'Steps', icon: Activity, category: 'activity', metricField: 'Steps' },
          'active_minutes': { name: 'Active Minutes', icon: Activity, category: 'activity', metricField: 'Active Minutes' },
          'exercise_minutes': { name: 'Exercise Minutes', icon: Activity, category: 'activity', metricField: 'Exercise Minutes' },
          'calories_burned': { name: 'Calories Burned', icon: Activity, category: 'activity', metricField: 'Calories Burned' },
          'distance': { name: 'Distance', icon: Activity, category: 'activity', metricField: 'Distance' },
          'avg_heart_rate': { name: 'Avg Heart Rate', icon: Heart, category: 'activity', metricField: 'Avg Heart Rate' },
          'max_heart_rate': { name: 'Max Heart Rate', icon: Heart, category: 'activity', metricField: 'Max Heart Rate' },
          'vo2_max': { name: 'VO2 Max', icon: Activity, category: 'activity', metricField: 'VO2 Max' },
          'sugar_intake': { name: 'Sugar Intake', icon: Candy, category: 'nutrition', metricField: 'Sugar' },
          'calories': { name: 'Calories', icon: Apple, category: 'nutrition', metricField: 'Calories' },
          'protein': { name: 'Protein', icon: Apple, category: 'nutrition', metricField: 'Protein' },
          'carbs': { name: 'Carbs', icon: Apple, category: 'nutrition', metricField: 'Carbs' },
          'fats': { name: 'Fats', icon: Apple, category: 'nutrition', metricField: 'Fats' },
          'fiber': { name: 'Fiber', icon: Apple, category: 'nutrition', metricField: 'Fiber' },
          'caffeine_cups': { name: 'Caffeine Cups', icon: Coffee, category: 'nutrition', metricField: 'Caffeine Cups' },
          'meals_count': { name: 'Meals Count', icon: Apple, category: 'nutrition', metricField: 'Meals Count' },
          'resting_heart_rate': { name: 'Resting Heart Rate', icon: Heart, category: 'heart-health', metricField: 'Resting Heart Rate' },
          'hrv': { name: 'HRV', icon: Heart, category: 'heart-health', metricField: 'HRV' },
          'blood_pressure': { name: 'Blood Pressure', icon: Heart, category: 'heart-health', metricField: 'Blood Pressure' },
          'blood_pressure_diastolic': { name: 'Blood Pressure Diastolic', icon: Heart, category: 'heart-health', metricField: 'Blood Pressure Diastolic' },
          'weight': { name: 'Weight', icon: Scale, category: 'body-metrics', metricField: 'Weight' },
          'body_fat': { name: 'Body Fat', icon: Scale, category: 'body-metrics', metricField: 'Body Fat' },
          'muscle_mass': { name: 'Muscle Mass', icon: Scale, category: 'body-metrics', metricField: 'Muscle Mass' },
          'body_temperature': { name: 'Body Temperature', icon: Thermometer, category: 'body-metrics', metricField: 'Body Temperature' },
          'oxygen_saturation': { name: 'Oxygen Saturation', icon: Gauge, category: 'body-metrics', metricField: 'Oxygen Saturation' },
          'mood_score': { name: 'Mood Score', icon: Smile, category: 'wellness', metricField: 'Mood Score' },
          'anxiety_level': { name: 'Anxiety Level', icon: Brain, category: 'wellness', metricField: 'Anxiety Level' },
          'productivity': { name: 'Productivity', icon: Brain, category: 'wellness', metricField: 'Productivity' },
          'meditation': { name: 'Meditation', icon: Brain, category: 'wellness', metricField: 'Meditation' },
          'outdoor_time': { name: 'Outdoor Time', icon: Activity, category: 'wellness', metricField: 'Outdoor Time' },
          'screen_time': { name: 'Screen Time', icon: Clock, category: 'wellness', metricField: 'Screen Time' }
        };
        
        const metricInfo = availableMetricsToAddLocal[id];
        if (!metricInfo) return null;

        const value = getMetricValue(id, metricInfo.category, todayData);
        const chartData = getMetricChartData(id, metricInfo.category);
        const unit = getMetricUnit(id, metricInfo.category);
        const color = getMetricColor(metricInfo.category);
        const bgColor = getMetricBgColor(metricInfo.category);
        
        // Calculate trend
        const values = chartData.map(d => d.value).filter(v => v !== null && v !== undefined && v > 0);
        const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        const current = value || 0;
        const diff = current - avg;
        const percent = avg > 0 ? Math.abs((diff / avg) * 100) : 0;
        const lowerIsBetter = ['nutrition', 'heart-health'].includes(metricInfo.category) || 
                             (metricInfo.category === 'wellness' && ['anxiety_level', 'screen_time'].includes(id));
        const trend = {
          direction: percent < 5 ? 'stable' : (diff > 0 ? 'up' : 'down'),
          percent: percent
        };

        // Determine source file
        const sourceMap = {
          'sleep': 'sleep.csv',
          'activity': 'activity.csv',
          'nutrition': 'nutrition.csv',
          'heart-health': 'vitals.csv',
          'body-metrics': 'vitals.csv',
          'wellness': 'wellness.csv'
        };

        return {
          id: id,
          name: metricInfo.name,
          icon: metricInfo.icon,
          color: color,
          bgColor: bgColor,
          borderColor: color,
          value: value || 0,
          unit: unit,
          source: sourceMap[metricInfo.category] || `${metricInfo.category}.csv`,
          category: metricInfo.category,
          metricField: metricInfo.metricField,
          trend: trend,
          chartData: chartData,
          description: value !== null && value !== undefined 
            ? `Current: ${typeof value === 'number' ? value.toFixed(unit === '%' || unit === '/10' ? 1 : unit === 'bpm' || unit === 'ms' ? 0 : 1) : value}${unit}`
            : 'No data available',
          hasAlert: false,
          hasInsight: false
        };
      })
      .filter(metric => metric !== null);

    setMetrics(filteredMetrics);
  }, [allHealthData, selectedDate, selectedMetricIds]);

  // Save to localStorage when selectedMetricIds changes
  useEffect(() => {
    localStorage.setItem('dashboardSelectedMetrics', JSON.stringify(selectedMetricIds));
  }, [selectedMetricIds]);

  const handleRemoveMetric = (metricId, e) => {
    e.stopPropagation();
    const newSelected = selectedMetricIds.filter(id => id !== metricId);
    setSelectedMetricIds(newSelected);
  };

  const handleAddMetric = (metricId) => {
    if (!selectedMetricIds.includes(metricId)) {
      const newSelected = [...selectedMetricIds, metricId];
      setSelectedMetricIds(newSelected);
    }
    setShowAddMetricModal(false);
  };

  const MetricCard = ({ metric, showRemove = true }) => {
    const Icon = metric.icon;
    const TrendIcon = metric.trend.direction === 'up' ? TrendingUp : 
                     metric.trend.direction === 'down' ? TrendingDown : Minus;
    // For metrics where lower is better (stress, sugar, heart rate), reverse the trend colors
    const lowerIsBetter = metric.category === 'nutrition' || 
                         metric.category === 'heart-health' || 
                         (metric.category === 'wellness' && metric.name === 'Stress Level');
    
    const trendColor = metric.trend.direction === 'up' 
      ? (lowerIsBetter ? theme.accent.danger : theme.accent.success)
      : metric.trend.direction === 'down'
      ? (lowerIsBetter ? theme.accent.success : theme.accent.danger)
      : theme.text.tertiary;

    return (
      <div
        className="relative rounded-xl p-4 border-l-4 transition-all hover:shadow-lg text-left"
        style={{
          backgroundColor: metric.bgColor,
          borderLeftColor: metric.borderColor,
          borderLeftWidth: '4px'
        }}
      >
        {/* Remove button - allow removal of any metric except when only 1 remains */}
        {showRemove && selectedMetricIds.length > 1 && metric.id && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRemoveMetric(metric.id, e);
            }}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-white hover:bg-opacity-50 transition-all z-10"
            style={{ color: theme.text.tertiary }}
            title="Remove metric"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        <button
          onClick={() => onMetricClick && onMetricClick(metric)}
          className="w-full text-left"
        >
        {/* Badges */}
        {metric.hasInsight && (
          <div className="absolute top-2 right-2">
            <span 
              className="px-2 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: theme.accent.purple }}
            >
              INSIGHT ACTIVE
            </span>
          </div>
        )}
        {metric.hasAlert && (
          <div className="absolute top-2 right-2">
            <span 
              className="px-2 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: theme.accent.danger }}
            >
              ALERT
            </span>
          </div>
        )}

        {/* Icon */}
        <div className="mb-3">
          <Icon className="w-6 h-6" style={{ color: metric.color }} />
        </div>

        {/* Title and Source */}
        <div className="mb-2">
          <p className="text-sm font-bold" style={{ color: theme.text.primary }}>
            {metric.name}
          </p>
          <span 
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ 
              backgroundColor: metric.color + '20',
              color: metric.color
            }}
          >
            {metric.source}
          </span>
        </div>

        {/* Value */}
        <p className="text-3xl font-bold mb-2" style={{ color: metric.color }}>
          {typeof metric.value === 'number' ? metric.value.toFixed(metric.unit === '/100' ? 0 : 1) : metric.value}
          <span className="text-lg">{metric.unit}</span>
        </p>

        {/* Trend */}
        <div className="flex items-center gap-2 mb-2">
          {metric.trend.direction !== 'stable' && (
            <>
              <TrendIcon className="w-4 h-4" style={{ color: trendColor }} />
              <span className="text-sm font-semibold" style={{ color: trendColor }}>
                {metric.trend.direction === 'up' ? '↑' : '↓'} {metric.trend.percent > 0 ? `${metric.trend.percent.toFixed(0)}%` : ''}
                {lowerIsBetter 
                  ? (metric.trend.direction === 'down' ? ' improved' : '')
                  : (metric.trend.direction === 'up' ? '' : '')}
              </span>
            </>
          )}
          {metric.trend.direction === 'stable' && (
            <span className="text-sm" style={{ color: theme.text.tertiary }}>
              → Stable
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs mb-3" style={{ color: theme.text.tertiary }}>
          {metric.description}
        </p>

        {/* Sparkline Chart */}
        {metric.chartData && metric.chartData.length > 0 && (
          <div className="h-12 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={metric.chartData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={metric.color} 
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                {metric.normalRange && (
                  <>
                    <ReferenceArea 
                      y1={metric.normalRange.min} 
                      y2={metric.normalRange.max} 
                      fill={theme.accent.success + '20'} 
                      fillOpacity={0.3}
                    />
                    <ReferenceLine 
                      y={metric.normalRange.min} 
                      stroke={theme.accent.success} 
                      strokeDasharray="2 2"
                      strokeWidth={1}
                    />
                    <ReferenceLine 
                      y={metric.normalRange.max} 
                      stroke={theme.accent.success} 
                      strokeDasharray="2 2"
                      strokeWidth={1}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Insight/Alert Footer */}
        {metric.hasInsight && (
          <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: theme.accent.purple }}>
            <Sparkles className="w-3 h-3" />
            <span>{metric.insightText}</span>
          </div>
        )}
        {metric.hasAlert && (
          <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: theme.accent.danger }}>
            <AlertTriangle className="w-3 h-3" />
            <span>{metric.alertText}</span>
          </div>
        )}
        {metric.goalBadge && (
          <div className="mt-2 text-xs" style={{ color: theme.text.tertiary }}>
            {metric.goalBadge}
          </div>
        )}
        </button>
      </div>
    );
  };

  // Add Metric Card
  const AddMetricCard = () => {
    return (
      <button
        onClick={() => setShowAddMetricModal(true)}
        className="relative rounded-xl p-4 border-2 border-dashed transition-all hover:shadow-lg hover:scale-[1.02] text-left flex flex-col items-center justify-center min-h-[200px]"
        style={{
          backgroundColor: '#F9FAFB',
          borderColor: theme.border.primary
        }}
      >
        <Plus className="w-8 h-8 mb-2" style={{ color: theme.text.tertiary }} />
        <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>
          Add Metric
        </p>
        <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>
          Click to customize
        </p>
      </button>
    );
  };

  // Available metrics for adding (all metrics except the default 3)
  const availableMetricsToAdd = {
    // Sleep metrics
    'sleep_duration': { name: 'Sleep Duration', icon: Moon, category: 'sleep' },
    'deep_sleep': { name: 'Deep Sleep', icon: Moon, category: 'sleep' },
    'rem_sleep': { name: 'REM Sleep', icon: Moon, category: 'sleep' },
    'sleep_efficiency': { name: 'Sleep Efficiency', icon: Moon, category: 'sleep' },
    
    // Activity metrics
    'workout_performance': { name: 'Workout Performance', icon: Dumbbell, category: 'activity' },
    'steps': { name: 'Steps', icon: Activity, category: 'activity' },
    'active_minutes': { name: 'Active Minutes', icon: Activity, category: 'activity' },
    'exercise_minutes': { name: 'Exercise Minutes', icon: Activity, category: 'activity' },
    'calories_burned': { name: 'Calories Burned', icon: Activity, category: 'activity' },
    'distance': { name: 'Distance', icon: Activity, category: 'activity' },
    'avg_heart_rate': { name: 'Avg Heart Rate', icon: Heart, category: 'activity' },
    'max_heart_rate': { name: 'Max Heart Rate', icon: Heart, category: 'activity' },
    'vo2_max': { name: 'VO2 Max', icon: Activity, category: 'activity' },
    
    // Nutrition metrics
    'sugar_intake': { name: 'Sugar Intake', icon: Candy, category: 'nutrition' },
    'calories': { name: 'Calories', icon: Apple, category: 'nutrition' },
    'protein': { name: 'Protein', icon: Apple, category: 'nutrition' },
    'carbs': { name: 'Carbs', icon: Apple, category: 'nutrition' },
    'fats': { name: 'Fats', icon: Apple, category: 'nutrition' },
    'fiber': { name: 'Fiber', icon: Apple, category: 'nutrition' },
    'caffeine_cups': { name: 'Caffeine Cups', icon: Coffee, category: 'nutrition' },
    'meals_count': { name: 'Meals Count', icon: Apple, category: 'nutrition' },
    
    // Heart Health metrics
    'resting_heart_rate': { name: 'Resting Heart Rate', icon: Heart, category: 'heart-health' },
    'hrv': { name: 'HRV', icon: Heart, category: 'heart-health' },
    'blood_pressure': { name: 'Blood Pressure', icon: Heart, category: 'heart-health' },
    'blood_pressure_diastolic': { name: 'Blood Pressure Diastolic', icon: Heart, category: 'heart-health' },
    
    // Body Metrics
    'weight': { name: 'Weight', icon: Scale, category: 'body-metrics' },
    'body_fat': { name: 'Body Fat', icon: Scale, category: 'body-metrics' },
    'muscle_mass': { name: 'Muscle Mass', icon: Scale, category: 'body-metrics' },
    'body_temperature': { name: 'Body Temperature', icon: Thermometer, category: 'body-metrics' },
    'oxygen_saturation': { name: 'Oxygen Saturation', icon: Gauge, category: 'body-metrics' },
    
    // Wellness metrics
    'mood_score': { name: 'Mood Score', icon: Smile, category: 'wellness' },
    'anxiety_level': { name: 'Anxiety Level', icon: Brain, category: 'wellness' },
    'productivity': { name: 'Productivity', icon: Brain, category: 'wellness' },
    'meditation': { name: 'Meditation', icon: Brain, category: 'wellness' },
    'outdoor_time': { name: 'Outdoor Time', icon: Activity, category: 'wellness' },
    'screen_time': { name: 'Screen Time', icon: Clock, category: 'wellness' }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: theme.text.primary }}>
            Key Metrics
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric, idx) => (
            <MetricCard key={metric.id || idx} metric={metric} showRemove={true} />
          ))}
          {metrics.length < 6 && <AddMetricCard />}
        </div>
      </div>

      {/* Add Metric Modal */}
      {showAddMetricModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowAddMetricModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
            style={{ borderColor: theme.border.primary, borderWidth: '1px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.primary }}>
              <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>
                Add Metric
              </h2>
              <button onClick={() => setShowAddMetricModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" style={{ color: theme.text.secondary }} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-sm mb-4" style={{ color: theme.text.secondary }}>
                Select a metric to add to your dashboard:
              </p>
              
              {/* Group metrics by category */}
              {(() => {
                const availableMetrics = Object.entries(availableMetricsToAdd)
                  .filter(([id]) => !selectedMetricIds.includes(id));
                
                if (availableMetrics.length === 0) {
                  return (
                    <p className="text-sm text-center py-4" style={{ color: theme.text.tertiary }}>
                      All available metrics have been added
                    </p>
                  );
                }
                
                // Group by category
                const grouped = availableMetrics.reduce((acc, [id, metricInfo]) => {
                  const category = metricInfo.category;
                  if (!acc[category]) {
                    acc[category] = [];
                  }
                  acc[category].push([id, metricInfo]);
                  return acc;
                }, {});
                
                const categoryLabels = {
                  'sleep': 'Sleep',
                  'activity': 'Activity',
                  'nutrition': 'Nutrition',
                  'heart-health': 'Heart Health',
                  'body-metrics': 'Body Metrics',
                  'wellness': 'Wellness'
                };
                
                return (
                  <div className="space-y-4">
                    {Object.entries(grouped).map(([category, metrics]) => (
                      <div key={category}>
                        <h3 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: theme.text.tertiary }}>
                          {categoryLabels[category] || category}
                        </h3>
                        <div className="space-y-2">
                          {metrics.map(([id, metricInfo]) => {
                            const Icon = metricInfo.icon;
                            return (
                              <button
                                key={id}
                                onClick={() => handleAddMetric(id)}
                                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-all text-left"
                                style={{ borderColor: theme.border.primary }}
                              >
                                <Icon className="w-5 h-5" style={{ color: theme.accent.primary }} />
                                <div className="flex-1">
                                  <p className="font-medium text-sm" style={{ color: theme.text.primary }}>
                                    {metricInfo.name}
                                  </p>
                                </div>
                                <Plus className="w-4 h-4" style={{ color: theme.text.tertiary }} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KeyMetricsGrid;

