import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createSupabaseServerClient } from '@/lib/supabase'
import { Comment } from '@/lib/types'
import { validateFile, validateFileCount, saveUploadedFile } from '@/lib/file-upload-utils'

// Get comments for a specific item (incident, problem, or change)
export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemType = searchParams.get('itemType') // 'incident', 'problem', 'change'
    const itemId = searchParams.get('itemId')

    if (!itemType || !itemId) {
      return NextResponse.json(
        { error: 'itemType and itemId are required' },
        { status: 400 }
      )
    }

    if (!['incident', 'problem', 'change'].includes(itemType)) {
      return NextResponse.json(
        { error: 'Invalid itemType. Must be incident, problem, or change' },
        { status: 400 }
      )
    }

    // Build the query based on item type
    const supabase = await createSupabaseServerClient()
    let query = supabase
      .from('comments')
      .select(`
        id,
        organization_id,
        content,
        author_id,
        mentions,
        attachments,
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
      .eq('organization_id', user.organizationId)
      .order('created_at', { ascending: true })

    // Add the appropriate filter based on item type
    if (itemType === 'incident') {
      query = query.eq('incident_id', itemId)
    } else if (itemType === 'problem') {
      query = query.eq('problem_id', itemId)
    } else if (itemType === 'change') {
      query = query.eq('change_id', itemId)
    }

    const { data: comments, error } = await query

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      )
    }

    // Transform the data to match our Comment interface
    const transformedComments: Comment[] = comments.map((comment: any) => ({
      id: comment.id,
      organizationId: comment.organization_id,
      content: comment.content,
      authorId: comment.author_id,
      author: {
        id: comment.author.id,
        name: comment.author.full_name,
        email: comment.author.email
      },
      mentions: comment.mentions || [],
      attachments: comment.attachments || [],
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      incidentId: comment.incident_id,
      problemId: comment.problem_id,
      changeId: comment.change_id
    }))

    return NextResponse.json(transformedComments)
  } catch (error) {
    console.error('GET comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Create a new comment with optional file attachments
export async function POST(request: NextRequest) {
  try {
    
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    

    // Handle both FormData (with files) and JSON (without files)
    const contentType = request.headers.get('content-type')
    let content: string, itemType: string, itemId: string, mentions: string[] = [], files: File[] = []
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData for file uploads
      const formData = await request.formData()
      content = formData.get('content') as string
      itemType = formData.get('itemType') as string
      itemId = formData.get('itemId') as string
      const mentionsStr = formData.get('mentions') as string
      
      try {
        mentions = mentionsStr ? JSON.parse(mentionsStr) : []
      } catch {
        mentions = []
      }
      
      // Get all uploaded files (FormDataEntryValue can be File or string)
      const fileEntries = formData.getAll('files')
      files = fileEntries.filter(entry => 
        entry && 
        typeof entry === 'object' && 
        'size' in entry && 
        'name' in entry && 
        entry.size > 0
      ) as File[]
      
    } else {
      // Handle JSON for text-only comments
      const body = await request.json()
      
      content = body.content
      itemType = body.itemType
      itemId = body.itemId
      mentions = body.mentions || []
    }
    
    // Validate files if any
    if (files.length > 0) {
      const fileCountValidation = validateFileCount(files)
      if (!fileCountValidation.valid) {
        return NextResponse.json(
          { error: fileCountValidation.error },
          { status: 400 }
        )
      }
      
      for (const file of files) {
        const validation = validateFile(file)
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          )
        }
      }
    }

    if (!content || !itemType || !itemId) {
      return NextResponse.json(
        { error: 'content, itemType, and itemId are required' },
        { status: 400 }
      )
    }

    if (!['incident', 'problem', 'change'].includes(itemType)) {
      return NextResponse.json(
        { error: 'Invalid itemType. Must be incident, problem, or change' },
        { status: 400 }
      )
    }

    // Prepare the comment data
    const commentData: any = {
      organization_id: user.organizationId,
      content: content.trim(),
      author_id: user.id,
      mentions: mentions,
      attachments: [] // Will be populated after file upload
    }

    // Set the appropriate foreign key based on item type
    if (itemType === 'incident') {
      commentData.incident_id = itemId
    } else if (itemType === 'problem') {
      commentData.problem_id = itemId
    } else if (itemType === 'change') {
      commentData.change_id = itemId
    }


    // Insert the comment first
    const supabase = await createSupabaseServerClient()
    const { data: newComment, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select(`
        id,
        organization_id,
        content,
        author_id,
        mentions,
        attachments,
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
      console.error('Error creating comment:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json(
        { error: 'Failed to create comment', details: error.message },
        { status: 500 }
      )
    }
    
    
    // Handle file uploads if any
    const uploadedFiles: any[] = []
    if (files.length > 0) {
      try {
        for (const file of files) {
          const filePath = await saveUploadedFile(file, user.organizationId, 'comments', newComment.id)
          uploadedFiles.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: `/api/files/${user.organizationId}/comments/${newComment.id}/${filePath.split('/').pop()}`
          })
        }
        
        // Update comment with attachment info
        const { error: updateError } = await supabase
          .from('comments')
          .update({ attachments: uploadedFiles })
          .eq('id', newComment.id)
          
        if (updateError) {
          console.error('Error updating comment with attachments:', updateError)
          // Don't fail the request, just log the error
        } else {
          // Rule 6: Confirm successful attachment
          console.log(`✅ Successfully attached ${files.length} file(s) to comment ${newComment.id}:`, uploadedFiles.map(f => f.name).join(', '))
        }
        
        // Update the newComment object with attachments for response
        newComment.attachments = uploadedFiles
        
      } catch (fileError) {
        console.error('Error handling file uploads:', fileError)
        // Don't fail the comment creation, but log the error
        return NextResponse.json(
          { error: 'Comment created but file upload failed. Please try uploading files again.' },
          { status: 207 } // Multi-status
        )
      }
    }

    // Error handling was moved above with file upload logic

    // Transform the response
    const transformedComment: Comment = {
      id: newComment.id,
      organizationId: newComment.organization_id,
      content: newComment.content,
      authorId: newComment.author_id,
      author: {
        id: newComment.author.id,
        name: newComment.author.full_name,
        email: newComment.author.email
      },
      mentions: newComment.mentions || [],
      attachments: newComment.attachments || [],
      createdAt: newComment.created_at,
      updatedAt: newComment.updated_at,
      incidentId: newComment.incident_id,
      problemId: newComment.problem_id,
      changeId: newComment.change_id
    }

    // Send real-time update via WebSocket
    if (global.io) {
      const update = {
        type: 'comment_added' as const,
        data: transformedComment,
        itemType,
        itemId,
        organizationId: user.organizationId
      }

      // Broadcast to organization
      global.io.to(`org:${user.organizationId}`).emit('realtime_update', update)
      
      // Also broadcast to specific item room
      global.io.to(`${itemType}:${itemId}`).emit('realtime_update', update)

      // Send notifications to mentioned users
      if (mentions.length > 0) {
        for (const mentionedUserId of mentions) {
          // Find user's socket and send notification
          if (global.userSessions) {
            for (const [socketId, userData] of global.userSessions.entries()) {
              if (userData.id === mentionedUserId) {
                global.io.to(socketId).emit('mention_notification', {
                  type: 'mention',
                  comment: transformedComment,
                  mentionedBy: transformedComment.author,
                  itemType,
                  itemId
                })
              }
            }
          }
        }
      }
    }

    return NextResponse.json(transformedComment, { status: 201 })
  } catch (error) {
    console.error('😱 POST comment error:', error)
    console.error('😱 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('😱 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined
    })
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : 'Unknown'
      },
      { status: 500 }
    )
  }
}