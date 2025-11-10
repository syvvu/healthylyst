// Prediction Insight Card Component
// Matches detailed visual specifications

import React from 'react';
import { Sparkles } from 'lucide-react';
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

const PredictionInsightCard = ({ insight, onSeeEvidence }) => {
  const getBarColor = (value) => {
    if (value >= 7.5) return theme.accent.success;
    if (value >= 6.5) return theme.accent.warning;
    return theme.accent.danger;
  };

  const chartData = insight.predictedValues?.map(pv => ({
    day: pv.day,
    value: pv.value,
    color: getBarColor(pv.value)
  })) || [];

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl"
      style={{ 
        borderColor: theme.border.primary, 
        borderWidth: '1px',
        background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span 
          className="px-2 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1"
          style={{ backgroundColor: '#8b5cf6' }}
        >
          🤖 AI-PREDICTION
        </span>
        <Sparkles className="w-5 h-5" style={{ color: theme.accent.primary }} />
        <span 
          className="px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: theme.accent.primary }}
        >
          FORECAST
        </span>
        <span className="text-xs" style={{ color: theme.text.tertiary }}>
          {insight.timeframe || 'Next 7 days'}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold mb-6" style={{ color: theme.text.primary }}>
        {insight.title}
      </h3>

      {/* Bar Chart */}
      <div className="mb-6">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border.primary} opacity={0.3} />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12, fill: theme.text.tertiary }}
                stroke={theme.text.tertiary}
              />
              <YAxis 
                domain={[0, 10]}
                tick={{ fontSize: 12, fill: theme.text.tertiary }}
                stroke={theme.text.tertiary}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme.background.card,
                  border: `1px solid ${theme.border.primary}`,
                  borderRadius: '8px'
                }}
                formatter={(value) => [`${value}/10`, 'Predicted Energy']}
              />
              <ReferenceLine y={7.5} stroke={theme.accent.success} strokeDasharray="3 3" label="Good" />
              <Bar 
                dataKey="value" 
                radius={[8, 8, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Bar key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-center">
          <span 
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ 
              backgroundColor: theme.accent.danger + '20',
              color: theme.accent.danger
            }}
          >
            ⚠️ Thursday Energy Dip Predicted
          </span>
        </div>
      </div>

      {/* Prediction Details */}
      <div className="mb-6 p-4 rounded-lg border" style={{ borderColor: theme.border.primary, backgroundColor: '#fff7ed' }}>
        <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>
          Why:
        </h4>
        <p className="text-sm mb-3" style={{ color: theme.text.secondary }}>
          {insight.reason || 'Based on your current sleep pattern (6.8 hrs average), accumulated fatigue peaks on Thursday'}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: theme.text.tertiary }}>Model confidence:</span>
          <span 
            className="px-2 py-1 rounded text-xs font-semibold"
            style={{ 
              backgroundColor: theme.accent.primary + '20',
              color: theme.accent.primary
            }}
          >
            {Math.round((insight.confidence || 0.78) * 100)}% accuracy
          </span>
        </div>
      </div>

      {/* Scenario Comparison */}
      {insight.optimization && (
        <div className="mb-6 grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border" style={{ borderColor: theme.accent.danger + '40', backgroundColor: theme.accent.danger + '10' }}>
            <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>
              Current Path
            </h4>
            <p className="text-xs mb-2" style={{ color: theme.text.secondary }}>
              If you continue current pattern:
            </p>
            <p className="text-lg font-bold mb-1" style={{ color: theme.accent.danger }}>
              Thursday energy: 6.2/10
            </p>
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              Workout performance: -25%
            </p>
          </div>
          
          <div className="p-4 rounded-lg border" style={{ borderColor: theme.accent.success + '40', backgroundColor: theme.accent.success + '10' }}>
            <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>
              Optimized Path
            </h4>
            <p className="text-xs mb-2" style={{ color: theme.text.secondary }}>
              If you sleep {insight.optimization.ifSleep}+ hrs Mon-Wed:
            </p>
            <p className="text-lg font-bold mb-1" style={{ color: theme.accent.success }}>
              Thursday energy: {insight.optimization.thenEnergy}/10 (↑{insight.optimization.improvement} points)
            </p>
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              Workout performance: Normal
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onSeeEvidence}
          className="flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: theme.accent.success }}
        >
          Optimize My Week
        </button>
        <button
          onClick={onSeeEvidence}
          className="px-6 py-3 rounded-lg border font-medium transition-all hover:bg-gray-50"
          style={{ 
            borderColor: theme.border.primary,
            color: theme.text.primary
          }}
        >
          See Recommendations
        </button>
        <button
          className="px-6 py-3 rounded-lg border font-medium transition-all hover:bg-gray-50"
          style={{ 
            borderColor: theme.border.primary,
            color: theme.text.primary
          }}
        >
          Track Accuracy
        </button>
      </div>
    </div>
  );
};

export default PredictionInsightCard;

