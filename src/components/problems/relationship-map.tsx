'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Wrench, AlertCircle, Users, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  MarkerType,
  useInternalNode,
  getBezierPath,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface RelationshipMapProps {
  problems: any[]
  incidents: any[]
  changes?: any[]
}

// REMOVED ALL COMPLEX FLOATING EDGE CODE - USING SIMPLE DEFAULT EDGES

// Custom rectangular node components
function ProblemNode({ data }: { data: any }) {
  const { title, problem_number, onNodeClick } = data
  
  return (
    <div
      className="cursor-pointer transition-all duration-200 hover:scale-105"
      onClick={() => onNodeClick && onNodeClick(data)}
    >
      <div className="bg-red-100 border-2 border-red-300 text-red-700 rounded-lg p-3 min-w-[120px] max-w-[150px] drop-shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <div className="text-xs text-red-600 font-medium">Problem</div>
        </div>
        <div className="text-[10px] text-gray-500 mb-1">
          {problem_number || ''}
        </div>
        <div className="text-xs font-semibold text-gray-800 leading-tight">
          {title}
        </div>
      </div>
    </div>
  )
}

function IncidentNode({ data }: { data: any }) {
  const { title, incident_number, onNodeClick } = data
  
  return (
    <div
      className="cursor-pointer transition-all duration-200 hover:scale-105"
      onClick={() => onNodeClick && onNodeClick(data)}
    >
      <div className="bg-orange-100 border-2 border-orange-300 text-orange-700 rounded-lg p-2 min-w-[100px] max-w-[130px] drop-shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <div className="text-xs text-orange-600 font-medium">Incident</div>
        </div>
        <div className="text-[9px] text-gray-500 mb-1">
          {incident_number || ''}
        </div>
        <div className="text-[10px] font-medium text-gray-800 leading-tight">
          {title}
        </div>
      </div>
    </div>
  )
}

function ChangeNode({ data }: { data: any }) {
  const { title, onNodeClick } = data
  
  return (
    <div
      className="cursor-pointer transition-all duration-200 hover:scale-105"
      onClick={() => onNodeClick && onNodeClick(data)}
    >
      <div className="bg-purple-100 border-2 border-purple-300 text-purple-700 rounded-lg p-2 min-w-[90px] max-w-[120px] drop-shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="w-3 h-3 flex-shrink-0" />
          <div className="text-xs text-purple-600 font-medium">Change</div>
        </div>
        <div className="text-[10px] font-medium text-gray-800 leading-tight">
          {title}
        </div>
      </div>
    </div>
  )
}

const nodeTypes = {
  problem: ProblemNode,
  incident: IncidentNode,
  change: ChangeNode,
}

function RelationshipMapInner({ problems, incidents, changes = [] }: RelationshipMapProps) {
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[])
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[])

  const handleNodeClick = useCallback((nodeData: any) => {
    setSelectedNode(nodeData)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedNode(null)
  }, [])

  // Create nodes and edges from real data using problem_id column
  useEffect(() => {
    
    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Add problem nodes
    problems.forEach((problem, index) => {
      newNodes.push({
        id: String(problem.id),
        type: 'problem',
        position: { x: index * 200, y: 50 },
        data: { ...problem, onNodeClick: handleNodeClick },
      })
    })

    // Add incident nodes and edges
    incidents.forEach((incident, index) => {
      // Show incidents that are linked to problems OR have changes linked to them
      const hasLinkedChanges = changes.some(change => change.incidentId === incident.id)
      
      if (incident.problemId || hasLinkedChanges) {
        newNodes.push({
          id: String(incident.id),
          type: 'incident', 
          position: { x: index * 200, y: 200 },
          data: { ...incident, onNodeClick: handleNodeClick },
        })
        
        // Create edge from incident to problem (if linked to problem)
        if (incident.problemId) {
          newEdges.push({
            id: `incident-problem-${incident.id}`,
            source: String(incident.id),
            target: String(incident.problemId),
          })
        }
      }
    })

    // Add change nodes and edges
    changes.forEach((change, index) => {
      // Show changes that are linked to either problems or incidents
      if (change.problemId || change.incidentId) {
        newNodes.push({
          id: String(change.id),
          type: 'change',
          position: { x: index * 200, y: 350 },
          data: { ...change, onNodeClick: handleNodeClick },
        })
        
        // Create edge from problem to change
        if (change.problemId) {
          newEdges.push({
            id: `problem-change-${change.id}`,
            source: String(change.problemId),
            target: String(change.id),
          })
        }
        
        // Create edge from incident to change
        if (change.incidentId) {
          newEdges.push({
            id: `incident-change-${change.id}`,
            source: String(change.incidentId),
            target: String(change.id),
          })
        }
      }
    })

    console.log(`Final counts - Nodes: ${newNodes.length}, Edges: ${newEdges.length}`)
    console.log('All floating edges:', newEdges.map(e => ({ id: e.id, source: e.source, target: e.target, type: e.type })))
    console.log('Node IDs:', newNodes.map(n => ({ id: n.id, type: n.type })))

    setNodes(newNodes)
    setEdges(newEdges)
    
    // Debug what ReactFlow actually receives
    setTimeout(() => {
      console.log('=== REACTFLOW STATE DEBUG ===')
      console.log('Current nodes in state:', nodes.map(n => ({ id: n.id, type: n.type })))
      console.log('Current edges in state:', edges.map(e => ({ id: e.id, source: e.source, target: e.target, type: e.type })))
    }, 1000)
  }, [problems, incidents, changes, setNodes, setEdges, handleNodeClick])

  console.log('RENDER: Current nodes:', nodes.length, nodes.map(n => n.id))
  console.log('RENDER: Current edges:', edges.length, edges.map(e => ({ id: e.id, source: e.source, target: e.target })))

  return (
    <div className="space-y-6">
      {/* Analysis Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          <p className="text-sm text-gray-600">Incident → Problem → Change and Incident → Change relationships</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={clearSelection}>
            Clear Selection
          </Button>
        </div>
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
                  nodeTypes={nodeTypes}
                >
                  <Background color="#e5e7eb" />
                  <Controls />
                </ReactFlow>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-white border rounded-lg p-3 z-10">
                  <div className="text-sm font-medium text-gray-900 mb-2">Legend</div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-xs">
                      <AlertCircle className="w-3 h-3 text-red-600" />
                      <span>Problems</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <AlertTriangle className="w-3 h-3 text-orange-600" />
                      <span>Incidents</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <Wrench className="w-3 h-3 text-purple-600" />
                      <span>Changes</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Drag nodes • Floating edges adjust automatically
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
                      {selectedNode.type === 'problem' && <AlertCircle className="w-4 h-4" />}
                      {selectedNode.type === 'incident' && <AlertTriangle className="w-4 h-4" />}
                      {selectedNode.type === 'change' && <Wrench className="w-4 h-4" />}
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

export function RelationshipMap(props: RelationshipMapProps) {
  return (
    <ReactFlowProvider>
      <RelationshipMapInner {...props} />
    </ReactFlowProvider>
  )
}