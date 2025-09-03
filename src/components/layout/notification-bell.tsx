'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCircle, Clock, AlertTriangle, Send, X, AtSign, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [commentNotifications, setCommentNotifications] = useState<CommentNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?type=all&limit=10')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.systemNotifications || [])
        setCommentNotifications(data.commentNotifications || [])
        
        const systemUnread = data.systemNotifications?.filter((n: Notification) => !n.read).length || 0
        const commentUnread = data.commentNotifications?.filter((n: CommentNotification) => !n.isRead).length || 0
        setUnreadCount(systemUnread + commentUnread)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const markAsRead = async (notificationIds: string[], isComment = false) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds,
          type: isComment ? 'comment' : 'system'
        })
      })

      if (response.ok) {
        fetchNotifications() // Refresh notifications
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const markAllAsRead = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markAll: true,
          type: 'all'
        })
      })

      if (response.ok) {
        fetchNotifications() // Refresh notifications
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  useEffect(() => {
    fetchNotifications()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-black hover:text-gray-800 hover:bg-orange-600"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-medium">Notifications</span>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs h-6 px-2"
              >
                {loading ? 'Marking...' : 'Mark all read'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {notifications.length === 0 && commentNotifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            No notifications
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {/* Comment Notifications (Mentions) */}
            {commentNotifications.map((notification) => (
              <Link 
                key={`comment-${notification.id}`}
                href={getCommentNotificationLink(notification)}
                className="block p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                onClick={() => {
                  if (!notification.isRead) {
                    markAsRead([notification.id], true)
                  }
                  setIsOpen(false)
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
                      {formatTimeAgo(notification.createdAt)}
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
                className="block p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                onClick={() => {
                  if (!notification.read) {
                    markAsRead([notification.id], false)
                  }
                  setIsOpen(false)
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
                      {formatTimeAgo(notification.createdAt)}
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
        
        <div className="p-3 border-t">
          <Link 
            href="/notifications" 
            className="block w-full text-center text-sm text-blue-600 hover:text-blue-800"
            onClick={() => setIsOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}