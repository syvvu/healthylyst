// Manual Entry Modal - For adding manual health data entries
import React, { useState } from 'react';
import { X, Save, Clock } from 'lucide-react';

const theme = {
  background: {
    card: '#ffffff',
  },
  border: {
    primary: '#bae6fd',
  },
  text: {
    primary: '#0c4a6e',
    secondary: '#334155',
  },
  accent: {
    primary: '#0ea5e9',
  }
};

const metricCategories = {
  sleep: ['Sleep Duration (hours)', 'Sleep Quality (0-100)', 'Deep Sleep (hours)'],
  activity: ['Steps', 'Active Minutes', 'Exercise Minutes', 'Workout Type'],
  nutrition: ['Calories', 'Protein (g)', 'Carbs (g)', 'Water (liters)'],
  vitals: ['Weight (kg)', 'Resting Heart Rate (bpm)', 'Blood Pressure'],
  wellness: ['Energy Level (1-10)', 'Mood Score (1-10)', 'Stress Level (1-10)']
};

const ManualEntryModal = ({ isOpen, onClose, onSave }) => {
  const [selectedCategory, setSelectedCategory] = useState('sleep');
  const [selectedMetric, setSelectedMetric] = useState('');
  const [value, setValue] = useState('');
  const [time, setTime] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!selectedMetric || !value) {
      alert('Please fill in all required fields');
      return;
    }

    onSave({
      category: selectedCategory,
      metric: selectedMetric,
      value: parseFloat(value) || value,
      time: new Date(time),
      notes: notes.trim()
    });

    // Reset form
    setSelectedCategory('sleep');
    setSelectedMetric('');
    setValue('');
    setTime(new Date().toISOString().slice(0, 16));
    setNotes('');
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
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.primary }}>
          <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>
            Add Manual Entry
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all"
            style={{ color: theme.text.secondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedMetric('');
              }}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary }}
            >
              {Object.keys(metricCategories).map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Metric */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
              Metric *
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary }}
            >
              <option value="">Select a metric</option>
              {metricCategories[selectedCategory].map(metric => (
                <option key={metric} value={metric}>{metric}</option>
              ))}
            </select>
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
              Value *
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary }}
              placeholder="Enter value"
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
              <Clock className="w-4 h-4 inline mr-1" />
              Time
            </label>
            <input
              type="datetime-local"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary }}
              rows="3"
              placeholder="Optional notes..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3" style={{ borderColor: theme.border.primary }}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg font-medium transition-all border"
            style={{ 
              borderColor: theme.border.primary,
              color: theme.text.secondary
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            style={{ 
              backgroundColor: theme.accent.primary,
              color: 'white'
            }}
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualEntryModal;

