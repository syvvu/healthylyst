// Cascade Insight Card Component
// Matches detailed visual specifications

import React from 'react';
import { Link2 } from 'lucide-react';

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

const CascadeInsightCard = ({ insight, onSeeEvidence, isNew }) => {
  const getCategoryColor = (category) => {
    const colors = {
      sleep: '#8b5cf6',
      activity: '#10b981',
      nutrition: '#f97316',
      vitals: '#ef4444',
      wellness: '#0ea5e9'
    };
    return colors[category] || theme.accent.primary;
  };

  const getStepIcon = (step) => {
    if (step.metric?.includes('caffeine')) return '☕';
    if (step.metric?.includes('sleep')) return '😴';
    if (step.metric?.includes('sugar')) return '🍬';
    if (step.metric?.includes('energy')) return '⚡';
    if (step.metric?.includes('mood')) return '😔';
    if (step.metric?.includes('workout')) return '🏃‍♂️';
    return '📊';
  };

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl"
      style={{ 
        borderColor: theme.border.primary, 
        borderWidth: '1px',
        borderLeftWidth: '4px',
        borderLeftColor: theme.accent.purple
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {isNew && (
          <span 
            className="px-3 py-1 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: theme.accent.purple }}
          >
            🔗 PATTERN
          </span>
        )}
        <Link2 className="w-5 h-5" style={{ color: theme.accent.purple }} />
        <span className="text-xs" style={{ color: theme.text.tertiary }}>
          Found in {insight.frequency || 8} occurrences
        </span>
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold mb-6" style={{ color: theme.text.primary }}>
        {insight.title || 'The 3-Day Energy Crash Cycle'}
      </h3>

      {/* Flow Diagram */}
      <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
        <div className="flex flex-wrap items-center gap-4 justify-center">
          {insight.path?.map((step, idx) => (
            <React.Fragment key={idx}>
              <div 
                className="p-3 rounded-lg border text-center min-w-[120px]"
                style={{ 
                  borderColor: getCategoryColor(step.source) + '40',
                  backgroundColor: getCategoryColor(step.source) + '10'
                }}
              >
                <div className="text-2xl mb-1">{getStepIcon(step)}</div>
                <div className="text-xs font-semibold" style={{ color: theme.text.primary }}>
                  {step.metric || 'Step ' + (idx + 1)}
                </div>
                {step.value && (
                  <div className="text-xs mt-1" style={{ color: theme.text.tertiary }}>
                    {step.value}
                  </div>
                )}
              </div>
              {idx < insight.path.length - 1 && (
                <div className="text-2xl" style={{ color: theme.text.tertiary }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Impact Summary */}
      {insight.totalImpact && (
        <div className="mb-6 p-4 rounded-lg border" style={{ borderColor: theme.border.primary, backgroundColor: '#fff7ed' }}>
          <h4 className="text-sm font-semibold mb-3" style={{ color: theme.text.primary }}>
            Impact Summary
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs" style={{ color: theme.text.tertiary }}>Days Affected</p>
              <p className="text-lg font-bold" style={{ color: theme.text.primary }}>
                {insight.totalImpact.daysAffected || 24} days
              </p>
              <p className="text-xs" style={{ color: theme.text.tertiary }}>
                ({Math.round((insight.totalImpact.daysAffected / 60) * 100)}% of your data)
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: theme.text.tertiary }}>Energy Loss</p>
              <p className="text-lg font-bold" style={{ color: theme.accent.danger }}>
                {insight.totalImpact.energyLoss || 3.2} points
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: theme.text.tertiary }}>Workouts Missed</p>
              <p className="text-lg font-bold" style={{ color: theme.text.primary }}>
                {insight.totalImpact.workoutsMissed || 8}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: theme.text.tertiary }}>Goal Delay</p>
              <p className="text-lg font-bold" style={{ color: theme.text.primary }}>
                {insight.totalImpact.goalDelay || '2 weeks'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Break Point Highlight */}
      {insight.breakPoint && (
        <div className="mb-6 p-4 rounded-lg border-2" style={{ borderColor: theme.accent.success, backgroundColor: theme.accent.success + '10' }}>
          <h4 className="text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>
            Break the Chain
          </h4>
          <p className="text-sm mb-3" style={{ color: theme.text.secondary }}>
            Preventing the trigger ({insight.breakPoint.metric}) would eliminate this entire cascade
          </p>
          <button
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: theme.accent.success }}
          >
            Set 2PM Caffeine Cutoff
          </button>
        </div>
      )}

      {/* Data Sources */}
      <div className="flex items-center gap-2 mb-6">
        {insight.sources?.map((source, idx) => (
          <span
            key={idx}
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: getCategoryColor(source) + '20',
              color: getCategoryColor(source)
            }}
          >
            {source}.csv
          </span>
        ))}
        <span className="text-xs" style={{ color: theme.text.tertiary }}>
          Pattern detected across {insight.sources?.length || 0} data sources
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onSeeEvidence}
          className="flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: theme.accent.purple }}
        >
          Create Prevention Plan
        </button>
        <button
          className="px-6 py-3 rounded-lg border font-medium transition-all hover:bg-gray-50"
          style={{ 
            borderColor: theme.border.primary,
            color: theme.text.primary
          }}
        >
          Track This Pattern
        </button>
        <button
          onClick={onSeeEvidence}
          className="px-6 py-3 rounded-lg border font-medium transition-all hover:bg-gray-50"
          style={{ 
            borderColor: theme.border.primary,
            color: theme.text.primary
          }}
        >
          See All {insight.frequency || 8} Occurrences
        </button>
      </div>
    </div>
  );
};

export default CascadeInsightCard;

