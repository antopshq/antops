'use client'

import './tiptap-editor.css'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Mention from '@tiptap/extension-mention'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Code from '@tiptap/extension-code'
import { createLowlight } from 'lowlight'
import { useCallback, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  Code as CodeIcon, 
  FileCode, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Link as LinkIcon, 
  Paperclip, 
  Smile,
  X
} from 'lucide-react'

interface AttachedFile {
  id: string
  name: string
  size: number
  type: string
  file?: File
}

interface TiptapEditorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  minHeight?: string
  className?: string
  attachedFiles?: AttachedFile[]
  onFilesChange?: (files: AttachedFile[]) => void
  maxFiles?: number
  maxFileSize?: number
  onMentionTrigger?: (query: string) => void
}

// Create lowlight instance and register languages
const lowlight = createLowlight()

// Common language syntax highlighting
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'

lowlight.register('javascript', javascript)
lowlight.register('typescript', typescript)
lowlight.register('python', python)
lowlight.register('bash', bash)
lowlight.register('sql', sql)

export function TiptapEditor({
  value = '',
  onChange,
  placeholder = 'Start typing...',
  minHeight = '150px',
  className = '',
  attachedFiles = [],
  onFilesChange,
  maxFiles = 2,
  maxFileSize = 2 * 1024 * 1024, // 2MB
  onMentionTrigger
}: TiptapEditorProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
        code: false, // We'll configure Code separately to avoid duplicates
        link: false, // We'll configure Link separately to avoid duplicates
      }),
      Code.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 text-red-600 px-1 py-0.5 rounded text-sm font-mono',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item flex items-start',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-medium',
        },
        suggestion: {
          items: ({ query }) => {
            // This would typically come from your team members API
            const teamMembers = ['Alice Johnson', 'Bob Smith', 'Charlie Brown', 'David Wilson']
            return teamMembers
              .filter(name => name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 5)
          },
          render: () => {
            let component: HTMLDivElement
            return {
              onStart: (props) => {
                component = document.createElement('div')
                component.classList.add(
                  'bg-white', 'border', 'border-gray-200', 'rounded-lg', 
                  'shadow-lg', 'p-1', 'z-50', 'min-w-48'
                )
                
                if (props.clientRect) {
                  const rect = props.clientRect()
                  Object.assign(component.style, {
                    position: 'absolute',
                    top: `${rect.bottom + window.scrollY + 4}px`,
                    left: `${rect.left + window.scrollX}px`,
                  })
                }
                
                document.body.appendChild(component)
                
                const renderItems = () => {
                  component.innerHTML = props.items
                    .map((item, index) => `
                      <div class="px-3 py-2 cursor-pointer hover:bg-gray-100 rounded ${
                        index === props.selectedIndex ? 'bg-blue-50 text-blue-600' : ''
                      }">
                        ${item}
                      </div>
                    `)
                    .join('')
                }
                
                renderItems()
              },
              onUpdate: (props) => {
                if (component) {
                  component.innerHTML = props.items
                    .map((item, index) => `
                      <div class="px-3 py-2 cursor-pointer hover:bg-gray-100 rounded ${
                        index === props.selectedIndex ? 'bg-blue-50 text-blue-600' : ''
                      }">
                        ${item}
                      </div>
                    `)
                    .join('')
                }
              },
              onKeyDown: (props) => {
                if (props.event.key === 'Escape') {
                  component?.remove()
                  return true
                }
                return false
              },
              onExit: () => {
                component?.remove()
              },
            }
          },
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose-base focus:outline-none max-w-none ${className}`,
        style: `min-height: ${minHeight}`,
      },
    },
  })

  // Update content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  const addLink = useCallback(() => {
    const url = window.prompt('Enter a URL')
    if (url && editor) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (attachedFiles.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        alert(`File "${file.name}" is too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB`)
        return false
      }
      return true
    })

    const newFiles: AttachedFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      type: file.type,
      file
    }))

    onFilesChange?.([...attachedFiles, ...newFiles])
    
    // Clear the input
    e.target.value = ''
  }, [attachedFiles, maxFiles, maxFileSize, onFilesChange])

  const removeFile = useCallback((fileId: string) => {
    onFilesChange?.(attachedFiles.filter(f => f.id !== fileId))
  }, [attachedFiles, onFilesChange])

  const addEmoji = useCallback((emoji: string) => {
    if (editor) {
      editor.chain().focus().insertContent(emoji).run()
      setShowEmojiPicker(false)
    }
  }, [editor])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  if (!editor) return null

  return (
    <div className={`border border-gray-200 rounded-lg bg-white/80 backdrop-blur-sm ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('code') ? 'bg-gray-200' : ''}`}
        >
          <CodeIcon className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('codeBlock') ? 'bg-gray-200' : ''}`}
        >
          <FileCode className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('taskList') ? 'bg-gray-200' : ''}`}
        >
          <CheckSquare className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-gray-300 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addLink}
          className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => document.getElementById('file-upload')?.click()}
          className="h-8 w-8 p-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="h-8 w-8 p-0"
          >
            <Smile className="h-4 w-4" />
          </Button>
          
          {showEmojiPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1 z-50">
              {['😀','😂','😍','😎','👍','🔥','🚀','🎉','✅','❗','💡','🎯','📝','⚠️','🐛'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  className="text-xl hover:bg-gray-100 p-1 rounded"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <input
          id="file-upload"
          type="file"
          multiple
          className="hidden"
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx,.txt,.log"
        />
      </div>
      
      {/* Editor Content */}
      <div className="p-3">
        <EditorContent 
          editor={editor} 
          className="focus:outline-none"
        />
      </div>
      
      {/* Attached Files */}
      {attachedFiles.length > 0 && (
        <div className="border-t border-gray-200 p-3">
          <div className="text-xs font-medium text-gray-600 mb-2">
            Attachments ({attachedFiles.length}/{maxFiles})
          </div>
          <div className="space-y-2">
            {attachedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 truncate">{file.name}</div>
                    <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Click outside to close emoji picker */}
      {showEmojiPicker && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  )
}