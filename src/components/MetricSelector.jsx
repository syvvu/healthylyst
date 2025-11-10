// Metric Selector Component - For customizing which metrics to display
import React, { useState } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import { formatMetricLabel } from '../utils/dataLoader';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155', tertiary: '#64748b' },
  accent: { primary: '#0ea5e9' }
};

const PRESETS = {
  dashboard: {
    name: 'Dashboard Metrics',
    metrics: [] // Will be populated from localStorage
  },
  overview: {
    name: 'Overview',
    metrics: [
      'sleep_quality_score',
      'workout_performance_rating',
      'mood_score',
      'energy_level',
      'stress_level',
      'hrv_ms'
    ]
  },
  sleep: {
    name: 'Sleep Focus',
    metrics: [
      'sleep_quality_score',
      'sleep_duration_hours',
      'screen_time_before_bed_minutes',
      'caffeine_last_time',
      'deep_sleep_percent',
      'sleep_efficiency'
    ]
  },
  fitness: {
    name: 'Fitness Focus',
    metrics: [
      'workout_performance_rating',
      'steps',
      'exercise_minutes',
      'energy_level',
      'mood_score',
      'resting_heart_rate'
    ]
  },
  nutrition: {
    name: 'Nutrition Focus',
    metrics: [
      'caffeine_last_time',
      'calories',
      'protein_g',
      'fiber_g',
      'caffeine_cups',
      'dinner_time'
    ]
  },
  recovery: {
    name: 'Recovery & Stress',
    metrics: [
      'stress_level',
      'hrv_ms',
      'resting_heart_rate',
      'sleep_quality_score',
      'mood_score',
      'meditation_minutes'
    ]
  }
};

const MetricSelector = ({ 
  isOpen, 
  onClose, 
  availableMetrics, 
  selectedMetrics, 
  onApply,
  currentPreset = 'dashboard'
}) => {
  // Load dashboard metrics from localStorage
  const getDashboardMetrics = () => {
    try {
      const saved = localStorage.getItem('dashboardSelectedMetrics');
      if (saved) {
        const dashboardMetricIds = JSON.parse(saved);
        // Convert dashboard metric IDs to timeline metric field names
        const idToFieldMap = {
          'sleep_quality': 'sleep_quality_score',
          'energy_level': 'energy_level',
          'stress_level': 'stress_level',
          'sugar_intake': 'sugar_afternoon_g',
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
          PRESETS.dashboard.metrics = mappedMetrics;
          return mappedMetrics;
        }
      }
    } catch (e) {
      console.error('Error loading dashboard metrics:', e);
    }
    return [];
  };

  // Initialize dashboard preset metrics
  const dashboardMetrics = getDashboardMetrics();
  if (dashboardMetrics.length > 0) {
    PRESETS.dashboard.metrics = dashboardMetrics;
  }

  const [preset, setPreset] = useState(() => {
    // If selectedMetrics match dashboard metrics, use 'dashboard' preset
    if (dashboardMetrics.length > 0 && 
        selectedMetrics.length === dashboardMetrics.length &&
        selectedMetrics.every(m => dashboardMetrics.includes(m))) {
      return 'dashboard';
    }
    return currentPreset;
  });
  const [customMetrics, setCustomMetrics] = useState(selectedMetrics);
  const [isCustom, setIsCustom] = useState(false);

  if (!isOpen) return null;

  // Helper function to get metric label from metric name
  const getMetricLabel = (metricName) => {
    const metric = (availableMetrics || []).find(m => m && m.name === metricName);
    if (metric && metric.label) {
      return metric.label;
    }
    // Format metric name using the utility function
    return formatMetricLabel(metricName);
  };

  const handlePresetChange = (presetKey) => {
    setPreset(presetKey);
    setIsCustom(false);
    if (presetKey === 'dashboard') {
      // Reload dashboard metrics in case they changed
      const updatedDashboardMetrics = getDashboardMetrics();
      if (updatedDashboardMetrics.length > 0) {
        PRESETS.dashboard.metrics = updatedDashboardMetrics;
        setCustomMetrics(updatedDashboardMetrics);
      } else {
        // Fallback to overview if no dashboard metrics
        setCustomMetrics(PRESETS.overview.metrics);
        setPreset('overview');
      }
    } else if (PRESETS[presetKey]) {
      setCustomMetrics(PRESETS[presetKey].metrics);
    }
  };

  const handleCustomClick = () => {
    setIsCustom(true);
    setCustomMetrics([]); // Clear all when switching to custom
  };

  const handleMetricToggle = (metric) => {
    if (customMetrics.includes(metric)) {
      setCustomMetrics(customMetrics.filter(m => m !== metric));
    } else {
      setCustomMetrics([...customMetrics, metric]);
    }
    setIsCustom(true);
  };

  const handleApply = () => {
    const metricsToApply = isCustom ? customMetrics : (PRESETS[preset]?.metrics || []);
    onApply(metricsToApply, isCustom ? 'custom' : preset);
    onClose();
  };

  const handleClearAll = () => {
    setCustomMetrics([]);
    setIsCustom(true);
  };

  // Group metrics by category
  const metricsByCategory = (availableMetrics || []).reduce((acc, metric) => {
    if (!metric) return acc;
    const category = metric.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(metric);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-24"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{ borderColor: theme.border.primary, borderWidth: '1px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.primary }}>
          <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>
            Customize Metrics
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: theme.text.secondary }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-20">
          {/* Presets */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text.primary }}>
              Presets:
            </h3>
            <div className="space-y-2">
              {Object.entries(PRESETS)
                .sort(([a], [b]) => {
                  // Show dashboard first, then others in order
                  if (a === 'dashboard') return -1;
                  if (b === 'dashboard') return 1;
                  return 0;
                })
                .map(([key, presetData]) => (
                <label
                  key={key}
                  className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-all"
                  style={{ borderColor: theme.border.primary }}
                >
                  <input
                    type="radio"
                    name="preset"
                    checked={!isCustom && preset === key}
                    onChange={() => handlePresetChange(key)}
                    className="w-4 h-4 mt-0.5"
                    style={{ accentColor: theme.accent.primary }}
                  />
                  <div className="flex-1">
                    <div className="font-medium" style={{ color: theme.text.primary }}>
                      {presetData.name}
                    </div>
                    <div className="text-xs mt-1" style={{ color: theme.text.tertiary }}>
                      {presetData.metrics.map(m => getMetricLabel(m)).join(', ')}
                    </div>
                  </div>
                </label>
              ))}
              <label
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-all"
                style={{ borderColor: theme.border.primary }}
              >
                <input
                  type="radio"
                  name="preset"
                  checked={isCustom}
                  onChange={handleCustomClick}
                  className="w-4 h-4"
                  style={{ accentColor: theme.accent.primary }}
                />
                <div className="font-medium" style={{ color: theme.text.primary }}>
                  Custom
                </div>
              </label>
            </div>
          </div>

          {/* Individual Metrics - Only show when Custom is selected */}
          {isCustom && (
            <div>
              <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text.primary }}>
                Select individual metrics:
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(metricsByCategory).map(([category, metrics]) => (
                  <div key={category}>
                    <h4 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: theme.text.tertiary }}>
                      {category}
                    </h4>
                    <div className="space-y-1">
                      {metrics && Array.isArray(metrics) && metrics.map((metric) => (
                        <label
                          key={metric.name}
                          className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={customMetrics.includes(metric.name)}
                            onChange={() => handleMetricToggle(metric.name)}
                            className="w-4 h-4"
                            style={{ accentColor: theme.accent.primary }}
                          />
                          <span className="text-sm" style={{ color: theme.text.primary }}>
                            {metric.label || metric.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3" style={{ borderColor: theme.border.primary }}>
          <button
            onClick={handleClearAll}
            className="px-4 py-2 rounded-lg border"
            style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            style={{ backgroundColor: theme.accent.primary, color: 'white' }}
          >
            <Check className="w-4 h-4" />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetricSelector;
export { PRESETS };

