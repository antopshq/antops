import React from 'react'
import { AlertTriangle, Wrench, AlertCircle } from 'lucide-react'

// ITIL Item Types
export type ITILItemType = 'incident' | 'problem' | 'change'

// Color configurations for each ITIL item type
export const ITIL_COLORS = {
  incident: {
    // Orange theme
    primary: 'orange-500',
    light: 'orange-50',
    medium: 'orange-100',
    dark: 'orange-600',
    text: 'orange-700',
    border: 'orange-200',
    bg: 'bg-orange-50',
    text_class: 'text-orange-700',
    border_class: 'border-orange-200',
    hover: 'hover:bg-orange-100',
    ring: 'focus:ring-orange-200',
    gradient: 'from-orange-500 to-orange-600'
  },
  problem: {
    // Red theme
    primary: 'red-500',
    light: 'red-50',
    medium: 'red-100',
    dark: 'red-600',
    text: 'red-700',
    border: 'red-200',
    bg: 'bg-red-50',
    text_class: 'text-red-700',
    border_class: 'border-red-200',
    hover: 'hover:bg-red-100',
    ring: 'focus:ring-red-200',
    gradient: 'from-red-500 to-red-600'
  },
  change: {
    // Purple theme
    primary: 'purple-500',
    light: 'purple-50',
    medium: 'purple-100',
    dark: 'purple-600',
    text: 'purple-700',
    border: 'purple-200',
    bg: 'bg-purple-50',
    text_class: 'text-purple-700',
    border_class: 'border-purple-200',
    hover: 'hover:bg-purple-100',
    ring: 'focus:ring-purple-200',
    gradient: 'from-purple-500 to-purple-600'
  }
} as const

// Get color classes for badges
export function getITILBadgeClasses(type: ITILItemType): string {
  const colors = ITIL_COLORS[type]
  return `bg-${colors.light} text-${colors.text} border-${colors.border}`
}

// Get full color classes for cards/containers
export function getITILCardClasses(type: ITILItemType): string {
  const colors = ITIL_COLORS[type]
  return `bg-${colors.light} border-${colors.border}`
}

// Get button/interactive element classes
export function getITILButtonClasses(type: ITILItemType): string {
  const colors = ITIL_COLORS[type]
  return `bg-${colors.primary} hover:bg-${colors.dark} text-white`
}

// Get text color class
export function getITILTextClass(type: ITILItemType): string {
  return ITIL_COLORS[type].text_class
}

// Get background color class
export function getITILBgClass(type: ITILItemType): string {
  return ITIL_COLORS[type].bg
}

// Get border color class
export function getITILBorderClass(type: ITILItemType): string {
  return ITIL_COLORS[type].border_class
}

// Get hover class
export function getITILHoverClass(type: ITILItemType): string {
  return ITIL_COLORS[type].hover
}

// Get icon component for each type
export function getITILIcon(type: ITILItemType, className?: string): React.ReactElement {
  const iconProps = { className: className || 'w-4 h-4' }
  
  switch (type) {
    case 'incident':
      return React.createElement(AlertTriangle, iconProps)
    case 'problem':
      return React.createElement(AlertCircle, iconProps)
    case 'change':
      return React.createElement(Wrench, iconProps)
    default:
      return React.createElement(AlertTriangle, iconProps)
  }
}

// Get display name for each type
export function getITILDisplayName(type: ITILItemType): string {
  switch (type) {
    case 'incident':
      return 'Incident'
    case 'problem':
      return 'Problem'
    case 'change':
      return 'Change'
    default:
      return 'Item'
  }
}

// Get plural display name for each type
export function getITILPluralName(type: ITILItemType): string {
  switch (type) {
    case 'incident':
      return 'Incidents'
    case 'problem':
      return 'Problems'
    case 'change':
      return 'Changes'
    default:
      return 'Items'
  }
}