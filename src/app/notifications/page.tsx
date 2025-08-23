'use client'

import { useState, useEffect } from 'react'
import { ClientLayout } from '@/components/layout/client-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, CheckCircle, Clock, AlertTriangle, Send, MarkEmailRead } from 'lucide-react'
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
  data?: any
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications?type=system&limit=50&unreadOnly=${filter === 'unread'}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.systemNotifications || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds,
          type: 'system'
        })
      })

      if (response.ok) {
        fetchNotifications()
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markAll: true,
          type: 'system'
        })
      })

      if (response.ok) {
        fetchNotifications()
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'change_approval_request':
        return <Clock className="w-5 h-5 text-orange-600" />
      case 'change_approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'change_rejected':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'change_auto_started':
        return <Send className="w-5 h-5 text-blue-600" />
      case 'change_completion_prompt':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />
      default:
        return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const getNotificationLink = (notification: Notification) => {
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getNotificationTypeDisplay = (type: string) => {
    switch (type) {
      case 'change_approval_request':
        return 'Approval Request'
      case 'change_approved':
        return 'Change Approved'
      case 'change_rejected':
        return 'Change Rejected'
      case 'change_auto_started':
        return 'Auto Started'
      case 'change_completion_prompt':
        return 'Completion Check'
      default:
        return 'Notification'
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [filter])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <ClientLayout>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">Stay updated with changes and approvals</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </Button>
            </div>
            
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
              >
                <MarkEmailRead className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">Loading notifications...</div>
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </h3>
              <p className="text-gray-600 text-center">
                {filter === 'unread' 
                  ? 'All caught up! No unread notifications at the moment.'
                  : 'Notifications about change approvals and status updates will appear here.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`transition-colors hover:shadow-md ${
                  !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {getNotificationTypeDisplay(notification.type)}
                            </Badge>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                          
                          <p className={`text-sm ${
                            !notification.read ? 'text-gray-800' : 'text-gray-600'
                          } mb-2`}>
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.createdAt)}
                            </span>
                            
                            <div className="flex items-center space-x-2">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead([notification.id])}
                                  className="text-xs h-6 px-2"
                                >
                                  Mark as read
                                </Button>
                              )}
                              
                              {(notification.changeId || notification.incidentId || notification.problemId) && (
                                <Link href={getNotificationLink(notification)}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-6 px-2"
                                    onClick={() => {
                                      if (!notification.read) {
                                        markAsRead([notification.id])
                                      }
                                    }}
                                  >
                                    View Details
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  )
}