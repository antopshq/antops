'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { Comment, CommentNotification } from '@/lib/types'

interface RealtimeUpdate {
  type: 'comment_added' | 'comment_updated' | 'comment_deleted' | 'status_changed' | 'assignment_changed'
  data: any
  itemType: 'incident' | 'problem' | 'change'
  itemId: string
  organizationId: string
}

interface MentionNotification {
  type: 'mention'
  comment: Comment
  mentionedBy: {
    id: string
    name: string
    email: string
  }
  itemType: 'incident' | 'problem' | 'change'
  itemId: string
}

interface UseWebSocketProps {
  itemType?: 'incident' | 'problem' | 'change'
  itemId?: string
  onRealtimeUpdate?: (update: RealtimeUpdate) => void
  onMentionNotification?: (notification: MentionNotification) => void
}

export function useWebSocket({ 
  itemType, 
  itemId, 
  onRealtimeUpdate,
  onMentionNotification 
}: UseWebSocketProps = {}) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    if (socketRef.current?.connected) {
      return socketRef.current
    }

    try {
      // Get auth token from Supabase session
      let token: string | null = null
      
      try {
        // Try to get from localStorage (Supabase stores session here)
        const supabaseSession = localStorage.getItem('sb-localhost-auth-token')
        if (supabaseSession) {
          const sessionData = JSON.parse(supabaseSession)
          token = sessionData?.access_token
        }
        
        // Fallback: try other common Supabase storage keys
        if (!token) {
          const keys = Object.keys(localStorage).filter(key => 
            key.includes('supabase') && key.includes('auth')
          )
          for (const key of keys) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}')
              if (data.access_token) {
                token = data.access_token
                break
              }
            } catch (e) {
              continue
            }
          }
        }
      } catch (e) {
        console.warn('Could not get auth token from localStorage:', e)
      }

      if (!token) {
        console.warn('No auth token found - WebSocket will not connect')
        return null
      }

      const socket = io(process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_APP_URL || ''
        : 'http://localhost:3001', {
        transports: ['websocket', 'polling'],
        upgrade: true
      })

      socketRef.current = socket

      socket.on('connect', () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionError(null)
        
        // Authenticate after connection
        socket.emit('authenticate', token)
      })

      socket.on('authenticated', (response: { success: boolean, error?: string, user?: any }) => {
        if (response.success) {
          console.log('WebSocket authenticated:', response.user)
          
          // Join item-specific room if provided
          if (itemType && itemId) {
            socket.emit('join_item', { itemType, itemId })
          }
        } else {
          console.error('WebSocket authentication failed:', response.error)
          setConnectionError(response.error || 'Authentication failed')
        }
      })

      socket.on('realtime_update', (update: RealtimeUpdate) => {
        console.log('Received realtime update:', update)
        onRealtimeUpdate?.(update)
      })

      socket.on('mention_notification', (notification: MentionNotification) => {
        console.log('Received mention notification:', notification)
        onMentionNotification?.(notification)
      })

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
      })

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        setConnectionError(error.message)
        setIsConnected(false)
      })

      return socket
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionError(error instanceof Error ? error.message : 'Connection failed')
      return null
    }
  }, [itemType, itemId, onRealtimeUpdate, onMentionNotification])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [])

  const joinItem = useCallback((newItemType: string, newItemId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_item', { itemType: newItemType, itemId: newItemId })
    }
  }, [])

  const leaveItem = useCallback((newItemType: string, newItemId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_item', { itemType: newItemType, itemId: newItemId })
    }
  }, [])

  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  useEffect(() => {
    // If itemType or itemId changes, join the new room
    if (socketRef.current?.connected && itemType && itemId) {
      joinItem(itemType, itemId)
    }
  }, [itemType, itemId, joinItem])

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    connect,
    disconnect,
    joinItem,
    leaveItem
  }
}