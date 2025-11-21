import { Criticality, Urgency, Priority } from './types'

/**
 * ITIL Priority Matrix
 * Calculates priority based on criticality and urgency
 */
export function calculatePriority(criticality: Criticality, urgency: Urgency): Priority {
  // ITIL Priority Matrix
  if (criticality === 'critical' && urgency === 'critical') {
    return 'critical'
  }
  
  if ((criticality === 'critical' && urgency === 'high') || 
      (criticality === 'high' && urgency === 'critical')) {
    return 'critical'
  }
  
  if ((criticality === 'critical' && urgency === 'medium') ||
      (criticality === 'medium' && urgency === 'critical') ||
      (criticality === 'high' && urgency === 'high')) {
    return 'high'
  }
  
  if ((criticality === 'critical' && urgency === 'low') ||
      (criticality === 'low' && urgency === 'critical') ||
      (criticality === 'high' && urgency === 'medium') ||
      (criticality === 'medium' && urgency === 'high')) {
    return 'medium'
  }
  
  // All other combinations result in low priority
  return 'low'
}

/**
 * Get color class for criticality
 */
export function getCriticalityColor(criticality: Criticality) {
  switch (criticality) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200'
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

/**
 * Get color class for urgency
 */
export function getUrgencyColor(urgency: Urgency) {
  switch (urgency) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200'
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

/**
 * ITIL Priority Matrix as a visual representation
 */
export const ITIL_PRIORITY_MATRIX = {
  critical: {
    critical: 'critical',
    high: 'critical',
    medium: 'high',
    low: 'medium'
  },
  high: {
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low'
  },
  medium: {
    critical: 'high',
    high: 'medium',
    medium: 'low',
    low: 'low'
  },
  low: {
    critical: 'medium',
    high: 'low',
    medium: 'low',
    low: 'low'
  }
} as const

/**
 * Get the priority matrix explanation
 */
export function getPriorityExplanation(criticality: Criticality, urgency: Urgency): string {
  const priority = calculatePriority(criticality, urgency)
  return `Criticality: ${criticality}, Urgency: ${urgency} → Priority: ${priority}`
}