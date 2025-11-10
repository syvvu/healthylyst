// Health Score Explanation Modal
// Shows detailed breakdown of how the health score is calculated

import React from 'react';
import { X } from 'lucide-react';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155', tertiary: '#64748b' },
  accent: { primary: '#0ea5e9' }
};

const HealthScoreExplanationModal = ({ isOpen, onClose, healthScoreData }) => {
  if (!isOpen || !healthScoreData) return null;

  const { score, breakdown } = healthScoreData;
  
  // Calculate detailed breakdown using actual weights from breakdown
  const categories = [
    {
      name: 'Sleep',
      key: 'sleep',
      weight: breakdown.sleep?.weight || 0.25,
      score: breakdown.sleep?.score || 0
    },
    {
      name: 'Activity',
      key: 'activity',
      weight: breakdown.activity?.weight || 0.20,
      score: breakdown.activity?.score || 0
    },
    {
      name: 'Nutrition',
      key: 'nutrition',
      weight: breakdown.nutrition?.weight || 0.20,
      score: breakdown.nutrition?.score || 0
    },
    {
      name: 'Recovery',
      key: 'vitals',
      weight: breakdown.vitals?.weight || 0.20,
      score: breakdown.vitals?.score || 0
    },
    {
      name: 'Mental',
      key: 'wellness',
      weight: breakdown.wellness?.weight || 0.15,
      score: breakdown.wellness?.score || 0
    }
  ];

  // Calculate weighted points for each category using actual weights
  const detailedBreakdown = categories.map(cat => {
    const categoryScore = Math.round(cat.score * 100) / 100; // Keep one decimal
    const weightPercent = Math.round(cat.weight * 100); // Convert to percentage
    const weightedPoints = categoryScore * cat.weight; // Actual calculation
    return {
      ...cat,
      categoryScore,
      weightPercent,
      weightedPoints
    };
  });

  // Calculate total (should match the displayed score)
  const calculatedTotal = detailedBreakdown.reduce((sum, cat) => sum + cat.weightedPoints, 0);
  const roundedTotal = Math.round(calculatedTotal);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4 pb-20">
      <div 
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        style={{ borderColor: theme.border.primary, borderWidth: '1px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.primary }}>
          <h2 className="text-2xl font-bold" style={{ color: theme.text.primary }}>
            Health Score Calculation
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ color: theme.text.secondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#f0f9ff' }}>
            <p className="text-lg font-semibold mb-2" style={{ color: theme.text.primary }}>
              Your {score}/100 is calculated from:
            </p>
          </div>

          {/* Detailed Breakdown */}
          <div className="space-y-4">
            {detailedBreakdown.map((cat, idx) => (
              <div
                key={cat.key}
                className="p-4 rounded-lg border"
                style={{ borderColor: theme.border.primary, backgroundColor: '#fafafa' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold" style={{ color: theme.text.primary }}>
                    {cat.name}:
                  </span>
                </div>
                <div className="text-sm" style={{ color: theme.text.secondary }}>
                  {cat.categoryScore.toFixed(1)}% × {cat.weightPercent}% weight = {cat.weightedPoints.toFixed(1)} points
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="p-4 rounded-lg border-2" style={{ borderColor: theme.accent.primary, backgroundColor: '#eff6ff' }}>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold" style={{ color: theme.text.primary }}>
                Total:
              </span>
              <span className="text-lg font-bold" style={{ color: theme.accent.primary }}>
                {calculatedTotal.toFixed(1)} → rounded to {roundedTotal}
              </span>
            </div>
          </div>

          {/* Why This Matters */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#fef3c7' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>
              Why this matters:
            </p>
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              Shows the AI is doing real calculations, not random numbers. Each category is weighted based on its importance to overall health, and your score reflects your personal baselines and patterns.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t" style={{ borderColor: theme.border.primary }}>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-medium text-white transition-colors"
            style={{ backgroundColor: theme.accent.primary }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HealthScoreExplanationModal;

