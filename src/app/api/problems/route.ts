import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { createProblem, getProblems } from '@/lib/problem-store-multitenant'
import { Priority } from '@/lib/types'
import { validateInfrastructureComponents } from '@/lib/infrastructure-validation'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const problems = await getProblems()
    return NextResponse.json(problems)
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
      rootCause,
      workaround,
      solution,
      affectedServices, 
      tags 
    } = body

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

    // Validate infrastructure components before creating problem
    const validatedServices = await validateInfrastructureComponents(
      affectedServices || [], 
      user.organizationId
    )

    // Log if any services were filtered out
    if (affectedServices && validatedServices.length !== affectedServices.length) {
      const filteredCount = affectedServices.length - validatedServices.length
      console.log(`Filtered out ${filteredCount} invalid infrastructure components during problem creation`)
    }

    const problem = await createProblem({
      title,
      description,
      priority: priority as Priority,
      status: 'identified',
      createdBy: user.id,
      assignedTo: assignedTo || undefined,
      rootCause: rootCause || undefined,
      workaround: workaround || undefined,
      solution: solution || undefined,
      tags: tags || [],
      affectedServices: validatedServices
    })

    if (!problem) {
      return NextResponse.json(
        { error: 'Failed to create problem' },
        { status: 500 }
      )
    }

    return NextResponse.json(problem, { status: 201 })
  } catch (error) {
    console.error('Problems API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}