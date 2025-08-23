/**
 * Utility functions for handling flexible tags (simple words or key:value format)
 */

export interface ParsedTag {
  key: string
  value?: string
  original: string
  isKeyValue: boolean
}

/**
 * Validates if a tag is valid (can be simple word or key:value format)
 */
export function isValidTag(tag: string): boolean {
  const trimmed = tag.trim()
  if (!trimmed) return false
  
  // Basic validation - must have content and reasonable length
  return trimmed.length > 0 && trimmed.length <= 50 && !trimmed.includes(',')
}

/**
 * Parses a tag string into key and value components (supports both formats)
 */
export function parseTag(tag: string): ParsedTag | null {
  const trimmed = tag.trim()
  if (!isValidTag(trimmed)) return null
  
  const colonIndex = trimmed.indexOf(':')
  
  // Check if it's key:value format
  if (colonIndex !== -1 && trimmed.lastIndexOf(':') === colonIndex) {
    const key = trimmed.substring(0, colonIndex).trim()
    const value = trimmed.substring(colonIndex + 1).trim()
    
    if (key.length > 0 && value.length > 0) {
      return {
        key,
        value,
        original: trimmed,
        isKeyValue: true
      }
    }
  }
  
  // Simple word format
  return {
    key: trimmed,
    original: trimmed,
    isKeyValue: false
  }
}

/**
 * Parses multiple tags from a comma-separated string
 */
export function parseTags(tagsString: string): {
  valid: ParsedTag[]
  invalid: string[]
} {
  if (!tagsString.trim()) {
    return { valid: [], invalid: [] }
  }
  
  const tags = tagsString.split(',').map(t => t.trim()).filter(Boolean)
  const valid: ParsedTag[] = []
  const invalid: string[] = []
  
  for (const tag of tags) {
    const parsed = parseTag(tag)
    if (parsed) {
      valid.push(parsed)
    } else {
      invalid.push(tag)
    }
  }
  
  return { valid, invalid }
}

/**
 * Validates a tags string and returns error message if invalid
 */
export function validateTagsString(tagsString: string): string | null {
  if (!tagsString.trim()) return null
  
  const { invalid } = parseTags(tagsString)
  
  if (invalid.length > 0) {
    return `Invalid tag: "${invalid[0]}". Tags should be simple words or key:value format, separated by commas`
  }
  
  return null
}

/**
 * Converts parsed tags back to string array for API
 */
export function tagsToArray(tagsString: string): string[] {
  const { valid } = parseTags(tagsString)
  return valid.map(tag => tag.original)
}

/**
 * Converts tag array to display string
 */
export function tagsFromArray(tags: string[]): string {
  return tags.join(', ')
}

/**
 * Gets tag color based on key
 */
export function getTagColor(key: string): string {
  const colors: Record<string, string> = {
    // Incident/Problem tags
    'severity': 'bg-red-100 text-red-800 border-red-200',
    'category': 'bg-blue-100 text-blue-800 border-blue-200',
    'component': 'bg-green-100 text-green-800 border-green-200',
    'environment': 'bg-purple-100 text-purple-800 border-purple-200',
    'team': 'bg-orange-100 text-orange-800 border-orange-200',
    'source': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    
    // Change tags
    'type': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'risk': 'bg-red-100 text-red-800 border-red-200',
    'impact': 'bg-pink-100 text-pink-800 border-pink-200',
    'service': 'bg-teal-100 text-teal-800 border-teal-200',
    
    // Common tags
    'priority': 'bg-gray-100 text-gray-800 border-gray-200',
    'status': 'bg-slate-100 text-slate-800 border-slate-200',
  }
  
  return colors[key.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200'
}

/**
 * Example tags for different contexts (mix of simple words and key:value)
 */
export const TAG_EXAMPLES = {
  incident: [
    'urgent',
    'severity:high',
    'hardware',
    'database',
    'production',
    'team:infrastructure'
  ],
  problem: [
    'recurring',
    'category:software',
    'api',
    'production', 
    'widespread',
    'team:backend'
  ],
  change: [
    'emergency',
    'maintenance',
    'risk:low',
    'minor',
    'web-app',
    'team:frontend'
  ]
}