// Disconnect Confirmation Modal
import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155' },
  accent: { primary: '#0ea5e9', danger: '#f43f5e' }
};

const DisconnectModal = ({ isOpen, onClose, source, onDisconnect }) => {
  if (!isOpen || !source) return null;

  const handleDisconnect = () => {
    onDisconnect(source.id);
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
          <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>
            Disconnect {source.name}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: theme.text.secondary }} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: theme.accent.danger }} />
            <p className="text-sm" style={{ color: theme.text.secondary }}>
              This will stop syncing data from {source.name}. Your existing data will remain, 
              but no new data will be imported.
            </p>
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
            onClick={handleDisconnect}
            className="flex-1 px-4 py-2 rounded-lg"
            style={{ backgroundColor: theme.accent.danger, color: 'white' }}
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisconnectModal;

