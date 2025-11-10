// Calendar Modal - Date range picker
import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155' },
  accent: { primary: '#0ea5e9' }
};

const CalendarModal = ({ isOpen, onClose, onApply }) => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selecting, setSelecting] = useState('start');

  if (!isOpen) return null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleDateClick = (date) => {
    if (selecting === 'start') {
      setStartDate(date);
      setSelecting('end');
    } else {
      if (date < startDate) {
        setStartDate(date);
        setEndDate(startDate);
      } else {
        setEndDate(date);
      }
    }
  };

  const handleApply = () => {
    onApply(startDate, endDate);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-24"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        style={{ borderColor: theme.border.primary, borderWidth: '1px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.primary }}>
          <h2 className="text-lg font-bold" style={{ color: theme.text.primary }}>Select Date Range</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" style={{ color: theme.text.secondary }} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium" style={{ color: theme.text.secondary }}>
                {day}
              </div>
            ))}
            {days.map(day => {
              const isSelected = isSameDay(day, startDate) || isSameDay(day, endDate);
              const isInRange = day >= startDate && day <= endDate;
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  className={`p-2 rounded-lg text-sm ${
                    isSelected ? 'text-white' : ''
                  } ${isInRange ? 'bg-blue-100' : ''}`}
                  style={{
                    backgroundColor: isSelected ? theme.accent.primary : (isInRange ? '#e0f2fe' : 'transparent'),
                    color: isSelected ? 'white' : theme.text.primary
                  }}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
            >
              Previous
            </button>
            <div className="flex-1 text-center font-medium" style={{ color: theme.text.primary }}>
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="px-4 py-2 rounded-lg border"
              style={{ borderColor: theme.border.primary, color: theme.text.secondary }}
            >
              Next
            </button>
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
            onClick={handleApply}
            className="flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            style={{ backgroundColor: theme.accent.primary, color: 'white' }}
          >
            <Check className="w-4 h-4" />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarModal;

