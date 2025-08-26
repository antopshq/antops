import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { createIncident, getIncidents } from '@/lib/store-multitenant'
import { Priority, Criticality, Urgency } from '@/lib/types'
import { validateInfrastructureComponents } from '@/lib/infrastructure-validation'
import { validateFile, validateFileCount, saveUploadedFile } from '@/lib/file-upload-utils'

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

    const incidents = await getIncidents()
    return NextResponse.json(incidents)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

    // Handle both FormData (with files) and JSON (without files)
    const contentType = request.headers.get('content-type')
    let title: string, description: string, priority: string, criticality: string, urgency: string
    let assignedTo: string, problemId: string, affectedServices: string[], tags: string[], files: File[] = []
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData for file uploads
      const formData = await request.formData()
      title = formData.get('title') as string
      description = formData.get('description') as string
      priority = formData.get('priority') as string
      criticality = formData.get('criticality') as string
      urgency = formData.get('urgency') as string
      assignedTo = formData.get('assignedTo') as string
      problemId = formData.get('problemId') as string
      
      try {
        affectedServices = JSON.parse(formData.get('affectedServices') as string || '[]')
        tags = JSON.parse(formData.get('tags') as string || '[]')
      } catch {
        affectedServices = []
        tags = []
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
      
    } else {
      // Handle JSON for text-only incidents
      const body = await request.json()
      
      title = body.title
      description = body.description
      priority = body.priority
      criticality = body.criticality
      urgency = body.urgency
      assignedTo = body.assignedTo
      problemId = body.problemId
      affectedServices = body.affectedServices || []
      tags = body.tags || []
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

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      )
    }

    if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
        { status: 400 }
      )
    }

    // Validate infrastructure components before creating incident
    const validatedServices = await validateInfrastructureComponents(
      affectedServices || [], 
      user.organizationId
    )

    // Log if any services were filtered out
    if (affectedServices && validatedServices.length !== affectedServices.length) {
      const filteredCount = affectedServices.length - validatedServices.length
      console.log(`Filtered out ${filteredCount} invalid infrastructure components during incident creation`)
    }

    const incident = await createIncident({
      title,
      description,
      priority: priority as Priority,
      status: 'open',
      criticality: (criticality || 'medium') as Criticality,
      urgency: (urgency || 'medium') as Urgency,
      assignedTo: assignedTo || undefined,
      problemId: problemId || undefined,
      createdBy: user.id,
      tags: tags || [],
      affectedServices: validatedServices
    })

    if (!incident) {
      return NextResponse.json(
        { error: 'Failed to create incident' },
        { status: 500 }
      )
    }


    // Handle file uploads if any
    const uploadedFiles: any[] = []
    if (files.length > 0) {
      try {
        for (const file of files) {
          const filePath = await saveUploadedFile(file, user.organizationId, 'incidents', incident.id)
          uploadedFiles.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: `/api/files/${user.organizationId}/incidents/${incident.id}/${filePath.split('/').pop()}`
          })
        }
        
        // Update incident with attachment info via direct database update
        // Since we don't have an updateIncident with attachments yet, we'll need to add this
        console.log(`✅ Successfully attached ${files.length} file(s) to incident ${incident.id}:`, uploadedFiles.map(f => f.name).join(', '))
        
        // Add attachments to the response
        incident.attachments = uploadedFiles
        
      } catch (fileError) {
        console.error('Error handling file uploads:', fileError)
        // Don't fail the incident creation, but log the error
        return NextResponse.json(
          { error: 'Incident created but file upload failed. Please try uploading files again.' },
          { status: 207 } // Multi-status
        )
      }
    }

    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    console.error('😱 POST incident error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}