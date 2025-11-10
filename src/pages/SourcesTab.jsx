// Sources Tab - Data source connections and data quality
import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, X, Plus, Moon, Activity, UtensilsCrossed, Heart, Wind, Link2 } from 'lucide-react';
import TabNavigation, { PageHeader } from '../components/TabNavigation';
import ConnectionModal from '../components/modals/ConnectionModal';
import DisconnectModal from '../components/modals/DisconnectModal';
import ManualEntryModal from '../components/modals/ManualEntryModal';
import { getSyncStatus, mockOAuthFlow, disconnectDataSource, markSynced, DataSourceStatus } from '../utils/dataSyncStatus';
import { getAvailableDates, getDataForDate } from '../utils/dataLoader';
import { format, differenceInMinutes } from 'date-fns';

const theme = {
  background: {
    primary: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #fef3c7 100%)',
    card: '#ffffff'
  },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155', tertiary: '#64748b' },
  accent: { primary: '#0ea5e9', danger: '#f43f5e' }
};

const SourcesTab = ({ allHealthData, onOpenSettings }) => {
  const [syncStatus, setSyncStatus] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [dataQuality, setDataQuality] = useState(null);
  const [missingDates, setMissingDates] = useState({});

  useEffect(() => {
    const status = getSyncStatus();
    setSyncStatus(status);
    calculateDataQuality();
  }, [allHealthData]);

  // Map source ID (with hyphens) to sync status key (with underscores)
  const getSyncStatusKey = (sourceId) => {
    return sourceId.replace(/-/g, '_');
  };

  // Get sync status for a source
  const getSourceSyncStatus = (sourceId) => {
    if (!syncStatus) return null;
    const statusKey = getSyncStatusKey(sourceId);
    return syncStatus[statusKey];
  };

  const calculateDataQuality = () => {
    if (!allHealthData) return;

    const dates = getAvailableDates(allHealthData);
    const totalDays = 30; // Expected days
    const completeness = (dates.length / totalDays) * 100;

    // Calculate expected date range (last 30 days)
    const today = new Date();
    const expectedDates = [];
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      expectedDates.push(format(date, 'yyyy-MM-dd'));
    }

    // Find missing dates for each category
    const categoryMissingDates = {};
    const categories = {
      sleep: { count: 0, missing: [] },
      activity: { count: 0, missing: [] },
      nutrition: { count: 0, missing: [] },
      vitals: { count: 0, missing: [] },
      wellness: { count: 0, missing: [] }
    };

    expectedDates.forEach(dateStr => {
      const dayData = getDataForDate(allHealthData, dateStr);
      
      if (!dayData.sleep) categories.sleep.missing.push(dateStr);
      else categories.sleep.count++;
      
      if (!dayData.activity) categories.activity.missing.push(dateStr);
      else categories.activity.count++;
      
      if (!dayData.nutrition) categories.nutrition.missing.push(dateStr);
      else categories.nutrition.count++;
      
      if (!dayData.vitals) categories.vitals.missing.push(dateStr);
      else categories.vitals.count++;
      
      if (!dayData.wellness) categories.wellness.missing.push(dateStr);
      else categories.wellness.count++;
    });

    Object.keys(categories).forEach(cat => {
      categoryMissingDates[cat] = categories[cat].missing.slice(0, 5); // Show first 5 missing dates
    });

    setMissingDates(categoryMissingDates);

    setDataQuality({
      completeness: completeness,
      categories: {
        sleep: categories.sleep.count,
        activity: categories.activity.count,
        nutrition: categories.nutrition.count,
        vitals: categories.vitals.count,
        wellness: categories.wellness.count
      },
      totalDays: dates.length,
      expectedDays: totalDays
    });
  };

  const formatSyncStatus = (lastSync) => {
    if (!lastSync) return 'Never synced';
    const syncDate = new Date(lastSync);
    const now = new Date();
    const diffMins = differenceInMinutes(now, syncDate);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `Synced ${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Synced ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `Synced ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      sleep: Moon,
      activity: Activity,
      nutrition: UtensilsCrossed,
      vitals: Heart,
      wellness: Wind
    };
    return icons[category] || Link2;
  };

  const handleSyncNow = async (sourceId) => {
    // Simulate sync
    const statusKey = getSyncStatusKey(sourceId);
    markSynced(statusKey);
    handleRefresh();
  };

  const handleConnect = async (source) => {
    setSelectedSource(source);
    setShowConnectionModal(true);
  };

  const handleDisconnect = (source) => {
    setSelectedSource(source);
    setShowDisconnectModal(true);
  };

  const confirmDisconnect = () => {
    if (selectedSource) {
      const statusKey = getSyncStatusKey(selectedSource.id);
      disconnectDataSource(statusKey);
      handleRefresh();
    }
    setShowDisconnectModal(false);
    setSelectedSource(null);
  };

  const handleRefresh = () => {
    const status = getSyncStatus();
    setSyncStatus(status);
    calculateDataQuality();
  };

  // Base data source definitions
  const baseDataSources = [
    {
      id: 'apple-health',
      name: 'Apple Health',
      icon: Activity,
      category: 'wearables',
      dataCategories: ['sleep', 'activity', 'vitals'],
      description: 'Sync health data from Apple Health app'
    },
    {
      id: 'fitbit',
      name: 'Fitbit',
      icon: Activity,
      category: 'wearables',
      dataCategories: ['sleep', 'activity', 'vitals'],
      description: 'Sync activity, sleep, and heart rate data'
    },
    {
      id: 'myfitnesspal',
      name: 'MyFitnessPal',
      icon: UtensilsCrossed,
      category: 'apps',
      dataCategories: ['nutrition'],
      description: 'Import nutrition and meal data'
    }
  ];

  // Compute data sources with sync status
  const dataSources = baseDataSources.map(source => {
    const sourceStatus = getSourceSyncStatus(source.id);
    return {
      ...source,
      connected: sourceStatus?.status === DataSourceStatus.SYNCED || sourceStatus?.status === DataSourceStatus.CONNECTED,
      lastSync: sourceStatus?.lastSync,
      status: sourceStatus?.status || DataSourceStatus.DISCONNECTED
    };
  });

  const availableIntegrations = [
    { id: 'garmin', name: 'Garmin', category: 'wearables', description: 'Sync activity and sleep data from Garmin devices', icon: Activity, dataCategories: ['sleep', 'activity'] },
    { id: 'strava', name: 'Strava', category: 'apps', description: 'Import workout and activity data', icon: Activity, dataCategories: ['activity'] },
    { id: 'whoop', name: 'Whoop', category: 'devices', description: 'HRV, recovery, and strain metrics', icon: Heart, dataCategories: ['vitals', 'activity'] },
    { id: 'oura-ring', name: 'Oura Ring', category: 'devices', description: 'Sleep, readiness, and activity tracking', icon: Moon, dataCategories: ['sleep', 'vitals'] },
    { id: 'google-fit', name: 'Google Fit', category: 'apps', description: 'Sync health and fitness data', icon: Activity, dataCategories: ['activity', 'vitals'] },
    { id: 'cronometer', name: 'Cronometer', category: 'apps', description: 'Nutrition and supplement tracking', icon: UtensilsCrossed, dataCategories: ['nutrition'] }
  ];

  // Check if any available integrations are connected
  const connectedIntegrations = availableIntegrations.map(integration => {
    const sourceStatus = getSourceSyncStatus(integration.id);
    return {
      ...integration,
      connected: sourceStatus?.status === DataSourceStatus.SYNCED || sourceStatus?.status === DataSourceStatus.CONNECTED,
      lastSync: sourceStatus?.lastSync,
      status: sourceStatus?.status || DataSourceStatus.DISCONNECTED
    };
  }).filter(s => s.connected);

  const connectedSources = [...dataSources.filter(s => s.connected), ...connectedIntegrations];
  const availableSources = [
    ...dataSources.filter(s => !s.connected),
    ...availableIntegrations.filter(integration => {
      const sourceStatus = getSourceSyncStatus(integration.id);
      const isConnected = sourceStatus?.status === DataSourceStatus.SYNCED || sourceStatus?.status === DataSourceStatus.CONNECTED;
      return !isConnected;
    })
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: theme.background.primary }}>
      <PageHeader 
        title="Sources" 
        onOpenSettings={onOpenSettings}
        rightAction={
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border"
            style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden md:inline">Refresh</span>
          </button>
        }
      />
      
      <div className="px-4 py-6 space-y-6 max-w-7xl mx-auto">
        {/* Connected Sources */}
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: theme.text.primary }}>
            Connected Sources
          </h2>
          
          {connectedSources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedSources.map(source => {
                const Icon = source.icon;
                const isSynced = source.status === DataSourceStatus.SYNCED;
                const isError = source.status === DataSourceStatus.ERROR;
                
                return (
                  <div
                    key={source.id}
                    className="border rounded-xl p-4 hover:shadow-lg transition-all"
                    style={{ borderColor: theme.border.primary }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: theme.accent.primary + '20' }}>
                          <Icon className="w-6 h-6" style={{ color: theme.accent.primary }} />
                        </div>
                        <div>
                          <h3 className="font-bold" style={{ color: theme.text.primary }}>
                            {source.name}
                          </h3>
                          <p className="text-xs" style={{ color: theme.text.tertiary }}>
                            {isSynced ? formatSyncStatus(source.lastSync) : isError ? 'Sync Failed' : 'Syncing...'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Data Categories Icons */}
                    <div className="flex gap-2 mb-4">
                      {source.dataCategories.map((cat) => {
                        const CatIcon = getCategoryIcon(cat);
                        return (
                          <div
                            key={cat}
                            className="p-1.5 rounded"
                            style={{ backgroundColor: '#f0f9ff' }}
                            title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                          >
                            <CatIcon className="w-4 h-4" style={{ color: theme.accent.primary }} />
                          </div>
                        );
                      })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSyncNow(source.id)}
                        className="flex-1 px-3 py-2 rounded-lg border text-sm font-medium"
                        style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
                      >
                        Sync Now
                      </button>
                      <button
                        onClick={() => handleDisconnect(source)}
                        className="flex-1 px-3 py-2 rounded-lg border text-sm font-medium"
                        style={{ borderColor: theme.accent.danger, color: theme.accent.danger }}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: theme.text.secondary }}>
              No connected sources. Connect a source to start syncing data.
            </p>
          )}
        </div>

        {/* Available Integrations */}
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: theme.text.primary }}>
            Available Integrations
          </h2>
          
          <div className="flex gap-2 mb-4">
            {['all', 'wearables', 'apps', 'devices'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  selectedCategory === cat ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: selectedCategory === cat ? theme.accent.primary : 'transparent',
                  color: selectedCategory === cat ? 'white' : theme.text.secondary
                }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableSources
              .filter(s => selectedCategory === 'all' || s.category === selectedCategory)
              .map(source => {
                const Icon = source.icon || Activity;
                return (
                  <div
                    key={source.id}
                    className="border rounded-xl p-4 hover:shadow-lg transition-all"
                    style={{ borderColor: theme.border.primary }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: theme.accent.primary + '20' }}>
                        <Icon className="w-6 h-6" style={{ color: theme.accent.primary }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1" style={{ color: theme.text.primary }}>
                          {source.name}
                        </h3>
                        <p className="text-xs mb-2" style={{ color: theme.text.tertiary }}>
                          {source.category.charAt(0).toUpperCase() + source.category.slice(1)}
                        </p>
                        <p className="text-sm" style={{ color: theme.text.secondary }}>
                          {source.description || 'Sync health data'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleConnect(source)}
                      className="w-full px-4 py-2 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: theme.accent.primary, color: 'white' }}
                    >
                      Connect
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Data Quality Dashboard */}
        {dataQuality && (
          <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: theme.text.primary }}>
              Data Quality Dashboard
            </h2>
            
            <div className="space-y-4">
              {Object.entries(dataQuality.categories).map(([category, count]) => {
                const completeness = (count / dataQuality.expectedDays) * 100;
                const hasGaps = completeness < 100;
                const CategoryIcon = getCategoryIcon(category);
                const missingCount = dataQuality.expectedDays - count;
                
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="w-4 h-4" style={{ color: theme.accent.primary }} />
                        <span className="font-medium" style={{ color: theme.text.primary }}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </span>
                        {hasGaps && (
                          <AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }} />
                        )}
                        {!hasGaps && (
                          <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
                        )}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: theme.text.primary }}>
                        {completeness.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${completeness}%`,
                          backgroundColor: hasGaps ? '#f59e0b' : '#10b981'
                        }}
                      />
                    </div>
                    {hasGaps && missingCount > 0 && (
                      <div className="text-xs" style={{ color: theme.text.secondary }}>
                        <p className="mb-1">
                          Missing data for: {missingCount} day{missingCount > 1 ? 's' : ''}
                        </p>
                        {missingDates[category] && missingDates[category].length > 0 && (
                          <p className="text-xs" style={{ color: theme.text.tertiary }}>
                            {missingDates[category].map(d => format(new Date(d), 'MMM dd')).join(', ')}
                            {missingCount > 5 && '...'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {dataQuality.completeness < 100 && (
              <button
                onClick={() => setShowManualEntry(true)}
                className="mt-4 w-full px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: theme.accent.primary, color: 'white' }}
              >
                <Plus className="w-4 h-4" />
                Fill Gaps
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showConnectionModal && (
        <ConnectionModal
          isOpen={showConnectionModal}
          onClose={() => {
            setShowConnectionModal(false);
            setSelectedSource(null);
          }}
          source={selectedSource}
          onConnect={async () => {
            if (selectedSource) {
              const statusKey = getSyncStatusKey(selectedSource.id);
              await mockOAuthFlow(statusKey);
              // Force immediate state update after connection
              const updatedStatus = getSyncStatus();
              setSyncStatus(updatedStatus);
              calculateDataQuality();
            }
            setShowConnectionModal(false);
            setSelectedSource(null);
          }}
        />
      )}

      {showDisconnectModal && (
        <DisconnectModal
          isOpen={showDisconnectModal}
          onClose={() => {
            setShowDisconnectModal(false);
            setSelectedSource(null);
          }}
          source={selectedSource}
          onConfirm={confirmDisconnect}
        />
      )}

      {showManualEntry && (
        <ManualEntryModal
          isOpen={showManualEntry}
          onClose={() => setShowManualEntry(false)}
          onSave={(entry) => {
            setShowManualEntry(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
};

export default SourcesTab;

