// Goal Setting Modal
import React, { useState } from 'react';
import { X, Save, Bell } from 'lucide-react';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155' },
  accent: { primary: '#0ea5e9' }
};

const GoalSettingModal = ({ isOpen, onClose, onSave, metricName }) => {
  const [targetValue, setTargetValue] = useState('');
  const [timeframe, setTimeframe] = useState('1 week');
  const [reminderEnabled, setReminderEnabled] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!targetValue) {
      alert('Please enter a target value');
      return;
    }

    onSave({
      metric: metricName,
      target: parseFloat(targetValue),
      timeframe,
      reminder: reminderEnabled
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        style={{ borderColor: theme.border.primary, borderWidth: '1px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.primary }}>
          <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>Set Goal</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: theme.text.secondary }} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
              Target Value for {metricName}
            </label>
            <input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary }}
              placeholder="Enter target value"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary }}
            >
              <option value="1 week">1 Week</option>
              <option value="2 weeks">2 Weeks</option>
              <option value="1 month">1 Month</option>
              <option value="3 months">3 Months</option>
            </select>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <Bell className="w-4 h-4" style={{ color: theme.text.secondary }} />
            <span className="text-sm" style={{ color: theme.text.secondary }}>Enable reminders</span>
          </label>
        </div>

        <div className="p-6 border-t flex gap-3" style={{ borderColor: theme.border.primary }}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border"
            style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            style={{ backgroundColor: theme.accent.primary, color: 'white' }}
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalSettingModal;

