// Format metric name to display label
// Converts CSV headers like "hrv_ms" to "HRV(ms)" and "fiber_g" to "Fiber(g)"
export const formatMetricLabel = (metricName) => {
  if (!metricName) return '';
  
  // Known acronyms that should be uppercase
  const acronyms = ['hrv', 'vo2', 'rem', 'bpm', 'ai', 'csv'];
  
  // Unit suffixes that should be in parentheses
  const unitSuffixes = [
    { suffix: '_ms', unit: 'ms' },
    { suffix: '_g', unit: 'g' },
    { suffix: '_kg', unit: 'kg' },
    { suffix: '_c', unit: '°C' },
    { suffix: '_percent', unit: '%' },
    { suffix: '_hours', unit: 'hours' },
    { suffix: '_minutes', unit: 'minutes' },
    { suffix: '_km', unit: 'km' },
    { suffix: '_bpm', unit: 'bpm' },
    { suffix: '_cups', unit: 'cups' },
    { suffix: '_units', unit: 'units' },
    { suffix: '_points', unit: 'points' },
    { suffix: '_count', unit: 'count' }
  ];
  
  let label = metricName;
  
  // Check for unit suffix and extract it
  let unit = null;
  for (const { suffix, unit: unitValue } of unitSuffixes) {
    if (label.endsWith(suffix)) {
      unit = unitValue;
      label = label.slice(0, -suffix.length);
      break;
    }
  }
  
  // Split by underscores and process each part
  const parts = label.split('_');
  const formattedParts = parts.map(part => {
    // Check if it's an acronym
    const isAcronym = acronyms.some(acronym => part.toLowerCase() === acronym);
    if (isAcronym) {
      return part.toUpperCase();
    }
    // Capitalize first letter, lowercase rest
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  });
  
  // Join parts with spaces
  let result = formattedParts.join(' ');
  
  // Add unit in parentheses if found
  if (unit) {
    result = `${result}(${unit})`;
  }
  
  return result;
};

// Extract unit from metric name (e.g., "fiber_g" -> "g", "hrv_ms" -> "ms")
export const getMetricUnit = (metricName) => {
  if (!metricName) return '';
  
  // Unit suffixes that should be in parentheses
  const unitSuffixes = [
    { suffix: '_ms', unit: 'ms' },
    { suffix: '_g', unit: 'g' },
    { suffix: '_kg', unit: 'kg' },
    { suffix: '_c', unit: '°C' },
    { suffix: '_percent', unit: '%' },
    { suffix: '_hours', unit: 'hours' },
    { suffix: '_minutes', unit: 'minutes' },
    { suffix: '_km', unit: 'km' },
    { suffix: '_bpm', unit: 'bpm' },
    { suffix: '_cups', unit: 'cups' },
    { suffix: '_units', unit: 'units' },
    { suffix: '_points', unit: 'points' },
    { suffix: '_count', unit: 'count' }
  ];
  
  // Check for unit suffix
  for (const { suffix, unit } of unitSuffixes) {
    if (metricName.endsWith(suffix)) {
      return unit;
    }
  }
  
  // Additional pattern-based detection for common metrics
  const name = metricName.toLowerCase();
  if (name.includes('steps') || name.includes('floors_climbed') || 
      name.includes('meals_count') || name.includes('social_interactions') ||
      name.includes('awakenings')) {
    return '';
  } else if (name.includes('distance_km') || name.includes('distance')) {
    return 'km';
  } else if (name.includes('calories_burned') || name.includes('calories')) {
    return 'cal';
  } else if (name.includes('active_minutes') || name.includes('exercise_minutes') ||
             name.includes('meditation_minutes')) {
    return 'min';
  } else if (name.includes('heart_rate') || name.includes('bpm')) {
    return 'bpm';
  } else if (name.includes('hrv')) {
    return 'ms';
  } else if (name.includes('vo2_max') || name.includes('vo2')) {
    return 'ml/kg/min';
  } else if (name.includes('sleep_duration') || name.includes('deep_sleep_hours') ||
             name.includes('rem_sleep_hours') || name.includes('outdoor_time') ||
             name.includes('screen_time')) {
    return 'hours';
  } else if (name.includes('blood_pressure')) {
    return 'mmHg';
  } else if (name.includes('body_temperature') || name.includes('temperature')) {
    return '°C';
  } else if (name.includes('oxygen_saturation')) {
    return '%';
  } else if (name.includes('mood_score') || name.includes('stress_level') ||
             name.includes('energy_level') || name.includes('anxiety_level') ||
             name.includes('productivity_score') || name.includes('_level') ||
             name.includes('_score')) {
    return 'points';
  }
  
  return '';
};

// CSV Parser and Data Loader
export const parseCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      // Keep date as string, try to parse other values as numbers
      if (header === 'date') {
        row[header] = value;
      } else {
        // Check if it's a time string (contains ':') - preserve as string
        // This prevents parseFloat("13:45") from becoming 13
        if (value && value.includes(':')) {
          row[header] = value; // Keep time strings as-is (e.g., "13:45", "08:00")
        } else {
          const numValue = parseFloat(value);
          row[header] = isNaN(numValue) ? value : numValue;
        }
      }
    });
    data.push(row);
  }
  
  return { headers, data };
};

// Load CSV file
export const loadCSV = async (filename) => {
  try {
    const response = await fetch(`/data/${filename}`);
    const text = await response.text();
    return parseCSV(text);
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return { headers: [], data: [] };
  }
};

// Calculate Pearson correlation coefficient
export const calculateCorrelation = (x, y) => {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  
  return numerator / denominator;
};

// Load all health data
export const loadAllHealthData = async () => {
  const [sleep, nutrition, activity, vitals, wellness] = await Promise.all([
    loadCSV('sleep.csv'),
    loadCSV('nutrition.csv'),
    loadCSV('activity.csv'),
    loadCSV('vitals.csv'),
    loadCSV('wellness.csv')
  ]);
  
  return { sleep, nutrition, activity, vitals, wellness };
};

// Extract metric arrays from data
export const extractMetric = (data, metricName) => {
  return data.map(row => row[metricName]).filter(val => val !== undefined && val !== null);
};

// Get data for a specific date across all sources
export const getDataForDate = (allData, date) => {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  
  return {
    sleep: allData.sleep?.data?.find(d => d.date === dateStr) || null,
    nutrition: allData.nutrition?.data?.find(d => d.date === dateStr) || null,
    activity: allData.activity?.data?.find(d => d.date === dateStr) || null,
    vitals: allData.vitals?.data?.find(d => d.date === dateStr) || null,
    wellness: allData.wellness?.data?.find(d => d.date === dateStr) || null,
  };
};

// Get all available dates from the data
export const getAvailableDates = (allData) => {
  const dates = new Set();
  
  [allData.sleep, allData.nutrition, allData.activity, allData.vitals, allData.wellness].forEach(source => {
    if (source?.data) {
      source.data.forEach(row => {
        if (row.date) dates.add(row.date);
      });
    }
  });
  
  return Array.from(dates).sort();
};

// Calculate all correlations for a given metric
export const calculateMetricCorrelations = (allData, metricName, metricData) => {
  const correlations = [];
  
  // Define all available metrics across datasets
  const metrics = [
    // Sleep metrics
    { name: 'sleep_duration_hours', label: 'Sleep Duration', category: 'sleep', color: '#8b5cf6' },
    { name: 'sleep_quality_score', label: 'Sleep Quality', category: 'sleep', color: '#8b5cf6' },
    { name: 'deep_sleep_hours', label: 'Deep Sleep', category: 'sleep', color: '#8b5cf6' },
    { name: 'resting_heart_rate', label: 'Resting HR (Sleep)', category: 'sleep', color: '#8b5cf6' },
    { name: 'hrv_ms', label: 'HRV', category: 'sleep', color: '#8b5cf6' },
    
    // Nutrition metrics
    { name: 'calories', label: 'Calories', category: 'nutrition', color: '#f97316' },
    { name: 'protein_g', label: 'Protein', category: 'nutrition', color: '#f97316' },
    { name: 'carbs_g', label: 'Carbs', category: 'nutrition', color: '#f97316' },
    { name: 'sugar_g', label: 'Sugar', category: 'nutrition', color: '#f97316' },
    { name: 'caffeine_cups', label: 'Caffeine Cups', category: 'nutrition', color: '#f97316' },
    { name: 'caffeine_last_time', label: 'Caffeine Last Time', category: 'nutrition', color: '#f97316' },
    { name: 'meals_count', label: 'Meals Count', category: 'nutrition', color: '#f97316' },
    
    // Activity metrics
    { name: 'steps', label: 'Steps', category: 'activity', color: '#10b981' },
    { name: 'calories_burned', label: 'Calories Burned', category: 'activity', color: '#10b981' },
    { name: 'exercise_minutes', label: 'Exercise Minutes', category: 'activity', color: '#10b981' },
    { name: 'avg_heart_rate', label: 'Avg Heart Rate', category: 'activity', color: '#10b981' },
    
    // Vitals metrics
    { name: 'weight_kg', label: 'Weight', category: 'vitals', color: '#22c55e' },
    { name: 'body_fat_percent', label: 'Body Fat %', category: 'vitals', color: '#22c55e' },
    { name: 'blood_pressure_systolic', label: 'Blood Pressure (Systolic)', category: 'vitals', color: '#ef4444' },
    { name: 'blood_pressure_diastolic', label: 'Blood Pressure (Diastolic)', category: 'vitals', color: '#ef4444' },
    
    // Wellness metrics
    { name: 'stress_level', label: 'Stress Level', category: 'wellness', color: '#ec4899' },
    { name: 'energy_level', label: 'Energy Level', category: 'wellness', color: '#f59e0b' },
    { name: 'mood_score', label: 'Mood Score', category: 'wellness', color: '#f59e0b' },
    { name: 'anxiety_level', label: 'Anxiety Level', category: 'wellness', color: '#ec4899' },
    { name: 'screen_time_hours', label: 'Screen Time', category: 'wellness', color: '#6366f1' },
    { name: 'caffeine_cups', label: 'Caffeine', category: 'wellness', color: '#6366f1' },
  ];
  
  // Find the metric we're analyzing
  const currentMetric = metrics.find(m => m.name === metricName);
  if (!currentMetric) return correlations;
  
  // Calculate correlation with all other metrics
  metrics.forEach(metric => {
    if (metric.name === metricName) return; // Skip self
    
    let otherData = [];
    
    // Find the data source
    if (allData.sleep.data.length > 0 && allData.sleep.data[0][metric.name] !== undefined) {
      otherData = extractMetric(allData.sleep.data, metric.name);
    } else if (allData.nutrition.data.length > 0 && allData.nutrition.data[0][metric.name] !== undefined) {
      otherData = extractMetric(allData.nutrition.data, metric.name);
    } else if (allData.activity.data.length > 0 && allData.activity.data[0][metric.name] !== undefined) {
      otherData = extractMetric(allData.activity.data, metric.name);
    } else if (allData.vitals.data.length > 0 && allData.vitals.data[0][metric.name] !== undefined) {
      otherData = extractMetric(allData.vitals.data, metric.name);
    } else if (allData.wellness.data.length > 0 && allData.wellness.data[0][metric.name] !== undefined) {
      otherData = extractMetric(allData.wellness.data, metric.name);
    }
    
    if (otherData.length === metricData.length && otherData.length > 0) {
      const correlation = calculateCorrelation(metricData, otherData);
      
      // Only include meaningful correlations (|r| > 0.3)
      if (Math.abs(correlation) > 0.3) {
        correlations.push({
          ...metric,
          correlation: correlation,
          data: otherData,
          strength: Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.5 ? 'moderate' : 'weak',
          direction: correlation > 0 ? 'positive' : 'negative'
        });
      }
    }
  });
  
  // Sort by absolute correlation value (strongest first)
  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
};

