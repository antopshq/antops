import { useState, useCallback, useMemo } from 'react'
import { Node, Edge, useNodesState, useEdgesState } from 'reactflow'
import { AIInsight } from '@/hooks/useAIInsights'

export interface AIEnhancedInfrastructureOptions {
  enableAI?: boolean
  autoAnalyze?: boolean
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive'
  showRiskOverlays?: boolean
  highlightFailurePaths?: boolean
}

export interface EnhancedNode extends Node {
  data: {
    aiEnabled?: boolean
    showAIInsights?: boolean
    analysisDepth?: 'basic' | 'detailed' | 'comprehensive'
    [key: string]: any
  }
}

export function useAIEnhancedInfrastructure(
  initialNodes: Node[],
  initialEdges: Edge[],
  options: AIEnhancedInfrastructureOptions = {}
) {
  const {
    enableAI = true,
    autoAnalyze = true,
    analysisDepth = 'basic',
    showRiskOverlays = true,
    highlightFailurePaths = false
  } = options

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [aiInsights, setAIInsights] = useState<Map<string, AIInsight>>(new Map())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [failurePaths, setFailurePaths] = useState<Edge[]>([])

  // Enhance nodes with AI capabilities
  const enhancedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        aiEnabled: enableAI,
        showAIInsights: showRiskOverlays,
        analysisDepth: analysisDepth
      },
      type: 'enhanced-infrastructure' // Use our enhanced node type
    })) as EnhancedNode[]
  }, [nodes, enableAI, showRiskOverlays, analysisDepth])

  // Enhance edges with AI risk visualization
  const enhancedEdges = useMemo(() => {
    if (!highlightFailurePaths || failurePaths.length === 0) {
      return edges
    }

    return edges.map(edge => {
      const isFailurePath = failurePaths.some(fp => fp.id === edge.id)
      
      if (isFailurePath) {
        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: '#ef4444',
            strokeWidth: 3,
            strokeDasharray: '5,5'
          },
          animated: true,
          label: 'Risk Path'
        }
      }

      return edge
    })
  }, [edges, highlightFailurePaths, failurePaths])

  // Update AI insights for a node
  const updateNodeInsights = useCallback((nodeId: string, insights: AIInsight) => {
    setAIInsights(prev => new Map(prev).set(nodeId, insights))
    
    // Update node styling based on risk
    setNodes(nodes => 
      nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            className: `${node.className || ''} ai-risk-${insights.riskCategory}`
          }
        }
        return node
      })
    )

    // Update failure paths if needed
    if (insights.predictedFailures.length > 0 && highlightFailurePaths) {
      updateFailurePaths(nodeId, insights)
    }
  }, [setNodes, highlightFailurePaths])

  // Update failure prediction paths
  const updateFailurePaths = useCallback((nodeId: string, insights: AIInsight) => {
    const newFailurePaths: Edge[] = []
    
    // Find edges connected to high-risk components
    insights.dependencies.forEach(dep => {
      const connectedEdge = edges.find(edge => 
        (edge.source === nodeId && edge.target === dep.componentId) ||
        (edge.target === nodeId && edge.source === dep.componentId)
      )
      
      if (connectedEdge && dep.impactScore > 50) {
        newFailurePaths.push({
          ...connectedEdge,
          id: `failure-${connectedEdge.id}`,
        })
      }
    })

    setFailurePaths(prev => {
      // Remove existing failure paths for this node
      const filtered = prev.filter(fp => 
        !fp.source?.includes(nodeId) && !fp.target?.includes(nodeId)
      )
      return [...filtered, ...newFailurePaths]
    })
  }, [edges])

  // Get AI insights for a specific node
  const getNodeInsights = useCallback((nodeId: string): AIInsight | null => {
    return aiInsights.get(nodeId) || null
  }, [aiInsights])

  // Get nodes by risk category
  const getNodesByRisk = useCallback((riskCategory: string): EnhancedNode[] => {
    return enhancedNodes.filter(node => {
      const insights = aiInsights.get(node.id)
      return insights?.riskCategory === riskCategory
    })
  }, [enhancedNodes, aiInsights])

  // Get overall infrastructure risk score
  const getOverallRiskScore = useCallback((): number => {
    if (aiInsights.size === 0) return 0
    
    const totalScore = Array.from(aiInsights.values())
      .reduce((sum, insight) => sum + insight.riskScore, 0)
    
    return Math.round(totalScore / aiInsights.size)
  }, [aiInsights])

  // Highlight nodes based on AI analysis
  const highlightRiskNodes = useCallback((show: boolean) => {
    setNodes(nodes => 
      nodes.map(node => {
        const insights = aiInsights.get(node.id)
        
        if (!insights || !show) {
          return {
            ...node,
            style: {
              ...node.style,
              boxShadow: undefined
            }
          }
        }

        const shadowColor = {
          critical: 'rgba(239, 68, 68, 0.5)',
          high: 'rgba(249, 115, 22, 0.4)',
          medium: 'rgba(245, 158, 11, 0.3)',
          low: 'rgba(34, 197, 94, 0.2)'
        }[insights.riskCategory] || 'rgba(156, 163, 175, 0.2)'

        return {
          ...node,
          style: {
            ...node.style,
            boxShadow: `0 0 0 ${insights.riskCategory === 'critical' ? '4px' : '2px'} ${shadowColor}`
          }
        }
      })
    )
  }, [setNodes, aiInsights])

  // Handle node selection with AI context
  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
    
    // Auto-analyze if enabled
    if (autoAnalyze && enableAI) {
      // Trigger AI analysis for selected node
      // This would typically trigger the useAIInsights hook
    }
  }, [autoAnalyze, enableAI])

  // Bulk analyze all nodes
  const analyzeAllNodes = useCallback(async () => {
    const promises = enhancedNodes.map(async (node) => {
      try {
        const response = await fetch('/api/ai/component-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            componentId: node.id,
            analysisDepth,
            includeFailurePaths: highlightFailurePaths,
            includeDependencyAnalysis: true
          })
        })
        
        const data = await response.json()
        if (data.status === 'success') {
          updateNodeInsights(node.id, data.insights)
        }
      } catch (error) {
        console.error(`Failed to analyze node ${node.id}:`, error)
      }
    })

    await Promise.all(promises)
  }, [enhancedNodes, analysisDepth, highlightFailurePaths, updateNodeInsights])

  return {
    // Enhanced React Flow data
    nodes: enhancedNodes,
    edges: enhancedEdges,
    onNodesChange,
    onEdgesChange,
    
    // AI-specific functions
    updateNodeInsights,
    getNodeInsights,
    getNodesByRisk,
    getOverallRiskScore,
    highlightRiskNodes,
    handleNodeSelect,
    analyzeAllNodes,
    
    // State
    aiInsights,
    selectedNodeId,
    failurePaths,
    
    // Setters for external control
    setNodes,
    setEdges
  }
}