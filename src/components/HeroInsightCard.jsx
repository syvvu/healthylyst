// Enhanced Hero Insight Card Component
// Matches detailed visual specifications with gradient background

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight, CheckCircle2, Brain } from 'lucide-react';
import { calculateAllCorrelations } from '../utils/correlationAnalysis';
import { selectHeroInsight } from '../utils/insightScoring';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getDataForDate, getAvailableDates } from '../utils/dataLoader';
import { format } from 'date-fns';
import { generateContent } from '../utils/geminiClient';
import { withCache } from '../utils/aiCache';

const theme = {
  background: {
    card: '#ffffff',
  },
  border: {
    primary: '#bae6fd',
  },
  text: {
    primary: '#0c4a6e',
    secondary: '#334155',
    tertiary: '#64748b',
  },
  accent: {
    primary: '#0ea5e9',
    purple: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
  }
};

const HeroInsightCard = ({ allHealthData, selectedDate, onSeeFullAnalysis }) => {
  const navigate = useNavigate();
  const [insight, setInsight] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const currentRequestIdRef = useRef(0);
  const lastDateRef = useRef(null);

  useEffect(() => {
    if (!allHealthData || !selectedDate) return;

    // Create a stable date string for comparison
    const dateKey = selectedDate instanceof Date 
      ? selectedDate.toISOString().split('T')[0] 
      : selectedDate;
    
    // Reset insight if date changed
    if (lastDateRef.current !== dateKey) {
      setInsight(null);
      setChartData([]);
    }
    
    lastDateRef.current = dateKey;
    
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    isMountedRef.current = true;
    currentRequestIdRef.current += 1;
    const requestId = currentRequestIdRef.current;

    const loadInsight = async () => {
      setLoading(true);
      
      // Check if component is still mounted
      if (!isMountedRef.current || signal.aborted) return;
      try {
        // Get all correlations
        const correlations = calculateAllCorrelations(allHealthData, 0.3, 3);
        
        // Filter to only correlations above minimum threshold
        const validCorrelations = correlations.filter(c => Math.abs(c.correlation) >= 0.4);
        
        if (validCorrelations.length === 0) {
          // Keep loading state to show animation instead of default text
          // The loading animation will continue to show
          return;
        }
        
        // Use multi-factor scoring system to select the most interesting insight
        let topCorrelation = selectHeroInsight(allHealthData, validCorrelations);
        
        if (!topCorrelation) {
          // Fallback to strongest correlation if scoring fails
          topCorrelation = validCorrelations[0];
        }

        if (topCorrelation) {
          const dates = getAvailableDates(allHealthData);
          const recentDates = dates.slice(-14); // Last 14 days
          
          const chartDataPoints = recentDates.map(date => {
            // Parse date string as local date to avoid timezone issues
            const parseLocalDate = (dateStr) => {
              const [year, month, day] = dateStr.split('-').map(Number);
              return new Date(year, month - 1, day);
            };
            
            const dayData = getDataForDate(allHealthData, date);
            let value1 = dayData[topCorrelation.metric1Category]?.[topCorrelation.metric1];
            let value2 = dayData[topCorrelation.metric2Category]?.[topCorrelation.metric2];
            
            // Convert time strings to numeric hours for chart display
            if (topCorrelation.metric1?.includes('time') || topCorrelation.metric1?.includes('caffeine_last_time')) {
              value1 = timeToHours(value1);
            }
            if (topCorrelation.metric2?.includes('time') || topCorrelation.metric2?.includes('caffeine_last_time')) {
              value2 = timeToHours(value2);
            }
            
            return {
              date: format(parseLocalDate(date), 'MMM dd'),
              fullDate: date,
              metric1: value1 !== null && value1 !== undefined && typeof value1 === 'number' && !isNaN(value1) ? value1 : null,
              metric2: value2 !== null && value2 !== undefined && typeof value2 === 'number' && !isNaN(value2) ? value2 : null,
            };
          }).filter(d => d.metric1 !== null && d.metric2 !== null);

          // Count occurrences
          const occurrences = chartDataPoints.length;
          
          const threshold = getThreshold(topCorrelation, allHealthData);
          const impact = getImpact(topCorrelation, allHealthData);
          
          // Generate enhanced narrative with specific numbers, thresholds, and time relationships
          const metric1Label = topCorrelation.metric1Label || topCorrelation.metric1;
          const metric2Label = topCorrelation.metric2Label || topCorrelation.metric2;
          const lag = topCorrelation.lag || 0;
          
          // Calculate threshold value (numeric) for impact calculation
          const allDates = getAvailableDates(allHealthData);
          const metric1Values = allDates.map(date => {
            const dayData = getDataForDate(allHealthData, date);
            let value = dayData[topCorrelation.metric1Category]?.[topCorrelation.metric1];
            // Convert time strings to numeric hours
            if (topCorrelation.metric1?.includes('time') || topCorrelation.metric1?.includes('caffeine_last_time')) {
              value = timeToHours(value);
            }
            return value;
          }).filter(v => v !== null && v !== undefined && typeof v === 'number' && !isNaN(v));
          
          const thresholdValue = metric1Values.length > 0 
            ? metric1Values.sort((a, b) => a - b)[Math.floor(metric1Values.length / 2)]
            : 0;
          
          // Calculate specific impact numbers
          const impactDetails = getDetailedImpact(topCorrelation, allHealthData, thresholdValue);
          
          // Generate time relationship text
          let timeRelationship = '';
          if (lag === 1) {
            timeRelationship = 'the next day';
          } else if (lag > 1) {
            timeRelationship = `${lag} days later`;
          } else {
            // Same day - check if it's a timing relationship
            if (topCorrelation.metric1?.includes('caffeine') || topCorrelation.metric1?.includes('time')) {
              timeRelationship = 'that same night';
            } else if (topCorrelation.metric2?.includes('afternoon') || topCorrelation.metric2?.includes('sugar')) {
              timeRelationship = 'the next afternoon (2-5 PM)';
            } else {
              timeRelationship = 'the same day';
            }
          }
          
          // Determine causality direction
          const causality = determineCausality(topCorrelation);
          const causeMetric = causality.shouldSwap ? {
            label: metric2Label,
            name: topCorrelation.metric2,
            category: topCorrelation.metric2Category
          } : {
            label: metric1Label,
            name: topCorrelation.metric1,
            category: topCorrelation.metric1Category
          };
          const effectMetric = causality.shouldSwap ? {
            label: metric1Label,
            name: topCorrelation.metric1,
            category: topCorrelation.metric1Category
          } : {
            label: metric2Label,
            name: topCorrelation.metric2,
            category: topCorrelation.metric2Category
          };
          
          // Create swapped correlation for description generation if needed
          const correlationForDesc = causality.shouldSwap ? {
            ...topCorrelation,
            metric1: effectMetric.name,
            metric1Label: effectMetric.label,
            metric1Category: effectMetric.category,
            metric2: causeMetric.name,
            metric2Label: causeMetric.label,
            metric2Category: causeMetric.category,
            correlation: -topCorrelation.correlation // Flip correlation when swapping
          } : topCorrelation;
          
          // Calculate baseline values for comparison
          const allMetric1Values = allDates.map(date => {
            const dayData = getDataForDate(allHealthData, date);
            let value = dayData[causeMetric.category]?.[causeMetric.name];
            // Convert time strings to numeric hours
            if (causeMetric.name?.includes('time') || causeMetric.name?.includes('caffeine_last_time')) {
              value = timeToHours(value);
            }
            return {
              date,
              value
            };
          }).filter(d => d.value !== null && d.value !== undefined && typeof d.value === 'number' && !isNaN(d.value));
          
          const allMetric2Values = allDates.map(date => {
            const dayData = getDataForDate(allHealthData, date);
            let value = dayData[effectMetric.category]?.[effectMetric.name];
            // Convert time strings to numeric hours
            if (effectMetric.name?.includes('time') || effectMetric.name?.includes('caffeine_last_time')) {
              value = timeToHours(value);
            }
            return {
              date,
              value
            };
          }).filter(d => d.value !== null && d.value !== undefined && typeof d.value === 'number' && !isNaN(d.value));
          
          // Calculate baseline (median or average)
          const baseline1 = allMetric1Values.length > 0
            ? allMetric1Values.map(d => d.value).sort((a, b) => a - b)[Math.floor(allMetric1Values.length / 2)]
            : null;
          const baseline2 = allMetric2Values.length > 0
            ? allMetric2Values.map(d => d.value).sort((a, b) => a - b)[Math.floor(allMetric2Values.length / 2)]
            : null;
          
          // Find best and worst examples
          const getBestWorstExamples = () => {
            // Get days where metric1 meets threshold (good condition)
            const goodConditionDays = allDates.map(date => {
              const dayData = getDataForDate(allHealthData, date);
              let val1 = dayData[causeMetric.category]?.[causeMetric.name];
              let val2 = dayData[effectMetric.category]?.[effectMetric.name];
              
              // Convert time strings to numeric hours
              if (causeMetric.name?.includes('time') || causeMetric.name?.includes('caffeine_last_time')) {
                val1 = timeToHours(val1);
              }
              if (effectMetric.name?.includes('time') || effectMetric.name?.includes('caffeine_last_time')) {
                val2 = timeToHours(val2);
              }
              
              if (val1 === null || val1 === undefined || val2 === null || val2 === undefined ||
                  typeof val1 !== 'number' || typeof val2 !== 'number' || isNaN(val1) || isNaN(val2)) return null;
              
              // Check if metric1 meets threshold (for sleep, this might be >= 7 hours)
              const meetsThreshold = typeof thresholdValue === 'number' 
                ? (causeMetric.name.includes('sleep') || causeMetric.name.includes('duration') 
                    ? val1 >= thresholdValue 
                    : val1 <= thresholdValue)
                : true;
              
              return {
                date,
                metric1Value: val1,
                metric2Value: val2,
                meetsThreshold
              };
            }).filter(d => d !== null);
            
            const goodDays = goodConditionDays.filter(d => d.meetsThreshold);
            const badDays = goodConditionDays.filter(d => !d.meetsThreshold);
            
            // Sort by metric2 value (effect metric) to find best/worst
            const sortedGood = [...goodDays].sort((a, b) => {
              // For timing metrics (caffeine time), lower is better (earlier)
              if (effectMetric.name.includes('time') || effectMetric.name.includes('caffeine')) {
                return a.metric2Value - b.metric2Value;
              }
              // For most metrics, higher is better
              return b.metric2Value - a.metric2Value;
            });
            
            const sortedBad = [...badDays].sort((a, b) => {
              if (effectMetric.name.includes('time') || effectMetric.name.includes('caffeine')) {
                return b.metric2Value - a.metric2Value; // Later is worse
              }
              return a.metric2Value - b.metric2Value; // Lower is worse
            });
            
            return {
              bestExamples: sortedGood.slice(0, Math.min(10, sortedGood.length)),
              worstExamples: sortedBad.slice(0, Math.min(8, sortedBad.length)),
              goodCount: goodDays.length,
              badCount: badDays.length
            };
          };
          
          const examples = getBestWorstExamples();
          
          // Get today's data for actionable suggestion
          const todayData = getDataForDate(allHealthData, dateKey);
          let todayMetric1 = todayData[causeMetric.category]?.[causeMetric.name];
          let todayMetric2 = todayData[effectMetric.category]?.[effectMetric.name];
          
          // Convert time strings to numeric hours
          if (causeMetric.name?.includes('time') || causeMetric.name?.includes('caffeine_last_time')) {
            todayMetric1 = timeToHours(todayMetric1);
          }
          if (effectMetric.name?.includes('time') || effectMetric.name?.includes('caffeine_last_time')) {
            todayMetric2 = timeToHours(todayMetric2);
          }
          
          // Format threshold for display
          const formatThreshold = (value, metricName) => {
            if (metricName?.includes('time') || metricName?.includes('caffeine_last_time')) {
              return formatHoursToTime(value) || `${value.toFixed(1)} hours`;
            }
            if (metricName?.includes('efficiency') || metricName?.includes('percent') || metricName?.includes('score')) {
              return `${value.toFixed(0)}%`;
            }
            if (metricName?.includes('hours') || metricName?.includes('duration')) {
              return `${value.toFixed(1)} hours`;
            }
            if (metricName?.includes('cups') || metricName?.includes('count')) {
              return `${value.toFixed(1)}`;
            }
            return value.toFixed(1);
          };
          
          // Build correlation context for AI - ensure all data is properly structured
          const correlationContext = {
            metric1: {
              label: causeMetric.label,
              name: causeMetric.name,
              category: causeMetric.category,
              threshold: formatThreshold(thresholdValue, causeMetric.name),
              thresholdValue: thresholdValue,
              baseline: baseline1
            },
            metric2: {
              label: effectMetric.label,
              name: effectMetric.name,
              category: effectMetric.category,
              baseline: baseline2
            },
            correlation: topCorrelation.correlation,
            lag: lag,
            threshold: formatThreshold(thresholdValue, causeMetric.name),
            impactDetails: impactDetails,
            occurrences: occurrences,
            timeRelationship: timeRelationship,
            examples: examples,
            today: {
              metric1: todayMetric1,
              metric2: todayMetric2
            }
          };
          
          // Generate both title and description using AI (with caching)
          let title = '';
          let description = '';
          
          try {
            // Create cache params
            const dateKey = selectedDate instanceof Date 
              ? selectedDate.toISOString().split('T')[0] 
              : selectedDate;
            
            const cacheParams = {
              selectedDate: dateKey,
              correlation: {
                metric1: correlationContext.metric1.label,
                metric2: correlationContext.metric2.label,
                correlation: correlationContext.correlation
              }
            };
            
            // Try to get from cache first
            const cachedResult = await withCache('heroInsight', cacheParams, async () => {
              // Format examples for prompt
              const formatExamples = () => {
                if (!correlationContext.examples || correlationContext.examples.bestExamples.length === 0) {
                  return '';
                }
                
                const best = correlationContext.examples.bestExamples;
                const worst = correlationContext.examples.worstExamples;
                
                // Helper to format value based on metric type
                const formatValue = (value, metricName) => {
                  if (metricName?.includes('time') || metricName?.includes('caffeine_last_time')) {
                    return formatHoursToTime(value) || value.toFixed(1);
                  }
                  return value.toFixed(1);
                };
                
                let examplesText = `\nREAL DATA EXAMPLES:\n`;
                
                if (best.length > 0) {
                  examplesText += `\nBest ${best.length} examples (when ${correlationContext.metric1.label} meets threshold of ${correlationContext.threshold}):\n`;
                  best.slice(0, 5).forEach((ex, i) => {
                    examplesText += `${i + 1}. ${ex.date}: ${correlationContext.metric1.label} = ${formatValue(ex.metric1Value, correlationContext.metric1.name)}, ${correlationContext.metric2.label} = ${formatValue(ex.metric2Value, correlationContext.metric2.name)}\n`;
                  });
                }
                
                if (worst.length > 0) {
                  examplesText += `\nWorst ${worst.length} examples (when ${correlationContext.metric1.label} does NOT meet threshold):\n`;
                  worst.slice(0, 5).forEach((ex, i) => {
                    examplesText += `${i + 1}. ${ex.date}: ${correlationContext.metric1.label} = ${formatValue(ex.metric1Value, correlationContext.metric1.name)}, ${correlationContext.metric2.label} = ${formatValue(ex.metric2Value, correlationContext.metric2.name)}\n`;
                  });
                }
                
                examplesText += `\nPattern: ${best.length} out of ${best.length + worst.length} days with good ${correlationContext.metric1.label} also had better ${correlationContext.metric2.label}\n`;
                
                return examplesText;
              };
              
              // Helper to format baseline value
              const formatBaseline = (value, metricName) => {
                if (metricName?.includes('time') || metricName?.includes('caffeine_last_time')) {
                  return formatHoursToTime(value) || value.toFixed(1);
                }
                return value.toFixed(1);
              };
              
              // Format avgBelow and avgAbove for time metrics
              const formatAvgTime = (avgValue, metricName) => {
                if (metricName?.includes('time') || metricName?.includes('caffeine_last_time')) {
                  return formatHoursToTime(avgValue) || `${avgValue.toFixed(1)} hours`;
                }
                return avgValue.toFixed(1);
              };
              
              const baselineComparison = correlationContext.metric2.baseline 
                ? `\nBaseline for ${correlationContext.metric2.label}: ${formatBaseline(correlationContext.metric2.baseline, correlationContext.metric2.name)}${correlationContext.impactDetails.unit} (median across all days)`
                : '';
              
              // Add average values for better context
              // Note: In getDetailedImpact, aboveThreshold = good condition (meets threshold), belowThreshold = bad condition
              // For sleep: good sleep (>= threshold) → earlier caffeine (lower number is better for time)
              // So avgAbove should be lower (earlier) than avgBelow for negative correlations
              const avgComparison = correlationContext.impactDetails.unit === 'hours' && 
                (correlationContext.metric2.name?.includes('time') || correlationContext.metric2.name?.includes('caffeine_last_time'))
                ? `\nAverage ${correlationContext.metric2.label} when ${correlationContext.metric1.label} meets threshold: ${formatAvgTime(correlationContext.impactDetails.avgAbove, correlationContext.metric2.name)}\nAverage ${correlationContext.metric2.label} when ${correlationContext.metric1.label} does NOT meet threshold: ${formatAvgTime(correlationContext.impactDetails.avgBelow, correlationContext.metric2.name)}`
                : '';
              
              // Get yesterday's date for context
              const dates = getAvailableDates(allHealthData);
              const todayIndex = dates.indexOf(dateKey);
              const yesterdayKey = todayIndex > 0 ? dates[todayIndex - 1] : null;
              const yesterdayData = yesterdayKey ? getDataForDate(allHealthData, yesterdayKey) : null;
              
              // Build full dataset summary
              const totalDays = dates.length;
              const datasetSummary = `\nFULL DATASET CONTEXT (${totalDays} days of data):
- This pattern is based on analysis of all ${totalDays} days in your dataset
- The correlation strength (${(Math.abs(correlationContext.correlation) * 100).toFixed(0)}%) is calculated across all available data points
- The examples and averages shown below represent patterns observed across your entire health history
- While this insight is based on your full dataset, focus your analysis on YESTERDAY and TODAY specifically`;

              // Build yesterday/today specific context
              let yesterdayTodayContext = '';
              if (yesterdayData && yesterdayKey) {
                const yesterdayMetric1 = causeMetric.name?.includes('time') || causeMetric.name?.includes('caffeine_last_time')
                  ? timeToHours(yesterdayData[causeMetric.category]?.[causeMetric.name])
                  : yesterdayData[causeMetric.category]?.[causeMetric.name];
                const yesterdayMetric2 = effectMetric.name?.includes('time') || effectMetric.name?.includes('caffeine_last_time')
                  ? timeToHours(yesterdayData[effectMetric.category]?.[effectMetric.name])
                  : yesterdayData[effectMetric.category]?.[effectMetric.name];
                
                yesterdayTodayContext = `\n\nYESTERDAY & TODAY FOCUS (Analyze these two days specifically):
YESTERDAY (${yesterdayKey}):
- ${correlationContext.metric1.label}: ${yesterdayMetric1 !== null && yesterdayMetric1 !== undefined ? formatBaseline(yesterdayMetric1, correlationContext.metric1.name) : 'not recorded'}
- ${correlationContext.metric2.label}: ${yesterdayMetric2 !== null && yesterdayMetric2 !== undefined ? formatBaseline(yesterdayMetric2, correlationContext.metric2.name) : 'not recorded'}

TODAY (${dateKey}):
- ${correlationContext.metric1.label}: ${correlationContext.today.metric1 !== null && correlationContext.today.metric1 !== undefined ? formatBaseline(correlationContext.today.metric1, correlationContext.metric1.name) : 'not yet recorded'}
- ${correlationContext.metric2.label}: ${correlationContext.today.metric2 !== null && correlationContext.today.metric2 !== undefined ? formatBaseline(correlationContext.today.metric2, correlationContext.metric2.name) : 'not yet recorded'}

IMPORTANT: While you have access to the full ${totalDays}-day dataset context above, your analysis should FOCUS on what happened YESTERDAY and TODAY, using the full dataset patterns to provide context and meaning.`;
              }
              
              const aiPrompt = `You are a caring, professional health advisor. Write naturally and clearly.

Based on this correlation data, generate:
1. A short title (max 10 words, no quotes)
2. A clear description (3-4 sentences, no quotes) that ends with a specific, actionable next step

CORRELATION DATA:
- Metric 1: ${correlationContext.metric1.label} (${correlationContext.metric1.category})
- Metric 2: ${correlationContext.metric2.label} (${correlationContext.metric2.category})
- Correlation strength: ${(Math.abs(correlationContext.correlation) * 100).toFixed(0)}% (${correlationContext.occurrences} data points)
- Pattern: When ${correlationContext.metric1.label} is ${correlationContext.threshold}, ${correlationContext.metric2.label} changes by ${correlationContext.impactDetails.diff.toFixed(1)}${correlationContext.impactDetails.unit} ${correlationContext.timeRelationship}
- Direction: ${correlationContext.correlation > 0 ? 'positive' : 'negative'}${baselineComparison}${avgComparison}${formatExamples()}${datasetSummary}${yesterdayTodayContext}

WRITING GUIDELINES:
- Write like a caring professional - warm, clear, and respectful
- Use simple language anyone can understand
- Avoid casual slang ("dude", "hey") and overly formal AI phrases ("It's wonderful to see", "We've observed")
- Figure out the relationship yourself - which metric affects which? (e.g., caffeine timing affects sleep, not the other way around)
- Suggest a next step that directly relates to these two metrics only
- If the action already happened today (e.g., caffeine already consumed), suggest what to do tonight/tomorrow instead

Format:
TITLE: [title]
DESCRIPTION: [3-4 sentences: explain the relationship, give an example, connect to recent data, end with actionable next step]`;

              const aiResponse = await generateContent(aiPrompt, { temperature: 0.8, maxTokens: 200, context: 'dashboard' });
              if (aiResponse.success && aiResponse.text) {
                const responseText = aiResponse.text.trim();
                
                // Parse title and description from AI response
                let parsedTitle = '';
                let parsedDesc = '';
                
                const titleMatch = responseText.match(/TITLE:\s*(.+?)(?:\n|DESCRIPTION:)/i);
                const descMatch = responseText.match(/DESCRIPTION:\s*(.+?)(?:\n|$)/is);
                
                if (titleMatch && titleMatch[1]) {
                  parsedTitle = titleMatch[1].trim().replace(/^["']|["']$/g, '');
                }
                if (descMatch && descMatch[1]) {
                  parsedDesc = descMatch[1].trim().replace(/^["']|["']$/g, '');
                }
                
                // Fallback if parsing fails
                if (!parsedTitle || !parsedDesc) {
                  const lines = responseText.split('\n').filter(l => l.trim());
                  if (lines.length >= 2) {
                    parsedTitle = lines[0].replace(/^TITLE:\s*/i, '').replace(/^["']|["']$/g, '').trim();
                    parsedDesc = lines.slice(1).join(' ').replace(/^DESCRIPTION:\s*/i, '').replace(/^["']|["']$/g, '').trim();
                  } else {
                    parsedDesc = responseText.replace(/^["']|["']$/g, '').trim();
                    parsedTitle = `Your ${causeMetric.label} Affects ${effectMetric.label}`;
                  }
                }
                
                return { title: parsedTitle, description: parsedDesc };
              } else {
                throw new Error('AI response failed');
              }
            });
            
            // Use cached or newly generated result
            if (cachedResult && cachedResult.title && cachedResult.description) {
              title = cachedResult.title;
              description = cachedResult.description;
            } else {
              throw new Error('Failed to generate insight');
            }
          } catch (error) {
            console.error('Error generating AI title/description:', error);
            // Fallback to generated title and description
            if (lag > 0) {
              title = `Your ${causeMetric.label} Directly Controls ${effectMetric.label} ${lag} Day${lag > 1 ? 's' : ''} Later`;
            } else {
              title = `Your ${causeMetric.label} Directly Controls ${effectMetric.label}`;
            }
            const thresholdText = getThresholdText(correlationForDesc, threshold);
            const impactText = getImpactText(correlationForDesc, impactDetails);
            const contextText = getContextText(correlationForDesc, impactDetails);
            description = `When you ${thresholdText}, your ${effectMetric.label.toLowerCase()} ${impactText} ${timeRelationship}—${contextText}`;
          }
          
          // Calculate confidence with context
          const baseConfidence = Math.min(95, Math.max(70, Math.abs(topCorrelation.correlation) * 100));
          const confidence = Math.min(95, baseConfidence + (occurrences > 20 ? 5 : 0));
          const confidenceLevel = getConfidenceLevel(confidence);
          const populationComparison = getPopulationComparison(topCorrelation);
          
          if (isMountedRef.current && !signal.aborted && requestId === currentRequestIdRef.current) {
          setInsight({
              title: title,
              description: description,
              correlation: topCorrelation.correlation,
              confidence: confidence,
              confidenceLevel: confidenceLevel,
              populationComparison: populationComparison,
              occurrences: occurrences,
              sources: [topCorrelation.metric1Category, topCorrelation.metric2Category],
              metric1: topCorrelation.metric1,
              metric2: topCorrelation.metric2,
              metric1Label: metric1Label,
              metric2Label: metric2Label,
              metric1Category: topCorrelation.metric1Category,
              metric2Category: topCorrelation.metric2Category,
              lag: topCorrelation.lag || 0,
              impactDetails: impactDetails
            });
            
            setChartData(chartDataPoints);
            // Only stop loading when we successfully have an insight
            setLoading(false);
          }
          }
        } catch (error) {
          // Only handle error if component is still mounted, not aborted, and this is the latest request
          if (!isMountedRef.current || signal.aborted || requestId !== currentRequestIdRef.current) return;
          
          console.error('Error loading insight:', error);
        // Don't set default insight - keep showing loading animation
        // The animation will continue to show until data is available
        }
      };

      loadInsight();
      
      // Cleanup function
      return () => {
        isMountedRef.current = false;
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }, [allHealthData, selectedDate]);

  // Convert time string or number to numeric hours
  const timeToHours = (time) => {
    if (!time) {
      return null;
    }
    // Handle "HH:MM" format (e.g., "14:45")
    if (typeof time === 'string' && time.includes(':')) {
      const [h, m] = time.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) {
        return null;
      }
      return h + (m / 60); // Convert to decimal hours (e.g., "14:45" -> 14.75)
    }
    // Already a number
    return typeof time === 'number' ? time : parseFloat(time);
  };
  
  // Format numeric hours to readable time string
  const formatHoursToTime = (hours) => {
    if (hours === null || hours === undefined || isNaN(hours)) {
      return null;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return m === 0 ? `${displayHour}:00 ${period}` : `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const getThreshold = (correlation, allHealthData) => {
    if (!correlation || !allHealthData) return 'the threshold';
    
    // Calculate actual threshold from data
    const dates = getAvailableDates(allHealthData);
    const metric1Values = [];
    const metric2Values = [];
    
    dates.forEach(date => {
      const dayData = getDataForDate(allHealthData, date);
      let val1 = dayData[correlation.metric1Category]?.[correlation.metric1];
      let val2 = dayData[correlation.metric2Category]?.[correlation.metric2];
      
      // Convert time strings to numeric hours for time-based metrics
      if (correlation.metric1?.includes('time') || correlation.metric1?.includes('caffeine_last_time')) {
        val1 = timeToHours(val1);
      }
      if (correlation.metric2?.includes('time') || correlation.metric2?.includes('caffeine_last_time')) {
        val2 = timeToHours(val2);
      }
      
      if (val1 !== null && val1 !== undefined && val2 !== null && val2 !== undefined && 
          typeof val1 === 'number' && typeof val2 === 'number' && !isNaN(val1) && !isNaN(val2)) {
        metric1Values.push({ x: val1, y: val2 });
      }
    });
    
    if (metric1Values.length === 0) return 'the threshold';
    
    // Find threshold where outcome changes significantly
    const sorted = [...metric1Values].sort((a, b) => a.x - b.x);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    if (correlation.metric1?.includes('sleep') || correlation.metric1?.includes('duration')) {
      return `${median.x.toFixed(1)} hours`;
    }
    if (correlation.metric1?.includes('caffeine') || correlation.metric1?.includes('time')) {
      // Format as readable time (e.g., 13.75 -> "1:45 PM")
      return formatHoursToTime(median.x) || `${Math.round(median.x)}:00`;
    }
    return `${median.x.toFixed(1)}`;
  };

  const getImpact = (correlation, allHealthData) => {
    if (!correlation || !allHealthData) return 'significantly more';
    
    // Calculate actual impact from data
    const dates = getAvailableDates(allHealthData);
    const belowThreshold = [];
    const aboveThreshold = [];
    
    // Calculate threshold
    const metric1Values = dates.map(date => {
      const dayData = getDataForDate(allHealthData, date);
      let val = dayData[correlation.metric1Category]?.[correlation.metric1];
      // Convert time strings to numeric hours
      if (correlation.metric1?.includes('time') || correlation.metric1?.includes('caffeine_last_time')) {
        val = timeToHours(val);
      }
      return val;
    }).filter(v => v !== null && v !== undefined && typeof v === 'number' && !isNaN(v));
    
    if (metric1Values.length === 0) return 'significantly more';
    
    const threshold = metric1Values.sort((a, b) => a - b)[Math.floor(metric1Values.length / 2)];
    
    dates.forEach(date => {
      const dayData = getDataForDate(allHealthData, date);
      let val1 = dayData[correlation.metric1Category]?.[correlation.metric1];
      let val2 = dayData[correlation.metric2Category]?.[correlation.metric2];
      
      // Convert time strings to numeric hours
      if (correlation.metric1?.includes('time') || correlation.metric1?.includes('caffeine_last_time')) {
        val1 = timeToHours(val1);
      }
      if (correlation.metric2?.includes('time') || correlation.metric2?.includes('caffeine_last_time')) {
        val2 = timeToHours(val2);
      }
      
      if (val1 !== null && val1 !== undefined && val2 !== null && val2 !== undefined &&
          typeof val1 === 'number' && typeof val2 === 'number' && !isNaN(val1) && !isNaN(val2)) {
        if (val1 < threshold) {
          belowThreshold.push(val2);
        } else {
          aboveThreshold.push(val2);
        }
      }
    });
    
    if (belowThreshold.length === 0 || aboveThreshold.length === 0) return 'significantly more';
    
    const avgBelow = belowThreshold.reduce((a, b) => a + b, 0) / belowThreshold.length;
    const avgAbove = aboveThreshold.reduce((a, b) => a + b, 0) / aboveThreshold.length;
    const diff = Math.abs(avgBelow - avgAbove);
    
    if (correlation.metric2?.includes('sugar') || correlation.metric2?.includes('g')) {
      return `${diff.toFixed(0)}g more`;
    }
    if (correlation.metric2?.includes('energy') || correlation.metric2?.includes('level')) {
      return `${diff.toFixed(1)} points lower`;
    }
    return `${diff.toFixed(1)} more`;
  };

  // Get detailed impact information
  const getDetailedImpact = (correlation, allHealthData, threshold) => {
    if (!correlation || !allHealthData) return { diff: 0, avgBelow: 0, avgAbove: 0, unit: '' };
    
    const dates = getAvailableDates(allHealthData);
    const belowThreshold = [];
    const aboveThreshold = [];
    
    dates.forEach(date => {
      const dayData = getDataForDate(allHealthData, date);
      let val1 = dayData[correlation.metric1Category]?.[correlation.metric1];
      let val2 = dayData[correlation.metric2Category]?.[correlation.metric2];
      
      // Convert time strings to numeric hours
      if (correlation.metric1?.includes('time') || correlation.metric1?.includes('caffeine_last_time')) {
        val1 = timeToHours(val1);
      }
      if (correlation.metric2?.includes('time') || correlation.metric2?.includes('caffeine_last_time')) {
        val2 = timeToHours(val2);
      }
      
      if (val1 !== null && val1 !== undefined && val2 !== null && val2 !== undefined &&
          typeof val1 === 'number' && typeof val2 === 'number' && !isNaN(val1) && !isNaN(val2)) {
        // aboveThreshold = meets threshold (good condition)
        // belowThreshold = does NOT meet threshold (bad condition)
        if (val1 >= threshold) {
          aboveThreshold.push(val2); // Good condition
        } else {
          belowThreshold.push(val2); // Bad condition
        }
      }
    });
    
    if (belowThreshold.length === 0 || aboveThreshold.length === 0) {
      return { diff: 0, avgBelow: 0, avgAbove: 0, unit: '' };
    }
    
    const avgBelow = belowThreshold.reduce((a, b) => a + b, 0) / belowThreshold.length;
    const avgAbove = aboveThreshold.reduce((a, b) => a + b, 0) / aboveThreshold.length;
    const diff = Math.abs(avgBelow - avgAbove);
    
    // Determine unit based on metric name - comprehensive mapping for all CSV headers
    let unit = '';
    const metric2Lower = (correlation.metric2 || '').toLowerCase();
    const metric2LabelLower = (correlation.metric2Label || '').toLowerCase();
    const metric2Name = metric2Lower || metric2LabelLower;
    
    // === ACTIVITY METRICS ===
    if (metric2Name.includes('steps') || metric2Name.includes('floors_climbed') || 
        metric2Name.includes('meals_count') || metric2Name.includes('social_interactions') ||
        metric2Name.includes('awakenings')) {
      unit = 'count';
    } else if (metric2Name.includes('distance_km') || metric2Name.includes('distance')) {
      unit = 'km';
    } else if (metric2Name.includes('calories_burned') || metric2Name.includes('calories') ||
               metric2Name.includes('breakfast_calories') || metric2Name.includes('lunch_calories') ||
               metric2Name.includes('dinner_calories') || metric2Name.includes('snacks_calories')) {
      unit = 'calories';
    } else if (metric2Name.includes('active_minutes') || metric2Name.includes('exercise_minutes') ||
               metric2Name.includes('meditation_minutes') || metric2Name.includes('screen_time_before_bed_minutes') ||
               metric2Name.includes('wake_time_consistency_minutes') || metric2Name.includes('bedtime_consistency_minutes')) {
      unit = 'minutes';
    } else if (metric2Name.includes('workout_start_time') || metric2Name.includes('workout_end_time') ||
               metric2Name.includes('caffeine_last_time') || metric2Name.includes('breakfast_time') ||
               metric2Name.includes('lunch_time') || metric2Name.includes('dinner_time') ||
               metric2Name.includes('bedtime') || metric2Name.includes('wake_time') ||
               metric2Name.includes('time') && !metric2Name.includes('minutes') && !metric2Name.includes('hours')) {
      unit = 'hours'; // Time values stored as hours (e.g., 14.5 = 2:30 PM)
    } else if (metric2Name.includes('heart_rate') || metric2Name.includes('bpm')) {
      unit = 'bpm';
    } else if (metric2Name.includes('hrv_ms') || metric2Name.includes('hrv')) {
      unit = 'ms';
    } else if (metric2Name.includes('vo2_max') || metric2Name.includes('vo2')) {
      unit = 'ml/kg/min';
    } else if (metric2Name.includes('workout_performance_rating') || metric2Name.includes('performance_rating')) {
      unit = 'points';
    }
    
    // === SLEEP METRICS ===
    else if (metric2Name.includes('sleep_duration_hours') || metric2Name.includes('deep_sleep_hours') ||
             metric2Name.includes('rem_sleep_hours') || metric2Name.includes('outdoor_time_hours') ||
             metric2Name.includes('screen_time_hours') || metric2Name.includes('hours') && 
             !metric2Name.includes('heart_rate') && !metric2Name.includes('consistency')) {
      unit = 'hours';
    } else if (metric2Name.includes('sleep_quality_score') || metric2Name.includes('quality_score')) {
      unit = 'points';
    } else if (metric2Name.includes('deep_sleep_percent') || metric2Name.includes('rem_sleep_percent') ||
               metric2Name.includes('sleep_efficiency') || metric2Name.includes('body_fat_percent') ||
               metric2Name.includes('oxygen_saturation') || metric2Name.includes('percent') ||
               metric2Name.includes('%')) {
      unit = '%';
    }
    
    // === NUTRITION METRICS ===
    else if (metric2Name.includes('protein_g') || metric2Name.includes('carbs_g') ||
             metric2Name.includes('fats_g') || metric2Name.includes('fiber_g') ||
             metric2Name.includes('sugar_g') || metric2Name.includes('_g') ||
             (metric2Name.includes('sugar') && !metric2Name.includes('score')) ||
             (metric2Name.includes('protein') && !metric2Name.includes('score')) ||
             (metric2Name.includes('carbs') && !metric2Name.includes('score')) ||
             (metric2Name.includes('fats') && !metric2Name.includes('score')) ||
             (metric2Name.includes('fiber') && !metric2Name.includes('score'))) {
      unit = 'g';
    } else if (metric2Name.includes('caffeine_cups') || metric2Name.includes('cups')) {
      unit = 'cups';
    } else if (metric2Name.includes('alcohol_units') || metric2Name.includes('alcohol')) {
      unit = 'units';
    }
    
    // === VITALS METRICS ===
    else if (metric2Name.includes('weight_kg') || metric2Name.includes('muscle_mass_kg') ||
             metric2Name.includes('weight') || metric2Name.includes('muscle_mass')) {
      unit = 'kg';
    } else if (metric2Name.includes('blood_pressure_systolic') || metric2Name.includes('blood_pressure_diastolic') ||
               metric2Name.includes('blood_pressure')) {
      unit = 'mmHg';
    } else if (metric2Name.includes('body_temperature_c') || metric2Name.includes('temperature')) {
      unit = '°C';
    }
    
    // === WELLNESS METRICS ===
    else if (metric2Name.includes('stress_level') || metric2Name.includes('energy_level') ||
             metric2Name.includes('mood_score') || metric2Name.includes('anxiety_level') ||
             metric2Name.includes('productivity_score') || metric2Name.includes('_level') ||
             metric2Name.includes('_score') || metric2Name.includes('level') ||
             metric2Name.includes('score') || metric2Name.includes('rating')) {
      unit = 'points';
    }
    
    // === FALLBACK: Pattern-based detection ===
    else {
      // Legacy pattern matching as fallback
      if (metric2Name.includes('sugar') || metric2Name.includes('protein') || 
          metric2Name.includes('carbs') || metric2Name.includes('fats')) {
        unit = 'g';
      } else if (metric2Name.includes('energy') || metric2Name.includes('mood') || 
                 metric2Name.includes('stress') || metric2Name.includes('anxiety')) {
        unit = 'points';
      } else if (metric2Name.includes('duration')) {
        unit = 'hours';
      } else {
        unit = ''; // Unknown unit
      }
    }
    
    return { diff, avgBelow, avgAbove, unit };
  };

  // Get threshold text
  const getThresholdText = (correlation, threshold) => {
    const metric1Label = (correlation.metric1Label || correlation.metric1).toLowerCase();
    
    if (correlation.metric1?.includes('sleep') || correlation.metric1?.includes('duration')) {
      return `sleep LESS than ${threshold}`;
    }
    if (correlation.metric1?.includes('caffeine') || correlation.metric1?.includes('time')) {
      return `consume caffeine AFTER ${threshold}`;
    }
    return `${metric1Label} less than ${threshold}`;
  };

  // Get impact text with proper units
  const getImpactText = (correlation, impactDetails) => {
    const metric2Label = (correlation.metric2Label || correlation.metric2).toLowerCase();
    const { diff, unit } = impactDetails;
    
    // Handle time-based metrics (caffeine_last_time, bedtime, etc.) - stored as hours
    if (unit === 'hours' && (correlation.metric2?.includes('time') || correlation.metric2Label?.includes('time'))) {
      // For time, diff is in hours (e.g., 2.1 hours earlier/later)
      const hours = Math.abs(diff);
      const minutes = Math.round((hours % 1) * 60);
      const wholeHours = Math.floor(hours);
      
      let timeStr = '';
      if (wholeHours > 0 && minutes > 0) {
        timeStr = `${wholeHours} hour${wholeHours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else if (wholeHours > 0) {
        timeStr = `${wholeHours} hour${wholeHours > 1 ? 's' : ''}`;
      } else if (minutes > 0) {
        timeStr = `${minutes} minute${minutes > 1 ? 's' : ''}`;
      } else {
        timeStr = `${hours.toFixed(1)} hours`;
      }
      
      return `is ${timeStr} ${correlation.correlation < 0 ? 'earlier' : 'later'}`;
    }
    
    // Handle grams (sugar, protein, carbs, fats, fiber)
    if (unit === 'g') {
      return `consume ${diff.toFixed(0)}g more ${metric2Label.includes('sugar') ? 'sugar' : metric2Label}`;
    }
    
    // Handle points (energy level, mood score, stress, etc.)
    if (unit === 'points') {
      return `is ${diff.toFixed(1)} points ${correlation.correlation < 0 ? 'lower' : 'higher'}`;
    }
    
    // Handle hours (sleep duration, outdoor time, screen time)
    if (unit === 'hours') {
      return `is ${diff.toFixed(1)} hours ${correlation.correlation < 0 ? 'less' : 'more'}`;
    }
    
    // Handle minutes
    if (unit === 'minutes') {
      return `is ${diff.toFixed(0)} minutes ${correlation.correlation < 0 ? 'less' : 'more'}`;
    }
    
    // Handle percentage
    if (unit === '%') {
      return `is ${diff.toFixed(1)}% ${correlation.correlation < 0 ? 'lower' : 'higher'}`;
    }
    
    // Handle calories
    if (unit === 'calories') {
      return `is ${diff.toFixed(0)} calories ${correlation.correlation < 0 ? 'less' : 'more'}`;
    }
    
    // Handle count (steps, floors, meals, etc.)
    if (unit === 'count') {
      return `is ${diff.toFixed(0)} ${correlation.correlation < 0 ? 'less' : 'more'}`;
    }
    
    // Handle distance (km)
    if (unit === 'km') {
      return `is ${diff.toFixed(1)} km ${correlation.correlation < 0 ? 'less' : 'more'}`;
    }
    
    // Handle bpm (heart rate)
    if (unit === 'bpm') {
      return `is ${diff.toFixed(0)} bpm ${correlation.correlation < 0 ? 'lower' : 'higher'}`;
    }
    
    // Handle ms (HRV)
    if (unit === 'ms') {
      return `is ${diff.toFixed(0)} ms ${correlation.correlation < 0 ? 'lower' : 'higher'}`;
    }
    
    // Handle kg (weight, muscle mass)
    if (unit === 'kg') {
      return `is ${diff.toFixed(1)} kg ${correlation.correlation < 0 ? 'less' : 'more'}`;
    }
    
    // Handle mmHg (blood pressure)
    if (unit === 'mmHg') {
      return `is ${diff.toFixed(0)} mmHg ${correlation.correlation < 0 ? 'lower' : 'higher'}`;
    }
    
    // Handle °C (temperature)
    if (unit === '°C') {
      return `is ${diff.toFixed(1)}°C ${correlation.correlation < 0 ? 'lower' : 'higher'}`;
    }
    
    // Handle cups (caffeine)
    if (unit === 'cups') {
      return `is ${diff.toFixed(1)} cup${Math.abs(diff) !== 1 ? 's' : ''} ${correlation.correlation < 0 ? 'less' : 'more'}`;
    }
    
    // Handle units (alcohol)
    if (unit === 'units') {
      return `is ${diff.toFixed(1)} unit${Math.abs(diff) !== 1 ? 's' : ''} ${correlation.correlation < 0 ? 'less' : 'more'}`;
    }
    
    // Handle ml/kg/min (VO2 max)
    if (unit === 'ml/kg/min') {
      return `is ${diff.toFixed(1)} ml/kg/min ${correlation.correlation < 0 ? 'lower' : 'higher'}`;
    }
    
    // Default: use the diff value with appropriate unit
    return `is ${diff.toFixed(1)} ${unit || ''} ${correlation.correlation < 0 ? 'less' : 'more'}`.trim();
  };

  // Get context text (e.g., "that's 3 candy bars worth")
  const getContextText = (correlation, impactDetails) => {
    const { diff, unit } = impactDetails;
    
    if (unit === 'g' && correlation.metric2?.includes('sugar')) {
      const candyBars = Math.round(diff / 25); // ~25g per candy bar
      if (candyBars > 0) {
        return `that's ${candyBars} candy bar${candyBars > 1 ? 's' : ''} worth of extra sugar you wouldn't eat if you slept well`;
      }
    }
    
    return `a significant impact on your health`;
  };

  // Determine causality direction using time lag information
  // Returns { cause: metric1/2, effect: metric1/2, shouldSwap: boolean }
  const determineCausality = (correlation) => {
    // PRIMARY METHOD: Use time lag to infer causality
    // If lag > 0, it means metric1 on day N correlates with metric2 on day N+lag
    // This strongly suggests metric1 → metric2 (cause → effect)
    if (correlation.lag && correlation.lag > 0) {
      // Time-lagged correlation indicates direction: metric1 causes metric2
      return { cause: 'metric1', effect: 'metric2', shouldSwap: false };
    }
    
    // For same-day correlations (lag = 0), we can't determine direction from data alone
    // Default to keeping original order (no swap)
    // Note: This may result in incorrect causality for same-day correlations,
    // but without domain knowledge or lag information, we can't determine direction
    return { cause: 'metric1', effect: 'metric2', shouldSwap: false };
    
    /* COMMENTED OUT: Pattern-based causality detection
    // This was the old approach using hardcoded domain knowledge patterns
    // Keeping it commented for reference, but now using lag-based inference instead
    
    const m1 = (correlation.metric1 || '').toLowerCase();
    const m2 = (correlation.metric2 || '').toLowerCase();
    const m1Label = (correlation.metric1Label || correlation.metric1 || '').toLowerCase();
    const m2Label = (correlation.metric2Label || correlation.metric2 || '').toLowerCase();
    
    // Caffeine timing affects sleep (not the other way around)
    if ((m1.includes('caffeine') && m1.includes('time')) || m1Label.includes('caffeine')) {
      if (m2.includes('sleep') || m2Label.includes('sleep')) {
        return { cause: 'metric1', effect: 'metric2', shouldSwap: false };
      }
    }
    if ((m2.includes('caffeine') && m2.includes('time')) || m2Label.includes('caffeine')) {
      if (m1.includes('sleep') || m1Label.includes('sleep')) {
        return { cause: 'metric2', effect: 'metric1', shouldSwap: true };
      }
    }
    
    // Sleep affects next-day metrics (energy, mood, sugar cravings)
    if (m1.includes('sleep') || m1Label.includes('sleep')) {
      if (m2.includes('energy') || m2.includes('sugar') || m2.includes('mood') || 
          m2Label.includes('energy') || m2Label.includes('sugar') || m2Label.includes('mood')) {
        return { cause: 'metric1', effect: 'metric2', shouldSwap: false };
      }
    }
    if (m2.includes('sleep') || m2Label.includes('sleep')) {
      if (m1.includes('energy') || m1.includes('sugar') || m1.includes('mood') ||
          m1Label.includes('energy') || m1Label.includes('sugar') || m1Label.includes('mood')) {
        return { cause: 'metric2', effect: 'metric1', shouldSwap: true };
      }
    }
    
    // Exercise/workout affects energy, mood, sleep quality
    if (m1.includes('workout') || m1.includes('exercise') || m1Label.includes('workout') || m1Label.includes('exercise')) {
      if (m2.includes('energy') || m2.includes('mood') || m2.includes('sleep') ||
          m2Label.includes('energy') || m2Label.includes('mood') || m2Label.includes('sleep')) {
        return { cause: 'metric1', effect: 'metric2', shouldSwap: false };
      }
    }
    if (m2.includes('workout') || m2.includes('exercise') || m2Label.includes('workout') || m2Label.includes('exercise')) {
      if (m1.includes('energy') || m1.includes('mood') || m1.includes('sleep') ||
          m1Label.includes('energy') || m1Label.includes('mood') || m1Label.includes('sleep')) {
        return { cause: 'metric2', effect: 'metric1', shouldSwap: true };
      }
    }
    
    // Meal timing affects sleep, energy
    if ((m1.includes('meal') && m1.includes('time')) || (m1Label.includes('meal') && m1Label.includes('time'))) {
      if (m2.includes('sleep') || m2.includes('energy') || m2Label.includes('sleep') || m2Label.includes('energy')) {
        return { cause: 'metric1', effect: 'metric2', shouldSwap: false };
      }
    }
    if ((m2.includes('meal') && m2.includes('time')) || (m2Label.includes('meal') && m2Label.includes('time'))) {
      if (m1.includes('sleep') || m1.includes('energy') || m1Label.includes('sleep') || m1Label.includes('energy')) {
        return { cause: 'metric2', effect: 'metric1', shouldSwap: true };
      }
    }
    
    // Screen time before bed affects sleep
    if (m1.includes('screen') || m1Label.includes('screen')) {
      if (m2.includes('sleep') || m2Label.includes('sleep')) {
        return { cause: 'metric1', effect: 'metric2', shouldSwap: false };
      }
    }
    if (m2.includes('screen') || m2Label.includes('screen')) {
      if (m1.includes('sleep') || m1Label.includes('sleep')) {
        return { cause: 'metric2', effect: 'metric1', shouldSwap: true };
      }
    }
    
    // Stress affects sleep, energy, mood
    if (m1.includes('stress') || m1Label.includes('stress')) {
      if (m2.includes('sleep') || m2.includes('energy') || m2.includes('mood') ||
          m2Label.includes('sleep') || m2Label.includes('energy') || m2Label.includes('mood')) {
        return { cause: 'metric1', effect: 'metric2', shouldSwap: false };
      }
    }
    if (m2.includes('stress') || m2Label.includes('stress')) {
      if (m1.includes('sleep') || m1.includes('energy') || m1.includes('mood') ||
          m1Label.includes('sleep') || m1Label.includes('energy') || m1Label.includes('mood')) {
        return { cause: 'metric2', effect: 'metric1', shouldSwap: true };
      }
    }
    
    // Default: use correlation direction (positive = metric1 increases with metric2)
    // If negative correlation, assume metric1 is cause (decreasing metric2)
    // Otherwise, keep original order
    return { cause: 'metric1', effect: 'metric2', shouldSwap: false };
    */
  };

  // Get confidence level with stars
  const getConfidenceLevel = (confidence) => {
    if (confidence >= 90) {
      return { level: 'Very High', stars: 5, label: '⭐⭐⭐⭐⭐' };
    } else if (confidence >= 80) {
      return { level: 'High', stars: 4, label: '⭐⭐⭐⭐' };
    } else if (confidence >= 70) {
      return { level: 'Moderate', stars: 3, label: '⭐⭐⭐' };
    }
    return { level: 'Moderate', stars: 3, label: '⭐⭐⭐' };
  };

  // Get population comparison
  const getPopulationComparison = (correlation) => {
    const absR = Math.abs(correlation.correlation);
    // Typical population correlation for similar metrics (estimated)
    const populationR = 0.45; // Example baseline
    const stronger = ((absR - populationR) / populationR) * 100;
    
    if (stronger > 0) {
      return {
        stronger: stronger.toFixed(0),
        populationR: populationR.toFixed(2),
        yourR: absR.toFixed(2)
      };
    }
    return null;
  };

  const getCategoryColor = (category) => {
    const colors = {
      sleep: '#3B82F6',
      activity: '#10B981',
      nutrition: '#F59E0B',
      vitals: '#EF4444',
      wellness: '#8B5CF6'
    };
    return colors[category] || theme.accent.primary;
  };

  if (loading) {
    return (
      <div className="rounded-2xl shadow-lg p-8 text-white relative overflow-hidden" style={{ 
        background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
        minHeight: '30vh'
      }}>
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" 
               style={{
                 backgroundSize: '200% 100%',
                 animation: 'shimmer 2s infinite'
               }}></div>
        </div>
        
        <div className="relative z-10">
          {/* Badge skeleton */}
          <div className="mb-6">
            <div className="h-8 bg-white bg-opacity-30 rounded-full w-32 animate-pulse"></div>
          </div>
          
          {/* Title skeleton */}
          <div className="mb-6 space-y-3">
            <div className="h-10 bg-white bg-opacity-30 rounded-lg w-3/4 animate-pulse"></div>
            <div className="h-10 bg-white bg-opacity-20 rounded-lg w-2/3 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          </div>
          
          {/* Description skeleton */}
          <div className="mb-8 space-y-2">
            <div className="h-4 bg-white bg-opacity-25 rounded w-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            <div className="h-4 bg-white bg-opacity-25 rounded w-5/6 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="h-4 bg-white bg-opacity-25 rounded w-4/6 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
          </div>
          
          {/* Loading indicator */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span className="text-sm opacity-75">Analyzing your health patterns...</span>
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
    );
  }

  if (!insight && !loading) {
    // Still loading or no data available
    return (
      <div className="rounded-2xl shadow-lg p-8 text-white relative overflow-hidden" style={{ 
        background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
        minHeight: '30vh'
      }}>
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" 
               style={{
                 backgroundSize: '200% 100%',
                 animation: 'shimmer 2s infinite'
               }}></div>
        </div>
        
        <div className="relative z-10">
          {/* Badge skeleton */}
          <div className="mb-6">
            <div className="h-8 bg-white bg-opacity-30 rounded-full w-32 animate-pulse"></div>
          </div>
          
          {/* Title skeleton */}
          <div className="mb-6 space-y-3">
            <div className="h-10 bg-white bg-opacity-30 rounded-lg w-3/4 animate-pulse"></div>
            <div className="h-10 bg-white bg-opacity-20 rounded-lg w-2/3 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          </div>
          
          {/* Description skeleton */}
          <div className="mb-8 space-y-2">
            <div className="h-4 bg-white bg-opacity-25 rounded w-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            <div className="h-4 bg-white bg-opacity-25 rounded w-5/6 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="h-4 bg-white bg-opacity-25 rounded w-4/6 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
          </div>
          
          {/* Loading indicator */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span className="text-sm opacity-75">Analyzing your health patterns...</span>
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
    );
  }

  return (
    <div 
      className="rounded-2xl shadow-xl p-8 text-white relative overflow-hidden"
      style={{ 
        background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
        minHeight: '30vh'
      }}
    >
      <div className="grid md:grid-cols-10 gap-8 relative z-10">
        {/* Left side (70%) */}
        <div className="md:col-span-7">
          {/* Badge */}
          <div className="mb-4">
            <span 
              className="px-4 py-2 rounded-full text-sm font-semibold inline-block"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
            >
              Today's Insight
            </span>
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {insight.title}
          </h2>

          {/* Subtext */}
          <p className="text-lg mb-6 opacity-90">
            {insight.description}
          </p>


          {/* Action button */}
          <button
            onClick={() => {
              if (onSeeFullAnalysis) {
                onSeeFullAnalysis();
              } else if (insight && insight.metric1 && insight.metric2) {
                // Navigate to insights page with correlation identifiers
                const params = new URLSearchParams({
                  metric1: insight.metric1,
                  metric2: insight.metric2,
                  category1: insight.metric1Category,
                  category2: insight.metric2Category,
                  lag: (insight.lag || 0).toString()
                });
                navigate(`/insights?${params.toString()}`);
              } else {
                navigate('/insights');
              }
            }}
            className="px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90 flex items-center gap-2"
            style={{ 
              backgroundColor: 'white',
              color: theme.accent.purple
            }}
          >
            See Full Analysis
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right side (30%) - Chart */}
        <div className="md:col-span-3">
          {chartData.length > 0 && (
            <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
              <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={0}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.2)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.8)' }}
                    stroke="rgba(255,255,255,0.3)"
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.8)' }}
                    stroke="rgba(255,255,255,0.3)"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#1e293b', fontSize: '12px', fontWeight: '600', paddingTop: '10px' }}
                    iconType="line"
                    formatter={(value) => <span style={{ color: '#1e293b' }}>{value}</span>}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="metric1" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    name={insight.metric1Label}
                    dot={false}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="metric2" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name={insight.metric2Label}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-center font-semibold">
                  AI Correlation: r = {insight.correlation?.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-center opacity-75">
                  Machine Learning Analysis
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroInsightCard;
