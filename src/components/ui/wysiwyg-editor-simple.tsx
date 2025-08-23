'use client'

import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  AtSign,
  ExternalLink,
  Globe,
  Eye,
  X,
  Check,
  Paperclip,
  FileImage,
  FileText,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AttachedFile {
  id: string
  name: string
  size: number
  type: string
  url?: string
  file?: File
}

interface WYSIWYGEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  onMentionTrigger?: (query: string, position: { x: number; y: number }) => void
  disabled?: boolean
  attachedFiles?: AttachedFile[]
  onFilesChange?: (files: AttachedFile[]) => void
  maxFiles?: number
  maxFileSize?: number
}

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋'],
  'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '💪', '🙏'],
  'Objects': ['✨', '🎉', '🎊', '💯', '✅', '❌', '⚠️', '🔥', '💡', '📝', '📋', '📊', '📈', '📉', '🔧', '⚙️', '🔒', '🔓', '🗝️', '🎯']
}

// Interface for link metadata
interface LinkMetadata {
  title: string
  description: string
  image?: string
  domain: string
  error?: string
}

export function WYSIWYGEditorSimple({
  value,
  onChange,
  placeholder = 'Type your message...',
  className = '',
  minHeight = '100px',
  onMentionTrigger,
  disabled = false,
  attachedFiles = [],
  onFilesChange,
  maxFiles = 2,
  maxFileSize = 2 * 1024 * 1024 // 2MB in bytes
}: WYSIWYGEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showEmojis, setShowEmojis] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState('Smileys')
  const [characterCount, setCharacterCount] = useState(0)
  const initializedRef = useRef(false)
  
  // Enhanced link modal states
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [linkMetadata, setLinkMetadata] = useState<LinkMetadata | null>(null)
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  
  // Mention states for WYSIWYG editor
  const [showWysiwygMentions, setShowWysiwygMentions] = useState(false)
  const [wysiwygMentionQuery, setWysiwygMentionQuery] = useState('')
  const [wysiwygMentionPosition, setWysiwygMentionPosition] = useState({ x: 0, y: 0 })
  
  // File attachment states
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Drag and drop states
  const [isDragActive, setIsDragActive] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounterRef = useRef(0)

  // Convert markdown to HTML for initial display
  const markdownToHtml = useCallback((markdown: string): string => {
    let html = markdown
      // Convert mentions
      .replace(/@\[([^\]]+)\]\(([^)]+)\)/g, '<span class="mention" data-id="$2" style="background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; display: inline-block;">@$1</span>&nbsp;')
      // Convert bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert italic  
      .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
      // Convert underline
      .replace(/__(.*?)__/g, '<u>$1</u>')
      // Convert code
      .replace(/`([^`]+)`/g, '<code style="background-color: #f3f4f6; color: #374151; padding: 2px 4px; border-radius: 3px; font-family: monospace; font-size: 0.875em;">$1</code>')
    
    // Handle lists more carefully
    const lines = html.split('\n')
    const processedLines = []
    let inBulletList = false
    let inNumberedList = false
    
    for (const line of lines) {
      const bulletMatch = line.match(/^- (.+)$/)
      const numberedMatch = line.match(/^\d+\. (.+)$/)
      
      if (bulletMatch) {
        if (!inBulletList && inNumberedList) {
          processedLines.push('</ol>')
          inNumberedList = false
        }
        if (!inBulletList) {
          processedLines.push('<ul>')
          inBulletList = true
        }
        processedLines.push(`<li>${bulletMatch[1]}</li>`)
      } else if (numberedMatch) {
        if (!inNumberedList && inBulletList) {
          processedLines.push('</ul>')
          inBulletList = false
        }
        if (!inNumberedList) {
          processedLines.push('<ol>')
          inNumberedList = true
        }
        processedLines.push(`<li>${numberedMatch[1]}</li>`)
      } else {
        // Close any open lists
        if (inBulletList) {
          processedLines.push('</ul>')
          inBulletList = false
        }
        if (inNumberedList) {
          processedLines.push('</ol>')
          inNumberedList = false
        }
        processedLines.push(line)
      }
    }
    
    // Close any remaining open lists
    if (inBulletList) {
      processedLines.push('</ul>')
    }
    if (inNumberedList) {
      processedLines.push('</ol>')
    }
    
    return processedLines.join('<br>')
  }, [])

  // Convert HTML back to markdown for storage
  const htmlToMarkdown = useCallback((html: string): string => {
    let markdown = html
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
      // Convert links
      .replace(/<a(?:[^>]*)href="([^"]*)"(?:[^>]*)>(.*?)<\/a>/gi, '[$2]($1)')
    
    // Handle lists separately to avoid the $1 issue
    // Convert unordered lists
    markdown = markdown.replace(/<ul(?:[^>]*)>(.*?)<\/ul>/gis, (match, content) => {
      const listItems = content.match(/<li(?:[^>]*)>(.*?)<\/li>/gis) || []
      return listItems.map(item => {
        const itemContent = item.replace(/<li(?:[^>]*)>(.*?)<\/li>/gis, '$1')
        return `- ${itemContent}`
      }).join('\n') + '\n'
    })
    
    // Convert ordered lists
    markdown = markdown.replace(/<ol(?:[^>]*)>(.*?)<\/ol>/gis, (match, content) => {
      const listItems = content.match(/<li(?:[^>]*)>(.*?)<\/li>/gis) || []
      return listItems.map((item, index) => {
        const itemContent = item.replace(/<li(?:[^>]*)>(.*?)<\/li>/gis, '$1')
        return `${index + 1}. ${itemContent}`
      }).join('\n') + '\n'
    })
    
    // Clean up HTML
    markdown = markdown
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n')
      // Clean whitespace
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      
    return markdown
  }, [])

  // Initialize content - only run once on mount
  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      if (value) {
        editorRef.current.innerHTML = markdownToHtml(value)
      }
      // Initialize character count
      setCharacterCount(editorRef.current.textContent?.length || 0)
      initializedRef.current = true
    }
  }, [markdownToHtml])
  
  // Update content when value changes externally (e.g., mention insertion)
  useEffect(() => {
    if (editorRef.current && initializedRef.current && value !== undefined) {
      const currentMarkdown = htmlToMarkdown(editorRef.current.innerHTML)
      // Only update if the external value is different from what's currently in the editor
      if (currentMarkdown !== value) {
        const selection = window.getSelection()
        let cursorOffset = 0
        
        // Safely get cursor position if a selection exists
        if (selection && selection.rangeCount > 0) {
          try {
            const range = selection.getRangeAt(0)
            cursorOffset = range?.startOffset || 0
          } catch (error) {
            console.warn('Could not get selection range:', error)
            cursorOffset = 0
          }
        }
        
        // Update the HTML content
        editorRef.current.innerHTML = markdownToHtml(value)
        
        // Position cursor at the very end to avoid inheriting formatting
        setTimeout(() => {
          try {
            if (selection && editorRef.current) {
              editorRef.current.focus()
              
              // Simple approach: just move cursor to the end
              const range = document.createRange()
              range.selectNodeContents(editorRef.current)
              range.collapse(false)
              selection.removeAllRanges()
              selection.addRange(range)
              
              // Force cursor outside any styled elements by inserting a text node at the end
              const endTextNode = document.createTextNode('')
              editorRef.current.appendChild(endTextNode)
              
              const newRange = document.createRange()
              newRange.setStart(endTextNode, 0)
              newRange.collapse(true)
              selection.removeAllRanges()
              selection.addRange(newRange)
            }
          } catch (error) {
            console.warn('Cursor positioning failed:', error)
            if (editorRef.current) {
              editorRef.current.focus()
            }
          }
        }, 0)
        
        // Update character count
        setCharacterCount(editorRef.current.textContent?.length || 0)
      }
    }
  }, [value, markdownToHtml, htmlToMarkdown])

  // Handle content changes - only convert on blur, not every keystroke
  const handleBlur = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    const markdown = htmlToMarkdown(html)
    onChange(markdown)
  }, [onChange, htmlToMarkdown])

  // Handle input for mentions and character count
  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    
    const textContent = editorRef.current.textContent || ''
    
    // Update character count
    setCharacterCount(textContent.length)
    
    // Handle mentions if callback provided
    if (onMentionTrigger) {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        setShowWysiwygMentions(false)
        return
      }
      
      const range = selection.getRangeAt(0)
      
      // Get text content up to cursor position
      let cursorOffset = 0
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_TEXT,
        null,
        false
      )
      
      let node
      while (node = walker.nextNode()) {
        if (node === range.startContainer) {
          cursorOffset += range.startOffset
          break
        } else {
          cursorOffset += node.textContent?.length || 0
        }
      }
      
      const beforeCursor = textContent.substring(0, cursorOffset)
      const lastAtIndex = beforeCursor.lastIndexOf('@')
      
      if (lastAtIndex !== -1) {
        const textAfterAt = beforeCursor.substring(lastAtIndex + 1)
        // Check if there's a space after @ (which would end the mention)
        if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
          // Get cursor position for dropdown placement
          const rect = range.getBoundingClientRect()
          const editorRect = editorRef.current.getBoundingClientRect()
          
          setWysiwygMentionQuery(textAfterAt)
          setWysiwygMentionPosition({
            x: rect.left - editorRect.left,
            y: rect.bottom - editorRect.top + 5
          })
          setShowWysiwygMentions(true)
          
          // Also trigger the parent callback if provided
          onMentionTrigger(textAfterAt, {
            x: rect.left,
            y: rect.bottom + 5
          })
        } else {
          setShowWysiwygMentions(false)
          // Also trigger parent callback to hide its dropdown
          if (onMentionTrigger) {
            onMentionTrigger('', { x: 0, y: 0 })
          }
        }
      } else {
        setShowWysiwygMentions(false)
        // Also trigger parent callback to hide its dropdown
        if (onMentionTrigger) {
          onMentionTrigger('', { x: 0, y: 0 })
        }
      }
    }
  }, [onMentionTrigger])
  
  // Handle keydown to ensure cursor doesn't inherit mention formatting
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!editorRef.current) return
    
    // For any regular typing, ensure we're not inside a mention
    if (event.key.length === 1 || event.key === ' ') {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return
      
      const range = selection.getRangeAt(0)
      let element = range.startContainer
      
      // Walk up the DOM to see if we're inside a mention
      while (element && element !== editorRef.current) {
        if (element.nodeType === Node.ELEMENT_NODE) {
          const el = element as Element
          if (el.classList?.contains('mention') || el.hasAttribute?.('data-id')) {
            // We're inside a mention - prevent default and insert after
            event.preventDefault()
            
            // Create text node and insert after the mention
            const textNode = document.createTextNode(event.key)
            el.parentNode?.insertBefore(textNode, el.nextSibling)
            
            // Position cursor in the new text node
            const newRange = document.createRange()
            newRange.setStart(textNode, 1)
            newRange.collapse(true)
            selection.removeAllRanges()
            selection.addRange(newRange)
            
            return false
          }
        }
        element = element.parentNode
      }
    }
  }, [])
  
  // File validation and attachment functions
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file size (2MB limit)
    if (file.size > maxFileSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
      return {
        valid: false,
        error: `File "${file.name}" (${sizeMB}MB) exceeds the 2MB limit. Please compress or split the file into smaller parts.`
      }
    }
    
    // Check file type
    const allowedTypes = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt', '.log']
    }
    
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    const isValidType = Object.entries(allowedTypes).some(([mimeType, extensions]) => {
      return file.type === mimeType || extensions.includes(fileExtension)
    })
    
    if (!isValidType) {
      return {
        valid: false,
        error: `File type "${fileExtension}" is not allowed. Please use images (JPG, PNG), PDFs, or text/log files only.`
      }
    }
    
    return { valid: true }
  }, [maxFileSize])
  
  const handleFileSelection = useCallback((files: FileList) => {
    if (!onFilesChange) return
    
    const currentFileCount = attachedFiles.length
    const newFilesArray = Array.from(files)
    
    // Check file count limit
    if (currentFileCount + newFilesArray.length > maxFiles) {
      setFileError(`You can only attach up to ${maxFiles} files per comment. Please remove some files or create separate comments.`)
      return
    }
    
    const validFiles: AttachedFile[] = []
    let hasErrors = false
    
    for (const file of newFilesArray) {
      const validation = validateFile(file)
      
      if (!validation.valid) {
        setFileError(validation.error!)
        hasErrors = true
        break
      } else {
        validFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          file
        })
      }
    }
    
    if (!hasErrors && validFiles.length > 0) {
      const updatedFiles = [...attachedFiles, ...validFiles]
      onFilesChange(updatedFiles)
      
      // Clear any previous errors and show success message
      setFileError(null)
      
      // Show confirmation
      const fileNames = validFiles.map(f => f.name).join(', ')
      console.log(`✅ Successfully attached: ${fileNames}`)
    }
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [attachedFiles, maxFiles, onFilesChange, validateFile])
  
  const removeFile = useCallback((fileId: string) => {
    if (!onFilesChange) return
    
    const updatedFiles = attachedFiles.filter(f => f.id !== fileId)
    onFilesChange(updatedFiles)
    setFileError(null)
  }, [attachedFiles, onFilesChange])
  
  const openFileDialog = useCallback(() => {
    if (disabled) return
    fileInputRef.current?.click()
  }, [disabled])
  
  const getFileIcon = useCallback((file: AttachedFile) => {
    if (file.type.startsWith('image/')) {
      return <FileImage className="w-4 h-4" />
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-4 h-4 text-red-600" />
    } else {
      return <FileText className="w-4 h-4 text-gray-600" />
    }
  }, [])
  
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }, [])
  
  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCounterRef.current++
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true)
      setIsDragOver(true)
    }
  }, [])
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    dragCounterRef.current--
    
    if (dragCounterRef.current === 0) {
      setIsDragActive(false)
      setIsDragOver(false)
    }
  }, [])
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Show different visual feedback based on file validation
    if (e.dataTransfer.items) {
      const files = Array.from(e.dataTransfer.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter(Boolean) as File[]
      
      // Quick validation check for visual feedback
      const hasInvalidFiles = files.some(file => {
        const validation = validateFile(file)
        return !validation.valid
      })
      
      const tooManyFiles = attachedFiles.length + files.length > maxFiles
      
      if (hasInvalidFiles || tooManyFiles) {
        e.dataTransfer.dropEffect = 'none'
      } else {
        e.dataTransfer.dropEffect = 'copy'
      }
    }
  }, [attachedFiles.length, maxFiles, validateFile])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsDragActive(false)
    setIsDragOver(false)
    dragCounterRef.current = 0
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      console.log('📁 Files dropped:', droppedFiles.length)
      handleFileSelection(droppedFiles)
    }
  }, [handleFileSelection])

  // Format text using execCommand where it works
  const formatText = useCallback((command: string, value?: string) => {
    if (!editorRef.current || disabled) return
    
    editorRef.current.focus()
    
    try {
      document.execCommand(command, false, value)
    } catch (error) {
      console.warn('execCommand failed:', command, error)
    }
  }, [disabled])

  // Simple bullet list
  const toggleBulletList = useCallback(() => {
    if (!editorRef.current || disabled) return
    
    editorRef.current.focus()
    
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    
    // Check if we're already in a list
    let listElement = range.commonAncestorContainer
    while (listElement && listElement.nodeType !== Node.ELEMENT_NODE) {
      listElement = listElement.parentElement
    }
    
    // Find if we're inside a list item
    while (listElement && listElement.tagName !== 'LI' && listElement.tagName !== 'UL' && listElement.tagName !== 'OL') {
      listElement = listElement.parentElement
    }
    
    if (listElement && (listElement.tagName === 'UL' || listElement.tagName === 'LI')) {
      // We're in a bullet list, try execCommand first
      try {
        document.execCommand('insertUnorderedList', false)
      } catch (error) {
        console.log('execCommand failed, using manual approach')
      }
    } else {
      // Not in a list, create one
      try {
        const success = document.execCommand('insertUnorderedList', false)
        if (!success) {
          // Manual fallback
          const selectedText = range.toString()
          if (selectedText.trim()) {
            range.deleteContents()
            const ul = document.createElement('ul')
            const li = document.createElement('li')
            li.textContent = selectedText
            ul.appendChild(li)
            range.insertNode(ul)
            
            // Position cursor at end of list item
            const newRange = document.createRange()
            newRange.setStart(li, li.childNodes.length)
            newRange.collapse(true)
            selection.removeAllRanges()
            selection.addRange(newRange)
          }
        }
      } catch (error) {
        console.log('List creation failed:', error)
      }
    }
  }, [disabled])

  // Simple numbered list  
  const toggleNumberedList = useCallback(() => {
    if (!editorRef.current || disabled) return
    
    editorRef.current.focus()
    
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    
    // Check if we're already in a list
    let listElement = range.commonAncestorContainer
    while (listElement && listElement.nodeType !== Node.ELEMENT_NODE) {
      listElement = listElement.parentElement
    }
    
    // Find if we're inside a list item
    while (listElement && listElement.tagName !== 'LI' && listElement.tagName !== 'UL' && listElement.tagName !== 'OL') {
      listElement = listElement.parentElement
    }
    
    if (listElement && (listElement.tagName === 'OL' || listElement.tagName === 'LI')) {
      // We're in a numbered list, try execCommand first
      try {
        document.execCommand('insertOrderedList', false)
      } catch (error) {
        console.log('execCommand failed, using manual approach')
      }
    } else {
      // Not in a list, create one
      try {
        const success = document.execCommand('insertOrderedList', false)
        if (!success) {
          // Manual fallback
          const selectedText = range.toString()
          if (selectedText.trim()) {
            range.deleteContents()
            const ol = document.createElement('ol')
            const li = document.createElement('li')
            li.textContent = selectedText
            ol.appendChild(li)
            range.insertNode(ol)
            
            // Position cursor at end of list item
            const newRange = document.createRange()
            newRange.setStart(li, li.childNodes.length)
            newRange.collapse(true)
            selection.removeAllRanges()
            selection.addRange(newRange)
          }
        }
      } catch (error) {
        console.log('List creation failed:', error)
      }
    }
  }, [disabled])

  // Insert text at cursor
  const insertText = useCallback((text: string) => {
    if (!editorRef.current || disabled) return
    
    editorRef.current.focus()
    
    try {
      document.execCommand('insertText', false, text)
    } catch (error) {
      // Fallback for older browsers
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(text))
        range.collapse(false)
      }
    }
  }, [disabled])

  // Insert emoji
  const insertEmoji = useCallback((emoji: string) => {
    insertText(emoji)
    setShowEmojis(false)
  }, [insertText])

  // Validate URL format
  const isValidUrl = useCallback((url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      // Try adding protocol if missing
      try {
        new URL(`https://${url}`)
        return true
      } catch {
        return false
      }
    }
  }, [])

  // Normalize URL (add protocol if missing)
  const normalizeUrl = useCallback((url: string): string => {
    try {
      new URL(url)
      return url
    } catch {
      return `https://${url}`
    }
  }, [])

  // Extract domain from URL
  const extractDomain = useCallback((url: string): string => {
    try {
      return new URL(normalizeUrl(url)).hostname
    } catch {
      return url
    }
  }, [normalizeUrl])

  // Fetch link metadata (mock implementation - in real app you'd use a service)
  const fetchLinkMetadata = useCallback(async (url: string): Promise<LinkMetadata> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const domain = extractDomain(url)
    
    // Mock metadata based on common domains
    const mockMetadata: Record<string, Partial<LinkMetadata>> = {
      'github.com': {
        title: 'GitHub Repository',
        description: 'Code repository and collaboration platform'
      },
      'stackoverflow.com': {
        title: 'Stack Overflow Question',
        description: 'Programming question and answer community'
      },
      'jira.atlassian.com': {
        title: 'Jira Issue',
        description: 'Project management and issue tracking'
      },
      'confluence.atlassian.com': {
        title: 'Confluence Page',
        description: 'Team collaboration and documentation'
      },
      'docs.google.com': {
        title: 'Google Docs',
        description: 'Collaborative document editing'
      },
      'notion.so': {
        title: 'Notion Page',
        description: 'All-in-one workspace for notes and docs'
      }
    }

    const metadata = mockMetadata[domain] || {}
    
    return {
      title: metadata.title || `Link to ${domain}`,
      description: metadata.description || `External link to ${domain}`,
      domain,
      image: metadata.image
    }
  }, [extractDomain])

  // Handle URL input change with debounced metadata fetching
  const handleUrlChange = useCallback(async (url: string) => {
    setLinkUrl(url)
    setLinkMetadata(null)
    
    if (url.trim() && isValidUrl(url.trim())) {
      setLoadingMetadata(true)
      try {
        const metadata = await fetchLinkMetadata(url.trim())
        setLinkMetadata(metadata)
        
        // Auto-set link text if not already set
        if (!linkText.trim() && metadata.title) {
          setLinkText(metadata.title)
        }
      } catch (error) {
        setLinkMetadata({
          title: 'Error loading link',
          description: 'Could not fetch link information',
          domain: extractDomain(url),
          error: 'Failed to load metadata'
        })
      } finally {
        setLoadingMetadata(false)
      }
    }
  }, [isValidUrl, fetchLinkMetadata, linkText, extractDomain])

  // Open enhanced link dialog
  const openLinkDialog = useCallback(() => {
    if (!editorRef.current || disabled) return
    
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const selected = range.toString().trim()
      setSelectedText(selected)
      
      // If text is selected, use it as link text
      if (selected) {
        setLinkText(selected)
      }
      
      // If selected text looks like a URL, use it as URL too
      if (selected && isValidUrl(selected)) {
        setLinkUrl(selected)
        handleUrlChange(selected)
      } else {
        setLinkUrl('')
        setLinkMetadata(null)
      }
    } else {
      setSelectedText('')
      setLinkUrl('')
      setLinkText('')
      setLinkMetadata(null)
    }
    
    setShowLinkDialog(true)
  }, [disabled, isValidUrl, handleUrlChange])

  // Insert link with metadata
  const insertEnhancedLink = useCallback(() => {
    if (!editorRef.current || !linkUrl.trim() || !linkText.trim()) return

    const normalizedUrl = normalizeUrl(linkUrl.trim())
    
    editorRef.current.focus()
    
    // Get current selection
    const selection = window.getSelection()
    if (!selection) return
    
    try {
      // If we have selected text, replace it
      if (selectedText && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        
        // Create link element
        const link = document.createElement('a')
        link.href = normalizedUrl
        link.textContent = linkText.trim()
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
        link.className = 'text-blue-600 underline hover:text-blue-800 transition-colors'
        
        range.insertNode(link)
        
        // Position cursor after the link
        const newRange = document.createRange()
        newRange.setStartAfter(link)
        newRange.collapse(true)
        selection.removeAllRanges()
        selection.addRange(newRange)
      } else {
        // Insert at current cursor position
        document.execCommand('insertHTML', false, 
          `<a href="${normalizedUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800 transition-colors">${linkText.trim()}</a>&nbsp;`
        )
      }
    } catch (error) {
      console.warn('Enhanced link insertion failed:', error)
      // Fallback to simple insertion
      document.execCommand('insertHTML', false, 
        `<a href="${normalizedUrl}" target="_blank" rel="noopener noreferrer">${linkText.trim()}</a> `
      )
    }

    // Reset dialog state
    setShowLinkDialog(false)
    setLinkUrl('')
    setLinkText('')
    setLinkMetadata(null)
    setSelectedText('')
  }, [linkUrl, linkText, selectedText, normalizeUrl])

  // Toggle quote
  const toggleQuote = useCallback(() => {
    if (!editorRef.current || disabled) return
    
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    
    // Check if we're inside a blockquote
    let quoteElement = range.commonAncestorContainer
    while (quoteElement && quoteElement.nodeType !== Node.ELEMENT_NODE) {
      quoteElement = quoteElement.parentElement
    }
    
    while (quoteElement && quoteElement.tagName !== 'BLOCKQUOTE') {
      quoteElement = quoteElement.parentElement
    }
    
    if (quoteElement && quoteElement.tagName === 'BLOCKQUOTE') {
      // We're inside a blockquote, remove it
      const textContent = quoteElement.textContent || ''
      const textNode = document.createTextNode(textContent)
      quoteElement.parentNode?.replaceChild(textNode, quoteElement)
      
      // Position cursor after the text
      const newRange = document.createRange()
      newRange.setStartAfter(textNode)
      newRange.collapse(true)
      selection.removeAllRanges()
      selection.addRange(newRange)
    } else {
      // Create a new blockquote only if text is selected
      const selectedText = range.toString()
      if (selectedText.trim()) {
        range.deleteContents()
        
        const blockquote = document.createElement('blockquote')
        blockquote.style.borderLeft = '4px solid #d1d5db'
        blockquote.style.paddingLeft = '16px'
        blockquote.style.fontStyle = 'italic'
        blockquote.style.color = '#6b7280'
        blockquote.style.margin = '8px 0'
        blockquote.textContent = selectedText
        
        range.insertNode(blockquote)
        
        // Position cursor at end of blockquote
        const newRange = document.createRange()
        newRange.setStart(blockquote, blockquote.childNodes.length)
        newRange.collapse(true)
        selection.removeAllRanges()
        selection.addRange(newRange)
      }
    }
  }, [disabled])

  // Toggle code formatting
  const toggleCode = useCallback(() => {
    if (!editorRef.current || disabled) return
    
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    
    // Check if we're inside a code element
    let codeElement = range.commonAncestorContainer
    if (codeElement.nodeType === Node.TEXT_NODE) {
      codeElement = codeElement.parentElement
    }
    
    // If we're inside a code element, remove the formatting
    if (codeElement && codeElement.tagName === 'CODE') {
      const textContent = codeElement.textContent || ''
      const textNode = document.createTextNode(textContent)
      codeElement.parentNode?.replaceChild(textNode, codeElement)
      
      // Position cursor after the text
      range.setStartAfter(textNode)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }
    
    // If we have selected text, wrap it in code formatting
    if (selectedText.trim()) {
      range.deleteContents()
      
      const code = document.createElement('code')
      code.style.backgroundColor = '#f3f4f6'
      code.style.color = '#374151'
      code.style.padding = '2px 4px'
      code.style.borderRadius = '3px'
      code.style.fontFamily = 'monospace'
      code.style.fontSize = '0.875em'
      code.textContent = selectedText
      
      range.insertNode(code)
      
      // Position cursor after the code element
      range.setStartAfter(code)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    // If no text is selected, don't insert anything
  }, [disabled])

  return (
    <div 
      className={cn(
        'relative border rounded-2xl overflow-hidden bg-white transition-all duration-200',
        isDragOver && onFilesChange 
          ? 'border-2 border-dashed border-blue-500 bg-blue-50 shadow-lg'
          : 'border-gray-200',
        className
      )}
      onDragEnter={onFilesChange ? handleDragEnter : undefined}
      onDragLeave={onFilesChange ? handleDragLeave : undefined}
      onDragOver={onFilesChange ? handleDragOver : undefined}
      onDrop={onFilesChange ? handleDrop : undefined}
    >
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
            title="Bold"
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
            title="Italic"
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
            title="Underline"
            disabled={disabled}
          >
            <Underline className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Code Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleCode}
          className="h-8 w-8 p-0 hover:bg-blue-100 mr-2"
          title="Code"
          disabled={disabled}
        >
          <Code className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lists */}
        <div className="flex items-center gap-1 mr-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleBulletList}
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
            onClick={toggleNumberedList}
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
            onClick={toggleQuote}
            className="h-8 w-8 p-0 hover:bg-blue-100"
            title="Quote"
            disabled={disabled}
          >
            <Quote className="w-4 h-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Enhanced Link */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={openLinkDialog}
          className="h-8 w-8 p-0 hover:bg-blue-100"
          title="Insert Link"
          disabled={disabled}
        >
          <Link className="w-4 h-4" />
        </Button>
        
        {/* File Attachment */}
        {onFilesChange && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openFileDialog}
            className="h-8 w-8 p-0 hover:bg-blue-100 mr-2"
            title={`Attach files (${attachedFiles.length}/${maxFiles})`}
            disabled={disabled}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        )}

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
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full p-4 focus:outline-none min-h-[100px] wysiwyg-content transition-all duration-200",
          isDragOver && onFilesChange && "bg-blue-50/50"
        )}
        style={{ minHeight }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
      
      {/* Drag and Drop Overlay */}
      {isDragActive && onFilesChange && (
        <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm border-2 border-dashed border-blue-500 rounded-2xl p-8 text-center shadow-xl">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Paperclip className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-blue-900">Drop files here</p>
                <p className="text-sm text-blue-600 mt-1">
                  Up to {maxFiles} files • Max {formatFileSize(maxFileSize)} each
                </p>
                <p className="text-xs text-blue-500 mt-1">
                  Images (JPG, PNG), PDFs, Text/Log files only
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden file input */}
      {onFilesChange && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf,.txt,.log"
          onChange={(e) => e.target.files && handleFileSelection(e.target.files)}
          className="hidden"
        />
      )}
      
      {/* File attachments display */}
      {onFilesChange && (attachedFiles.length > 0 || fileError) && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          {/* File Error */}
          {fileError && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <X className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 font-medium">Attachment Error</p>
                  <p className="text-xs text-red-600 mt-1">{fileError}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFileError(null)}
                  className="h-6 w-6 p-0 text-red-500 hover:bg-red-100"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Attached files list */}
          {attachedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">
                  Attachments ({attachedFiles.length}/{maxFiles})
                </span>
                <span className="text-xs text-gray-500">
                  Images (JPG, PNG), PDFs, Text/Log files • Max 2MB each
                </span>
              </div>
              
              <div className="space-y-1">
                {attachedFiles.map((file) => (
                  <div key={file.id} className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-gray-200 group hover:border-gray-300 transition-colors">
                    <div className="flex-shrink-0">
                      {getFileIcon(file)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • {file.type.split('/')[1].toUpperCase()}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove file"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Character count */}
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span>{characterCount} characters</span>
          {onFilesChange && (
            <span className="text-gray-400">
              Files: {attachedFiles.length}/{maxFiles} • Size limit: 2MB
            </span>
          )}
        </div>
      </div>

      {/* Placeholder and list styling */}
      <style jsx global>{`
        .wysiwyg-content:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .wysiwyg-content ul {
          list-style-type: disc !important;
          margin-left: 20px !important;
          margin-bottom: 10px !important;
          padding-left: 20px !important;
        }
        .wysiwyg-content ol {
          list-style-type: decimal !important;
          margin-left: 20px !important;
          margin-bottom: 10px !important;
          padding-left: 20px !important;
        }
        .wysiwyg-content li {
          margin-bottom: 4px !important;
          display: list-item !important;
        }
        .wysiwyg-content .mention {
          user-select: none;
          cursor: pointer;
          margin-right: 4px;
        }
        .wysiwyg-content .mention:after {
          content: '';
          margin-right: 4px;
        }
      `}</style>

      {/* Enhanced Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-blue-600" />
              Insert Link
            </DialogTitle>
            <DialogDescription>
              {selectedText ? `Creating link for: "${selectedText}"` : 'Add a link to your message'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* URL Input */}
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <div className="relative">
                <Input
                  id="link-url"
                  value={linkUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com or example.com"
                  className={cn(
                    "pr-10",
                    linkUrl && !isValidUrl(linkUrl) && "border-red-300 focus:border-red-500"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {loadingMetadata ? (
                    <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  ) : linkUrl && isValidUrl(linkUrl) ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : linkUrl && !isValidUrl(linkUrl) ? (
                    <X className="w-4 h-4 text-red-500" />
                  ) : null}
                </div>
              </div>
              {linkUrl && !isValidUrl(linkUrl) && (
                <p className="text-sm text-red-600">Please enter a valid URL</p>
              )}
            </div>

            {/* Link Text Input */}
            <div className="space-y-2">
              <Label htmlFor="link-text">Link Text</Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Enter display text for the link"
              />
            </div>

            {/* Link Preview */}
            {linkMetadata && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">Link Preview</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    {linkMetadata.image && (
                      <img 
                        src={linkMetadata.image} 
                        alt=""
                        className="w-12 h-12 rounded border object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {linkMetadata.title}
                      </h4>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {linkMetadata.description}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-gray-500">{linkMetadata.domain}</span>
                        {linkMetadata.error && (
                          <span className="text-xs text-red-500">• {linkMetadata.error}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview of how link will appear */}
            {linkText && linkUrl && isValidUrl(linkUrl) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">How it will appear:</span>
                </div>
                <div className="text-sm">
                  <a 
                    href={normalizeUrl(linkUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800 transition-colors"
                  >
                    {linkText}
                  </a>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLinkDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={insertEnhancedLink}
              disabled={!linkUrl.trim() || !linkText.trim() || !isValidUrl(linkUrl.trim())}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Link className="w-4 h-4 mr-2" />
              Insert Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default WYSIWYGEditorSimple