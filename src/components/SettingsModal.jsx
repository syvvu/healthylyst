// Settings & Profile Modal - Combined Profile, Settings, and Sources
import React, { useState, useEffect } from 'react';
import { X, User, Settings, Link2, Download, Trash2, Bell, LogOut, Edit, CheckCircle, Shield, Eye, Mail, Smartphone, Moon, Sun, Sliders, Database, Lock, AlertCircle, Info, Sparkles } from 'lucide-react';
import EditPersonalInfoModal from './modals/EditPersonalInfoModal';
import HealthProfileModal from './modals/HealthProfileModal';
import DeleteAccountModal from './modals/DeleteAccountModal';
import ConnectionModal from './modals/ConnectionModal';
import DisconnectModal from './modals/DisconnectModal';
import { getSyncStatus, mockOAuthFlow, disconnectDataSource, markSynced, DataSourceStatus } from '../utils/dataSyncStatus';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155', tertiary: '#64748b' },
  accent: { primary: '#0ea5e9', danger: '#f43f5e', success: '#10b981' }
};

// Toast notification component
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed top-20 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-in"
      style={{
        backgroundColor: type === 'success' ? theme.accent.success : theme.accent.danger,
        color: 'white'
      }}
    >
      <CheckCircle className="w-5 h-5" />
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const SettingsModal = ({ isOpen, onClose, allHealthData, onLogout }) => {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'settings', 'sources'
  const [showEditPersonalInfo, setShowEditPersonalInfo] = useState(false);
  const [showHealthProfile, setShowHealthProfile] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [toast, setToast] = useState(null);
  const [syncStatus, setSyncStatus] = useState({});

  // Personal Info State
  const [personalInfo, setPersonalInfo] = useState(() => {
    const saved = localStorage.getItem('profile_personal_info');
    return saved ? JSON.parse(saved) : {
      name: 'Alex Johnson',
      dob: '1992-01-15',
      height: 175,
      weight: 71.7
    };
  });

  // Personal Goals State
  const [personalGoals, setPersonalGoals] = useState(() => {
    const saved = localStorage.getItem('profile_personal_goals');
    return saved ? JSON.parse(saved) : {
      sleep: 8,
      steps: 10000,
      water: 2
    };
  });
  const [isEditingGoals, setIsEditingGoals] = useState(false);

  // Settings State
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('app_settings');
    return saved ? JSON.parse(saved) : {
      enableAIInsights: true,
      enablePredictions: true,
      confidenceThreshold: 75,
      dailySummary: true,
      weeklyReport: false,
      anomalyAlerts: true,
      notificationMethod: 'push',
      defaultDashboardView: 'week',
      defaultFocusMode: 'overview',
      dataEncryption: true
    };
  });

  // Load sync status
  useEffect(() => {
    if (isOpen && activeTab === 'sources') {
      const status = getSyncStatus();
      setSyncStatus(status);
    }
  }, [isOpen, activeTab]);

  // Refresh sync status when modal closes (to update after connect/disconnect)
  useEffect(() => {
    if (!showConnectionModal && !showDisconnectModal) {
      const status = getSyncStatus();
      setSyncStatus(status);
    }
  }, [showConnectionModal, showDisconnectModal]);

  const handleSaveSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('app_settings', JSON.stringify(updated));
    setToast({ message: 'Settings saved successfully', type: 'success' });
  };

  const handleConnectSource = async (sourceId) => {
    try {
      // Convert source ID from hyphen to underscore format
      const statusKey = sourceId.replace(/-/g, '_');
      await mockOAuthFlow(statusKey);
      // Force refresh sync status after connection
      setTimeout(() => {
        const status = getSyncStatus();
        setSyncStatus(status);
      }, 100);
      setShowConnectionModal(false);
      setSelectedSource(null);
      setToast({ message: 'Source connected successfully', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to connect source', type: 'danger' });
    }
  };

  const handleDisconnectSource = async (sourceId) => {
    try {
      // Convert source ID from hyphen to underscore format
      const statusKey = sourceId.replace(/-/g, '_');
      disconnectDataSource(statusKey);
      const status = getSyncStatus();
      setSyncStatus(status);
      setShowDisconnectModal(false);
      setToast({ message: 'Source disconnected', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to disconnect source', type: 'danger' });
    }
  };

  const handleSyncNow = async (sourceId) => {
    try {
      // Convert source ID from hyphen to underscore format
      const statusKey = sourceId.replace(/-/g, '_');
      markSynced(statusKey);
      const status = getSyncStatus();
      setSyncStatus(status);
      setToast({ message: 'Data synced successfully', type: 'success' });
    } catch (error) {
      setToast({ message: 'Sync failed', type: 'danger' });
    }
  };

  const handleExportData = async (format) => {
    if (!allHealthData) {
      setToast({ message: 'No data available to export', type: 'danger' });
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      
      if (format === 'json') {
        // Export as JSON
        const exportData = {
          exportDate: new Date().toISOString(),
          data: allHealthData,
          metadata: {
            sleepRecords: allHealthData.sleep?.data?.length || 0,
            nutritionRecords: allHealthData.nutrition?.data?.length || 0,
            activityRecords: allHealthData.activity?.data?.length || 0,
            vitalsRecords: allHealthData.vitals?.data?.length || 0,
            wellnessRecords: allHealthData.wellness?.data?.length || 0
          }
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `health-data-export-${timestamp}.json`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        setToast({ message: 'Data exported as JSON successfully', type: 'success' });
        // Don't close modal immediately to allow download to start
        setTimeout(() => setShowExportModal(false), 500);
      } else if (format === 'csv') {
        // Export as CSV - combine all data sources
        const dates = new Set();
        
        // Collect all dates from all categories
        Object.values(allHealthData).forEach(category => {
          if (category?.data) {
            category.data.forEach(record => {
              if (record.date) dates.add(record.date);
            });
          }
        });
        
        const sortedDates = Array.from(dates).sort();
        
        // Get all unique field names across all categories - ensure we get ALL fields
        const allFields = new Set(['date']);
        Object.values(allHealthData).forEach(category => {
          if (category?.data && category.data.length > 0) {
            // Check all records to ensure we get all possible fields
            category.data.forEach(record => {
              Object.keys(record).forEach(key => {
                if (key !== 'date') {
                  allFields.add(key);
                }
              });
            });
          }
        });
        
        // Sort fields: date first, then alphabetically
        const fieldArray = ['date', ...Array.from(allFields).filter(f => f !== 'date').sort()];
        
        // Helper function to format date for Excel
        // Use MM/DD/YYYY format which Excel universally recognizes and auto-formats as date
        const formatDateForExcel = (dateStr) => {
          if (!dateStr) return '';
          try {
            const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
            if (isNaN(date.getTime())) return dateStr; // If invalid, return original
            // Format as MM/DD/YYYY - Excel recognizes this format and auto-formats as date
            // This prevents #### display issues
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${month}/${day}/${year}`;
          } catch (e) {
            return dateStr;
          }
        };
        
        // Create CSV rows
        const csvRows = [];
        csvRows.push(fieldArray.join(','));
        
        sortedDates.forEach(date => {
          const row = [];
          const dayData = {};
          
          // Collect all data for this date from all categories
          Object.entries(allHealthData).forEach(([categoryName, category]) => {
            if (category?.data) {
              const dayRecord = category.data.find(r => r.date === date);
              if (dayRecord) {
                // Merge all fields from this record
                Object.assign(dayData, dayRecord);
              }
            }
          });
          
          // Build row with all fields
          fieldArray.forEach(field => {
            if (field === 'date') {
              // Format date properly for Excel
              row.push(formatDateForExcel(date));
            } else {
              const value = dayData[field];
              // Handle values that might contain commas or quotes
              if (value === null || value === undefined || value === '') {
                row.push('');
              } else {
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                  row.push(`"${stringValue.replace(/"/g, '""')}"`);
                } else {
                  row.push(stringValue);
                }
              }
            }
          });
          
          csvRows.push(row.join(','));
        });
        
        // Add UTF-8 BOM for proper Excel compatibility
        const BOM = '\uFEFF';
        const csvContent = BOM + csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `health-data-export-${timestamp}.csv`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
        
        // Count total records for confirmation
        const totalRecords = sortedDates.length;
        const totalFields = fieldArray.length;
        setToast({ 
          message: `Data exported as CSV successfully (${totalRecords} records, ${totalFields} fields). Tip: If dates show as ####, double-click the column border to auto-resize.`, 
          type: 'success' 
        });
        // Don't close modal immediately to allow download to start
        setTimeout(() => setShowExportModal(false), 500);
      } else if (format === 'csv-separate') {
        // Export separate CSV files - one per category (can be opened as separate tabs in Excel)
        const timestamp = new Date().toISOString().split('T')[0];
        const categories = [
          { name: 'sleep', label: 'Sleep' },
          { name: 'nutrition', label: 'Nutrition' },
          { name: 'activity', label: 'Activity' },
          { name: 'vitals', label: 'Vitals' },
          { name: 'wellness', label: 'Wellness' }
        ];
        
        // Helper function to format date for Excel
        // Use MM/DD/YYYY format which Excel universally recognizes and auto-formats as date
        const formatDateForExcel = (dateStr) => {
          if (!dateStr) return '';
          try {
            const date = new Date(dateStr + 'T00:00:00');
            if (isNaN(date.getTime())) return dateStr;
            // Format as MM/DD/YYYY - Excel recognizes this format and auto-formats as date
            // This prevents #### display issues
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${month}/${day}/${year}`;
          } catch (e) {
            return dateStr;
          }
        };
        
        // Helper function to create CSV from category data
        const createCSV = (categoryData, categoryName) => {
          if (!categoryData?.data || categoryData.data.length === 0) return null;
          
          // Get all field names
          const fields = new Set(['date']);
          categoryData.data.forEach(record => {
            Object.keys(record).forEach(key => {
              if (key !== 'date') fields.add(key);
            });
          });
          
          const fieldArray = ['date', ...Array.from(fields).filter(f => f !== 'date').sort()];
          
          // Create CSV rows
          const csvRows = [];
          csvRows.push(fieldArray.join(','));
          
          // Sort by date
          const sortedData = [...categoryData.data].sort((a, b) => {
            if (!a.date || !b.date) return 0;
            return a.date.localeCompare(b.date);
          });
          
          sortedData.forEach(record => {
            const row = [];
            fieldArray.forEach(field => {
              if (field === 'date') {
                row.push(formatDateForExcel(record.date));
              } else {
                const value = record[field];
                if (value === null || value === undefined || value === '') {
                  row.push('');
                } else {
                  const stringValue = String(value);
                  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    row.push(`"${stringValue.replace(/"/g, '""')}"`);
                  } else {
                    row.push(stringValue);
                  }
                }
              }
            });
            csvRows.push(row.join(','));
          });
          
          const BOM = '\uFEFF';
          return BOM + csvRows.join('\n');
        };
        
        // Filter categories that have data
        const categoriesWithData = categories.filter(cat => 
          allHealthData[cat.name]?.data && allHealthData[cat.name].data.length > 0
        );
        
        if (categoriesWithData.length === 0) {
          setToast({ message: 'No data available to export', type: 'danger' });
          return;
        }
        
        // Download each category as a separate CSV file
        let downloadCount = 0;
        const totalCategories = categoriesWithData.length;
        
        categoriesWithData.forEach((category, index) => {
          const categoryData = allHealthData[category.name];
          const csvContent = createCSV(categoryData, category.name);
          if (!csvContent) return;
          
          // Delay each download slightly to avoid browser blocking multiple downloads
          setTimeout(() => {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${category.name}-${timestamp}.csv`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }, 100);
            
            downloadCount++;
            if (downloadCount === totalCategories) {
              setToast({ 
                message: `Exported ${totalCategories} separate CSV files successfully (one per category)`, 
                type: 'success' 
              });
              setTimeout(() => setShowExportModal(false), 500);
            }
          }, index * 300); // 300ms delay between downloads
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      setToast({ message: 'Failed to export data', type: 'danger' });
    }
  };

  const sources = [
    { id: 'apple-health', name: 'Apple Health', icon: '🍎', description: 'Sync health data from Apple Health app', dataCategories: ['sleep', 'activity', 'vitals', 'wellness'] },
    { id: 'fitbit', name: 'Fitbit', icon: '⌚', description: 'Connect your Fitbit device', dataCategories: ['sleep', 'activity', 'vitals'] },
    { id: 'google-fit', name: 'Google Fit', icon: '📱', description: 'Sync with Google Fit', dataCategories: ['activity', 'vitals'] },
    { id: 'strava', name: 'Strava', icon: '🏃', description: 'Import workouts from Strava', dataCategories: ['activity'] },
    { id: 'myfitnesspal', name: 'MyFitnessPal', icon: '🥗', description: 'Sync nutrition data', dataCategories: ['nutrition'] },
  ];

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          style={{ borderColor: theme.border.primary, borderWidth: '1px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.primary }}>
            <h2 className="text-2xl font-bold" style={{ color: theme.text.primary }}>
              Settings & Profile
            </h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-6 h-6" style={{ color: theme.text.secondary }} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: theme.border.primary }}>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-6 py-4 font-medium transition-all ${
                activeTab === 'profile' ? 'border-b-2' : ''
              }`}
              style={{
                borderBottomColor: activeTab === 'profile' ? theme.accent.primary : 'transparent',
                color: activeTab === 'profile' ? theme.accent.primary : theme.text.secondary
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <User className="w-5 h-5" />
                <span>Profile</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 px-6 py-4 font-medium transition-all ${
                activeTab === 'settings' ? 'border-b-2' : ''
              }`}
              style={{
                borderBottomColor: activeTab === 'settings' ? theme.accent.primary : 'transparent',
                color: activeTab === 'settings' ? theme.accent.primary : theme.text.secondary
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              className={`flex-1 px-6 py-4 font-medium transition-all ${
                activeTab === 'sources' ? 'border-b-2' : ''
              }`}
              style={{
                borderBottomColor: activeTab === 'sources' ? theme.accent.primary : 'transparent',
                color: activeTab === 'sources' ? theme.accent.primary : theme.text.secondary
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <Link2 className="w-5 h-5" />
                <span>Data Sources</span>
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Profile Picture & Basic Info */}
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-4xl font-bold text-white">
                    {personalInfo.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1" style={{ color: theme.text.primary }}>
                      {personalInfo.name}
                    </h3>
                    <p className="text-sm" style={{ color: theme.text.tertiary }}>
                      Age: {new Date().getFullYear() - new Date(personalInfo.dob).getFullYear()} years
                    </p>
                    <button
                      onClick={() => setShowEditPersonalInfo(true)}
                      className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-all"
                      style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-sm">Edit Profile</span>
                    </button>
                  </div>
                </div>

                {/* Personal Goals */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold" style={{ color: theme.text.primary }}>
                      Personal Goals
                    </h4>
                    {!isEditingGoals && (
                      <button
                        onClick={() => setIsEditingGoals(true)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg border hover:bg-white transition-all"
                        style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
                      >
                        <Edit className="w-3 h-3" />
                        <span className="text-xs">Edit</span>
                      </button>
                    )}
                  </div>
                  {isEditingGoals ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm mb-1" style={{ color: theme.text.secondary }}>
                          Sleep (hours)
                        </label>
                        <input
                          type="number"
                          value={personalGoals.sleep}
                          onChange={(e) => setPersonalGoals({ ...personalGoals, sleep: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ borderColor: theme.border.primary }}
                          min="0"
                          max="24"
                          step="0.5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1" style={{ color: theme.text.secondary }}>
                          Steps (daily)
                        </label>
                        <input
                          type="number"
                          value={personalGoals.steps}
                          onChange={(e) => setPersonalGoals({ ...personalGoals, steps: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ borderColor: theme.border.primary }}
                          min="0"
                          step="100"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1" style={{ color: theme.text.secondary }}>
                          Water (liters)
                        </label>
                        <input
                          type="number"
                          value={personalGoals.water}
                          onChange={(e) => setPersonalGoals({ ...personalGoals, water: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ borderColor: theme.border.primary }}
                          min="0"
                          max="10"
                          step="0.5"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            localStorage.setItem('profile_personal_goals', JSON.stringify(personalGoals));
                            setIsEditingGoals(false);
                            setToast({ message: 'Goals updated successfully', type: 'success' });
                          }}
                          className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                          style={{ backgroundColor: theme.accent.primary, color: 'white' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            // Reload from localStorage
                            const saved = localStorage.getItem('profile_personal_goals');
                            if (saved) {
                              setPersonalGoals(JSON.parse(saved));
                            }
                            setIsEditingGoals(false);
                          }}
                          className="flex-1 px-4 py-2 rounded-lg border font-medium transition-all"
                          style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm" style={{ color: theme.text.secondary }}>
                      <div>Sleep: {personalGoals.sleep} hours</div>
                      <div>Steps: {personalGoals.steps.toLocaleString()} steps</div>
                      <div>Water: {personalGoals.water}L</div>
                    </div>
                  )}
                </div>

                {/* Wellness Focus Tags */}
                <div>
                  <h4 className="font-semibold mb-3" style={{ color: theme.text.primary }}>
                    Wellness Focus
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {['Sleep', 'Nutrition', 'Recovery'].map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full text-sm"
                        style={{ backgroundColor: theme.accent.primary + '20', color: theme.accent.primary }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border hover:bg-red-50 transition-all"
                  style={{ borderColor: theme.accent.danger, color: theme.accent.danger }}
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Data & Privacy */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <Database className="w-5 h-5" />
                    Data & Privacy
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowExportModal(true)}
                      className="w-full flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-all"
                      style={{ borderColor: theme.border.primary }}
                    >
                      <div className="flex items-center gap-3">
                        <Download className="w-5 h-5" style={{ color: theme.text.secondary }} />
                        <span style={{ color: theme.text.primary }}>Export My Data</span>
                      </div>
                      <span className="text-xs" style={{ color: theme.text.tertiary }}>CSV/JSON</span>
                    </button>
                    <button
                      onClick={() => setShowDeleteAccount(true)}
                      className="w-full flex items-center justify-between p-4 rounded-lg border hover:bg-red-50 transition-all"
                      style={{ borderColor: theme.accent.danger }}
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 className="w-5 h-5" style={{ color: theme.accent.danger }} />
                        <span style={{ color: theme.accent.danger }}>Delete My Data</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* AI & Insights */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <Sparkles className="w-5 h-5" />
                    AI & Insights
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-all" style={{ borderColor: theme.border.primary }}>
                      <span style={{ color: theme.text.primary }}>Enable AI Insights</span>
                      <input
                        type="checkbox"
                        checked={settings.enableAIInsights}
                        onChange={(e) => handleSaveSettings({ enableAIInsights: e.target.checked })}
                        className="w-5 h-5"
                        style={{ accentColor: theme.accent.primary }}
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-all" style={{ borderColor: theme.border.primary }}>
                      <span style={{ color: theme.text.primary }}>Predictive Insights (Beta)</span>
                      <input
                        type="checkbox"
                        checked={settings.enablePredictions}
                        onChange={(e) => handleSaveSettings({ enablePredictions: e.target.checked })}
                        className="w-5 h-5"
                        style={{ accentColor: theme.accent.primary }}
                      />
                    </label>
                    <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary }}>
                      <div className="flex items-center justify-between mb-2">
                        <span style={{ color: theme.text.primary }}>Confidence Threshold</span>
                        <span className="text-sm font-semibold" style={{ color: theme.accent.primary }}>
                          {settings.confidenceThreshold}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={settings.confidenceThreshold}
                        onChange={(e) => handleSaveSettings({ confidenceThreshold: parseInt(e.target.value) })}
                        className="w-full"
                        style={{ accentColor: theme.accent.primary }}
                      />
                    </div>
                    <button
                      className="w-full px-4 py-3 rounded-lg border hover:bg-gray-50 transition-all"
                      style={{ borderColor: theme.border.primary, color: theme.text.primary }}
                    >
                      Retrain AI with Latest Data
                    </button>
                  </div>
                </div>

                {/* Notifications */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <Bell className="w-5 h-5" />
                    Notifications
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-all" style={{ borderColor: theme.border.primary }}>
                      <span style={{ color: theme.text.primary }}>Daily Summary</span>
                      <input
                        type="checkbox"
                        checked={settings.dailySummary}
                        onChange={(e) => handleSaveSettings({ dailySummary: e.target.checked })}
                        className="w-5 h-5"
                        style={{ accentColor: theme.accent.primary }}
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-all" style={{ borderColor: theme.border.primary }}>
                      <span style={{ color: theme.text.primary }}>Weekly Report</span>
                      <input
                        type="checkbox"
                        checked={settings.weeklyReport}
                        onChange={(e) => handleSaveSettings({ weeklyReport: e.target.checked })}
                        className="w-5 h-5"
                        style={{ accentColor: theme.accent.primary }}
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-all" style={{ borderColor: theme.border.primary }}>
                      <span style={{ color: theme.text.primary }}>Anomaly Alerts</span>
                      <input
                        type="checkbox"
                        checked={settings.anomalyAlerts}
                        onChange={(e) => handleSaveSettings({ anomalyAlerts: e.target.checked })}
                        className="w-5 h-5"
                        style={{ accentColor: theme.accent.primary }}
                      />
                    </label>
                    <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary }}>
                      <label className="block mb-2 text-sm" style={{ color: theme.text.primary }}>
                        Delivery Method
                      </label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleSaveSettings({ notificationMethod: 'email' })}
                          className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                            settings.notificationMethod === 'email' ? 'bg-blue-50 border-blue-500' : ''
                          }`}
                          style={{ borderColor: theme.border.primary }}
                        >
                          <Mail className="w-4 h-4 mx-auto" />
                        </button>
                        <button
                          onClick={() => handleSaveSettings({ notificationMethod: 'push' })}
                          className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                            settings.notificationMethod === 'push' ? 'bg-blue-50 border-blue-500' : ''
                          }`}
                          style={{ borderColor: theme.border.primary }}
                        >
                          <Smartphone className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Display & Preferences */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <Sliders className="w-5 h-5" />
                    Display & Preferences
                  </h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary }}>
                      <label className="block mb-2 text-sm" style={{ color: theme.text.primary }}>
                        Default Dashboard View
                      </label>
                      <select
                        value={settings.defaultDashboardView}
                        onChange={(e) => handleSaveSettings({ defaultDashboardView: e.target.value })}
                        className="w-full p-2 rounded-lg border"
                        style={{ borderColor: theme.border.primary }}
                      >
                        <option value="day">Day</option>
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                      </select>
                    </div>
                    <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary }}>
                      <label className="block mb-2 text-sm" style={{ color: theme.text.primary }}>
                        Default Focus Mode
                      </label>
                      <select
                        value={settings.defaultFocusMode}
                        onChange={(e) => handleSaveSettings({ defaultFocusMode: e.target.value })}
                        className="w-full p-2 rounded-lg border"
                        style={{ borderColor: theme.border.primary }}
                      >
                        <option value="overview">Overview</option>
                        <option value="sleep">Sleep</option>
                        <option value="activity">Activity</option>
                        <option value="nutrition">Nutrition</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <Lock className="w-5 h-5" />
                    Security
                  </h3>
                  <div className="p-4 rounded-lg border" style={{ borderColor: theme.border.primary }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium" style={{ color: theme.text.primary }}>Data Encryption</p>
                        <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>
                          Your data is encrypted at rest and in transit
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5" style={{ color: theme.accent.success }} />
                        <span className="text-sm font-semibold" style={{ color: theme.accent.success }}>
                          Enabled
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sources Tab */}
            {activeTab === 'sources' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-4" style={{ color: theme.text.primary }}>
                    Connected Sources
                  </h3>
                  <div className="space-y-3">
                    {sources.map(source => {
                      // Convert source ID from hyphen to underscore format (e.g., 'apple-health' -> 'apple_health')
                      const statusKey = source.id.replace(/-/g, '_');
                      const sourceStatus = syncStatus[statusKey];
                      const isConnected = sourceStatus?.status === DataSourceStatus.SYNCED || sourceStatus?.status === DataSourceStatus.CONNECTED;
                      const lastSync = sourceStatus?.lastSync;
                      return (
                        <div
                          key={source.id}
                          className="p-4 rounded-lg border"
                          style={{ borderColor: theme.border.primary }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{source.icon}</span>
                              <div>
                                <p className="font-medium" style={{ color: theme.text.primary }}>
                                  {source.name}
                                </p>
                                <p className="text-xs" style={{ color: theme.text.tertiary }}>
                                  {source.description}
                                </p>
                                {isConnected && lastSync && (
                                  <p className="text-xs mt-1" style={{ color: theme.text.tertiary }}>
                                    Last synced: {lastSync}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isConnected ? (
                                <>
                                  <button
                                    onClick={() => handleSyncNow(source.id)}
                                    className="px-3 py-1 rounded-lg text-sm border hover:bg-gray-50 transition-all"
                                    style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
                                  >
                                    Sync Now
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedSource(source);
                                      setShowDisconnectModal(true);
                                    }}
                                    className="px-3 py-1 rounded-lg text-sm border hover:bg-red-50 transition-all"
                                    style={{ borderColor: theme.accent.danger, color: theme.accent.danger }}
                                  >
                                    Disconnect
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedSource(source);
                                    setShowConnectionModal(true);
                                  }}
                                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                                  style={{ backgroundColor: theme.accent.primary, color: 'white' }}
                                >
                                  Connect
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEditPersonalInfo && (
        <EditPersonalInfoModal
          isOpen={showEditPersonalInfo}
          onClose={() => setShowEditPersonalInfo(false)}
          personalInfo={personalInfo}
          onSave={(updated) => {
            setPersonalInfo(updated);
            localStorage.setItem('profile_personal_info', JSON.stringify(updated));
            setToast({ message: 'Profile updated successfully', type: 'success' });
            setShowEditPersonalInfo(false);
          }}
        />
      )}

      {showHealthProfile && (
        <HealthProfileModal
          isOpen={showHealthProfile}
          onClose={() => setShowHealthProfile(false)}
          onSave={() => {
            setToast({ message: 'Health profile updated', type: 'success' });
            setShowHealthProfile(false);
          }}
        />
      )}

      {showDeleteAccount && (
        <DeleteAccountModal
          isOpen={showDeleteAccount}
          onClose={() => setShowDeleteAccount(false)}
          onConfirm={() => {
            setToast({ message: 'Account deletion requested', type: 'success' });
            setShowDeleteAccount(false);
          }}
        />
      )}

      {showConnectionModal && selectedSource && (
        <ConnectionModal
          isOpen={showConnectionModal}
          onClose={() => {
            setShowConnectionModal(false);
            setSelectedSource(null);
          }}
          source={selectedSource}
          onConnect={handleConnectSource}
        />
      )}

      {showDisconnectModal && selectedSource && (
        <DisconnectModal
          isOpen={showDisconnectModal}
          onClose={() => {
            setShowDisconnectModal(false);
            setSelectedSource(null);
          }}
          source={selectedSource}
          onDisconnect={handleDisconnectSource}
        />
      )}

      {/* Export Data Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: theme.text.primary }}>Export Data</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" style={{ color: theme.text.secondary }} />
              </button>
            </div>
            
            <p className="text-sm mb-6" style={{ color: theme.text.secondary }}>
              Choose a format to export all your health data:
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleExportData('csv')}
                className="w-full flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-all"
                style={{ borderColor: theme.border.primary }}
              >
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5" style={{ color: theme.text.secondary }} />
                  <div className="text-left">
                    <div className="font-medium" style={{ color: theme.text.primary }}>CSV Format (Combined)</div>
                    <div className="text-xs" style={{ color: theme.text.tertiary }}>All data in one file</div>
                  </div>
                </div>
                <span className="text-xs font-medium" style={{ color: theme.accent.primary }}>Download</span>
              </button>
              
              <button
                onClick={() => handleExportData('csv-separate')}
                className="w-full flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-all"
                style={{ borderColor: theme.border.primary }}
              >
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5" style={{ color: theme.text.secondary }} />
                  <div className="text-left">
                    <div className="font-medium" style={{ color: theme.text.primary }}>CSV Format (Separate Files)</div>
                    <div className="text-xs" style={{ color: theme.text.tertiary }}>One file per category (can open as tabs in Excel)</div>
                  </div>
                </div>
                <span className="text-xs font-medium" style={{ color: theme.accent.primary }}>Download</span>
              </button>
              
              <button
                onClick={() => handleExportData('json')}
                className="w-full flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-all"
                style={{ borderColor: theme.border.primary }}
              >
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5" style={{ color: theme.text.secondary }} />
                  <div className="text-left">
                    <div className="font-medium" style={{ color: theme.text.primary }}>JSON Format</div>
                    <div className="text-xs" style={{ color: theme.text.tertiary }}>Machine readable</div>
                  </div>
                </div>
                <span className="text-xs font-medium" style={{ color: theme.accent.primary }}>Download</span>
              </button>
            </div>
            
            <button
              onClick={() => setShowExportModal(false)}
              className="w-full mt-4 px-4 py-2 rounded-lg border hover:bg-gray-50 transition-all"
              style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default SettingsModal;

