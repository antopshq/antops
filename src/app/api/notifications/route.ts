import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { createSupabaseServerClient } from '@/lib/supabase'
import { CommentNotification, Notification } from '@/lib/types'

// Get notifications for the current user
export async function GET(request: NextRequest) {
  try {
    console.log('🐛 DEBUG: GET /api/notifications called')
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      console.log('🐛 DEBUG: User not authenticated')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user
    console.log('🐛 DEBUG: User authenticated:', user.id, user.email)

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get('type') // 'comment' | 'system' | 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    console.log('🐛 DEBUG: Query params - type:', type, 'limit:', limit, 'unreadOnly:', unreadOnly)

    const supabase = await createSupabaseServerClient()

    // Fetch system notifications
    let systemNotifications: Notification[] = []
    if (type !== 'comment') {
      let systemQuery = supabase
        .from('notifications')
        .select(`
          *,
          change:changes!change_id(title, status),
          incident:incidents!incident_id(title, status),
          problem:problems!problem_id(title, status)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (unreadOnly) {
        systemQuery = systemQuery.eq('read', false)
      }

      const { data: systemData, error: systemError } = await systemQuery

      if (systemError) {
        console.error('Error fetching system notifications:', systemError)
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
      }

      systemNotifications = systemData?.map((notification: any) => ({
        id: notification.id,
        organizationId: notification.organization_id,
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        read: notification.read,
        changeId: notification.change_id,
        incidentId: notification.incident_id,
        problemId: notification.problem_id,
        createdAt: notification.created_at,
        updatedAt: notification.updated_at
      })) || []
    }

    // Fetch comment notifications
    let commentNotifications: CommentNotification[] = []
    if (type !== 'system') {
      let commentQuery = supabase
        .from('comment_notifications')
        .select(`
          id,
          comment_id,
          user_id,
          is_read,
          created_at,
          comment:comments!comment_id(
            id,
            content,
            created_at,
            incident_id,
            problem_id,
            change_id,
            author:profiles!author_id(
              id,
              full_name,
              email
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (unreadOnly) {
        commentQuery = commentQuery.eq('is_read', false)
      }

      const { data: commentData, error: commentError } = await commentQuery

      if (commentError) {
        console.error('Error fetching comment notifications:', commentError)
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
      }

      console.log('🐛 DEBUG: Raw comment notification data from DB:', commentData)

      commentNotifications = commentData?.map((notification: any) => ({
        id: notification.id,
        commentId: notification.comment_id,
        userId: notification.user_id,
        isRead: notification.is_read,
        createdAt: notification.created_at,
        comment: notification.comment ? {
          id: notification.comment.id,
          organizationId: user.organizationId,
          content: notification.comment.content,
          authorId: notification.comment.author.id,
          author: {
            id: notification.comment.author.id,
            name: notification.comment.author.full_name,
            email: notification.comment.author.email
          },
          mentions: [],
          createdAt: notification.comment.created_at,
          updatedAt: notification.comment.created_at,
          incidentId: notification.comment.incident_id,
          problemId: notification.comment.problem_id,
          changeId: notification.comment.change_id
        } : undefined
      })) || []
    }

    console.log('🐛 DEBUG: Final response - systemNotifications:', systemNotifications.length, 'commentNotifications:', commentNotifications.length)
    
    return NextResponse.json({
      systemNotifications,
      commentNotifications,
      total: systemNotifications.length + commentNotifications.length
    })
  } catch (error) {
    console.error('GET notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

    const body = await request.json()
    const { notificationIds, markAll = false, type = 'all' } = body // type: 'comment' | 'system' | 'all'

    const supabase = await createSupabaseServerClient()

    let updatedCount = 0

    // Update system notifications
    if (type === 'system' || type === 'all') {
      let systemQuery = supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)

      if (!markAll && notificationIds && notificationIds.length > 0) {
        systemQuery = systemQuery.in('id', notificationIds)
      }

      const { error: systemError, count: systemCount } = await systemQuery

      if (systemError) {
        console.error('Error marking system notifications as read:', systemError)
        return NextResponse.json({ error: 'Failed to update system notifications' }, { status: 500 })
      }

      updatedCount += systemCount || 0
    }

    // Update comment notifications
    if (type === 'comment' || type === 'all') {
      let commentQuery = supabase
        .from('comment_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)

      if (!markAll && notificationIds && notificationIds.length > 0) {
        commentQuery = commentQuery.in('id', notificationIds)
      }

      const { error: commentError, count: commentCount } = await commentQuery

      if (commentError) {
        console.error('Error marking comment notifications as read:', commentError)
        return NextResponse.json({ error: 'Failed to update comment notifications' }, { status: 500 })
      }

      updatedCount += commentCount || 0
    }

    return NextResponse.json({ 
      success: true, 
      updatedCount,
      message: markAll ? 'All notifications marked as read' : `${updatedCount} notifications marked as read`
    })
  } catch (error) {
    console.error('PUT notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}