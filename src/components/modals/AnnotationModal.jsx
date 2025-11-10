// Annotation Modal - Add notes to timeline periods
import React, { useState } from 'react';
import { X, Save, Tag } from 'lucide-react';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155' },
  accent: { primary: '#0ea5e9' }
};

const tags = ['sick', 'travel', 'stress', 'holiday', 'work', 'exercise', 'diet', 'other'];

const AnnotationModal = ({ isOpen, onClose, onSave }) => {
  const [note, setNote] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  if (!isOpen) return null;

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSave = () => {
    if (!note.trim()) {
      alert('Please enter a note');
      return;
    }

    onSave({
      note: note.trim(),
      tags: selectedTags,
      timestamp: new Date()
    });

    setNote('');
    setSelectedTags([]);
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
          <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>Add Note</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: theme.text.secondary }} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary }}
              rows="4"
              placeholder="Enter your note..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: theme.text.secondary }}>
              <Tag className="w-4 h-4" />
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    selectedTags.includes(tag) ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: selectedTags.includes(tag) ? theme.accent.primary : '#f0f9ff',
                    color: selectedTags.includes(tag) ? 'white' : theme.text.secondary
                  }}
                >
                  {tag.charAt(0).toUpperCase() + tag.slice(1)}
                </button>
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

export default AnnotationModal;

