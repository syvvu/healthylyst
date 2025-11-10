// Enhanced Health Timeline Component
// Shows last 48 hours as connected cards with specific events

import React, { useState, useEffect } from 'react';
import { getDataForDate, getAvailableDates } from '../utils/dataLoader';
import { format, subDays } from 'date-fns';

const theme = {
  background: { card: '#ffffff' },
  border: { primary: '#bae6fd' },
  text: { primary: '#0c4a6e', secondary: '#334155', tertiary: '#64748b' },
  accent: { 
    sleep: '#8b5cf6',
    activity: '#10b981',
    meal: '#f59e0b',
    stress: '#f43f5e',
    vitals: '#0ea5e9'
  }
};

// Helper to convert time to minutes for sorting (handles both formats)
const timeToMinutesForSort = (timeStr) => {
  if (!timeStr) return 9999;
  
  // Handle "HH:MM" format (24-hour, e.g., "13:45" or "06:15")
  if (typeof timeStr === 'string' && timeStr.includes(':')) {
    const [h, m] = timeStr.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      return h * 60 + m;
    }
  }
  
  // Handle numeric hour (e.g., 13.75 = 13 hours 45 minutes)
  const hour = typeof timeStr === 'string' ? parseFloat(timeStr) : timeStr;
  if (!isNaN(hour)) {
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    return h * 60 + m;
  }
  
  return 9999; // Default to end
};

// Helper to format time from hour string (e.g., "13:45" or "13.75")
const formatTimeFromHour = (timeStr) => {
    if (!timeStr) return null;
    
    // Handle "HH:MM" format (e.g., "13:45")
    if (typeof timeStr === 'string' && timeStr.includes(':')) {
      const [h, m] = timeStr.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return timeStr; // Return as-is if can't parse
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
    }
    
    // Handle numeric hour (e.g., 13.75 = 1:45 PM)
    const hour = typeof timeStr === 'string' ? parseFloat(timeStr) : timeStr;
    if (isNaN(hour)) return null;
    const h = Math.floor(hour);
    const m = Math.round((hour - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

// Helper to get time of day label
const getTimeOfDay = (timeStr) => {
    if (!timeStr) return 'Unknown';
    const hour = typeof timeStr === 'string' && timeStr.includes(':') 
      ? parseInt(timeStr.split(':')[0])
      : Math.floor(parseFloat(timeStr));
    if (hour < 6) return 'Early Morning';
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    if (hour < 21) return 'Evening';
    return 'Night';
};

const HealthTimeline = ({ allHealthData, selectedDate }) => {
  const [timelineEvents, setTimelineEvents] = useState([]);

  useEffect(() => {
    if (!allHealthData || !selectedDate) return;

    const events = generateTimelineEvents(allHealthData, selectedDate);
    setTimelineEvents(events);
  }, [allHealthData, selectedDate]);

  const generateTimelineEvents = (data, endDate) => {
    const events = [];
    const today = new Date(endDate);
    const yesterday = subDays(today, 1);
    
    const todayStr = format(today, 'yyyy-MM-dd');
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    
    const todayData = getDataForDate(data, todayStr);
    const yesterdayData = getDataForDate(data, yesterdayStr);

    // YESTERDAY EVENTS
    
    // Yesterday Morning - Woke Up
    if (yesterdayData.sleep?.wake_time) {
      const wakeTime = formatTimeFromHour(yesterdayData.sleep.wake_time) || '6:30 AM';
      const rawTime = yesterdayData.sleep.wake_time;
      events.push({
        id: 'yesterday-morning',
        period: 'Yesterday Morning',
        time: wakeTime,
        rawTime: rawTime, // Store raw time for sorting
        date: yesterdayStr,
        icon: '☀️',
        title: 'Woke Up',
        bgColor: '#FEF9C3',
        metrics: {
          sleep: `${yesterdayData.sleep.sleep_duration_hours?.toFixed(1) || 0} hrs`,
          quality: `${yesterdayData.sleep.sleep_quality_score || 0}/100`,
          energy: `${yesterdayData.wellness?.energy_level || 0}/10`
        },
        status: 'good',
        sortOrder: 1
      });
    }

    // Yesterday - Breakfast
    if (yesterdayData.nutrition?.breakfast_time) {
      const breakfastTime = formatTimeFromHour(yesterdayData.nutrition.breakfast_time);
      if (breakfastTime) {
        events.push({
          id: 'yesterday-breakfast',
          period: 'Yesterday Morning',
          time: breakfastTime,
          rawTime: yesterdayData.nutrition.breakfast_time,
          date: yesterdayStr,
          icon: '🍳',
          title: 'Breakfast',
          bgColor: '#FFF7ED',
          metrics: {
            calories: `${yesterdayData.nutrition.breakfast_calories || 0} cal`
          },
          status: 'good',
          sortOrder: 2
        });
      }
    }

    // Yesterday - Caffeine
    if (yesterdayData.nutrition?.caffeine_last_time && yesterdayData.nutrition?.caffeine_cups) {
      const caffeineTime = formatTimeFromHour(yesterdayData.nutrition.caffeine_last_time);
      const caffeineCups = yesterdayData.nutrition.caffeine_cups || 0;
      if (caffeineTime && caffeineCups > 0) {
        const hour = typeof yesterdayData.nutrition.caffeine_last_time === 'string' 
          ? parseInt(yesterdayData.nutrition.caffeine_last_time.split(':')[0])
          : Math.floor(parseFloat(yesterdayData.nutrition.caffeine_last_time));
        const isWithinCutoff = hour < 15; // Before 3 PM
        
        const timeOfDay = getTimeOfDay(yesterdayData.nutrition.caffeine_last_time);
        events.push({
          id: 'yesterday-caffeine',
          period: `Yesterday ${timeOfDay}`,
          time: caffeineTime,
          rawTime: yesterdayData.nutrition.caffeine_last_time,
          date: yesterdayStr,
          icon: '☕',
          title: 'Caffeine',
          bgColor: '#FFF7ED',
          metrics: {
            amount: `${caffeineCups} cup${caffeineCups !== 1 ? 's' : ''}`,
            status: isWithinCutoff ? '✓ Before cutoff' : '⚠️ After cutoff'
          },
          status: isWithinCutoff ? 'good' : 'warning',
          sortOrder: 3
        });
      }
    }

    // Yesterday - Lunch
    if (yesterdayData.nutrition?.lunch_time) {
      const lunchTime = formatTimeFromHour(yesterdayData.nutrition.lunch_time);
      if (lunchTime) {
        events.push({
          id: 'yesterday-lunch',
          period: 'Yesterday Afternoon',
          time: lunchTime,
          rawTime: yesterdayData.nutrition.lunch_time,
          date: yesterdayStr,
          icon: '🍽️',
          title: 'Lunch',
          bgColor: '#FFF7ED',
          metrics: {
            calories: `${yesterdayData.nutrition.lunch_calories || 0} cal`
          },
          status: 'good',
          sortOrder: 4
        });
      }
    }

    // Yesterday - Exercise
    if (yesterdayData.activity?.workout_start_time || yesterdayData.activity?.exercise_minutes) {
      const workoutTime = yesterdayData.activity.workout_start_time 
        ? formatTimeFromHour(yesterdayData.activity.workout_start_time)
        : null;
      const exerciseMinutes = yesterdayData.activity.exercise_minutes || 0;
      const workoutType = yesterdayData.activity.workout_type || 'Exercise';
      
      if (workoutTime || exerciseMinutes > 0) {
        const timeOfDay = workoutTime ? getTimeOfDay(yesterdayData.activity.workout_start_time) : 'Day';
        events.push({
          id: 'yesterday-exercise',
          period: `Yesterday ${timeOfDay}`,
          time: workoutTime || 'Exercise',
          rawTime: yesterdayData.activity.workout_start_time || null,
          date: yesterdayStr,
          icon: workoutType?.toLowerCase().includes('strength') ? '🏋️' : '🏃',
          title: workoutType,
          bgColor: '#F0FDF4',
          metrics: {
            duration: `${exerciseMinutes} min`,
            intensity: yesterdayData.activity.workout_intensity || 'Moderate'
          },
          status: 'good',
          sortOrder: 5
        });
      }
    }

    // Yesterday - Dinner
    if (yesterdayData.nutrition?.dinner_time) {
      const dinnerTime = formatTimeFromHour(yesterdayData.nutrition.dinner_time);
      if (dinnerTime) {
        events.push({
          id: 'yesterday-dinner',
          period: 'Yesterday Evening',
          time: dinnerTime,
          rawTime: yesterdayData.nutrition.dinner_time,
          date: yesterdayStr,
          icon: '🍽️',
          title: 'Dinner',
          bgColor: '#FFF7ED',
          metrics: {
            calories: `${yesterdayData.nutrition.dinner_calories || 0} cal`
          },
          status: 'good',
          sortOrder: 6
        });
      }
    }

    // Last Night - Sleep (bedtime from last night, which is yesterday evening)
    if (todayData.sleep?.bedtime) {
      const bedtime = formatTimeFromHour(todayData.sleep.bedtime);
      const wakeTime = todayData.sleep.wake_time ? formatTimeFromHour(todayData.sleep.wake_time) : null;
      const sleepDuration = todayData.sleep.sleep_duration_hours || 0;
      
      if (bedtime) {
        // Bedtime is from last night, so it belongs to yesterday's date
        events.push({
          id: 'last-night',
          period: 'Yesterday Evening',
          time: bedtime,
          rawTime: todayData.sleep.bedtime,
          date: yesterdayStr, // Bedtime is from last night (yesterday)
          icon: '🌙',
          title: 'Bedtime',
          bgColor: '#EFF6FF',
          metrics: {
            duration: `${sleepDuration.toFixed(1)} hrs`,
            quality: `${todayData.sleep.sleep_quality_score || 0}/100`,
            wakeTime: wakeTime || 'N/A'
          },
          status: 'good',
          sortOrder: 7
        });
      }
    }

    // TODAY EVENTS
    
    // Today Morning - Woke Up
    if (todayData.sleep?.wake_time) {
      const wakeTime = formatTimeFromHour(todayData.sleep.wake_time);
      if (wakeTime) {
        events.push({
          id: 'today-morning',
          period: 'Today Morning',
          time: wakeTime,
          rawTime: todayData.sleep.wake_time,
          date: todayStr,
          icon: '☀️',
          title: 'Woke Up',
          bgColor: '#FEF9C3',
          metrics: {
            energy: `${todayData.wellness?.energy_level || 0}/10`,
            mood: `${todayData.wellness?.mood_score || 0}/10`,
            sleep: `${todayData.sleep.sleep_duration_hours?.toFixed(1) || 0} hrs`
          },
          status: 'good',
          sortOrder: 8
        });
      }
    }

    // Today - Breakfast
    if (todayData.nutrition?.breakfast_time) {
      const breakfastTime = formatTimeFromHour(todayData.nutrition.breakfast_time);
      if (breakfastTime) {
        events.push({
          id: 'today-breakfast',
          period: 'Today Morning',
          time: breakfastTime,
          rawTime: todayData.nutrition.breakfast_time,
          date: todayStr,
          icon: '🍳',
          title: 'Breakfast',
          bgColor: '#FFF7ED',
          metrics: {
            calories: `${todayData.nutrition.breakfast_calories || 0} cal`
          },
          status: 'good',
          sortOrder: 9
        });
      }
    }

    // Today - Caffeine
    if (todayData.nutrition?.caffeine_last_time && todayData.nutrition?.caffeine_cups) {
      const caffeineTime = formatTimeFromHour(todayData.nutrition.caffeine_last_time);
      const caffeineCups = todayData.nutrition.caffeine_cups || 0;
      if (caffeineTime && caffeineCups > 0) {
        const hour = typeof todayData.nutrition.caffeine_last_time === 'string' 
          ? parseInt(todayData.nutrition.caffeine_last_time.split(':')[0])
          : Math.floor(parseFloat(todayData.nutrition.caffeine_last_time));
        const isWithinCutoff = hour < 15;
        
        const timeOfDay = getTimeOfDay(todayData.nutrition.caffeine_last_time);
        events.push({
          id: 'today-caffeine',
          period: `Today ${timeOfDay}`,
          time: caffeineTime,
          rawTime: todayData.nutrition.caffeine_last_time,
          date: todayStr,
          icon: '☕',
          title: 'Caffeine',
          bgColor: '#FFF7ED',
          metrics: {
            amount: `${caffeineCups} cup${caffeineCups !== 1 ? 's' : ''}`,
            status: isWithinCutoff ? '✓ Before cutoff' : '⚠️ After cutoff'
          },
          status: isWithinCutoff ? 'good' : 'warning',
          sortOrder: 10
        });
      }
    }

    // Today - Lunch
    if (todayData.nutrition?.lunch_time) {
      const lunchTime = formatTimeFromHour(todayData.nutrition.lunch_time);
      if (lunchTime) {
        events.push({
          id: 'today-lunch',
          period: 'Today Afternoon',
          time: lunchTime,
          rawTime: todayData.nutrition.lunch_time,
          date: todayStr,
          icon: '🍽️',
          title: 'Lunch',
          bgColor: '#FFF7ED',
          metrics: {
            calories: `${todayData.nutrition.lunch_calories || 0} cal`
          },
          status: 'good',
          sortOrder: 11
        });
      }
    }

    // Today - Exercise
    if (todayData.activity?.workout_start_time || todayData.activity?.exercise_minutes) {
      const workoutTime = todayData.activity.workout_start_time 
        ? formatTimeFromHour(todayData.activity.workout_start_time)
        : null;
      const exerciseMinutes = todayData.activity.exercise_minutes || 0;
      const workoutType = todayData.activity.workout_type || 'Exercise';
      
      if (workoutTime || exerciseMinutes > 0) {
        const timeOfDay = workoutTime ? getTimeOfDay(todayData.activity.workout_start_time) : 'Day';
        events.push({
          id: 'today-exercise',
          period: `Today ${timeOfDay}`,
          time: workoutTime || 'Exercise',
          rawTime: todayData.activity.workout_start_time || null,
          date: todayStr,
          icon: workoutType?.toLowerCase().includes('strength') ? '🏋️' : '🏃',
          title: workoutType,
          bgColor: '#F0FDF4',
          metrics: {
            duration: `${exerciseMinutes} min`,
            steps: todayData.activity.steps ? `${(todayData.activity.steps / 1000).toFixed(1)}k` : null
          },
          status: 'good',
          sortOrder: 12
        });
      }
    }

    // Today - Summary (only if we have activity data)
    if (todayData.activity?.steps || todayData.nutrition?.calories) {
      const hasRelevantData = (todayData.activity?.steps > 0) || (todayData.nutrition?.calories > 0);
      if (hasRelevantData) {
        const metrics = {};
        if (todayData.activity?.steps) {
          metrics.steps = `${todayData.activity.steps.toLocaleString()}`;
        }
        if (todayData.nutrition?.calories) {
          metrics.calories = `${todayData.nutrition.calories}`;
        }
        // Only add water if > 0
        if (todayData.nutrition?.water_glasses > 0) {
          metrics.water = `${todayData.nutrition.water_glasses} glasses`;
        }
        
        if (Object.keys(metrics).length > 0) {
          events.push({
            id: 'today-summary',
            period: 'Today',
            time: 'Current',
            date: todayStr,
            icon: '📊',
            title: 'So Far Today',
            bgColor: '#FFFFFF',
            metrics: metrics,
            status: 'in-progress',
            sortOrder: 99
          });
        }
      }
    }

    // Sort events chronologically: first by date (yesterday before today), then by raw time from CSV
    return events.sort((a, b) => {
      // Compare dates first (yesterday comes before today)
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      
      // If same date, sort by raw time from CSV (more reliable than formatted time)
      const timeA = a.rawTime ? timeToMinutesForSort(a.rawTime) : 9999;
      const timeB = b.rawTime ? timeToMinutesForSort(b.rawTime) : 9999;
      
      // If both have rawTime, sort by that
      if (a.rawTime && b.rawTime) {
        return timeA - timeB;
      }
      
      // If one has rawTime and other doesn't, put the one with rawTime first
      if (a.rawTime && !b.rawTime) return -1;
      if (!a.rawTime && b.rawTime) return 1;
      
      // If neither has rawTime (like "Current" or "Exercise"), keep original order
      return 0;
    });
  };

  if (!timelineEvents || timelineEvents.length === 0) {
    return (
      <div className="p-6 rounded-xl border text-center"
           style={{
             backgroundColor: theme.background.card,
             borderColor: theme.border.primary
           }}>
        <p style={{ color: theme.text.secondary }}>
          No timeline data available for the last 48 hours
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Connected Cards Timeline */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
          {timelineEvents.map((event, idx) => (
            <React.Fragment key={event.id}>
              <div
                className="flex-shrink-0 w-48"
              >
                <div 
                  className="rounded-xl p-4 border-2 h-full relative"
                  style={{ 
                    backgroundColor: event.bgColor,
                    borderColor: theme.border.primary,
                    borderWidth: '2px'
                  }}
                >
                  {/* Period Label */}
                  <div className="text-xs mb-1" style={{ color: theme.text.tertiary }}>
                    {event.period}
                  </div>
                  
                  {/* Time Display */}
                  <div className="text-xs font-semibold mb-2" style={{ color: theme.text.primary }}>
                    {event.time}
                  </div>
                  
                  {/* Icon */}
                  <div className="text-3xl mb-2">{event.icon}</div>
                  
                  {/* Title */}
                  <p className="text-sm font-bold mb-3" style={{ color: theme.text.primary }}>
                    {event.title}
                  </p>
                  
                  {/* Metrics */}
                  <div className="space-y-1 mb-3">
                    {Object.entries(event.metrics)
                      .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                      .map(([key, value]) => (
                        <div key={key} className="text-xs" style={{ color: theme.text.secondary }}>
                          <span className="font-semibold capitalize">{key}:</span> {value}
                        </div>
                      ))}
                  </div>
                  
                  {/* Status Dot */}
                  <div className="absolute top-2 right-2">
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        event.status === 'in-progress' ? 'animate-pulse' : ''
                      }`}
                      style={{ 
                        backgroundColor: event.status === 'in-progress' 
                          ? theme.accent.primary 
                          : theme.accent.success
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Connecting Line */}
              {idx < timelineEvents.length - 1 && (
                <div className="flex-shrink-0 flex items-center" style={{ width: '40px' }}>
                  <div className="w-full border-t-2 border-dashed" style={{ borderColor: theme.text.tertiary }}>
                    <div className="text-center text-xs mt-1" style={{ color: theme.text.tertiary }}>
                      ↓
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HealthTimeline;
