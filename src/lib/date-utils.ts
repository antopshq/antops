/**
 * Date and timezone utility functions for the incident management system
 */

/**
 * Convert a datetime-local input value (YYYY-MM-DDTHH:MM) to ISO string
 * This properly handles the user's local timezone
 */
export function datetimeLocalToISO(datetimeLocal: string): string {
  if (!datetimeLocal) return ''
  
  // Add seconds if not present (datetime-local inputs don't include seconds)
  const fullDateTime = datetimeLocal.includes(':') && datetimeLocal.split(':').length === 2
    ? datetimeLocal + ':00'
    : datetimeLocal
  
  // Create Date object from the local datetime string
  // This interprets the string as local time
  const date = new Date(fullDateTime)
  
  return date.toISOString()
}

/**
 * Convert an ISO string to a datetime-local input value (YYYY-MM-DDTHH:MM)
 * This properly converts from UTC to local time for display in the input
 */
export function isoToDatetimeLocal(isoString: string): string {
  if (!isoString) return ''
  
  const date = new Date(isoString)
  
  // Format as YYYY-MM-DDTHH:MM in local timezone
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Format a date string for display in cards (relative format with time)
 */
export function formatScheduledTimeForCard(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  
  // Get start of today and tomorrow for accurate day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  const timeStr = date.toLocaleTimeString(undefined, { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false // Use 24-hour format for consistency
  })
  
  // Calculate difference in actual days
  const diffInDays = Math.round((dateStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays < 0) {
    return `${Math.abs(diffInDays)}d ago`
  } else if (diffInDays === 0) {
    return `Today ${timeStr}`
  } else if (diffInDays === 1) {
    return `Tomorrow ${timeStr}`
  } else if (diffInDays < 7) {
    return `${diffInDays}d ${timeStr}`
  } else {
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    })
  }
}

/**
 * Format a date string for detailed display (full datetime)
 */
export function formatScheduledTimeDetailed(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Check if a scheduled time is urgent (within next 4 hours)
 */
export function isScheduledTimeUrgent(dateString: string): boolean {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60)
  return diffInHours > 0 && diffInHours <= 4
}

/**
 * Check if a scheduled time is soon (within next 24 hours)
 */
export function isScheduledTimeSoon(dateString: string): boolean {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60)
  return diffInHours > 0 && diffInHours <= 24
}

/**
 * Get the urgency level for a scheduled time
 */
export function getScheduledUrgency(dateString?: string): 'urgent' | 'soon' | 'normal' | 'none' {
  if (!dateString) return 'none'
  
  if (isScheduledTimeUrgent(dateString)) return 'urgent'
  if (isScheduledTimeSoon(dateString)) return 'soon'
  return 'normal'
}