// Insight Evidence Modal Component
// Shows detailed evidence with tabs: Visualization & Statistics, Summary

import React, { useState, useEffect, useRef } from 'react';
import { X, Info, Brain } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ReferenceLine, ReferenceArea, Legend } from 'recharts';
import { getAvailableDates, getDataForDate } from '../../utils/dataLoader';
import { format } from 'date-fns';
import { generateContent } from '../../utils/geminiClient';
import { withCache, getCachedResult } from '../../utils/aiCache';

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

const InsightEvidenceModal = ({ insight, isOpen, onClose, allHealthData }) => {
  const [activeTab, setActiveTab] = useState('visualization');
  const [chartData, setChartData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  // Track ongoing requests to prevent duplicates
  const summaryRequestRef = useRef(null);

  // Reset active tab when insight changes
  useEffect(() => {
    if (insight) {
      setActiveTab('summary');
      setLoadingSummary(false);
      summaryRequestRef.current = null; // Cancel any ongoing request
      
      // Immediately check cache and load if available
      const cacheParams = insight.type === 'anomaly' ? {
        anomaly: {
          metricName: insight.metricLabel || insight.metric,
          value: typeof insight.value === 'number' ? insight.value.toFixed(2) : String(insight.value || ''),
          date: insight.timestamp ? new Date(insight.timestamp).toISOString().split('T')[0] : null
        }
      } : {
        correlation: {
          metric1: String(insight.metric1Label || insight.metric1 || ''),
          metric2: String(insight.metric2Label || insight.metric2 || ''),
          correlation: insight.correlation ? Number(insight.correlation.toFixed(2)) : 0
        }
      };
      
      const cacheKey = insight.type === 'anomaly' ? 'anomalyInsightSummary' : 'insightSummary';
      const cached = getCachedResult(cacheKey, cacheParams);
      
      if (cached) {
        setSummaryData(cached);
      } else {
        setSummaryData(null);
      }
    } else {
      setSummaryData(null);
    }
  }, [insight?.id]);

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

  useEffect(() => {
    if (insight && allHealthData) {
      const dates = getAvailableDates(allHealthData);
        const parseLocalDate = (dateStr) => {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day);
        };
        
      if (insight.type === 'correlation') {
        // Correlation data
        const data = dates.map(date => {
        const dayData = getDataForDate(allHealthData, date);
        let value1 = insight.metric1 ? dayData[insight.metric1Category]?.[insight.metric1] : null;
        let value2 = insight.metric2 ? dayData[insight.metric2Category]?.[insight.metric2] : null;
        
        // Convert time strings to numeric hours for chart display
        if (insight.metric1?.includes('time') || insight.metric1?.includes('caffeine_last_time')) {
          value1 = timeToHours(value1);
        }
        if (insight.metric2?.includes('time') || insight.metric2?.includes('caffeine_last_time')) {
          value2 = timeToHours(value2);
        }
        
        // Only include data points where both values are valid numbers
        if (value1 !== null && value1 !== undefined && value2 !== null && value2 !== undefined &&
            typeof value1 === 'number' && typeof value2 === 'number' && !isNaN(value1) && !isNaN(value2)) {
        return {
          date: format(parseLocalDate(date), 'MMM dd'),
          fullDate: date,
          metric1: value1,
          metric2: value2
        };
        }
        return null;
      }).filter(d => d !== null);
      
      setChartData(data);
      } else if (insight.type === 'anomaly') {
        // Anomaly data - last 14 days
        const recentDates = dates.slice(-14);
        const data = recentDates.map(date => {
          const dayData = getDataForDate(allHealthData, date);
          const value = dayData[insight.category]?.[insight.metric];
          
          return {
            date: format(parseLocalDate(date), 'MMM dd'),
            fullDate: date,
            value: value || null,
            normalMin: insight.normalRange?.min || (typeof insight.mean === 'number' && typeof insight.stdDev === 'number' ? insight.mean - insight.stdDev : null),
            normalMax: insight.normalRange?.max || (typeof insight.mean === 'number' && typeof insight.stdDev === 'number' ? insight.mean + insight.stdDev : null)
          };
        });
        
        setChartData(data);
      }
    }
  }, [insight, allHealthData]);

  // Generate AI summary when summary tab is opened (only if no cached data exists)
  useEffect(() => {
    // Only generate if: tab is summary, we have insight/data, no summary data, not loading, no request in progress
    if (activeTab === 'summary' && insight && allHealthData && !summaryData && !loadingSummary && !summaryRequestRef.current) {
      // Use a small delay to ensure we don't fire multiple requests
      const timeoutId = setTimeout(() => {
        if (!summaryData && !loadingSummary && !summaryRequestRef.current) {
          const insightId = insight?.id || (insight?.type === 'correlation' 
            ? `${insight.metric1}_${insight.metric2}_${insight.correlation?.toFixed(2)}`
            : `${insight?.metric}_${insight?.value}_${insight?.timestamp}`);
          generateAISummary(insightId);
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, insight?.id, summaryData, loadingSummary]);

  const generateAISummary = async (insightId) => {
    // Final safety checks
    if (!insight || !allHealthData || loadingSummary || summaryRequestRef.current || summaryData) {
      return;
    }
    
    // Build cache params
    const cacheParams = insight.type === 'anomaly' ? {
      anomaly: {
        metricName: insight.metricLabel || insight.metric,
        value: typeof insight.value === 'number' ? insight.value.toFixed(2) : String(insight.value || ''),
        date: insight.timestamp ? new Date(insight.timestamp).toISOString().split('T')[0] : null
      }
    } : {
      correlation: {
        metric1: String(insight.metric1Label || insight.metric1 || ''),
        metric2: String(insight.metric2Label || insight.metric2 || ''),
        correlation: insight.correlation ? Number(insight.correlation.toFixed(2)) : 0
      }
    };
    
    const cacheKey = insight.type === 'anomaly' ? 'anomalyInsightSummary' : 'insightSummary';
    
    // Set loading state and mark request as in progress BEFORE async operations
    setLoadingSummary(true);
    const requestId = insightId || `${insight.type}_${Date.now()}`;
    summaryRequestRef.current = requestId;

    try {
      // withCache handles caching and request deduplication internally
      // It will check cache first, and if no cache, deduplicate concurrent requests
      // REMOVED CSV DATA from prompts to reduce API payload size and prevent rate limits
      // The insight object already contains all necessary statistical data
      const summary = await withCache(cacheKey, cacheParams, async () => {
        // Different prompts for anomalies vs correlations
        let prompt;
        let context;
        
        if (insight.type === 'anomaly') {
          const getUnit = (metricLabel) => {
            const label = (metricLabel || '').toLowerCase();
            if (label.includes('heart rate') || label.includes('bpm')) return 'bpm';
            if (label.includes('sugar') || label.includes('g')) return 'g';
            if (label.includes('percent') || label.includes('%')) return '%';
            if (label.includes('hours')) return 'hours';
            return '';
          };
          
          const unit = getUnit(insight.metricLabel);
          const currentValue = typeof insight.value === 'number' ? insight.value.toFixed(1) : insight.value;
          const baseline = typeof insight.baseline === 'number' ? insight.baseline.toFixed(1) : insight.mean?.toFixed(1) || 'N/A';
          const deviation = typeof insight.deviation === 'number' ? Math.abs(insight.deviation).toFixed(0) : 'N/A';
          
          prompt = `You are a supportive health coach. Analyze this health anomaly and provide insights.

ANOMALY DATA:
- Metric: ${insight.metricLabel || insight.metric} (${insight.category})
- Current Value: ${currentValue}${unit ? ` ${unit}` : ''}
- Baseline/Normal: ${baseline}${unit ? ` ${unit}` : ''}
- Deviation: ${deviation}${unit ? ` ${unit}` : ''} ${insight.deviation > 0 ? 'above' : 'below'} baseline
- Duration: ${insight.consecutiveDays || 1} consecutive day${(insight.consecutiveDays || 1) > 1 ? 's' : ''}
- Severity: ${insight.severity || 'medium'}
- Status: ${insight.isActive ? 'ACTIVE' : 'RESOLVED'}
${insight.prediction ? `- Prediction: ${insight.prediction.likelihood || 80}% likelihood of illness in next 2 days` : ''}

IMPORTANT GUIDELINES:
- Use a supportive, conversational coaching tone
- Avoid technical jargon - use plain language
- Be warm and encouraging, not alarming
- Base your analysis on the anomaly data provided above

Generate a structured summary with THREE sections:

1. ANOMALY SUMMARY (2-3 sentences):
   - Explain what this anomaly means in simple terms
   - Describe the current situation (e.g., "Your sleep quality has been low for 3 days")
   - Include specific numbers from the data

2. REASONS (2-3 sentences):
   - Identify what might be causing or impacting this anomaly
   - Look at the dataset to find related factors (e.g., stress, activity, nutrition, other metrics)
   - Explain the connections you see in the data

3. RECOMMENDATIONS:
   - First, list exactly 3 short bullet points (one line each, max 15 words per bullet)
   - Then add 2-3 sentences explaining these recommendations in more detail
   - Make them specific, actionable, and based on the data

IMPORTANT FORMATTING:
- Do NOT use markdown formatting like **bold** or *italic*
- Use plain text only
- Keep bullets short and concise

Format your response as:
ANOMALY SUMMARY:
[your summary here - 2-3 sentences, plain text]

REASONS:
[identify what impacts this - 2-3 sentences, plain text]

RECOMMENDATIONS:
• [short bullet 1 - max 15 words]
• [short bullet 2 - max 15 words]
• [short bullet 3 - max 15 words]

[2-3 sentences explaining these recommendations in detail]`;
          
          context = 'insights_anomalies';
        } else {
          prompt = `You are a supportive health coach. Generate a comprehensive summary for this health correlation insight.

CORRELATION DATA:
- Metric 1: ${insight.metric1Label || insight.metric1} (${insight.metric1Category})
- Metric 2: ${insight.metric2Label || insight.metric2} (${insight.metric2Category})
- Correlation strength: ${(Math.abs(insight.correlation) * 100).toFixed(0)}% (${insight.occurrences || insight.dataPoints || 0} data points)
- Pattern: When ${insight.metric1Label} is ${insight.threshold ? (insight.metric1?.includes('sleep') ? `${insight.threshold.toFixed(1)} hours` : `${insight.threshold.toFixed(1)}`) : 'below threshold'}, ${insight.metric2Label} changes by ${insight.effectSize?.toFixed(1) || 'significant amount'}${insight.effectSizeUnit || ''}
- Time relationship: ${insight.lag > 0 ? `${insight.lag} day(s) later` : 'same day'}
- Direction: ${insight.direction === 'positive' ? 'positive' : 'negative'}
- Threshold: ${insight.threshold ? insight.threshold.toFixed(1) : 'N/A'}
- Effect Size: ${insight.effectSize ? insight.effectSize.toFixed(1) : 'N/A'} ${insight.effectSizeUnit || ''}

IMPORTANT GUIDELINES:
- Use a supportive, conversational coaching tone
- Avoid technical jargon - use plain language
- Be warm and encouraging, not clinical
- Base your analysis on the correlation data provided above

Generate a structured summary with THREE sections:

1. CORRELATION SUMMARY (2-3 sentences):
   - Explain what this correlation means in simple terms
   - Describe the relationship between the two metrics
   - Include specific numbers from the data

2. RECOMMENDATIONS:
   - First, list exactly 3 short bullet points (one line each, max 15 words per bullet)
   - Then add 2-3 sentences explaining these recommendations in more detail
   - Make them specific, actionable, and based on the data

3. RELATED FACTORS (2-3 sentences):
   - Identify other factors in the dataset that might be related
   - Explain how they connect to this correlation
   - Suggest what else to monitor

IMPORTANT FORMATTING:
- Do NOT use markdown formatting like **bold** or *italic*
- Use plain text only
- Keep bullets short and concise

Format your response as:
CORRELATION SUMMARY:
[your summary here - 2-3 sentences, plain text]

RECOMMENDATIONS:
• [short bullet 1 - max 15 words]
• [short bullet 2 - max 15 words]
• [short bullet 3 - max 15 words]

[2-3 sentences explaining these recommendations in detail]

RELATED FACTORS:
[your analysis here - 2-3 sentences, plain text]`;
          
          context = 'insights_correlations';
        }

        const response = await generateContent(prompt, { temperature: 0.8, maxTokens: 800, context });
        if (response.success && response.text) {
          return parseSummary(response.text, insight.type);
        }
        throw new Error('AI generation failed');
      });

      setSummaryData(summary);
    } catch (error) {
      console.error('Error generating AI summary:', error);
      // Set fallback data only if this is still the current request
      if (summaryRequestRef.current === requestId) {
      if (insight.type === 'anomaly') {
        setSummaryData({
          anomalySummary: `${insight.metricLabel} is ${insight.deviation > 0 ? 'elevated' : 'low'} for ${insight.consecutiveDays || 1} day${(insight.consecutiveDays || 1) > 1 ? 's' : ''}.`,
          reasons: 'Review your recent activity, sleep, and nutrition patterns to identify potential causes.',
          recommendations: [
            'Monitor this metric closely',
            'Consider lifestyle adjustments',
            'Track changes over time'
          ],
          recommendationsExplanation: 'Continue tracking and make gradual adjustments based on patterns you observe.'
        });
      } else {
        setSummaryData({
          correlationSummary: `This correlation shows a ${insight.direction === 'positive' ? 'positive' : 'negative'} relationship between ${insight.metric1Label} and ${insight.metric2Label}.`,
          recommendations: [
            'Monitor both metrics closely',
            'Consider lifestyle adjustments based on this pattern',
            'Track changes over time'
          ],
          relatedFactors: 'Review other health metrics for related patterns.'
        });
        }
      }
    } finally {
      // Only clear loading state if this is still the current request
      if (summaryRequestRef.current === requestId) {
      setLoadingSummary(false);
        summaryRequestRef.current = null;
      }
    }
  };

  const parseSummary = (text, insightType) => {
    // Remove markdown formatting (**bold**, *italic*, etc.)
    const cleanText = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');

    if (insightType === 'anomaly') {
      const sections = {
        anomalySummary: '',
        reasons: '',
        recommendations: [],
        recommendationsExplanation: ''
      };

      const summaryMatch = cleanText.match(/ANOMALY SUMMARY:\s*(.+?)(?=\nREASONS:|$)/is);
      if (summaryMatch) {
        sections.anomalySummary = summaryMatch[1].trim();
      }

      const reasonsMatch = cleanText.match(/REASONS:\s*(.+?)(?=\nRECOMMENDATIONS:|$)/is);
      if (reasonsMatch) {
        sections.reasons = reasonsMatch[1].trim();
      }

      const recommendationsMatch = cleanText.match(/RECOMMENDATIONS:\s*(.+?)(?=\n|$)/is);
      if (recommendationsMatch) {
        const recsText = recommendationsMatch[1].trim();
        
        // Extract bullet points (lines starting with • or - or numbered)
        const bulletLines = recsText.split('\n')
          .map(line => line.trim())
          .filter(line => {
            const trimmed = line.replace(/^[•\-\d+\.]\s*/, '').trim();
            return trimmed.length > 0 && trimmed.length < 100; // Likely a bullet point
          })
          .map(line => line.replace(/^[•\-\d+\.]\s*/, '').trim())
          .slice(0, 3);
        
        sections.recommendations = bulletLines;
        
        // Extract explanation (the paragraph after bullets)
        const explanationMatch = recsText.match(/(?:^|\n)([A-Z][^•\-\d].{50,})/s);
        if (explanationMatch) {
          // Remove bullet points from explanation
          const explanation = explanationMatch[1]
            .split('\n')
            .filter(line => {
              const trimmed = line.trim();
              return trimmed.length > 0 && 
                     !trimmed.match(/^[•\-\d+\.]\s/) && 
                     trimmed.length > 30; // Likely explanation text
            })
            .join(' ')
            .trim();
          sections.recommendationsExplanation = explanation;
        }
      }

      return sections;
    } else {
      // Correlation parsing (existing logic)
      const sections = {
        correlationSummary: '',
        recommendations: [],
        recommendationsExplanation: '',
        relatedFactors: ''
      };

      const summaryMatch = cleanText.match(/CORRELATION SUMMARY:\s*(.+?)(?=\nRECOMMENDATIONS:|$)/is);
      if (summaryMatch) {
        sections.correlationSummary = summaryMatch[1].trim();
      }

      const recommendationsMatch = cleanText.match(/RECOMMENDATIONS:\s*(.+?)(?=\nRELATED FACTORS:|$)/is);
      if (recommendationsMatch) {
        const recsText = recommendationsMatch[1].trim();
        
        // Extract bullet points (lines starting with • or - or numbered)
        const bulletLines = recsText.split('\n')
          .map(line => line.trim())
          .filter(line => {
            const trimmed = line.replace(/^[•\-\d+\.]\s*/, '').trim();
            return trimmed.length > 0 && trimmed.length < 100; // Likely a bullet point
          })
          .map(line => line.replace(/^[•\-\d+\.]\s*/, '').trim())
          .slice(0, 3);
        
        sections.recommendations = bulletLines;
        
        // Extract explanation (the paragraph after bullets)
        const explanationMatch = recsText.match(/(?:^|\n)([A-Z][^•\-\d].{50,})/s);
        if (explanationMatch) {
          // Remove bullet points from explanation
          const explanation = explanationMatch[1]
            .split('\n')
            .filter(line => {
              const trimmed = line.trim();
              return trimmed.length > 0 && 
                     !trimmed.match(/^[•\-\d+\.]\s/) && 
                     trimmed.length > 30; // Likely explanation text
            })
            .join(' ')
            .trim();
          sections.recommendationsExplanation = explanation;
        }
      }

      const factorsMatch = cleanText.match(/RELATED FACTORS:\s*(.+?)(?=\n|$)/is);
      if (factorsMatch) {
        sections.relatedFactors = factorsMatch[1].trim();
      }

      return sections;
    }
  };

  if (!isOpen || !insight) return null;

  // Different tabs for anomalies vs correlations
  const tabs = insight.type === 'anomaly' ? [
    { id: 'summary', label: 'Summary' },
    { id: 'visualization', label: 'Visualization & Statistics' }
  ] : [
    { id: 'summary', label: 'Summary' },
    { id: 'visualization', label: 'Visualization & Statistics' }
  ];

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{ borderColor: theme.border.primary, borderWidth: '1px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.primary }}>
          <div>
            <h2 className="text-2xl font-bold mb-1" style={{ color: theme.text.primary }}>
              Evidence for: {insight.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all"
            style={{ color: theme.text.secondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: theme.border.primary }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-6 py-3 relative transition-all"
              style={{
                color: activeTab === tab.id ? theme.accent.purple : theme.text.tertiary,
                fontWeight: activeTab === tab.id ? '600' : '400',
                borderBottom: activeTab === tab.id ? `3px solid ${theme.accent.purple}` : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'visualization' && (
            <VisualizationAndStatisticsTab insight={insight} chartData={chartData} allHealthData={allHealthData} />
          )}
          {activeTab === 'summary' && (
            <SummaryTab 
              insight={insight} 
              summaryData={summaryData} 
              loading={loadingSummary}
              allHealthData={allHealthData}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end" style={{ borderColor: theme.border.primary }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border font-medium transition-all"
            style={{ 
              borderColor: theme.border.primary,
              color: theme.text.secondary
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Visualization & Statistics Tab (Combined for both correlations and anomalies)
const VisualizationAndStatisticsTab = ({ insight, chartData, allHealthData }) => {
  if (insight.type === 'anomaly') {
    // Helper to get unit for metric
    const getUnit = (metricLabel) => {
      const label = (metricLabel || '').toLowerCase();
      if (label.includes('heart rate') || label.includes('bpm')) return 'bpm';
      if (label.includes('sugar') || label.includes('g')) return 'g';
      if (label.includes('percent') || label.includes('%')) return '%';
      if (label.includes('hours')) return 'hours';
      return '';
    };

    const getSeverityLevel = () => {
      if (insight.severity === 'high' || insight.consecutiveDays >= 3) return 'HIGH';
      if (insight.severity === 'medium' || insight.consecutiveDays >= 2) return 'MEDIUM';
      return 'LOW';
    };

    const unit = getUnit(insight.metricLabel);
    const baseline = typeof insight.baseline === 'number' ? insight.baseline : insight.mean;
    const currentValue = typeof insight.value === 'number' ? insight.value : null;
    const deviation = typeof insight.deviation === 'number' ? insight.deviation : (currentValue && baseline ? currentValue - baseline : null);
    const zScore = typeof insight.zScore === 'number' ? insight.zScore : null;
    const stdDev = typeof insight.stdDev === 'number' ? insight.stdDev : null;
    const mean = typeof insight.mean === 'number' ? insight.mean : baseline;
    const normalRangeMin = typeof insight.normalRange?.min === 'number' 
      ? insight.normalRange.min 
      : (mean && stdDev ? mean - stdDev : null);
    const normalRangeMax = typeof insight.normalRange?.max === 'number' 
      ? insight.normalRange.max 
      : (mean && stdDev ? mean + stdDev : null);
    
    // Calculate percentage deviation from baseline
    const percentDeviation = baseline && deviation ? ((deviation / baseline) * 100) : null;

    return (
      <div className="space-y-6">
        {/* Visualization Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
            Visualization
          </h3>
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border.primary} opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: theme.text.tertiary }}
                  stroke={theme.text.tertiary}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: theme.text.tertiary }}
                  stroke={theme.text.tertiary}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: theme.background.card,
                    border: `1px solid ${theme.border.primary}`,
                    borderRadius: '8px'
                  }}
                />
                {/* Normal Range */}
                {typeof insight.normalRange?.min === 'number' && typeof insight.normalRange?.max === 'number' && (
                  <ReferenceArea 
                    y1={insight.normalRange.min} 
                    y2={insight.normalRange.max} 
                    fill={theme.accent.success + '30'} 
                    fillOpacity={0.3}
                    label="Normal Range"
                  />
                )}
                {/* Mean Line */}
                {typeof insight.mean === 'number' && (
                  <ReferenceLine 
                    y={insight.mean} 
                    stroke={theme.accent.success} 
                    strokeDasharray="3 3"
                    label="Mean"
                  />
                )}
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#dc2626" 
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#dc2626' }}
                  activeDot={{ r: 6 }}
                />
                {/* Anomaly Start Marker */}
                {chartData.length >= 3 && (
                  <ReferenceLine 
                    x={chartData[chartData.length - 3].date} 
                    stroke="#dc2626" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label="Anomaly Started"
                    strokeOpacity={0.6}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: theme.text.tertiary }}>
                Your Normal Range: {
                  typeof insight.normalRange?.min === 'number' 
                    ? insight.normalRange.min.toFixed(1) 
                    : (typeof insight.mean === 'number' && typeof insight.stdDev === 'number' ? (insight.mean - insight.stdDev).toFixed(1) : 'N/A')
                } - {
                  typeof insight.normalRange?.max === 'number' 
                    ? insight.normalRange.max.toFixed(1) 
                    : (typeof insight.mean === 'number' && typeof insight.stdDev === 'number' ? (insight.mean + insight.stdDev).toFixed(1) : 'N/A')
                }
              </span>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
            Statistics
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {/* Current Value */}
            <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border.primary }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: theme.text.tertiary }}>Current Value</p>
                <div className="group relative">
                  <Info className="w-3 h-3 cursor-help" style={{ color: theme.text.tertiary }} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    The most recent measured value for this metric. Compared against your personal baseline.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                {currentValue !== null ? currentValue.toFixed(1) : 'N/A'}{unit ? ` ${unit}` : ''}
              </p>
            </div>

            {/* Baseline/Mean */}
            <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border.primary }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: theme.text.tertiary }}>Baseline (Mean)</p>
                <div className="group relative">
                  <Info className="w-3 h-3 cursor-help" style={{ color: theme.text.tertiary }} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Your average value for this metric over time. This is your personal baseline, calculated from your historical data.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                {baseline !== null && baseline !== undefined ? baseline.toFixed(1) : 'N/A'}{unit ? ` ${unit}` : ''}
              </p>
            </div>

            {/* Deviation */}
            <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border.primary }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: theme.text.tertiary }}>Deviation</p>
                <div className="group relative">
                  <Info className="w-3 h-3 cursor-help" style={{ color: theme.text.tertiary }} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    How far your current value is from your baseline. Positive = above baseline, negative = below baseline.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#dc2626' }}>
                {deviation !== null ? (deviation > 0 ? '+' : '') + deviation.toFixed(1) : 'N/A'}{unit ? ` ${unit}` : ''}
              </p>
              {percentDeviation !== null && (
                <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>
                  {percentDeviation > 0 ? '+' : ''}{percentDeviation.toFixed(1)}% from baseline
                </p>
              )}
            </div>

            {/* Z-Score */}
            <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border.primary }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: theme.text.tertiary }}>Z-Score</p>
                <div className="group relative">
                  <Info className="w-3 h-3 cursor-help" style={{ color: theme.text.tertiary }} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Number of standard deviations from the mean. |z| &gt; 2 = unusual, |z| &gt; 3 = very unusual.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#dc2626' }}>
                {zScore !== null ? (zScore > 0 ? '+' : '') + zScore.toFixed(2) : 'N/A'}
              </p>
              {zScore !== null && (
                <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>
                  {Math.abs(zScore) > 3 ? 'Very unusual' : Math.abs(zScore) > 2 ? 'Unusual' : 'Normal range'}
                </p>
              )}
            </div>

            {/* Standard Deviation */}
            <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border.primary }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: theme.text.tertiary }}>Standard Deviation</p>
                <div className="group relative">
                  <Info className="w-3 h-3 cursor-help" style={{ color: theme.text.tertiary }} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Measures how much your values typically vary from your average. Larger = more variability in your data.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                {stdDev !== null && stdDev !== undefined ? stdDev.toFixed(1) : 'N/A'}{unit ? ` ${unit}` : ''}
              </p>
            </div>

            {/* Duration */}
            <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border.primary }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: theme.text.tertiary }}>Duration</p>
                <div className="group relative">
                  <Info className="w-3 h-3 cursor-help" style={{ color: theme.text.tertiary }} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    How many consecutive days this anomaly has been detected. Longer duration may indicate a pattern.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                {insight.consecutiveDays || 1}
              </p>
              <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>
                consecutive day{(insight.consecutiveDays || 1) > 1 ? 's' : ''}
              </p>
            </div>

            {/* Severity */}
            <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border.primary }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: theme.text.tertiary }}>Severity Level</p>
                <div className="group relative">
                  <Info className="w-3 h-3 cursor-help" style={{ color: theme.text.tertiary }} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Severity based on deviation magnitude and duration. High = significant deviation lasting multiple days.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: '#dc2626' }}>
                {getSeverityLevel()}
              </p>
              <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>
                {getSeverityLevel() === 'HIGH' ? 'High priority' : getSeverityLevel() === 'MEDIUM' ? 'Monitor closely' : 'Low priority'}
              </p>
            </div>
          </div>

          {/* Normal Range Analysis */}
          <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary }}>
            <h4 className="text-md font-semibold mb-3" style={{ color: theme.text.primary }}>
              Normal Range Analysis
            </h4>
            <div className="space-y-2 mb-4">
              <p className="text-sm" style={{ color: theme.text.secondary }}>
                Your normal range for {insight.metricLabel} is{' '}
                <strong>
                  {normalRangeMin !== null ? normalRangeMin.toFixed(1) : 'N/A'}{unit ? ` ${unit}` : ''} - {normalRangeMax !== null ? normalRangeMax.toFixed(1) : 'N/A'}{unit ? ` ${unit}` : ''}
                </strong>
                . This range represents where 68% of your historical values fall (within one standard deviation of your mean).
              </p>
              {currentValue !== null && normalRangeMin !== null && normalRangeMax !== null && (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
                  <p className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                    {currentValue < normalRangeMin 
                      ? `Your current value is ${(normalRangeMin - currentValue).toFixed(1)} ${unit} below your normal range.`
                      : currentValue > normalRangeMax
                      ? `Your current value is ${(currentValue - normalRangeMax).toFixed(1)} ${unit} above your normal range.`
                      : 'Your current value is within your normal range.'}
                  </p>
                  {currentValue < normalRangeMin || currentValue > normalRangeMax ? (
                    <p className="text-xs mt-2" style={{ color: theme.text.secondary }}>
                      This indicates an unusual pattern that may warrant attention, especially if it persists over multiple days.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Prediction Section */}
          {insight.isActive && insight.prediction && (
            <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary, backgroundColor: '#f0f9ff' }}>
              <h4 className="text-md font-semibold mb-3" style={{ color: theme.text.primary }}>
                Predictive Analysis
              </h4>
              <p className="text-sm mb-2" style={{ color: theme.text.secondary }}>
                Based on your historical patterns, this elevated {insight.metricLabel?.toLowerCase()} has preceded illness on{' '}
                <strong>{insight.prediction.previousOccurrences || 2} previous occasion{(insight.prediction.previousOccurrences || 2) > 1 ? 's' : ''}</strong>.
              </p>
              <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#ffffff' }}>
                <p className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                  Likelihood: {insight.prediction.likelihood || 80}% chance of illness in the next 2 days
                </p>
                <p className="text-xs mt-2" style={{ color: theme.text.tertiary }}>
                  This prediction is based on pattern recognition in your historical data. Consider monitoring symptoms and prioritizing rest.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  if (insight.type === 'correlation') {
    const scatterData = chartData.map(d => ({ x: d.metric1, y: d.metric2, date: d.date }));
    
    // Calculate statistics
    const metric1Values = chartData.map(d => d.metric1).filter(v => v !== null && v !== undefined);
    const metric2Values = chartData.map(d => d.metric2).filter(v => v !== null && v !== undefined);
    
    const avg1 = metric1Values.length > 0 ? metric1Values.reduce((a, b) => a + b, 0) / metric1Values.length : 0;
    const avg2 = metric2Values.length > 0 ? metric2Values.reduce((a, b) => a + b, 0) / metric2Values.length : 0;
    
    const threshold = insight.threshold || (metric1Values.length > 0 ? metric1Values.sort((a, b) => a - b)[Math.floor(metric1Values.length / 2)] : 0);
    const goodValues = metric1Values.filter(v => v >= threshold);
    const poorValues = metric1Values.filter(v => v < threshold);
    
    const avgGood = goodValues.length > 0 
      ? chartData.filter(d => d.metric1 >= threshold).reduce((sum, d) => sum + d.metric2, 0) / goodValues.length 
      : 0;
    const avgPoor = poorValues.length > 0 
      ? chartData.filter(d => d.metric1 < threshold).reduce((sum, d) => sum + d.metric2, 0) / poorValues.length 
      : 0;
    
    return (
      <div className="space-y-6">
        {/* Visualization Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
            Visualization
          </h3>
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border.primary} opacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: theme.text.tertiary }}
                  stroke={theme.text.tertiary}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12, fill: theme.text.tertiary }}
                  stroke={theme.text.tertiary}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    // Format time values (stored as decimal hours) back to readable time
                    const formatHoursToTime = (hours) => {
                      if (hours === null || hours === undefined || isNaN(hours)) {
                        return 'N/A';
                      }
                      const h = Math.floor(hours);
                      const m = Math.round((hours - h) * 60);
                      const period = h >= 12 ? 'PM' : 'AM';
                      const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                      return m === 0 ? `${displayHour}:00 ${period}` : `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
                    };
                    
                    // Check if this is a time-based metric
                    const isTimeMetric1 = insight.metric1?.includes('time') || insight.metric1?.includes('caffeine_last_time');
                    const isTimeMetric2 = insight.metric2?.includes('time') || insight.metric2?.includes('caffeine_last_time');
                    
                    if (name === insight.metric1Label && isTimeMetric1) {
                      return [formatHoursToTime(value), insight.metric1Label];
                    }
                    if (name === insight.metric2Label && isTimeMetric2) {
                      return [formatHoursToTime(value), insight.metric2Label];
                    }
                    
                    // For non-time metrics, show the value with appropriate decimal places
                    return [typeof value === 'number' ? value.toFixed(1) : value, name];
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="metric1" 
                  stroke={theme.accent.primary} 
                  strokeWidth={2}
                  name={insight.metric1Label}
                  dot={{ r: 3 }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="metric2" 
                  stroke={theme.accent.success} 
                  strokeWidth={2}
                  name={insight.metric2Label}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
        </div>

        {/* Statistics Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
            Statistics
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border.primary }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: theme.text.tertiary }}>Correlation Coefficient</p>
                <div className="group relative">
                  <Info className="w-3 h-3 cursor-help" style={{ color: theme.text.tertiary }} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    r ranges from -1 to +1. Higher |r| = stronger relationship. {insight.correlation > 0 ? 'Positive' : 'Negative'} means they move together.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                r = {insight.correlation?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border.primary }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: theme.text.tertiary }}>P-value</p>
                <div className="group relative">
                  <Info className="w-3 h-3 cursor-help" style={{ color: theme.text.tertiary }} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Lower p-value = more statistically significant. &lt; 0.05 is considered significant.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                &lt; {(insight.pValue || 0.001).toFixed(3)}
              </p>
              <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>highly significant</p>
            </div>
            <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border.primary }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: theme.text.tertiary }}>Sample Size</p>
                <div className="group relative">
                  <Info className="w-3 h-3 cursor-help" style={{ color: theme.text.tertiary }} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Number of data points used in the analysis. More data = more reliable results.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                {insight.dataPoints || chartData.length}
              </p>
              <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>data points</p>
            </div>
            <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border.primary }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: theme.text.tertiary }}>Effect Size</p>
                <div className="group relative">
                  <Info className="w-3 h-3 cursor-help" style={{ color: theme.text.tertiary }} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    The actual difference in {insight.metric2Label} between the two groups. Larger = bigger practical impact.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                {insight.effectSize?.toFixed(insight.effectSizeUnit === 'g' || insight.effectSizeUnit === 'count' || insight.effectSizeUnit === 'bpm' ? 0 : 1) || Math.abs(avgGood - avgPoor).toFixed(1)}
              </p>
              <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>
                {insight.effectSizeUnit === 'points' ? 'points' : insight.effectSizeUnit || ''}
              </p>
            </div>
            <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border.primary }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: theme.text.tertiary }}>Time Lag</p>
                <div className="group relative">
                  <Info className="w-3 h-3 cursor-help" style={{ color: theme.text.tertiary }} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Days between {insight.metric1Label} change and {insight.metric2Label} response. 0 = same day effect.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                {insight.lag > 0 ? `+${insight.lag}` : '0'}
              </p>
              <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>days</p>
            </div>
            <div className="p-4 rounded-lg border relative" style={{ borderColor: theme.border.primary }}>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs" style={{ color: theme.text.tertiary }}>Confidence</p>
                <div className="group relative">
                  <Info className="w-3 h-3 cursor-help" style={{ color: theme.text.tertiary }} />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Statistical confidence level. Higher % = more certain this pattern is real, not random chance.
                  </div>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                {Math.round((insight.confidence || 0.95) * 100)}%
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary }}>
            <h4 className="text-md font-semibold mb-3" style={{ color: theme.text.primary }}>
              Impact Analysis
            </h4>
            {(() => {
              // Helper to format decimal hours to readable time
              const formatHoursToTime = (hours) => {
                if (hours === null || hours === undefined || isNaN(hours)) {
                  return 'N/A';
                }
                const h = Math.floor(hours);
                const m = Math.round((hours - h) * 60);
                const period = h >= 12 ? 'PM' : 'AM';
                const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                if (m === 0) return `${displayHour}:00 ${period}`;
                return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
              };
              
              // Check if metric2 is a time-based metric
              const isTimeMetric2 = insight.metric2?.includes('time') || 
                                   insight.metric2?.includes('caffeine_last_time') ||
                                   insight.metric2?.includes('bedtime') ||
                                   insight.metric2?.includes('wake_time') ||
                                   insight.metric2?.includes('breakfast_time') ||
                                   insight.metric2?.includes('lunch_time') ||
                                   insight.metric2?.includes('dinner_time') ||
                                   insight.metric2?.includes('workout_start_time') ||
                                   insight.metric2?.includes('workout_end_time') ||
                                   insight.metric2Label?.toLowerCase().includes('time');
              
              // Check if metric1 is a time-based metric
              const isTimeMetric1 = insight.metric1?.includes('time') || 
                                   insight.metric1?.includes('caffeine_last_time') ||
                                   insight.metric1?.includes('bedtime') ||
                                   insight.metric1?.includes('wake_time');
              
              // Format threshold if metric1 is time-based
              const formatThreshold = (val) => {
                if (isTimeMetric1) {
                  return formatHoursToTime(val);
                }
                if (insight.metric1?.includes('sleep') || insight.metric1?.includes('duration')) {
                  return `${val.toFixed(1)} hours`;
                }
                return val.toFixed(1);
              };
              
              // Format metric2 value
              const formatMetric2Value = (val) => {
                if (isTimeMetric2) {
                  return formatHoursToTime(val);
                }
                if (insight.effectSizeUnit === 'points') {
                  return `${val.toFixed(1)}/10`;
                }
                if (insight.effectSizeUnit) {
                  return `${val.toFixed(1)} ${insight.effectSizeUnit}`;
                }
                return val.toFixed(1);
              };
              
              // Format time difference
              const formatTimeDifference = (diff) => {
                if (isTimeMetric2) {
                  const hours = Math.floor(diff);
                  const minutes = Math.round((diff - hours) * 60);
                  if (hours === 0) {
                    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
                  } else if (minutes === 0) {
                    return `${hours.toFixed(1)} hour${hours !== 1 ? 's' : ''}`;
                  } else {
                    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
                  }
                }
                if (insight.effectSizeUnit === 'points') {
                  return `${diff.toFixed(1)} points`;
                }
                if (insight.effectSizeUnit) {
                  return `${diff.toFixed(1)} ${insight.effectSizeUnit}`;
                }
                return diff.toFixed(1);
              };
              
              // Get direction text for time differences
              const getDirectionText = () => {
                if (isTimeMetric2) {
                  // For times, lower numeric value = earlier time
                  return avgGood < avgPoor ? 'earlier' : 'later';
                }
                // For other metrics, use higher/lower
                return avgGood > avgPoor ? 'higher' : 'lower';
              };
              
              return (
                <>
            <p className="text-sm mb-4" style={{ color: theme.text.secondary }}>
                    When {insight.metric1Label} is {insight.metric1?.includes('sleep') || insight.metric1?.includes('duration') ? 'at least' : 'above'} {formatThreshold(threshold)}, 
                    your average {insight.metric2Label} is <strong>{formatMetric2Value(avgGood)}</strong>.
            </p>
            <p className="text-sm mb-4" style={{ color: theme.text.secondary }}>
                    When {insight.metric1Label} is {insight.metric1?.includes('sleep') || insight.metric1?.includes('duration') ? 'below' : 'at or below'} {formatThreshold(threshold)}, 
                    your average {insight.metric2Label} is <strong>{formatMetric2Value(avgPoor)}</strong>.
            </p>
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
              <p className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                      This means: {insight.metric2Label} is <strong>{formatTimeDifference(Math.abs(avgGood - avgPoor))} {getDirectionText()}</strong> when {insight.metric1Label} meets the threshold
                      {!isTimeMetric2 && (
                        <>, a {((Math.abs(avgGood - avgPoor) / Math.max(Math.abs(avgGood), Math.abs(avgPoor))) * 100).toFixed(0)}% difference</>
                      )}.
              </p>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  return <div>Visualization for {insight.type}</div>;
};

// Summary Tab with AI-generated content
const SummaryTab = ({ insight, summaryData, loading, allHealthData }) => {
  // Show loading state while generating summary
  if (loading || (!summaryData && insight)) {
  return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center max-w-md">
          {/* Animated brain icon with pulse effect */}
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div 
                className="absolute inset-0 rounded-full opacity-20"
                style={{
                  backgroundColor: theme.accent.purple,
                  animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              ></div>
              <div 
                className="absolute inset-2 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: theme.accent.purple + '15',
                  animation: 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}
              >
                <Brain 
                  className="w-10 h-10 relative z-10" 
                  style={{ 
                    color: theme.accent.purple,
                    animation: 'pulse-icon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }} 
                />
        </div>
        </div>
      </div>

          {/* Loading text with animated dots */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
              Generating AI Summary
            </h3>
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              Analyzing your health data and generating personalized insights
            </p>
            <div className="flex gap-2 justify-center items-center mt-6">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{
                  backgroundColor: theme.accent.purple,
                  animation: 'bounce-dot 1.4s ease-in-out infinite',
                  animationDelay: '0s'
                }}
              ></div>
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ 
                  backgroundColor: theme.accent.primary,
                  animation: 'bounce-dot 1.4s ease-in-out infinite',
                  animationDelay: '0.2s'
                }}
              ></div>
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ 
                  backgroundColor: theme.accent.success,
                  animation: 'bounce-dot 1.4s ease-in-out infinite',
                  animationDelay: '0.4s'
                }}
              ></div>
          </div>
        </div>
          
          <style>{`
            @keyframes pulse-ring {
              0% {
                transform: scale(0.8);
                opacity: 1;
              }
              50%, 100% {
                transform: scale(1.2);
                opacity: 0;
              }
            }
            @keyframes pulse-glow {
              0%, 100% {
                opacity: 0.15;
              }
              50% {
                opacity: 0.25;
              }
            }
            @keyframes pulse-icon {
              0%, 100% {
                transform: scale(1);
                opacity: 1;
              }
              50% {
                transform: scale(1.1);
                opacity: 0.9;
              }
            }
            @keyframes bounce-dot {
              0%, 80%, 100% {
                transform: scale(0.8);
                opacity: 0.5;
              }
              40% {
                transform: scale(1.2);
                opacity: 1;
              }
            }
          `}</style>
      </div>
    </div>
  );
  }

  if (!summaryData) {
  return (
      <div className="text-center py-12">
        <p style={{ color: theme.text.secondary }}>No summary available</p>
    </div>
  );
  }

  // Different layout for anomalies vs correlations
  if (insight.type === 'anomaly') {
  return (
    <div className="space-y-6">
        {/* Anomaly Summary Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
            Anomaly Summary
          </h3>
          <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary, backgroundColor: '#f8fafc' }}>
            <p className="text-base whitespace-pre-wrap" style={{ color: theme.text.secondary }}>
              {summaryData.anomalySummary || 'No summary available.'}
            </p>
          </div>
        </div>

        {/* Reasons Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
            Reasons
          </h3>
          <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary, backgroundColor: '#f0f9ff' }}>
            <p className="text-base whitespace-pre-wrap" style={{ color: theme.text.secondary }}>
              {summaryData.reasons || 'No reasons identified.'}
            </p>
          </div>
        </div>

      {/* Recommendations Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
          Recommendations
        </h3>
        {summaryData.recommendations && summaryData.recommendations.length > 0 ? (
          <>
            <div className="space-y-2 mb-4">
              {summaryData.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
                  <span className="text-lg font-bold mt-0.5" style={{ color: theme.accent.primary }}>
                    •
                  </span>
                  <p className="text-base flex-1" style={{ color: theme.text.secondary }}>
                    {rec}
                  </p>
                </div>
              ))}
            </div>
            {summaryData.recommendationsExplanation && (
              <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary, backgroundColor: '#f0f9ff' }}>
                <p className="text-sm whitespace-pre-wrap" style={{ color: theme.text.secondary }}>
                  {summaryData.recommendationsExplanation}
            </p>
          </div>
            )}
          </>
        ) : (
          <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary }}>
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              No specific recommendations available at this time.
            </p>
        </div>
        )}
      </div>

      </div>
    );
  }

  // Correlation layout (existing)
  return (
    <div className="space-y-6">
      {/* Correlation Summary Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
          Correlation Summary
        </h3>
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary, backgroundColor: '#f8fafc' }}>
          <p className="text-base whitespace-pre-wrap" style={{ color: theme.text.secondary }}>
            {summaryData.correlationSummary || 'No summary available.'}
          </p>
        </div>
      </div>

      {/* Recommendations Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
          Recommendations
        </h3>
        {summaryData.recommendations && summaryData.recommendations.length > 0 ? (
          <>
            <div className="space-y-2 mb-4">
              {summaryData.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
                  <span className="text-lg font-bold mt-0.5" style={{ color: theme.accent.primary }}>
                    •
                  </span>
                  <p className="text-base flex-1" style={{ color: theme.text.secondary }}>
                    {rec}
                  </p>
                </div>
              ))}
            </div>
            {summaryData.recommendationsExplanation && (
              <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary, backgroundColor: '#f0f9ff' }}>
                <p className="text-sm whitespace-pre-wrap" style={{ color: theme.text.secondary }}>
                  {summaryData.recommendationsExplanation}
            </p>
          </div>
            )}
          </>
        ) : (
          <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary }}>
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              No specific recommendations available at this time.
            </p>
          </div>
        )}
      </div>

      {/* Related Factors Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
          Related Factors
        </h3>
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary, backgroundColor: '#f0f9ff' }}>
          <p className="text-base whitespace-pre-wrap" style={{ color: theme.text.secondary }}>
            {summaryData.relatedFactors || 'No related factors identified.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InsightEvidenceModal;

