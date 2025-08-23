'use client'

import { useState, useCallback, useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'
import {
  Server,
  Database,
  HardDrive,
  Network,
  Shield,
  Cloud,
  Globe,
  Container,
  Wifi,
  MonitorSpeaker,
  Brain,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react'
import { useAIInsights } from '@/hooks/useAIInsights'
import { AIInsightsOverlay } from '@/components/ai/AIInsightsOverlay'

export interface EnhancedNodeData {
  label: string
  type: string
  customTitle?: string
  linkedCount?: number
  isLocked?: boolean
  environment?: string
  status?: 'running' | 'stopped' | 'warning' | 'error'
  // AI enhancement options
  aiEnabled?: boolean
  showAIInsights?: boolean
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive'
}

interface EnhancedInfrastructureNodeProps {
  id: string
  data: EnhancedNodeData
  selected?: boolean
  onNodeClick?: (nodeId: string) => void
  onAIAnalyze?: (nodeId: string, insights: any) => void
}

export function EnhancedInfrastructureNode({ 
  id, 
  data, 
  selected = false,
  onNodeClick,
  onAIAnalyze
}: EnhancedInfrastructureNodeProps) {
  const [showDetailedInsights, setShowDetailedInsights] = useState(false)
  
  // AI Insights integration
  const { 
    insights, 
    loading: aiLoading, 
    error: aiError,
    refetch: refetchInsights,
    isStale 
  } = useAIInsights(
    data.aiEnabled ? id : null,
    {
      enabled: data.aiEnabled && data.showAIInsights,
      analysisDepth: data.analysisDepth || 'basic',
      includeFailurePaths: data.analysisDepth === 'comprehensive',
      includeDependencyAnalysis: true
    }
  )

  const getIcon = () => {
    switch (data.type) {
      case 'server': return <Server className="w-4 h-4" />
      case 'database': return <Database className="w-4 h-4" />
      case 'storage': return <HardDrive className="w-4 h-4" />
      case 'network': return <Network className="w-4 h-4" />
      case 'security': return <Shield className="w-4 h-4" />
      case 'cloud': return <Cloud className="w-4 h-4" />
      case 'api': return <Globe className="w-4 h-4" />
      case 'container': return <Container className="w-4 h-4" />
      case 'wifi': return <Wifi className="w-4 h-4" />
      case 'monitoring': return <MonitorSpeaker className="w-4 h-4" />
      default: return <Server className="w-4 h-4" />
    }
  }

  const getStatusColor = () => {
    if (insights?.riskCategory === 'critical') return 'border-red-500 bg-red-50'
    if (insights?.riskCategory === 'high') return 'border-orange-500 bg-orange-50'
    if (insights?.riskCategory === 'medium') return 'border-yellow-500 bg-yellow-50'
    
    switch (data.status) {
      case 'error': return 'border-red-500 bg-red-50'
      case 'warning': return 'border-orange-500 bg-orange-50'  
      case 'stopped': return 'border-gray-400 bg-gray-50'
      case 'running': return 'border-green-500 bg-green-50'
      default: return 'border-blue-500 bg-blue-50'
    }
  }

  const getAIRiskClass = useMemo(() => {
    if (!insights) return ''
    
    switch (insights.riskCategory) {
      case 'critical': return 'ai-risk-critical'
      case 'high': return 'ai-risk-high'
      case 'medium': return 'ai-risk-medium'
      case 'low': return 'ai-risk-low'
      default: return ''
    }
  }, [insights])

  const handleNodeClick = useCallback(() => {
    onNodeClick?.(id)
  }, [id, onNodeClick])

  const handleAIAnalyze = useCallback(() => {
    if (insights) {
      onAIAnalyze?.(id, insights)
    }
    setShowDetailedInsights(!showDetailedInsights)
  }, [id, insights, onAIAnalyze, showDetailedInsights])

  const handleContextMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'ai-analyze':
        handleAIAnalyze()
        break
      case 'ai-refresh':
        refetchInsights()
        break
      case 'view-details':
        handleNodeClick()
        break
    }
  }, [handleAIAnalyze, refetchInsights, handleNodeClick])

  const nodeClassName = `
    relative group cursor-pointer transition-all duration-200 ease-in-out
    ${getStatusColor()}
    ${getAIRiskClass}
    ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
    ${data.isLocked ? 'cursor-not-allowed opacity-75' : ''}
    rounded-lg border-2 p-3 min-w-[120px] hover:shadow-lg
    ${insights?.riskCategory === 'critical' ? 'animate-pulse' : ''}
  `.trim()

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div className={nodeClassName} onClick={handleNodeClick}>
          {/* Handles for React Flow connections */}
          <Handle
            type="target"
            position={Position.Top}
            className="w-2 h-2 !bg-blue-400 !border-blue-600"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-2 h-2 !bg-blue-400 !border-blue-600"
          />
          <Handle
            type="target"
            position={Position.Left}
            className="w-2 h-2 !bg-blue-400 !border-blue-600"
          />
          <Handle
            type="source"
            position={Position.Right}
            className="w-2 h-2 !bg-blue-400 !border-blue-600"
          />

          {/* Main node content */}
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-2">
              {getIcon()}
              <span className="text-sm font-medium text-gray-800">
                {data.customTitle || data.label}
              </span>
            </div>

            {/* Status and badges */}
            <div className="flex items-center space-x-1">
              {data.status && (
                <Badge variant="outline" className="text-xs">
                  {data.status}
                </Badge>
              )}
              
              {data.linkedCount && data.linkedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {data.linkedCount} linked
                </Badge>
              )}

              {data.environment && (
                <Badge variant="outline" className="text-xs">
                  {data.environment}
                </Badge>
              )}
            </div>
          </div>

          {/* AI Insights Overlay */}
          {data.aiEnabled && insights && (
            <AIInsightsOverlay
              insights={insights}
              showDetailed={showDetailedInsights}
              onAnalyzeClick={handleAIAnalyze}
              className="z-10"
            />
          )}

          {/* AI Loading indicator */}
          {data.aiEnabled && aiLoading && (
            <div className="absolute top-1 right-1">
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600">
                <RefreshCw className="w-3 h-3 animate-spin" />
              </Badge>
            </div>
          )}

          {/* AI Error indicator */}
          {data.aiEnabled && aiError && (
            <div className="absolute top-1 right-1">
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600">
                <AlertTriangle className="w-3 h-3" />
              </Badge>
            </div>
          )}

          {/* Stale data indicator */}
          {data.aiEnabled && insights && isStale && (
            <div className="absolute top-1 left-1">
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-600">
                <AlertTriangle className="w-3 h-3" />
              </Badge>
            </div>
          )}

          {/* Lock indicator */}
          {data.isLocked && (
            <div className="absolute bottom-1 left-1">
              <Badge variant="outline" className="text-xs">
                🔒
              </Badge>
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={() => handleContextMenuAction('view-details')}>
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </ContextMenuItem>
        
        {data.aiEnabled && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => handleContextMenuAction('ai-analyze')}>
              <Brain className="w-4 h-4 mr-2" />
              AI Analysis
            </ContextMenuItem>
            
            {insights && (
              <ContextMenuItem onClick={() => handleContextMenuAction('ai-refresh')}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Insights
              </ContextMenuItem>
            )}
            
            {insights?.riskCategory && insights.riskCategory !== 'low' && (
              <ContextMenuItem className="text-orange-600">
                <TrendingUp className="w-4 h-4 mr-2" />
                Risk: {insights.riskCategory.toUpperCase()}
              </ContextMenuItem>
            )}
          </>
        )}
        
        <ContextMenuSeparator />
        <ContextMenuItem>
          <Settings className="w-4 h-4 mr-2" />
          Configure
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

// CSS classes for AI risk visualization (add to your global CSS)
export const aiRiskStyles = `
.ai-risk-critical {
  animation: pulse-red 2s infinite;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
}

.ai-risk-high {
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.2);
}

.ai-risk-medium {
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

.ai-risk-low {
  box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.2);
}

@keyframes pulse-red {
  0%, 100% {
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.2);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.1);
  }
}
`