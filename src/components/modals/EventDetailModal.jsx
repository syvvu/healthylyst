// Event Detail Modal - Shows details when clicking timeline event
import React from 'react';
import { X, Clock, TrendingUp, Info } from 'lucide-react';

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

const EventDetailModal = ({ event, onClose, allHealthData }) => {
  if (!event) return null;

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
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.primary }}>
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: event.color || theme.accent.primary + '20' }}
            >
              <Clock className="w-5 h-5" style={{ color: event.color || theme.accent.primary }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>
                {event.title || event.type}
              </h2>
              <p className="text-sm" style={{ color: theme.text.secondary }}>
                {event.timestamp ? new Date(event.timestamp).toLocaleString() : event.time}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all"
            style={{ color: theme.text.secondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Value */}
          {event.value !== undefined && (
            <div>
              <p className="text-sm mb-1" style={{ color: theme.text.secondary }}>Value</p>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                {event.value} {event.unit || ''}
              </p>
            </div>
          )}

          {/* Related Metrics */}
          {event.correlations && event.correlations.length > 0 && (
            <div>
              <p className="text-sm mb-2 font-medium" style={{ color: theme.text.secondary }}>
                Related Metrics
              </p>
              <div className="space-y-2">
                {event.correlations.map((corr, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg"
                    style={{ backgroundColor: theme.accent.primary + '10' }}
                  >
                    <TrendingUp className="w-4 h-4" style={{ color: theme.accent.primary }} />
                    <span className="text-sm" style={{ color: theme.text.primary }}>
                      {corr.metric} ({corr.category})
                    </span>
                    <span className="text-xs ml-auto" style={{ color: theme.text.secondary }}>
                      {corr.direction === 'positive' ? '+' : '-'}
                      {(Math.abs(corr.correlation) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div>
              <p className="text-sm mb-2 font-medium" style={{ color: theme.text.secondary }}>
                Notes
              </p>
              <p className="text-sm" style={{ color: theme.text.primary }}>
                {event.notes}
              </p>
            </div>
          )}

          {/* Additional Info */}
          {event.details && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" style={{ color: theme.text.secondary }} />
                <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>
                  Additional Information
                </p>
              </div>
              <div className="space-y-1">
                {Object.entries(event.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span style={{ color: theme.text.secondary }}>{key}:</span>
                    <span style={{ color: theme.text.primary }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t" style={{ borderColor: theme.border.primary }}>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg font-medium transition-all"
            style={{ 
              backgroundColor: theme.accent.primary,
              color: 'white'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal;

