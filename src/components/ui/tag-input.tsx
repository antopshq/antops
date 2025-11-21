'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Plus, AlertCircle, Info } from 'lucide-react'
import { validateTagsString, parseTags, getTagColor, TAG_EXAMPLES, type ParsedTag } from '@/lib/tag-utils'

interface TagInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  context?: 'incident' | 'problem' | 'change'
  disabled?: boolean
  error?: string
}

export function TagInput({ 
  value, 
  onChange, 
  label = 'Tags',
  placeholder = 'Enter tags (simple words or key:value), separated by commas',
  context = 'incident',
  disabled = false,
  error: externalError
}: TagInputProps) {
  const [inputValue, setInputValue] = useState(value)
  const [showExamples, setShowExamples] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    
    // Validate tags
    const error = validateTagsString(newValue)
    setValidationError(error)
    
    // Only call onChange if valid (or empty)
    if (!error) {
      onChange(newValue)
    }
  }

  const handleBlur = () => {
    // Final validation on blur
    const error = validateTagsString(inputValue)
    if (!error) {
      onChange(inputValue)
    }
  }

  const addExampleTag = (tag: string) => {
    const currentTags = inputValue.trim()
    const newValue = currentTags ? `${currentTags}, ${tag}` : tag
    handleInputChange(newValue)
    setShowExamples(false)
  }

  const removeTag = (tagToRemove: ParsedTag) => {
    const { valid } = parseTags(inputValue)
    const remainingTags = valid
      .filter(tag => tag.original !== tagToRemove.original)
      .map(tag => tag.original)
    handleInputChange(remainingTags.join(', '))
  }

  const { valid: validTags, invalid: invalidTags } = parseTags(inputValue)
  const examples = TAG_EXAMPLES[context] || []
  const hasError = validationError || externalError

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowExamples(!showExamples)}
          className="text-xs text-gray-500 h-auto p-1"
        >
          <Info className="w-3 h-3 mr-1" />
          Examples
        </Button>
      </div>

      <Input
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={hasError ? 'border-red-300' : ''}
      />

      {/* Error message */}
      {hasError && (
        <div className="flex items-center text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mr-1" />
          {validationError || externalError}
        </div>
      )}

      {/* Examples */}
      {showExamples && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-xs font-medium text-blue-900 mb-2">Example tags for {context}s:</div>
          <div className="flex flex-wrap gap-1">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => addExampleTag(example)}
                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 border border-blue-200 rounded hover:bg-blue-200 transition-colors"
              >
                <Plus className="w-3 h-3 mr-1" />
                {example}
              </button>
            ))}
          </div>
          <div className="text-xs text-blue-700 mt-2">
            Click to add • Format: simple words or key:value
          </div>
        </div>
      )}

      {/* Display parsed tags */}
      {validTags.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-700">Tags:</div>
          <div className="flex flex-wrap gap-2">
            {validTags.map((tag, index) => (
              <Badge
                key={`${tag.original}-${index}`}
                variant="outline"
                className={`${getTagColor(tag.key)} text-xs flex items-center gap-1`}
              >
                {tag.isKeyValue ? (
                  <>
                    <span className="font-medium">{tag.key}:</span>
                    <span>{tag.value}</span>
                  </>
                ) : (
                  <span>{tag.key}</span>
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Invalid tags warning */}
      {invalidTags.length > 0 && (
        <div className="text-xs text-amber-600">
          Invalid tags: {invalidTags.join(', ')} • Use simple words or "key:value" format
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-gray-500">
        Use simple words or "key:value" format separated by commas. Example: urgent, environment:production, team:backend
      </div>
    </div>
  )
}