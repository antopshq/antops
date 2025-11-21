import { createSupabaseServerClient } from './supabase'

export interface InfrastructureComponent {
  id: string
  name: string
  type: string
  environment: string
  status: string
  description?: string
  created_at: string
  zone_id?: string
  zone?: {
    name: string
    environment: string
  }
}

export interface InfrastructureRelationship {
  id: string
  source: string
  target: string
  type: string
  created_at: string
}

export interface IncidentData {
  id: string
  title: string
  description: string
  priority: string
  status: string
  criticality: string
  urgency: string
  affected_services: string[]
  tags: string[]
  created_at: string
  resolved_at?: string
}

export interface ChangeData {
  id: string
  title: string
  description: string
  priority: string
  status: string
  scheduled_for?: string
  estimated_end_time?: string
  affected_services: string[]
  created_at: string
}

export interface ProblemData {
  id: string
  title: string
  description: string
  priority: string
  status: string
  root_cause?: string
  workaround?: string
  solution?: string
  affected_services: string[]
  created_at: string
}

/**
 * Data fetching utilities for ITIL prompt generation
 */
export class ITILDataFetcher {

  /**
   * Fetch infrastructure components for an organization
   */
  static async getInfrastructureComponents(
    organizationId: string,
    limit: number = 100
  ): Promise<InfrastructureComponent[]> {
    try {
      const supabase = await createSupabaseServerClient()
      
      const { data, error } = await supabase
        .from('infrastructure_components')
        .select(`
          id,
          name,
          type,
          environment,
          status,
          description,
          created_at,
          zone_id,
          zones:zone_id (
            name,
            environment
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching infrastructure components:', error)
        return []
      }

      return (data || []).map(item => ({
        ...item,
        zone: Array.isArray(item.zones) ? item.zones[0] : item.zones
      }))
    } catch (error) {
      console.error('Failed to fetch infrastructure components:', error)
      return []
    }
  }

  /**
   * Fetch infrastructure relationships
   */
  static async getInfrastructureRelationships(
    organizationId: string,
    componentNames?: string[],
    limit: number = 50
  ): Promise<InfrastructureRelationship[]> {
    try {
      const supabase = await createSupabaseServerClient()
      
      let query = supabase
        .from('infrastructure_relationships')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Filter by specific components if provided
      if (componentNames && componentNames.length > 0) {
        query = query.or(`source.in.(${componentNames.join(',')}),target.in.(${componentNames.join(',')})`)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching infrastructure relationships:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch infrastructure relationships:', error)
      return []
    }
  }

  /**
   * Fetch recent incidents for pattern analysis
   */
  static async getRecentIncidents(
    organizationId: string,
    days: number = 30,
    limit: number = 20
  ): Promise<IncidentData[]> {
    try {
      const supabase = await createSupabaseServerClient()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id,
          title,
          description,
          priority,
          status,
          criticality,
          urgency,
          affected_services,
          tags,
          created_at,
          resolved_at
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent incidents:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch recent incidents:', error)
      return []
    }
  }

  /**
   * Fetch incidents by affected components
   */
  static async getIncidentsByComponents(
    organizationId: string,
    componentNames: string[],
    limit: number = 10
  ): Promise<IncidentData[]> {
    try {
      const supabase = await createSupabaseServerClient()

      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id,
          title,
          description,
          priority,
          status,
          criticality,
          urgency,
          affected_services,
          tags,
          created_at,
          resolved_at
        `)
        .eq('organization_id', organizationId)
        .or(componentNames.map(name => `affected_services.cs.{"${name}"}`).join(','))
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching incidents by components:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch incidents by components:', error)
      return []
    }
  }

  /**
   * Fetch recent changes for context
   */
  static async getRecentChanges(
    organizationId: string,
    days: number = 7,
    limit: number = 10
  ): Promise<ChangeData[]> {
    try {
      const supabase = await createSupabaseServerClient()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data, error } = await supabase
        .from('changes')
        .select(`
          id,
          title,
          description,
          priority,
          status,
          scheduled_for,
          estimated_end_time,
          affected_services,
          created_at
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .order('scheduled_for', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent changes:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch recent changes:', error)
      return []
    }
  }

  /**
   * Fetch historical problems for root cause analysis
   */
  static async getHistoricalProblems(
    organizationId: string,
    componentNames?: string[],
    limit: number = 15
  ): Promise<ProblemData[]> {
    try {
      const supabase = await createSupabaseServerClient()

      let query = supabase
        .from('problems')
        .select(`
          id,
          title,
          description,
          priority,
          status,
          root_cause,
          workaround,
          solution,
          affected_services,
          created_at
        `)
        .eq('organization_id', organizationId)
        .in('status', ['resolved', 'closed'])
        .not('root_cause', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      // Filter by components if provided
      if (componentNames && componentNames.length > 0) {
        query = query.or(componentNames.map(name => `affected_services.cs.{"${name}"}`).join(','))
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching historical problems:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch historical problems:', error)
      return []
    }
  }

  /**
   * Get component details by names
   */
  static async getComponentsByNames(
    organizationId: string,
    componentNames: string[]
  ): Promise<InfrastructureComponent[]> {
    try {
      const supabase = await createSupabaseServerClient()

      const { data, error } = await supabase
        .from('infrastructure_components')
        .select(`
          id,
          name,
          type,
          environment,
          status,
          description,
          created_at,
          zone_id,
          zones:zone_id (
            name,
            environment
          )
        `)
        .eq('organization_id', organizationId)
        .in('name', componentNames)

      if (error) {
        console.error('Error fetching components by names:', error)
        return []
      }

      return (data || []).map(item => ({
        ...item,
        zone: Array.isArray(item.zones) ? item.zones[0] : item.zones
      }))
    } catch (error) {
      console.error('Failed to fetch components by names:', error)
      return []
    }
  }

  /**
   * Get comprehensive data set for testing
   */
  static async getTestDataSet(organizationId: string): Promise<{
    components: InfrastructureComponent[]
    relationships: InfrastructureRelationship[]
    incidents: IncidentData[]
    changes: ChangeData[]
    problems: ProblemData[]
  }> {
    try {
      const [components, relationships, incidents, changes, problems] = await Promise.all([
        this.getInfrastructureComponents(organizationId, 50),
        this.getInfrastructureRelationships(organizationId, undefined, 30),
        this.getRecentIncidents(organizationId, 60, 15),
        this.getRecentChanges(organizationId, 14, 8),
        this.getHistoricalProblems(organizationId, undefined, 10)
      ])

      return {
        components,
        relationships,
        incidents,
        changes,
        problems
      }
    } catch (error) {
      console.error('Failed to fetch test data set:', error)
      return {
        components: [],
        relationships: [],
        incidents: [],
        changes: [],
        problems: []
      }
    }
  }

  /**
   * Get sample data for prompt testing
   */
  static getSampleData(): {
    components: InfrastructureComponent[]
    relationships: InfrastructureRelationship[]
    incidents: IncidentData[]
    changes: ChangeData[]
  } {
    return {
      components: [
        {
          id: '1',
          name: 'web-server-01',
          type: 'server',
          environment: 'production',
          status: 'active',
          description: 'Primary web server',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'database-primary',
          type: 'database',
          environment: 'production',
          status: 'active',
          description: 'Main PostgreSQL database',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '3',
          name: 'load-balancer',
          type: 'network',
          environment: 'production',
          status: 'active',
          description: 'Main load balancer',
          created_at: '2024-01-01T00:00:00Z'
        }
      ],
      relationships: [
        {
          id: '1',
          source: 'load-balancer',
          target: 'web-server-01',
          type: 'routes_to',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          source: 'web-server-01',
          target: 'database-primary',
          type: 'depends_on',
          created_at: '2024-01-01T00:00:00Z'
        }
      ],
      incidents: [
        {
          id: '1',
          title: 'Database connection timeout',
          description: 'Users experiencing slow page loads due to database timeouts',
          priority: 'high',
          status: 'resolved',
          criticality: 'high',
          urgency: 'medium',
          affected_services: ['database-primary', 'web-server-01'],
          tags: ['database', 'performance'],
          created_at: '2024-01-10T00:00:00Z'
        }
      ],
      changes: [
        {
          id: '1',
          title: 'Database maintenance',
          description: 'Scheduled database optimization',
          priority: 'medium',
          status: 'completed',
          scheduled_for: '2024-01-15T02:00:00Z',
          affected_services: ['database-primary'],
          created_at: '2024-01-10T00:00:00Z'
        }
      ]
    }
  }
}