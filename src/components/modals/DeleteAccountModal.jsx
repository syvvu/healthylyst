// Delete Account Confirmation Modal
import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155' },
  accent: { primary: '#0ea5e9', danger: '#f43f5e' }
};

const DeleteAccountModal = ({ isOpen, onClose, onConfirm }) => {
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

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
          <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>Delete Account</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: theme.text.secondary }} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: theme.accent.danger }} />
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              This action cannot be undone. All your health data, insights, and account information will be permanently deleted.
            </p>
          </div>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm" style={{ color: theme.text.secondary }}>
              I understand my data will be permanently deleted
            </span>
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
            onClick={onConfirm}
            disabled={!confirmed}
            className="flex-1 px-4 py-2 rounded-lg disabled:opacity-50"
            style={{ backgroundColor: theme.accent.danger, color: 'white' }}
          >
            Delete Forever
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;

