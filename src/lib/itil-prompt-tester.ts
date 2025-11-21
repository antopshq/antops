import { ITILPromptTemplates, TokenOptimizer, RESPONSE_SCHEMAS } from './itil-prompts'
import { ITILDataFetcher } from './itil-data-fetcher'
import type { 
  IncidentAnalysis, 
  ImpactAnalysis, 
  RootCauseAnalysis, 
  DependencyAnalysis 
} from './itil-prompts'

export interface TestResult {
  success: boolean
  data?: any
  error?: string
  metrics: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    cost: number
    responseTime: number
  }
  validation: {
    isValidJSON: boolean
    hasRequiredFields: boolean
    schemaValid: boolean
    errors: string[]
  }
}

export interface TestSuite {
  testName: string
  results: TestResult[]
  summary: {
    successRate: number
    avgCost: number
    avgTokens: number
    avgResponseTime: number
    totalCost: number
  }
}

/**
 * JSON Schema validator (simplified)
 */
class JSONValidator {
  static validate(data: any, schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (schema.type === 'object' && typeof data !== 'object') {
      errors.push('Expected object type')
      return { valid: false, errors }
    }

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Missing required field: ${field}`)
        }
      }
    }

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties as any)) {
        if (key in data) {
          const propResult = this.validateProperty(data[key], propSchema)
          errors.push(...propResult.errors)
        }
      }
    }

    return { valid: errors.length === 0, errors }
  }

  private static validateProperty(value: any, schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (schema.type === 'string' && typeof value !== 'string') {
      errors.push(`Expected string, got ${typeof value}`)
    }
    
    if (schema.type === 'number' && typeof value !== 'number') {
      errors.push(`Expected number, got ${typeof value}`)
    }
    
    if (schema.type === 'array' && !Array.isArray(value)) {
      errors.push(`Expected array, got ${typeof value}`)
    }

    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Value "${value}" not in allowed enum: ${schema.enum.join(', ')}`)
    }

    if (schema.maxLength && typeof value === 'string' && value.length > schema.maxLength) {
      errors.push(`String length ${value.length} exceeds maximum ${schema.maxLength}`)
    }

    return { valid: errors.length === 0, errors }
  }
}

/**
 * ITIL Prompt Testing Framework
 */
export class ITILPromptTester {

  /**
   * Test incident analysis prompt
   */
  static async testIncidentAnalysis(
    organizationId: string,
    description: string,
    useRealData: boolean = false
  ): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      let components, incidents
      
      if (useRealData) {
        components = await ITILDataFetcher.getInfrastructureComponents(organizationId, 30)
        incidents = await ITILDataFetcher.getRecentIncidents(organizationId, 30, 10)
      } else {
        const sampleData = ITILDataFetcher.getSampleData()
        components = sampleData.components
        incidents = sampleData.incidents
      }

      const prompt = ITILPromptTemplates.createIncidentAnalysisPrompt(
        description, 
        components, 
        incidents
      )

      const inputTokens = TokenOptimizer.estimateTokens(prompt)
      
      const result = await ITILPromptTemplates.generateCompletion(
        prompt,
        organizationId,
        'test-incident-analysis',
        600
      )

      const responseTime = Date.now() - startTime

      // Validate response
      let parsedData: any = null
      let isValidJSON = false
      let validation = { isValidJSON: false, hasRequiredFields: false, schemaValid: false, errors: [] as string[] }

      try {
        parsedData = JSON.parse(result.content)
        isValidJSON = true
        
        const schemaValidation = JSONValidator.validate(parsedData, RESPONSE_SCHEMAS.incidentAnalysis)
        validation = {
          isValidJSON: true,
          hasRequiredFields: schemaValidation.valid,
          schemaValid: schemaValidation.valid,
          errors: schemaValidation.errors
        }
      } catch (error) {
        validation.errors.push('Invalid JSON response')
      }

      return {
        success: isValidJSON && validation.schemaValid,
        data: parsedData,
        metrics: {
          inputTokens,
          outputTokens: result.usage?.completion_tokens || 0,
          totalTokens: result.usage?.total_tokens || 0,
          cost: result.cost,
          responseTime
        },
        validation
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          responseTime: Date.now() - startTime
        },
        validation: {
          isValidJSON: false,
          hasRequiredFields: false,
          schemaValid: false,
          errors: ['Request failed']
        }
      }
    }
  }

  /**
   * Test impact analysis prompt
   */
  static async testImpactAnalysis(
    organizationId: string,
    componentNames: string[],
    useRealData: boolean = false
  ): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      let components, relationships
      
      if (useRealData) {
        components = await ITILDataFetcher.getInfrastructureComponents(organizationId, 50)
        relationships = await ITILDataFetcher.getInfrastructureRelationships(organizationId, componentNames, 20)
      } else {
        const sampleData = ITILDataFetcher.getSampleData()
        components = sampleData.components
        relationships = sampleData.relationships
      }

      const prompt = ITILPromptTemplates.createImpactAnalysisPrompt(
        componentNames,
        components,
        relationships
      )

      const inputTokens = TokenOptimizer.estimateTokens(prompt)
      
      const result = await ITILPromptTemplates.generateCompletion(
        prompt,
        organizationId,
        'test-impact-analysis',
        500
      )

      const responseTime = Date.now() - startTime

      // Validate response
      let parsedData: any = null
      let validation = { isValidJSON: false, hasRequiredFields: false, schemaValid: false, errors: [] as string[] }

      try {
        parsedData = JSON.parse(result.content)
        const schemaValidation = JSONValidator.validate(parsedData, RESPONSE_SCHEMAS.impactAnalysis)
        validation = {
          isValidJSON: true,
          hasRequiredFields: schemaValidation.valid,
          schemaValid: schemaValidation.valid,
          errors: schemaValidation.errors
        }
      } catch (error) {
        validation.errors.push('Invalid JSON response')
      }

      return {
        success: validation.isValidJSON && validation.schemaValid,
        data: parsedData,
        metrics: {
          inputTokens,
          outputTokens: result.usage?.completion_tokens || 0,
          totalTokens: result.usage?.total_tokens || 0,
          cost: result.cost,
          responseTime
        },
        validation
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          responseTime: Date.now() - startTime
        },
        validation: {
          isValidJSON: false,
          hasRequiredFields: false,
          schemaValid: false,
          errors: ['Request failed']
        }
      }
    }
  }

  /**
   * Test root cause analysis prompt
   */
  static async testRootCauseAnalysis(
    organizationId: string,
    incidentDescription: string,
    affectedComponents: string[],
    useRealData: boolean = false
  ): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      let incidents, changes
      
      if (useRealData) {
        incidents = await ITILDataFetcher.getIncidentsByComponents(organizationId, affectedComponents, 10)
        changes = await ITILDataFetcher.getRecentChanges(organizationId, 7, 5)
      } else {
        const sampleData = ITILDataFetcher.getSampleData()
        incidents = sampleData.incidents
        changes = sampleData.changes
      }

      const prompt = ITILPromptTemplates.createRootCauseAnalysisPrompt(
        incidentDescription,
        affectedComponents,
        incidents,
        changes
      )

      const inputTokens = TokenOptimizer.estimateTokens(prompt)
      
      const result = await ITILPromptTemplates.generateCompletion(
        prompt,
        organizationId,
        'test-root-cause-analysis',
        700
      )

      const responseTime = Date.now() - startTime

      // Validate response
      let parsedData: any = null
      let validation = { isValidJSON: false, hasRequiredFields: false, schemaValid: false, errors: [] as string[] }

      try {
        parsedData = JSON.parse(result.content)
        const schemaValidation = JSONValidator.validate(parsedData, RESPONSE_SCHEMAS.rootCauseAnalysis)
        validation = {
          isValidJSON: true,
          hasRequiredFields: schemaValidation.valid,
          schemaValid: schemaValidation.valid,
          errors: schemaValidation.errors
        }
      } catch (error) {
        validation.errors.push('Invalid JSON response')
      }

      return {
        success: validation.isValidJSON && validation.schemaValid,
        data: parsedData,
        metrics: {
          inputTokens,
          outputTokens: result.usage?.completion_tokens || 0,
          totalTokens: result.usage?.total_tokens || 0,
          cost: result.cost,
          responseTime
        },
        validation
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          responseTime: Date.now() - startTime
        },
        validation: {
          isValidJSON: false,
          hasRequiredFields: false,
          schemaValid: false,
          errors: ['Request failed']
        }
      }
    }
  }

  /**
   * Test dependency analysis prompt
   */
  static async testDependencyAnalysis(
    organizationId: string,
    componentName: string,
    changeDescription?: string,
    useRealData: boolean = false
  ): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      let components, relationships
      
      if (useRealData) {
        components = await ITILDataFetcher.getInfrastructureComponents(organizationId, 50)
        relationships = await ITILDataFetcher.getInfrastructureRelationships(organizationId, [componentName], 30)
      } else {
        const sampleData = ITILDataFetcher.getSampleData()
        components = sampleData.components
        relationships = sampleData.relationships
      }

      const prompt = ITILPromptTemplates.createDependencyAnalysisPrompt(
        componentName,
        components,
        relationships,
        changeDescription
      )

      const inputTokens = TokenOptimizer.estimateTokens(prompt)
      
      const result = await ITILPromptTemplates.generateCompletion(
        prompt,
        organizationId,
        'test-dependency-analysis',
        500
      )

      const responseTime = Date.now() - startTime

      // Validate response
      let parsedData: any = null
      let validation = { isValidJSON: false, hasRequiredFields: false, schemaValid: false, errors: [] as string[] }

      try {
        parsedData = JSON.parse(result.content)
        const schemaValidation = JSONValidator.validate(parsedData, RESPONSE_SCHEMAS.dependencyAnalysis)
        validation = {
          isValidJSON: true,
          hasRequiredFields: schemaValidation.valid,
          schemaValid: schemaValidation.valid,
          errors: schemaValidation.errors
        }
      } catch (error) {
        validation.errors.push('Invalid JSON response')
      }

      return {
        success: validation.isValidJSON && validation.schemaValid,
        data: parsedData,
        metrics: {
          inputTokens,
          outputTokens: result.usage?.completion_tokens || 0,
          totalTokens: result.usage?.total_tokens || 0,
          cost: result.cost,
          responseTime
        },
        validation
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          responseTime: Date.now() - startTime
        },
        validation: {
          isValidJSON: false,
          hasRequiredFields: false,
          schemaValid: false,
          errors: ['Request failed']
        }
      }
    }
  }

  /**
   * Run comprehensive test suite
   */
  static async runTestSuite(organizationId: string, useRealData: boolean = false): Promise<TestSuite[]> {
    const suites: TestSuite[] = []

    // Test cases for each prompt type
    const testCases = {
      incidentAnalysis: [
        "Database server is responding slowly, users report timeouts",
        "Website is down, getting 503 errors from load balancer",
        "Email system not sending notifications, queue appears backed up"
      ],
      impactAnalysis: [
        ["web-server-01"],
        ["database-primary", "web-server-01"],
        ["load-balancer"]
      ],
      rootCauseAnalysis: [
        {
          description: "Intermittent connection timeouts on web application",
          components: ["web-server-01", "database-primary"]
        },
        {
          description: "High memory usage causing service crashes",
          components: ["web-server-01"]
        }
      ],
      dependencyAnalysis: [
        { component: "web-server-01", change: undefined },
        { component: "database-primary", change: "Upgrading database version from 12 to 14" },
        { component: "load-balancer", change: undefined }
      ]
    }

    // Test Incident Analysis
    const incidentResults: TestResult[] = []
    for (const description of testCases.incidentAnalysis) {
      const result = await this.testIncidentAnalysis(organizationId, description, useRealData)
      incidentResults.push(result)
    }
    suites.push(this.createTestSuite('Incident Analysis', incidentResults))

    // Test Impact Analysis  
    const impactResults: TestResult[] = []
    for (const components of testCases.impactAnalysis) {
      const result = await this.testImpactAnalysis(organizationId, components, useRealData)
      impactResults.push(result)
    }
    suites.push(this.createTestSuite('Impact Analysis', impactResults))

    // Test Root Cause Analysis
    const rootCauseResults: TestResult[] = []
    for (const testCase of testCases.rootCauseAnalysis) {
      const result = await this.testRootCauseAnalysis(
        organizationId, 
        testCase.description, 
        testCase.components, 
        useRealData
      )
      rootCauseResults.push(result)
    }
    suites.push(this.createTestSuite('Root Cause Analysis', rootCauseResults))

    // Test Dependency Analysis
    const dependencyResults: TestResult[] = []
    for (const testCase of testCases.dependencyAnalysis) {
      const result = await this.testDependencyAnalysis(
        organizationId, 
        testCase.component, 
        testCase.change, 
        useRealData
      )
      dependencyResults.push(result)
    }
    suites.push(this.createTestSuite('Dependency Analysis', dependencyResults))

    return suites
  }

  /**
   * Create test suite summary
   */
  private static createTestSuite(testName: string, results: TestResult[]): TestSuite {
    const successfulResults = results.filter(r => r.success)
    const successRate = results.length > 0 ? successfulResults.length / results.length : 0
    
    const avgCost = results.length > 0 
      ? results.reduce((sum, r) => sum + r.metrics.cost, 0) / results.length 
      : 0
    
    const avgTokens = results.length > 0 
      ? results.reduce((sum, r) => sum + r.metrics.totalTokens, 0) / results.length 
      : 0
    
    const avgResponseTime = results.length > 0 
      ? results.reduce((sum, r) => sum + r.metrics.responseTime, 0) / results.length 
      : 0

    const totalCost = results.reduce((sum, r) => sum + r.metrics.cost, 0)

    return {
      testName,
      results,
      summary: {
        successRate,
        avgCost,
        avgTokens,
        avgResponseTime,
        totalCost
      }
    }
  }

  /**
   * Generate test report
   */
  static generateTestReport(suites: TestSuite[]): string {
    let report = '# ITIL Prompt Testing Report\n\n'
    
    const overallStats = {
      totalTests: suites.reduce((sum, s) => sum + s.results.length, 0),
      totalSuccessful: suites.reduce((sum, s) => sum + s.results.filter(r => r.success).length, 0),
      totalCost: suites.reduce((sum, s) => sum + s.summary.totalCost, 0),
      avgResponseTime: suites.reduce((sum, s) => sum + s.summary.avgResponseTime, 0) / suites.length
    }

    report += `## Overall Summary\n`
    report += `- **Total Tests:** ${overallStats.totalTests}\n`
    report += `- **Success Rate:** ${((overallStats.totalSuccessful / overallStats.totalTests) * 100).toFixed(1)}%\n`
    report += `- **Total Cost:** $${overallStats.totalCost.toFixed(6)}\n`
    report += `- **Average Response Time:** ${overallStats.avgResponseTime.toFixed(0)}ms\n\n`

    for (const suite of suites) {
      report += `## ${suite.testName}\n`
      report += `- **Tests:** ${suite.results.length}\n`
      report += `- **Success Rate:** ${(suite.summary.successRate * 100).toFixed(1)}%\n`
      report += `- **Average Cost:** $${suite.summary.avgCost.toFixed(6)}\n`
      report += `- **Average Tokens:** ${suite.summary.avgTokens.toFixed(0)}\n`
      report += `- **Average Response Time:** ${suite.summary.avgResponseTime.toFixed(0)}ms\n`
      report += `- **Total Cost:** $${suite.summary.totalCost.toFixed(6)}\n\n`

      // Show failed tests
      const failedTests = suite.results.filter(r => !r.success)
      if (failedTests.length > 0) {
        report += `### Failed Tests (${failedTests.length})\n`
        failedTests.forEach((test, index) => {
          report += `${index + 1}. **Error:** ${test.error || 'Unknown'}\n`
          if (test.validation.errors.length > 0) {
            report += `   **Validation Errors:** ${test.validation.errors.join(', ')}\n`
          }
        })
        report += '\n'
      }
    }

    return report
  }
}