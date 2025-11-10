// AI Insight Generation using Gemini
// Converts correlation stats, anomalies, and health data into natural language insights

import { generateContent, generateContentStream } from './geminiClient';
import { calculateAllCorrelations, getTopCorrelationsForMetric } from './correlationAnalysis';
import { detectAllAnomalies, getCurrentAnomalies, formatAnomalyAlert } from './anomalyDetection';
import { getDataForDate, getAvailableDates, formatMetricLabel } from './dataLoader';
import { format } from 'date-fns';
import { withCache } from './aiCache';

// Generate correlation insight in natural language
export const generateCorrelationInsight = async (correlation, allData) => {
  const cacheParams = {
    correlation: {
      metric1: correlation.metric1Label || correlation.metric1,
      metric2: correlation.metric2Label || correlation.metric2,
      correlation: correlation.correlation
    }
  };
  
  return await withCache('correlationInsight', cacheParams, async () => {
    const prompt = `You are a supportive health coach with a warm, empathetic approach. Explain this health pattern in a clear, actionable way:

Metric 1: ${correlation.metric1Label} (${correlation.metric1Category})
Metric 2: ${correlation.metric2Label} (${correlation.metric2Category})
Pattern strength: ${(Math.abs(correlation.correlation) * 100).toFixed(0)}% (${correlation.strength})
Time relationship: ${correlation.lag > 0 ? `${correlation.lag} day(s) later` : 'same day'}
Direction: ${correlation.direction === 'positive' ? 'when one increases, the other tends to increase' : 'when one increases, the other tends to decrease'}

IMPORTANT GUIDELINES:
- Use a supportive, conversational coaching tone that balances empathy with insight
- Avoid technical jargon (like "correlation coefficient" or "r=") - use plain language like "${(Math.abs(correlation.correlation) * 100).toFixed(0)}% more likely" or "strongly connected"
- Be warm and encouraging, not clinical
- ALWAYS conclude with a specific, personalized next step the user can take

Provide a 2-3 sentence explanation that:
1. Describes what this pattern means in plain, easy-to-understand language
2. Explains why this relationship might exist (with empathy)
3. Suggests one actionable, personalized next step the user can take today

Keep it concise, friendly, and supportive.`;

    try {
      const response = await generateContent(prompt, { temperature: 0.7, maxTokens: 200, context: 'insights_correlations' });
      if (response.success && response.text) {
        // Remove quotation marks that might wrap the response
        let cleanedText = response.text.trim();
        if ((cleanedText.startsWith('"') && cleanedText.endsWith('"')) || 
            (cleanedText.startsWith("'") && cleanedText.endsWith("'"))) {
          cleanedText = cleanedText.slice(1, -1).trim();
        }
        return cleanedText;
      }
      // Fallback if AI fails
      throw new Error(response.error || 'AI generation failed');
    } catch (error) {
      // Fallback if AI fails
      const direction = correlation.direction === 'positive' ? 'increases with' : 'decreases with';
      return `Your ${correlation.metric1Label} ${direction} ${correlation.metric2Label} (${correlation.strength} correlation). This suggests a ${correlation.direction} relationship between these health metrics.`;
    }
  });
};

// Generate weekly summary
export const generateWeeklySummary = async (allData, endDate = null, startDate = null, userName = null) => {
  const dates = getAvailableDates(allData);
  if (dates.length === 0) return null;
  
  // Determine date range
  let selectedStartDate, selectedEndDate;
  if (startDate && endDate) {
    selectedStartDate = typeof startDate === 'string' ? startDate : format(startDate, 'yyyy-MM-dd');
    selectedEndDate = typeof endDate === 'string' ? endDate : format(endDate, 'yyyy-MM-dd');
  } else {
    const end = endDate || dates[dates.length - 1];
    const endIndex = dates.indexOf(end);
    const startIndex = Math.max(0, endIndex - 6);
    selectedStartDate = dates[startIndex];
    selectedEndDate = end;
  }
  
  const selectedDates = dates.filter(date => {
    return date >= selectedStartDate && date <= selectedEndDate;
  });
  
  // Create cache params
  const cacheParams = {
    endDate: selectedEndDate,
    startDate: selectedStartDate,
    weekRange: `${selectedStartDate}_${selectedEndDate}`
  };
  
  // Check cache first
  const cached = await withCache('weeklySummary', cacheParams, async () => {
  
  // Get correlations from FULL dataset (for better context)
  const correlations = calculateAllCorrelations(allData, 0.5, 3);
  const topCorrelations = correlations.slice(0, 5);
  
  // Get anomalies from FULL dataset
  const allAnomalies = detectAllAnomalies(allData);
  const currentAnomalies = getCurrentAnomalies(allAnomalies, 7);
  
  // Get data summary for SELECTED date range
  const selectedData = selectedDates.map(date => getDataForDate(allData, date));
  const avgSleep = selectedData.reduce((sum, d) => sum + (d.sleep?.sleep_duration_hours || 0), 0) / selectedData.length;
  const avgSteps = selectedData.reduce((sum, d) => sum + (d.activity?.steps || 0), 0) / selectedData.length;
  const avgStress = selectedData.reduce((sum, d) => sum + (d.wellness?.stress_level || 0), 0) / selectedData.length;
  const avgEnergy = selectedData.reduce((sum, d) => sum + (d.wellness?.energy_level || 0), 0) / selectedData.length;
  
  // Get full dataset averages for context
  const allDates = dates;
  const allDataPoints = allDates.map(date => getDataForDate(allData, date));
  const fullAvgSleep = allDataPoints.reduce((sum, d) => sum + (d.sleep?.sleep_duration_hours || 0), 0) / allDataPoints.length;
  const fullAvgSteps = allDataPoints.reduce((sum, d) => sum + (d.activity?.steps || 0), 0) / allDataPoints.length;
  const fullAvgStress = allDataPoints.reduce((sum, d) => sum + (d.wellness?.stress_level || 0), 0) / allDataPoints.length;
  const fullAvgEnergy = allDataPoints.reduce((sum, d) => sum + (d.wellness?.energy_level || 0), 0) / allDataPoints.length;
  
  const nameGreeting = userName ? `Hi ${userName}! ` : '';
  
  const prompt = `You are a supportive health coach with a warm, empathetic approach. ${nameGreeting}Generate a comprehensive summary for the selected date range.

SELECTED DATE RANGE (Focus your insights on this period):
- From: ${selectedStartDate} to ${selectedEndDate}
- Number of days: ${selectedDates.length}

SELECTED PERIOD AVERAGES:
- Sleep: ${avgSleep.toFixed(1)} hours
- Steps: ${avgSteps.toFixed(0)} steps/day
- Stress Level: ${avgStress.toFixed(1)}/10
- Energy Level: ${avgEnergy.toFixed(1)}/10

FULL DATASET CONTEXT (for comparison and big picture understanding):
- Total days of data: ${allDates.length}
- Overall average sleep: ${fullAvgSleep.toFixed(1)} hours
- Overall average steps: ${fullAvgSteps.toFixed(0)} steps/day
- Overall average stress: ${fullAvgStress.toFixed(1)}/10
- Overall average energy: ${fullAvgEnergy.toFixed(1)}/10

Top Patterns Found (from full dataset - use for context):
${topCorrelations.slice(0, 3).map((c, i) => 
  `${i + 1}. ${c.metric1Label} and ${c.metric2Label} are ${(Math.abs(c.correlation) * 100).toFixed(0)}% connected${c.lag > 0 ? ` (${c.lag}-day delay)` : ' (same day)'}`
).join('\n')}

Notable Observations: ${currentAnomalies.length} metric(s) with unusual values

IMPORTANT GUIDELINES:
- Use a supportive, conversational coaching tone that balances empathy with insight
- Address the user by name if provided: ${userName || 'use general terms'}
- You have access to the FULL dataset for context, but FOCUS your insights specifically on the SELECTED DATE RANGE (${selectedStartDate} to ${selectedEndDate})
- Compare the selected period's performance to the overall averages to provide meaningful context
- Avoid technical jargon (like "correlation coefficient" or "r=") - use plain language like "${(Math.abs(topCorrelations[0]?.correlation || 0) * 100).toFixed(0)}% more likely" or "strongly connected"
- Be warm and encouraging, not clinical
- Celebrate progress and improvements with genuine enthusiasm
- ALWAYS conclude with 2-3 specific, personalized next steps the user can take

Generate a 4-5 paragraph summary that:
1. Focuses on the SELECTED DATE RANGE (${selectedStartDate} to ${selectedEndDate}) while using full dataset context for comparison
2. Highlights key patterns and trends in the selected period in an encouraging way
3. Compares selected period performance to overall averages when relevant
4. Explains the most significant connections found in simple, easy-to-understand language
5. Addresses any anomalies or concerns with empathy and support
6. Celebrates any improvements or positive trends with genuine enthusiasm
7. Provides 2-3 actionable, personalized recommendations (conclude with these)

Write in a friendly, encouraging, and supportive tone.`;

  try {
    const response = await generateContent(prompt, { temperature: 0.8, maxTokens: 500, context: 'dashboard' });
    if (!response.success || !response.text) {
      throw new Error(response.error || 'AI generation failed');
    }
    return {
      summary: response.text,
      weekDates: selectedDates,
      metrics: {
        avgSleep: avgSleep.toFixed(1),
        avgSteps: avgSteps.toFixed(0),
        avgStress: avgStress.toFixed(1),
        avgEnergy: avgEnergy.toFixed(1)
      },
      topCorrelations: topCorrelations.slice(0, 3),
      anomalyCount: currentAnomalies.length
    };
  } catch (error) {
    return {
      summary: `${nameGreeting}Summary for ${selectedStartDate} to ${selectedEndDate}: Average sleep ${avgSleep.toFixed(1)}h, ${avgSteps.toFixed(0)} steps/day, stress ${avgStress.toFixed(1)}/10, energy ${avgEnergy.toFixed(1)}/10.`,
      weekDates: selectedDates,
      metrics: {
        avgSleep: avgSleep.toFixed(1),
        avgSteps: avgSteps.toFixed(0),
        avgStress: avgStress.toFixed(1),
        avgEnergy: avgEnergy.toFixed(1)
      },
      topCorrelations: [],
      anomalyCount: currentAnomalies.length
    };
  }
  });
  
  return cached;
};

// Generate anomaly explanation
export const generateAnomalyExplanation = async (anomaly, allData) => {
  const dateData = getDataForDate(allData, anomaly.date);
  const formatted = formatAnomalyAlert(anomaly, allData);
  
  const cacheParams = {
    anomaly: {
      metricName: anomaly.metricName,
      date: anomaly.date,
      value: anomaly.value
    }
  };
  
  return await withCache('anomalyExplanation', cacheParams, async () => {
    const prompt = `You are a supportive health coach with a warm, empathetic approach. Explain this health observation:

Metric: ${formatMetricLabel(anomaly.metricName)}
Date: ${anomaly.date}
Value: ${anomaly.value}
Typical Range: ${anomaly.mean?.toFixed(2) || 'N/A'}
Difference: ${anomaly.deviation > 0 ? '+' : ''}${anomaly.deviation.toFixed(2)} from your usual
Severity: ${anomaly.severity}

Context on this date:
${dateData.sleep ? `- Sleep: ${dateData.sleep.sleep_duration_hours}h, quality ${dateData.sleep.sleep_quality_score}/100` : ''}
${dateData.activity ? `- Activity: ${dateData.activity.steps} steps, ${dateData.activity.exercise_minutes} min exercise` : ''}
${dateData.wellness ? `- Stress: ${dateData.wellness.stress_level}/10, Energy: ${dateData.wellness.energy_level}/10` : ''}
${dateData.nutrition ? `- Nutrition: ${dateData.nutrition.calories} cal, ${dateData.nutrition.sugar_g}g sugar` : ''}

IMPORTANT GUIDELINES:
- Use a supportive, conversational coaching tone that balances empathy with insight
- Avoid technical jargon - use plain, easy-to-understand language
- Be warm and reassuring, not alarming
- ALWAYS conclude with a specific, personalized next step the user can take

Provide a 2-3 sentence explanation that:
1. Explains what this observation means in plain, easy-to-understand language
2. Suggests possible causes based on the context (with empathy and understanding)
3. Provides one actionable, personalized recommendation the user can take today

Keep it concise, friendly, and supportive.`;

    try {
      const response = await generateContent(prompt, { temperature: 0.7, maxTokens: 200, context: 'insights_anomalies' });
      if (response.success && response.text) {
        return response.text;
      }
      throw new Error(response.error || 'AI generation failed');
    } catch (error) {
      return formatted.message;
    }
  });
};

// Generate recommendations based on patterns
export const generateRecommendations = async (allData, focusArea = null) => {
  const correlations = calculateAllCorrelations(allData, 0.5, 3);
  const allAnomalies = detectAllAnomalies(allData);
  const currentAnomalies = getCurrentAnomalies(allAnomalies, 7);
  
  // Filter correlations by focus area if specified
  const relevantCorrelations = focusArea 
    ? correlations.filter(c => c.metric1Category === focusArea || c.metric2Category === focusArea)
    : correlations;
  
  const topCorrelations = relevantCorrelations.slice(0, 5);
  
  const cacheParams = {
    focusArea: focusArea || 'all',
    topCorrelationsHash: topCorrelations.map(c => `${c.metric1Label}_${c.metric2Label}`).join('_'),
    anomalyCount: currentAnomalies.length
  };
  
  return await withCache('recommendations', cacheParams, async () => {
    const prompt = `You are a supportive health coach with a warm, empathetic approach. Based on this health data analysis, provide 3-5 actionable recommendations:

Top Patterns Found:
${topCorrelations.map((c, i) => 
  `${i + 1}. ${c.metric1Label} and ${c.metric2Label} are ${(Math.abs(c.correlation) * 100).toFixed(0)}% connected${c.lag > 0 ? ` (${c.lag}-day delay)` : ' (same day)'}`
).join('\n')}

Notable Observations: ${currentAnomalies.length} metric(s) showing unusual patterns
${currentAnomalies.slice(0, 3).map(a => `- ${a.metric}: ${a.anomalies.length} observation(s)`).join('\n')}

${focusArea ? `Focus Area: ${focusArea}` : ''}

IMPORTANT GUIDELINES:
- Use a supportive, conversational coaching tone that balances empathy with insight
- Avoid technical jargon (like "correlation" or "anomaly") - use plain language like "connected" or "unusual pattern"
- Be warm and encouraging, not clinical
- Frame recommendations positively and make them feel achievable
- Each recommendation should feel personalized

Provide 3-5 specific, actionable recommendations. Each recommendation should:
1. Be specific and measurable
2. Be based on the patterns found
3. Include a brief "why" in simple language
4. Be realistic and achievable
5. Feel supportive and encouraging

Format as a numbered list. Keep each recommendation to 1-2 sentences.`;

    try {
      const response = await generateContent(prompt, { temperature: 0.8, maxTokens: 400, context: 'metrics' });
      if (!response.success || !response.text) {
        throw new Error(response.error || 'AI generation failed');
      }
      // Parse numbered list
      const recommendations = response.text
        .split(/\d+\./)
        .filter(item => item.trim().length > 0)
        .map(item => item.trim())
        .slice(0, 5);
      
      return recommendations;
    } catch (error) {
      return [
        'Focus on getting 7-9 hours of sleep consistently',
        'Aim for at least 8,000 steps per day',
        'Monitor stress levels and practice stress-reduction techniques'
      ];
    }
  });
};

// Answer health-related questions
export const answerHealthQuestion = async (question, allData, context = {}) => {
  // Don't cache questions - they're unique each time
  const dates = getAvailableDates(allData);
  const latestDate = dates[dates.length - 1];
  const latestData = getDataForDate(allData, latestDate);
  
  // Get relevant correlations
  const correlations = calculateAllCorrelations(allData, 0.4, 3);
  const relevantCorrelations = correlations.slice(0, 10); // Increased from 5 to 10
  
  // Get recent anomalies
  const allAnomalies = detectAllAnomalies(allData);
  const recentAnomalies = getCurrentAnomalies(allAnomalies, 30); // Increased from 14 to 30 days
  
  // Format all CSV data for the prompt
  const formatCSVData = (data, categoryName) => {
    if (!data?.data || data.data.length === 0) return '';
    
    const headers = Object.keys(data.data[0]).filter(key => key !== 'date');
    let csvText = `\n${categoryName.toUpperCase()} DATA (${data.data.length} records):\n`;
    csvText += `Date,${headers.join(',')}\n`;
    
    data.data.forEach(row => {
      const date = row.date || '';
      const values = headers.map(header => {
        const val = row[header];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val;
      });
      csvText += `${date},${values.join(',')}\n`;
    });
    
    return csvText;
  };
  
  // Build complete CSV data section
  let csvDataSection = '\n=== COMPLETE HEALTH DATASET ===\n';
  csvDataSection += formatCSVData(allData.sleep, 'SLEEP');
  csvDataSection += formatCSVData(allData.nutrition, 'NUTRITION');
  csvDataSection += formatCSVData(allData.activity, 'ACTIVITY');
  csvDataSection += formatCSVData(allData.vitals, 'VITALS');
  csvDataSection += formatCSVData(allData.wellness, 'WELLNESS');
  csvDataSection += '\n=== END OF DATASET ===\n';
  
  const prompt = `You are a supportive health coach with a warm, empathetic approach. Answer this question about the user's health data:

Question: ${question}

Latest Health Data (${latestDate}):
${latestData.sleep ? `Sleep: ${latestData.sleep.sleep_duration_hours}h, quality ${latestData.sleep.sleep_quality_score}/100` : ''}
${latestData.activity ? `Activity: ${latestData.activity.steps} steps, ${latestData.activity.exercise_minutes} min exercise` : ''}
${latestData.wellness ? `Stress: ${latestData.wellness.stress_level}/10, Energy: ${latestData.wellness.energy_level}/10, Mood: ${latestData.wellness.mood_score}/10` : ''}
${latestData.nutrition ? `Nutrition: ${latestData.nutrition.calories} cal, ${latestData.nutrition.sugar_g}g sugar` : ''}
${latestData.vitals ? `Vitals: RHR ${latestData.vitals.resting_heart_rate} bpm, BP ${latestData.vitals.blood_pressure_systolic}/${latestData.vitals.blood_pressure_diastolic}` : ''}

Key Patterns Found:
${relevantCorrelations.map(c => 
  `- ${c.metric1Label} and ${c.metric2Label} are ${(Math.abs(c.correlation) * 100).toFixed(0)}% connected${c.lag > 0 ? ` (${c.lag}-day delay)` : ' (same day)'}`
).join('\n')}

Recent Observations (Last 30 days): ${recentAnomalies.length > 0 ? recentAnomalies.map(a => `${a.metric}: ${a.anomalies.length} unusual pattern(s)`).join(', ') : 'None'}

${csvDataSection}

IMPORTANT GUIDELINES:
- Use a supportive, conversational coaching tone that balances empathy with insight
- Avoid technical jargon (like "correlation coefficient", "anomaly", "RHR") - use plain language like "connected", "unusual pattern", "resting heart rate"
- Be warm and encouraging, not clinical
- ALWAYS conclude with a specific, personalized next step the user can take

Provide a helpful, data-driven answer that:
1. Directly addresses the question in a supportive way
2. References specific data points and patterns from the complete dataset above in simple language
3. Analyzes trends and connections visible in the data (avoid technical terms)
4. Provides actionable insights based on the full historical context
5. Is conversational and easy to understand
6. ALWAYS ends with a personalized next step the user can take

You have access to the complete dataset above. Use it to provide a comprehensive answer. Keep the answer to 3-5 sentences unless the question requires more detail.`;

  try {
    const response = await generateContent(prompt, { temperature: 0.8, maxTokens: 500, context: 'dashboard' }); // Increased from 300 to 500
    if (!response.success || !response.text) {
      throw new Error(response.error || 'AI generation failed');
    }
    return {
      answer: response.text,
      sources: {
        correlations: relevantCorrelations.slice(0, 5), // Increased from 3 to 5
        anomalies: recentAnomalies.slice(0, 5) // Increased from 3 to 5
      }
    };
  } catch (error) {
    return {
      answer: 'I apologize, but I encountered an error processing your question. Please try rephrasing it or check back later.',
      sources: { correlations: [], anomalies: [] }
    };
  }
};

// Generate comprehensive pattern story narrative for dashboard
export const generateTimelineNarrative = async (allData, selectedDate = null) => {
  const dates = getAvailableDates(allData);
  
  // Create cache params
  let dateKey;
  if (selectedDate) {
    dateKey = typeof selectedDate === 'string' 
      ? selectedDate 
      : selectedDate instanceof Date 
        ? selectedDate.toISOString().split('T')[0]
        : String(selectedDate);
  } else {
    dateKey = dates[dates.length - 1] || new Date().toISOString().split('T')[0];
  }
  
  const cacheParams = {
    selectedDate: dateKey
  };
  
  return await withCache('timelineNarrative', cacheParams, async () => {
  
  // Parse selectedDate properly to avoid timezone issues
  let today;
  if (selectedDate) {
    if (typeof selectedDate === 'string') {
      // If it's a string like "2025-11-09", parse it as local date
      const [year, month, day] = selectedDate.split('-').map(Number);
      today = new Date(year, month - 1, day);
    } else {
      // If it's already a Date object, use it directly
      today = new Date(selectedDate);
    }
  } else {
    // Use latest date from data, parsing it properly
    const latestDateStr = dates[dates.length - 1];
    if (latestDateStr) {
      const [year, month, day] = latestDateStr.split('-').map(Number);
      today = new Date(year, month - 1, day);
    } else {
      today = new Date();
    }
  }
  
  // Calculate yesterday and dayBefore in local time
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBefore = new Date(yesterday);
  dayBefore.setDate(dayBefore.getDate() - 1);
  
  const todayStr = format(today, 'yyyy-MM-dd');
  const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
  const dayBeforeStr = format(dayBefore, 'yyyy-MM-dd');
  
  const todayData = getDataForDate(allData, todayStr);
  const yesterdayData = getDataForDate(allData, yesterdayStr);
  const dayBeforeData = getDataForDate(allData, dayBeforeStr);
  
  // Calculate 48-hour caffeine total (yesterday + today only, not dayBefore)
  const caffeine48Hours = (yesterdayData.nutrition?.caffeine_cups || 0) + (todayData.nutrition?.caffeine_cups || 0);
  
  // Get top correlation (hero insight) for context
  const correlations = calculateAllCorrelations(allData, 0.4, 3);
  const topCorrelation = correlations.length > 0 ? correlations[0] : null;
  
  // Calculate baseline averages for comparison
  const recentDates = dates.slice(-14); // Last 14 days for baseline
  const baseline = {
    sleepDuration: recentDates.reduce((sum, d) => {
      const data = getDataForDate(allData, d);
      return sum + (data.sleep?.sleep_duration_hours || 0);
    }, 0) / recentDates.length,
    sleepQuality: recentDates.reduce((sum, d) => {
      const data = getDataForDate(allData, d);
      return sum + (data.sleep?.sleep_quality_score || 0);
    }, 0) / recentDates.length,
    sugar: recentDates.reduce((sum, d) => {
      const data = getDataForDate(allData, d);
      return sum + (data.nutrition?.sugar_g || 0);
    }, 0) / recentDates.length,
    energy: recentDates.reduce((sum, d) => {
      const data = getDataForDate(allData, d);
      return sum + (data.wellness?.energy_level || 0);
    }, 0) / recentDates.length,
    mood: recentDates.reduce((sum, d) => {
      const data = getDataForDate(allData, d);
      return sum + (data.wellness?.mood_score || 0);
    }, 0) / recentDates.length
  };
  
  // Convert time string or number to numeric hours for comparison
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
  
  // Format time helper - handles both "HH:MM" strings and numeric hours
  const formatTime = (hour) => {
    if (!hour) return null;
    
    // Handle "HH:MM" format (e.g., "14:45")
    if (typeof hour === 'string' && hour.includes(':')) {
      const [h, m] = hour.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return hour; // Return as-is if can't parse
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
    }
    
    // Handle numeric hour (e.g., 14.75 = 2:45 PM)
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    if (m === 0) return `${displayHour}:00 ${period}`;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };
  
  // Build comprehensive context
  const context = {
    dayBefore: {
      date: dayBeforeStr,
      sleep: dayBeforeData.sleep ? {
        duration: dayBeforeData.sleep.sleep_duration_hours,
        quality: dayBeforeData.sleep.sleep_quality_score,
        deepSleep: dayBeforeData.sleep.deep_sleep_percent,
        bedtime: dayBeforeData.sleep.bedtime,
        wakeTime: dayBeforeData.sleep.wake_time
      } : null,
      nutrition: dayBeforeData.nutrition ? {
        caffeineTime: dayBeforeData.nutrition.caffeine_last_time,
        caffeineCups: dayBeforeData.nutrition.caffeine_cups,
        caffeineAfterCutoff: (() => {
          const hours = timeToHours(dayBeforeData.nutrition.caffeine_last_time);
          return hours !== null && hours >= 14.5;
        })(),
        sugar: dayBeforeData.nutrition.sugar_g,
        lastMealTime: dayBeforeData.nutrition.last_meal_time || dayBeforeData.nutrition.dinner_time
      } : null,
      activity: dayBeforeData.activity ? {
        workoutTime: dayBeforeData.activity.workout_time,
        workoutType: dayBeforeData.activity.workout_type,
        exerciseMinutes: dayBeforeData.activity.exercise_minutes,
        steps: dayBeforeData.activity.steps
      } : null,
      wellness: dayBeforeData.wellness ? {
        energy: dayBeforeData.wellness.energy_level,
        mood: dayBeforeData.wellness.mood_score,
        stress: dayBeforeData.wellness.stress_level
      } : null
    },
    yesterday: {
      date: yesterdayStr,
      sleep: yesterdayData.sleep ? {
        duration: yesterdayData.sleep.sleep_duration_hours,
        quality: yesterdayData.sleep.sleep_quality_score,
        deepSleep: yesterdayData.sleep.deep_sleep_percent,
        bedtime: yesterdayData.sleep.bedtime,
        wakeTime: yesterdayData.sleep.wake_time,
        durationDiff: yesterdayData.sleep.sleep_duration_hours - baseline.sleepDuration,
        qualityDiff: yesterdayData.sleep.sleep_quality_score - baseline.sleepQuality
      } : null,
      nutrition: yesterdayData.nutrition ? {
        caffeineTime: yesterdayData.nutrition.caffeine_last_time,
        caffeineCups: yesterdayData.nutrition.caffeine_cups,
        caffeineCutoff: 14.5, // 2:30 PM
        caffeineAfterCutoff: (() => {
          const hours = timeToHours(yesterdayData.nutrition.caffeine_last_time);
          return hours !== null && hours >= 14.5;
        })(),
        sugar: yesterdayData.nutrition.sugar_g,
        sugarDiff: yesterdayData.nutrition.sugar_g - baseline.sugar,
        lastMealTime: yesterdayData.nutrition.last_meal_time || yesterdayData.nutrition.dinner_time
      } : null,
      activity: yesterdayData.activity ? {
        workoutTime: yesterdayData.activity.workout_time,
        workoutType: yesterdayData.activity.workout_type,
        exerciseMinutes: yesterdayData.activity.exercise_minutes,
        steps: yesterdayData.activity.steps,
        planned: yesterdayData.activity.exercise_minutes > 0
      } : null,
      wellness: yesterdayData.wellness ? {
        energy: yesterdayData.wellness.energy_level,
        mood: yesterdayData.wellness.mood_score,
        stress: yesterdayData.wellness.stress_level,
        energyDiff: yesterdayData.wellness.energy_level - baseline.energy,
        moodDiff: yesterdayData.wellness.mood_score - baseline.mood
      } : null
    },
    today: {
      date: todayStr,
      sleep: todayData.sleep ? {
        duration: todayData.sleep.sleep_duration_hours,
        quality: todayData.sleep.sleep_quality_score,
        deepSleep: todayData.sleep.deep_sleep_percent,
        bedtime: todayData.sleep.bedtime,
        wakeTime: todayData.sleep.wake_time,
        durationDiff: todayData.sleep.sleep_duration_hours - baseline.sleepDuration,
        qualityDiff: todayData.sleep.sleep_quality_score - baseline.sleepQuality
      } : null,
      nutrition: todayData.nutrition ? {
        caffeineTime: todayData.nutrition.caffeine_last_time,
        caffeineCups: todayData.nutrition.caffeine_cups,
        caffeineCutoff: 14.5,
        caffeineAfterCutoff: (() => {
          const hours = timeToHours(todayData.nutrition.caffeine_last_time);
          return hours !== null && hours >= 14.5;
        })(),
        sugar: todayData.nutrition.sugar_g,
        water: todayData.nutrition.water_glasses
      } : null,
      activity: todayData.activity ? {
        steps: todayData.activity.steps,
        exerciseMinutes: todayData.activity.exercise_minutes
      } : null,
      wellness: todayData.wellness ? {
        energy: todayData.wellness.energy_level,
        mood: todayData.wellness.mood_score,
        stress: todayData.wellness.stress_level
      } : null,
      vitals: todayData.vitals ? {
        restingHR: todayData.vitals.resting_heart_rate
      } : null
    },
    baseline: baseline,
    topCorrelation: topCorrelation ? {
      pattern: `${topCorrelation.metric1Label} → ${topCorrelation.metric2Label}`,
      strength: topCorrelation.correlation,
      lag: topCorrelation.lag
    } : null
  };
  
  // Format dates for display in prompt
  const todayFormatted = format(today, 'MMMM d');
  const yesterdayFormatted = format(yesterday, 'MMMM d');
  const dayBeforeFormatted = format(dayBefore, 'MMMM d');
  
  const prompt = `You are a supportive health coach with a warm, empathetic approach. Analyze the LAST 48 HOURS and generate a smooth, readable health insight that connects events naturally.

IMPORTANT: You are analyzing the LAST 48 HOURS ONLY, which includes:
- YESTERDAY (${context.yesterday.date} - ${yesterdayFormatted}) - Full day data
- TODAY (${context.today.date} - ${todayFormatted}) - Current day data

The "DAY BEFORE" (${context.dayBefore.date} - ${dayBeforeFormatted}) is provided for context only, but is NOT part of the 48-hour analysis.

48-HOUR CAFFEINE TOTAL: ${caffeine48Hours} cups (${yesterdayData.nutrition?.caffeine_cups || 0} from ${yesterdayFormatted} + ${todayData.nutrition?.caffeine_cups || 0} from ${todayFormatted})

CONTEXT - Last 48 Hours (Yesterday + Today):

YESTERDAY (${context.yesterday.date} - ${yesterdayFormatted}):
${context.yesterday.sleep ? `- Sleep: ${context.yesterday.sleep.duration.toFixed(1)}h (${context.yesterday.sleep.durationDiff >= 0 ? '+' : ''}${context.yesterday.sleep.durationDiff.toFixed(1)}h vs baseline) - Quality: ${context.yesterday.sleep.quality}/100 (${context.yesterday.sleep.qualityDiff >= 0 ? '+' : ''}${context.yesterday.sleep.qualityDiff.toFixed(0)} points) - Deep sleep: ${context.yesterday.sleep.deepSleep}%` : '- No sleep data'}
${context.yesterday.nutrition?.caffeineTime ? `- Caffeine: ${formatTime(context.yesterday.nutrition.caffeineTime)} (${context.yesterday.nutrition.caffeineAfterCutoff ? '⚠️ AFTER 2:30 PM cutoff' : '✓ Before cutoff'}) - ${context.yesterday.nutrition.caffeineCups} cups` : '- No caffeine'}
${context.yesterday.nutrition?.sugar ? `- Sugar: ${context.yesterday.nutrition.sugar.toFixed(0)}g (${context.yesterday.nutrition.sugarDiff >= 0 ? '+' : ''}${context.yesterday.nutrition.sugarDiff.toFixed(0)}g vs baseline ${baseline.sugar.toFixed(0)}g)` : ''}
${context.yesterday.activity?.planned ? `- Workout: ${context.yesterday.activity.exerciseMinutes > 0 ? `${formatTime(context.yesterday.activity.workoutTime)} (${context.yesterday.activity.exerciseMinutes} min ${context.yesterday.activity.workoutType})` : 'Skipped (low energy)'}` : '- No workout planned'}
${context.yesterday.wellness ? `- Energy: ${context.yesterday.wellness.energy}/10 (${context.yesterday.wellness.energyDiff >= 0 ? '+' : ''}${context.yesterday.wellness.energyDiff.toFixed(1)} vs baseline), Mood: ${context.yesterday.wellness.mood}/10, Stress: ${context.yesterday.wellness.stress}/10` : ''}

TODAY (${context.today.date} - ${todayFormatted}):
${context.today.sleep ? `- Sleep: ${context.today.sleep.duration.toFixed(1)}h (quality: ${context.today.sleep.quality}/100, deep sleep: ${context.today.sleep.deepSleep}%)` : '- No sleep data yet'}
${context.today.nutrition?.caffeineTime ? `- Caffeine: ${formatTime(context.today.nutrition.caffeineTime)} (${context.today.nutrition.caffeineAfterCutoff ? '⚠️ AFTER cutoff' : '✓ Good timing'}) - ${context.today.nutrition.caffeineCups || 0} cups` : '- No caffeine yet'}
${context.today.nutrition?.sugar ? `- Sugar so far: ${context.today.nutrition.sugar.toFixed(0)}g` : ''}
${context.today.activity?.steps ? `- Steps: ${context.today.activity.steps.toLocaleString()}` : ''}
${context.today.wellness ? `- Energy: ${context.today.wellness.energy}/10, Mood: ${context.today.wellness.mood}/10` : ''}
${context.today.vitals?.restingHR ? `- Resting HR: ${context.today.vitals.restingHR} bpm` : ''}

(For context only - NOT part of 48-hour analysis) DAY BEFORE (${context.dayBefore.date} - ${dayBeforeFormatted}):
${context.dayBefore.sleep ? `- Sleep: ${context.dayBefore.sleep.duration.toFixed(1)}h (quality: ${context.dayBefore.sleep.quality}/100, deep sleep: ${context.dayBefore.sleep.deepSleep}%)` : '- No sleep data'}
${context.dayBefore.nutrition?.caffeineTime ? `- Caffeine: ${formatTime(context.dayBefore.nutrition.caffeineTime)} (${context.dayBefore.nutrition.caffeineCups} cups)` : '- No caffeine'}
${context.dayBefore.nutrition?.sugar ? `- Sugar: ${context.dayBefore.nutrition.sugar.toFixed(0)}g` : ''}
${context.dayBefore.activity?.workoutTime ? `- Workout: ${formatTime(context.dayBefore.activity.workoutTime)} (${context.dayBefore.activity.exerciseMinutes} min ${context.dayBefore.activity.workoutType})` : '- No workout'}
${context.dayBefore.wellness ? `- Energy: ${context.dayBefore.wellness.energy}/10, Mood: ${context.dayBefore.wellness.mood}/10, Stress: ${context.dayBefore.wellness.stress}/10` : ''}

IMPORTANT GUIDELINES - WRITE LIKE A REAL PERSON, NOT AN AI:
- Use NATURAL, CONVERSATIONAL language - write like you're texting a friend, not writing a formal report
- AVOID AI-speak and flowery language: NO "truly created", "wonderful foundation", "celebrated", "shone through", "amazing", "fantastic", "clearly", "crucially"
- Be DIRECT and SIMPLE: say "You got 7 hours of sleep" not "You gave yourself the gift of 7 hours of restorative sleep"
- Use normal everyday words: "good" not "fantastic", "helped" not "clearly supported", "today" not "today, your efforts shone through"
- Write in SHORT, CLEAR SENTENCES (max 15-20 words each)
- Use natural line breaks between related ideas
- Be honest and real - if something's off, mention it naturally
- ALWAYS conclude with a specific, actionable next step

BASELINE AVERAGES (last 14 days):
- Sleep: ${baseline.sleepDuration.toFixed(1)}h (quality: ${baseline.sleepQuality.toFixed(0)}/100)
- Sugar: ${baseline.sugar.toFixed(0)}g/day
- Energy: ${baseline.energy.toFixed(1)}/10
- Mood: ${baseline.mood.toFixed(1)}/10

TOP CORRELATION PATTERN:
${context.topCorrelation ? `${context.topCorrelation.pattern} (${(Math.abs(context.topCorrelation.strength) * 100).toFixed(0)}% connected, ${context.topCorrelation.lag > 0 ? `${context.topCorrelation.lag}-day delay` : 'same-day'})` : 'None detected'}

Generate a natural, conversational health summary that:
1. Starts with "Summary:" as the header
2. Focuses on the LAST 48 HOURS ONLY (yesterday + today)
3. When mentioning caffeine, use the 48-HOUR TOTAL: ${caffeine48Hours} cups (NOT individual day counts)
4. Uses SHORT, DIRECT sentences (max 15-20 words) - write like you're talking to a friend
5. Includes 2-3 line breaks (double newlines) to create visual separation between related ideas
6. Tells what happened and why it matters, without flowery language
7. Uses SPECIFIC numbers and dates naturally
8. References the top correlation pattern when relevant, but keep it simple
9. Always specify exact dates when mentioning events (e.g., "${yesterdayFormatted}" or "${todayFormatted}")
10. ALWAYS conclude with a specific, actionable next step

BAD EXAMPLES (too AI-like, flowery):
- "You truly created a wonderful foundation"
- "You gave yourself the gift of great sleep"
- "Your efforts shone through even brighter"
- "This mindful approach clearly paid off"
- "Crucially, all were timed perfectly"

GOOD EXAMPLES (natural, direct):
- "On ${yesterdayFormatted}, you got ${context.yesterday.sleep?.duration.toFixed(1)} hours of sleep"
- "Your sleep quality was ${context.yesterday.sleep?.quality}/100"
- "You had ${caffeine48Hours} cups of caffeine over the last 2 days, all before 2 PM"
- "Today you got ${context.today.sleep?.duration.toFixed(1)} hours and hit ${context.today.activity?.steps?.toLocaleString() || 0} steps"

Format example (with line breaks, natural tone):
"Summary: On ${yesterdayFormatted}, you got ${context.yesterday.sleep?.duration.toFixed(1)} hours of sleep with ${context.yesterday.sleep?.quality}/100 quality. Your sugar was ${context.yesterday.nutrition?.sugar?.toFixed(0) || 0}g, which is ${context.yesterday.nutrition?.sugarDiff > 0 ? 'higher' : 'lower'} than usual.

Over the last 48 hours, you had ${caffeine48Hours} cups of caffeine, all before 2 PM. That timing helps your sleep.

Today, ${todayFormatted}, you got ${context.today.sleep?.duration.toFixed(1)} hours of sleep and ${context.today.activity?.steps?.toLocaleString() || 0} steps. Your energy is at ${context.today.wellness?.energy || 0}/10. ${context.topCorrelation ? `Since ${context.topCorrelation.pattern.split('→')[0]} affects your ${context.topCorrelation.pattern.split('→')[1]}, keeping screen time low helps your deep sleep.` : ''}

Try dimming the lights an hour earlier tonight to keep this going."`;

  try {
    const response = await generateContent(prompt, { temperature: 0.9, maxTokens: 400, context: 'timeline' });
    if (response.success && response.text) {
      // Clean up the response: ensure it starts with "Summary:" if not already
      let cleaned = response.text.trim();
      // Remove old prefixes
      cleaned = cleaned.replace(/^Pattern Story:\s*/i, '');
      cleaned = cleaned.replace(/^Health Journey:\s*/i, '');
      cleaned = cleaned.replace(/^48-Hour Insight:\s*/i, '');
      // Add "Summary:" if not present
      if (!cleaned.match(/^Summary:/i)) {
        cleaned = 'Summary: ' + cleaned;
      }
      return cleaned;
    }
    throw new Error(response.error || 'AI generation failed');
  } catch (error) {
    console.error('Error generating timeline narrative:', error);
    // Enhanced fallback narrative - natural tone
    const parts = [];
    
    if (context.yesterday.sleep) {
      parts.push(`On ${yesterdayFormatted}, you got ${context.yesterday.sleep.duration.toFixed(1)} hours of sleep`);
    }
    if (context.today.sleep) {
      parts.push(`Today you got ${context.today.sleep.duration.toFixed(1)} hours`);
    }
    if (context.today.activity?.steps && context.today.activity.steps > 8000) {
      parts.push(`You hit ${context.today.activity.steps.toLocaleString()} steps today`);
    }
    
    if (parts.length > 0) {
      return `Summary: ${parts.join('. ')}. Keep it up.`;
    }
    
    return `Summary: Tracking your health patterns over the last 48 hours. View the full timeline for detailed insights.`;
    }
  });
};

// Generate daily insight
export const generateDailyInsight = async (allData, date = null) => {
  const dates = getAvailableDates(allData);
  const targetDate = date || dates[dates.length - 1];
  const dateData = getDataForDate(allData, targetDate);
  
  if (!dateData.sleep && !dateData.activity && !dateData.wellness) {
    return null;
  }
  
  const cacheParams = {
    date: targetDate
  };
  
  return await withCache('dailyInsight', cacheParams, async () => {
  
  // Get correlations relevant to today's data
  const correlations = calculateAllCorrelations(allData, 0.5, 3);
  
  // Find anomalies for this date
  const allAnomalies = detectAllAnomalies(allData);
  const dateAnomalies = [];
  allAnomalies.forEach(metricAnomalies => {
    const anomaly = metricAnomalies.anomalies.find(a => a.date === targetDate);
    if (anomaly) {
      dateAnomalies.push(formatAnomalyAlert(anomaly, allData));
    }
  });
  
  const prompt = `You are a supportive health coach with a warm, empathetic approach. Generate a brief, encouraging insight for ${targetDate}:

Today's Data:
${dateData.sleep ? `Sleep: ${dateData.sleep.sleep_duration_hours}h (quality: ${dateData.sleep.sleep_duration_hours >= 7 ? 'good' : 'needs improvement'})` : ''}
${dateData.activity ? `Activity: ${dateData.activity.steps} steps, ${dateData.activity.exercise_minutes} min exercise` : ''}
${dateData.wellness ? `Wellness: Stress ${dateData.wellness.stress_level}/10, Energy ${dateData.wellness.energy_level}/10, Mood ${dateData.wellness.mood_score}/10` : ''}
${dateData.nutrition ? `Nutrition: ${dateData.nutrition.calories} calories, ${dateData.nutrition.sugar_g}g sugar` : ''}

${dateAnomalies.length > 0 ? `Notable: ${dateAnomalies[0]?.message || ''}` : ''}

IMPORTANT GUIDELINES:
- Use a supportive, conversational coaching tone that balances empathy with insight
- Avoid technical jargon - use plain, easy-to-understand language
- Be warm and encouraging, not clinical
- ALWAYS conclude with a specific, personalized next step the user can take today

Generate a 2-3 sentence daily insight that:
1. Highlights something positive or noteworthy about today's data
2. Provides one actionable tip or observation
3. Is encouraging and motivating
4. Ends with a personalized next step the user can take today

Keep it brief, friendly, and supportive.`;

  try {
    const response = await generateContent(prompt, { temperature: 0.9, maxTokens: 150, context: 'dashboard' });
    if (!response.success || !response.text) {
      throw new Error(response.error || 'AI generation failed');
    }
    return {
      insight: response.text,
      date: targetDate,
      hasAnomalies: dateAnomalies.length > 0
    };
  } catch (error) {
    return {
      insight: `Today's health data shows ${dateData.sleep ? `${dateData.sleep.sleep_duration_hours}h sleep` : 'activity'} and ${dateData.wellness ? `energy level of ${dateData.wellness.energy_level}/10` : 'wellness metrics'}. Keep tracking your progress!`,
      date: targetDate,
      hasAnomalies: dateAnomalies.length > 0
    };
    }
  });
};

