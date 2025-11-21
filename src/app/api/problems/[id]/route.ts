import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { getProblem, updateProblem } from '@/lib/problem-store-multitenant'
import { Priority, ProblemStatus } from '@/lib/types'
import { validateInfrastructureComponents } from '@/lib/infrastructure-validation'

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
    const problem = await getProblem(id)

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 })
    }

    return NextResponse.json(problem)
  } catch (error) {
    console.error('Problem API error:', error)
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
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

    const { id } = await params
    const body = await request.json()
    const { 
      title, 
      description, 
      priority, 
      status,
      assignedTo,
      rootCause,
      workaround,
      solution,
      tags,
      affectedServices,
      resolvedAt
    } = body

    // Validate priority if provided
    if (priority && !['low', 'medium', 'high', 'critical'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (status && !['identified', 'investigating', 'known_error', 'resolved', 'closed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (priority !== undefined) updateData.priority = priority as Priority
    if (status !== undefined) updateData.status = status as ProblemStatus
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo
    if (rootCause !== undefined) updateData.rootCause = rootCause
    if (workaround !== undefined) updateData.workaround = workaround
    if (solution !== undefined) updateData.solution = solution
    if (tags !== undefined) updateData.tags = tags
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
        console.log(`Filtered out ${filteredCount} invalid infrastructure components for problem ${id}`)
      }
    }
    if (resolvedAt !== undefined) updateData.resolvedAt = resolvedAt

    const problem = await updateProblem(id, updateData)

    if (!problem) {
      return NextResponse.json(
        { error: 'Failed to update problem' },
        { status: 500 }
      )
    }

    return NextResponse.json(problem)
  } catch (error) {
    console.error('Problem API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}