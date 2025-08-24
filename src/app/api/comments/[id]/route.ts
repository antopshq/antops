import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'
import { Comment } from '@/lib/types'

// Update a comment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { content, mentions = [] } = body

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    // First check if the comment exists and belongs to the user
    const supabase = await createSupabaseServerClient()
    const { data: existingComment, error: fetchError } = await supabase
      .from('comments')
      .select('author_id, organization_id, incident_id, problem_id, change_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingComment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    if (existingComment.author_id !== user.id || existingComment.organization_id !== user.organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized to edit this comment' },
        { status: 403 }
      )
    }

    // Update the comment
    const { data: updatedComment, error } = await supabase
      .from('comments')
      .update({
        content: content.trim(),
        mentions,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id,
        organization_id,
        content,
        author_id,
        mentions,
        created_at,
        updated_at,
        incident_id,
        problem_id,
        change_id,
        author:profiles!author_id(
          id,
          full_name,
          email
        )
      `)
      .single()

    if (error) {
      console.error('Error updating comment:', error)
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      )
    }

    // Transform the response
    const author = Array.isArray(updatedComment.author) ? updatedComment.author[0] : updatedComment.author
    const transformedComment: Comment = {
      id: updatedComment.id,
      organizationId: updatedComment.organization_id,
      content: updatedComment.content,
      authorId: updatedComment.author_id,
      author: {
        id: author?.id || updatedComment.author_id,
        name: author?.full_name || 'Unknown',
        email: author?.email || ''
      },
      mentions: updatedComment.mentions || [],
      createdAt: updatedComment.created_at,
      updatedAt: updatedComment.updated_at,
      incidentId: updatedComment.incident_id,
      problemId: updatedComment.problem_id,
      changeId: updatedComment.change_id
    }

    // Determine item type and ID for real-time updates
    let itemType: string
    let itemId: string

    if (existingComment.incident_id) {
      itemType = 'incident'
      itemId = existingComment.incident_id
    } else if (existingComment.problem_id) {
      itemType = 'problem'
      itemId = existingComment.problem_id
    } else if (existingComment.change_id) {
      itemType = 'change'
      itemId = existingComment.change_id
    } else {
      return NextResponse.json(transformedComment)
    }

    // Send real-time update via WebSocket
    if ((global as any).io) {
      const wsUpdatePayload: {
        type: 'comment_updated';
        data: Comment;
        itemType: string;
        itemId: string;
        organizationId: string;
      } = {
        type: 'comment_updated',
        data: transformedComment,
        itemType: itemType,
        itemId: itemId,
        organizationId: user.organizationId
      }

      // Broadcast to organization
      (global as any).io.to(`org:${user.organizationId}`).emit('realtime_update', wsUpdatePayload)
      
      // Also broadcast to specific item room
      (global as any).io.to(`${itemType}:${itemId}`).emit('realtime_update', wsUpdatePayload)
    }

    return NextResponse.json(transformedComment)
  } catch (error) {
    console.error('PUT comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // First check if the comment exists and belongs to the user
    const supabase = await createSupabaseServerClient()
    const { data: existingComment, error: fetchError } = await supabase
      .from('comments')
      .select('author_id, organization_id, incident_id, problem_id, change_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingComment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    if (existingComment.author_id !== user.id || existingComment.organization_id !== user.organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this comment' },
        { status: 403 }
      )
    }

    // Delete the comment
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting comment:', error)
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      )
    }

    // Determine item type and ID for real-time updates
    let itemType: string
    let itemId: string

    if (existingComment.incident_id) {
      itemType = 'incident'
      itemId = existingComment.incident_id
    } else if (existingComment.problem_id) {
      itemType = 'problem'
      itemId = existingComment.problem_id
    } else if (existingComment.change_id) {
      itemType = 'change'
      itemId = existingComment.change_id
    } else {
      return NextResponse.json({ success: true })
    }

    // Send real-time update via WebSocket
    if ((global as any).io) {
      const wsDeletePayload: {
        type: 'comment_deleted';
        data: { commentId: string };
        itemType: string;
        itemId: string;
        organizationId: string;
      } = {
        type: 'comment_deleted',
        data: { commentId: id },
        itemType: itemType,
        itemId: itemId,
        organizationId: user.organizationId
      }

      // Broadcast to organization
      (global as any).io.to(`org:${user.organizationId}`).emit('realtime_update', wsDeletePayload)
      
      // Also broadcast to specific item room
      (global as any).io.to(`${itemType}:${itemId}`).emit('realtime_update', wsDeletePayload)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}