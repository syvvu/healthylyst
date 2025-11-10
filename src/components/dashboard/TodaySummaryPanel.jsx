// Today's Summary Panel Component
// Shows circular progress, quick stats, and active alerts

import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp, Info } from 'lucide-react';
import { format } from 'date-fns';
import { calculateHealthScore, generateAIRecommendations, calculateTrend, getBestDays } from '../../utils/healthScore';
import HealthScoreExplanationModal from '../modals/HealthScoreExplanationModal';

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

const TodaySummaryPanel = ({ todayData, anomalies, lastRefresh, onAddEntry, onSync, allHealthData, selectedDate }) => {
  const navigate = useNavigate();
  
  // Calculate comprehensive health score
  const healthScoreData = useMemo(() => {
    if (!allHealthData || !selectedDate) return null;
    return calculateHealthScore(allHealthData, selectedDate);
  }, [allHealthData, selectedDate]);

  const wellnessScore = healthScoreData?.score || 0;
  const breakdown = healthScoreData?.breakdown || {};
  const hasAnomalies = anomalies && anomalies.length > 0;
  
  // Calculate recommendations for target score (dynamic based on current score)
  // If score is below 85, target is 85. If above 85, target is next milestone (90, 95, or 100)
  const getTargetScore = (currentScore) => {
    if (currentScore < 85) return 85;
    if (currentScore < 90) return 90;
    if (currentScore < 95) return 95;
    return 100;
  };
  
  const targetScore = getTargetScore(wellnessScore);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [showScoreExplanation, setShowScoreExplanation] = useState(false);
  
  useEffect(() => {
    if (!healthScoreData || !todayData || !allHealthData || wellnessScore >= targetScore) {
      setRecommendations([]);
      return;
    }
    
    setRecommendationsLoading(true);
    generateAIRecommendations(wellnessScore, targetScore, breakdown, todayData, allHealthData)
      .then(recs => {
        setRecommendations(recs || []);
        setRecommendationsLoading(false);
      })
      .catch(error => {
        console.error('Error loading recommendations:', error);
        setRecommendations([]);
        setRecommendationsLoading(false);
      });
  }, [healthScoreData, wellnessScore, targetScore, breakdown, todayData, allHealthData]);
  
  // Calculate 7-day trend
  const trend = useMemo(() => {
    if (!allHealthData || !selectedDate) return { percent: 0, direction: 'stable', message: '' };
    return calculateTrend(allHealthData, selectedDate);
  }, [allHealthData, selectedDate]);
  
  // Get best days comparison
  const bestDays = useMemo(() => {
    if (!allHealthData) return { bestScore: 0, bestDate: null, percentage: 0 };
    return getBestDays(allHealthData, wellnessScore);
  }, [allHealthData, wellnessScore]);

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Great Day';
    if (score >= 60) return 'Good Day';
    if (score >= 40) return 'Fair Day';
    return 'Needs Attention';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return theme.accent.success;
    if (score >= 60) return theme.accent.primary;
    if (score >= 40) return theme.accent.warning;
    return theme.accent.danger;
  };

  // Get category scores from breakdown
  const sleepScore = Math.round(breakdown.sleep?.score || 0);
  const activityScore = Math.round(breakdown.activity?.score || 0);
  const nutritionScore = Math.round(breakdown.nutrition?.score || 0);
  const recoveryScore = Math.round(breakdown.vitals?.score || 0);
  const mentalScore = Math.round(breakdown.wellness?.score || 0);
  
  // Get actual values for display
  const sleepDuration = todayData?.sleep?.sleep_duration_hours || 0;
  const steps = todayData?.activity?.steps || 0;
  const hrv = todayData?.vitals?.hrv_ms || todayData?.sleep?.hrv_ms || 0;
  const stressLevel = todayData?.wellness?.stress_level || 0;

  const getTimeAgo = (date) => {
    const minutes = Math.floor((new Date() - date) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    return format(date, 'h:mm a');
  };

  const getCategoryIcon = (category) => {
    if (category >= 80) return ':)';
    if (category >= 60) return ':|';
    if (category >= 40) return ':(';
    return '😔';
  };

  const getCategoryStatus = (score) => {
    if (score >= 80) return 'optimal';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'low';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 h-full flex flex-col overflow-y-auto" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-1" style={{ color: theme.text.primary }}>
          Today's Health Intelligence
        </h3>
        {selectedDate && (
          <div className="text-xs" style={{ color: theme.text.tertiary }}>
            {format(selectedDate, 'MMMM d, yyyy')}
          </div>
        )}
      </div>
      
      {/* Circular Progress Indicator */}
      <div className="relative w-40 h-40 mx-auto mb-6">
        {/* Info icon - positioned outside donut */}
        <button
          onClick={() => setShowScoreExplanation(true)}
          className="absolute top-0 right-0 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
          style={{ color: theme.text.tertiary }}
          title="How is this score calculated?"
        >
          <Info className="w-4 h-4" />
        </button>
        <svg className="transform -rotate-90 w-full h-full">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r="72"
            fill="none"
            stroke="#e0f2fe"
            strokeWidth="12"
          />
          {/* Progress circle */}
          <circle
            cx="80"
            cy="80"
            r="72"
            fill="none"
            stroke={getScoreColor(wellnessScore)}
            strokeWidth="12"
            strokeDasharray={`${(wellnessScore / 100) * 452.39} 452.39`}
            strokeLinecap="round"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color: getScoreColor(wellnessScore) }}>
            {wellnessScore}/100
          </span>
          <span className="text-xs font-medium" style={{ color: theme.text.tertiary }}>
            {getScoreLabel(wellnessScore)}
          </span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#F8FAFC' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: theme.text.primary }}>Sleep:</span>
            <span className="text-sm font-bold" style={{ color: getScoreColor(sleepScore) }}>{sleepScore}%</span>
            <span>{getCategoryIcon(sleepScore)}</span>
          </div>
          <span className="text-xs" style={{ color: theme.text.secondary }}>
            {sleepDuration.toFixed(1)} hrs - {getCategoryStatus(sleepScore)}
          </span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#F8FAFC' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: theme.text.primary }}>Activity:</span>
            <span className="text-sm font-bold" style={{ color: getScoreColor(activityScore) }}>{activityScore}%</span>
            <span>{getCategoryIcon(activityScore)}</span>
          </div>
          <span className="text-xs" style={{ color: theme.text.secondary }}>
            {(steps / 1000).toFixed(1)}k steps - {getCategoryStatus(activityScore)}
          </span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#F8FAFC' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: theme.text.primary }}>Nutrition:</span>
            <span className="text-sm font-bold" style={{ color: getScoreColor(nutritionScore) }}>{nutritionScore}%</span>
            <span>{getCategoryIcon(nutritionScore)}</span>
          </div>
          <span className="text-xs" style={{ color: theme.text.secondary }}>
            balanced intake
          </span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#F8FAFC' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: theme.text.primary }}>Recovery:</span>
            <span className="text-sm font-bold" style={{ color: getScoreColor(recoveryScore) }}>{recoveryScore}%</span>
            <span>{getCategoryIcon(recoveryScore)}</span>
          </div>
          <span className="text-xs" style={{ color: theme.text.secondary }}>
            HRV {hrv > 0 ? 'normal' : 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#F8FAFC' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: theme.text.primary }}>Mental:</span>
            <span className="text-sm font-bold" style={{ color: getScoreColor(mentalScore) }}>{mentalScore}%</span>
            <span>{getCategoryIcon(mentalScore)}</span>
          </div>
          <span className="text-xs" style={{ color: theme.text.secondary }}>
            stress {stressLevel > 0 ? 'controlled' : 'N/A'}
          </span>
        </div>
      </div>

      {/* Tips for Today */}
      {wellnessScore < 100 && (
        <div className="mb-4 p-4 rounded-lg border-2" style={{ borderColor: theme.accent.primary, backgroundColor: '#EFF6FF' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💡</span>
            <h4 className="font-semibold text-sm" style={{ color: theme.text.primary }}>
              Tips for Today
            </h4>
          </div>
          {recommendationsLoading ? (
            <div className="text-xs" style={{ color: theme.text.tertiary }}>
              Generating personalized tips...
            </div>
          ) : recommendations.length > 0 ? (
            <ul className="space-y-2.5">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2.5" style={{ color: theme.text.secondary }}>
                  <span className="mt-0.5" style={{ color: theme.accent.primary }}>•</span>
                  <div className="flex-1">
                    <span className="font-medium" style={{ color: theme.text.primary }}>{rec.action}</span>
                    {rec.detail && (
                      <span className="block text-xs mt-0.5" style={{ color: theme.text.tertiary }}>
                        {rec.detail}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm" style={{ color: theme.text.secondary }}>
              Focus on improving your lowest scoring categories above to reach your health goals.
            </div>
          )}
        </div>
      )}

      {/* Bottom Section - Active Alerts */}
      <div className="mb-6">
        {hasAnomalies ? (
          <div 
            className="p-5 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer"
            style={{ 
              borderColor: '#fbbf24', 
              backgroundColor: '#fef3c7',
              borderWidth: '2px'
            }}
            onClick={() => navigate('/insights?tab=anomalies')}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5" style={{ color: '#d97706' }} />
              <h4 className="font-semibold text-base" style={{ color: theme.text.primary }}>
                Health Patterns Detected
              </h4>
            </div>
            
            {/* Anomaly Details */}
            <div className="mb-4 space-y-2">
              <div className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                {anomalies[0].metricLabel}: {anomalies[0].value}
                {anomalies[0].metricLabel?.includes('Heart Rate') && ' bpm'}
              </div>
              {anomalies[0].baseline && (
                <div className="text-xs" style={{ color: theme.text.secondary }}>
                  (Elevated {Math.abs(anomalies[0].value - anomalies[0].baseline).toFixed(0)} above your baseline)
                </div>
              )}
              
              <div className="flex items-center gap-2 text-xs mt-2" style={{ color: theme.text.secondary }}>
                <span>⏰</span>
                <span>Duration: {anomalies[0].consecutiveDays || 1} consecutive day{anomalies[0].consecutiveDays > 1 ? 's' : ''}</span>
              </div>
            </div>
            
            {/* Prediction Section */}
            {anomalies[0].prediction && (
              <div className="mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🔮</span>
                  <span className="text-xs font-semibold" style={{ color: theme.text.primary }}>
                    Prediction:
                  </span>
                </div>
                <p className="text-xs mb-2" style={{ color: theme.text.secondary }}>
                  Based on your historical patterns, this elevated {anomalies[0].metricLabel?.toLowerCase()} preceded illness on {anomalies[0].prediction.previousOccurrences || 2} previous occasions:
                </p>
                {anomalies[0].prediction.examples && anomalies[0].prediction.examples.length > 0 && (
                  <ul className="text-xs space-y-1 mb-2" style={{ color: theme.text.secondary }}>
                    {anomalies[0].prediction.examples.map((ex, idx) => (
                      <li key={idx}>• {ex}</li>
                    ))}
                  </ul>
                )}
                <div className="text-xs font-semibold mt-2" style={{ color: '#92400e' }}>
                  📊 Likelihood: {anomalies[0].prediction.likelihood || 80}% chance of illness in next 2 days
                </div>
              </div>
            )}
            
            {/* Action Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate('/insights?tab=anomalies');
              }}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: '#d97706',
                color: '#ffffff'
              }}
            >
              View Anomalies Analysis
              <span>→</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-lg border-2" style={{ borderColor: theme.accent.success, backgroundColor: theme.accent.success + '10' }}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: theme.accent.success }} />
              <h4 className="font-semibold text-sm" style={{ color: theme.text.primary }}>
                All Systems Normal
              </h4>
            </div>
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              No anomalies detected
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-auto space-y-2">
        <button
          onClick={onSync}
          className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-gray-50 flex items-center justify-center gap-2"
          style={{ color: theme.text.secondary }}
        >
          <RefreshCw className="w-4 h-4" />
          Sync Data
        </button>
        <p className="text-xs text-center" style={{ color: theme.text.tertiary }}>
          Last synced: {getTimeAgo(lastRefresh)}
        </p>
      </div>

      {/* Health Score Explanation Modal */}
      <HealthScoreExplanationModal
        isOpen={showScoreExplanation}
        onClose={() => setShowScoreExplanation(false)}
        healthScoreData={healthScoreData}
      />
    </div>
  );
};

export default TodaySummaryPanel;

