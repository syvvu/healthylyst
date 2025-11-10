// Weekly Cycle Pattern Card Component
// Shows recurring day-of-week patterns

import React from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

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

const WeeklyCycleCard = ({ insight, onSeeEvidence, allHealthData, isNew }) => {
  if (!insight.pattern) return null;
  
  const { pattern } = insight;
  
  // Prepare chart data
  const chartData = [
    { day: 'Mon', value: pattern.averages?.Monday || 0 },
    { day: 'Tue', value: pattern.averages?.Tuesday || 0 },
    { day: 'Wed', value: pattern.averages?.Wednesday || 0 },
    { day: 'Thu', value: pattern.averages?.Thursday || 0 },
    { day: 'Fri', value: pattern.averages?.Friday || 0 },
    { day: 'Sat', value: pattern.averages?.Saturday || 0 },
    { day: 'Sun', value: pattern.averages?.Sunday || 0 }
  ];
  
  const avgValue = chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length;
  
  return (
    <div 
      className="bg-white rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl"
      style={{ 
        borderColor: theme.border.primary, 
        borderWidth: '1px',
        borderLeftWidth: '4px',
        borderLeftColor: theme.accent.primary
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {isNew && (
          <span 
            className="px-3 py-1 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: theme.accent.purple }}
          >
            🔗 PATTERN
          </span>
        )}
        <Calendar className="w-6 h-6" style={{ color: theme.accent.primary }} />
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold mb-4" style={{ color: theme.text.primary }}>
        {insight.title}
      </h3>

      {/* Chart */}
      <div className="mb-6" style={{ height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
            <XAxis 
              dataKey="day" 
              style={{ fontSize: '12px', fill: theme.text.secondary }}
            />
            <YAxis 
              style={{ fontSize: '12px', fill: theme.text.secondary }}
              domain={[0, 10]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: theme.background.card,
                border: `1px solid ${theme.border.primary}`,
                borderRadius: '8px'
              }}
            />
            <ReferenceLine 
              y={avgValue} 
              stroke={theme.text.tertiary} 
              strokeDasharray="3 3"
              label={{ value: 'Average', position: 'right' }}
            />
            <Bar 
              dataKey="value" 
              fill={theme.accent.primary}
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pattern Details */}
      <div className="mb-4 space-y-2">
        <div className="text-sm" style={{ color: theme.text.secondary }}>
          <span className="font-semibold">Peak Days:</span> {pattern.peakDays.join(', ')}
          <span className="ml-2">({pattern.peakValue.toFixed(1)}/10)</span>
        </div>
        <div className="text-sm" style={{ color: theme.text.secondary }}>
          <span className="font-semibold">Low Days:</span> {pattern.lowDays.join(', ')}
          <span className="ml-2">({pattern.lowValue.toFixed(1)}/10)</span>
        </div>
        <div className="text-sm" style={{ color: theme.text.secondary }}>
          <span className="font-semibold">Consistency:</span> {pattern.consistency}/{pattern.totalWeeks} weeks ({Math.round((pattern.consistency / pattern.totalWeeks) * 100)}% reliability)
        </div>
      </div>

      {/* Pattern Description */}
      <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: '#F0F9FF' }}>
        <p className="text-sm" style={{ color: theme.text.secondary }}>
          <span className="font-semibold">Pattern:</span> Weekend recovery → Mid-week peak → End-week fatigue
        </p>
      </div>

      {/* Recommendation */}
      <div className="mb-6 p-3 rounded-lg border" style={{ borderColor: theme.accent.success, backgroundColor: '#F0FDF4' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: theme.text.primary }}>
          Recommendation:
        </p>
        <p className="text-sm" style={{ color: theme.text.secondary }}>
          Schedule important workouts on {pattern.peakDays.join('/')} for {Math.round(((pattern.peakValue - pattern.lowValue) / pattern.lowValue) * 100)}% better results
        </p>
      </div>

      {/* Action Buttons - Exact format from spec */}
      <div className="flex gap-3">
        <button
          onClick={() => onSeeEvidence && onSeeEvidence()}
          className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
          style={{ 
            backgroundColor: theme.accent.primary,
            color: 'white'
          }}
        >
          See Pattern
        </button>
        <button
          onClick={() => window.location.href = '/timeline'}
          className="px-4 py-2 rounded-lg font-medium border transition-all hover:bg-gray-50"
          style={{ 
            borderColor: theme.border.primary,
            color: theme.text.primary
          }}
        >
          Optimize Schedule
        </button>
      </div>
    </div>
  );
};

export default WeeklyCycleCard;

