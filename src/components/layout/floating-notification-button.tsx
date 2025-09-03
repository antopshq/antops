'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCircle, Clock, AlertTriangle, Send, X, AtSign, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  changeId?: string
  incidentId?: string
  problemId?: string
  commentId?: string
  data?: any
}

interface CommentNotification {
  id: string
  commentId: string
  userId: string
  isRead: boolean
  createdAt: string
  comment?: {
    id: string
    content: string
    author: {
      id: string
      name: string
      email: string
    }
    incidentId?: string
    problemId?: string
    changeId?: string
  }
}

export function FloatingNotificationButton() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [commentNotifications, setCommentNotifications] = useState<CommentNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchNotifications = async () => {
    try {
      console.log('🐛 DEBUG: Fetching notifications...')
      const res = await fetch('/api/notifications?type=all&limit=10')
      if (res.ok) {
        const data = await res.json()
        console.log('🐛 DEBUG: Received notifications data:', data)
        console.log('🐛 DEBUG: System notifications count:', data.systemNotifications?.length || 0)
        console.log('🐛 DEBUG: Comment notifications count:', data.commentNotifications?.length || 0)
        
        setNotifications(data.systemNotifications || [])
        setCommentNotifications(data.commentNotifications || [])
        
        const systemUnread = data.systemNotifications?.filter((n: Notification) => !n.read).length || 0
        const commentUnread = data.commentNotifications?.filter((n: CommentNotification) => !n.isRead).length || 0
        
        console.log('🐛 DEBUG: System unread:', systemUnread, 'Comment unread:', commentUnread)
        setUnreadCount(systemUnread + commentUnread)
      } else {
        console.log('🐛 DEBUG: API response not ok:', res.status, res.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (notificationIds: string[], isComment = false) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds,
          type: isComment ? 'comment' : 'system'
        })
      })

      if (res.ok) {
        fetchNotifications() // Refresh notifications
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markAll: true,
          type: 'all'
        })
      })

      if (res.ok) {
        fetchNotifications() // Refresh notifications
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    } finally {
      setLoading(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'change_approval_request':
        return <Clock className="w-4 h-4 text-orange-600" />
      case 'change_approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'change_rejected':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'change_auto_started':
        return <Send className="w-4 h-4 text-blue-600" />
      case 'change_completion_prompt':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />
      case 'mention':
        return <AtSign className="w-4 h-4 text-purple-600" />
      case 'comment':
        return <MessageCircle className="w-4 h-4 text-blue-600" />
      default:
        return <Bell className="w-4 h-4 text-gray-600" />
    }
  }

  const getSystemNotificationLink = (notification: Notification) => {
    if (notification.changeId) {
      return `/changes/${notification.changeId}`
    }
    if (notification.incidentId) {
      return `/incidents/${notification.incidentId}`
    }
    if (notification.problemId) {
      return `/problems/${notification.problemId}`
    }
    return '#'
  }

  const getCommentNotificationLink = (notification: CommentNotification) => {
    if (notification.comment?.changeId) {
      return `/changes/${notification.comment.changeId}#comment-${notification.commentId}`
    }
    if (notification.comment?.incidentId) {
      return `/incidents/${notification.comment.incidentId}#comment-${notification.commentId}`
    }
    if (notification.comment?.problemId) {
      return `/problems/${notification.comment.problemId}#comment-${notification.commentId}`
    }
    return '#'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            className="relative h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200" style={{ backgroundColor: '#FF7A1A' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E6661A'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FF7A1A'}
          >
            <Bell className="h-5 w-5 text-white" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0 mr-4 mb-4" 
          align="end" 
          side="top"
        >
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={loading}
                  className="hover:opacity-75" style={{ color: '#FF7A1A' }}
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && commentNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y">
                {/* Comment Notifications (Mentions) */}
                {commentNotifications.map((notification) => (
                  <Link 
                    key={`comment-${notification.id}`}
                    href={getCommentNotificationLink(notification)}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead([notification.id], true)
                      }
                      setOpen(false)
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <AtSign className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.comment?.author.name} mentioned you
                        </div>
                        <div className={`text-xs ${notification.isRead ? 'text-gray-500' : 'text-gray-700'} mt-1 line-clamp-2`}>
                          {notification.comment?.content?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.createdAt)}
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </Link>
                ))}
                
                {/* System Notifications */}
                {notifications.map((notification) => (
                  <Link 
                    key={`system-${notification.id}`}
                    href={getSystemNotificationLink(notification)}
                    className="block p-4 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead([notification.id], false)
                      }
                      setOpen(false)
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                          {notification.title}
                        </div>
                        <div className={`text-xs ${notification.read ? 'text-gray-500' : 'text-gray-700'} mt-1`}>
                          {notification.message}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.createdAt)}
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          
          {(notifications.length + commentNotifications.length) > 10 && (
            <div className="p-4 border-t text-center">
              <Link href="/notifications" onClick={() => setOpen(false)}>
                <Button variant="ghost" size="sm" className="hover:opacity-75" style={{ color: '#FF7A1A' }}>
                  View all notifications
                </Button>
              </Link>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}