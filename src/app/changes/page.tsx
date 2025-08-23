'use client'

import { useState, useEffect } from 'react'
import { ClientLayout } from '@/components/layout/client-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Priority, ChangeStatus, ServiceInfo } from '@/lib/types'
import { Plus, Clock, Settings, List, Calendar, Search, Filter, X, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { ChangesKanbanBoard } from '@/components/changes/changes-kanban-board'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchFilters, PriorityFilter, StatusFilter, AssigneeFilter, ServiceFilter } from '@/components/ui/search-filters'

function getPriorityColor(priority: Priority) {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200'
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getStatusColor(status: ChangeStatus) {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'approved': return 'bg-green-100 text-green-800 border-green-200'
    case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'completed': return 'bg-green-100 text-green-800 border-green-200'
    case 'failed': return 'bg-red-100 text-red-800 border-red-200'
    case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    return `${Math.round(diffInHours * 60)} minutes ago`
  } else if (diffInHours < 24) {
    return `${Math.round(diffInHours)} hours ago`
  } else {
    return `${Math.round(diffInHours / 24)} days ago`
  }
}

function formatScheduledTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString()
}

interface Change {
  id: string
  organizationId: string
  change_number?: string
  title: string
  description: string
  status: ChangeStatus
  priority: Priority
  requestedBy: string
  assignedTo?: string
  assignedToName?: string
  scheduledFor?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  rollbackPlan: string
  testPlan: string
  tags: string[]
  affectedServices: string[]
  serviceInfo?: ServiceInfo[]
}

export default function ChangesPage() {
  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>([])
  const [statusFilter, setStatusFilter] = useState<ChangeStatus[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([])
  const [serviceFilter, setServiceFilter] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<'priority' | 'created' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Handle change status change from drag and drop
  const handleChangeStatusChange = async (changeId: string, newStatus: ChangeStatus) => {
    const currentChange = changes.find(change => change.id === changeId)
    if (currentChange && currentChange.status === newStatus) {
      return
    }
    
    try {
      const response = await fetch(`/api/changes/${changeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setChanges(prev => 
          prev.map(change => 
            change.id === changeId 
              ? { ...change, status: newStatus }
              : change
          )
        )
      } else {
        console.error('Failed to update change status')
      }
    } catch (error) {
      console.error('Error updating change status:', error)
    }
  }

  useEffect(() => {
    const fetchChanges = async () => {
      try {
        const response = await fetch('/api/changes')
        if (response.ok) {
          const data = await response.json()
          setChanges(data)
        }
      } catch (error) {
        console.error('Failed to fetch changes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChanges()
  }, [])

  // Get all formatted services from changes with server-provided serviceInfo
  const allFormattedServices = [...new Set(
    changes.flatMap(change => 
      change.serviceInfo?.map(service => `${service.label} - ${service.environment}`) || []
    )
  )]

  // Sorting helper function
  const getPriorityValue = (priority: Priority): number => {
    switch (priority) {
      case 'critical': return 4
      case 'high': return 3
      case 'medium': return 2
      case 'low': return 1
      default: return 0
    }
  }

  const handleSort = (field: 'priority' | 'created') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Filter changes based on search and filter criteria
  const filteredChanges = changes.filter(change => {
    // Search query filter (change title or ID)
    const matchesSearch = searchQuery === '' || 
      change.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      change.id.toLowerCase().includes(searchQuery.toLowerCase())

    // Priority filter
    const matchesPriority = priorityFilter.length === 0 || priorityFilter.includes(change.priority)

    // Status filter
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(change.status)

    // Assignee filter
    const matchesAssignee = assigneeFilter.length === 0 || 
      assigneeFilter.some(filter => 
        (filter === 'unassigned' && !change.assignedToName) ||
        (filter !== 'unassigned' && change.assignedToName === filter)
      )

    // Service filter (match against formatted service names)
    const matchesService = serviceFilter.length === 0 || 
      serviceFilter.some(formattedService => {
        // Check if any of the change's serviceInfo matches the filter
        return change.serviceInfo?.some(service => 
          `${service.label} - ${service.environment}` === formattedService
        ) || false
      })

    return matchesSearch && matchesPriority && matchesStatus && matchesAssignee && matchesService
  }).sort((a, b) => {
    if (!sortField) return 0
    
    let comparison = 0
    if (sortField === 'priority') {
      comparison = getPriorityValue(a.priority) - getPriorityValue(b.priority)
    } else if (sortField === 'created') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Get unique values for filter dropdowns
  const uniqueAssignees = ['unassigned', ...new Set(
    changes
      .filter(change => change.assignedToName)
      .map(change => change.assignedToName!)
  )]
  
  const uniqueServices = allFormattedServices

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || priorityFilter.length > 0 || 
                          statusFilter.length > 0 || assigneeFilter.length > 0 || serviceFilter.length > 0

  // Count active filters
  const activeFilterCount = [
    searchQuery !== '',
    priorityFilter.length > 0,
    statusFilter.length > 0,
    assigneeFilter.length > 0,
    serviceFilter.length > 0
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setSearchQuery('')
    setPriorityFilter([])
    setStatusFilter([])
    setAssigneeFilter([])
    setServiceFilter([])
  }

  // Helper functions for individual filter removal
  const removePriorityFilter = (priority: Priority) => {
    setPriorityFilter(prev => prev.filter(p => p !== priority))
  }

  const removeStatusFilter = (status: ChangeStatus) => {
    setStatusFilter(prev => prev.filter(s => s !== status))
  }

  const removeAssigneeFilter = (assignee: string) => {
    setAssigneeFilter(prev => prev.filter(a => a !== assignee))
  }

  const removeServiceFilter = (service: string) => {
    setServiceFilter(prev => prev.filter(s => s !== service))
  }

  const clearSearchQuery = () => {
    setSearchQuery('')
  }

  // Helper function to format services for a change
  const formatChangeServices = (change: Change) => {
    if (!change.serviceInfo || change.serviceInfo.length === 0) {
      return 'None'
    }
    
    return change.serviceInfo
      .map(service => `${service.label} - ${service.environment}`)
      .join(', ')
  }

  // Create active filters array for display
  const activeFilters = [
    ...(searchQuery ? [{
      type: 'search' as const,
      value: searchQuery,
      label: `Search: "${searchQuery}"`,
      onRemove: clearSearchQuery
    }] : []),
    ...priorityFilter.map(priority => ({
      type: 'priority' as const,
      value: priority,
      label: `Priority: ${priority}`,
      onRemove: () => removePriorityFilter(priority)
    })),
    ...statusFilter.map(status => ({
      type: 'status' as const,
      value: status,
      label: `Status: ${status.replace('_', ' ')}`,
      onRemove: () => removeStatusFilter(status)
    })),
    ...assigneeFilter.map(assignee => ({
      type: 'assignee' as const,
      value: assignee,
      label: `Assignee: ${assignee === 'unassigned' ? 'Unassigned' : assignee}`,
      onRemove: () => removeAssigneeFilter(assignee)
    })),
    ...serviceFilter.map(service => ({
      type: 'service' as const,
      value: service,
      label: `Service: ${service}`,
      onRemove: () => removeServiceFilter(service)
    }))
  ]

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Change Calendar</h1>
            <p className="text-gray-600 mt-1">Visual overview of system changes and RFC pipeline</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('board')}
                className={viewMode === 'board' 
                  ? 'bg-white shadow-sm text-gray-900 hover:bg-gray-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }
              >
                <Calendar className="w-4 h-4 mr-2" />
                Calendar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' 
                  ? 'bg-white shadow-sm text-gray-900 hover:bg-gray-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }
              >
                <List className="w-4 h-4 mr-2" />
                List
              </Button>
            </div>
            <Link href="/changes/new">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Change
              </Button>
            </Link>
          </div>
        </div>

        <SearchFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearAllFilters}
          filterCount={activeFilterCount}
          activeFilters={activeFilters}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <PriorityFilter
              value={priorityFilter}
              onChange={setPriorityFilter}
            />
            
            <StatusFilter
              value={statusFilter}
              onChange={setStatusFilter}
            />
            
            <AssigneeFilter
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              options={uniqueAssignees}
            />
            
            <ServiceFilter
              value={serviceFilter}
              onChange={setServiceFilter}
              options={uniqueServices}
            />
          </div>
        </SearchFilters>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">Loading changes...</div>
          </div>
        ) : changes.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No changes found</h3>
              <p className="text-gray-600 text-center max-w-sm mb-6">
                Get started by creating your first change request to track system modifications.
              </p>
              <Link href="/changes/new">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Change
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : filteredChanges.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No changes match your filters</h3>
              <p className="text-gray-600 text-center max-w-sm mb-6">
                Try adjusting your search terms or filters to find changes.
              </p>
              <Button variant="outline" onClick={clearAllFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'board' ? (
          <ChangesKanbanBoard 
            changes={filteredChanges} 
            onChangeStatusChange={handleChangeStatusChange}
          />
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Priority</span>
                      {sortField === 'priority' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Assignee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Scheduled</th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('created')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Created</span>
                      {sortField === 'created' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredChanges.map((change) => (
                  <tr key={change.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono text-gray-900">
                        {change.change_number || change.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/changes/${change.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                        {change.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant="outline" 
                        className={`${getPriorityColor(change.priority)} text-xs`}
                      >
                        {change.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(change.status)} text-xs`}
                      >
                        {change.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {change.assignedToName || (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-500">
                        {change.scheduledFor ? formatScheduledTime(change.scheduledFor) : (
                          <span className="text-gray-400 italic">Not scheduled</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-500">
                        {formatRelativeTime(change.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ClientLayout>
  )
}