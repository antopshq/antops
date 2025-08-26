import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { getIncident, updateIncident } from '@/lib/store-multitenant'
import { Priority, Status } from '@/lib/types'
import { validateInfrastructureComponents } from '@/lib/infrastructure-validation'
import { validateFile, validateFileCount, saveUploadedFile } from '@/lib/file-upload-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

    const { id } = await params
    const incident = await getIncident(id)

    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }

    return NextResponse.json(incident)
  } catch (error) {
    console.error('GET incident error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔧 PUT /api/incidents/[id] - Starting request')
    
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

    const { id } = await params

    // Handle both FormData (with files) and JSON (without files)
    const contentType = request.headers.get('content-type')
    let title: string, description: string, priority: string, criticality: string, urgency: string, status: string
    let assignedTo: string, problemId: string, affectedServices: string[], tags: string[], links: any[], autoPriority: boolean, closureComment: string
    let files: File[] = []
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData for file uploads
      const formData = await request.formData()
      title = formData.get('title') as string
      description = formData.get('description') as string
      priority = formData.get('priority') as string
      criticality = formData.get('criticality') as string
      urgency = formData.get('urgency') as string
      status = formData.get('status') as string
      assignedTo = formData.get('assignedTo') as string
      problemId = formData.get('problemId') as string
      autoPriority = formData.get('autoPriority') === 'true'
      closureComment = formData.get('closureComment') as string || ''
      
      try {
        affectedServices = JSON.parse(formData.get('affectedServices') as string || '[]')
        tags = JSON.parse(formData.get('tags') as string || '[]')
        links = JSON.parse(formData.get('links') as string || '[]')
      } catch {
        affectedServices = []
        tags = []
        links = []
      }
      
      // Get all uploaded files
      const fileEntries = formData.getAll('files')
      files = fileEntries.filter(entry => 
        entry && 
        typeof entry === 'object' && 
        'size' in entry && 
        'name' in entry && 
        entry.size > 0
      ) as File[]
      
      console.log('PUT /api/incidents/[id] - FormData:', { title, priority, fileCount: files.length })
    } else {
      // Handle JSON for text-only updates
      const body = await request.json()
      console.log('🔧 PUT /api/incidents/[id] - Full request body:', JSON.stringify(body, null, 2))
      
      title = body.title
      description = body.description
      priority = body.priority
      criticality = body.criticality
      urgency = body.urgency
      status = body.status
      assignedTo = body.assignedTo
      problemId = body.problemId
      affectedServices = body.affectedServices || []
      tags = body.tags || []
      links = body.links || []
      autoPriority = body.autoPriority
      closureComment = body.closureComment || ''
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

    // Build update object with only provided fields
    const updateData: any = {}

    if (title !== undefined) {
      updateData.title = title
    }
    
    if (description !== undefined) {
      updateData.description = description
    }

    if (criticality !== undefined) {
      updateData.criticality = criticality
    }

    if (urgency !== undefined) {
      updateData.urgency = urgency
    }

    if (priority !== undefined) {
      if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
        return NextResponse.json(
          { error: 'Invalid priority' },
          { status: 400 }
        )
      }
      updateData.priority = priority as Priority
    }

    if (status !== undefined) {
      const validStatuses = ['open', 'investigating', 'resolved', 'closed']
      if (!validStatuses.includes(status)) {
        console.error('Invalid status received:', status, 'type:', typeof status, 'valid options:', validStatuses)
        return NextResponse.json(
          { error: `Invalid status: "${status}". Valid options are: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = status as Status
    }

    if (tags !== undefined) {
      updateData.tags = tags || []
    }

    if (affectedServices !== undefined) {
      // Validate that all infrastructure components exist before updating
      const validatedServices = await validateInfrastructureComponents(
        affectedServices || [], 
        user.organizationId
      )
      updateData.affectedServices = validatedServices
      
      // Log if any services were filtered out
      if (affectedServices && validatedServices.length !== affectedServices.length) {
        const filteredCount = affectedServices.length - validatedServices.length
        console.log(`Filtered out ${filteredCount} invalid infrastructure components for incident ${id}`)
      }
    }

    if (autoPriority !== undefined) {
      updateData.autoPriority = autoPriority
    }

    if (links !== undefined) {
      updateData.links = links || []
    }

    // Only update assignedTo if it's provided
    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo || null
    }

    // Only update problemId if it's provided
    if (problemId !== undefined) {
      updateData.problemId = problemId || null
    }

    // Set resolvedAt when status changes to resolved
    if (updateData.status === 'resolved') {
      updateData.resolvedAt = new Date().toISOString()
    } else if (updateData.status && updateData.status !== 'resolved') {
      updateData.resolvedAt = null
    }

    console.log('🔧 PUT /api/incidents/[id] - Update data object:', JSON.stringify(updateData, null, 2))
    
    // Check if there's actually anything to update
    if (Object.keys(updateData).length === 0) {
      console.log('PUT /api/incidents/[id] - No fields to update')
      return NextResponse.json(
        { error: 'No fields provided to update' },
        { status: 400 }
      )
    }
    
    const updatedIncident = await updateIncident(id, updateData)

    if (!updatedIncident) {
      console.log('PUT /api/incidents/[id] - Failed to update incident')
      return NextResponse.json(
        { error: 'Failed to update incident' },
        { status: 500 }
      )
    }

    // If there's a closure comment and the status is being set to closed, add a system comment
    if (closureComment && updateData.status === 'closed') {
      try {
        const commentResponse = await fetch(`${request.nextUrl.origin}/api/comments`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': request.headers.get('Authorization') || '',
            'Cookie': request.headers.get('Cookie') || ''
          },
          body: JSON.stringify({
            content: `📝 **CLOSED** | ${closureComment}`,
            itemType: 'incident',
            itemId: id,
            mentions: []
          })
        })

        if (!commentResponse.ok) {
          const errorData = await commentResponse.text()
          console.error('Failed to add closure comment:', commentResponse.status, errorData)
        } else {
          console.log('Successfully added closure comment')
        }
      } catch (error) {
        console.error('Error adding closure comment:', error)
      }
    }

    console.log('PUT /api/incidents/[id] - Successfully updated:', updatedIncident)
    return NextResponse.json(updatedIncident)
  } catch (error) {
    console.error('PUT incident error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}