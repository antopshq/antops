'use client'

import { useCallback, useRef, useState, useEffect, useLayoutEffect } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  BackgroundVariant,
  NodeTypes,
  MarkerType,
  ReactFlowInstance
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'

import { InfrastructureNode } from './infrastructure-node'
import { Button } from '@/components/ui/button'

// Define node types
const nodeTypes: NodeTypes = {
  infrastructure: InfrastructureNode,
}

interface InfrastructureDiagramProps {
  nodes: any[]
  edges: any[]
  onNodesChange: (nodes: any[]) => void
  onEdgesChange: (edges: any[]) => void
  onNodeClick: (node: any) => void
  onNodeStatusChange: (nodeId: string, status: 'healthy' | 'warning' | 'critical' | 'unknown') => void
  onNodeDelete: (nodeId: string) => void
}

function InfrastructureDiagramInner({
  nodes: externalNodes,
  edges: externalEdges,
  onNodesChange,
  onEdgesChange,
  onNodeClick,
  onNodeStatusChange,
  onNodeDelete
}: InfrastructureDiagramProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(externalNodes)
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(externalEdges)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [showMinimap, setShowMinimap] = useState(true)

  // Use refs to store current state without creating dependencies
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  
  // Update refs whenever state changes
  useLayoutEffect(() => {
    nodesRef.current = nodes
  }, [nodes])
  
  useLayoutEffect(() => {
    edgesRef.current = edges
  }, [edges])

  // Create stable ID strings without problematic useMemo dependencies
  const externalNodeIds = externalNodes.map(n => n.id).sort().join(',')
  const externalEdgeIds = externalEdges.map(e => e.id).sort().join(',')

  // Only sync external changes when nodes/edges are structurally different (not status updates)
  useEffect(() => {
    const currentNodeIds = nodes.map(n => n.id).sort().join(',')
    
    if (currentNodeIds !== externalNodeIds) {
      setNodes(externalNodes)
    }
  }, [externalNodeIds])

  useEffect(() => {
    const currentEdgeIds = edges.map(e => e.id).sort().join(',')
    
    if (currentEdgeIds !== externalEdgeIds) {
      setEdges(externalEdges)
    }
  }, [externalEdgeIds])

  // Handle changes from React Flow - only sync structural changes back to parent
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChangeInternal(changes)
    
    // Only sync back to parent for structural changes (add/remove/move), not status updates
    const hasStructuralChanges = changes.some((change: any) => 
      change.type === 'add' || change.type === 'remove' || change.type === 'position'
    )
    
    if (hasStructuralChanges) {
      // Schedule the parent callback to run after this render cycle
      setTimeout(() => {
        onNodesChange(nodesRef.current)
      }, 0)
    }
  }, [onNodesChangeInternal, onNodesChange])

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChangeInternal(changes)
    
    // Only sync back structural changes
    const hasStructuralChanges = changes.some((change: any) => 
      change.type === 'add' || change.type === 'remove'
    )
    
    if (hasStructuralChanges) {
      setTimeout(() => {
        onEdgesChange(edgesRef.current)
      }, 0)
    }
  }, [onEdgesChangeInternal, onEdgesChange])

  const onConnect = useCallback((params: Connection) => {
    const edge = {
      ...params,
      id: `edge-${params.source}-${params.target}-${Date.now()}`,
      type: 'smoothstep',
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      data: {
        status: 'active' as const,
        bandwidth: '1Gbps',
        protocol: 'TCP'
      }
    }
    setEdges((eds) => addEdge(edge, eds))
  }, [setEdges])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const nodeType = event.dataTransfer.getData('application/reactflow')
      
      if (typeof nodeType === 'undefined' || !nodeType) {
        return
      }

      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      if (position) {
        const newNode = {
          id: `${nodeType}-${Date.now()}`,
          type: 'infrastructure',
          position,
          data: {
            label: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} ${nodes.length + 1}`,
            status: 'unknown' as const,
            nodeType: nodeType,
            incidents: [],
            problems: [],
            changes: []
          }
        }

        setNodes((nds) => nds.concat(newNode))
      }
    },
    [reactFlowInstance, nodes.length, setNodes]
  )

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    
    // Create a simple context menu
    const menu = document.createElement('div')
    menu.className = 'fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2 space-y-1'
    menu.style.left = `${event.clientX}px`
    menu.style.top = `${event.clientY}px`
    
    // Status options
    const statuses = [
      { status: 'healthy', label: 'Set Healthy', color: 'text-green-600' },
      { status: 'warning', label: 'Set Warning', color: 'text-yellow-600' },
      { status: 'critical', label: 'Set Critical', color: 'text-red-600' },
      { status: 'unknown', label: 'Set Unknown', color: 'text-gray-600' }
    ]
    
    statuses.forEach(({ status, label, color }) => {
      const button = document.createElement('button')
      button.className = `block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded ${color}`
      button.textContent = label
      button.onclick = () => {
        // Update the local React Flow node state immediately
        setNodes(currentNodes => 
          currentNodes.map(n => 
            n.id === node.id 
              ? { ...n, data: { ...n.data, status } }
              : n
          )
        )
        
        // Also notify the parent component
        onNodeStatusChange(node.id, status as any)
        document.body.removeChild(menu)
      }
      menu.appendChild(button)
    })
    
    // Delete option
    const deleteButton = document.createElement('button')
    deleteButton.className = 'block w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 rounded border-t border-gray-100 mt-1 pt-2'
    deleteButton.textContent = 'Delete'
    deleteButton.onclick = () => {
      onNodeDelete(node.id)
      document.body.removeChild(menu)
    }
    menu.appendChild(deleteButton)
    
    document.body.appendChild(menu)
    
    // Remove menu when clicking elsewhere
    const handleClickOutside = () => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu)
      }
      document.removeEventListener('click', handleClickOutside)
    }
    
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)
  }, [onNodeStatusChange, onNodeDelete, setNodes])

  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    onNodeClick(node)
  }, [onNodeClick])

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="top-right"
        className="bg-gray-50"
      >
        <Controls 
          position="top-left"
          showInteractive={false}
          className="bg-white border border-gray-200 rounded-lg shadow-sm"
        />
        
        {showGrid && (
          <Background 
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#e5e7eb"
          />
        )}
        
        {showMinimap && (
          <MiniMap 
            position="bottom-right"
            className="bg-white border border-gray-200 rounded-lg shadow-sm"
            maskColor="rgba(0, 0, 0, 0.1)"
            nodeColor={(node) => {
              const status = node.data?.status
              switch (status) {
                case 'healthy': return '#10b981'
                case 'warning': return '#f59e0b'  
                case 'critical': return '#ef4444'
                default: return '#6b7280'
              }
            }}
          />
        )}
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-gray-500">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Components Yet</h3>
            <p className="text-sm text-gray-600 max-w-sm">
              Drag components from the palette on the left or click them to add to your infrastructure diagram.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function InfrastructureDiagram(props: InfrastructureDiagramProps) {
  return (
    <ReactFlowProvider>
      <InfrastructureDiagramInner {...props} />
    </ReactFlowProvider>
  )
}