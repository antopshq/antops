'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import { MessageSquare, Send, Edit2, Trash2, Reply, AtSign, Heart, Zap, Download, FileImage, FileText, ExternalLink } from 'lucide-react'
import { Comment } from '@/lib/types'
import { useWebSocket } from '@/hooks/useWebSocket'
import { formatDistanceToNow } from 'date-fns'

interface CommentSectionProps {
  itemType: 'incident' | 'problem' | 'change'
  itemId: string
  className?: string
  teamMembers?: TeamMember[]
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  fullName?: string
  createdAt: string
}

// Helper function to get user initials
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Helper function to get consistent gradient for avatars based on user ID
function getAvatarGradient(userId: string): string {
  const gradients = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-teal-600', 
    'from-pink-500 to-rose-600',
    'from-orange-500 to-red-600',
    'from-indigo-500 to-blue-600',
    'from-purple-500 to-pink-600',
    'from-teal-500 to-cyan-600',
    'from-yellow-500 to-orange-600',
  ]
  
  // Use userId to consistently assign same gradient to same user
  const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length
  return gradients[index]
}

export function CommentSection({ itemType, itemId, className = '', teamMembers: propTeamMembers }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [mentionsInComment, setMentionsInComment] = useState<string[]>([])
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; name: string; size: number; type: string; file?: File }[]>([])
  

  // WebSocket for real-time updates (optional) - TEMPORARILY DISABLED
  let isConnected = false
  // Uncomment when you have authentication working
  /*
  try {
    const webSocketResult = useWebSocket({
      itemType,
      itemId,
      onRealtimeUpdate: useCallback((update) => {
        if (update.itemType === itemType && update.itemId === itemId) {
          if (update.type === 'comment_added') {
            setComments(prev => [...prev, update.data])
          } else if (update.type === 'comment_updated') {
            setComments(prev => prev.map(comment => 
              comment.id === update.data.id ? update.data : comment
            ))
          } else if (update.type === 'comment_deleted') {
            setComments(prev => prev.filter(comment => comment.id !== update.data.commentId))
          }
        }
      }, [itemType, itemId]),
      onMentionNotification: useCallback((notification) => {
        // Show notification to user (you could implement a toast or notification system)
        console.log('You were mentioned in a comment:', notification)
      }, [])
    })
    isConnected = webSocketResult.isConnected
  } catch (error) {
    console.warn('WebSocket connection failed, using fallback mode:', error)
    isConnected = false
  }
  */

  // Load comments and team members
  useEffect(() => {
    loadComments()
    if (!propTeamMembers) {
      loadTeamMembers()
    } else {
      setTeamMembers(propTeamMembers)
    }
  }, [itemType, itemId, propTeamMembers])

  const loadComments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/comments?itemType=${itemType}&itemId=${itemId}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data)
      } else {
        console.error('Failed to load comments')
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTeamMembers = async () => {
    try {
      const response = await fetch('/api/team')
      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.teamMembers || [])
      } else {
        console.error('Failed to fetch team members:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }


  const submitComment = async () => {
    if (!newComment.trim()) return
    if (submitLoading) {
      console.log('🐛 DEBUG: Already submitting, ignoring duplicate call')
      return
    }

    console.log('🐛 DEBUG: Submitting comment with mentions:', mentionsInComment)
    console.log('🐛 DEBUG: Comment content:', newComment)

    setSubmitLoading(true)
    try {
      // Create FormData for file uploads
      const formData = new FormData()
      formData.append('content', newComment)
      formData.append('itemType', itemType)
      formData.append('itemId', itemId)
      formData.append('mentions', JSON.stringify(mentionsInComment))
      
      // Add files to FormData
      attachedFiles.forEach((fileInfo, index) => {
        if (fileInfo.file) {
          formData.append(`files`, fileInfo.file)
          formData.append(`fileInfo_${index}`, JSON.stringify({
            id: fileInfo.id,
            name: fileInfo.name,
            size: fileInfo.size,
            type: fileInfo.type
          }))
        }
      })
      
      const response = await fetch('/api/comments', {
        method: 'POST',
        body: formData // Don't set Content-Type, let browser set it with boundary
      })

      if (response.ok) {
        const newCommentData = await response.json()
        setNewComment('')
        setMentionsInComment([])
        setAttachedFiles([])
        
        // Add comment immediately if WebSocket is not connected
        if (!isConnected) {
          setComments(prev => [...prev, newCommentData])
        }
        // Otherwise, comment will be added via WebSocket real-time update
      } else {
        const errorData = await response.json()
        console.error('Failed to submit comment:', errorData)
        alert('Failed to submit comment: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
      alert('Error submitting comment. Please try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  const updateComment = async (commentId: string) => {
    if (!editingContent.trim()) return

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editingContent,
          mentions: [] // You'd need to extract mentions from editingContent
        })
      })

      if (response.ok) {
        const updatedCommentData = await response.json()
        setEditingCommentId(null)
        setEditingContent('')
        
        // Update comment immediately if WebSocket is not connected
        if (!isConnected) {
          setComments(prev => prev.map(comment => 
            comment.id === commentId ? updatedCommentData : comment
          ))
        }
        // Otherwise, comment will be updated via WebSocket real-time update
      } else {
        const errorData = await response.json()
        console.error('Failed to update comment:', errorData)
        alert('Failed to update comment: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating comment:', error)
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove comment immediately if WebSocket is not connected
        if (!isConnected) {
          setComments(prev => prev.filter(comment => comment.id !== commentId))
        }
        // Otherwise, comment will be removed via WebSocket real-time update
      } else {
        const errorData = await response.json()
        console.error('Failed to delete comment:', errorData)
        alert('Failed to delete comment: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const formatCommentContent = (content: string) => {
    if (!content) return ''
    
    // Check if content is already HTML (from Tiptap editor)
    const isHTML = content.includes('<p>') || content.includes('<ul>') || content.includes('<ol>') || content.includes('<h')
    
    if (isHTML) {
      // Content is already proper HTML from Tiptap, return as-is
      return content
    }
    
    // Legacy markdown conversion for old content
    let formatted = content
      // Convert mentions first
      .replace(
        /@\[([^\]]+)\]\(([^)]+)\)/g,
        '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">@$1</span>'
      )
      // Convert bold **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert italic *text*
      .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
      // Convert underline __text__
      .replace(/__(.*?)__/g, '<u>$1</u>')
      // Convert inline code `text`
      .replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
      // Convert code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto"><code>$1</code></pre>')
      // Convert quotes
      .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600">$1</blockquote>')
      // Lists will be handled after main formatting
      // Convert links [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Handle lists more properly
    // Convert bullet lists
    formatted = formatted.replace(/^- (.+)$/gm, '<li class="list-disc ml-4 mb-1">$1</li>')
    // Convert numbered lists  
    formatted = formatted.replace(/^\d+\. (.+)$/gm, '<li class="list-decimal ml-4 mb-1">$1</li>')
    
    // Wrap consecutive list items in proper list containers
    formatted = formatted.replace(/(<li class="list-disc[^>]*>.*?<\/li>)+/g, '<ul class="list-disc ml-4 mb-2">$&</ul>')
    formatted = formatted.replace(/(<li class="list-decimal[^>]*>.*?<\/li>)+/g, '<ol class="list-decimal ml-4 mb-2">$&</ol>')

    return formatted
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-4 text-gray-500">Loading comments...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5" />
          <span>Comments ({comments.length})</span>
          {isConnected && (
            <Badge variant="outline" className="text-green-600 border-green-300">
              Live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enhanced Comment Form with Rich Text Editor */}
        <div className="relative bg-gradient-to-r from-orange-50 to-red-50 rounded-3xl p-6 border-2 border-dashed border-orange-200 hover:border-orange-300 transition-all duration-200">
          <div className="flex items-start space-x-4">
            {/* Current User Avatar Placeholder */}
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg ring-4 ring-white flex-shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            
            <div className="flex-1 relative">
              <TiptapEditor
                value={newComment}
                onChange={(value) => {
                  setNewComment(value)
                  // Extract mentions from the rich text content - only data-type="mention" elements
                  console.log('🐛 DEBUG: Full editor content:', value)
                  
                  // More precise regex - only match spans that explicitly have data-type="mention"
                  const mentionMatches = Array.from(value.matchAll(/<span[^>]*data-type="mention"[^>]*data-id="([^"]+)"[^>]*>/g))
                  const mentions = mentionMatches.map(match => match[1])
                  
                  // Remove any duplicates (just in case)
                  const uniqueMentions = [...new Set(mentions)]
                  
                  console.log('🐛 DEBUG: Mention matches found:', mentionMatches.length)
                  console.log('🐛 DEBUG: Extracted user IDs:', mentions)
                  console.log('🐛 DEBUG: Unique mentions:', uniqueMentions)
                  setMentionsInComment(uniqueMentions)
                }}
                placeholder="💬 Share your thoughts... Use @ to mention teammates!"
                minHeight="120px"
                attachedFiles={attachedFiles}
                onFilesChange={setAttachedFiles}
                teamMembers={teamMembers}
                maxFiles={2}
                maxFileSize={2 * 1024 * 1024}
              />
              
              <Button
                type="button"
                onClick={submitComment}
                disabled={!newComment.trim() || submitLoading}
                size="sm"
                className="absolute top-3 right-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-full shadow-lg transform hover:scale-105 transition-all duration-200 z-10"
                title={attachedFiles.length > 0 ? `Send with ${attachedFiles.length} attachment${attachedFiles.length > 1 ? 's' : ''}` : 'Send comment'}
              >
                {submitLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          {/* Fun encouragement text - aligned with comment box */}
          <div className="flex items-start space-x-4">
            {/* Avatar space to align with comment box */}
            <div className="w-12 h-12 flex-shrink-0"></div>
            
            <div className="flex-1 flex items-center justify-between text-xs text-gray-500 mt-2">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <AtSign className="w-3 h-3" />
                  <span>Mention teammates</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Heart className="w-3 h-3 text-pink-400" />
                  <span>Be kind & constructive</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment, index) => (
              <div key={comment.id} className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'} mb-6 group`}>
                <div className={`flex items-start space-x-3 max-w-[85%] ${index % 2 === 0 ? '' : 'flex-row-reverse space-x-reverse'}`}>
                  {/* Enhanced Avatar */}
                  <div className={`w-12 h-12 bg-gradient-to-r ${getAvatarGradient(comment.author.id)} rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg ring-4 ring-white transform group-hover:scale-110 transition-all duration-200 flex-shrink-0`}>
                    {getInitials(comment.author.name)}
                  </div>
                  
                  {/* Speech Bubble Comment */}
                  <div className={`relative bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-lg border border-gray-100 p-5 transform group-hover:shadow-xl transition-all duration-200 ${index % 2 === 0 ? 'rounded-bl-lg' : 'rounded-br-lg'}`}>
                    {/* Speech bubble tail */}
                    <div className={`absolute top-4 w-4 h-4 bg-gradient-to-br from-white to-gray-50 border-l border-b border-gray-100 transform rotate-45 ${index % 2 === 0 ? '-left-2' : '-right-2'}`}></div>
                    
                    {/* Author and timestamp header */}
                    <div className={`flex items-center justify-between mb-3 ${index % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                      <div className={`flex items-center space-x-2 ${index % 2 === 0 ? '' : 'flex-row-reverse space-x-reverse'}`}>
                        <div className="font-semibold text-gray-900 text-sm">
                          {comment.author.name}
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Zap className="w-3 h-3" />
                          <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                          {comment.updatedAt !== comment.createdAt && (
                            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">edited</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Comment Actions - only show on hover */}
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setEditingCommentId(comment.id)
                            setEditingContent(comment.content)
                          }}
                          className="h-7 px-2 text-xs text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteComment(comment.id)}
                          className="h-7 px-2 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    
                    {/* Comment Content */}
                    {editingCommentId === comment.id ? (
                      <div className="space-y-3">
                        <TiptapEditor
                          value={editingContent}
                          onChange={setEditingContent}
                          placeholder="Edit your comment..."
                          minHeight="100px"
                          className="text-sm"
                          teamMembers={teamMembers}
                        />
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCommentId(null)
                              setEditingContent('')
                            }}
                            className="h-8 px-4 text-xs rounded-full border-gray-300 hover:bg-gray-100"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateComment(comment.id)}
                            className="h-8 px-4 text-xs bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-full shadow-lg"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div 
                          className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"
                          dangerouslySetInnerHTML={{ 
                            __html: formatCommentContent(comment.content) 
                          }}
                        />
                        
                        {/* File Attachments */}
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs font-medium text-gray-600 flex items-center space-x-1">
                              <span>Attachments ({comment.attachments.length})</span>
                            </div>
                            <div className="space-y-2">
                              {comment.attachments.map((attachment) => {
                                const isImage = attachment.type.startsWith('image/')
                                const isPdf = attachment.type === 'application/pdf'
                                const formatFileSize = (bytes: number) => {
                                  if (bytes < 1024) return `${bytes} B`
                                  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
                                  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
                                }
                                
                                return (
                                  <div key={attachment.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                                        <div className="flex-shrink-0">
                                          {isImage ? (
                                            <FileImage className="w-5 h-5 text-blue-500" />
                                          ) : isPdf ? (
                                            <FileText className="w-5 h-5 text-red-500" />
                                          ) : (
                                            <FileText className="w-5 h-5 text-gray-500" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">
                                            {attachment.name}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {formatFileSize(attachment.size)} • {attachment.type.split('/')[1].toUpperCase()}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {isImage && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(attachment.url, '_blank')}
                                            className="h-8 px-3 text-xs text-blue-600 hover:bg-blue-50"
                                            title="View image"
                                          >
                                            <ExternalLink className="w-3 h-3 mr-1" />
                                            View
                                          </Button>
                                        )}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const link = document.createElement('a')
                                            link.href = attachment.url
                                            link.download = attachment.name
                                            link.click()
                                          }}
                                          className="h-8 px-3 text-xs text-gray-600 hover:bg-gray-100"
                                          title="Download file"
                                        >
                                          <Download className="w-3 h-3 mr-1" />
                                          Download
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}