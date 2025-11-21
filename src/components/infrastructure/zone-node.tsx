'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow'
import { 
  Network, 
  Shield, 
  Server, 
  Cloud, 
  Globe, 
  Layers,
  Building,
  Wifi,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react'

interface ZoneNodeData {
  name: string
  zoneType: string
  description?: string
  isCollapsed?: boolean
  isLocked?: boolean
  nodeCount?: number
  zoneConfig?: Record<string, any>
  styleConfig?: Record<string, any>
  isHovered?: boolean
  parentZoneName?: string
  onToggleCollapse?: (id: string) => void
  onToggleLock?: (id: string) => void
  onDoubleClick?: (id: string) => void
  onDelete?: (id: string) => void
}

// Zone type icons mapping
const getZoneIcon = (zoneType: string) => {
  switch (zoneType) {
    case 'vpc':
    case 'subnet':
      return <Cloud className="w-4 h-4" />
    case 'lan':
    case 'wan':
    case 'vlan':
      return <Wifi className="w-4 h-4" />
    case 'security_group':
    case 'network_acl':
    case 'security_zone':
    case 'trust_zone':
    case 'untrust_zone':
    case 'dmz':
      return <Shield className="w-4 h-4" />
    case 'datacenter':
    case 'region':
    case 'availability_zone':
      return <Building className="w-4 h-4" />
    case 'cluster':
    case 'namespace':
    case 'resource_group':
      return <Layers className="w-4 h-4" />
    case 'application':
    case 'service_mesh':
    case 'microservice':
    case 'environment_tier':
      return <Server className="w-4 h-4" />
    default:
      return <Network className="w-4 h-4" />
  }
}

// Zone type colors
const getZoneColors = (zoneType: string) => {
  switch (zoneType) {
    case 'vpc':
      return {
        border: 'border-blue-500',
        background: 'bg-blue-50',
        text: 'text-blue-700',
        headerBg: 'bg-blue-100'
      }
    case 'subnet':
      return {
        border: 'border-blue-400',
        background: 'bg-blue-25',
        text: 'text-blue-600',
        headerBg: 'bg-blue-75'
      }
    case 'lan':
    case 'wan':
    case 'vlan':
      return {
        border: 'border-green-500',
        background: 'bg-green-50',
        text: 'text-green-700',
        headerBg: 'bg-green-100'
      }
    case 'security_group':
    case 'network_acl':
    case 'security_zone':
    case 'trust_zone':
    case 'untrust_zone':
    case 'dmz':
      return {
        border: 'border-red-500',
        background: 'bg-red-50',
        text: 'text-red-700',
        headerBg: 'bg-red-100'
      }
    case 'datacenter':
    case 'region':
    case 'availability_zone':
      return {
        border: 'border-purple-500',
        background: 'bg-purple-50',
        text: 'text-purple-700',
        headerBg: 'bg-purple-100'
      }
    case 'cluster':
    case 'namespace':
    case 'resource_group':
      return {
        border: 'border-indigo-500',
        background: 'bg-indigo-50',
        text: 'text-indigo-700',
        headerBg: 'bg-indigo-100'
      }
    case 'application':
    case 'service_mesh':
    case 'microservice':
    case 'environment_tier':
      return {
        border: 'border-orange-500',
        background: 'bg-orange-50',
        text: 'text-orange-700',
        headerBg: 'bg-orange-100'
      }
    default:
      return {
        border: 'border-gray-500',
        background: 'bg-gray-50',
        text: 'text-gray-700',
        headerBg: 'bg-gray-100'
      }
  }
}

// Format zone configuration for display
const formatZoneConfig = (zoneType: string, config: Record<string, any>) => {
  if (!config || Object.keys(config).length === 0) return null

  switch (zoneType) {
    case 'vpc':
      return config.cidr_block ? `CIDR: ${config.cidr_block}` : null
    case 'subnet':
      return config.cidr_block ? `CIDR: ${config.cidr_block}` : null
    case 'lan':
      return config.ip_range ? `Range: ${config.ip_range}` : null
    case 'vlan':
      return config.vlan_id ? `VLAN ID: ${config.vlan_id}` : null
    case 'security_group':
      return config.rules ? `${config.rules.length} rules` : null
    case 'cluster':
      return config.node_count ? `${config.node_count} nodes` : null
    default:
      return null
  }
}

export const ZoneNode = memo(({ id, data, selected }: NodeProps<ZoneNodeData>) => {
  const colors = getZoneColors(data.zoneType)
  const icon = getZoneIcon(data.zoneType)
  const configDisplay = formatZoneConfig(data.zoneType, data.zoneConfig || {})

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation()
    data.onToggleCollapse?.(id)
  }

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation()
    data.onToggleLock?.(id)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    data.onDoubleClick?.(id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    data.onDelete?.(id)
  }

  return (
    <>
      {/* Node Resizer - only show when selected */}
      {selected && (
        <NodeResizer
          color="#3b82f6"
          isVisible={selected}
          minWidth={200}
          minHeight={120}
        />
      )}
      
      <div 
        className={`
          group relative min-w-[250px] min-h-[150px] w-full h-full
          ${colors.background} ${colors.border} border-2 rounded-lg
          ${selected ? 'ring-2 ring-blue-300 ring-offset-2' : ''}
          ${data.isLocked ? 'opacity-75' : ''}
          ${data.isHovered ? 'ring-4 ring-blue-400 ring-opacity-50 animate-pulse border-blue-400' : ''}
          transition-all duration-200
        `}
        style={{
          borderStyle: data.styleConfig?.borderStyle || 'solid',
          zIndex: 1, // Lower z-index than child nodes
          ...data.styleConfig
        }}
        onDoubleClick={handleDoubleClick}
      >
      {/* Zone Header */}
      <div className={`
        ${colors.headerBg} ${colors.text} px-3 py-2 rounded-t-md
        flex items-center justify-between border-b ${colors.border}
      `}>
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {/* Collapse/Expand Button */}
          <button
            onClick={handleToggleCollapse}
            className="p-0.5 hover:bg-white/20 rounded transition-colors"
            title={data.isCollapsed ? 'Expand zone' : 'Collapse zone'}
          >
            {data.isCollapsed ? (
              <ChevronRight className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {/* Zone Icon */}
          <div className="flex-shrink-0">
            {icon}
          </div>

          {/* Zone Name and Type */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {data.name}
            </div>
            <div className="text-xs opacity-75 capitalize flex items-center gap-2">
              <span>{data.zoneType?.replace('_', ' ') || (data as any).type?.replace('_', ' ') || 'Zone'}</span>
              {data.parentZoneName && (
                <span className="text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  {data.parentZoneName}
                </span>
              )}
            </div>
          </div>

          {/* Node Count */}
          {data.nodeCount !== undefined && (
            <div className="text-xs bg-white/20 px-2 py-1 rounded">
              {data.nodeCount} nodes
            </div>
          )}
        </div>

        {/* Zone Controls */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Lock/Unlock Button */}
          <button
            onClick={handleToggleLock}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title={data.isLocked ? 'Unlock zone' : 'Lock zone'}
          >
            {data.isLocked ? (
              <Lock className="w-3 h-3" />
            ) : (
              <Unlock className="w-3 h-3" />
            )}
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-500 hover:text-white rounded transition-colors"
            title="Delete zone"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Zone Content Area (only visible when not collapsed) */}
      {!data.isCollapsed && (
        <div className="p-3 flex-1">
          {/* Zone Description */}
          {data.description && (
            <div className="text-xs text-gray-600 mb-2">
              {data.description}
            </div>
          )}

          {/* Zone Configuration Display */}
          {configDisplay && (
            <div className="text-xs font-mono bg-white/50 px-2 py-1 rounded mb-2">
              {configDisplay}
            </div>
          )}

          {/* Drop zone indicator - only show when zone is empty */}
          {(!data.nodeCount || data.nodeCount === 0) && (
            <div className="text-xs text-gray-500 text-center py-8">
              Drop components here to add them to this zone
            </div>
          )}
        </div>
      )}

      {/* Connection Handles - Groups can connect to other groups */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="w-3 h-3 !bg-blue-500 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-3 h-3 !bg-green-500 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-3 h-3 !bg-blue-500 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-3 h-3 !bg-green-500 border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity"
      />
      </div>
    </>
  )
})

ZoneNode.displayName = 'ZoneNode'