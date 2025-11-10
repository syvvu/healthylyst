// Connection Modal - OAuth flow and connection instructions
import React, { useState } from 'react';
import { X, Check, ExternalLink, Loader2 } from 'lucide-react';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155' },
  accent: { primary: '#0ea5e9' }
};

const ConnectionModal = ({ isOpen, onClose, source, onConnect }) => {
  const [connecting, setConnecting] = useState(false);
  const [step, setStep] = useState(1);

  if (!isOpen || !source) return null;

  const handleConnect = async () => {
    setConnecting(true);
    // Simulate OAuth flow
    await new Promise(resolve => setTimeout(resolve, 2000));
    setConnecting(false);
    setStep(2);
    setTimeout(() => {
      onConnect(source.id);
    }, 1000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        style={{ borderColor: theme.border.primary, borderWidth: '1px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.primary }}>
          <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>
            Connect {source.name}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: theme.text.secondary }} />
          </button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: theme.text.secondary }}>
                You will be redirected to {source.name} to authorize data access. 
                We only request read-only access to your health data.
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-medium mb-2" style={{ color: theme.text.primary }}>
                  Data we'll sync:
                </p>
                <ul className="text-xs space-y-1" style={{ color: theme.text.secondary }}>
                  {source.dataCategories && source.dataCategories.length > 0 ? (
                    source.dataCategories.map(cat => (
                      <li key={cat}>• {cat.charAt(0).toUpperCase() + cat.slice(1)}</li>
                    ))
                  ) : (
                    <li>• No specific data categories defined</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-4">
              <Check className="w-12 h-12 mx-auto mb-4" style={{ color: '#10b981' }} />
              <p className="font-medium" style={{ color: theme.text.primary }}>
                Successfully connected!
              </p>
              <p className="text-sm mt-2" style={{ color: theme.text.secondary }}>
                Your data will start syncing automatically.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex gap-3" style={{ borderColor: theme.border.primary }}>
          {step === 1 && (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border"
                style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 whitespace-nowrap"
                style={{ backgroundColor: theme.accent.primary, color: 'white' }}
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    <span>Continue to {source.name}</span>
                  </>
                )}
              </button>
            </>
          )}
          {step === 2 && (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 rounded-lg"
              style={{ backgroundColor: theme.accent.primary, color: 'white' }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionModal;

