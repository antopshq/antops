import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { ITILPromptTester } from '@/lib/itil-prompt-tester'

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const testType = searchParams.get('type') || 'all'
    const useRealData = searchParams.get('realData') === 'true'

    let results: any = {}

    if (testType === 'all') {
      // Run comprehensive test suite
      const suites = await ITILPromptTester.runTestSuite(user.organizationId, useRealData)
      const report = ITILPromptTester.generateTestReport(suites)
      
      results = {
        testSuites: suites,
        report,
        summary: {
          totalTests: suites.reduce((sum, s) => sum + s.results.length, 0),
          successfulTests: suites.reduce((sum, s) => sum + s.results.filter(r => r.success).length, 0),
          totalCost: suites.reduce((sum, s) => sum + s.summary.totalCost, 0),
          avgResponseTime: suites.reduce((sum, s) => sum + s.summary.avgResponseTime, 0) / suites.length
        }
      }
    } else if (testType === 'incident') {
      const description = searchParams.get('description') || 'Test incident description'
      const result = await ITILPromptTester.testIncidentAnalysis(user.organizationId, description, useRealData)
      results = { testType: 'incident', result }
    } else if (testType === 'impact') {
      const components = searchParams.get('components')?.split(',') || ['web-server-01']
      const result = await ITILPromptTester.testImpactAnalysis(user.organizationId, components, useRealData)
      results = { testType: 'impact', result }
    } else if (testType === 'rootcause') {
      const description = searchParams.get('description') || 'Test problem description'
      const components = searchParams.get('components')?.split(',') || ['web-server-01']
      const result = await ITILPromptTester.testRootCauseAnalysis(user.organizationId, description, components, useRealData)
      results = { testType: 'rootcause', result }
    } else if (testType === 'dependency') {
      const component = searchParams.get('component') || 'web-server-01'
      const change = searchParams.get('change') || undefined
      const result = await ITILPromptTester.testDependencyAnalysis(user.organizationId, component, change, useRealData)
      results = { testType: 'dependency', result }
    } else {
      return NextResponse.json({
        error: 'Invalid test type. Use: all, incident, impact, rootcause, dependency'
      }, { status: 400 })
    }

    return NextResponse.json({
      status: 'success',
      message: `ITIL prompt testing completed: ${testType}`,
      organizationId: user.organizationId,
      testType,
      useRealData,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('ITIL test endpoint error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'ITIL prompt testing failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      testType, 
      description, 
      components, 
      changeDescription, 
      useRealData = false 
    } = body

    if (!testType) {
      return NextResponse.json({
        error: 'testType is required'
      }, { status: 400 })
    }

    let result: any

    switch (testType) {
      case 'incident':
        if (!description) {
          return NextResponse.json({
            error: 'description is required for incident analysis'
          }, { status: 400 })
        }
        result = await ITILPromptTester.testIncidentAnalysis(user.organizationId, description, useRealData)
        break

      case 'impact':
        if (!components || !Array.isArray(components)) {
          return NextResponse.json({
            error: 'components array is required for impact analysis'
          }, { status: 400 })
        }
        result = await ITILPromptTester.testImpactAnalysis(user.organizationId, components, useRealData)
        break

      case 'rootcause':
        if (!description || !components) {
          return NextResponse.json({
            error: 'description and components are required for root cause analysis'
          }, { status: 400 })
        }
        result = await ITILPromptTester.testRootCauseAnalysis(
          user.organizationId, 
          description, 
          Array.isArray(components) ? components : [components], 
          useRealData
        )
        break

      case 'dependency':
        if (!components || typeof components !== 'string') {
          return NextResponse.json({
            error: 'component name (string) is required for dependency analysis'
          }, { status: 400 })
        }
        result = await ITILPromptTester.testDependencyAnalysis(
          user.organizationId, 
          components, 
          changeDescription, 
          useRealData
        )
        break

      default:
        return NextResponse.json({
          error: 'Invalid testType. Use: incident, impact, rootcause, dependency'
        }, { status: 400 })
    }

    return NextResponse.json({
      status: 'success',
      message: `ITIL ${testType} analysis completed`,
      organizationId: user.organizationId,
      testType,
      useRealData,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('ITIL test POST endpoint error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'ITIL prompt analysis failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}