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

interface WYSIWYGEditorProps {
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

export function WYSIWYGEditor({
  value,
  onChange,
  placeholder = 'Type your message...',
  className = '',
  minHeight = '100px',
  onMentionTrigger,
  disabled = false
}: WYSIWYGEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showEmojis, setShowEmojis] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState('Smileys')
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastExternalValue, setLastExternalValue] = useState(value)

  // Convert HTML to markdown for storage
  const htmlToMarkdown = useCallback((html: string): string => {
    const markdown = html
      // Convert mentions
      .replace(/<span[^>]*class="[^"]*mention[^"]*"[^>]*data-id="([^"]*)"[^>]*>@([^<]*)<\/span>/g, '@[$2]($1)')
      // Convert bold
      .replace(/<(strong|b)(?:[^>]*)>(.*?)<\/\1>/gi, '**$2**')
      // Convert italic
      .replace(/<(em|i)(?:[^>]*)>(.*?)<\/\1>/gi, '*$2*')
      // Convert underline
      .replace(/<u(?:[^>]*)>(.*?)<\/u>/gi, '__$1__')
      // Convert inline code
      .replace(/<code(?:[^>]*)>(.*?)<\/code>/gi, '`$1`')
      // Convert code blocks
      .replace(/<pre(?:[^>]*)><code(?:[^>]*)>(.*?)<\/code><\/pre>/gi, '```\n$1\n```')
      // Convert quotes
      .replace(/<blockquote(?:[^>]*)>(.*?)<\/blockquote>/gi, '> $1')
      // Convert unordered lists
      .replace(/<ul(?:[^>]*)>(.*?)<\/ul>/gis, (match, content) => {
        return content.replace(/<li(?:[^>]*)>(.*?)<\/li>/gis, '- $1\n').trim() + '\n'
      })
      // Convert ordered lists
      .replace(/<ol(?:[^>]*)>(.*?)<\/ol>/gis, (match, content) => {
        let counter = 1
        return content.replace(/<li(?:[^>]*)>(.*?)<\/li>/gis, () => `${counter++}. $1\n`).trim() + '\n'
      })
      // Convert links
      .replace(/<a(?:[^>]*)href="([^"]*)"(?:[^>]*)>(.*?)<\/a>/gi, '[$2]($1)')
      // Clean up remaining HTML and handle line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div(?:[^>]*)>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<p(?:[^>]*)>/gi, '')
      .replace(/<\/p>/gi, '\n')
      // Clean up extra whitespace
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')

    return markdown
  }, [])

  // Convert markdown to HTML for display
  const markdownToHtml = useCallback((markdown: string): string => {
    const html = markdown
      // Convert mentions first
      .replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mention" data-id="$2" contenteditable="false">@$1</span>')
      // Convert bold **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert italic *text*
      .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
      // Convert underline __text__
      .replace(/__(.*?)__/g, '<u>$1</u>')
      // Convert inline code `text`
      .replace(/`([^`]+)`/g, '<code style="background-color: #f3f4f6; color: #374151; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 0.875em;">$1</code>')
      // Convert code blocks
      .replace(/```([\s\S]*?)```/g, '<pre style="background-color: #f9fafb; padding: 12px; border-radius: 8px; overflow-x: auto; font-family: monospace; font-size: 0.875em;"><code>$1</code></pre>')
      // Convert quotes
      .replace(/^> (.+)$/gm, '<blockquote style="border-left: 4px solid #d1d5db; padding-left: 16px; font-style: italic; color: #6b7280;">$1</blockquote>')
      // Convert bullet lists to proper HTML
      .replace(/((?:^- .+(?:\n|$))+)/gm, (match) => {
        const items = match.split('\n').filter(line => line.trim()).map(line => 
          `<li>${line.replace(/^- /, '')}</li>`
        ).join('')
        return `<ul style="margin-left: 20px; padding-left: 20px;">${items}</ul>`
      })
      // Convert numbered lists to proper HTML
      .replace(/((?:^\d+\. .+(?:\n|$))+)/gm, (match) => {
        const items = match.split('\n').filter(line => line.trim()).map(line => 
          `<li>${line.replace(/^\d+\. /, '')}</li>`
        ).join('')
        return `<ol style="margin-left: 20px; padding-left: 20px;">${items}</ol>`
      })
      // Convert links [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #2563eb; text-decoration: underline;" target="_blank" rel="noopener noreferrer">$1</a>')
      // Convert line breaks
      .replace(/\n/g, '<br>')

    return html
  }, [])

  // Update editor content when value changes externally (not from user typing)
  useEffect(() => {
    if (!editorRef.current || isUpdating) return
    
    // Only update if the value changed externally (not from user input)
    if (value !== lastExternalValue && document.activeElement !== editorRef.current) {
      const html = markdownToHtml(value)
      editorRef.current.innerHTML = html
      setLastExternalValue(value)
    }
  }, [value, markdownToHtml, isUpdating, lastExternalValue])

  // Handle content changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    
    // Save cursor position before processing
    const selection = window.getSelection()
    let savedRange: Range | null = null
    if (selection && selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0).cloneRange()
    }
    
    setIsUpdating(true)
    const html = editorRef.current.innerHTML
    const markdown = htmlToMarkdown(html)
    setLastExternalValue(markdown)
    onChange(markdown)
    
    // Handle @ mentions
    if (onMentionTrigger) {
      const textContent = editorRef.current.textContent || ''
      if (savedRange) {
        const cursorPosition = savedRange.startOffset
        const textBeforeCursor = textContent.substring(0, cursorPosition)
        const lastAtSymbol = textBeforeCursor.lastIndexOf('@')
        
        if (lastAtSymbol !== -1) {
          const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1)
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
    
    // Just mark as not updating, let natural cursor position remain
    setIsUpdating(false)
  }, [onChange, htmlToMarkdown, onMentionTrigger])

  // Format text using execCommand
  const formatText = useCallback((command: string, value?: string) => {
    if (!editorRef.current || disabled) return
    
    editorRef.current.focus()
    document.execCommand(command, false, value)
    handleInput()
  }, [handleInput, disabled])

  // Insert text at current selection
  const insertText = useCallback((text: string) => {
    if (!editorRef.current || disabled) return
    
    editorRef.current.focus()
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      range.deleteContents()
      const textNode = document.createTextNode(text)
      range.insertNode(textNode)
      range.setStartAfter(textNode)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    handleInput()
  }, [handleInput, disabled])

  // Insert emoji
  const insertEmoji = useCallback((emoji: string) => {
    insertText(emoji)
    setShowEmojis(false)
  }, [insertText])

  // Insert link
  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:')
    if (url) {
      const linkText = prompt('Enter link text:', 'Link')
      if (linkText) {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          range.deleteContents()
          const link = document.createElement('a')
          link.href = url
          link.textContent = linkText
          link.style.color = '#2563eb'
          link.style.textDecoration = 'underline'
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
          range.insertNode(link)
          range.setStartAfter(link)
          range.collapse(true)
          selection.removeAllRanges()
          selection.addRange(range)
        }
        handleInput()
      }
    }
  }, [handleInput])

  // Insert list
  const insertList = useCallback((ordered = false) => {
    if (!editorRef.current || disabled) return
    
    editorRef.current.focus()
    
    // Use execCommand for lists
    if (ordered) {
      document.execCommand('insertOrderedList', false)
    } else {
      document.execCommand('insertUnorderedList', false)
    }
    
    handleInput()
  }, [handleInput, disabled])

  // Insert inline code
  const insertCode = useCallback(() => {
    if (!editorRef.current || disabled) return
    
    editorRef.current.focus()
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const selectedText = range.toString()
      
      if (selectedText) {
        // Wrap selected text in code element
        range.deleteContents()
        const codeElement = document.createElement('code')
        codeElement.style.backgroundColor = '#f3f4f6'
        codeElement.style.color = '#374151'
        codeElement.style.padding = '2px 4px'
        codeElement.style.borderRadius = '3px'
        codeElement.style.fontFamily = 'monospace'
        codeElement.style.fontSize = '0.875em'
        codeElement.textContent = selectedText
        range.insertNode(codeElement)
        
        // Set cursor after the code element
        range.setStartAfter(codeElement)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      } else {
        // Insert empty code element for user to type in
        const codeElement = document.createElement('code')
        codeElement.style.backgroundColor = '#f3f4f6'
        codeElement.style.color = '#374151'
        codeElement.style.padding = '2px 4px'
        codeElement.style.borderRadius = '3px'
        codeElement.style.fontFamily = 'monospace'
        codeElement.style.fontSize = '0.875em'
        codeElement.textContent = 'code'
        range.insertNode(codeElement)
        
        // Select the text inside the code element
        range.selectNodeContents(codeElement)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
    
    handleInput()
  }, [handleInput, disabled])

  // Insert quote
  const insertQuote = useCallback(() => {
    formatText('formatBlock', 'blockquote')
  }, [formatText])

  // Handle paste to clean HTML
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    insertText(text)
  }, [insertText])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault()
          formatText('bold')
          break
        case 'i':
          e.preventDefault()
          formatText('italic')
          break
        case 'u':
          e.preventDefault()
          formatText('underline')
          break
      }
    }
  }, [formatText])

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
            onClick={() => insertCode()}
            className="h-8 w-8 p-0 hover:bg-blue-100"
            title="Code"
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
            onClick={() => insertList(false)}
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
            onClick={() => insertList(true)}
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
            onClick={insertQuote}
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

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className="w-full p-4 focus:outline-none leading-relaxed"
        style={{ 
          minHeight,
          lineHeight: '1.6'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      {/* Helper Text */}
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
        <div className="flex items-center justify-end">
          <span>{value.length} characters</span>
        </div>
      </div>

      {/* Placeholder styling */}
      <style jsx>{`
        [contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}