// Data Sync Status Management
// Track sync status and processing time for connected data sources

const SYNC_STATUS_KEY = 'vitality_lens_sync_status';

export const DataSourceStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  ERROR: 'error'
};

export const getSyncStatus = () => {
  try {
    const status = localStorage.getItem(SYNC_STATUS_KEY);
    return status ? JSON.parse(status) : getDefaultSyncStatus();
  } catch (error) {
    console.error('Error reading sync status:', error);
    return getDefaultSyncStatus();
  }
};

export const getDefaultSyncStatus = () => {
  // Set a recent sync date (1 hour ago) for default connected sources
  const recentSyncDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const connectionDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
  
  return {
    apple_health: {
      status: DataSourceStatus.SYNCED,
      lastSync: recentSyncDate,
      dataCategories: ['activity', 'sleep', 'vitals'],
      connectionDate: connectionDate,
      syncProgress: 100,
      estimatedTimeRemaining: null
    },
    google_fit: {
      status: DataSourceStatus.SYNCED,
      lastSync: recentSyncDate,
      dataCategories: ['activity', 'heart_rate'],
      connectionDate: connectionDate,
      syncProgress: 100,
      estimatedTimeRemaining: null
    },
    myfitnesspal: {
      status: DataSourceStatus.SYNCED,
      lastSync: recentSyncDate,
      dataCategories: ['nutrition', 'meals'],
      connectionDate: connectionDate,
      syncProgress: 100,
      estimatedTimeRemaining: null
    },
    fitbit: {
      status: DataSourceStatus.SYNCED,
      lastSync: recentSyncDate,
      dataCategories: ['activity', 'sleep', 'heart_rate'],
      connectionDate: connectionDate,
      syncProgress: 100,
      estimatedTimeRemaining: null
    },
    whoop: {
      status: DataSourceStatus.SYNCED,
      lastSync: recentSyncDate,
      dataCategories: ['recovery', 'strain', 'sleep'],
      connectionDate: connectionDate,
      syncProgress: 100,
      estimatedTimeRemaining: null
    },
    oura_ring: {
      status: DataSourceStatus.SYNCED,
      lastSync: recentSyncDate,
      dataCategories: ['sleep', 'readiness', 'activity'],
      connectionDate: connectionDate,
      syncProgress: 100,
      estimatedTimeRemaining: null
    },
    strava: {
      status: DataSourceStatus.SYNCED,
      lastSync: recentSyncDate,
      dataCategories: ['workouts', 'activity'],
      connectionDate: connectionDate,
      syncProgress: 100,
      estimatedTimeRemaining: null
    },
    cronometer: {
      status: DataSourceStatus.SYNCED,
      lastSync: recentSyncDate,
      dataCategories: ['nutrition', 'supplements'],
      connectionDate: connectionDate,
      syncProgress: 100,
      estimatedTimeRemaining: null
    }
  };
};

export const setSyncStatus = (sourceId, statusUpdate) => {
  try {
    const currentStatus = getSyncStatus();
    const updatedStatus = {
      ...currentStatus,
      [sourceId]: {
        ...currentStatus[sourceId],
        ...statusUpdate
      }
    };
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updatedStatus));
    return updatedStatus;
  } catch (error) {
    console.error('Error saving sync status:', error);
  }
};

export const connectDataSource = (sourceId) => {
  return setSyncStatus(sourceId, {
    status: DataSourceStatus.CONNECTING,
    connectionDate: new Date().toISOString(),
    syncProgress: 0
  });
};

export const markConnected = (sourceId) => {
  return setSyncStatus(sourceId, {
    status: DataSourceStatus.CONNECTED,
    syncProgress: 0,
    estimatedTimeRemaining: 48 // hours
  });
};

export const startSync = (sourceId) => {
  return setSyncStatus(sourceId, {
    status: DataSourceStatus.SYNCING,
    syncProgress: 0
  });
};

export const updateSyncProgress = (sourceId, progress, estimatedTimeRemaining) => {
  return setSyncStatus(sourceId, {
    syncProgress: progress,
    estimatedTimeRemaining
  });
};

export const markSynced = (sourceId) => {
  return setSyncStatus(sourceId, {
    status: DataSourceStatus.SYNCED,
    lastSync: new Date().toISOString(),
    syncProgress: 100,
    estimatedTimeRemaining: null
  });
};

export const setError = (sourceId, errorMessage) => {
  return setSyncStatus(sourceId, {
    status: DataSourceStatus.ERROR,
    errorMessage
  });
};

export const disconnectDataSource = (sourceId) => {
  return setSyncStatus(sourceId, {
    status: DataSourceStatus.DISCONNECTED,
    lastSync: null,
    connectionDate: null,
    syncProgress: 0,
    estimatedTimeRemaining: null,
    errorMessage: null
  });
};

// Mock OAuth flow for demo
export const mockOAuthFlow = async (sourceId) => {
  // Simulate OAuth connection
  connectDataSource(sourceId);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  markConnected(sourceId);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  startSync(sourceId);
  
  // Simulate sync progress
  for (let i = 0; i <= 100; i += 20) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const timeRemaining = Math.max(0, 48 - (i / 100) * 48);
    updateSyncProgress(sourceId, i, timeRemaining);
  }
  
  markSynced(sourceId);
  
  return getSyncStatus();
};

