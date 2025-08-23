'use client'

import { useState, useCallback } from 'react'
import { ReactFlow, useNodesState, useEdgesState, MarkerType, Controls, Background } from '@xyflow/react'
import { AlertCircle, AlertTriangle, Wrench, Users, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import '@xyflow/react/dist/style.css'

// Custom node components
function ProblemNode({ data }: { data: any }) {
  return (
    <div className="bg-red-100 border-2 border-red-300 text-red-700 rounded-lg p-3 min-w-[120px]">
      <div className="flex items-center gap-2 mb-1">
        <AlertCircle className="w-4 h-4" />
        <div className="text-xs font-medium">Problem</div>
      </div>
      <div className="text-xs font-semibold">{data.label}</div>
    </div>
  )
}

function IncidentNode({ data }: { data: any }) {
  return (
    <div className="bg-orange-100 border-2 border-orange-300 text-orange-700 rounded-lg p-2 min-w-[100px]">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-3 h-3" />
        <div className="text-xs font-medium">Incident</div>
      </div>
      <div className="text-xs font-medium">{data.label}</div>
    </div>
  )
}

function ChangeNode({ data }: { data: any }) {
  return (
    <div className="bg-purple-100 border-2 border-purple-300 text-purple-700 rounded-lg p-2 min-w-[90px]">
      <div className="flex items-center gap-2 mb-1">
        <Wrench className="w-3 h-3" />
        <div className="text-xs font-medium">Change</div>
      </div>
      <div className="text-xs font-medium">{data.label}</div>
    </div>
  )
}

const nodeTypes = {
  problem: ProblemNode,
  incident: IncidentNode,
  change: ChangeNode,
}

interface SimpleMapProps {
  problems: any[]
  incidents: any[]
  changes: any[]
}

export function SimpleRelationshipMap({ problems, incidents, changes }: SimpleMapProps) {
  const [selectedNode, setSelectedNode] = useState<any>(null)

  const handleNodeClick = useCallback((event: any, node: any) => {
    const nodeData = [...problems, ...incidents, ...changes].find(item => String(item.id) === node.id)
    if (nodeData) {
      setSelectedNode({ ...nodeData, type: getNodeType(nodeData) })
    }
  }, [problems, incidents, changes])

  const clearSelection = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const getNodeType = (item: any) => {
    if (problems.find(p => p.id === item.id)) return 'problem'
    if (incidents.find(i => i.id === item.id)) return 'incident'
    return 'change'
  }

  // Anti-overlap positioning algorithm
  const centerX = 400
  const centerY = 300
  const minDistance = 180 // Minimum distance between nodes
  const usedPositions: Array<{x: number, y: number, width: number, height: number}> = []

  const findNonOverlappingPosition = (preferredX: number, preferredY: number, width: number, height: number) => {
    let x = preferredX
    let y = preferredY
    let attempts = 0
    const maxAttempts = 50

    while (attempts < maxAttempts) {
      let hasOverlap = false
      
      for (const pos of usedPositions) {
        const dx = Math.abs(x - pos.x)
        const dy = Math.abs(y - pos.y)
        const minDistanceX = (width + pos.width) / 2 + 20
        const minDistanceY = (height + pos.height) / 2 + 20
        
        if (dx < minDistanceX && dy < minDistanceY) {
          hasOverlap = true
          break
        }
      }
      
      if (!hasOverlap) {
        usedPositions.push({x, y, width, height})
        return {x, y}
      }
      
      // Try a new position in a spiral pattern
      const angle = (attempts * 0.5) % (2 * Math.PI)
      const spiralRadius = 50 + (attempts * 10)
      x = preferredX + Math.cos(angle) * spiralRadius
      y = preferredY + Math.sin(angle) * spiralRadius
      attempts++
    }
    
    // Fallback: just use preferred position
    usedPositions.push({x: preferredX, y: preferredY, width, height})
    return {x: preferredX, y: preferredY}
  }

  // Create all nodes with anti-overlap positioning
  const initialNodes = [
    // Problems in center circle with larger spacing
    ...problems.map((problem, index) => {
      const angle = (index / problems.length) * 2 * Math.PI
      const problemRadius = Math.max(180, problems.length * 30) // Dynamic radius based on count
      const preferredX = centerX + Math.cos(angle) * problemRadius
      const preferredY = centerY + Math.sin(angle) * problemRadius
      
      const position = findNonOverlappingPosition(preferredX - 75, preferredY - 40, 150, 80)
      
      return {
        id: String(problem.id),
        position,
        data: { 
          id: problem.problem_number || `PRB-${problem.id.substring(0, 8)}`,
          title: problem.title.substring(0, 35) + (problem.title.length > 35 ? '...' : ''),
          label: `${problem.problem_number || `PRB-${problem.id.substring(0, 8)}`}\n${problem.title.substring(0, 35)}${problem.title.length > 35 ? '...' : ''}` 
        },
        style: { 
          background: '#fee2e2', 
          border: '2px solid #fca5a5', 
          color: '#b91c1c', 
          borderRadius: '8px', 
          padding: '12px', 
          minWidth: '150px',
          minHeight: '80px',
          fontSize: '11px',
          fontWeight: '700',
          textAlign: 'center',
          whiteSpace: 'pre-line',
          lineHeight: '1.3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }
    }),
    // Incidents positioned around their problems with collision avoidance
    ...incidents.filter(i => i.problemId).map((incident, incidentIndex) => {
      const problemIndex = problems.findIndex(p => p.id === incident.problemId)
      if (problemIndex === -1) return null
      
      const problemAngle = (problemIndex / problems.length) * 2 * Math.PI
      const problemRadius = Math.max(180, problems.length * 30)
      const problemX = centerX + Math.cos(problemAngle) * problemRadius
      const problemY = centerY + Math.sin(problemAngle) * problemRadius
      
      // Position incidents in a small circle around their problem
      const incidentsForProblem = incidents.filter(i => i.problemId === incident.problemId)
      const incidentAngleOffset = (incidentIndex / incidentsForProblem.length) * 2 * Math.PI
      const incidentDistance = 140
      const preferredX = problemX + Math.cos(incidentAngleOffset) * incidentDistance
      const preferredY = problemY + Math.sin(incidentAngleOffset) * incidentDistance
      
      const position = findNonOverlappingPosition(preferredX - 65, preferredY - 35, 130, 70)
      
      return {
        id: String(incident.id),
        position,
        data: { 
          id: incident.incident_number || `INC-${incident.id.substring(0, 8)}`,
          title: incident.title.substring(0, 28) + (incident.title.length > 28 ? '...' : ''),
          label: `${incident.incident_number || `INC-${incident.id.substring(0, 8)}`}\n${incident.title.substring(0, 28)}${incident.title.length > 28 ? '...' : ''}` 
        },
        style: { 
          background: '#fed7aa', 
          border: '2px solid #fdba74', 
          color: '#ea580c', 
          borderRadius: '8px', 
          padding: '10px', 
          minWidth: '130px',
          minHeight: '70px',
          fontSize: '10px',
          fontWeight: '700',
          textAlign: 'center',
          whiteSpace: 'pre-line',
          lineHeight: '1.3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }
    }).filter(Boolean),
    // Standalone incidents (with changes but no problemId) positioned independently
    ...incidents.filter(i => !i.problemId && changes.some(c => c.incidentId === i.id)).map((incident, incidentIndex) => {
      // Position standalone incidents in a separate area
      const standaloneIncidents = incidents.filter(i => !i.problemId && changes.some(c => c.incidentId === i.id))
      const standaloneRadius = Math.max(300, incidents.length * 40)
      const standaloneAngle = standaloneIncidents.length > 0 ? (incidentIndex / standaloneIncidents.length) * 2 * Math.PI : 0
      const preferredX = centerX + Math.cos(standaloneAngle) * standaloneRadius
      const preferredY = centerY + Math.sin(standaloneAngle) * standaloneRadius
      
      const safeX = isNaN(preferredX) ? centerX + 200 : preferredX
      const safeY = isNaN(preferredY) ? centerY + 200 : preferredY
      const position = findNonOverlappingPosition(safeX - 65, safeY - 35, 130, 70)
      
      return {
        id: String(incident.id),
        position,
        data: { 
          id: incident.incident_number || `INC-${incident.id.substring(0, 8)}`,
          title: incident.title.substring(0, 28) + (incident.title.length > 28 ? '...' : ''),
          label: `${incident.incident_number || `INC-${incident.id.substring(0, 8)}`}\n${incident.title.substring(0, 28)}${incident.title.length > 28 ? '...' : ''}` 
        },
        style: { 
          background: '#fed7aa', 
          border: '2px solid #fdba74', 
          color: '#ea580c', 
          borderRadius: '8px', 
          padding: '10px', 
          minWidth: '130px',
          minHeight: '70px',
          fontSize: '10px',
          fontWeight: '700',
          textAlign: 'center',
          whiteSpace: 'pre-line',
          lineHeight: '1.3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }
    }).filter(Boolean),
    // Changes positioned around their problems with collision avoidance
    ...changes.filter(c => c.problemId).map((change, changeIndex) => {
      const problemIndex = problems.findIndex(p => p.id === change.problemId)
      if (problemIndex === -1) return null
      
      const problemAngle = (problemIndex / problems.length) * 2 * Math.PI
      const problemRadius = Math.max(180, problems.length * 30)
      const problemX = centerX + Math.cos(problemAngle) * problemRadius
      const problemY = centerY + Math.sin(problemAngle) * problemRadius
      
      // Position changes in a small circle around their problem, offset from incidents
      const changesForProblem = changes.filter(c => c.problemId === change.problemId)
      const changeAngleOffset = (changeIndex / changesForProblem.length) * 2 * Math.PI + Math.PI
      const changeDistance = 120
      const preferredX = problemX + Math.cos(changeAngleOffset) * changeDistance
      const preferredY = problemY + Math.sin(changeAngleOffset) * changeDistance
      
      const position = findNonOverlappingPosition(preferredX - 60, preferredY - 30, 120, 60)
      
      return {
        id: String(change.id),
        position,
        data: { 
          id: change.change_number || `CHG-${change.id.substring(0, 8)}`,
          title: change.title.substring(0, 25) + (change.title.length > 25 ? '...' : ''),
          label: `${change.change_number || `CHG-${change.id.substring(0, 8)}`}\n${change.title.substring(0, 25)}${change.title.length > 25 ? '...' : ''}` 
        },
        style: { 
          background: '#e9d5ff', 
          border: '2px solid #c084fc', 
          color: '#7c3aed', 
          borderRadius: '8px', 
          padding: '8px', 
          minWidth: '120px',
          minHeight: '60px',
          fontSize: '9px',
          fontWeight: '700',
          textAlign: 'center',
          whiteSpace: 'pre-line',
          lineHeight: '1.3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }
    }).filter(Boolean),
    // Changes positioned around their incidents
    ...changes.filter(c => c.incidentId && !c.problemId).map((change, changeIndex) => {
      const incidentIndex = incidents.findIndex(i => i.id === change.incidentId)
      if (incidentIndex === -1) return null
      
      // Position changes around their linked incident
      const standaloneIncidents = incidents.filter(i => !i.problemId && changes.some(c => c.incidentId === i.id))
      const standaloneRadius = Math.max(300, incidents.length * 40)
      const standaloneIncidentIndex = standaloneIncidents.findIndex(i => i.id === change.incidentId)
      const incidentAngle = standaloneIncidents.length > 0 ? (standaloneIncidentIndex / standaloneIncidents.length) * 2 * Math.PI : 0
      const incidentX = centerX + Math.cos(incidentAngle) * standaloneRadius
      const incidentY = centerY + Math.sin(incidentAngle) * standaloneRadius
      
      // Position changes around the incident
      const changesForIncident = changes.filter(c => c.incidentId === change.incidentId)
      const changeAngleOffset = changesForIncident.length > 0 ? (changeIndex / changesForIncident.length) * 2 * Math.PI : 0
      const changeDistance = 100
      const preferredX = incidentX + Math.cos(changeAngleOffset) * changeDistance
      const preferredY = incidentY + Math.sin(changeAngleOffset) * changeDistance
      
      const safeX = isNaN(preferredX) ? centerX - 100 : preferredX
      const safeY = isNaN(preferredY) ? centerY - 100 : preferredY
      const position = findNonOverlappingPosition(safeX - 60, safeY - 30, 120, 60)
      
      return {
        id: String(change.id),
        position,
        data: { 
          id: `CHG-${change.id.substring(0, 8)}`,
          title: change.title.substring(0, 25) + (change.title.length > 25 ? '...' : ''),
          label: `CHG-${change.id.substring(0, 8)}\n${change.title.substring(0, 25)}${change.title.length > 25 ? '...' : ''}` 
        },
        style: { 
          background: '#e9d5ff', 
          border: '2px solid #c084fc', 
          color: '#7c3aed', 
          borderRadius: '8px', 
          padding: '8px', 
          minWidth: '120px',
          minHeight: '60px',
          fontSize: '9px',
          fontWeight: '700',
          textAlign: 'center',
          whiteSpace: 'pre-line',
          lineHeight: '1.3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }
    }).filter(Boolean)
  ]

  // Create styled edges
  const initialEdges = [
    // Incident -> Problem edges
    ...incidents.filter(i => i.problemId).map(incident => ({
      id: `i${incident.id}`,
      source: String(incident.id),
      target: String(incident.problemId),
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#f97316', strokeWidth: 2 },
      animated: true
    })),
    // Problem -> Change edges  
    ...changes.filter(c => c.problemId).map(change => ({
      id: `c${change.id}`,
      source: String(change.problemId),
      target: String(change.id),
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#7c3aed', strokeWidth: 2 },
      animated: true
    })),
    // Incident -> Change edges (for changes linked directly to incidents)
    ...changes.filter(c => c.incidentId && !c.problemId).map(change => ({
      id: `ic${change.id}`,
      source: String(change.incidentId),
      target: String(change.id),
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: '#7c3aed', strokeWidth: 2 },
      animated: true
    }))
  ]

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{problems.length}</div>
            <div className="text-sm text-gray-600">Total Problems</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {incidents.filter(i => i.problemId || changes.some(c => c.incidentId === i.id)).length}
            </div>
            <div className="text-sm text-gray-600">Related Incidents</div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">
              {changes.filter(c => c.problemId || c.incidentId).length}
            </div>
            <div className="text-sm text-gray-600">Related Changes</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Problems Relationship Map</h2>
          <p className="text-sm text-gray-600">Interactive ITIL process flow visualization</p>
        </div>
        <Button variant="outline" size="sm" onClick={clearSelection}>
          Clear Selection
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main relationship map */}
        <div className="lg:col-span-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="relative bg-gray-50 rounded-lg overflow-hidden" style={{ height: '700px' }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={handleNodeClick}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                >
                  <Controls />
                  <Background color="#e5e7eb" />
                </ReactFlow>

                {/* Legend */}
                <div className="absolute top-4 right-4 bg-white border rounded-lg p-3 z-10">
                  <div className="text-sm font-medium text-gray-900 mb-2">Legend</div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="w-3 h-3 bg-red-200 border border-red-300 rounded"></div>
                      <span>Problems</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="w-3 h-3 bg-orange-200 border border-orange-300 rounded"></div>
                      <span>Incidents</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <div className="w-3 h-3 bg-purple-200 border border-purple-300 rounded"></div>
                      <span>Changes</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Click nodes for details • Drag to reorganize
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details panel */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedNode ? 'Node Details' : 'Node Information'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      {selectedNode.type === 'problem' && <AlertCircle className="w-4 h-4 text-red-600" />}
                      {selectedNode.type === 'incident' && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                      {selectedNode.type === 'change' && <Wrench className="w-4 h-4 text-purple-600" />}
                      <span className="font-medium capitalize">{selectedNode.type}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{selectedNode.title}</h3>
                  </div>

                  {selectedNode.priority && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Priority:</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {selectedNode.priority}
                      </Badge>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {selectedNode.status}
                    </Badge>
                  </div>

                  {selectedNode.assignedToName && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Assigned:</span>
                      <div className="text-sm text-gray-600 mt-1">{selectedNode.assignedToName}</div>
                    </div>
                  )}

                  <div className="pt-2">
                    <Link 
                      href={selectedNode.type === 'incident' 
                        ? `/incidents/${selectedNode.id}` 
                        : selectedNode.type === 'change'
                        ? `/changes/${selectedNode.id}`
                        : `/problems/${selectedNode.id}`
                      }
                    >
                      <Button size="sm" className="w-full">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click on a node to see details and explore relationships
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}