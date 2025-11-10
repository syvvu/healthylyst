// Enhanced Dashboard Tab - Complete Visual Redesign
// Matches comprehensive visual specifications

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { Plus, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import TabNavigation, { PageHeader } from '../components/TabNavigation';
import HeroInsightCard from '../components/HeroInsightCard';
import HealthTimeline from '../components/HealthTimeline';
import TodaySummaryPanel from '../components/dashboard/TodaySummaryPanel';
import KeyMetricsGrid from '../components/dashboard/KeyMetricsGrid';
import ManualEntryModal from '../components/modals/ManualEntryModal';
import { getDataForDate, getAvailableDates } from '../utils/dataLoader';
import { calculateAllCorrelations } from '../utils/correlationAnalysis';
import { detectAllAnomalies } from '../utils/anomalyDetection';
import { generateTimelineNarrative } from '../utils/aiInsights';

const theme = {
  background: {
    primary: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #fef3c7 100%)',
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

const DashboardTab = ({ allHealthData, onOpenSettings }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date('2025-11-09'));
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [todayData, setTodayData] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [timelineNarrative, setTimelineNarrative] = useState('');

  useEffect(() => {
    if (allHealthData) {
      const dates = getAvailableDates(allHealthData);
      // Parse date string properly to avoid timezone issues
      // "2025-11-09" should be parsed as local date, not UTC
      let latestDate;
      if (dates.length > 0) {
        const dateStr = dates[dates.length - 1];
        const [year, month, day] = dateStr.split('-').map(Number);
        latestDate = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        latestDate = new Date();
      }
      setSelectedDate(latestDate);
      updateTodayData(latestDate);
      
      // Generate timeline narrative
      generateTimelineNarrative(allHealthData, format(latestDate, 'yyyy-MM-dd'))
        .then(narrative => setTimelineNarrative(narrative))
        .catch(error => {
          console.error('Error generating timeline narrative:', error);
          setTimelineNarrative('Tracking your health patterns over the last 48 hours. View the full timeline for detailed insights.');
        });
    }
  }, [allHealthData]);

  useEffect(() => {
    // Auto-refresh every 15 minutes
    const interval = setInterval(() => {
      handleRefresh();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const updateTodayData = (date) => {
    if (!allHealthData) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const data = getDataForDate(allHealthData, dateStr);
    setTodayData(data);

    // Check for anomalies
    try {
      const allAnomalies = detectAllAnomalies(allHealthData);
      const currentAnomalies = allAnomalies
        .filter(a => a.anomalies && a.anomalies.length > 0)
        .map(a => {
          const recent = a.anomalies[a.anomalies.length - 1];
          return {
            metric: a.metric,
            metricLabel: a.metricLabel || a.metric,
            value: recent.value,
            severity: recent.severity || 'medium',
            consecutiveDays: a.consecutiveDays || 1,
            baseline: a.mean,
            deviation: recent.deviation || (recent.value - (a.mean || 0)),
            zScore: recent.zScore,
            prediction: a.prediction,
            isActive: a.isActive,
            normalRange: {
              min: (a.mean || 0) - (a.stdDev || 0),
              max: (a.mean || 0) + (a.stdDev || 0)
            }
          };
        });
      setAnomalies(currentAnomalies);
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      setAnomalies([]);
    }
  };

  const handleRefresh = () => {
    setLastRefresh(new Date());
    if (allHealthData) {
      updateTodayData(selectedDate);
    }
  };

  const getTimeAgo = (date) => {
    const minutes = Math.floor((new Date() - date) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return format(date, 'MMM dd, h:mm a');
  };

  if (!allHealthData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.background.primary }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4" style={{ color: theme.text.secondary }}>Loading health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: theme.background.primary }}>
      <PageHeader 
        title="Dashboard" 
        onOpenSettings={onOpenSettings}
        allHealthData={allHealthData}
      />
      
      <div className="px-4 py-6 max-w-7xl mx-auto space-y-6">
        {/* Date Display */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-semibold" style={{ color: theme.text.primary }}>
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </div>
          <div className="text-sm" style={{ color: theme.text.tertiary }}>
            Last updated: {getTimeAgo(lastRefresh)}
          </div>
        </div>

        {/* 5 Data Sources Unified Banner */}
        {(() => {
          // Calculate total data points across all sources
          const totalDataPoints = [
            allHealthData?.sleep?.data?.length || 0,
            allHealthData?.activity?.data?.length || 0,
            allHealthData?.nutrition?.data?.length || 0,
            allHealthData?.vitals?.data?.length || 0,
            allHealthData?.wellness?.data?.length || 0
          ].reduce((sum, count) => sum + count, 0);

          // Count non-null metric values (excluding date field) for accurate data point count
          let actualDataPoints = 0;
          [allHealthData?.sleep, allHealthData?.activity, allHealthData?.nutrition, 
           allHealthData?.vitals, allHealthData?.wellness].forEach(source => {
            if (source?.data) {
              source.data.forEach(row => {
                Object.entries(row).forEach(([key, val]) => {
                  // Exclude date field and count only metric values
                  if (key !== 'date' && val !== null && val !== undefined && val !== '') {
                    actualDataPoints++;
                  }
                });
              });
            }
          });

          // Use actual data points if available, otherwise use row count
          const displayDataPoints = actualDataPoints > 0 ? actualDataPoints : totalDataPoints;

          return (
            <div 
              className="bg-white rounded-2xl shadow-lg p-6 mb-6 border-2"
              style={{ 
                borderColor: theme.border.primary,
                background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)'
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">📊</span>
                <h2 className="text-xl font-bold" style={{ color: theme.text.primary }}>
                  5 Data Sources Unified & Analyzed
                </h2>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-4">
                <span 
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ 
                    backgroundColor: '#e0f2fe',
                    color: theme.text.primary,
                    border: `1px solid ${theme.border.primary}`
                  }}
                >
                  sleep.csv
                </span>
                <span 
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ 
                    backgroundColor: '#e0f2fe',
                    color: theme.text.primary,
                    border: `1px solid ${theme.border.primary}`
                  }}
                >
                  activity.csv
                </span>
                <span 
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ 
                    backgroundColor: '#e0f2fe',
                    color: theme.text.primary,
                    border: `1px solid ${theme.border.primary}`
                  }}
                >
                  nutrition.csv
                </span>
                <span 
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ 
                    backgroundColor: '#e0f2fe',
                    color: theme.text.primary,
                    border: `1px solid ${theme.border.primary}`
                  }}
                >
                  vitals.csv
                </span>
                <span 
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ 
                    backgroundColor: '#e0f2fe',
                    color: theme.text.primary,
                    border: `1px solid ${theme.border.primary}`
                  }}
                >
                  wellness.csv
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm" style={{ color: theme.text.secondary }}>
                <span className="font-semibold">{displayDataPoints.toLocaleString()} data points</span>
                <span>•</span>
                <span>Last sync: {getTimeAgo(lastRefresh)}</span>
              </div>
            </div>
          );
        })()}

        {/* Section 1: Hero Insight Card (30% of screen height) */}
        <div style={{ minHeight: '30vh' }}>
          <HeroInsightCard 
            allHealthData={allHealthData} 
            selectedDate={selectedDate}
          />
        </div>

        {/* Section 2 & 3: Middle Row - Timeline (50%) and Summary (30%) */}
        <div className="grid md:grid-cols-5 gap-6">
          {/* Middle-Left: Health Timeline (50% width = 3/5 columns) */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg p-6 h-full" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
              <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: theme.border.primary }}>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: theme.text.primary }}>
                    Your Health Story - Last 48 Hours
                  </h2>
                  <div className="text-xs mt-1" style={{ color: theme.text.tertiary }}>
                    {format(subDays(selectedDate, 1), 'MMM d')} - {format(selectedDate, 'MMM d, yyyy')}
                  </div>
                </div>
                <span className="text-xs" style={{ color: theme.text.tertiary }}>
                  Updated {getTimeAgo(lastRefresh)}
                </span>
              </div>
              <HealthTimeline 
                allHealthData={allHealthData}
                selectedDate={selectedDate}
              />
              <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border.primary }}>
                <div className="text-sm mb-2 leading-relaxed space-y-3" style={{ color: theme.text.secondary }}>
                  {timelineNarrative ? (
                    timelineNarrative.split('\n\n').map((paragraph, idx) => {
                      const trimmed = paragraph.trim();
                      // Check if this is the first paragraph and starts with "Summary:"
                      if (idx === 0 && trimmed.startsWith('Summary:')) {
                        const afterSummary = trimmed.substring(8).trim();
                        return (
                          <div key={idx}>
                            <span className="font-semibold text-base" style={{ color: theme.text.primary }}>
                              Summary:
                            </span>
                            {afterSummary && (
                              <span className="ml-2">{afterSummary}</span>
                            )}
                          </div>
                        );
                      }
                      return (
                        <p key={idx} className="mb-2 last:mb-0">
                          {trimmed}
                        </p>
                      );
                    })
                  ) : (
                    <p>Analyzing your health patterns...</p>
                  )}
                </div>
                <button
                  onClick={() => navigate('/timeline')}
                  className="text-sm font-medium transition-all hover:underline"
                  style={{ color: theme.accent.purple }}
                >
                  View Full Timeline →
                </button>
              </div>
            </div>
          </div>

          {/* Middle-Right: Today's Summary Panel (30% width = 2/5 columns) */}
          <div className="md:col-span-2">
            <TodaySummaryPanel 
              todayData={todayData}
              anomalies={anomalies}
              lastRefresh={lastRefresh}
              onAddEntry={() => setShowManualEntry(true)}
              onSync={handleRefresh}
              allHealthData={allHealthData}
              selectedDate={selectedDate}
            />
          </div>
        </div>

        {/* Section 4: Key Metrics Grid (Full width, 6 cards) */}
        <KeyMetricsGrid 
          allHealthData={allHealthData}
          selectedDate={selectedDate}
          onMetricClick={(metric) => {
            // Use metricField if available, otherwise use name
            const metricName = metric.metricField || metric.name;
            navigate(`/metrics?category=${metric.category}&metric=${metricName}`);
          }}
        />
      </div>

      {/* Modals */}
      <ManualEntryModal
        isOpen={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onSave={(entry) => {
          setShowManualEntry(false);
        }}
      />
    </div>
  );
};

export default DashboardTab;
