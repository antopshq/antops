'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { 
  Server, 
  Database, 
  Network, 
  Cloud, 
  HardDrive,
  Layers,
  Globe,
  Shield,
  Cpu,
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react'

interface NodeData {
  label: string
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  nodeType: 'server' | 'database' | 'loadbalancer' | 'network' | 'cluster' | 'storage' | 'cdn' | 'firewall' | 'compute' | 'monitoring'
  metrics?: {
    cpu?: number
    memory?: number
    disk?: number
    network?: number
  }
  incidents?: string[]
  problems?: string[]
  changes?: string[]
}

const nodeTypeIcons = {
  server: Server,
  database: Database,
  loadbalancer: Network,
  network: Globe,
  cluster: Layers,
  storage: HardDrive,
  cdn: Cloud,
  firewall: Shield,
  compute: Cpu,
  monitoring: Monitor
}

const nodeTypeColors = {
  server: 'from-blue-500 to-blue-600',
  database: 'from-green-500 to-green-600',
  loadbalancer: 'from-purple-500 to-purple-600',
  network: 'from-orange-500 to-orange-600',
  cluster: 'from-indigo-500 to-indigo-600',
  storage: 'from-yellow-500 to-yellow-600',
  cdn: 'from-cyan-500 to-cyan-600',
  firewall: 'from-red-500 to-red-600',
  compute: 'from-pink-500 to-pink-600',
  monitoring: 'from-teal-500 to-teal-600'
}

const statusColors = {
  healthy: {
    border: 'border-green-500',
    bg: 'bg-green-50',
    text: 'text-green-700',
    icon: CheckCircle,
    iconColor: 'text-green-500'
  },
  warning: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    icon: AlertTriangle,
    iconColor: 'text-yellow-500'
  },
  critical: {
    border: 'border-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: XCircle,
    iconColor: 'text-red-500'
  },
  unknown: {
    border: 'border-gray-300',
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    icon: HelpCircle,
    iconColor: 'text-gray-400'
  }
}

export const InfrastructureNode = memo(({ data, selected }: any) => {
  const IconComponent = nodeTypeIcons[data.nodeType as keyof typeof nodeTypeIcons] || Server
  const statusConfig = statusColors[data.status as keyof typeof statusColors]
  const StatusIcon = statusConfig.icon
  const colorClass = nodeTypeColors[data.nodeType as keyof typeof nodeTypeColors] || nodeTypeColors.server

  const totalIssues = (data.incidents?.length || 0) + (data.problems?.length || 0) + (data.changes?.length || 0)

  return (
    <div className={`relative min-w-[180px] bg-white rounded-lg border-2 ${statusConfig.border} shadow-lg hover:shadow-xl transition-all duration-200 ${selected ? 'ring-2 ring-blue-400' : ''}`}>
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
      />

      {/* Status indicator */}
      <div className={`absolute -top-2 -right-2 w-6 h-6 ${statusConfig.bg} rounded-full border-2 border-white flex items-center justify-center shadow-sm`}>
        <StatusIcon className={`w-3 h-3 ${statusConfig.iconColor}`} />
      </div>

      {/* Issues badge */}
      {totalIssues > 0 && (
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
          {totalIssues > 99 ? '99+' : totalIssues}
        </div>
      )}

      {/* Node Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-3">
          <div className={`w-10 h-10 bg-gradient-to-r ${colorClass} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <IconComponent className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {data.label}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {data.nodeType}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className={`px-2 py-1 ${statusConfig.bg} ${statusConfig.text} rounded-md text-xs font-medium flex items-center space-x-1 mb-3`}>
          <StatusIcon className={`w-3 h-3 ${statusConfig.iconColor}`} />
          <span className="capitalize">{data.status}</span>
        </div>

        {/* Metrics (if available) */}
        {data.metrics && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {data.metrics.cpu !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-500">CPU:</span>
                <span className={`font-medium ${
                  data.metrics.cpu > 80 ? 'text-red-600' : 
                  data.metrics.cpu > 60 ? 'text-yellow-600' : 
                  'text-green-600'
                }`}>
                  {data.metrics.cpu}%
                </span>
              </div>
            )}
            {data.metrics.memory !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-500">RAM:</span>
                <span className={`font-medium ${
                  data.metrics.memory > 80 ? 'text-red-600' : 
                  data.metrics.memory > 60 ? 'text-yellow-600' : 
                  'text-green-600'
                }`}>
                  {data.metrics.memory}%
                </span>
              </div>
            )}
            {data.metrics.disk !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-500">Disk:</span>
                <span className={`font-medium ${
                  data.metrics.disk > 80 ? 'text-red-600' : 
                  data.metrics.disk > 60 ? 'text-yellow-600' : 
                  'text-green-600'
                }`}>
                  {data.metrics.disk}%
                </span>
              </div>
            )}
            {data.metrics.network !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-500">Net:</span>
                <span className="text-gray-700 font-medium">
                  {data.metrics.network}MB/s
                </span>
              </div>
            )}
          </div>
        )}

        {/* Issues summary */}
        {totalIssues > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="flex justify-between text-xs">
              {(data.incidents?.length || 0) > 0 && (
                <span className="text-red-600">
                  {data.incidents?.length} incidents
                </span>
              )}
              {(data.problems?.length || 0) > 0 && (
                <span className="text-orange-600">
                  {data.problems?.length} problems
                </span>
              )}
              {(data.changes?.length || 0) > 0 && (
                <span className="text-blue-600">
                  {data.changes?.length} changes
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})