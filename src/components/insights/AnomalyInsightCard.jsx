// Anomaly Insight Card Component
// Matches detailed visual specifications

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Eye, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { getAvailableDates, getDataForDate } from '../../utils/dataLoader';
import { format } from 'date-fns';
import { generateContent } from '../../utils/geminiClient';
import { withCache } from '../../utils/aiCache';

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

const AnomalyInsightCard = ({ insight, onSeeEvidence, onDismiss, onTrack, onUnarchive, allHealthData, isNew, activeTab = 'all', isTracked = false, isArchived = false }) => {
  const [chartData, setChartData] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    if (insight && allHealthData) {
      const dates = getAvailableDates(allHealthData);
      const recentDates = dates.slice(-14); // Last 14 days
      
      // Parse date string as local date to avoid timezone issues
      const parseLocalDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
      };
      
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
  }, [insight, allHealthData]);

  // Helper function to get unit for metric
  const getUnit = (metricLabel) => {
    const label = (metricLabel || '').toLowerCase();
    if (label.includes('heart rate') || label.includes('bpm')) return 'bpm';
    if (label.includes('sugar') || label.includes('g')) return 'g';
    if (label.includes('percent') || label.includes('%')) return '%';
    if (label.includes('hours')) return 'hours';
    return '';
  };

  // Generate AI summary for the insight (for All and Archived subtabs)
  useEffect(() => {
    if (!insight || !allHealthData || (activeTab !== 'all' && activeTab !== 'archived')) return;

    const generateAISummary = async () => {
      setLoadingSummary(true);
      
      const cacheParams = {
        anomaly: {
          metric: insight.metricLabel || insight.metric,
          value: insight.value,
          date: insight.timestamp ? new Date(insight.timestamp).toISOString().split('T')[0] : null
        }
      };

      try {
        const summary = await withCache('anomalySummary', cacheParams, async () => {
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
          csvDataSection += formatCSVData(allHealthData.sleep, 'SLEEP');
          csvDataSection += formatCSVData(allHealthData.nutrition, 'NUTRITION');
          csvDataSection += formatCSVData(allHealthData.activity, 'ACTIVITY');
          csvDataSection += formatCSVData(allHealthData.vitals, 'VITALS');
          csvDataSection += formatCSVData(allHealthData.wellness, 'WELLNESS');
          csvDataSection += '\n=== END OF DATASET ===\n';

          const unit = getUnit(insight.metricLabel);
          const currentValue = typeof insight.value === 'number' ? insight.value.toFixed(1) : insight.value;
          const baseline = typeof insight.baseline === 'number' ? insight.baseline.toFixed(1) : insight.mean?.toFixed(1) || 'N/A';
          const deviation = typeof insight.deviation === 'number' ? Math.abs(insight.deviation).toFixed(0) : 'N/A';

          const prompt = `You are a supportive health coach. Generate a ONE-LINE summary (max 15 words) for this health anomaly insight.

ANOMALY DATA:
- Metric: ${insight.metricLabel || insight.metric} (${insight.category})
- Current Value: ${currentValue}${unit ? ` ${unit}` : ''}
- Baseline/Normal: ${baseline}${unit ? ` ${unit}` : ''}
- Deviation: ${deviation}${unit ? ` ${unit}` : ''} ${insight.deviation > 0 ? 'above' : 'below'} baseline
- Duration: ${insight.consecutiveDays || 1} consecutive day${(insight.consecutiveDays || 1) > 1 ? 's' : ''}
- Severity: ${insight.severity || 'medium'}
- Status: ${insight.isActive ? 'ACTIVE' : 'RESOLVED'}
${insight.prediction ? `- Prediction: ${insight.prediction.likelihood || 80}% likelihood of illness in next 2 days` : ''}

${csvDataSection}

IMPORTANT GUIDELINES:
- Write ONE clear, concise sentence (max 15 words)
- Use simple, friendly language
- Focus on what this means and what to do, not technical details
- Be supportive and actionable, not alarming
- Avoid jargon like "anomaly", "deviation", "z-score"
- If prediction exists, mention it naturally

Example format: "Elevated sugar intake for 2 days may signal upcoming illness - prioritize rest" or "Your heart rate is unusually high - consider light activity and extra sleep"

Generate ONLY the one-line summary, no quotes, no extra text:`;

          const response = await generateContent(prompt, { temperature: 0.8, maxTokens: 50, context: 'insights_anomalies' });
          if (response.success && response.text) {
            return response.text.trim().replace(/^["']|["']$/g, '');
          }
          throw new Error('AI generation failed');
        });

        setAiSummary(summary);
      } catch (error) {
        console.error('Error generating AI summary:', error);
        // Fallback to a simple description
        const unit = getUnit(insight.metricLabel);
        const fallback = `${insight.metricLabel || insight.metric} is ${insight.deviation > 0 ? 'elevated' : 'low'} (${Math.abs(insight.deviation || 0).toFixed(0)}${unit ? ` ${unit}` : ''} ${insight.deviation > 0 ? 'above' : 'below'} baseline) for ${insight.consecutiveDays || 1} day${(insight.consecutiveDays || 1) > 1 ? 's' : ''}`;
        setAiSummary(fallback);
      } finally {
        setLoadingSummary(false);
      }
    };

    generateAISummary();
  }, [insight, allHealthData, activeTab]);

  const getSeverityLevel = () => {
    if (insight.severity === 'high' || insight.consecutiveDays >= 3) return 'HIGH';
    if (insight.severity === 'medium' || insight.consecutiveDays >= 2) return 'MEDIUM';
    return 'LOW';
  };

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl relative"
      style={{ 
        borderColor: theme.border.primary, 
        borderWidth: '1px',
        borderLeftWidth: '6px',
        borderLeftColor: theme.accent.warning
      }}
    >
      {/* Card Format - Show for both 'all' and 'archived' subtabs */}
      {(activeTab === 'all' || activeTab === 'archived') && (
        <>
          {/* Title */}
          <h3 className="text-2xl font-bold mb-4" style={{ color: theme.text.primary }}>
            {insight.title || `${insight.isActive ? 'Elevated' : 'Low'} ${insight.metricLabel}${insight.consecutiveDays >= 2 ? ` - ${insight.consecutiveDays}${insight.consecutiveDays === 2 ? 'nd' : insight.consecutiveDays === 3 ? 'rd' : 'th'} Consecutive Day${insight.consecutiveDays > 1 ? 's' : ''}` : ''}`}
          </h3>

          {/* Severity and Stats */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-sm" style={{ color: theme.text.secondary }}>
                Severity: {getSeverityLevel()}
              </span>
              <span 
                className="px-2 py-1 rounded text-xs font-medium"
                style={{ 
                  backgroundColor: insight.severity === 'high' ? theme.accent.danger + '20' : 
                                  insight.severity === 'medium' ? theme.accent.warning + '20' : 
                                  theme.accent.success + '20',
                  color: insight.severity === 'high' ? theme.accent.danger : 
                         insight.severity === 'medium' ? theme.accent.warning : 
                         theme.accent.success
                }}
              >
                {insight.severity === 'high' ? 'High' : insight.severity === 'medium' ? 'Medium' : 'Low'}
              </span>
              {isTracked && (
                <span 
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ 
                    backgroundColor: theme.accent.primary + '20',
                    color: theme.accent.primary
                  }}
                >
                  📌 Tracked
                </span>
              )}
              {isArchived && (
            <span 
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ 
                    backgroundColor: theme.text.tertiary + '20',
                    color: theme.text.tertiary
                  }}
            >
                  📦 Archived
            </span>
          )}
          {insight.isActive && (
            <span 
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ 
                    backgroundColor: theme.accent.danger + '20',
                    color: theme.accent.danger
                  }}
            >
              ACTIVE
            </span>
          )}
        </div>
            <div className="flex items-center gap-3 mb-2 flex-wrap text-sm" style={{ color: theme.text.secondary }}>
              <span>Current: {typeof insight.value === 'number' ? insight.value.toFixed(1) : insight.value || 'N/A'}{insight.metricLabel?.includes('Heart Rate') ? ' bpm' : insight.metricLabel?.includes('Sugar') ? 'g' : ''}</span>
              <span>•</span>
              <span>Baseline: {typeof insight.baseline === 'number' ? insight.baseline.toFixed(1) : insight.mean?.toFixed(1) || 'N/A'}{insight.metricLabel?.includes('Heart Rate') ? ' bpm' : insight.metricLabel?.includes('Sugar') ? 'g' : ''}</span>
              <span>•</span>
              <span>{insight.consecutiveDays || 1} consecutive day{(insight.consecutiveDays || 1) > 1 ? 's' : ''}</span>
      </div>
          <p className="text-base mb-2" style={{ color: theme.text.secondary }}>
              {loadingSummary ? (
                <span className="opacity-50">Generating AI insight...</span>
              ) : (
                aiSummary || `${insight.metricLabel} is ${insight.deviation > 0 ? 'elevated' : 'low'} for ${insight.consecutiveDays || 1} day${(insight.consecutiveDays || 1) > 1 ? 's' : ''}`
              )}
          </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs" style={{ color: theme.text.tertiary }}>
                Source: {insight.category || 'Unknown'}.csv
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={onSeeEvidence}
              className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
              style={{ 
                backgroundColor: theme.accent.purple,
                color: 'white'
              }}
            >
              See details
            </button>
            {onTrack && (
            <button
                onClick={onTrack}
                className={`px-4 py-2 rounded-lg border font-medium transition-all hover:bg-gray-50 ${
                  isTracked ? 'opacity-60' : ''
                }`}
              style={{ 
                  borderColor: isTracked ? theme.accent.primary : theme.border.primary,
                  color: isTracked ? theme.accent.primary : theme.text.primary,
                  backgroundColor: isTracked ? theme.accent.primary + '10' : 'transparent'
              }}
            >
                {isTracked ? '✓ Tracked' : 'Track This'}
            </button>
            )}
            {onUnarchive ? (
              <button
                onClick={onUnarchive}
                className="px-4 py-2 rounded-lg border font-medium transition-all hover:bg-gray-50"
                style={{ 
                  borderColor: theme.border.primary,
                  color: theme.text.primary
                }}
              >
                Unarchive
              </button>
            ) : onDismiss ? (
              <button
                onClick={onDismiss}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-50"
                style={{ color: theme.text.tertiary }}
              >
                Dismiss
              </button>
            ) : null}
          </div>
        </>
      )}

      {/* Anomalies Tab - Use same card format as All Insights */}
      {activeTab === 'anomalies' && (
        <>
          {/* Title */}
          <h3 className="text-2xl font-bold mb-4" style={{ color: theme.text.primary }}>
            {insight.title || `${insight.isActive ? 'Elevated' : 'Low'} ${insight.metricLabel}${insight.consecutiveDays >= 2 ? ` - ${insight.consecutiveDays}${insight.consecutiveDays === 2 ? 'nd' : insight.consecutiveDays === 3 ? 'rd' : 'th'} Consecutive Day${insight.consecutiveDays > 1 ? 's' : ''}` : ''}`}
          </h3>

          {/* Severity and Stats */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-sm" style={{ color: theme.text.secondary }}>
                Severity: {getSeverityLevel()}
          </span>
              <span
                className="px-2 py-1 rounded text-xs font-medium"
                style={{
                  backgroundColor: insight.severity === 'high' ? theme.accent.danger + '20' : 
                                  insight.severity === 'medium' ? theme.accent.warning + '20' : 
                                  theme.accent.success + '20',
                  color: insight.severity === 'high' ? theme.accent.danger : 
                         insight.severity === 'medium' ? theme.accent.warning : 
                         theme.accent.success
                }}
              >
                {insight.severity === 'high' ? 'High' : insight.severity === 'medium' ? 'Medium' : 'Low'}
              </span>
              {isTracked && (
                <span 
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ 
                    backgroundColor: theme.accent.primary + '20',
                    color: theme.accent.primary
                  }}
                >
                  📌 Tracked
                </span>
              )}
              {isArchived && (
                <span 
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ 
                    backgroundColor: theme.text.tertiary + '20',
                    color: theme.text.tertiary
                  }}
                >
                  📦 Archived
                </span>
              )}
              {insight.isActive && (
                <span 
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ 
                    backgroundColor: theme.accent.danger + '20',
                    color: theme.accent.danger
                  }}
                >
                  ACTIVE
                </span>
              )}
        </div>
            <div className="flex items-center gap-3 mb-2 flex-wrap text-sm" style={{ color: theme.text.secondary }}>
              <span>Current: {typeof insight.value === 'number' ? insight.value.toFixed(1) : insight.value || 'N/A'}{insight.metricLabel?.includes('Heart Rate') ? ' bpm' : insight.metricLabel?.includes('Sugar') ? 'g' : ''}</span>
              <span>•</span>
              <span>Baseline: {typeof insight.baseline === 'number' ? insight.baseline.toFixed(1) : insight.mean?.toFixed(1) || 'N/A'}{insight.metricLabel?.includes('Heart Rate') ? ' bpm' : insight.metricLabel?.includes('Sugar') ? 'g' : ''}</span>
              <span>•</span>
              <span>{insight.consecutiveDays || 1} consecutive day{(insight.consecutiveDays || 1) > 1 ? 's' : ''}</span>
          </div>
            <p className="text-base mb-2" style={{ color: theme.text.secondary }}>
              {loadingSummary ? (
                <span className="opacity-50">Generating AI insight...</span>
              ) : (
                aiSummary || `${insight.metricLabel} is ${insight.deviation > 0 ? 'elevated' : 'low'} for ${insight.consecutiveDays || 1} day${(insight.consecutiveDays || 1) > 1 ? 's' : ''}`
              )}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs" style={{ color: theme.text.tertiary }}>
                Source: {insight.category || 'Unknown'}.csv
              </span>
          </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
                <button
                  onClick={onSeeEvidence}
              className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                  style={{ 
                backgroundColor: theme.accent.purple,
                color: 'white'
                  }}
                >
              See details
                </button>
            {onTrack && (
              <button
                onClick={onTrack}
                className={`px-4 py-2 rounded-lg border font-medium transition-all hover:bg-gray-50 ${
                  isTracked ? 'opacity-60' : ''
                }`}
                style={{ 
                  borderColor: isTracked ? theme.accent.primary : theme.border.primary,
                  color: isTracked ? theme.accent.primary : theme.text.primary,
                  backgroundColor: isTracked ? theme.accent.primary + '10' : 'transparent'
                }}
              >
                {isTracked ? '✓ Tracked' : 'Track This'}
              </button>
            )}
            {onUnarchive ? (
              <button
                onClick={onUnarchive}
                className="px-4 py-2 rounded-lg border font-medium transition-all hover:bg-gray-50"
                style={{ 
                  borderColor: theme.border.primary,
                  color: theme.text.primary
                }}
              >
                Unarchive
              </button>
            ) : onDismiss ? (
              <button
                onClick={onDismiss}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-50"
                style={{ color: theme.text.tertiary }}
              >
                Dismiss
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};

export default AnomalyInsightCard;

