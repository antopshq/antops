'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

// Declare trix-editor as a valid JSX element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'trix-editor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        input?: string;
      }
    }
  }
}

interface TrixEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  disabled?: boolean
}

export function TrixEditor({
  value,
  onChange,
  placeholder = 'Type your message...',
  className = '',
  minHeight = '100px',
  disabled = false
}: TrixEditorProps) {
  const editorRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isInitializedRef = useRef(false)

  // Initialize Trix
  useEffect(() => {
    const loadTrix = async () => {
      // Import Trix dynamically to avoid SSR issues
      // @ts-ignore
      const Trix = await import('trix')
      
      // Import Trix CSS
      const style = document.createElement('link')
      style.rel = 'stylesheet'
      style.href = 'https://unpkg.com/trix@2/dist/trix.css'
      if (!document.querySelector('link[href*="trix.css"]')) {
        document.head.appendChild(style)
      }

      if (editorRef.current && inputRef.current && !isInitializedRef.current) {
        isInitializedRef.current = true
        
        // Set initial value
        inputRef.current.value = value
        
        // Initialize Trix editor
        const editor = editorRef.current as any
        
        // Listen for content changes
        editor.addEventListener('trix-change', (event: any) => {
          const content = event.target.innerHTML
          const textContent = event.target.textContent || ''
          
          // Convert Trix HTML to a simpler format for storage
          let markdown = content
            // Convert Trix bold
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            // Convert Trix italic
            .replace(/<em>(.*?)<\/em>/gi, '*$1*')
            // Convert Trix underline (if supported)
            .replace(/<u>(.*?)<\/u>/gi, '__$1__')
            // Convert Trix code
            .replace(/<code>(.*?)<\/code>/gi, '`$1`')
            // Convert Trix links
            .replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            // Convert line breaks
            .replace(/<br>/gi, '\n')
            .replace(/<div>(.*?)<\/div>/gi, '$1\n')
            // Clean up extra HTML
            .replace(/<[^>]*>/gi, '')
            // Clean up extra whitespace
            .replace(/\n\s*\n/g, '\n\n')
            .trim()
          
          onChange(markdown)
        })

        // Set placeholder
        editor.setAttribute('placeholder', placeholder)
      }
    }

    loadTrix()
  }, [])

  // Update content when value changes externally
  useEffect(() => {
    if (editorRef.current && inputRef.current && isInitializedRef.current) {
      const editor = editorRef.current as any
      const currentContent = editor.textContent || ''
      
      if (value !== currentContent) {
        // Convert markdown back to HTML for display
        let html = value
          // Convert bold
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          // Convert italic
          .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
          // Convert underline
          .replace(/__(.*?)__/g, '<u>$1</u>')
          // Convert code
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          // Convert links
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
          // Convert line breaks
          .replace(/\n/g, '<br>')

        inputRef.current.value = html
        
        // Trigger Trix to update
        const event = new CustomEvent('input', { bubbles: true })
        inputRef.current.dispatchEvent(event)
      }
    }
  }, [value])

  return (
    <div className={cn('trix-editor-wrapper', className)}>
      <input
        ref={inputRef}
        id="trix-editor"
        type="hidden"
        defaultValue={value}
      />
      {React.createElement('trix-editor', {
        ref: editorRef,
        input: "trix-editor",
        className: cn(
          'trix-content',
          'border border-gray-200 rounded-2xl',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          disabled && 'opacity-50 pointer-events-none'
        ),
        style: {
          minHeight,
          padding: '16px',
          backgroundColor: 'white'
        },
        contentEditable: !disabled,
        suppressContentEditableWarning: true
      })}
      
      {/* Character count */}
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-100 rounded-b-2xl">
        <div className="text-right">
          <span>{value.length} characters</span>
        </div>
      </div>

      {/* Custom Trix styles */}
      <style jsx>{`
        .trix-editor-wrapper :global(.trix-button-group) {
          border-radius: 8px;
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          margin-bottom: 8px;
        }
        
        .trix-editor-wrapper :global(.trix-button) {
          border: none;
          background: transparent;
          padding: 8px 12px;
          border-radius: 6px;
          margin: 2px;
        }
        
        .trix-editor-wrapper :global(.trix-button:hover) {
          background: #e7f3ff;
        }
        
        .trix-editor-wrapper :global(.trix-button.trix-active) {
          background: #0066cc;
          color: white;
        }
        
        .trix-editor-wrapper :global(.trix-content) {
          line-height: 1.6;
          font-family: inherit;
        }
        
        .trix-editor-wrapper :global(.trix-content strong) {
          font-weight: 700;
        }
        
        .trix-editor-wrapper :global(.trix-content em) {
          font-style: italic;
        }
        
        .trix-editor-wrapper :global(.trix-content code) {
          background-color: #f3f4f6;
          color: #374151;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 0.875em;
        }
        
        .trix-editor-wrapper :global(.trix-content a) {
          color: #2563eb;
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}

export default TrixEditor