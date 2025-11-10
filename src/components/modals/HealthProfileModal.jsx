// Health Profile Modal
import React, { useState } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155' },
  accent: { primary: '#0ea5e9' }
};

const HealthProfileModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [goals, setGoals] = useState(initialData?.goals || ['Improve sleep quality', 'Increase daily steps']);
  const [conditions, setConditions] = useState(initialData?.conditions || []);
  const [medications, setMedications] = useState(initialData?.medications || []);
  const [newGoal, setNewGoal] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');

  const commonConditions = [
    'Hypertension',
    'Diabetes',
    'Asthma',
    'Arthritis',
    'Heart Disease',
    'High Cholesterol',
    'Anxiety',
    'Depression',
    'Sleep Apnea',
    'Other'
  ];

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ goals, conditions, medications });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ borderColor: theme.border.primary, borderWidth: '1px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.primary }}>
          <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>Health Profile</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: theme.text.secondary }} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Health Goals</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg border"
                style={{ borderColor: theme.border.primary }}
                placeholder="Add goal..."
              />
              <button
                onClick={() => {
                  if (newGoal.trim()) {
                    setGoals([...goals, newGoal.trim()]);
                    setNewGoal('');
                  }
                }}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: theme.accent.primary, color: 'white' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {goals.map((goal, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <span className="text-sm" style={{ color: theme.text.primary }}>{goal}</span>
                  <button
                    onClick={() => setGoals(goals.filter((_, i) => i !== idx))}
                    className="p-1 rounded hover:bg-gray-200"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: theme.text.secondary }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Chronic Conditions</label>
            <div className="flex gap-2 mb-2">
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg border"
                style={{ borderColor: theme.border.primary }}
              >
                <option value="">Select condition...</option>
                {commonConditions.map((condition) => (
                  <option key={condition} value={condition}>{condition}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (selectedCondition && !conditions.includes(selectedCondition)) {
                    setConditions([...conditions, selectedCondition]);
                    setSelectedCondition('');
                  }
                }}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: theme.accent.primary, color: 'white' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {conditions.map((condition, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <span className="text-sm" style={{ color: theme.text.primary }}>{condition}</span>
                  <button
                    onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}
                    className="p-1 rounded hover:bg-gray-200"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: theme.text.secondary }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Medications</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newMedication}
                onChange={(e) => setNewMedication(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg border"
                style={{ borderColor: theme.border.primary }}
                placeholder="Add medication..."
              />
              <button
                onClick={() => {
                  if (newMedication.trim()) {
                    setMedications([...medications, newMedication.trim()]);
                    setNewMedication('');
                  }
                }}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: theme.accent.primary, color: 'white' }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {medications.map((med, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <span className="text-sm" style={{ color: theme.text.primary }}>{med}</span>
                  <button
                    onClick={() => setMedications(medications.filter((_, i) => i !== idx))}
                    className="p-1 rounded hover:bg-gray-200"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: theme.text.secondary }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
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

export default HealthProfileModal;

