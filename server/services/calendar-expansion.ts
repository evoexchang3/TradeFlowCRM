import type { CalendarEvent } from '@shared/schema';

export interface ExpandedEventInstance extends CalendarEvent {
  instanceDate?: Date;
  isInstance?: boolean;
}

/**
 * Expand a recurring event into individual instances within a date range
 */
export function expandRecurringEvent(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date
): ExpandedEventInstance[] {
  // Non-recurring events return as-is
  if (!event.isRecurring || !event.recurrencePattern) {
    return [event];
  }

  const pattern = event.recurrencePattern as {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    daysOfWeek?: number[];
    endDate?: string;
    count?: number;
  };

  const instances: ExpandedEventInstance[] = [];
  const eventStart = new Date(event.startTime);
  const eventEnd = new Date(event.endTime);
  const duration = eventEnd.getTime() - eventStart.getTime();

  // Determine recurrence end
  let recurrenceEnd = rangeEnd;
  if (pattern.endDate) {
    const patternEnd = new Date(pattern.endDate);
    if (patternEnd < recurrenceEnd) {
      recurrenceEnd = patternEnd;
    }
  }

  // Get exceptions - support both legacy (YYYY-MM-DD) and new (ISO timestamp) formats
  const rawExceptions = ((event.recurrenceExceptions as string[]) || []);
  
  // Helper to check if a date should be excluded
  const isExcluded = (candidateISO: string): boolean => {
    // Check if exact ISO timestamp matches (new format)
    if (rawExceptions.includes(candidateISO)) {
      return true;
    }
    
    // Check if date portion matches any legacy date-only exception (YYYY-MM-DD)
    const candidateDate = candidateISO.split('T')[0];
    return rawExceptions.includes(candidateDate);
  };

  let instanceCount = 0;
  const maxCount = pattern.count || 365; // Max 365 instances to prevent infinite loops

  if (pattern.frequency === 'weekly' && pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
    // Special handling for weekly recurrence with day-of-week filtering
    // Iterate by weeks, then check each day in the week
    const weekStart = new Date(eventStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    
    let currentWeekStart = new Date(weekStart);
    
    while (currentWeekStart <= recurrenceEnd && instanceCount < maxCount) {
      // For each selected day of week in this week
      for (const targetDayOfWeek of pattern.daysOfWeek) {
        const candidateDate = new Date(currentWeekStart);
        candidateDate.setDate(candidateDate.getDate() + targetDayOfWeek);
        
        // Only include if:
        // 1. On or after the original event start
        // 2. Within the recurrence end date
        // 3. Within the requested range
        // 4. Not in exceptions list
        if (candidateDate >= eventStart && 
            candidateDate <= recurrenceEnd &&
            candidateDate >= rangeStart && 
            candidateDate <= rangeEnd) {
          // Check if this instance should be excluded (supports both legacy and new formats)
          const dateKey = candidateDate.toISOString();
          if (!isExcluded(dateKey)) {
            instances.push(createInstance(event, candidateDate, duration));
            instanceCount++;
            if (instanceCount >= maxCount) break;
          }
        }
      }
      
      // Move to next week (respecting interval)
      currentWeekStart.setDate(currentWeekStart.getDate() + (7 * pattern.interval));
      
      // Safety: if we've gone too far into the future, break
      if (currentWeekStart.getFullYear() > rangeEnd.getFullYear() + 10) {
        break;
      }
    }
  } else {
    // Daily and monthly recurrence (original logic)
    let currentDate = new Date(eventStart);
    
    while (currentDate <= recurrenceEnd && instanceCount < maxCount) {
      // Check if current instance falls within the requested range
      if (currentDate >= rangeStart && currentDate <= recurrenceEnd) {
        // Check if this instance should be excluded (supports both legacy and new formats)
        const dateKey = currentDate.toISOString();
        
        // Skip if in exceptions list
        if (!isExcluded(dateKey)) {
          instances.push(createInstance(event, currentDate, duration));
          instanceCount++;
        }
      }

      // Move to next occurrence
      currentDate = getNextOccurrence(currentDate, pattern.frequency, pattern.interval);
      
      // Safety: if we've gone too far into the future, break
      if (currentDate.getFullYear() > rangeEnd.getFullYear() + 10) {
        break;
      }
    }
  }

  return instances;
}

/**
 * Create an instance of a recurring event at a specific date
 */
function createInstance(
  baseEvent: CalendarEvent,
  instanceDate: Date,
  duration: number
): ExpandedEventInstance {
  const instanceStart = new Date(instanceDate);
  const instanceEnd = new Date(instanceDate.getTime() + duration);

  return {
    ...baseEvent,
    id: `${baseEvent.id}_${instanceDate.toISOString()}`, // Unique ID for instance
    startTime: instanceStart,
    endTime: instanceEnd,
    instanceDate: instanceDate,
    isInstance: true,
  };
}

/**
 * Get the next occurrence date based on frequency and interval
 */
function getNextOccurrence(
  currentDate: Date,
  frequency: 'daily' | 'weekly' | 'monthly',
  interval: number
): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * interval));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
  }

  return next;
}

/**
 * Expand all events in a list, handling both recurring and non-recurring
 */
export function expandEventsList(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): ExpandedEventInstance[] {
  const expanded: ExpandedEventInstance[] = [];

  for (const event of events) {
    const instances = expandRecurringEvent(event, rangeStart, rangeEnd);
    expanded.push(...instances);
  }

  // Sort by start time
  expanded.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return expanded;
}
