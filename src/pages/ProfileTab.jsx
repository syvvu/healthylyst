// Profile Tab - Complete implementation with all sections
import React, { useState, useEffect } from 'react';
import { Edit, Download, Trash2, Bell, LogOut, CheckCircle, X } from 'lucide-react';
import TabNavigation, { PageHeader } from '../components/TabNavigation';
import EditPersonalInfoModal from '../components/modals/EditPersonalInfoModal';
import HealthProfileModal from '../components/modals/HealthProfileModal';
import DeleteAccountModal from '../components/modals/DeleteAccountModal';

const theme = {
  background: { primary: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #fef3c7 100%)', card: '#ffffff' },
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

const ProfileTab = ({ allHealthData, onOpenSettings, onLogout }) => {
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

  // Health Profile State
  const [healthProfile, setHealthProfile] = useState(() => {
    const saved = localStorage.getItem('profile_health');
    return saved ? JSON.parse(saved) : {
      goals: ['Improve sleep quality', 'Increase daily steps'],
      conditions: [],
      medications: []
    };
  });

  // AI Preferences State
  const [aiPreferences, setAiPreferences] = useState(() => {
    const saved = localStorage.getItem('profile_ai_preferences');
    return saved ? JSON.parse(saved) : {
      insightSensitivity: 50,
      notificationFreq: 'daily',
      priorityMetrics: ['sleep', 'activity']
    };
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState(() => {
    const saved = localStorage.getItem('profile_notifications');
    return saved ? JSON.parse(saved) : {
      dailySummary: true,
      summaryTime: '20:00',
      anomalyAlerts: true,
      insightDiscoveries: true
    };
  });

  // UI State
  const [showEditInfo, setShowEditInfo] = useState(false);
  const [showHealthProfile, setShowHealthProfile] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [toast, setToast] = useState(null);

  // Calculate age from DOB
  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Auto-save functions
  const saveAiPreferences = (updates) => {
    const newPrefs = { ...aiPreferences, ...updates };
    setAiPreferences(newPrefs);
    localStorage.setItem('profile_ai_preferences', JSON.stringify(newPrefs));
    setToast({ message: 'AI preferences saved', type: 'success' });
  };

  const saveNotificationSettings = (updates) => {
    const newSettings = { ...notificationSettings, ...updates };
    setNotificationSettings(newSettings);
    localStorage.setItem('profile_notifications', JSON.stringify(newSettings));
    setToast({ message: 'Notification settings saved', type: 'success' });
  };

  // Handle slider change with auto-save
  const handleSensitivityChange = (value) => {
    saveAiPreferences({ insightSensitivity: parseInt(value) });
  };

  // Handle notification frequency change with auto-save
  const handleNotificationFreqChange = (value) => {
    saveAiPreferences({ notificationFreq: value });
  };

  // Handle priority metrics toggle
  const togglePriorityMetric = (metric) => {
    const current = aiPreferences.priorityMetrics || [];
    const updated = current.includes(metric)
      ? current.filter(m => m !== metric)
      : [...current, metric];
    saveAiPreferences({ priorityMetrics: updated });
  };

  // Handle notification toggle with auto-save
  const handleNotificationToggle = (key, value) => {
    saveNotificationSettings({ [key]: value });
  };

  // Handle summary time change with auto-save
  const handleSummaryTimeChange = (value) => {
    saveNotificationSettings({ summaryTime: value });
  };

  // Handle personal info save
  const handlePersonalInfoSave = (data) => {
    setPersonalInfo(data);
    localStorage.setItem('profile_personal_info', JSON.stringify(data));
    setShowEditInfo(false);
    setToast({ message: 'Personal information updated', type: 'success' });
  };

  // Handle health profile save
  const handleHealthProfileSave = (data) => {
    setHealthProfile(data);
    localStorage.setItem('profile_health', JSON.stringify(data));
    setShowHealthProfile(false);
    setToast({ message: 'Health profile updated', type: 'success' });
  };

  // Handle export data
  const handleExportData = () => {
    const exportData = {
      personalInfo,
      healthProfile,
      aiPreferences,
      notificationSettings,
      healthData: allHealthData
    };
    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-data-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    setToast({ message: 'Data exported successfully', type: 'success' });
  };

  // Handle delete account
  const handleDeleteAccount = () => {
    // Clear all local storage
    localStorage.clear();
    setToast({ message: 'Account deleted', type: 'success' });
    setShowDeleteAccount(false);
    // Optionally redirect or logout
    if (onLogout) {
      setTimeout(() => onLogout(), 2000);
    }
  };

  // Priority metrics options
  const priorityMetricsOptions = [
    { id: 'sleep', label: 'Sleep' },
    { id: 'activity', label: 'Activity' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'vitals', label: 'Heart Health' },
    { id: 'wellness', label: 'Wellness' }
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: theme.background.primary }}>
      <PageHeader 
        title="Profile" 
        onOpenSettings={onOpenSettings}
        rightAction={
          onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          )
        }
      />
      
      <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        {/* Personal Info Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: theme.text.primary }}>
              Personal Info
            </h2>
            <button
              onClick={() => setShowEditInfo(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm" style={{ color: theme.text.tertiary }}>Name</p>
              <p className="font-semibold mt-1" style={{ color: theme.text.primary }}>
                {personalInfo.name}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: theme.text.tertiary }}>Age</p>
              <p className="font-semibold mt-1" style={{ color: theme.text.primary }}>
                {calculateAge(personalInfo.dob) || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: theme.text.tertiary }}>Height</p>
              <p className="font-semibold mt-1" style={{ color: theme.text.primary }}>
                {personalInfo.height} cm
              </p>
            </div>
            <div>
              <p className="text-sm" style={{ color: theme.text.tertiary }}>Weight</p>
              <p className="font-semibold mt-1" style={{ color: theme.text.primary }}>
                {personalInfo.weight} kg
              </p>
            </div>
          </div>
        </div>

        {/* Health Profile Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ color: theme.text.primary }}>
              Health Profile
            </h2>
            <button
              onClick={() => setShowHealthProfile(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
            >
              <Edit className="w-4 h-4" />
              Manage Health Profile
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Health Goals</p>
              {healthProfile.goals && healthProfile.goals.length > 0 ? (
                <ul className="space-y-1">
                  {healthProfile.goals.map((goal, idx) => (
                    <li key={idx} className="text-sm" style={{ color: theme.text.primary }}>
                      • {goal}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm" style={{ color: theme.text.tertiary }}>No goals set</p>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Chronic Conditions</p>
              {healthProfile.conditions && healthProfile.conditions.length > 0 ? (
                <ul className="space-y-1">
                  {healthProfile.conditions.map((condition, idx) => (
                    <li key={idx} className="text-sm" style={{ color: theme.text.primary }}>
                      • {condition}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm" style={{ color: theme.text.tertiary }}>No conditions recorded</p>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Medications</p>
              {healthProfile.medications && healthProfile.medications.length > 0 ? (
                <ul className="space-y-1">
                  {healthProfile.medications.map((med, idx) => (
                    <li key={idx} className="text-sm" style={{ color: theme.text.primary }}>
                      • {med}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm" style={{ color: theme.text.tertiary }}>No medications recorded</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Preferences Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: theme.text.primary }}>
            AI Preferences
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
                Insight Sensitivity
              </label>
              <div className="flex items-center gap-4">
                <span className="text-sm w-24" style={{ color: theme.text.secondary }}>Conservative</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={aiPreferences.insightSensitivity}
                  onChange={(e) => handleSensitivityChange(e.target.value)}
                  className="flex-1"
                />
                <span className="text-sm w-24 text-right" style={{ color: theme.text.secondary }}>Aggressive</span>
              </div>
              <p className="text-xs mt-1 text-center" style={{ color: theme.text.tertiary }}>
                {aiPreferences.insightSensitivity}%
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
                Notification Frequency
              </label>
              <select
                value={aiPreferences.notificationFreq}
                onChange={(e) => handleNotificationFreqChange(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border"
                style={{ borderColor: theme.border.primary }}
              >
                <option value="realtime">Real-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: theme.text.secondary }}>
                Priority Metrics
              </label>
              <div className="space-y-2">
                {priorityMetricsOptions.map((metric) => (
                  <label key={metric.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiPreferences.priorityMetrics?.includes(metric.id) || false}
                      onChange={() => togglePriorityMetric(metric.id)}
                      className="w-4 h-4"
                      style={{ accentColor: theme.accent.primary }}
                    />
                    <span className="text-sm" style={{ color: theme.text.primary }}>
                      {metric.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: theme.text.primary }}>
            Notification Settings
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span style={{ color: theme.text.primary }}>Daily Summary</span>
              <input
                type="checkbox"
                checked={notificationSettings.dailySummary}
                onChange={(e) => handleNotificationToggle('dailySummary', e.target.checked)}
                className="w-4 h-4"
                style={{ accentColor: theme.accent.primary }}
              />
            </label>
            
            {notificationSettings.dailySummary && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
                  Summary Time
                </label>
                <input
                  type="time"
                  value={notificationSettings.summaryTime}
                  onChange={(e) => handleSummaryTimeChange(e.target.value)}
                  className="px-4 py-2 rounded-lg border"
                  style={{ borderColor: theme.border.primary }}
                />
              </div>
            )}

            <label className="flex items-center justify-between">
              <span style={{ color: theme.text.primary }}>Anomaly Alerts</span>
              <input
                type="checkbox"
                checked={notificationSettings.anomalyAlerts}
                onChange={(e) => handleNotificationToggle('anomalyAlerts', e.target.checked)}
                className="w-4 h-4"
                style={{ accentColor: theme.accent.primary }}
              />
            </label>

            <label className="flex items-center justify-between">
              <span style={{ color: theme.text.primary }}>Insight Discoveries</span>
              <input
                type="checkbox"
                checked={notificationSettings.insightDiscoveries}
                onChange={(e) => handleNotificationToggle('insightDiscoveries', e.target.checked)}
                className="w-4 h-4"
                style={{ accentColor: theme.accent.primary }}
              />
            </label>
          </div>
        </div>

        {/* Privacy & Data Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderColor: theme.border.primary, borderWidth: '1px' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: theme.text.primary }}>
            Privacy & Data
          </h2>
          
          <div className="space-y-4">
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              Your data is stored securely and is never shared with third parties. 
              Data retention: 2 years or until account deletion.
            </p>
            
            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary, color: theme.text.primary }}
            >
              <Download className="w-4 h-4" />
              Export All Data
            </button>
            
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg"
              style={{ backgroundColor: theme.accent.danger, color: 'white' }}
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modals */}
      {showEditInfo && (
        <EditPersonalInfoModal
          isOpen={showEditInfo}
          onClose={() => setShowEditInfo(false)}
          onSave={handlePersonalInfoSave}
          initialData={personalInfo}
        />
      )}

      {showHealthProfile && (
        <HealthProfileModal
          isOpen={showHealthProfile}
          onClose={() => setShowHealthProfile(false)}
          onSave={handleHealthProfileSave}
          initialData={healthProfile}
        />
      )}

      {showDeleteAccount && (
        <DeleteAccountModal
          isOpen={showDeleteAccount}
          onClose={() => setShowDeleteAccount(false)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </div>
  );
};

export default ProfileTab;
