// Correlation Explanation Modal
// Shows AI-generated explanation for a correlation

import React, { useState, useEffect } from 'react';
import { X, Sparkles, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { generateCorrelationInsight } from '../../utils/aiInsights';
import { formatMetricLabel } from '../../utils/dataLoader';

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

const CorrelationExplanationModal = ({ isOpen, onClose, correlation, allHealthData }) => {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && correlation && allHealthData) {
      setLoading(true);
      setError(null);
      setExplanation('');
      
      generateCorrelationInsight(correlation, allHealthData)
        .then(expl => {
          // Remove quotation marks that might wrap the response
          let cleanedExpl = expl.trim();
          if ((cleanedExpl.startsWith('"') && cleanedExpl.endsWith('"')) || 
              (cleanedExpl.startsWith("'") && cleanedExpl.endsWith("'"))) {
            cleanedExpl = cleanedExpl.slice(1, -1).trim();
          }
          setExplanation(cleanedExpl);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error generating explanation:', err);
          setError('Failed to generate explanation. Please try again.');
          setLoading(false);
        });
    }
  }, [isOpen, correlation, allHealthData]);

  if (!isOpen || !correlation) return null;

  const metric1Label = correlation.metric1Label || formatMetricLabel(correlation.metric1);
  const metric2Label = correlation.metric2Label || formatMetricLabel(correlation.metric2);
  const correlationPercent = (Math.abs(correlation.correlation) * 100).toFixed(0);
  const isPositive = correlation.direction === 'positive';
  const isTimeLagged = correlation.lag > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20"
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
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: theme.accent.purple + '20' }}>
              <Sparkles className="w-5 h-5" style={{ color: theme.accent.purple }} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: theme.text.primary }}>
                AI Correlation Explanation
              </h2>
              <p className="text-sm" style={{ color: theme.text.secondary }}>
                Understanding the relationship
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: theme.text.secondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Correlation Info */}
          <div className="mb-6 p-4 rounded-lg border" style={{ borderColor: theme.border.primary, backgroundColor: '#f8fafc' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold" style={{ color: theme.text.primary }}>
                    {metric1Label}
                  </span>
                  <span style={{ color: theme.text.tertiary }}>→</span>
                  <span className="font-semibold" style={{ color: theme.text.primary }}>
                    {metric2Label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span style={{ color: theme.text.secondary }}>
                      {isPositive ? 'Positive' : 'Negative'} correlation
                    </span>
                  </div>
                  {isTimeLagged && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" style={{ color: theme.text.tertiary }} />
                      <span style={{ color: theme.text.secondary }}>
                        {correlation.lag} day{correlation.lag > 1 ? 's' : ''} lag
                      </span>
                    </div>
                  )}
                  <span className="px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: isPositive ? '#d1fae5' : '#fee2e2',
                          color: isPositive ? '#065f46' : '#991b1b'
                        }}>
                    {correlationPercent}% strength
                  </span>
                </div>
              </div>
            </div>
            {correlation.metric1Category && correlation.metric2Category && (
              <div className="text-xs mt-2" style={{ color: theme.text.tertiary }}>
                {correlation.metric1Category.charAt(0).toUpperCase() + correlation.metric1Category.slice(1)} → {correlation.metric2Category.charAt(0).toUpperCase() + correlation.metric2Category.slice(1)}
              </div>
            )}
          </div>

          {/* Data Quality Notice */}
          {correlation.dataPoints && correlation.dataPoints < 30 && (
            <div className="mb-4 p-3 rounded-lg border" style={{ borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}>
              <p className="text-xs leading-relaxed" style={{ color: '#78350f' }}>
                <strong>Note:</strong> This correlation is based on {correlation.dataPoints} data points, which is a small sample size. 
                With real-world health data, correlations above 90% are rare and may indicate synthetic data patterns. 
                Real health correlations typically range from 30-70%.
              </p>
            </div>
          )}

          {/* AI Explanation */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text.primary }}>
              <Sparkles className="w-5 h-5" style={{ color: theme.accent.purple }} />
              AI Explanation
            </h3>
            
            {loading && (
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  <span className="text-sm ml-2" style={{ color: theme.text.secondary }}>
                    Generating explanation...
                  </span>
                </div>
              </div>
            )}
            
            {error && (
              <div className="p-4 rounded-lg border" style={{ borderColor: theme.accent.danger, backgroundColor: '#fef2f2' }}>
                <p className="text-sm" style={{ color: theme.accent.danger }}>
                  {error}
                </p>
              </div>
            )}
            
            {explanation && !loading && !error && (
              <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary, backgroundColor: '#f0f9ff' }}>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: theme.text.secondary }}>
                  {explanation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: theme.border.primary }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium transition-all"
            style={{ 
              backgroundColor: theme.accent.primary,
              color: 'white'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CorrelationExplanationModal;

