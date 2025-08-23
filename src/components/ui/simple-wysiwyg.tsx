'use client'

import React, { useRef, useCallback, useEffect, useState } from 'react'
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

interface SimpleWYSIWYGProps {
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

export function SimpleWYSIWYG({
  value,
  onChange,
  placeholder = 'Type your message...',
  className = '',
  minHeight = '100px',
  onMentionTrigger,
  disabled = false
}: SimpleWYSIWYGProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showEmojis, setShowEmojis] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState('Smileys')
  const [currentRange, setCurrentRange] = useState<Range | null>(null)

  // Convert markdown to HTML for display
  const markdownToHtml = useCallback((markdown: string): string => {
    return markdown
      // Convert mentions
      .replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '<span class="mention" style="background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 9999px; font-size: 0.875rem; font-weight: 500;" data-id="$2">@$1</span>')
      // Convert bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert italic  
      .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
      // Convert underline
      .replace(/__(.*?)__/g, '<u>$1</u>')
      // Convert code
      .replace(/`([^`]+)`/g, '<code style="background-color: #f3f4f6; color: #374151; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 0.875em;">$1</code>')
      // Convert quotes
      .replace(/^> (.+)$/gm, '<blockquote style="border-left: 4px solid #d1d5db; padding-left: 16px; font-style: italic; color: #6b7280; margin: 8px 0;">$1</blockquote>')
      // Convert bullet lists
      .replace(/^- (.+)$/gm, '<li style="margin-left: 20px;">• $1</li>')
      // Convert numbered lists
      .replace(/^\d+\. (.+)$/gm, '<li style="margin-left: 20px;">$1</li>')
      // Convert links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #2563eb; text-decoration: underline;" target="_blank" rel="noopener noreferrer">$1</a>')
      // Convert line breaks
      .replace(/\n/g, '<br>')
  }, [])

  // Convert HTML back to markdown for storage
  const htmlToMarkdown = useCallback((html: string): string => {
    return html
      // Convert mentions
      .replace(/<span[^>]*class="[^"]*mention[^"]*"[^>]*data-id="([^"]*)"[^>]*>@([^<]*)<\/span>/g, '@[$2]($1)')
      // Convert strong/b to bold
      .replace(/<(strong|b)(?:[^>]*)>(.*?)<\/\1>/gi, '**$2**')
      // Convert em/i to italic
      .replace(/<(em|i)(?:[^>]*)>(.*?)<\/\1>/gi, '*$2*')
      // Convert u to underline
      .replace(/<u(?:[^>]*)>(.*?)<\/u>/gi, '__$1__')
      // Convert code
      .replace(/<code(?:[^>]*)>(.*?)<\/code>/gi, '`$1`')
      // Convert blockquotes
      .replace(/<blockquote(?:[^>]*)>(.*?)<\/blockquote>/gi, '> $1')
      // Convert list items
      .replace(/<li(?:[^>]*)>•\s*(.*?)<\/li>/gi, '- $1')
      .replace(/<li(?:[^>]*)>(.*?)<\/li>/gi, '- $1')
      // Convert links
      .replace(/<a(?:[^>]*)href="([^"]*)"(?:[^>]*)>(.*?)<\/a>/gi, '[$2]($1)')
      // Clean up HTML
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n')
      // Clean whitespace
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
  }, [])

  // Initialize content
  useEffect(() => {
    if (editorRef.current && value) {
      const html = markdownToHtml(value)
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html
      }
    }
  }, [])

  // Save current selection
  const saveSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      setCurrentRange(selection.getRangeAt(0).cloneRange())
    }
  }, [])

  // Restore selection
  const restoreSelection = useCallback(() => {
    if (currentRange) {
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(currentRange)
      }
    }
  }, [currentRange])

  // Handle content changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    
    const html = editorRef.current.innerHTML
    const markdown = htmlToMarkdown(html)
    onChange(markdown)
    
    // Handle mentions
    if (onMentionTrigger) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const textContent = editorRef.current.textContent || ''
        
        // Simple mention detection
        const beforeCursor = textContent.substring(0, range.startOffset)
        const lastAtIndex = beforeCursor.lastIndexOf('@')
        
        if (lastAtIndex !== -1) {
          const textAfterAt = beforeCursor.substring(lastAtIndex + 1)
          if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
            const rect = editorRef.current.getBoundingClientRect()
            onMentionTrigger(textAfterAt, {
              x: rect.left + 10,
              y: rect.top + 30
            })
          }
        }
      }
    }
  }, [onChange, htmlToMarkdown, onMentionTrigger])

  // Format text
  const formatText = useCallback((command: string) => {
    if (!editorRef.current || disabled) return
    
    saveSelection()
    editorRef.current.focus()
    
    try {
      document.execCommand(command, false)
      handleInput()
    } catch (error) {
      console.warn('Format command failed:', command, error)
    }
  }, [disabled, saveSelection, handleInput])

  // Insert text
  const insertText = useCallback((text: string) => {
    if (!editorRef.current || disabled) return
    
    editorRef.current.focus()
    
    try {
      document.execCommand('insertText', false, text)
      handleInput()
    } catch (error) {
      // Fallback
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(text))
        range.collapse(false)
        handleInput()
      }
    }
  }, [disabled, handleInput])

  // Toggle list
  const toggleList = useCallback((ordered = false) => {
    if (!editorRef.current || disabled) return
    
    editorRef.current.focus()
    
    try {
      const command = ordered ? 'insertOrderedList' : 'insertUnorderedList'
      document.execCommand(command, false)
      handleInput()
    } catch (error) {
      console.warn('List command failed:', error)
    }
  }, [disabled, handleInput])

  // Insert emoji
  const insertEmoji = useCallback((emoji: string) => {
    insertText(emoji)
    setShowEmojis(false)
  }, [insertText])

  // Insert link
  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:')
    if (url) {
      const text = prompt('Enter link text:', 'Link')
      if (text) {
        restoreSelection()
        try {
          document.execCommand('createLink', false, url)
          handleInput()
        } catch (error) {
          console.warn('Link creation failed:', error)
        }
      }
    }
  }, [restoreSelection, handleInput])

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
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => formatText('bold')}
            className="h-8 w-8 p-0 hover:bg-blue-100"
            title="Bold"
            disabled={disabled}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => formatText('italic')}
            className="h-8 w-8 p-0 hover:bg-blue-100"
            title="Italic"
            disabled={disabled}
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => formatText('underline')}
            className="h-8 w-8 p-0 hover:bg-blue-100"
            title="Underline"
            disabled={disabled}
          >
            <Underline className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lists */}
        <div className="flex items-center gap-1 mr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => toggleList(false)}
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
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => toggleList(true)}
            className="h-8 w-8 p-0 hover:bg-blue-100"
            title="Numbered List"
            disabled={disabled}
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Link */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
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
              onMouseDown={(e) => e.preventDefault()}
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
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertText('@')}
              className="h-8 w-8 p-0 hover:bg-blue-100"
              title="Mention"
              disabled={disabled}
            >
              <AtSign className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onFocus={saveSelection}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        className="w-full p-4 focus:outline-none min-h-[100px] prose prose-sm max-w-none"
        style={{ minHeight }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      {/* Character count */}
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
        <div className="text-right">
          <span>{editorRef.current?.textContent?.length || 0} characters</span>
        </div>
      </div>

      {/* Placeholder styling */}
      <style jsx>{`
        [contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        
        [contenteditable] strong {
          font-weight: 700;
        }
        
        [contenteditable] em {
          font-style: italic;
        }
        
        [contenteditable] u {
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}

export default SimpleWYSIWYG