// Edit Personal Info Modal
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155' },
  accent: { primary: '#0ea5e9' }
};

const EditPersonalInfoModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState(initialData || {
    name: 'Alex Johnson',
    dob: '1992-01-15',
    height: 175,
    weight: 71.7
  });

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
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
          <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>Edit Personal Info</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: theme.text.secondary }} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Date of Birth</label>
            <input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Height (cm)</label>
            <input
              type="number"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>Weight (kg)</label>
            <input
              type="number"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary }}
            />
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

export default EditPersonalInfoModal;

