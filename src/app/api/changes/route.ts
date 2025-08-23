import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createChange, getChanges } from '@/lib/store-multitenant'
import { Priority } from '@/lib/types'
import { validateInfrastructureComponents } from '@/lib/infrastructure-validation'

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const incidentId = searchParams.get('incidentId')

    const changes = await getChanges(incidentId || undefined)
    return NextResponse.json(changes)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      title, 
      description, 
      priority, 
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

    if (!title || !description || !rollbackPlan || !testPlan) {
      return NextResponse.json(
        { error: 'Title, description, rollback plan, and test plan are required' },
        { status: 400 }
      )
    }

    if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
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

    // Validate infrastructure components before creating change
    const validatedServices = await validateInfrastructureComponents(
      affectedServices || [], 
      user.organizationId
    )

    // Log if any services were filtered out
    if (affectedServices && validatedServices.length !== affectedServices.length) {
      const filteredCount = affectedServices.length - validatedServices.length
      console.log(`Filtered out ${filteredCount} invalid infrastructure components during change creation`)
    }

    const change = await createChange({
      title,
      description,
      priority: priority as Priority,
      status: 'draft',
      requestedBy: user.id,
      assignedTo: assignedTo || undefined,
      scheduledFor: scheduledFor || undefined,
      estimatedEndTime: estimatedEndTime || undefined,
      rollbackPlan,
      testPlan,
      tags: tags || [],
      affectedServices: validatedServices,
      problemId: problemId || undefined,
      incidentId: incidentId || undefined
    })

    if (!change) {
      return NextResponse.json(
        { error: 'Failed to create change' },
        { status: 500 }
      )
    }

    // Change created successfully

    return NextResponse.json(change, { status: 201 })
  } catch (error) {
    console.error('Changes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}