'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Bold, 
  Italic, 
  Underline, 
  Code, 
  List, 
  ListOrdered, 
  Quote, 
  Link,
  Smile,
  AtSign
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  onMentionTrigger?: (query: string, position: { x: number; y: number }) => void
  disabled?: boolean
}


const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋'],
  'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '💪', '🙏'],
  'Objects': ['✨', '🎉', '🎊', '💯', '✅', '❌', '⚠️', '🔥', '💡', '📝', '📋', '📊', '📈', '📉', '🔧', '⚙️', '🔒', '🔓', '🗝️', '🎯']
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type your message...',
  className = '',
  minHeight = '100px',
  onMentionTrigger,
  disabled = false
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showEmojis, setShowEmojis] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState('Smileys')

  const insertText = useCallback((textToInsert: string, wrapText = false) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    
    let newText: string
    if (wrapText && selectedText) {
      // Wrap selected text
      newText = value.substring(0, start) + textToInsert + selectedText + textToInsert + value.substring(end)
    } else {
      // Insert text at cursor
      newText = value.substring(0, start) + textToInsert + value.substring(end)
    }
    
    onChange(newText)
    
    // Focus and set cursor position
    setTimeout(() => {
      textarea.focus()
      const newPosition = wrapText && selectedText 
        ? start + textToInsert.length + selectedText.length + textToInsert.length
        : start + textToInsert.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }, [value, onChange])

  const formatText = useCallback((format: string) => {
    const formats: Record<string, string> = {
      'bold': '**',
      'italic': '*',
      'underline': '__',
      'code': '`',
      'codeblock': '```',
      'quote': '> ',
      'list': '- ',
      'orderedlist': '1. '
    }
    
    const formatChar = formats[format]
    if (!formatChar) return

    if (format === 'quote' || format === 'list' || format === 'orderedlist') {
      // Line-based formatting
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const newText = value.substring(0, lineStart) + formatChar + value.substring(lineStart)
      onChange(newText)
      
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + formatChar.length, start + formatChar.length)
      }, 0)
    } else if (format === 'codeblock') {
      insertText('\n```\n\n```\n')
    } else {
      insertText(formatChar, true)
    }
  }, [insertText, value, onChange])

  const insertEmoji = useCallback((emoji: string) => {
    insertText(emoji)
    setShowEmojis(false)
  }, [insertText])

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Handle @ mentions
    if (onMentionTrigger) {
      const textarea = e.target
      const cursorPosition = textarea.selectionStart
      const textBeforeCursor = newValue.substring(0, cursorPosition)
      const lastAtSymbol = textBeforeCursor.lastIndexOf('@')
      
      if (lastAtSymbol !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1)
        if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
          const rect = textarea.getBoundingClientRect()
          
          // Rough calculation for position
          onMentionTrigger(textAfterAt, {
            x: rect.left + 10,
            y: rect.top + 30
          })
        }
      }
    }
  }

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:')
    if (url) {
      const linkText = prompt('Enter link text:', 'Link')
      if (linkText) {
        insertText(`[${linkText}](${url})`)
      }
    }
  }, [insertText])

  return (
    <div className={cn('border border-gray-200 rounded-2xl overflow-hidden bg-white', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-gray-50">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 mr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => formatText('bold')}
            className="h-8 w-8 p-0 hover:bg-blue-100"
            title="Bold (Ctrl+B)"
            disabled={disabled}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => formatText('italic')}
            className="h-8 w-8 p-0 hover:bg-blue-100"
            title="Italic (Ctrl+I)"
            disabled={disabled}
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => formatText('underline')}
            className="h-8 w-8 p-0 hover:bg-blue-100"
            title="Underline (Ctrl+U)"
            disabled={disabled}
          >
            <Underline className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Code Formatting */}
        <div className="flex items-center gap-1 mr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => formatText('code')}
            className="h-8 w-8 p-0 hover:bg-blue-100"
            title="Inline Code"
            disabled={disabled}
          >
            <Code className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lists */}
        <div className="flex items-center gap-1 mr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => formatText('list')}
            className="h-8 w-8 p-0 hover:bg-blue-100"
            title="Bullet List"
            disabled={disabled}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => formatText('orderedlist')}
            className="h-8 w-8 p-0 hover:bg-blue-100"
            title="Numbered List"
            disabled={disabled}
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => formatText('quote')}
            className="h-8 w-8 p-0 hover:bg-blue-100"
            title="Quote"
            disabled={disabled}
          >
            <Quote className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Link */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertLink}
          className="h-8 w-8 p-0 hover:bg-blue-100 mr-2"
          title="Insert Link"
          disabled={disabled}
        >
          <Link className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Emoji Picker */}
        <Popover open={showEmojis} onOpenChange={setShowEmojis}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-blue-100"
              title="Insert Emoji"
              disabled={disabled}
            >
              <Smile className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="border-b p-2">
              <div className="flex space-x-1">
                {Object.keys(EMOJI_CATEGORIES).map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant={emojiCategory === category ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setEmojiCategory(category)}
                    className="text-xs"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
            <div className="p-3 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_CATEGORIES[emojiCategory as keyof typeof EMOJI_CATEGORIES]?.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="w-8 h-8 hover:bg-gray-100 rounded text-lg flex items-center justify-center transition-colors"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Mentions */}
        {onMentionTrigger && (
          <>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertText('@')}
              className="h-8 w-8 p-0 hover:bg-blue-100"
              title="Mention someone (@)"
              disabled={disabled}
            >
              <AtSign className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Text Area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaChange}
        placeholder={placeholder}
        className="w-full p-4 resize-none border-0 focus:outline-none focus:ring-0"
        style={{ minHeight }}
        disabled={disabled}
      />

      {/* Helper Text */}
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>**bold** *italic* __underline__ `code`</span>
            {onMentionTrigger && <span>@mention</span>}
          </div>
          <span>{value.length} characters</span>
        </div>
      </div>
    </div>
  )
}