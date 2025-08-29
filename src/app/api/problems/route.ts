import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getAuthenticatedUser } from '@/lib/auth-enhanced'
import { createProblem, getProblems } from '@/lib/problem-store-multitenant'
import { Priority, Criticality, Urgency } from '@/lib/types'
import { validateInfrastructureComponents } from '@/lib/infrastructure-validation'

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

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
    const authContext = await getAuthenticatedUser(request)
    if (!authContext.isAuthenticated || !authContext.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = authContext.user

    // Handle both FormData (with files) and JSON (without files)
    const contentType = request.headers.get('content-type')
    let title: string, description: string, priority: string, criticality: string, urgency: string
    let assignedTo: string, rootCause: string, workaround: string, solution: string
    let affectedServices: string[], tags: string[]
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData for file uploads
      const formData = await request.formData()
      title = formData.get('title') as string
      description = formData.get('description') as string
      priority = formData.get('priority') as string
      criticality = formData.get('criticality') as string || 'medium'
      urgency = formData.get('urgency') as string || 'medium'
      assignedTo = formData.get('assignedTo') as string
      rootCause = formData.get('rootCause') as string || ''
      workaround = formData.get('workaround') as string || ''
      solution = formData.get('solution') as string || ''
      
      try {
        affectedServices = JSON.parse(formData.get('affectedServices') as string || '[]')
        tags = JSON.parse(formData.get('tags') as string || '[]')
      } catch {
        affectedServices = []
        tags = []
      }
    } else {
      // Handle JSON for direct API calls
      const body = await request.json()
      title = body.title
      description = body.description
      priority = body.priority
      criticality = body.criticality || 'medium'
      urgency = body.urgency || 'medium'
      assignedTo = body.assignedTo
      rootCause = body.rootCause || ''
      workaround = body.workaround || ''
      solution = body.solution || ''
      affectedServices = body.affectedServices || []
      tags = body.tags || []
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
      criticality: (criticality || 'medium') as Criticality,
      urgency: (urgency || 'medium') as Urgency,
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