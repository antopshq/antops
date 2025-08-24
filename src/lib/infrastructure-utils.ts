import { Node, Edge, MarkerType } from 'reactflow'

export interface InfrastructureDiagram {
  version: string
  metadata: {
    name: string
    description?: string
    created: string
    lastModified: string
    environment?: string
  }
  nodes: Node[]
  edges: Edge[]
}

// Export diagram to JSON
export function exportDiagramToJson(
  nodes: Node[], 
  edges: Edge[], 
  metadata: Partial<InfrastructureDiagram['metadata']> = {}
): string {
  const diagram: InfrastructureDiagram = {
    version: '1.0',
    metadata: {
      name: metadata.name || 'Infrastructure Diagram',
      description: metadata.description || 'Exported infrastructure diagram',
      created: metadata.created || new Date().toISOString(),
      lastModified: new Date().toISOString(),
      environment: metadata.environment
    },
    nodes: nodes.map(node => ({
      ...node,
      // Clean up any temporary or UI-specific properties
      selected: false,
      dragging: false
    })),
    edges: edges.map(edge => ({
      ...edge,
      // Clean up any temporary or UI-specific properties
      selected: false
    }))
  }

  return JSON.stringify(diagram, null, 2)
}

// Import diagram from JSON
export function importDiagramFromJson(jsonString: string): {
  nodes: Node[]
  edges: Edge[]
  metadata: InfrastructureDiagram['metadata']
} {
  try {
    const diagram: InfrastructureDiagram = JSON.parse(jsonString)
    
    if (!diagram.version || !diagram.nodes || !diagram.edges) {
      throw new Error('Invalid diagram format')
    }

    return {
      nodes: diagram.nodes,
      edges: diagram.edges,
      metadata: diagram.metadata
    }
  } catch (error) {
    throw new Error(`Failed to parse diagram: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Download JSON file
export function downloadJsonFile(content: string, filename: string = 'infrastructure-diagram.json') {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Parse Terraform file and extract resources
export interface TerraformResource {
  type: string
  name: string
  config: Record<string, any>
  dependencies?: string[]
}

export function parseTerraformFile(terraformContent: string): TerraformResource[] {
  const resources: TerraformResource[] = []
  
  // Enhanced regex-based parser for Terraform resources
  // This handles nested blocks and various value types
  const resourceRegex = /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{([\s\S]*?)\n\}/g
  
  let match
  while ((match = resourceRegex.exec(terraformContent)) !== null) {
    const [, type, name, configBlock] = match
    
    // Parse configuration with support for nested blocks and different value types
    const config = parseConfigBlock(configBlock)
    
    resources.push({
      type,
      name,
      config
    })
  }
  
  return resources
}

// Parse a Terraform configuration block
function parseConfigBlock(configBlock: string): Record<string, any> {
  const config: Record<string, any> = {}
  
  // Remove comments and normalize whitespace
  const cleanBlock = configBlock
    .replace(/#[^\n]*$/gm, '') // Remove comments
    .replace(/\/\/[^\n]*$/gm, '') // Remove // comments
    .trim()
  
  // Parse different types of configurations
  const lines = cleanBlock.split('\n').map(line => line.trim()).filter(line => line)
  
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      i++
      continue
    }
    
    // Handle nested blocks (like tags { ... })
    if (line.includes('{') && !line.includes('=')) {
      const blockName = line.replace(/\s*\{.*/, '').trim()
      const blockContent = []
      i++
      let braceCount = 1
      
      while (i < lines.length && braceCount > 0) {
        const blockLine = lines[i]
        if (blockLine.includes('{')) braceCount++
        if (blockLine.includes('}')) braceCount--
        
        if (braceCount > 0) {
          blockContent.push(blockLine)
        }
        i++
      }
      
      config[blockName] = parseConfigBlock(blockContent.join('\n'))
      continue
    }
    
    // Handle key-value pairs
    const kvMatch = line.match(/^(\w+)\s*=\s*(.+)$/)
    if (kvMatch) {
      const [, key, value] = kvMatch
      config[key] = parseValue(value.trim())
    }
    
    i++
  }
  
  return config
}

// Parse different types of values (strings, numbers, booleans, lists, references)
function parseValue(value: string): any {
  // Remove trailing comma
  value = value.replace(/,$/, '')
  
  // String values
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1)
  }
  
  // Boolean values
  if (value === 'true') return true
  if (value === 'false') return false
  
  // Number values
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10)
  }
  if (/^\d*\.\d+$/.test(value)) {
    return parseFloat(value)
  }
  
  // List values
  if (value.startsWith('[') && value.endsWith(']')) {
    const listContent = value.slice(1, -1).trim()
    if (!listContent) return []
    
    return listContent.split(',').map(item => parseValue(item.trim()))
  }
  
  // Reference values (like aws_vpc.main.id)
  if (value.includes('.')) {
    return value // Keep as string reference for now
  }
  
  // Default to string
  return value
}

// Map Terraform resources to infrastructure components and zones
export function mapTerraformToNodes(resources: TerraformResource[]): Node[] {
  // Filter out "glue" resources that are just configuration links, not actual infrastructure
  const glueResources = new Set([
    'aws_lb_target_group_attachment',
    'aws_route_table_association', 
    'aws_route',  // Routes are just config, the route table is the actual resource
  ])
  
  const filteredResources = resources.filter(r => !glueResources.has(r.type))
  console.log(`🔧 Filtered out ${resources.length - filteredResources.length} glue resources, ${filteredResources.length} remaining`)
  
  // Build dependency graph first
  const dependencyGraph = buildDependencyGraph(filteredResources)
  
  // Separate zones from components with hierarchy info
  const zones: Node[] = []
  const components: Node[] = []
  
  // First pass: create zones and components
  filteredResources.forEach((resource) => {
    const { nodeType, isZone } = mapTerraformTypeToNodeType(resource.type)
    
    if (isZone) {
      const zoneName = extractResourceName(resource)
      const zone: Node = {
        id: `terraform-${resource.type}-${resource.name}`,
        type: 'zone',
        position: { x: 0, y: 0 }, // Will be calculated later
        data: {
          name: zoneName,
          type: nodeType,
          zoneType: nodeType,
          terraformType: resource.type,
          terraformConfig: resource.config,
          terraformResource: resource,
          nodeCount: 0,
          hierarchy: getResourceHierarchy(resource.type)
        },
        style: {
          width: getZoneWidth(nodeType),
          height: getZoneHeight(nodeType),
          backgroundColor: getZoneColor(nodeType),
          border: `2px solid ${getZoneBorderColor(nodeType)}`,
          borderRadius: 8,
          zIndex: 1
        }
      }
      zones.push(zone)
    } else {
      const componentTitle = extractResourceName(resource)
      const component: Node = {
        id: `terraform-${resource.type}-${resource.name}`,
        type: 'infrastructure',
        position: { x: 0, y: 0 }, // Will be calculated later
        data: {
          label: resource.name,
          customTitle: componentTitle,
          type: nodeType,
          terraformType: resource.type,
          terraformConfig: resource.config,
          terraformResource: resource,
          environment: 'imported',
          status: 'running'
        }
      }
      components.push(component)
    }
  })
  
  // Build hierarchical layout
  const layoutResult = buildHierarchicalLayout(zones, components, dependencyGraph, filteredResources)
  
  return layoutResult
}

// Find the appropriate parent zone for a component based on Terraform relationships
function findParentZone(component: Node, zones: Node[], resources: TerraformResource[]): Node | null {
  const componentResource = resources.find(r => 
    `terraform-${r.type}-${r.name}` === component.id
  )
  
  if (!componentResource) return null
  
  // Look for VPC reference in component config
  const vpcRef = componentResource.config.vpc_id || componentResource.config.vpc_security_group_ids
  if (vpcRef) {
    const vpcZone = zones.find(zone => 
      zone.data.terraformType === 'aws_vpc' && 
      (vpcRef.includes(zone.data.name) || vpcRef.includes(zone.id) || vpcRef.includes(`aws_vpc.${componentResource.name}`))
    )
    if (vpcZone) return vpcZone
  }
  
  // Look for security group reference
  const sgRef = componentResource.config.vpc_security_group_ids || componentResource.config.security_groups
  if (sgRef) {
    const sgZone = zones.find(zone => 
      zone.data.terraformType === 'aws_security_group' && 
      (typeof sgRef === 'string' ? sgRef.includes(zone.id) : 
       Array.isArray(sgRef) && sgRef.some(ref => ref.includes(zone.id)))
    )
    if (sgZone) return sgZone
  }
  
  // Look for subnet reference
  const subnetRef = componentResource.config.subnet_id || componentResource.config.subnets
  if (subnetRef) {
    const subnetZone = zones.find(zone => 
      zone.data.terraformType?.includes('subnet') && 
      (subnetRef.includes(zone.data.name) || subnetRef.includes(zone.id))
    )
    if (subnetZone) return subnetZone
  }
  
  // Default to first VPC if component is an AWS resource
  if (componentResource.type.startsWith('aws_')) {
    const vpcZone = zones.find(zone => zone.data.terraformType === 'aws_vpc')
    if (vpcZone) return vpcZone
  }
  
  return null
}

// Get zone background color based on type
function getZoneColor(zoneType: string): string {
  switch (zoneType) {
    case 'vpc': return 'rgba(59, 130, 246, 0.1)' // blue
    case 'subnet': return 'rgba(34, 197, 94, 0.1)' // green
    case 'security_group': return 'rgba(239, 68, 68, 0.1)' // red
    case 'cluster': return 'rgba(168, 85, 247, 0.1)' // purple
    case 'datacenter': return 'rgba(107, 114, 128, 0.1)' // gray
    default: return 'rgba(156, 163, 175, 0.1)' // default gray
  }
}

// Get zone border color based on type
function getZoneBorderColor(zoneType: string): string {
  switch (zoneType) {
    case 'vpc': return '#3b82f6' // blue
    case 'subnet': return '#22c55e' // green
    case 'security_group': return '#ef4444' // red
    case 'cluster': return '#a855f7' // purple
    case 'datacenter': return '#6b7280' // gray
    default: return '#9ca3af' // default gray
  }
}

// Calculate zone positions in a grid layout
function calculateZonePosition(index: number): { x: number; y: number } {
  const cols = 2 // 2 zones per row
  const row = Math.floor(index / cols)
  const col = index % cols
  
  return {
    x: col * 450 + 50,
    y: row * 350 + 50
  }
}

// Map Terraform resource types to our node types and determine if it's a zone
function mapTerraformTypeToNodeType(terraformType: string): { nodeType: string; isZone: boolean } {
  // Define which resources should be zones (containers only)
  // These are resources that can contain other resources
  const zoneResources = new Set([
    // AWS Container Zones
    'aws_vpc',             // VPCs contain subnets, security groups, etc.
    'aws_subnet',          // Subnets contain instances, databases, etc.
    'aws_security_group',  // Security groups define access boundaries
    'aws_ecs_cluster',     // Clusters contain services/tasks
    'aws_eks_cluster',     // Kubernetes clusters contain pods/services
    
    // Azure Container Zones  
    'azurerm_virtual_network',         // VNets contain subnets
    'azurerm_subnet',                  // Subnets contain VMs, databases, etc.
    'azurerm_network_security_group',  // NSGs define access boundaries
    'azurerm_resource_group',          // Resource groups contain everything
    'azurerm_kubernetes_cluster',      // Kubernetes clusters
    
    // GCP Container Zones
    'google_compute_network',      // Networks contain subnetworks
    'google_compute_subnetwork',   // Subnetworks contain instances
    'google_compute_firewall',     // Firewall rules define access boundaries
    'google_container_cluster',    // Kubernetes clusters
  ])
  
  const isZone = zoneResources.has(terraformType)
  
  // Type mapping for zones (containers)
  const zoneTypeMapping: Record<string, string> = {
    // AWS Zones
    'aws_vpc': 'vpc',
    'aws_subnet': 'subnet',
    'aws_security_group': 'security_group',
    'aws_ecs_cluster': 'cluster',
    'aws_eks_cluster': 'cluster',
    
    // Azure Zones
    'azurerm_virtual_network': 'vpc',
    'azurerm_subnet': 'subnet',
    'azurerm_network_security_group': 'security_group',
    'azurerm_resource_group': 'datacenter',
    'azurerm_kubernetes_cluster': 'cluster',
    
    // GCP Zones
    'google_compute_network': 'vpc',
    'google_compute_subnetwork': 'subnet',
    'google_compute_firewall': 'security_group',
    'google_container_cluster': 'cluster',
  }
  
  // Type mapping for components
  const componentTypeMapping: Record<string, string> = {
    // AWS Compute
    'aws_instance': 'server',
    'aws_launch_template': 'server',
    'aws_launch_configuration': 'server',
    'aws_autoscaling_group': 'server',
    'aws_spot_instance_request': 'server',
    
    // AWS Containers & Serverless
    'aws_ecs_service': 'container',
    'aws_ecs_task_definition': 'container',
    'aws_eks_node_group': 'container',
    'aws_lambda_function': 'cloud',
    'aws_lambda_layer_version': 'cloud',
    
    // AWS Databases
    'aws_rds_instance': 'database',
    'aws_rds_cluster': 'database',
    'aws_db_instance': 'database',
    'aws_db_cluster': 'database',
    'aws_dynamodb_table': 'database',
    'aws_elasticache_cluster': 'database',
    'aws_redshift_cluster': 'database',
    'aws_documentdb_cluster': 'database',
    'aws_neptune_cluster': 'database',
    
    // AWS Storage
    'aws_s3_bucket': 'storage',
    'aws_efs_file_system': 'storage',
    'aws_fsx_file_system': 'storage',
    'aws_ebs_volume': 'storage',
    'aws_ebs_snapshot': 'storage',
    
    // AWS Networking & Load Balancing
    'aws_load_balancer': 'network',
    'aws_lb': 'network',
    'aws_elb': 'network',
    'aws_alb': 'network',
    'aws_nlb': 'network',
    'aws_lb_target_group': 'network',
    'aws_lb_listener': 'network',
    'aws_lb_target_group_attachment': 'network',
    'aws_internet_gateway': 'network',
    'aws_nat_gateway': 'network',
    'aws_vpn_gateway': 'network',
    'aws_route_table': 'network',
    'aws_route': 'network',
    'aws_route_table_association': 'network',
    'aws_db_subnet_group': 'network',
    'aws_elastip': 'network',
    'aws_network_interface': 'network',
    'aws_cloudfront_distribution': 'network',
    'aws_api_gateway': 'network',
    'aws_api_gateway_v2_api': 'network',
    
    // AWS Monitoring & Management
    'aws_cloudwatch_dashboard': 'monitoring',
    'aws_cloudwatch_alarm': 'monitoring',
    'aws_cloudwatch_log_group': 'monitoring',
    'aws_sns_topic': 'monitoring',
    'aws_sqs_queue': 'monitoring',
    
    // AWS Security & Identity
    'aws_iam_role': 'security',
    'aws_iam_policy': 'security',
    'aws_iam_user': 'security',
    'aws_iam_group': 'security',
    'aws_kms_key': 'security',
    'aws_secretsmanager_secret': 'security',
    
    // Azure Compute
    'azurerm_virtual_machine': 'server',
    'azurerm_linux_virtual_machine': 'server',
    'azurerm_windows_virtual_machine': 'server',
    'azurerm_virtual_machine_scale_set': 'server',
    'azurerm_container_instance': 'container',
    'azurerm_container_group': 'container',
    'azurerm_kubernetes_cluster_node_pool': 'container',
    
    // Azure Serverless & Functions
    'azurerm_function_app': 'cloud',
    'azurerm_logic_app_workflow': 'cloud',
    'azurerm_app_service': 'cloud',
    
    // Azure Databases
    'azurerm_sql_database': 'database',
    'azurerm_sql_server': 'database',
    'azurerm_mysql_server': 'database',
    'azurerm_mysql_flexible_server': 'database',
    'azurerm_postgresql_server': 'database',
    'azurerm_postgresql_flexible_server': 'database',
    'azurerm_cosmosdb_account': 'database',
    'azurerm_redis_cache': 'database',
    
    // Azure Storage
    'azurerm_storage_account': 'storage',
    'azurerm_storage_blob': 'storage',
    'azurerm_managed_disk': 'storage',
    'azurerm_disk_encryption_set': 'storage',
    
    // Azure Networking
    'azurerm_lb': 'network',
    'azurerm_application_gateway': 'network',
    'azurerm_public_ip': 'network',
    'azurerm_network_interface': 'network',
    'azurerm_route_table': 'network',
    'azurerm_nat_gateway': 'network',
    'azurerm_vpn_gateway': 'network',
    'azurerm_express_route_circuit': 'network',
    
    // Azure Monitoring & Management
    'azurerm_monitor_diagnostic_setting': 'monitoring',
    'azurerm_log_analytics_workspace': 'monitoring',
    'azurerm_application_insights': 'monitoring',
    
    // Azure Security & Identity
    'azurerm_key_vault': 'security',
    'azurerm_key_vault_secret': 'security',
    'azurerm_user_assigned_identity': 'security',
    'azurerm_role_assignment': 'security',
    
    // GCP Compute
    'google_compute_instance': 'server',
    'google_compute_instance_template': 'server',
    'google_compute_instance_group': 'server',
    'google_compute_autoscaler': 'server',
    
    // GCP Containers & Serverless
    'google_cloud_run_service': 'container',
    'google_cloudfunctions_function': 'cloud',
    'google_cloudfunctions2_function': 'cloud',
    'google_app_engine_application': 'cloud',
    
    // GCP Databases
    'google_sql_database_instance': 'database',
    'google_sql_database': 'database',
    'google_bigtable_instance': 'database',
    'google_firestore_database': 'database',
    'google_spanner_instance': 'database',
    'google_redis_instance': 'database',
    
    // GCP Storage
    'google_storage_bucket': 'storage',
    'google_compute_disk': 'storage',
    'google_filestore_instance': 'storage',
    
    // GCP Networking
    'google_compute_global_address': 'network',
    'google_compute_address': 'network',
    'google_compute_forwarding_rule': 'network',
    'google_compute_global_forwarding_rule': 'network',
    'google_compute_backend_service': 'network',
    'google_compute_url_map': 'network',
    'google_compute_target_proxy': 'network',
    'google_compute_router': 'network',
    'google_compute_vpn_gateway': 'network',
    
    // GCP Monitoring & Management
    'google_monitoring_dashboard': 'monitoring',
    'google_logging_sink': 'monitoring',
    'google_pubsub_topic': 'monitoring',
    'google_pubsub_subscription': 'monitoring',
    
    // GCP Security & Identity
    'google_service_account': 'security',
    'google_service_account_key': 'security',
    'google_project_iam_binding': 'security',
    'google_kms_crypto_key': 'security',
    
    // Generic/Multi-cloud
    'kubernetes_deployment': 'container',
    'kubernetes_service': 'container',
    'kubernetes_ingress': 'network',
    'kubernetes_configmap': 'container',
    'kubernetes_secret': 'security',
    'helm_release': 'container'
  }
  
  if (isZone) {
    return {
      nodeType: zoneTypeMapping[terraformType] || 'datacenter',
      isZone: true
    }
  } else {
    return {
      nodeType: componentTypeMapping[terraformType] || 'server',
      isZone: false
    }
  }
}

// Calculate node positions in a grid layout
function calculateNodePosition(index: number, totalNodes: number): { x: number; y: number } {
  const cols = Math.ceil(Math.sqrt(totalNodes))
  const row = Math.floor(index / cols)
  const col = index % cols
  
  return {
    x: col * 140 + 80, // Reduced spacing for smaller nodes
    y: row * 120 + 80 // Reduced row height for smaller nodes
  }
}

// Generate edges from Terraform dependencies with intelligent routing
export function generateTerraformEdges(resources: TerraformResource[]): Edge[] {
  // Temporarily disable edge generation for cleaner visualization
  return []
}

// Get edge styling based on resource relationship
function getEdgeStyle(source: TerraformResource, target: TerraformResource) {
  const { nodeType: sourceType, isZone: sourceIsZone } = mapTerraformTypeToNodeType(source.type)
  const { nodeType: targetType, isZone: targetIsZone } = mapTerraformTypeToNodeType(target.type)
  
  // Zone-to-zone connections (containment)
  if (sourceIsZone && targetIsZone) {
    return {
      type: 'step',
      animated: false,
      color: '#94a3b8',
      style: { stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5,5' },
      label: 'contains'
    }
  }
  
  // Zone-to-component connections (ownership)
  if (sourceIsZone && !targetIsZone) {
    return {
      type: 'smoothstep',
      animated: false,
      color: '#3b82f6',
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      label: 'hosts'
    }
  }
  
  // Component-to-component connections (communication)
  if (!sourceIsZone && !targetIsZone) {
    // Database connections
    if (targetType === 'database' || sourceType === 'database') {
      return {
        type: 'smoothstep',
        animated: true,
        color: '#059669',
        style: { stroke: '#059669', strokeWidth: 2 },
        label: 'data'
      }
    }
    
    // Network/Load balancer connections
    if (targetType === 'network' || sourceType === 'network') {
      return {
        type: 'smoothstep',
        animated: true,
        color: '#dc2626',
        style: { stroke: '#dc2626', strokeWidth: 2 },
        label: 'routes'
      }
    }
    
    // Default component connection
    return {
      type: 'smoothstep',
      animated: false,
      color: '#6b7280',
      style: { stroke: '#6b7280', strokeWidth: 1.5 },
      label: 'uses'
    }
  }
  
  // Default edge style
  return {
    type: 'smoothstep',
    animated: false,
    color: '#9ca3af',
    style: { stroke: '#9ca3af', strokeWidth: 1 },
    label: ''
  }
}

// Generate implicit edges for better visualization (e.g., common patterns)
function generateImplicitEdges(resources: TerraformResource[]): Edge[] {
  const edges: Edge[] = []
  
  // Find common AWS patterns
  const vpcs = resources.filter(r => r.type === 'aws_vpc')
  const instances = resources.filter(r => r.type === 'aws_instance')
  const databases = resources.filter(r => r.type.includes('rds') || r.type.includes('db'))
  const loadBalancers = resources.filter(r => r.type.includes('lb') || r.type.includes('elb'))
  
  // Load balancer to instances pattern
  loadBalancers.forEach(lb => {
    instances.forEach(instance => {
      // Only connect if they're likely in the same VPC
      if (sharesSameVPC(lb, instance, resources)) {
        edges.push({
          id: `implicit-${lb.name}-to-${instance.name}`,
          source: `terraform-${lb.type}-${lb.name}`,
          target: `terraform-${instance.type}-${instance.name}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#f59e0b', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#f59e0b',
          }
        })
      }
    })
  })
  
  // Instance to database pattern (if no explicit connection exists)
  instances.forEach(instance => {
    databases.forEach(db => {
      if (sharesSameVPC(instance, db, resources)) {
        const edgeId = `implicit-${instance.name}-to-${db.name}`
        const existingEdge = edges.find(e => e.id === edgeId)
        
        if (!existingEdge) {
          edges.push({
            id: edgeId,
            source: `terraform-${instance.type}-${instance.name}`,
            target: `terraform-${db.type}-${db.name}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#059669', strokeWidth: 1.5, strokeDasharray: '3,3' },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: '#059669',
            }
          })
        }
      }
    })
  })
  
  return edges
}

// Check if two resources likely share the same VPC
function sharesSameVPC(resource1: TerraformResource, resource2: TerraformResource, allResources: TerraformResource[]): boolean {
  // Simple heuristic: check if they reference the same VPC
  const vpc1 = getVPCReference(resource1)
  const vpc2 = getVPCReference(resource2)
  
  if (vpc1 && vpc2) {
    return vpc1 === vpc2
  }
  
  // If only one VPC exists, assume they share it
  const vpcs = allResources.filter(r => r.type === 'aws_vpc')
  return vpcs.length === 1
}

// Extract VPC reference from resource config
function getVPCReference(resource: TerraformResource): string | null {
  const config = resource.config
  
  // Direct VPC reference
  if (config.vpc_id) return config.vpc_id
  
  // Subnet reference (which implies VPC)
  if (config.subnet_id) return config.subnet_id
  
  // Security group reference
  if (config.vpc_security_group_ids) {
    return Array.isArray(config.vpc_security_group_ids) 
      ? config.vpc_security_group_ids[0] 
      : config.vpc_security_group_ids
  }
  
  return null
}

// Extract a meaningful name from a Terraform resource
function extractResourceName(resource: TerraformResource): string {
  // Try to get name from tags first
  if (resource.config.tags && typeof resource.config.tags === 'object') {
    const tagName = resource.config.tags.Name || resource.config.tags.name
    if (tagName) return tagName
  }
  
  // Try explicit name field
  if (resource.config.name) return resource.config.name
  
  // Try identifier field for databases
  if (resource.config.identifier) return resource.config.identifier
  
  // Try bucket name for S3
  if (resource.config.bucket) return resource.config.bucket
  
  // Fallback to resource name with prettier formatting
  return resource.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Get appropriate zone width based on type
function getZoneWidth(zoneType: string): number {
  switch (zoneType) {
    case 'vpc': return 500
    case 'subnet': return 350
    case 'security_group': return 300
    case 'cluster': return 400
    default: return 400
  }
}

// Get appropriate zone height based on type
function getZoneHeight(zoneType: string): number {
  switch (zoneType) {
    case 'vpc': return 500
    case 'subnet': return 300
    case 'security_group': return 200
    case 'cluster': return 350
    default: return 300
  }
}

// Build dependency graph from Terraform resources
function buildDependencyGraph(resources: TerraformResource[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()
  
  resources.forEach(resource => {
    const resourceId = `terraform-${resource.type}-${resource.name}`
    if (!graph.has(resourceId)) {
      graph.set(resourceId, new Set())
    }
    
    // Analyze resource config for references
    const dependencies = findResourceDependencies(resource, resources)
    graph.set(resourceId, new Set(dependencies))
  })
  
  return graph
}

// Find dependencies for a resource based on its configuration
function findResourceDependencies(resource: TerraformResource, allResources: TerraformResource[]): string[] {
  const dependencies: string[] = []
  
  // Convert config to string for reference scanning
  const configStr = JSON.stringify(resource.config)
  
  // Look for Terraform references (e.g., aws_vpc.main.id)
  const refRegex = /(\w+)\.(\w+)\.[\w.]+/g
  let match
  
  while ((match = refRegex.exec(configStr)) !== null) {
    const [, refType, refName] = match
    const referencedId = `terraform-${refType}-${refName}`
    
    // Check if this reference exists in our resources
    if (allResources.some(r => `terraform-${r.type}-${r.name}` === referencedId)) {
      dependencies.push(referencedId)
    }
  }
  
  return dependencies
}

// Get resource hierarchy level for proper nesting
function getResourceHierarchy(terraformType: string): number {
  const hierarchyMap: Record<string, number> = {
    // Level 1 - Top level containers
    'aws_vpc': 1,
    'azurerm_resource_group': 1,
    'google_compute_network': 1,
    
    // Level 2 - Mid-level containers
    'aws_subnet': 2,
    'azurerm_subnet': 2,
    'google_compute_subnetwork': 2,
    'aws_security_group': 2,
    'azurerm_network_security_group': 2,
    
    // Level 3 - Service containers
    'aws_ecs_cluster': 3,
    'aws_eks_cluster': 3,
    'azurerm_kubernetes_cluster': 3,
    'google_container_cluster': 3,
    
    // Level 4 - Components (not zones)
    'aws_instance': 4,
    'aws_rds_instance': 4,
    'aws_s3_bucket': 4
  }
  
  return hierarchyMap[terraformType] || 4
}

// Build hierarchical layout with step-by-step positioning
function buildHierarchicalLayout(
  zones: Node[], 
  components: Node[], 
  dependencyGraph: Map<string, Set<string>>, 
  resources: TerraformResource[]
): Node[] {
  console.log('🏗️ Starting step-by-step zone layout...')
  
  // Step 1: Sort zones by hierarchy level and analyze structure
  zones.sort((a, b) => (a.data.hierarchy || 4) - (b.data.hierarchy || 4))
  console.log('📋 Zone hierarchy order:', zones.map(z => `${z.data.terraformType} (L${z.data.hierarchy})`))
  
  // Step 2: Build zone relationships with detailed logging
  const { zoneHierarchy, zoneParents } = buildZoneRelationships(zones, dependencyGraph, resources)
  
  // Step 3: Calculate optimal zone sizes based on their content
  const zonesWithSizes = calculateOptimalZoneSizes(zones, components, dependencyGraph, resources)
  
  // Step 4: Position zones using intelligent layout algorithm
  const positionedZones = positionZonesIntelligently(zonesWithSizes, zoneHierarchy, zoneParents)
  
  // Step 5: Assign and position components within zones
  const { assignedComponents, orphanedComponents } = assignComponentsToZones(
    components, 
    positionedZones, 
    dependencyGraph, 
    resources
  )
  
  // Step 6: Lock all nodes to their parent zones
  const finalNodes = [...positionedZones, ...assignedComponents, ...orphanedComponents]
  const lockedNodes = autoLockNodesToParents(finalNodes)
  
  console.log('✅ Zone layout complete:', {
    totalZones: positionedZones.length,
    assignedComponents: assignedComponents.length,
    orphanedComponents: orphanedComponents.length,
    lockedNodes: lockedNodes.filter(n => n.data.isLocked).length
  })
  
  return lockedNodes
}

// Check if one zone should be parent of another
function isZoneParent(
  potentialParent: Node, 
  potentialChild: Node, 
  dependencyGraph: Map<string, Set<string>>, 
  resources: TerraformResource[]
): boolean {
  // Hierarchy level check
  const parentLevel = potentialParent.data.hierarchy || 4
  const childLevel = potentialChild.data.hierarchy || 4
  
  if (parentLevel >= childLevel) return false
  
  // Dependency check - child should depend on parent
  const childDeps = dependencyGraph.get(potentialChild.id) || new Set()
  if (childDeps.has(potentialParent.id)) return true
  
  // AWS specific relationships
  const parentResource = potentialParent.data.terraformResource
  const childResource = potentialChild.data.terraformResource
  
  if (!parentResource || !childResource) return false
  
  // VPC -> Subnet relationship
  if (parentResource.type === 'aws_vpc' && childResource.type === 'aws_subnet') {
    const vpcRef = childResource.config.vpc_id
    if (vpcRef && vpcRef.includes(parentResource.name)) return true
  }
  
  // Subnet -> Security Group relationship
  if (parentResource.type === 'aws_subnet' && childResource.type === 'aws_security_group') {
    return true // Security groups can exist in subnets
  }
  
  return false
}


// Find the best parent zone for a component
function findBestParentZone(
  component: Node, 
  zones: Node[], 
  dependencyGraph: Map<string, Set<string>>, 
  resources: TerraformResource[]
): Node | null {
  const componentResource = component.data.terraformResource
  if (!componentResource) return null
  
  // Score each zone based on relationship strength
  const zoneScores = zones.map(zone => {
    const score = calculateZoneCompatibilityScore(componentResource, zone.data.terraformResource, dependencyGraph)
    return { zone, score }
  })
  
  // Sort by score and return best match
  zoneScores.sort((a, b) => b.score - a.score)
  const bestMatch = zoneScores[0]
  
  return bestMatch && bestMatch.score > 0 ? bestMatch.zone : null
}

// Calculate compatibility score between component and zone
function calculateZoneCompatibilityScore(
  component: TerraformResource,
  zone: TerraformResource,
  dependencyGraph: Map<string, Set<string>>
): number {
  let score = 0
  
  const componentId = `terraform-${component.type}-${component.name}`
  const zoneId = `terraform-${zone.type}-${zone.name}`
  
  // Direct dependency = high score
  const deps = dependencyGraph.get(componentId) || new Set()
  if (deps.has(zoneId)) score += 100
  
  // AWS specific relationships
  if (component.type.startsWith('aws_') && zone.type.startsWith('aws_')) {
    // Instance -> VPC/Subnet
    if (component.type === 'aws_instance') {
      if (zone.type === 'aws_vpc') score += 30
      if (zone.type === 'aws_subnet') score += 50
    }
    
    // Database -> Subnet Group/VPC
    if (component.type.includes('rds') || component.type.includes('db')) {
      if (zone.type === 'aws_vpc') score += 40
      if (zone.type === 'aws_subnet') score += 60
    }
  }
  
  // Avoid placing components in security groups
  if (zone.type.includes('security_group')) score -= 20
  
  return score
}

// Calculate position for component within a zone
function calculateComponentPositionInZone(
  component: Node, 
  index: number, 
  parentZone: Node
): { x: number; y: number } {
  const cols = 4 // Max 4 components per row in a zone (increased due to smaller nodes)
  const row = Math.floor(index / cols)
  const col = index % cols
  
  return {
    x: 20 + col * 110, // Reduced spacing for smaller nodes
    y: 60 + row * 80   // Reduced row height for smaller nodes
  }
}

// Calculate position for orphaned components (outside zones)
function calculateOrphanedNodePosition(index: number, totalOrphaned: number): { x: number; y: number } {
  return {
    x: 30 + (index % 5) * 130, // More components per row with smaller spacing
    y: 600 + Math.floor(index / 5) * 120 // Reduced row height
  }
}

// Step 2: Build zone relationships with detailed analysis
function buildZoneRelationships(
  zones: Node[], 
  dependencyGraph: Map<string, Set<string>>, 
  resources: TerraformResource[]
): { zoneHierarchy: Map<string, string[]>, zoneParents: Map<string, string> } {
  const zoneHierarchy = new Map<string, string[]>() // parent -> children
  const zoneParents = new Map<string, string>() // child -> parent
  
  console.log('🔗 Analyzing zone relationships...')
  
  // Build parent-child relationships with detailed logging
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i]
    console.log(`🔍 Analyzing zone: ${zone.data.terraformType} (${zone.data.name})`)
    
    for (let j = 0; j < zones.length; j++) {
      if (i === j) continue
      const otherZone = zones[j]
      
      if (isZoneParent(zone, otherZone, dependencyGraph, resources)) {
        console.log(`  ↳ 📦 Found child: ${otherZone.data.terraformType} → ${zone.data.terraformType}`)
        
        if (!zoneHierarchy.has(zone.id)) {
          zoneHierarchy.set(zone.id, [])
        }
        zoneHierarchy.get(zone.id)!.push(otherZone.id)
        zoneParents.set(otherZone.id, zone.id)
      }
    }
  }
  
  console.log('📊 Zone hierarchy summary:', Array.from(zoneHierarchy.entries()).map(([parent, children]) => 
    `${zones.find(z => z.id === parent)?.data.terraformType} has ${children.length} children`
  ))
  
  return { zoneHierarchy, zoneParents }
}

// Step 3: Calculate optimal zone sizes based on content
function calculateOptimalZoneSizes(
  zones: Node[], 
  components: Node[], 
  dependencyGraph: Map<string, Set<string>>, 
  resources: TerraformResource[]
): Node[] {
  console.log('📏 Calculating optimal zone sizes...')
  
  return zones.map(zone => {
    // Count potential child components
    const potentialChildren = components.filter(component => {
      const score = calculateZoneCompatibilityScore(
        component.data.terraformResource, 
        zone.data.terraformResource, 
        dependencyGraph
      )
      return score > 0
    })
    
    // Count child zones
    const childZones = zones.filter(otherZone => 
      otherZone.id !== zone.id && 
      isZoneParent(zone, otherZone, dependencyGraph, resources)
    )
    
    const contentCount = potentialChildren.length + childZones.length
    console.log(`  📦 ${zone.data.terraformType}: ${potentialChildren.length} components + ${childZones.length} child zones = ${contentCount} total`)
    
    // Calculate optimal size based on content and hierarchy
    const baseWidth = getZoneWidth(zone.data.type)
    const baseHeight = getZoneHeight(zone.data.type)
    
    // Adjust size based on content (more content = bigger zone)
    const widthMultiplier = Math.max(1, Math.ceil(contentCount / 4)) // 4 items per row
    const heightMultiplier = Math.max(1, Math.ceil(contentCount / 4))
    
    const optimalWidth = Math.min(baseWidth * widthMultiplier, 800) // Cap max width
    const optimalHeight = Math.min(baseHeight * heightMultiplier, 600) // Cap max height
    
    return {
      ...zone,
      style: {
        ...zone.style,
        width: optimalWidth,
        height: optimalHeight
      },
      data: {
        ...zone.data,
        expectedChildren: contentCount,
        potentialComponents: potentialChildren.length,
        childZones: childZones.length
      }
    }
  })
}

// Step 4: Position zones intelligently with proper spacing
function positionZonesIntelligently(
  zones: Node[], 
  hierarchy: Map<string, string[]>, 
  parents: Map<string, string>
): Node[] {
  console.log('🎯 Positioning zones intelligently...')
  
  const positioned = new Map<string, { x: number; y: number }>()
  const rootZones = zones.filter(zone => !parents.has(zone.id))
  
  console.log(`🌳 Found ${rootZones.length} root zones:`, rootZones.map(z => z.data.terraformType))
  
  // Position root zones with better spacing calculation
  let currentX = 50
  let currentRow = 0
  const maxZonesPerRow = 2 // Limit zones per row for better organization
  
  rootZones.forEach((zone, index) => {
    if (index > 0 && index % maxZonesPerRow === 0) {
      currentRow++
      currentX = 50
    }
    
    const position = {
      x: currentX,
      y: 50 + currentRow * 700 // Large vertical spacing between rows
    }
    
    console.log(`📍 Positioning root zone ${zone.data.terraformType} at (${position.x}, ${position.y})`)
    positioned.set(zone.id, position)
    
    // Position child zones within parent with better organization
    positionChildZonesIntelligently(zone.id, hierarchy, zones, positioned)
    
    currentX += (zone.style?.width as number || 400) + 100 // Dynamic spacing based on zone width
  })
  
  // Apply positions and parent relationships
  return zones.map(zone => {
    const position = positioned.get(zone.id) || { x: 0, y: 0 }
    const parentId = parents.get(zone.id)
    
    return {
      ...zone,
      position,
      ...(parentId ? {
        parentId,
        extent: 'parent' as const,
        data: {
          ...zone.data,
          isLocked: true // Auto-lock child zones
        }
      } : {})
    }
  })
}

// Recursively position child zones with intelligent spacing
function positionChildZonesIntelligently(
  parentId: string,
  hierarchy: Map<string, string[]>,
  zones: Node[],
  positioned: Map<string, { x: number; y: number }>
) {
  const children = hierarchy.get(parentId) || []
  if (children.length === 0) return
  
  const parent = zones.find(z => z.id === parentId)
  if (!parent) return
  
  console.log(`  🔗 Positioning ${children.length} children for ${parent.data.terraformType}`)
  
  // Position children in a grid within parent
  children.forEach((childId, index) => {
    const child = zones.find(z => z.id === childId)
    if (!child) return
    
    const cols = Math.min(2, children.length) // Max 2 child zones per row
    const row = Math.floor(index / cols)
    const col = index % cols
    
    const childWidth = child.style?.width as number || 300
    const childHeight = child.style?.height as number || 250
    
    const position = {
      x: 30 + col * (childWidth + 50), // Space between child zones
      y: 80 + row * (childHeight + 50) // Vertical spacing
    }
    
    console.log(`    📍 Child ${child.data.terraformType} at relative (${position.x}, ${position.y})`)
    positioned.set(childId, position)
    
    // Recursively position grandchildren
    positionChildZonesIntelligently(childId, hierarchy, zones, positioned)
  })
}

// Step 5: Assign components to zones with better organization
function assignComponentsToZones(
  components: Node[], 
  zones: Node[], 
  dependencyGraph: Map<string, Set<string>>, 
  resources: TerraformResource[]
): { assignedComponents: Node[], orphanedComponents: Node[] } {
  console.log('🎯 Assigning components to zones...')
  
  const assignedComponents: Node[] = []
  const orphanedComponents: Node[] = []
  const zoneAssignments = new Map<string, Node[]>() // zone -> components
  
  components.forEach(component => {
    const bestZone = findBestParentZone(component, zones, dependencyGraph, resources)
    
    if (bestZone) {
      if (!zoneAssignments.has(bestZone.id)) {
        zoneAssignments.set(bestZone.id, [])
      }
      zoneAssignments.get(bestZone.id)!.push(component)
      console.log(`  ✅ Assigned ${component.data.terraformType || component.data.type} → ${bestZone.data.terraformType}`)
    } else {
      orphanedComponents.push({
        ...component,
        position: calculateOrphanedNodePosition(orphanedComponents.length, components.length)
      })
      console.log(`  ❌ Orphaned: ${component.data.terraformType || component.data.type}`)
    }
  })
  
  // Position components within their assigned zones
  zoneAssignments.forEach((zoneComponents, zoneId) => {
    const zone = zones.find(z => z.id === zoneId)
    if (!zone) return
    
    console.log(`📦 Positioning ${zoneComponents.length} components in ${zone.data.terraformType}`)
    
    zoneComponents.forEach((component, index) => {
      const position = calculateComponentPositionInZone(component, index, zone)
      
      assignedComponents.push({
        ...component,
        parentId: zoneId,
        position,
        extent: 'parent' as const,
        data: {
          ...component.data,
          isLocked: true, // Auto-lock components to zones
          parentZoneName: zone.data.name
        }
      })
    })
    
    // Update zone with actual component count
    if (zone.data) {
      zone.data.nodeCount = zoneComponents.length
    }
  })
  
  return { assignedComponents, orphanedComponents }
}

// Step 6: Auto-lock all nodes to their parent zones
function autoLockNodesToParents(nodes: Node[]): Node[] {
  console.log('🔒 Auto-locking nodes to parent zones...')
  
  return nodes.map(node => {
    const shouldLock = node.parentId || node.type === 'zone'
    
    if (shouldLock && !node.data.isLocked) {
      console.log(`  🔒 Locking ${node.data.terraformType || node.data.type} to parent`)
    }
    
    return {
      ...node,
      data: {
        ...node.data,
        isLocked: shouldLock || node.data.isLocked || false
      }
    }
  })
}