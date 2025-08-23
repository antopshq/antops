'use client'

import { Badge } from '@/components/ui/badge'
import { parseTags, getTagColor, type ParsedTag } from '@/lib/tag-utils'

interface TagDisplayProps {
  tags: string[]
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showEmpty?: boolean
  emptyText?: string
}

export function TagDisplay({ 
  tags, 
  className = '',
  size = 'md',
  showEmpty = true,
  emptyText = 'No tags'
}: TagDisplayProps) {
  if (!tags || tags.length === 0) {
    return showEmpty ? (
      <span className="text-sm text-gray-500 italic">{emptyText}</span>
    ) : null
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1.5'
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map((tagString, index) => {
        const parsed = parseTags(tagString)
        
        // If it's a valid key:value tag, show with styling
        if (parsed.valid.length > 0) {
          const tag = parsed.valid[0]
          return (
            <Badge
              key={`${tag.original}-${index}`}
              variant="outline"
              className={`${getTagColor(tag.key)} ${sizeClasses[size]} flex items-center gap-1`}
            >
              <span className="font-medium">{tag.key}:</span>
              <span>{tag.value}</span>
            </Badge>
          )
        }
        
        // Fallback for simple tags (backward compatibility)
        return (
          <Badge
            key={`${tagString}-${index}`}
            variant="outline"
            className={`bg-gray-100 text-gray-800 border-gray-200 ${sizeClasses[size]}`}
          >
            {tagString}
          </Badge>
        )
      })}
    </div>
  )
}