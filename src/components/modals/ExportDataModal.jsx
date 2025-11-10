// Export Data Modal - For exporting metric data
import React, { useState } from 'react';
import { X, Download, Calendar } from 'lucide-react';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155', tertiary: '#64748b' },
  accent: { primary: '#0ea5e9' }
};

const ExportDataModal = ({ isOpen, onClose, metricName, chartData, onExport }) => {
  const [dateRange, setDateRange] = useState('all');
  const [format, setFormat] = useState('csv');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  if (!isOpen) return null;

  const handleExport = () => {
    let startDate = null;
    let endDate = null;

    if (dateRange === 'custom') {
      if (!customStart || !customEnd) {
        alert('Please select both start and end dates');
        return;
      }
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else {
      const dates = chartData.map(d => new Date(d.fullDate)).sort((a, b) => a - b);
      if (dates.length === 0) {
        alert('No data available to export');
        return;
      }
      
      const today = new Date();
      switch (dateRange) {
        case '7D':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 7);
          endDate = today;
          break;
        case '30D':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 30);
          endDate = today;
          break;
        case '90D':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 90);
          endDate = today;
          break;
        default: // all
          startDate = dates[0];
          endDate = dates[dates.length - 1];
      }
    }

    const filteredData = chartData.filter(d => {
      const date = new Date(d.fullDate);
      return date >= startDate && date <= endDate;
    });

    if (onExport) {
      onExport({
        metricName,
        data: filteredData,
        format,
        startDate,
        endDate
      });
    }

    onClose();
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
          <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>Export Data</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: theme.text.secondary }} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Date Range Selector */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2" style={{ color: theme.text.secondary }}>
              <Calendar className="w-4 h-4" />
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary }}
            >
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
              <option value="90D">Last 90 Days</option>
              <option value="all">All Data</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ borderColor: theme.border.primary }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border"
                  style={{ borderColor: theme.border.primary }}
                />
              </div>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text.secondary }}>
              Format
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm" style={{ color: theme.text.primary }}>CSV</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-sm" style={{ color: theme.text.primary }}>PDF</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex gap-3" style={{ borderColor: theme.border.primary }}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border font-medium transition-all"
            style={{ 
              borderColor: theme.border.primary,
              color: theme.text.secondary
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            style={{ 
              backgroundColor: theme.accent.primary,
              color: 'white'
            }}
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDataModal;

