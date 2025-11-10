// Timeline Tab - Multi-layer timeline view with time range selector
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Calendar, ZoomIn, ZoomOut, Download, Plus, Layers, Link2, Settings, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area } from 'recharts';
import TabNavigation, { PageHeader } from '../components/TabNavigation';
import CalendarModal from '../components/modals/CalendarModal';
import AnnotationModal from '../components/modals/AnnotationModal';
import SwimLanesTimeline from '../components/SwimLanesTimeline';
import MetricSelector, { PRESETS } from '../components/MetricSelector';
import { getAvailableDates, getDataForDate } from '../utils/dataLoader';
import { getAllMetrics } from '../utils/correlationAnalysis';
import { getMultiLayerTimeline } from '../utils/analyzeData';
import { generateWeeklySummary } from '../utils/aiInsights';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, differenceInDays, startOfDay, endOfDay, eachHourOfInterval } from 'date-fns';

const theme = {
  background: {
    primary: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #fef3c7 100%)',
    card: '#ffffff',
  },
  border: {
    primary: '#bae6fd',
  },
  text: {
    primary: '#0c4a6e',
    secondary: '#334155',
  },
  accent: {
    primary: '#0ea5e9',
  }
};

const TimelineTab = ({ allHealthData, onOpenSettings }) => {
  const [timeRange, setTimeRange] = useState('week');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showAnnotation, setShowAnnotation] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  // Removed visibleLayers - using metric selector instead
  const [showCorrelations] = useState(true); // Always show AI correlations (light hints only)
  // Load dashboard metrics from localStorage as default, fallback to overview preset
  const [selectedMetrics, setSelectedMetrics] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboardSelectedMetrics');
      if (saved) {
        const dashboardMetricIds = JSON.parse(saved);
        // Convert dashboard metric IDs to timeline metric field names
        const idToFieldMap = {
          'sleep_quality': 'sleep_quality_score',
          'energy_level': 'energy_level',
          'stress_level': 'stress_level',
          'sugar_intake': 'sugar_afternoon_g', // or 'sugar_g'
          'workout_performance': 'workout_performance_rating',
          'resting_heart_rate': 'resting_heart_rate',
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
        const mappedMetrics = dashboardMetricIds
          .map(id => idToFieldMap[id])
          .filter(metric => metric !== undefined);
        if (mappedMetrics.length > 0) {
          return mappedMetrics;
        }
      }
    } catch (e) {
      console.error('Error loading dashboard metrics:', e);
    }
    return PRESETS.overview.metrics || [];
  });
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [timelineData, setTimelineData] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [periodSummary, setPeriodSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [viewMode, setViewMode] = useState('swimlanes'); // 'swimlanes' or 'chart'
  const [eventMarkers, setEventMarkers] = useState([]);
  const [showMetricSelector, setShowMetricSelector] = useState(false);
  
  // Get user name from profile
  const getUserName = () => {
    try {
      const saved = localStorage.getItem('profile_personal_info');
      if (saved) {
        const personalInfo = JSON.parse(saved);
        return personalInfo.name || null;
      }
    } catch (e) {
      console.error('Error loading user name:', e);
    }
    return null;
  };
  const [currentPreset, setCurrentPreset] = useState(() => {
    // Check if we're using dashboard metrics
    try {
      const saved = localStorage.getItem('dashboardSelectedMetrics');
      if (saved) {
        return 'dashboard';
      }
    } catch (e) {
      // Ignore errors
    }
    return 'dashboard'; // Default to dashboard
  });
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [timingEvents, setTimingEvents] = useState([]); // Caffeine, meals, workouts, bedtime
  const chartRef = useRef(null);

  // Helper function to get unit for a metric
  const getUnitForMetric = (metricName, metricLabel) => {
    const name = (metricName || '').toLowerCase();
    const label = (metricLabel || '').toLowerCase();
    const fullName = name || label;
    
    // Activity metrics
    if (fullName.includes('steps') || fullName.includes('floors_climbed') || 
        fullName.includes('meals_count') || fullName.includes('social_interactions') ||
        fullName.includes('awakenings')) {
      return '';
    } else if (fullName.includes('distance_km') || fullName.includes('distance')) {
      return 'km';
    } else if (fullName.includes('calories_burned') || fullName.includes('calories') ||
               fullName.includes('breakfast_calories') || fullName.includes('lunch_calories') ||
               fullName.includes('dinner_calories') || fullName.includes('snacks_calories')) {
      return 'cal';
    } else if (fullName.includes('active_minutes') || fullName.includes('exercise_minutes') ||
               fullName.includes('meditation_minutes') || fullName.includes('screen_time_before_bed_minutes') ||
               fullName.includes('wake_time_consistency_minutes') || fullName.includes('bedtime_consistency_minutes')) {
      return 'min';
    } else if (fullName.includes('workout_start_time') || fullName.includes('workout_end_time') ||
               fullName.includes('caffeine_last_time') || fullName.includes('breakfast_time') ||
               fullName.includes('lunch_time') || fullName.includes('dinner_time') ||
               fullName.includes('bedtime') || fullName.includes('wake_time') ||
               (fullName.includes('time') && !fullName.includes('minutes') && !fullName.includes('hours'))) {
      return 'hrs';
    } else if (fullName.includes('heart_rate') || fullName.includes('bpm')) {
      return 'bpm';
    } else if (fullName.includes('hrv_ms') || fullName.includes('hrv')) {
      return 'ms';
    } else if (fullName.includes('vo2_max') || fullName.includes('vo2')) {
      return 'ml/kg/min';
    } else if (fullName.includes('sleep_duration') || fullName.includes('deep_sleep_hours') ||
               fullName.includes('rem_sleep_hours') || fullName.includes('outdoor_time_hours') ||
               fullName.includes('screen_time_hours')) {
      return 'hrs';
    } else if (fullName.includes('sleep_efficiency') || fullName.includes('deep_sleep_percent') ||
               fullName.includes('rem_sleep_percent') || fullName.includes('body_fat_percent') ||
               fullName.includes('oxygen_saturation') || fullName.includes('efficiency')) {
      return '%';
    } else if (fullName.includes('sodium_mg') || fullName.includes('sodium')) {
      return 'mg';
    } else if (fullName.includes('sugar_g') || fullName.includes('protein_g') ||
               fullName.includes('carbs_g') || fullName.includes('fats_g') ||
               fullName.includes('fiber_g') || fullName.includes('_g') ||
               (fullName.includes('sugar') && !fullName.includes('score')) ||
               (fullName.includes('protein') && !fullName.includes('score')) ||
               (fullName.includes('carbs') && !fullName.includes('score')) ||
               (fullName.includes('fats') && !fullName.includes('score')) ||
               (fullName.includes('fiber') && !fullName.includes('score'))) {
      return 'g';
    } else if (fullName.includes('caffeine_cups') || fullName.includes('cups') ||
               fullName.includes('water_glasses')) {
      return 'cups';
    } else if (fullName.includes('alcohol_units') || fullName.includes('alcohol')) {
      return 'units';
    } else if (fullName.includes('weight_kg') || fullName.includes('muscle_mass_kg') ||
               fullName.includes('weight') || fullName.includes('muscle_mass')) {
      return 'kg';
    } else if (fullName.includes('blood_pressure_systolic') || fullName.includes('blood_pressure_diastolic') ||
               fullName.includes('blood_pressure')) {
      return 'mmHg';
    } else if (fullName.includes('body_temperature_c') || fullName.includes('temperature')) {
      return '°C';
    } else if (fullName.includes('stress_level') || fullName.includes('energy_level') ||
               fullName.includes('mood_score') || fullName.includes('anxiety_level') ||
               fullName.includes('productivity_score') || fullName.includes('sleep_quality_score') ||
               fullName.includes('workout_performance_rating') || fullName.includes('_level') ||
               fullName.includes('_score') || fullName.includes('level') ||
               fullName.includes('score') || fullName.includes('rating')) {
      return '/10';
    }
    
    return '';
  };

  // Load available metrics
  useEffect(() => {
    if (allHealthData) {
      try {
        const metrics = getAllMetrics(allHealthData);
        setAvailableMetrics(metrics || []);
        
        // Initialize with default preset if not already set
        if (!selectedMetrics || selectedMetrics.length === 0) {
          setSelectedMetrics(PRESETS.overview.metrics || []);
        }
      } catch (error) {
        console.error('Error loading metrics:', error);
        setAvailableMetrics([]);
        setSelectedMetrics(PRESETS.overview.metrics || []);
      }
    }
  }, [allHealthData]);

  useEffect(() => {
    if (allHealthData) {
      updateTimeRange();
    }
  }, [timeRange, allHealthData]);

  // Generate AI summary when date range changes
  useEffect(() => {
    if (allHealthData && startDate && endDate) {
      const generateSummary = async () => {
        setSummaryLoading(true);
        setPeriodSummary(null);
        try {
          const userName = getUserName();
          const summary = await generateWeeklySummary(
            allHealthData, 
            format(endDate, 'yyyy-MM-dd'),
            format(startDate, 'yyyy-MM-dd'),
            userName
          );
          setPeriodSummary(summary);
        } catch (error) {
          console.error('Error generating summary:', error);
        } finally {
          setSummaryLoading(false);
        }
      };
      generateSummary();
    }
  }, [allHealthData, startDate, endDate]);

  // Generate timing events (caffeine, meals, workouts, bedtime)
  useEffect(() => {
    if (!allHealthData || !startDate || !endDate) return;
    
    const events = [];
    const dates = getAvailableDates(allHealthData);
    const filteredDates = dates.filter(date => {
      const d = new Date(date);
      return d >= startDate && d <= endDate;
    });
    
    filteredDates.forEach(date => {
      const dayData = getDataForDate(allHealthData, date);
      
      // Caffeine timing
      if (dayData.nutrition?.caffeine_last_time) {
        events.push({
          date,
          type: 'caffeine',
          time: dayData.nutrition.caffeine_last_time,
          metric: 'caffeine_last_time',
          icon: '☕',
          label: 'Caffeine'
        });
      }
      
      // Last meal time
      if (dayData.nutrition?.last_meal_time) {
        events.push({
          date,
          type: 'meal',
          time: dayData.nutrition.last_meal_time,
          metric: 'last_meal_time',
          icon: '🍽️',
          label: 'Last Meal'
        });
      }
      
      // Workout timing
      if (dayData.activity?.workout_time) {
        events.push({
          date,
          type: 'workout',
          time: dayData.activity.workout_time,
          metric: 'workout_time',
          icon: dayData.activity.workout_type === 'strength' ? '🏋️' : '🏃',
          label: 'Workout'
        });
      }
      
      // Bedtime
      if (dayData.sleep?.bedtime) {
        events.push({
          date,
          type: 'bedtime',
          time: dayData.sleep.bedtime,
          metric: 'bedtime',
          icon: '🛏️',
          label: 'Bedtime'
        });
      }
      
      // Binary events
      if (dayData.nutrition?.medication_taken) {
        events.push({
          date,
          type: 'medication',
          metric: 'medication_taken',
          icon: '💊',
          label: 'Medication'
        });
      }
      
      if (dayData.nutrition?.alcohol_consumed) {
        events.push({
          date,
          type: 'alcohol',
          metric: 'alcohol_consumed',
          icon: '🍷',
          label: 'Alcohol'
        });
      }
      
      if (dayData.wellness?.meditation_minutes > 0) {
        events.push({
          date,
          type: 'meditation',
          metric: 'meditation_minutes',
          icon: '🧘',
          label: 'Meditation'
        });
      }
      
      // Screen time before bed (important for sleep pattern)
      if (dayData.wellness?.screen_time_before_bed_minutes) {
        events.push({
          date,
          type: 'screen_time',
          metric: 'screen_time_before_bed_minutes',
          icon: '📱',
          label: 'Screen Time'
        });
      }
    });
    
    setTimingEvents(events);
  }, [allHealthData, startDate, endDate]);

  // Get multi-layer timeline data
  useEffect(() => {
    if (allHealthData && startDate && endDate) {
      let data = null;
      try {
        // Ensure selectedMetrics is initialized
        if (!selectedMetrics || !Array.isArray(selectedMetrics) || selectedMetrics.length === 0) {
          const defaultMetrics = PRESETS.overview.metrics || [];
          setSelectedMetrics(defaultMetrics);
          setTimelineData({ layers: [], correlations: [] });
          setEventMarkers([]);
          return;
        }
        
        // Validate selected metrics against available metrics
        const allAvailableMetrics = getAllMetrics(allHealthData);
        const availableMetricNames = allAvailableMetrics.map(m => m.name);
        const validSelectedMetrics = selectedMetrics.filter(metricName => 
          availableMetricNames.includes(metricName)
        );
        
        // If no valid metrics, use default
        if (validSelectedMetrics.length === 0) {
          const defaultMetrics = PRESETS.overview.metrics || [];
          setSelectedMetrics(defaultMetrics);
          setTimelineData({ layers: [], correlations: [] });
          setEventMarkers([]);
          return;
        }
        
        // Update selectedMetrics if some were invalid
        if (validSelectedMetrics.length !== selectedMetrics.length) {
          setSelectedMetrics(validSelectedMetrics);
        }
        
        const metricsToShow = getMetricsForZoomLevel();
        if (!metricsToShow || metricsToShow.length === 0) {
          setTimelineData({ layers: [], correlations: [] });
          setEventMarkers([]);
          return;
        }
        
        // Filter metricsToShow to only include valid ones
        const validMetricsToShow = metricsToShow.filter(metricName => 
          availableMetricNames.includes(metricName)
        );
        
        if (validMetricsToShow.length === 0) {
          setTimelineData({ layers: [], correlations: [] });
          setEventMarkers([]);
          return;
        }
        
        data = getMultiLayerTimeline(allHealthData, validMetricsToShow, {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd')
        });
        
        if (!data || !data.layers || data.layers.length === 0) {
          // No timeline data generated
        }
        
        setTimelineData(data || { layers: [], correlations: [] });
      } catch (error) {
        console.error('Error generating timeline data:', error);
        setTimelineData({ layers: [], correlations: [] });
        setEventMarkers([]);
        return;
      }
      
      // Generate event markers (anomalies, insights, etc.)
      const markers = [];
      if (data && data.layers && data.layers.length > 0) {
        data.layers.forEach(layer => {
          if (!layer || !layer.data || !Array.isArray(layer.data)) return;
          const values = layer.data.map(d => d?.value).filter(v => v !== null && v !== undefined);
          if (values.length === 0) return;
          
          const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
          const std = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length) || 1;
          
          layer.data.forEach((point) => {
            if (point && point.value !== null && point.value !== undefined && Math.abs(point.value - avg) > 2 * std) {
              markers.push({
                date: point.date,
                metric: layer.metric,
                type: 'anomaly',
                icon: '⚠️',
                label: `Unusual ${layer.label || layer.metric} value`
              });
            }
          });
        });
      }
      
      // Add timing events as markers
      if (timingEvents && Array.isArray(timingEvents)) {
        timingEvents.forEach(event => {
          if (event && event.date) {
            markers.push({
              date: event.date,
              metric: event.metric,
              type: event.type,
              icon: event.icon,
              label: event.label,
              time: event.time
            });
          }
        });
      }
      
      setEventMarkers(markers);
      
      // Generate chart data from timeline layers
      if (data && data.layers && data.layers.length > 0 && data.layers[0] && data.layers[0].data) {
        // Parse date string as local date to avoid timezone issues
        const parseLocalDate = (dateStr) => {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day);
        };
        
        const dates = data.layers[0].data.map(d => d?.date).filter(d => d);
        const chartDataPoints = dates.map((date, idx) => {
          const point = {
            date: format(parseLocalDate(date), 'MMM dd'),
            fullDate: date
          };
          
          if (data.layers) {
            data.layers.forEach(layer => {
              if (!layer || !layer.data || !Array.isArray(layer.data)) return;
              const value = layer.data[idx]?.value;
              if (value !== null && value !== undefined) {
                // Normalize values for display
                if (layer.category === 'activity' && layer.metric && layer.metric.includes('steps')) {
                  point[layer.metric] = value / 1000; // Steps in thousands
                } else if (layer.category === 'nutrition' && layer.metric && layer.metric.includes('calories')) {
                  point[layer.metric] = value / 10; // Calories in hundreds
                } else {
                  point[layer.metric] = value;
                }
              }
            });
          }
          
          return point;
        });
        
        setChartData(chartDataPoints);
      } else {
        setChartData([]);
      }
    }
  }, [allHealthData, startDate, endDate, selectedMetrics, timeRange, timingEvents]);

  // Check if current date range matches a standard range
  const detectTimeRange = (start, end) => {
    // Check if it's a single day
    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      const dayStart = startOfDay(start);
      const dayEnd = endOfDay(start);
      if (format(start, 'yyyy-MM-dd') === format(dayStart, 'yyyy-MM-dd') &&
          format(end, 'yyyy-MM-dd') === format(dayEnd, 'yyyy-MM-dd')) {
        return 'day';
      }
    }
    
    // Check if it's a week (7 days, starting Monday)
    const weekStart = startOfWeek(end, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(end, { weekStartsOn: 1 });
    if (format(start, 'yyyy-MM-dd') === format(weekStart, 'yyyy-MM-dd') &&
        format(end, 'yyyy-MM-dd') === format(weekEnd, 'yyyy-MM-dd')) {
      return 'week';
    }
    
    // Check if it's a month (full month)
    const monthStart = startOfMonth(end);
    const monthEnd = endOfMonth(end);
    if (format(start, 'yyyy-MM-dd') === format(monthStart, 'yyyy-MM-dd') &&
        format(end, 'yyyy-MM-dd') === format(monthEnd, 'yyyy-MM-dd')) {
      return 'month';
    }
    
    // Otherwise it's custom
    return 'custom';
  };

  const updateTimeRange = () => {
    const today = new Date('2025-11-09');
    let start, end;

    switch (timeRange) {
      case 'day':
        start = startOfDay(today);
        end = endOfDay(today);
        break;
      case 'week':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'year':
        start = subDays(today, 365);
        end = today;
        break;
      default:
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
    }

    setStartDate(start);
    setEndDate(end);
    generateChartData(start, end);
  };

  // Get metrics to show based on zoom level
  const getMetricsForZoomLevel = () => {
    if (selectedMetrics.length === 0) return PRESETS.overview.metrics;
    
    // For month view, limit to 4 most important metrics
    if (timeRange === 'month') {
      return selectedMetrics.slice(0, 4);
    }
    
    // For day view, show all selected (up to 6)
    if (timeRange === 'day') {
      return selectedMetrics.slice(0, 6);
    }
    
    // For week view (default), show 6 metrics
    return selectedMetrics.slice(0, 6);
  };

  const generateChartData = (start, end) => {
    // Chart data is now generated from timelineData in useEffect
    // This function is kept for compatibility but logic moved to useEffect
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleExport = () => {
    if (!chartData || !Array.isArray(chartData) || chartData.length === 0) {
      alert('No data to export');
      return;
    }
    
    const selectedData = selectedPeriod 
      ? (chartData || []).filter(d => {
          if (!d || !d.fullDate) return false;
          const date = parseISO(d.fullDate);
          return date >= selectedPeriod.start && date <= selectedPeriod.end;
        })
      : (chartData || []);
    
    const csv = [
      ['Date', 'Sleep (hrs)', 'Steps', 'Calories', 'Heart Rate', 'Energy', 'Mood'],
      ...selectedData.map(d => [
        d?.fullDate || '',
        d?.sleep || '',
        d?.steps ? (d.steps * 1000) : '',
        d?.calories ? (d.calories * 10) : '',
        d?.heartRate || '',
        d?.energy || '',
        d?.mood || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-timeline-${selectedPeriod ? 'selected' : timeRange}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: theme.background.primary }}>
      <PageHeader title="Timeline" onOpenSettings={onOpenSettings} allHealthData={allHealthData} />
      
      <div className="px-4 py-6 space-y-4 max-w-7xl mx-auto">
        {/* Time Range Selector */}
        <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {['day', 'week', 'month', 'custom'].map(range => {
                // Only show custom if it's actually custom
                if (range === 'custom' && timeRange !== 'custom') return null;
                return (
                  <button
                    key={range}
                    onClick={() => {
                      if (range !== 'custom') {
                        setTimeRange(range);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      timeRange === range ? 'text-white' : ''
                    }`}
                    style={{
                      backgroundColor: timeRange === range ? theme.accent.primary : 'transparent',
                      color: timeRange === range ? 'white' : theme.text.secondary
                    }}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                );
              })}
            </div>
            
            {/* Metric Selector Button */}
            <button
              onClick={() => setShowMetricSelector(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">
                {PRESETS[currentPreset]?.name || 'Customize Metrics'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalendar(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
            >
              <Calendar className="w-4 h-4" />
              <span>{format(startDate, 'MMM dd')} - {format(endDate, 'MMM dd')}</span>
            </button>
            <button
              onClick={handleExport}
              className="p-2 rounded-lg border"
              style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multi-Layer Chart - Swim Lanes */}
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: theme.text.primary }}>
              Multi-Layer Timeline
            </h2>
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 border rounded-lg p-1" style={{ borderColor: theme.border.primary }}>
                <button
                  onClick={() => setViewMode('swimlanes')}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'swimlanes' ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: viewMode === 'swimlanes' ? theme.accent.primary : 'transparent',
                    color: viewMode === 'swimlanes' ? 'white' : theme.text.secondary
                  }}
                >
                  Swim Lanes
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === 'chart' ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: viewMode === 'chart' ? theme.accent.primary : 'transparent',
                    color: viewMode === 'chart' ? 'white' : theme.text.secondary
                  }}
                >
                  Chart
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            {/* Chart Area */}
            <div 
              className="flex-1 relative"
              ref={chartRef}
            >
              
              {!allHealthData ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: theme.text.primary }}>
                    Loading Health Data...
                  </h3>
                  <p className="text-sm" style={{ color: theme.text.secondary }}>
                    Please wait while we load your health data
                  </p>
                </div>
              ) : timelineData && timelineData.layers && timelineData.layers.length > 0 ? (
                <>
                  {viewMode === 'swimlanes' ? (
                    <div className="py-4">
                      <SwimLanesTimeline
                        layers={timelineData.layers || []}
                        dates={(timelineData.layers && timelineData.layers[0]?.data ? timelineData.layers[0].data.map(d => d?.date).filter(d => d) : [])}
                        correlations={timelineData.correlations || []}
                        showCorrelations={showCorrelations}
                        onDateClick={(date, layer) => {
                          const point = layer.data.find(d => d.date === date);
                          setSelectedPoint({
                            date,
                            layer,
                            value: point?.value
                          });
                        }}
                        selectedRange={selectedPeriod}
                        eventMarkers={eventMarkers}
                        timingEvents={timingEvents}
                        zoomLevel={timeRange}
                      />
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={Math.max(400, (timelineData.layers?.length || 1) * 120)} minWidth={0} minHeight={0}>
                        <LineChart data={chartData || []} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#bae6fd" />
                        <XAxis dataKey="date" stroke={theme.text.secondary} />
                        
                        {/* Group layers by unit to determine Y-axes */}
                        {(() => {
                          const layersByUnit = {};
                          (timelineData.layers || []).forEach(layer => {
                            if (!layer || !layer.category) return;
                            const unit = getUnitForMetric(layer.metric, layer.label);
                            if (!layersByUnit[unit]) {
                              layersByUnit[unit] = [];
                            }
                            layersByUnit[unit].push(layer);
                          });
                          
                          // Sort unit groups by number of layers (most common first)
                          // Filter out empty units and "/10" from Y-axis labels (show in legend/tooltip instead)
                          const unitGroups = Object.keys(layersByUnit)
                            .filter(unit => unit && unit !== '/10') // Don't show empty or /10 on Y-axis
                            .sort((a, b) => 
                              layersByUnit[b].length - layersByUnit[a].length
                            );
                          const hasMultipleUnits = unitGroups.length > 1;
                          
                          // For more than 2 unit types, we'll use left for first, right for second, and left for rest
                          // This is a simplification - in practice, most charts will have 1-2 unit types
                          
                          return (
                            <>
                              {/* Left Y-axis for first unit group */}
                              {unitGroups.length > 0 && (
                                <YAxis 
                                  yAxisId="left" 
                                  stroke={theme.text.secondary}
                                  label={{ 
                                    value: unitGroups[0] ? `(${unitGroups[0]})` : '', 
                                    angle: -90, 
                                    position: 'insideLeft',
                                    style: { textAnchor: 'middle', fill: theme.text.secondary, fontSize: '12px' }
                                  }}
                                />
                              )}
                              
                              {/* Right Y-axis for second unit group if multiple units */}
                              {hasMultipleUnits && unitGroups.length > 1 && (
                                <YAxis 
                                  yAxisId="right" 
                                  orientation="right"
                                  stroke={theme.text.secondary}
                                  label={{ 
                                    value: unitGroups[1] ? `(${unitGroups[1]})` : '', 
                                    angle: 90, 
                                    position: 'insideRight',
                                    style: { textAnchor: 'middle', fill: theme.text.secondary, fontSize: '12px' }
                                  }}
                                />
                              )}
                              
                              {/* If no meaningful units, show a default left Y-axis without label */}
                              {unitGroups.length === 0 && (
                                <YAxis 
                                  yAxisId="left" 
                                  stroke={theme.text.secondary}
                                />
                              )}
                              
                              {/* Render each layer as a separate line with appropriate Y-axis */}
                              {(timelineData.layers || []).map((layer, idx) => {
                                if (!layer || !layer.category) return null;
                                
                                const unit = getUnitForMetric(layer.metric, layer.label);
                                // Assign to right axis only if it's the second most common unit type
                                // All others (including /10 and empty) go to left axis
                                // For /10 and empty units, use left axis
                                const yAxisId = hasMultipleUnits && unit === unitGroups[1] ? 'right' : 'left';
                                
                                const colors = {
                                  sleep: '#8b5cf6',
                                  activity: '#10b981',
                                  nutrition: '#f97316',
                                  vitals: '#ef4444',
                                  wellness: '#0ea5e9'
                                };
                                
                                // Add unit to label if multiple units exist
                                const displayName = hasMultipleUnits 
                                  ? `${layer.label} (${unit || 'no unit'})`
                                  : layer.label;
                                
                                return (
                                  <Line
                                    key={layer.metric}
                                    yAxisId={yAxisId}
                                    type="monotone"
                                    dataKey={layer.metric}
                                    stroke={colors[layer.category] || '#6b7280'}
                                    strokeWidth={2}
                                    name={displayName}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                  />
                                );
                              })}
                            </>
                          );
                        })()}
                        
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: theme.border.primary }}
                          cursor={{ stroke: theme.accent.primary, strokeWidth: 2 }}
                          onClick={(data) => {
                            if (data && data.activePayload) {
                              setSelectedPoint({
                                date: data.activePayload[0]?.payload?.fullDate,
                                values: data.activePayload
                              });
                            }
                          }}
                          formatter={(value, name) => {
                            // Find the layer to get unit
                            const layer = (timelineData.layers || []).find(l => 
                              l && (l.metric === name || l.label === name || name.includes(l.label))
                            );
                            if (layer) {
                              const unit = getUnitForMetric(layer.metric, layer.label);
                              return [`${typeof value === 'number' ? value.toFixed(1) : value}${unit ? ' ' + unit : ''}`, layer.label];
                            }
                            return [value, name];
                          }}
                        />
                        <Legend />
                        </LineChart>
                      </ResponsiveContainer>
                      
                      {/* Correlation legend for chart view */}
                      {showCorrelations && timelineData.correlations && Array.isArray(timelineData.correlations) && timelineData.correlations.length > 0 && (
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
                            {timelineData.correlations.slice(0, 5).filter(corr => {
                              if (!corr) return false;
                              const layer1 = (timelineData.layers || []).find(l => l && l.metric === corr.metric1);
                              const layer2 = (timelineData.layers || []).find(l => l && l.metric === corr.metric2);
                              return layer1 && layer2;
                            }).map((corr, idx) => {
                              if (!corr) return null;
                              const layer1 = (timelineData.layers || []).find(l => l && l.metric === corr.metric1);
                              const layer2 = (timelineData.layers || []).find(l => l && l.metric === corr.metric2);
                              if (!layer1 || !layer2) return null;
                              const isPositive = corr.correlation > 0;
                              
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
                                  {' '}(r={corr.correlation?.toFixed(2) || '0.00'})
                                  {corr.lag > 0 && ` [${corr.lag}d]`}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-6xl mb-4">📈</div>
                  <h3 className="text-xl font-bold mb-2" style={{ color: theme.text.primary }}>
                    No Timeline Data Available
                  </h3>
                  <p className="text-sm mb-4" style={{ color: theme.text.secondary }}>
                    {selectedMetrics && selectedMetrics.length === 0 
                      ? 'Please select metrics to display using the "Customize Metrics" button above.'
                      : `No data found for the selected time range (${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}).`
                    }
                  </p>
                  <button
                    onClick={() => setShowMetricSelector(true)}
                    className="px-4 py-2 rounded-lg font-medium transition-all"
                    style={{ backgroundColor: theme.accent.primary, color: 'white' }}
                  >
                    Customize Metrics
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Selected Point Info */}
        {selectedPoint && selectedPoint.values && Array.isArray(selectedPoint.values) && (
          <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: theme.text.primary }}>
              Data Point: {selectedPoint.date ? format(new Date(selectedPoint.date), 'MMM dd, yyyy') : 'Unknown'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {selectedPoint.values.map((payload, idx) => {
                if (!payload) return null;
                return (
                  <div key={idx} className="p-3 rounded-lg border" style={{ borderColor: theme.border.primary }}>
                    <p className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                      {payload.name || 'Unknown'}
                    </p>
                    <p className="text-xl font-bold" style={{ color: theme.accent.primary }}>
                      {typeof payload.value === 'number' ? payload.value.toFixed(1) : payload.value || 'N/A'}
                    </p>
                  </div>
                );
              })}
            </div>
            
            {/* Show related correlations */}
            {timelineData && timelineData.correlations && selectedPoint && selectedPoint.values && Array.isArray(selectedPoint.values) && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text.secondary }}>
                  Related Correlations:
                </h4>
                <div className="space-y-1">
                  {(timelineData.correlations || [])
                    .filter(corr => corr && selectedPoint.values.some(v => 
                      v && (v.dataKey === corr.metric1 || v.dataKey === corr.metric2)
                    ))
                    .slice(0, 3)
                    .map((corr, idx) => {
                      if (!corr) return null;
                      const layer1 = (timelineData.layers || []).find(l => l && l.metric === corr.metric1);
                      const layer2 = (timelineData.layers || []).find(l => l && l.metric === corr.metric2);
                      
                      return (
                        <div key={idx} className="text-sm p-2 rounded" style={{ backgroundColor: '#f0f9ff' }}>
                          {layer1?.label || corr.metric1} → {layer2?.label || corr.metric2}
                          {' '}(r={corr.correlation?.toFixed(2) || '0.00'})
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Range Info and AI Summary Panel */}
        {startDate && endDate && timelineData && timelineData.layers && timelineData.layers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ color: theme.text.primary }}>
                  Date Range
                </h3>
                <p className="text-sm" style={{ color: theme.text.secondary }}>
                  {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
                  {' '}({differenceInDays(endDate, startDate) + 1} days)
                </p>
              </div>
            </div>
            
            {/* All Metrics for Date Range */}
            {chartData && Array.isArray(chartData) && chartData.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>
                  Metrics Summary:
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(timelineData?.layers || []).map((layer) => {
                    if (!layer || !layer.metric) return null;
                    const selectedData = (chartData || []).filter(d => {
                      if (!d || !d.fullDate) return false;
                      const date = parseISO(d.fullDate);
                      return date >= startDate && date <= endDate;
                    });
                    const values = selectedData.map(d => d?.[layer.metric]).filter(v => v !== undefined && v !== null);
                    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                    
                    return (
                      <div key={layer.metric} className="p-2 rounded-lg border" style={{ borderColor: theme.border.primary }}>
                        <p className="text-xs" style={{ color: theme.text.secondary }}>{layer.label}</p>
                        <p className="text-lg font-bold" style={{ color: theme.text.primary }}>
                          {avg.toFixed(1)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* AI Summary */}
            {summaryLoading ? (
              <div className="mb-4 p-4 rounded-lg relative overflow-hidden" style={{ backgroundColor: '#f0f9ff', minHeight: '120px' }}>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text.primary }}>
                  <Layers className="w-4 h-4" />
                  AI Summary:
                </h4>
                {/* Animated shimmer background */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" 
                       style={{
                         backgroundSize: '200% 100%',
                         animation: 'shimmer 2s infinite'
                       }}></div>
                </div>
                
                <div className="relative z-10 space-y-2">
                  {/* Skeleton lines */}
                  <div className="h-3 bg-white bg-opacity-40 rounded w-full animate-pulse"></div>
                  <div className="h-3 bg-white bg-opacity-40 rounded w-5/6 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="h-3 bg-white bg-opacity-40 rounded w-4/6 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  <div className="h-3 bg-white bg-opacity-40 rounded w-3/4 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                  
                  {/* Loading indicator */}
                  <div className="flex items-center gap-2 mt-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="text-xs" style={{ color: theme.text.secondary }}>Analyzing your health patterns...</span>
                  </div>
                </div>
                
                <style>{`
                  @keyframes shimmer {
                    0% {
                      transform: translateX(-100%);
                    }
                    100% {
                      transform: translateX(100%);
                    }
                  }
                `}</style>
              </div>
            ) : periodSummary ? (
              <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: theme.text.primary }}>
                  <Layers className="w-4 h-4" />
                  AI Summary:
                </h4>
                <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: theme.text.secondary }}>
                  {periodSummary.summary?.replace(/\*\*(.*?)\*\*/g, '$1') || periodSummary.summary}
                </p>
              </div>
            ) : null}
            
          </div>
        )}
      </div>

      {/* Modals */}
      {showCalendar && (
        <CalendarModal
          isOpen={showCalendar}
          onClose={() => setShowCalendar(false)}
          onApply={(start, end) => {
            setStartDate(start);
            setEndDate(end);
            // Detect if this is a standard range or custom
            const detectedRange = detectTimeRange(start, end);
            setTimeRange(detectedRange);
            generateChartData(start, end);
            setShowCalendar(false);
          }}
        />
      )}

      {showAnnotation && (
        <AnnotationModal
          isOpen={showAnnotation}
          onClose={() => setShowAnnotation(false)}
          onSave={(annotation) => {
            setShowAnnotation(false);
          }}
        />
      )}

      {showMetricSelector && (
        <MetricSelector
          isOpen={showMetricSelector}
          onClose={() => setShowMetricSelector(false)}
          availableMetrics={availableMetrics}
          selectedMetrics={selectedMetrics}
          currentPreset={currentPreset}
          onApply={(metrics, preset) => {
            // Validate that all selected metrics exist in available metrics
            const availableMetricNames = (availableMetrics || []).map(m => m.name);
            const validMetrics = (metrics || []).filter(metricName => 
              availableMetricNames.includes(metricName)
            );
            
            // If no valid metrics, fall back to default
            if (validMetrics.length === 0) {
              setSelectedMetrics(PRESETS.overview.metrics || []);
              setCurrentPreset('overview');
            } else {
              setSelectedMetrics(validMetrics);
              setCurrentPreset(preset);
            }
          }}
        />
      )}
    </div>
  );
};

export default TimelineTab;

