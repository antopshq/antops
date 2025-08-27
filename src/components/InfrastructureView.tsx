'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  NodeTypes,
  EdgeTypes,
  Handle,
  Position
} from 'reactflow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Save, RefreshCw, Plus, Database, Server, Network, Settings, FolderPlus, Cloud, Shield, HardDrive, Wifi, MonitorSpeaker, Container, Globe, X, Link, ExternalLink, AlertTriangle, Wrench, Layers, Building, Lock, Unlock, Upload, Download, Trash2, Brain } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getITILBadgeClasses, getITILIcon, getITILTextClass } from '@/lib/itil-colors'

import 'reactflow/dist/style.css'
import '../styles/reactflow-fixes.css'
import { ZoneNode } from './infrastructure/zone-node'
import { TerraformImport } from './infrastructure/terraform-import'
import { DiagramExport } from './infrastructure/diagram-export'
import { AIDashboard } from './ai/AIDashboard'

// Custom node component for infrastructure items
function InfrastructureNode({ data, selected, id }: { data: any, selected?: boolean, id: string }) {
  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'database':
        return <Database className="w-3 h-3" />
      case 'server':
        return <Server className="w-3 h-3" />
      case 'network':
        return <Network className="w-3 h-3" />
      case 'cloud':
        return <Cloud className="w-3 h-3" />
      case 'security':
        return <Shield className="w-3 h-3" />
      case 'storage':
        return <HardDrive className="w-3 h-3" />
      case 'wifi':
        return <Wifi className="w-3 h-3" />
      case 'loadbalancer':
        return <MonitorSpeaker className="w-3 h-3" />
      case 'container':
        return <Container className="w-3 h-3" />
      case 'api':
        return <Globe className="w-3 h-3" />
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded" />
    }
  }

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'database':
        return 'from-green-500 to-green-600'
      case 'server':
        return 'from-blue-500 to-blue-600'
      case 'network':
        return 'from-purple-500 to-purple-600'
      case 'cloud':
        return 'from-sky-500 to-sky-600'
      case 'security':
        return 'from-red-500 to-red-600'
      case 'storage':
        return 'from-orange-500 to-orange-600'
      case 'wifi':
        return 'from-indigo-500 to-indigo-600'
      case 'loadbalancer':
        return 'from-yellow-500 to-yellow-600'
      case 'container':
        return 'from-teal-500 to-teal-600'
      case 'api':
        return 'from-pink-500 to-pink-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.onDelete) {
      data.onDelete(id)
    }
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.onClick) {
      data.onClick(e, { id, data })
    }
  }

  const handleTitleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.onTitleEdit) {
      data.onTitleEdit(id, data.customTitle || data.label)
    }
  }

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.onToggleLock) {
      data.onToggleLock(id)
    }
  }

  return (
    <div 
      className={`
        min-w-[100px] bg-white rounded-md border-2 shadow-md hover:shadow-lg transition-all duration-200 relative group cursor-pointer
        ${selected ? 'border-blue-500 ring-2 ring-blue-200' : data.isInZone ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'}
      `}
      style={{
        zIndex: data.isInZone ? 90 : 80 // Node z-index below edges (100)
      }}
      onClick={handleClick}
    >
      {/* Connection Handles - All sides can be both source and target */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="w-2 h-2 !bg-blue-500 border border-white"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="w-2 h-2 !bg-green-500 border border-white"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="w-2 h-2 !bg-blue-500 border border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="w-2 h-2 !bg-green-500 border border-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="w-2 h-2 !bg-blue-500 border border-white"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="w-2 h-2 !bg-green-500 border border-white"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="w-2 h-2 !bg-blue-500 border border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="w-2 h-2 !bg-green-500 border border-white"
      />

      {/* Lock Button */}
      <button
        onClick={handleToggleLock}
        className="absolute -top-1 -right-8 w-5 h-5 bg-gray-500 hover:bg-gray-600 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-200 opacity-0 group-hover:opacity-100 hover:opacity-100"
        style={{ 
          opacity: selected ? 1 : undefined,
          backgroundColor: data.isLocked ? '#f59e0b' : undefined
        }}
        title={data.isLocked ? 'Unlock (prevents dragging)' : 'Lock (prevents dragging)'}
      >
        {data.isLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
      </button>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-200 opacity-0 group-hover:opacity-100 hover:opacity-100"
        style={{ opacity: selected ? 1 : undefined }}
      >
        <X className="w-2.5 h-2.5" />
      </button>

      <div className="p-2">
        <div className="flex items-center space-x-1.5 mb-1.5">
          <div className={`w-6 h-6 bg-gradient-to-r ${getNodeColor(data.type)} rounded-md flex items-center justify-center text-white`}>
            {getNodeIcon(data.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div 
              className="font-medium text-gray-900 text-xs truncate hover:bg-gray-50 px-1 py-0.5 rounded cursor-text"
              onClick={handleTitleEdit}
              title="Click to edit title"
            >
              {data.customTitle || data.label}
            </div>
            <p className="text-[10px] text-gray-500 capitalize px-1">
              {data.type}
            </p>
            
            {/* Indicators Row */}
            {(data.linkedCount > 0 || data.isInZone) && (
              <div className="flex items-center gap-1.5 mt-0.5 px-1">
                {/* Linked Items Indicator */}
                {data.linkedCount > 0 && (
                  <div className="flex items-center gap-0.5 text-[10px]">
                    <Link className="w-2.5 h-2.5 text-blue-500" />
                    <span className="text-blue-600 font-medium">{data.linkedCount}</span>
                  </div>
                )}
                {/* Zone Indicator */}
                {data.isInZone && (
                  <div className="flex items-center gap-0.5 text-[10px]" title={`Component is in zone: ${data.parentZoneName || 'Unknown Zone'}`}>
                    <Layers className="w-2.5 h-2.5 text-indigo-500" />
                    <span className="text-indigo-600 font-medium text-[9px]">{data.parentZoneName || 'ZONE'}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Node types configuration
const nodeTypes: NodeTypes = {
  infrastructure: InfrastructureNode,
  zone: ZoneNode,
}

// Component Details Form
function ComponentDetailsForm({ 
  node, 
  onClose, 
  onUpdateTitle,
  isEditing,
  editingTitle,
  setEditingTitle,
  onSaveTitle,
  onCancelEdit,
  onStartEdit,
  onLinkedItemsChange,
  router
}: { 
  node?: any
  onClose: () => void
  onUpdateTitle: (title: string) => void
  isEditing: boolean
  editingTitle: string
  setEditingTitle: (title: string) => void
  onSaveTitle: () => void
  onCancelEdit: () => void
  onStartEdit: () => void
  onLinkedItemsChange?: () => void
  router: any
}) {
  const [linkedItems, setLinkedItems] = useState<any>({ incidents: [], problems: [], changes: [] })
  const [isLoadingLinks, setIsLoadingLinks] = useState(true)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)

  if (!node) return null

  // Load linked items when component loads
  useEffect(() => {
    const loadLinkedItems = async () => {
      if (!node?.id) return
      
      try {
        setIsLoadingLinks(true)
        const response = await fetch(`/api/components/${node.id}/links`)
        if (response.ok) {
          const data = await response.json()
          setLinkedItems(data)
        } else {
          // Silently handle errors - just set empty state
          setLinkedItems({ incidents: [], problems: [], changes: [] })
        }
      } catch (error) {
        // Silently handle errors - just set empty state
        setLinkedItems({ incidents: [], problems: [], changes: [] })
      } finally {
        setIsLoadingLinks(false)
      }
    }

    loadLinkedItems()
  }, [node?.id])

  // Unlink an item
  const handleUnlink = async (itemId: string, itemType: string) => {
    try {
      const response = await fetch(`/api/components/${node.id}/links`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, itemType: itemType + 's' })
      })

      if (response.ok) {
        toast.success(`Unlinked from ${itemType}`)
        // Reload linked items
        const refreshResponse = await fetch(`/api/components/${node.id}/links`)
        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          setLinkedItems(data)
          // Update linked counts on all components
          onLinkedItemsChange?.()
        }
      } else {
        toast.error(`Failed to unlink ${itemType}`)
      }
    } catch (error) {
      console.error('Error unlinking:', error)
      toast.error(`Error unlinking ${itemType}`)
    }
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'database': return <Database className="w-5 h-5" />
      case 'server': return <Server className="w-5 h-5" />
      case 'network': return <Network className="w-5 h-5" />
      case 'cloud': return <Cloud className="w-5 h-5" />
      case 'security': return <Shield className="w-5 h-5" />
      case 'storage': return <HardDrive className="w-5 h-5" />
      case 'wifi': return <Wifi className="w-5 h-5" />
      case 'loadbalancer': return <MonitorSpeaker className="w-5 h-5" />
      case 'container': return <Container className="w-5 h-5" />
      case 'api': return <Globe className="w-5 h-5" />
      default: return <div className="w-5 h-5 bg-gray-400 rounded" />
    }
  }

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'database': return 'from-green-500 to-green-600'
      case 'server': return 'from-blue-500 to-blue-600'
      case 'network': return 'from-purple-500 to-purple-600'
      case 'cloud': return 'from-sky-500 to-sky-600'
      case 'security': return 'from-red-500 to-red-600'
      case 'storage': return 'from-orange-500 to-orange-600'
      case 'wifi': return 'from-indigo-500 to-indigo-600'
      case 'loadbalancer': return 'from-yellow-500 to-yellow-600'
      case 'container': return 'from-teal-500 to-teal-600'
      case 'api': return 'from-pink-500 to-pink-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSaveTitle()
    } else if (e.key === 'Escape') {
      onCancelEdit()
    }
  }

  return (
    <div className="space-y-6">
      {/* Component Header */}
      <div className="flex items-center space-x-3">
        <div className={`w-12 h-12 bg-gradient-to-r ${getNodeColor(node.data.type)} rounded-lg flex items-center justify-center text-white`}>
          {getNodeIcon(node.data.type)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-gray-700">Title</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={onStartEdit}
              className="h-6 px-2"
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-lg font-semibold"
                placeholder={node.type === 'zone' ? 'Enter zone name' : 'Enter component title'}
                autoFocus
              />
              <Button size="sm" onClick={onSaveTitle}>Save</Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>Cancel</Button>
            </div>
          ) : (
            <h2 className="text-lg font-semibold text-gray-900 mt-1">
              {node.type === 'zone' ? node.data.name : (node.data.customTitle || node.data.label)}
            </h2>
          )}
          <p className="text-sm text-gray-500 capitalize mt-1">{node.data.type}</p>
        </div>
      </div>

      {/* Component Properties */}
      <div className="space-y-4">

        {/* Linked Items Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium text-gray-700">Linked Items</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsLinkModalOpen(true)}
              className="gap-1"
            >
              <Link className="w-3 h-3" />
              Link Items
            </Button>
          </div>
          
          {isLoadingLinks ? (
            <div className="p-4 bg-gray-50 rounded-md text-center text-sm text-gray-500">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
              Loading linked items...
            </div>
          ) : (
            <div className="space-y-3">
              {/* Incidents */}
              {linkedItems.incidents.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
                    {getITILIcon('incident', `w-3 h-3 ${getITILTextClass('incident')}`)}
                    Incidents ({linkedItems.incidents.length})
                  </div>
                  <div className="space-y-1">
                    {linkedItems.incidents.map((incident: any) => (
                      <div key={incident.id} className={`flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded-md`}>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer hover:bg-orange-100 rounded px-1 py-1 -mx-1 transition-colors"
                          onClick={() => router.push(`/incidents/${incident.id}`)}
                        >
                          <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                            {incident.title}
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </div>
                          <div className="text-xs text-gray-500 capitalize">{incident.status}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnlink(incident.id, 'incident')}
                          className="text-orange-600 hover:text-orange-700 h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Problems */}
              {linkedItems.problems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
                    {getITILIcon('problem', `w-3 h-3 ${getITILTextClass('problem')}`)}
                    Problems ({linkedItems.problems.length})
                  </div>
                  <div className="space-y-1">
                    {linkedItems.problems.map((problem: any) => (
                      <div key={problem.id} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-md">
                        <div 
                          className="flex-1 min-w-0 cursor-pointer hover:bg-red-100 rounded px-1 py-1 -mx-1 transition-colors"
                          onClick={() => router.push(`/problems/${problem.id}`)}
                        >
                          <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                            {problem.title}
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </div>
                          <div className="text-xs text-gray-500 capitalize">{problem.status}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnlink(problem.id, 'problem')}
                          className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Changes */}
              {linkedItems.changes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
                    {getITILIcon('change', `w-3 h-3 ${getITILTextClass('change')}`)}
                    Changes ({linkedItems.changes.length})
                  </div>
                  <div className="space-y-1">
                    {linkedItems.changes.map((change: any) => (
                      <div key={change.id} className="flex items-center justify-between p-2 bg-purple-50 border border-purple-200 rounded-md">
                        <div 
                          className="flex-1 min-w-0 cursor-pointer hover:bg-purple-100 rounded px-1 py-1 -mx-1 transition-colors"
                          onClick={() => router.push(`/changes/${change.id}`)}
                        >
                          <div className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                            {change.title}
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </div>
                          <div className="text-xs text-gray-500 capitalize">{change.status}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnlink(change.id, 'change')}
                          className="text-purple-600 hover:text-purple-700 h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {linkedItems.incidents.length === 0 && linkedItems.problems.length === 0 && linkedItems.changes.length === 0 && (
                <div className="p-4 bg-gray-50 rounded-md text-center text-sm text-gray-500">
                  No linked items found. Click "Link Items" to connect this component to incidents, problems, or changes.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Future: Component Parameters */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Parameters</Label>
          <div className="mt-1 p-4 bg-gray-50 rounded-md text-center text-sm text-gray-500">
            Component parameters will be available here for future customization
          </div>
        </div>
      </div>

      {/* Link Items Modal */}
      {isLinkModalOpen && (
        <LinkItemsModal
          componentId={node.id}
          componentTitle={node.data.customTitle || node.data.label}
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          onLinked={() => {
            // Reload linked items
            const refreshResponse = fetch(`/api/components/${node.id}/links`)
              .then(res => res.ok ? res.json() : null)
              .then(data => {
                if (data) {
                  setLinkedItems(data)
                  // Update linked counts on all components
                  onLinkedItemsChange?.()
                }
              })
              .catch(err => console.error('Error refreshing links:', err))
          }}
        />
      )}
    </div>
  )
}

// Link Items Modal Component
function LinkItemsModal({ 
  componentId, 
  componentTitle, 
  isOpen, 
  onClose, 
  onLinked 
}: {
  componentId: string
  componentTitle: string
  isOpen: boolean
  onClose: () => void
  onLinked: () => void
}) {
  const [availableItems, setAvailableItems] = useState<any>({ incidents: [], problems: [], changes: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState<'incidents' | 'problems' | 'changes'>('incidents')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [isLinking, setIsLinking] = useState(false)

  // Load available items
  useEffect(() => {
    const loadAvailableItems = async () => {
      try {
        setIsLoading(true)
        const url = new URL('/api/components/available-links', window.location.origin)
        if (searchTerm) url.searchParams.set('search', searchTerm)
        
        const response = await fetch(url.toString())
        if (response.ok) {
          const data = await response.json()
          setAvailableItems(data)
        }
      } catch (error) {
        console.error('Error loading available items:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (isOpen) {
      loadAvailableItems()
    }
  }, [isOpen, searchTerm])

  const handleLink = async () => {
    if (selectedItems.length === 0) return

    try {
      setIsLinking(true)
      const response = await fetch(`/api/components/${componentId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: selectedItems,
          itemType: selectedTab
        })
      })

      if (response.ok) {
        toast.success(`Linked ${selectedItems.length} ${selectedTab}`)
        onLinked()
        onClose()
        setSelectedItems([])
      } else {
        toast.error(`Failed to link ${selectedTab}`)
      }
    } catch (error) {
      console.error('Error linking items:', error)
      toast.error(`Error linking ${selectedTab}`)
    } finally {
      setIsLinking(false)
    }
  }

  const currentItems = availableItems[selectedTab] || []
  const filteredItems = currentItems.filter((item: any) => 
    !item.affected_services?.includes(componentId)
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Link Items to Component</h2>
              <p className="text-sm text-gray-600 mt-1">Link "{componentTitle}" to incidents, problems, or changes</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Tabs */}
          <div className="px-6 py-2 border-b border-gray-200 flex-shrink-0">
            <div className="flex space-x-4">
              {[
                { key: 'incidents' as const, label: 'Incidents', type: 'incident' as const },
                { key: 'problems' as const, label: 'Problems', type: 'problem' as const },
                { key: 'changes' as const, label: 'Changes', type: 'change' as const }
              ].map(({ key, label, type }) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedTab(key)
                    setSelectedItems([])
                  }}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg ${
                    selectedTab === key
                      ? `bg-${type === 'incident' ? 'orange' : type === 'problem' ? 'red' : 'purple'}-100 text-${type === 'incident' ? 'orange' : type === 'problem' ? 'red' : 'purple'}-700`
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {getITILIcon(type, `w-4 h-4 ${selectedTab === key ? getITILTextClass(type) : getITILTextClass(type)}`)}
                  {label} ({filteredItems.length})
                </button>
              ))}
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-auto px-6 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No available {selectedTab} found to link
              </div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item: any) => (
                  <label
                    key={item.id}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                      selectedItems.includes(item.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.id])
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id))
                        }
                      }}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="text-sm text-gray-500 capitalize flex items-center gap-2">
                        {item.status}
                        {item.assigned_profile?.full_name && (
                          <>
                            <span>•</span>
                            <span>Assigned to {item.assigned_profile.full_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.priority === 'critical' ? 'bg-red-100 text-red-700' :
                      item.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.priority}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-gray-600">
            {selectedItems.length} {selectedTab} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleLink} 
              disabled={selectedItems.length === 0 || isLinking}
              className="gap-2"
            >
              {isLinking && <RefreshCw className="w-4 h-4 animate-spin" />}
              Link Selected
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface InfrastructureViewProps {
  className?: string
  highlightComponentId?: string
}

function InfrastructureViewInner({ className, highlightComponentId }: InfrastructureViewProps) {
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiInsights, setAiInsights] = useState<Map<string, any>>(new Map())
  const [isAiScanning, setIsAiScanning] = useState(false)
  const [lastAiScanTime, setLastAiScanTime] = useState<Date | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // AI Token Management State
  const [aiTokens, setAiTokens] = useState({
    tokensUsed: 0,
    tokensRemaining: 5,
    tokensLimit: 5,
    canScan: true,
    resetTime: '',
    resetTimeFormatted: ''
  })
  
  // Fetch AI token status
  const fetchAITokenStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/token-status')
      if (response.ok) {
        const data = await response.json()
        setAiTokens({
          tokensUsed: data.tokensUsed,
          tokensRemaining: data.tokensRemaining,
          tokensLimit: data.tokensLimit,
          canScan: data.canScan,
          resetTime: data.resetTime,
          resetTimeFormatted: data.resetTimeFormatted
        })
      }
    } catch (error) {
      console.error('Failed to fetch AI token status:', error)
    }
  }, [])

  // Load AI results from localStorage on component mount
  useEffect(() => {
    // Load token status
    fetchAITokenStatus()
    
    try {
      const storedResults = localStorage.getItem('infrastructure-ai-results')
      const storedScanTime = localStorage.getItem('infrastructure-ai-scan-time')
      
      if (storedResults) {
        const parsedResults = JSON.parse(storedResults)
        // Convert plain object back to Map
        const resultsMap = new Map(Object.entries(parsedResults))
        setAiInsights(resultsMap)
        setAiEnabled(true)
      }
      
      if (storedScanTime) {
        setLastAiScanTime(new Date(storedScanTime))
      }
    } catch (error) {
      console.error('Failed to load AI results from localStorage:', error)
      // Clear invalid data
      localStorage.removeItem('infrastructure-ai-results')
      localStorage.removeItem('infrastructure-ai-scan-time')
    }
  }, [])
  
  // AI Scanning function
  const scanInfrastructureWithAI = useCallback(async () => {
    console.log('🔍 Starting AI scan with', nodes.length, 'nodes')
    
    if (nodes.length === 0) {
      toast.error('Add some components first to scan')
      return
    }

    // Check if user can scan
    if (!aiTokens.canScan) {
      toast.error(`Daily AI scan limit reached (${aiTokens.tokensLimit} scans/day). Resets in ${aiTokens.resetTimeFormatted}.`)
      return
    }
    
    setIsAiScanning(true)
    const newInsights = new Map()
    let rateLimitHit = false
    
    try {
      // First, consume 1 token for the entire scan (regardless of number of components)
      const tokenCheckResponse = await fetch('/api/ai/token-status')
      if (tokenCheckResponse.ok) {
        const tokenData = await tokenCheckResponse.json()
        if (!tokenData.canScan) {
          toast.error(`Daily AI scan limit reached. Resets in ${tokenData.resetTimeFormatted}.`)
          return
        }
      }
      
      let tokenConsumed = false
      
      // Scan each component with AI (1 token consumed for entire scan)
      for (const node of nodes) {
        if (node.type === 'infrastructure') {
          const shouldConsumeToken = !tokenConsumed
          console.log(`Scanning ${node.id}, consumeToken: ${shouldConsumeToken}`)
          
          const response = await fetch('/api/ai/component-insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              componentId: node.id,
              analysisDepth: 'basic',
              includeFailurePaths: true,
              includeDependencyAnalysis: true,
              // Only consume token on first component in scan
              consumeToken: shouldConsumeToken
            })
          })
          
          if (response.status === 429) {
            // Rate limit hit
            const errorData = await response.json()
            toast.error(errorData.error || 'Rate limit exceeded')
            rateLimitHit = true
            break
          } else if (response.ok) {
            const data = await response.json()
            if (data.status === 'success') {
              newInsights.set(node.id, data.insights)
              tokenConsumed = true // Mark token as consumed after first successful request
            }
          } else {
            console.warn(`Failed to scan component ${node.id}:`, response.status)
          }
        }
      }
      
      const scanTime = new Date()
      setAiInsights(newInsights)
      setAiEnabled(true)
      setLastAiScanTime(scanTime)
      setIsDetailsPanelOpen(true) // Open panel to show results
      
      // Save to localStorage for persistence across page refreshes
      try {
        // Convert Map to plain object for JSON serialization
        const resultsObject = Object.fromEntries(newInsights)
        localStorage.setItem('infrastructure-ai-results', JSON.stringify(resultsObject))
        localStorage.setItem('infrastructure-ai-scan-time', scanTime.toISOString())
      } catch (error) {
        console.error('Failed to save AI results to localStorage:', error)
      }
      
      if (rateLimitHit) {
        toast.error(`Partial scan completed. ${newInsights.size} components analyzed before hitting rate limit.`)
      } else {
        toast.success(`Scanned ${newInsights.size} components with AI`)
      }
      
      // Refresh token status after scan
      await fetchAITokenStatus()
    } catch (error) {
      console.error('AI scanning error:', error)
      toast.error('Failed to scan infrastructure with AI')
    } finally {
      setIsAiScanning(false)
    }
  }, [nodes, aiTokens.canScan, aiTokens.tokensLimit, aiTokens.resetTimeFormatted, fetchAITokenStatus])
  
  // Get overall risk score
  const getOverallRiskScore = useCallback(() => {
    if (aiInsights.size === 0) return 0
    
    const totalScore = Array.from(aiInsights.values())
      .reduce((sum, insight) => sum + insight.riskScore, 0)
    
    return Math.round(totalScore / aiInsights.size)
  }, [aiInsights])
  
  // Format scan time for display
  const formatScanTime = useCallback((date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes === 0) return 'just now'
    if (diffInMinutes === 1) return '1m ago'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours === 1) return '1h ago'
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return '1d ago'
    return `${diffInDays}d ago`
  }, [])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  
  // Environment management
  const [environments, setEnvironments] = useState<any[]>([])
  const [currentEnvironment, setCurrentEnvironment] = useState<any>(null)
  const [isNewEnvDialogOpen, setIsNewEnvDialogOpen] = useState(false)
  const [newEnvName, setNewEnvName] = useState('')
  const [newEnvDescription, setNewEnvDescription] = useState('')
  const [zoneDropdownValue, setZoneDropdownValue] = useState('')
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null)

  // Load environments from API
  const loadEnvironments = useCallback(async () => {
    try {
      console.log('Loading environments...')
      const response = await fetch('/api/infra/environments')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('Environments loaded:', data)
      setEnvironments(data.environments || [])
      
      // Set current environment to default if none selected
      if (!currentEnvironment && data.environments && data.environments.length > 0) {
        const defaultEnv = data.environments.find((env: any) => env.is_default) || data.environments[0]
        console.log('Setting default environment:', defaultEnv)
        setCurrentEnvironment(defaultEnv)
      } else if (data.environments && data.environments.length === 0) {
        // If no environments exist, clear loading state and initialize empty state
        console.log('No environments found, initializing empty state')
        setIsLoading(false)
        setNodes([])
        setEdges([])
        setIsInitialLoad(false)
      }
      
    } catch (error) {
      console.error('Error loading environments:', error)
      toast.error('Failed to load environments')
      setIsLoading(false) // Also clear loading state on error
    }
  }, [])

  // Delete node and its connected edges
  const deleteNode = useCallback((nodeId: string) => {
    // Check if this is a zone with children
    const nodeToDelete = nodes.find(n => n.id === nodeId)
    const childNodes = nodes.filter(n => n.parentId === nodeId)
    
    if (nodeToDelete?.type === 'zone' && childNodes.length > 0) {
      // Show confirmation dialog for zone with children
      const confirmDelete = window.confirm(
        `This zone "${nodeToDelete.data?.name || 'Zone'}" contains ${childNodes.length} component(s). 
        
Choose:
- OK: Delete zone and move components outside
- Cancel: Keep zone and components`
      )
      
      if (!confirmDelete) {
        return // User cancelled
      }
      
      // Move child nodes outside the zone and remove the zone in one operation
      setNodes((nds) => {
        // First, move children outside the zone
        const movedChildren = nds.map(node => {
          if (node.parentId === nodeId) {
            // Calculate absolute position for the child
            const parentNode = nds.find(n => n.id === nodeId)
            const absoluteX = parentNode ? parentNode.position.x + node.position.x : node.position.x
            const absoluteY = parentNode ? parentNode.position.y + node.position.y : node.position.y
            
            return {
              ...node,
              parentId: undefined, // Clear parent reference
              extent: undefined,   // Clear extent constraint
              position: {
                x: Math.max(50, absoluteX),
                y: Math.max(50, absoluteY)
              }
            }
          }
          return node
        })
        
        // Then remove the zone itself and update any other zone counts
        const finalNodes = movedChildren.filter(node => node.id !== nodeId)
        
        // Update node counts for any remaining zones
        return finalNodes.map(node => {
          if (node.type === 'zone') {
            const childCount = finalNodes.filter(n => n.parentId === node.id).length
            return {
              ...node,
              data: {
                ...node.data,
                nodeCount: childCount
              }
            }
          }
          return node
        })
      })
      
    } else {
      // Normal deletion for components or empty zones
      setNodes((nds) => {
        const filteredNodes = nds.filter(node => node.id !== nodeId)
        
        // If we deleted a component that was in a zone, update that zone's count
        if (nodeToDelete?.parentId) {
          return filteredNodes.map(node => {
            if (node.id === nodeToDelete.parentId && node.type === 'zone') {
              const childCount = filteredNodes.filter(n => n.parentId === nodeToDelete.parentId).length
              return {
                ...node,
                data: {
                  ...node.data,
                  nodeCount: childCount
                }
              }
            }
            return node
          })
        }
        
        return filteredNodes
      })
    }
    
    // Remove associated edges
    setEdges((eds) => eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId))
    
    // Update zone node counts if this was a child node (done in the same setNodes call above)
    // No separate update needed as it's handled in the main deletion logic
  }, [nodes, setNodes, setEdges])

  // Handle node click to open details panel
  const handleNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id)
    setIsDetailsPanelOpen(true)
  }, [])

  // Handle title edit
  const handleTitleEdit = useCallback((nodeId: string, currentTitle: string) => {
    setEditingNodeId(nodeId)
    setEditingTitle(currentTitle)
  }, [])

  // Handle lock toggle for nodes
  const toggleNodeLock = useCallback((nodeId: string) => {
    setNodes((nds) => nds.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, isLocked: !node.data.isLocked } }
        : node
    ))
  }, [setNodes])

  // Save title edit
  const saveTitleEdit = useCallback((nodeId: string, newTitle: string) => {
    if (newTitle.trim() === '') return
    
    setNodes((nds) => nds.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            // Update name for zones, customTitle for regular nodes
            ...(node.type === 'zone' 
              ? { name: newTitle.trim() }
              : { customTitle: newTitle.trim() }
            )
          }
        }
      }
      return node
    }))
    
    setEditingNodeId(null)
    setEditingTitle('')
  }, [setNodes])

  // Cancel title edit
  const cancelTitleEdit = useCallback(() => {
    setEditingNodeId(null)
    setEditingTitle('')
  }, [])

  // Handle component highlighting from URL parameter
  useEffect(() => {
    if (highlightComponentId && nodes.length > 0) {
      const targetComponent = nodes.find(node => node.id === highlightComponentId)
      if (targetComponent) {
        // Open details panel for the highlighted component
        setSelectedNodeId(highlightComponentId)
        setIsDetailsPanelOpen(true)
      }
    }
  }, [highlightComponentId, nodes])

  // Clean up selected node if it's been deleted
  useEffect(() => {
    if (selectedNodeId && !nodes.find(n => n.id === selectedNodeId)) {
      setSelectedNodeId(null)
      setIsDetailsPanelOpen(false)
      setEditingNodeId(null)
      setEditingTitle('')
    }
  }, [selectedNodeId, nodes])

  // Refresh linked counts for all nodes
  const refreshLinkedCounts = useCallback(async () => {
    // Get current nodes and process them
    const currentNodes = nodes
    
    // Process each node to update linked count
    const linkCounts = await Promise.all(currentNodes.map(async (node) => {
      let linkedCount = 0
      try {
        const linkResponse = await fetch(`/api/components/${node.id}/links`)
        if (linkResponse.ok) {
          const linkData = await linkResponse.json()
          linkedCount = (linkData.incidents?.length || 0) + (linkData.problems?.length || 0) + (linkData.changes?.length || 0)
        }
      } catch (error) {
        console.error('Error fetching linked count for node:', node.id, error)
      }
      return { nodeId: node.id, linkedCount }
    }))

    // Update nodes with new linked counts
    setNodes(currentNodes.map(node => {
      const linkData = linkCounts.find(lc => lc.nodeId === node.id)
      if (linkData) {
        return {
          ...node,
          data: {
            ...node.data,
            linkedCount: linkData.linkedCount
          }
        }
      }
      return node
    }))
  }, [nodes, setNodes])

  // Load data from API for current environment
  const loadData = useCallback(async (environmentId?: string) => {
    try {
      setIsLoading(true)
      const envId = environmentId || currentEnvironment?.id
      const url = envId ? `/api/infra?environment=${envId}` : '/api/infra'
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Transform nodes to use our custom node type and fetch linked counts
      const transformedNodes = await Promise.all(data.nodes.map(async (node: any) => {
        // Fetch linked count for this node
        let linkedCount = 0
        try {
          const linkResponse = await fetch(`/api/components/${node.id}/links`)
          if (linkResponse.ok) {
            const linkData = await linkResponse.json()
            linkedCount = (linkData.incidents?.length || 0) + (linkData.problems?.length || 0) + (linkData.changes?.length || 0)
          }
        } catch (error) {
          console.error('Error fetching linked count for node:', node.id, error)
        }

        return {
          ...node,
          type: node.type || 'infrastructure', // Preserve zone type, default others to infrastructure
          data: {
            ...node.data,
            onDelete: deleteNode,
            onClick: handleNodeClick,
            onTitleEdit: handleTitleEdit,
            onToggleLock: toggleNodeLock,
            linkedCount
          }
        }
      }))
      
      setNodes(transformedNodes)
      setEdges(data.edges)
      setIsInitialLoad(false) // Mark that initial load is complete
      
    } catch (error) {
      console.error('Error loading infrastructure data:', error)
      toast.error('Failed to load infrastructure data')
    } finally {
      setIsLoading(false)
    }
  }, [setNodes, setEdges, deleteNode, handleNodeClick, handleTitleEdit, toggleNodeLock])

  // Clear all nodes and edges
  const clearAll = useCallback(() => {
    setNodes([])
    setEdges([])
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setIsDetailsPanelOpen(false)
    setLastSaved(null)
    setIsInitialLoad(false)
    setAiInsights(new Map())
    setLastAiScanTime(null)
    setShowDeleteConfirm(false)
    
    // Clear AI results from localStorage
    try {
      localStorage.removeItem('infrastructure-ai-results')
      localStorage.removeItem('infrastructure-ai-scan-time')
    } catch (error) {
      console.error('Failed to clear AI results from localStorage:', error)
    }
    
    toast.success('Infrastructure map cleared')
  }, [setNodes, setEdges])

  // Handle clear confirmation
  const handleClearConfirm = useCallback(() => {
    setShowDeleteConfirm(true)
  }, [])

  // Handle creating a change from AI recommendation
  const handleCreateChange = useCallback((recommendation: string, componentId: string, componentTitle: string) => {
    // Get the AI insight for this component to provide more context
    const aiInsight = aiInsights.get(componentId)
    const riskCategory = aiInsight?.riskCategory || 'medium'
    const riskScore = aiInsight?.riskScore || 50
    
    // Determine priority based on risk
    const priority = riskCategory === 'critical' ? 'critical' : 
                    riskCategory === 'high' ? 'high' : 'medium'
    
    // Generate comprehensive change data
    const changeData = {
      title: `AI Recommended: ${recommendation.length > 60 ? recommendation.substring(0, 60) + '...' : recommendation}`,
      description: `<h3>🤖 AI-Generated Change Request</h3>
<p><strong>Component:</strong> ${componentTitle}</p>
<p><strong>Risk Assessment:</strong> ${riskCategory.toUpperCase()} (Score: ${riskScore}/100)</p>

<h4>📋 Recommendation Details</h4>
<p>${recommendation}</p>

<h4>🔍 Analysis Context</h4>
<p>This change was generated based on comprehensive AI analysis including:</p>
<ul>
  <li>Infrastructure risk assessment</li>
  <li>Historical incident/problem patterns</li>
  <li>Component dependency analysis</li>
  <li>System topology evaluation</li>
</ul>

<h4>🎯 Expected Outcomes</h4>
<ul>
  <li>Reduce component risk score from ${riskScore}/100</li>
  <li>Improve system reliability and performance</li>
  <li>Prevent potential cascading failures</li>
  <li>Enhance monitoring and alerting capabilities</li>
</ul>`,
      affectedServices: [componentId],
      priority: priority as 'low' | 'medium' | 'high' | 'critical',
      rollbackPlan: generateRollbackPlan(recommendation, componentTitle, riskCategory),
      testPlan: generateTestPlan(recommendation, componentTitle, riskCategory),
      tags: `ai-recommended, ${riskCategory}-priority, infrastructure, ${componentTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}, maintenance`
    }

    // Store the pre-filled data in localStorage for the change form
    try {
      localStorage.setItem('prefilled-change-data', JSON.stringify(changeData))
      
      // Navigate to the change creation page
      router.push('/changes/new')
      
      // Show success toast
      toast.success('Change request pre-filled with AI analysis!', { duration: 2000 })
    } catch (error) {
      console.error('Failed to store pre-filled change data:', error)
      toast.error('Failed to prepare change request')
    }
  }, [router, aiInsights])

  // Helper function to generate contextual rollback plans
  const generateRollbackPlan = (recommendation: string, componentTitle: string, riskCategory: string) => {
    const urgency = riskCategory === 'critical' ? 'IMMEDIATE' : 
                   riskCategory === 'high' ? 'Priority' : 'Standard'
    
    let plan = `🚨 ${urgency} Rollback Plan for ${componentTitle}\n\n`
    
    if (recommendation.toLowerCase().includes('security') || recommendation.toLowerCase().includes('patch')) {
      plan += `Security/Patch Rollback:
1. Create snapshot/backup of current state before starting
2. Document all security changes made
3. If issues occur:
   - Revert to previous security configuration
   - Disable new security rules/patches
   - Restore from backup if system instability occurs
4. Test authentication and authorization
5. Monitor security logs for anomalies
6. Contact security team if rollback fails`
    } else if (recommendation.toLowerCase().includes('performance') || recommendation.toLowerCase().includes('resource')) {
      plan += `Performance/Resource Rollback:
1. Record baseline performance metrics before change
2. Monitor resource utilization during implementation
3. If performance degrades:
   - Scale back resource allocations to previous levels
   - Revert configuration changes
   - Clear any new caches or buffers
4. Restart services if necessary
5. Validate performance returns to baseline
6. Alert performance team if issues persist`
    } else if (recommendation.toLowerCase().includes('monitoring') || recommendation.toLowerCase().includes('alert')) {
      plan += `Monitoring/Alerting Rollback:
1. Backup current monitoring configuration
2. Document new alerts and thresholds
3. If monitoring causes issues:
   - Disable new alerts temporarily
   - Revert monitoring configuration
   - Restore previous alert thresholds
4. Ensure critical alerts remain functional
5. Test alert delivery mechanisms
6. Contact monitoring team for assistance`
    } else {
      plan += `Standard Rollback Procedure:
1. Create comprehensive backup before implementation
2. Document all changes made during implementation
3. If issues occur:
   - Stop ongoing changes immediately
   - Revert configuration to previous state
   - Restart affected services in correct order
   - Validate system stability
4. Run health checks on ${componentTitle}
5. Monitor system performance for 30 minutes
6. Contact team lead if rollback unsuccessful`
    }
    
    plan += `\n\n⚠️ Escalation: If rollback fails, immediately contact:
- Team Lead
- Infrastructure team
- On-call engineer (for ${riskCategory} priority issues)`
    
    return plan
  }

  // Helper function to generate contextual test plans
  const generateTestPlan = (recommendation: string, componentTitle: string, riskCategory: string) => {
    let plan = `🧪 Testing Plan for ${componentTitle}\n\n`
    
    plan += `Pre-Implementation Tests:
1. Verify ${componentTitle} current status and performance
2. Run baseline tests to establish current metrics
3. Ensure all monitoring is active and recording\n\n`
    
    if (recommendation.toLowerCase().includes('security')) {
      plan += `Security Testing:
1. Test authentication mechanisms after changes
2. Verify access controls are properly configured
3. Run security scans to detect vulnerabilities
4. Test encryption if applicable
5. Validate compliance requirements are met
6. Check security logs for any anomalies`
    } else if (recommendation.toLowerCase().includes('performance')) {
      plan += `Performance Testing:
1. Measure response times before/after change
2. Run load tests to verify capacity improvements
3. Monitor CPU, memory, and disk utilization
4. Test under peak load conditions
5. Validate latency improvements
6. Check for any performance regressions`
    } else if (recommendation.toLowerCase().includes('monitoring')) {
      plan += `Monitoring Testing:
1. Verify all new alerts are properly configured
2. Test alert delivery mechanisms (email, Slack, etc.)
3. Validate metric collection is working
4. Check dashboard functionality
5. Test alert thresholds with simulated conditions
6. Ensure no duplicate or spam alerts`
    } else {
      plan += `Functional Testing:
1. Test primary functionality of ${componentTitle}
2. Verify all connected services still work
3. Check data integrity and consistency
4. Test error handling and edge cases
5. Validate user experience remains unchanged
6. Run integration tests with dependent systems`
    }
    
    plan += `\n\nPost-Implementation Verification:
1. Monitor ${componentTitle} for ${riskCategory === 'critical' ? '2 hours' : '1 hour'}
2. Verify all metrics return to normal/improved levels
3. Check error logs for any new issues
4. Validate change achieved intended outcome
5. Document actual vs expected results
6. Update monitoring if needed`
    
    plan += `\n\n✅ Success Criteria:
- No new errors or alerts generated
- Performance metrics stable or improved
- All dependent services functioning normally
- Change objective successfully achieved`
    
    return plan
  }

  // Save data to API
  const saveData = useCallback(async () => {
    try {
      setIsSaving(true)
      
      if (!currentEnvironment) {
        return
      }
      
      // Sanitize nodes before sending to API to prevent foreign key constraint errors
      const sanitizedNodes = nodes.map(node => {
        // If a node references a zone that no longer exists, clear the reference
        if (node.parentId) {
          const parentZoneExists = nodes.find(n => n.id === node.parentId && n.type === 'zone')
          if (!parentZoneExists) {
            console.warn(`Node ${node.id} references non-existent zone ${node.parentId}, clearing reference`)
            return {
              ...node,
              parentId: undefined,
              extent: undefined
            }
          }
        }
        return node
      })
      
      const response = await fetch('/api/infra', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          nodes: sanitizedNodes, 
          edges, 
          environmentId: currentEnvironment.id 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error('Save error details:', errorData)
        throw new Error(`HTTP error! status: ${response.status}${errorData ? ` - ${errorData.error || errorData.details}` : ''}`)
      }

      const result = await response.json()
      setLastSaved(new Date())
      
    } catch (error) {
      console.error('Error saving infrastructure data:', error)
      toast.error('Failed to save infrastructure data')
    } finally {
      setIsSaving(false)
    }
  }, [nodes, edges, currentEnvironment])

  // Create new environment
  const createEnvironment = useCallback(async () => {
    try {
      if (!newEnvName.trim()) {
        toast.error('Environment name is required')
        return
      }

      const response = await fetch('/api/infra/environments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newEnvName.trim(),
          description: newEnvDescription.trim() || null,
          is_default: environments.length === 0 // First environment is default
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast.success('Environment created successfully')
      
      // Reset form and close dialog
      setNewEnvName('')
      setNewEnvDescription('')
      setIsNewEnvDialogOpen(false)
      
      // Reload environments
      await loadEnvironments()
      
    } catch (error) {
      console.error('Error creating environment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create environment')
    }
  }, [newEnvName, newEnvDescription, environments.length, loadEnvironments])

  // Switch to different environment
  const switchEnvironment = useCallback(async (environmentId: string) => {
    const newEnv = environments.find(env => env.id === environmentId)
    if (newEnv) {
      setCurrentEnvironment(newEnv)
      await loadData(environmentId)
    }
  }, [environments, loadData])

  // Handle new connections between nodes
  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        id: `edge-${params.source}-${params.sourceHandle || 'default'}-${params.target}-${params.targetHandle || 'default'}-${Date.now()}`,
        type: 'smoothstep',
        style: { strokeWidth: 2, stroke: '#6366f1' },
        markerEnd: {
          type: 'arrowclosed',
          color: '#6366f1',
        },
        deletable: true,
        data: { relationship: 'connected' }
      }
      setEdges((eds) => addEdge(edge, eds))
    },
    [setEdges]
  )

  // Handle node drag start
  const onNodeDragStart = useCallback((event: React.MouseEvent, node: any) => {
    // Don't allow dragging locked nodes/zones
    if (node.data?.isLocked) {
      event.preventDefault()
      return
    }
    
    if (node.type === 'infrastructure' || node.type === 'zone') {
      setDraggedNodeId(node.id)
    }
  }, [])

  // Handle node drag - check for zone hover
  const onNodeDrag = useCallback((event: React.MouseEvent, node: any) => {
    if (!draggedNodeId) return
    // Skip drag detection for locked nodes or unsupported node types
    if (node.data?.isLocked || !node.type || (node.type !== 'infrastructure' && node.type !== 'zone')) return

    // Calculate absolute position (considering parent offset)
    let absoluteX = node.position.x
    let absoluteY = node.position.y
    
    // Get current parent for position calculation
    const currentParent = nodes.find(n => n.id === node.parentId)
    if (currentParent) {
      absoluteX += currentParent.position.x
      absoluteY += currentParent.position.y
    }

    // Find zone being hovered over (exclude current parent)
    const hoveredZone = nodes.find(n => {
      if (n.type !== 'zone' || n.id === node.id || n.id === node.parentId) return false
      
      const zoneStyle = n.style || {}
      const zoneWidth = zoneStyle.width || 300
      const zoneHeight = zoneStyle.height || 200
      
      // Add some padding for easier drop targeting
      return (
        absoluteX >= n.position.x - 5 &&
        absoluteX <= n.position.x + Number(zoneWidth) + 5 &&
        absoluteY >= n.position.y - 5 &&
        absoluteY <= n.position.y + Number(zoneHeight) + 5
      )
    })

    const newHoveredZoneId = hoveredZone?.id || null
    if (newHoveredZoneId !== hoveredZoneId) {
      setHoveredZoneId(newHoveredZoneId)
    }
  }, [draggedNodeId, hoveredZoneId, nodes])

  // Handle node drag end - check if dropped into a zone
  const onNodeDragStop = useCallback((event: React.MouseEvent, node: any) => {
    // Reset drag state
    setDraggedNodeId(null)
    setHoveredZoneId(null)

    // Skip locked nodes or unsupported node types
    if (node.data?.isLocked || !node.type || (node.type !== 'infrastructure' && node.type !== 'zone')) return

    // Use the current node position directly (ReactFlow has already updated it)
    const currentNodePosition = { x: node.position.x, y: node.position.y }
    
    // Calculate absolute position for zone collision detection
    let absoluteX = currentNodePosition.x
    let absoluteY = currentNodePosition.y
    
    // Get current parent for position calculation
    const currentParent = nodes.find(n => n.id === node.parentId)
    if (currentParent) {
      absoluteX += currentParent.position.x
      absoluteY += currentParent.position.y
    }

    // Find the zone this node was dropped into (if any)
    const droppedZone = nodes.find(n => {
      if (n.type !== 'zone' || n.id === node.id || n.id === node.parentId) return false
      
      const zoneStyle = n.style || {}
      const zoneWidth = zoneStyle.width || 300
      const zoneHeight = zoneStyle.height || 200
      
      return (
        absoluteX >= n.position.x &&
        absoluteX <= n.position.x + Number(zoneWidth) &&
        absoluteY >= n.position.y &&
        absoluteY <= n.position.y + Number(zoneHeight)
      )
    })

    // Update node relationships and positions
    if (droppedZone && node.parentId !== droppedZone.id) {
      // Item dropped into a different zone - make it a child
      setNodes(nds => nds.map(n => {
        if (n.id === node.id) {
          const updatedNode = {
            ...n,
            parentId: droppedZone.id,
            // Calculate position relative to new parent zone
            position: {
              x: Math.max(10, absoluteX - droppedZone.position.x),
              y: Math.max(40, absoluteY - droppedZone.position.y) // Leave space for zone header
            }
          }
          
          // Only add extent constraint for infrastructure nodes, not zones
          if (node.type === 'infrastructure') {
            updatedNode.extent = 'parent' as const
          }
          
          return updatedNode
        }
        return n
      }))
      
      // Update zone node counts
      updateZoneNodeCount(droppedZone.id)
      if (node.parentId && node.parentId !== droppedZone.id) {
        updateZoneNodeCount(node.parentId)
      }
      const itemName = node.data?.name || node.data?.label || (node.type === 'zone' ? 'Zone' : 'Node')
      
    } else if (!droppedZone && node.parentId) {
      // Node dropped outside any zone - remove parent relationship
      const oldParentId = node.parentId
      
      setNodes(nds => nds.map(n => {
        if (n.id === node.id) {
          return {
            ...n,
            parentId: undefined,
            extent: undefined,
            // Use absolute position
            position: {
              x: absoluteX,
              y: absoluteY
            }
          }
        }
        return n
      }))
      
      // Update old zone node count
      updateZoneNodeCount(oldParentId)
      const itemName = node.data?.name || node.data?.label || (node.type === 'zone' ? 'Zone' : 'Node')
    }
    
    // Ensure all nodes with parentId have correct positioning
    setTimeout(() => {
      setNodes(nds => nds.map(n => {
        if (n.parentId && n.type !== 'zone') {
          const parent = nds.find(p => p.id === n.parentId)
          if (parent && (n.position.x < 0 || n.position.y < 0)) {
            return {
              ...n,
              position: {
                x: Math.max(10, n.position.x),
                y: Math.max(40, n.position.y)
              }
            }
          }
        }
        return n
      }))
    }, 100)
  }, [nodes, setNodes])

  // Helper function to update zone node count
  const updateZoneNodeCount = useCallback((zoneId: string) => {
    setNodes(nds => nds.map(node => {
      if (node.id === zoneId && node.type === 'zone') {
        const childCount = nds.filter(n => n.parentId === zoneId).length
        return {
          ...node,
          data: {
            ...node.data,
            nodeCount: childCount
          }
        }
      }
      return node
    }))
  }, [setNodes])

  // Add new node of specified type
  const addNode = useCallback((nodeType: string) => {
    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      type: 'infrastructure',
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 400 + 100 
      },
      data: { 
        label: `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} ${nodes.length + 1}`,
        type: nodeType,
        isLocked: false,
        onDelete: deleteNode,
        onClick: handleNodeClick,
        onTitleEdit: handleTitleEdit,
        onToggleLock: toggleNodeLock,
        linkedCount: 0
      }
    }
    setNodes((nds) => nds.concat(newNode))
    setIsInitialLoad(false) // Mark that we're no longer in initial load
  }, [nodes.length, setNodes, deleteNode, handleNodeClick, handleTitleEdit, toggleNodeLock])

  // Add new zone of specified type
  const addZone = useCallback((zoneType: string) => {
    const newZone = {
      id: `${crypto.randomUUID()}`, // Generate UUID for database compatibility
      type: 'zone',
      position: { 
        x: Math.random() * 300 + 100, 
        y: Math.random() * 300 + 100 
      },
      style: {
        width: 300,
        height: 200,
      },
      data: { 
        name: `${zoneType.charAt(0).toUpperCase() + zoneType.slice(1).replace('_', ' ')} ${nodes.filter(n => n.type === 'zone').length + 1}`,
        zoneType: zoneType,
        description: '',
        isCollapsed: false,
        isLocked: false,
        nodeCount: 0,
        zoneConfig: {},
        onToggleCollapse: (id: string) => {
          setNodes(nds => nds.map(node => 
            node.id === id 
              ? { ...node, data: { ...node.data, isCollapsed: !node.data.isCollapsed } }
              : node
          ))
        },
        onToggleLock: (id: string) => {
          setNodes(nds => nds.map(node => 
            node.id === id 
              ? { ...node, data: { ...node.data, isLocked: !node.data.isLocked } }
              : node
          ))
        },
        onClick: handleNodeClick,
        onDelete: deleteNode,
      }
    }
    setNodes((nds) => nds.concat(newZone))
    setIsInitialLoad(false)
    // Reset dropdown after adding zone
    setZoneDropdownValue('')
  }, [nodes, setNodes, deleteNode, handleNodeClick])

  // Handle Terraform import
  const handleTerraformImport = useCallback((importedNodes: Node[], importedEdges: Edge[], metadata: any) => {
    // Add imported nodes to existing diagram with proper handlers
    const updatedNodes = importedNodes.map(node => {
      if (node.type === 'zone') {
        // Zone nodes need different handlers
        return {
          ...node,
          data: {
            ...node.data,
            onDelete: deleteNode,
            onClick: handleNodeClick
          }
        }
      } else {
        // Infrastructure component nodes
        return {
          ...node,
          data: {
            ...node.data,
            onDelete: deleteNode,
            onClick: handleNodeClick,
            onTitleEdit: handleTitleEdit,
            onToggleLock: toggleNodeLock,
            linkedCount: 0,
            isLocked: false
          }
        }
      }
    })

    setNodes(currentNodes => [...currentNodes, ...updatedNodes])
    setEdges(currentEdges => [...currentEdges, ...importedEdges])
    setIsInitialLoad(false)
    
    const zonesCount = importedNodes.filter(n => n.type === 'zone').length
    const componentsCount = importedNodes.filter(n => n.type === 'infrastructure').length
    
    toast.success(`Imported ${zonesCount} zones and ${componentsCount} components from Terraform`)
  }, [setNodes, setEdges, deleteNode, handleNodeClick, handleTitleEdit, toggleNodeLock])

  // Handle keyboard events for deletion
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectedEdgeId) {
        setEdges(prevEdges => prevEdges.filter(edge => edge.id !== selectedEdgeId))
        setSelectedEdgeId(null)
        event.preventDefault()
      }
    }
  }, [selectedEdgeId, setEdges])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Load environments and data on mount
  useEffect(() => {
    loadEnvironments()
  }, [loadEnvironments])

  // Debug logging
  useEffect(() => {
    console.log('Environment state changed:', { environments, currentEnvironment })
  }, [environments, currentEnvironment])

  // Load data when environment changes
  useEffect(() => {
    if (currentEnvironment) {
      loadData(currentEnvironment.id)
    }
  }, [currentEnvironment?.id])

  // Auto-save when nodes or edges change (debounced)
  useEffect(() => {
    // Skip auto-save during initial load or when no environment is selected
    if (currentEnvironment && !isInitialLoad) {
      const timeoutId = setTimeout(() => {
        saveData()
      }, 2000) // Save 2 seconds after last change

      return () => clearTimeout(timeoutId)
    }
  }, [nodes, edges, isInitialLoad]) // Removed currentEnvironment and saveData to prevent loop

  // Stats for display
  const stats = useMemo(() => {
    const nodeTypes = nodes.reduce((acc, node) => {
      const type = node.data?.type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodeTypes
    }
  }, [nodes, edges])

  // Render loading state without early return to avoid hook rule violations
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading infrastructure...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full h-full flex overflow-hidden ${className}`}>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Optimized Control Panel */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
          <div className="max-w-7xl mx-auto">
            {/* Main Controls Row - Two rows for better layout */}
            <div className="space-y-3">
              {/* Top Row - Environment and Stats */}
              <div className="flex items-center justify-between">
                {/* Environment Section */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium text-gray-700">Environment</Label>
                  <div className="flex items-center gap-2">
                    {environments.length > 0 ? (
                      <>
                        <Select 
                          value={currentEnvironment?.id || ""} 
                          onValueChange={switchEnvironment}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Select environment" />
                          </SelectTrigger>
                          <SelectContent>
                            {environments.map((env) => (
                              <SelectItem key={env.id} value={env.id}>
                                {env.name} {env.is_default && "(Default)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Dialog open={isNewEnvDialogOpen} onOpenChange={setIsNewEnvDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" title="Create new environment">
                              <FolderPlus className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create New Environment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="env-name">Name</Label>
                                <Input
                                  id="env-name"
                                  value={newEnvName}
                                  onChange={(e) => setNewEnvName(e.target.value)}
                                  placeholder="e.g., Development, Staging"
                                />
                              </div>
                              <div>
                                <Label htmlFor="env-description">Description (optional)</Label>
                                <Input
                                  id="env-description"
                                  value={newEnvDescription}
                                  onChange={(e) => setNewEnvDescription(e.target.value)}
                                  placeholder="Brief description of this environment"
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setIsNewEnvDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={createEnvironment}>
                                  Create
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-500 italic">No environments</div>
                        <Dialog open={isNewEnvDialogOpen} onOpenChange={setIsNewEnvDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" title="Create your first environment">
                              <FolderPlus className="w-4 h-4 mr-1" />
                              Create Environment
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Create Your First Environment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="env-name">Name</Label>
                                <Input
                                  id="env-name"
                                  value={newEnvName}
                                  onChange={(e) => setNewEnvName(e.target.value)}
                                  placeholder="e.g., Development, Staging"
                                />
                              </div>
                              <div>
                                <Label htmlFor="env-description">Description (optional)</Label>
                                <Input
                                  id="env-description"
                                  value={newEnvDescription}
                                  onChange={(e) => setNewEnvDescription(e.target.value)}
                                  placeholder="Brief description of this environment"
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setIsNewEnvDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={createEnvironment}>
                                  Create
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Section */}
                <div className="flex items-center gap-4">
                  {/* Import/Export Actions */}
                  <div className="flex items-center gap-2">
                    {/* AI Scan Button with Token Info */}
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center text-xs text-gray-500">
                        <div className="font-medium">
                          {aiTokens.tokensRemaining}/{aiTokens.tokensLimit}
                        </div>
                        <div>left</div>
                        {!aiTokens.canScan && (
                          <div className="text-red-500 text-center">
                            Resets in {aiTokens.resetTimeFormatted}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={scanInfrastructureWithAI}
                        disabled={isAiScanning || nodes.length === 0 || !aiTokens.canScan}
                        className="gap-2"
                        title={!aiTokens.canScan ? `Rate limit reached. Resets in ${aiTokens.resetTimeFormatted}` : `${aiTokens.tokensRemaining} scans remaining today`}
                      >
                        {isAiScanning ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Brain className={`w-4 h-4 ${!aiTokens.canScan ? 'text-red-500' : ''}`} />
                        )}
                        {isAiScanning ? 'Scanning...' : 'AI Scan'}
                      </Button>
                    </div>
                    
                    {/* Show AI Results if available */}
                    {aiInsights.size > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedNodeId(null) // Clear selected node to show AI results
                          setIsDetailsPanelOpen(true)
                        }}
                        className="gap-1"
                      >
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span>Results ({aiInsights.size})</span>
                      </Button>
                    )}
                    
                    <TerraformImport 
                      onImport={handleTerraformImport}
                      onClose={() => {}}
                    />
                    <DiagramExport 
                      nodes={nodes}
                      edges={edges}
                      currentEnvironment={currentEnvironment}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearConfirm}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 p-2"
                      disabled={nodes.length === 0}
                      title="Clear All Components"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Bottom Row - Component and Zone Selectors */}
              <div className="flex items-center gap-6">
                {/* Components Section */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium text-gray-700">Add Component</Label>
                  <Select onValueChange={(value) => addNode(value)}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Choose component..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="server">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4" />
                          <span>Server</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="database">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          <span>Database</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="cloud">
                        <div className="flex items-center gap-2">
                          <Cloud className="w-4 h-4" />
                          <span>Cloud</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="storage">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4" />
                          <span>Storage</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="network">
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4" />
                          <span>Network</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="security">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <span>Security</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="loadbalancer">
                        <div className="flex items-center gap-2">
                          <MonitorSpeaker className="w-4 h-4" />
                          <span>Load Balancer</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="api">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          <span>API</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="container">
                        <div className="flex items-center gap-2">
                          <Container className="w-4 h-4" />
                          <span>Container</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="wifi">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4" />
                          <span>WiFi</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="monitoring">
                        <div className="flex items-center gap-2">
                          <MonitorSpeaker className="w-4 h-4" />
                          <span>Monitoring</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="cache">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          <span>Cache</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="queue">
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4" />
                          <span>Message Queue</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="cdn">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          <span>CDN</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="gateway">
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4" />
                          <span>Gateway</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="backup">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4" />
                          <span>Backup</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="scheduler">
                        <div className="flex items-center gap-2">
                          <Cloud className="w-4 h-4" />
                          <span>Scheduler</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="certificate">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <span>Certificate</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="dns">
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4" />
                          <span>DNS</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="router">
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4" />
                          <span>Router</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="switch">
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4" />
                          <span>Switch</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="firewall">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <span>Firewall</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="printer">
                        <div className="flex items-center gap-2">
                          <MonitorSpeaker className="w-4 h-4" />
                          <span>Printer</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="workstation">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4" />
                          <span>Workstation</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="laptop">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4" />
                          <span>Laptop</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="tablet">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4" />
                          <span>Tablet</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="phone">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4" />
                          <span>Phone</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="ups">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4" />
                          <span>UPS</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="nas">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4" />
                          <span>NAS</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="camera">
                        <div className="flex items-center gap-2">
                          <MonitorSpeaker className="w-4 h-4" />
                          <span>Security Camera</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="accesspoint">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4" />
                          <span>Access Point</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="rack">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4" />
                          <span>Server Rack</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="kvm">
                        <div className="flex items-center gap-2">
                          <MonitorSpeaker className="w-4 h-4" />
                          <span>KVM Switch</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="modem">
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4" />
                          <span>Modem</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Zones Section */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium text-gray-700">Add Zone</Label>
                  <Select 
                    value={zoneDropdownValue} 
                    onValueChange={(value) => {
                      setZoneDropdownValue(value)
                      addZone(value)
                    }}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Choose zone..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vpc">
                        <div className="flex items-center gap-2">
                          <Cloud className="w-4 h-4" />
                          <span>VPC</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="subnet">
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4" />
                          <span>Subnet</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="lan">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4" />
                          <span>LAN</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="security_group">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          <span>Security Group</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="cluster">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          <span>Cluster</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="datacenter">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          <span>Datacenter</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* React Flow Canvas */}
        <div className="flex-1 overflow-hidden">
        <ReactFlow
          nodes={nodes.map(node => {
            // Check if parentId references a valid zone that exists in our nodes array
            const validParentId = node.parentId && nodes.find(n => n.id === node.parentId && n.type === 'zone') 
              ? node.parentId 
              : undefined
            
            return {
              ...node,
              parentId: validParentId,
              extent: validParentId ? node.extent : undefined,
              style: {
                ...node.style,
                // Set z-index: all nodes below edges (100), zones lowest
                zIndex: node.type === 'zone' ? 1 : validParentId ? 90 : 80,
                // Highlight the selected component
                ...(highlightComponentId === node.id && {
                  border: '3px solid #3b82f6',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
                })
              },
              className: `react-flow__node-${node.type} ${validParentId ? 'in-zone' : ''}`,
              data: {
                ...node.data,
                // Pass hover state for visual feedback
                isHovered: hoveredZoneId === node.id && node.type === 'zone',
                // Pass zone information for visual indicators
                isInZone: !!validParentId,
                parentZoneId: validParentId,
                parentZoneName: validParentId ? nodes.find(n => n.id === validParentId)?.data?.name : null
              }
            }
          })}
          edges={edges.map(edge => ({
            ...edge,
            style: edge.id === selectedEdgeId
              ? { strokeWidth: 4, stroke: '#ef4444', cursor: 'pointer', zIndex: 100 } // Red and thicker when selected
              : { strokeWidth: 3, stroke: '#6366f1', cursor: 'pointer', zIndex: 100 }, // Default blue, thicker for easier clicking
            markerEnd: {
              type: 'arrowclosed' as any,
              color: edge.id === selectedEdgeId ? '#ef4444' : '#6366f1',
            },
            interactionWidth: 20, // Wider clickable area
          })) as any}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
          className="bg-gray-50"
          connectionMode={"loose" as any}
          snapToGrid={true}
          snapGrid={[15, 15]}
          elementsSelectable={true}
          edgesUpdatable={true}
          edgesFocusable={true}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { strokeWidth: 2, stroke: '#6366f1', zIndex: 100 },
            markerEnd: {
              type: 'arrowclosed' as any,
              color: '#6366f1',
            },
            deletable: true,
          }}
          onEdgeClick={(event, edge) => {
            // Toggle edge selection
            setSelectedEdgeId(selectedEdgeId === edge.id ? null : edge.id)
            event.stopPropagation()
          }}
          onPaneClick={() => {
            // Deselect edge when clicking on empty space
            setSelectedEdgeId(null)
          }}
        >
          <Controls position="bottom-left" />
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        </ReactFlow>

        {/* Empty State */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center max-w-md mx-auto">
              <Network className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Infrastructure Yet</h3>
              <p className="text-sm text-gray-600">
                Start building your infrastructure diagram by adding components from the panel above. 
                Drag from any side (green = source, blue = target) to create connections. 
                Click connections to select them (turns red), then press Delete key to remove.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Right Side Panel for Component Details */}
      {isDetailsPanelOpen && (
        <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0 flex flex-col">
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                {aiInsights.size > 0 && !selectedNodeId && (
                  <>
                    <Brain className="w-5 h-5 text-blue-500" />
                    AI Scan Results
                  </>
                )}
                {selectedNodeId && "Component Details"}
                {aiInsights.size === 0 && !selectedNodeId && "Panel"}
              </h3>
              
              {/* Refresh button next to AI Scan Results title */}
              {aiInsights.size > 0 && !selectedNodeId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={scanInfrastructureWithAI}
                  disabled={isAiScanning}
                  className="h-6 w-6 p-0"
                  title="Refresh Analysis"
                >
                  {isAiScanning ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDetailsPanelOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-auto p-4">
            {/* AI Results when available and no component selected */}
            {aiInsights.size > 0 && !selectedNodeId && (
              <div>
                {/* Scan timestamp */}
                {lastAiScanTime && (
                  <div className="mb-4 p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Last AI Scan</span>
                      <span className="text-gray-400">{formatScanTime(lastAiScanTime)}</span>
                    </div>
                  </div>
                )}
                
                <AIDashboard
                  insights={aiInsights}
                  overallRiskScore={getOverallRiskScore()}
                  onRefreshAll={scanInfrastructureWithAI}
                  onToggleRiskHighlight={() => {}}
                  onAnalyzeAll={scanInfrastructureWithAI}
                  onCreateChange={handleCreateChange}
                  loading={isAiScanning}
                  className="max-w-none"
                />
              </div>
            )}
            
            {/* Component Details when a component is selected */}
            {selectedNodeId && nodes.find(n => n.id === selectedNodeId) && (
              <ComponentDetailsForm 
                node={nodes.find(n => n.id === selectedNodeId)}
                onClose={() => setIsDetailsPanelOpen(false)}
                onUpdateTitle={(newTitle) => saveTitleEdit(selectedNodeId, newTitle)}
                isEditing={editingNodeId === selectedNodeId}
                editingTitle={editingTitle}
                setEditingTitle={setEditingTitle}
                onSaveTitle={() => saveTitleEdit(selectedNodeId, editingTitle)}
                onCancelEdit={cancelTitleEdit}
                onStartEdit={() => {
                  const node = nodes.find(n => n.id === selectedNodeId)
                  const currentTitle = node?.type === 'zone' 
                    ? node?.data?.name 
                    : (node?.data?.customTitle || node?.data?.label || '')
                  handleTitleEdit(selectedNodeId, currentTitle)
                }}
                onLinkedItemsChange={refreshLinkedCounts}
                router={router}
              />
            )}
            
            {/* Empty state - no AI results and no component selected */}
            {aiInsights.size === 0 && !selectedNodeId && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <Brain className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Click "AI Scan" to analyze your infrastructure</p>
                  <p className="text-xs mt-1 opacity-75">Or select a component for details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear All Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to clear all infrastructure components? This action will:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-4 list-disc list-inside">
              <li>Remove all {nodes.length} components and connections</li>
              <li>Clear all AI analysis results</li>
              <li>Reset the entire infrastructure diagram</li>
            </ul>
            <p className="text-sm text-red-600 font-medium">
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={clearAll}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function InfrastructureView(props: InfrastructureViewProps) {
  return (
    <ReactFlowProvider>
      <InfrastructureViewInner {...props} />
    </ReactFlowProvider>
  )
}