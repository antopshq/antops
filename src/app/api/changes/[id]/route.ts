import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getChange, updateChange } from '@/lib/store-multitenant'
import { Priority, ChangeStatus } from '@/lib/types'
import { validateInfrastructureComponents } from '@/lib/infrastructure-validation'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const change = await getChange(id)

    if (!change) {
      return NextResponse.json({ error: 'Change not found' }, { status: 404 })
    }

    return NextResponse.json(change)
  } catch (error) {
    console.error('GET change error:', error)
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
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { 
      title, 
      description, 
      priority, 
      status, 
      assignedTo, 
      scheduledFor, 
      estimatedEndTime,
      rollbackPlan, 
      testPlan, 
      affectedServices, 
      tags,
      problemId,
      incidentId
    } = body

    // For status-only updates (drag and drop), we don't require all fields
    const isStatusOnlyUpdate = Object.keys(body).length === 1 && body.status !== undefined
    
    // For relationship updates (linking to problems/incidents), we don't require all fields
    const isRelationshipOnlyUpdate = Object.keys(body).length === 1 && (body.problemId !== undefined || body.incidentId !== undefined)

    if (!isStatusOnlyUpdate && !isRelationshipOnlyUpdate && (!title || !description || !rollbackPlan || !testPlan)) {
      return NextResponse.json(
        { error: 'Title, description, rollback plan, and test plan are required for full updates' },
        { status: 400 }
      )
    }

    if (priority && !['low', 'medium', 'high', 'critical'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
        { status: 400 }
      )
    }

    if (status && !['draft', 'pending', 'approved', 'in_progress', 'completed', 'failed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Enforce mutual exclusivity: change cannot be linked to both problem and incident
    if (problemId && problemId !== 'none' && incidentId && incidentId !== 'none') {
      return NextResponse.json(
        { error: 'Change cannot be linked to both a problem and an incident. Please select only one.' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    // Only include fields that are provided
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (priority !== undefined) updateData.priority = priority as Priority
    if (status !== undefined) updateData.status = status as ChangeStatus
    if (rollbackPlan !== undefined) updateData.rollbackPlan = rollbackPlan
    if (testPlan !== undefined) updateData.testPlan = testPlan
    if (tags !== undefined) updateData.tags = tags || []
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
        console.log(`Filtered out ${filteredCount} invalid infrastructure components for change ${id}`)
      }
    }

    // Only update assignedTo if it's provided
    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo || null
    }

    // Only update scheduledFor if it's provided
    if (scheduledFor !== undefined) {
      updateData.scheduledFor = scheduledFor || null
    }

    // Only update estimatedEndTime if it's provided
    if (estimatedEndTime !== undefined) {
      updateData.estimatedEndTime = estimatedEndTime || null
    }

    // Only update relationship fields if provided
    if (problemId !== undefined) {
      updateData.problemId = problemId === 'none' ? null : problemId
    }
    
    if (incidentId !== undefined) {
      updateData.incidentId = incidentId === 'none' ? null : incidentId
    }

    // Set completedAt when status changes to completed
    if (status === 'completed') {
      updateData.completedAt = new Date().toISOString()
    } else if (status !== 'completed') {
      updateData.completedAt = null
    }

    const updatedChange = await updateChange(id, updateData)

    if (!updatedChange) {
      return NextResponse.json(
        { error: 'Failed to update change' },
        { status: 500 }
      )
    }

    // Status change completed - the timeline will show this via the updated_at timestamp

    return NextResponse.json(updatedChange)
  } catch (error) {
    console.error('PUT change error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}