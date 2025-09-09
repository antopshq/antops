'use client'

import { useState, useEffect } from 'react'
import { ClientLayout } from '@/components/layout/client-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Priority, Status, Criticality, Urgency, ServiceInfo } from '@/lib/types'
import { Plus, Clock, AlertTriangle, Link as LinkIcon, List, LayoutGrid, Hash, Search, Filter, X, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { KanbanBoard } from '@/components/incidents/kanban-board'
import { IncidentImport } from '@/components/incidents/incident-import'
import { ClosureCommentDialog } from '@/components/incidents/closure-comment-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchFilters, PriorityFilter, AssigneeFilter, ServiceFilter } from '@/components/ui/search-filters'

function getPriorityColor(priority: Priority) {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200'
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getStatusColor(status: Status) {
  switch (status) {
    case 'open': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'investigating': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
    case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200'
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

interface Incident {
  id: string
  organizationId: string
  incident_number?: string
  title: string
  description: string
  criticality: Criticality
  urgency: Urgency
  priority: Priority
  status: Status
  assignedTo?: string
  assignedToName?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  problemId?: string
  problemTitle?: string
  tags: string[]
  affectedServices: string[]
  serviceInfo?: ServiceInfo[]
  customer?: string
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board')
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([])
  const [serviceFilter, setServiceFilter] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<'priority' | 'created' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [closureDialog, setClosureDialog] = useState<{
    isOpen: boolean
    incidentId: string
    incidentTitle: string
    isSubmitting: boolean
  }>({
    isOpen: false,
    incidentId: '',
    incidentTitle: '',
    isSubmitting: false
  })

  // Handle importing incidents from JSON
  const handleIncidentImport = async (importedIncidents: any[]) => {
    const results = []
    
    for (const incident of importedIncidents) {
      try {
        const response = await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(incident)
        })

        if (response.ok) {
          const newIncident = await response.json()
          results.push(newIncident)
        } else {
          console.error('Failed to import incident:', incident.title)
        }
      } catch (error) {
        console.error('Error importing incident:', incident.title, error)
      }
    }

    // Refresh the incidents list
    if (results.length > 0) {
      const response = await fetch('/api/incidents')
      if (response.ok) {
        const data = await response.json()
        setIncidents(data)
      }
    }

    return results
  }

  // Handle incident status change from drag and drop
  const handleIncidentStatusChange = async (incidentId: string, newStatus: Status) => {
    console.log('🔄 handleIncidentStatusChange called:', { incidentId, newStatus })
    
    // Find the current incident to check if status is actually different
    const currentIncident = incidents.find(inc => inc.id === incidentId)
    if (currentIncident && currentIncident.status === newStatus) {
      console.log('🛑 Status unchanged, skipping API call:', currentIncident.status)
      return
    }

    // If moving to closed status, require a closure comment
    if (newStatus === 'closed') {
      setClosureDialog({
        isOpen: true,
        incidentId,
        incidentTitle: currentIncident?.title || 'Unknown Incident',
        isSubmitting: false
      })
      return
    }

    // For other status changes, proceed normally
    await updateIncidentStatus(incidentId, newStatus)
  }

  // Separate function to handle the actual status update
  const updateIncidentStatus = async (incidentId: string, newStatus: Status, closureComment?: string) => {
    try {
      // Find the current incident to preserve all existing data
      const currentIncident = incidents.find(inc => inc.id === incidentId)
      if (!currentIncident) {
        console.error('Current incident not found for update:', incidentId)
        return
      }

      // Preserve all existing data, only change the status
      const requestBody: any = {
        title: currentIncident.title,
        description: currentIncident.description,
        priority: currentIncident.priority,
        criticality: currentIncident.criticality,
        urgency: currentIncident.urgency,
        status: newStatus,
        assignedTo: currentIncident.assignedTo || '',
        problemId: currentIncident.problemId || '',
        affectedServices: currentIncident.affectedServices || [],
        tags: currentIncident.tags || [],
        links: []
      }
      
      // If there's a closure comment, include it
      if (closureComment) {
        requestBody.closureComment = closureComment
      }
      
      console.log('📡 Making API call to update incident:', incidentId, 'with body:', requestBody)
      
      const response = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const updatedIncident = await response.json()
        
        // Update local state
        setIncidents(prev => 
          prev.map(incident => 
            incident.id === incidentId 
              ? { ...incident, status: newStatus }
              : incident
          )
        )
      } else {
        const errorData = await response.json()
        console.error('Failed to update incident status. Status:', response.status, 'Error:', errorData)
      }
    } catch (error) {
      console.error('Error updating incident status:', error)
    }
  }

  // Handle closure comment confirmation
  const handleClosureConfirm = async (comment: string) => {
    setClosureDialog(prev => ({ ...prev, isSubmitting: true }))
    
    try {
      await updateIncidentStatus(closureDialog.incidentId, 'closed', comment)
      setClosureDialog({ isOpen: false, incidentId: '', incidentTitle: '', isSubmitting: false })
    } catch (error) {
      console.error('Error closing incident:', error)
      setClosureDialog(prev => ({ ...prev, isSubmitting: false }))
    }
  }

  // Handle closure comment cancellation
  const handleClosureCancel = () => {
    setClosureDialog({ isOpen: false, incidentId: '', incidentTitle: '', isSubmitting: false })
  }

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await fetch('/api/incidents')
        if (response.ok) {
          const data = await response.json()
          setIncidents(data)
        }
      } catch (error) {
        console.error('Failed to fetch incidents:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchIncidents()
  }, [])

  // Get all formatted services from incidents with server-provided serviceInfo
  const allFormattedServices = [...new Set(
    incidents.flatMap(incident => 
      incident.serviceInfo?.map(service => `${service.label} - ${service.environment}`) || []
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

  // Filter incidents based on search and filter criteria
  const filteredIncidents = incidents.filter(incident => {
    // Search query filter (incident number, title, or ID)
    const matchesSearch = searchQuery === '' || 
      incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.incident_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.id.toLowerCase().includes(searchQuery.toLowerCase())

    // Priority filter
    const matchesPriority = priorityFilter.length === 0 || priorityFilter.includes(incident.priority)

    // Assignee filter
    const matchesAssignee = assigneeFilter.length === 0 || 
      assigneeFilter.some(filter => 
        (filter === 'unassigned' && !incident.assignedToName) ||
        (filter !== 'unassigned' && incident.assignedToName === filter)
      )

    // Service filter (match against formatted service names)
    const matchesService = serviceFilter.length === 0 || 
      serviceFilter.some(formattedService => {
        // Check if any of the incident's serviceInfo matches the filter
        return incident.serviceInfo?.some(service => 
          `${service.label} - ${service.environment}` === formattedService
        ) || false
      })

    return matchesSearch && matchesPriority && matchesAssignee && matchesService
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
    incidents
      .filter(incident => incident.assignedToName)
      .map(incident => incident.assignedToName!)
  )]
  
  const uniqueServices = allFormattedServices

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== '' || priorityFilter.length > 0 || 
                          assigneeFilter.length > 0 || serviceFilter.length > 0

  // Count active filters
  const activeFilterCount = [
    searchQuery !== '',
    priorityFilter.length > 0,
    assigneeFilter.length > 0,
    serviceFilter.length > 0
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setSearchQuery('')
    setPriorityFilter([])
    setAssigneeFilter([])
    setServiceFilter([])
  }

  // Helper functions for individual filter removal
  const removePriorityFilter = (priority: Priority) => {
    setPriorityFilter(prev => prev.filter(p => p !== priority))
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

  // Helper function to format services for an incident
  const formatIncidentServices = (incident: Incident) => {
    if (!incident.serviceInfo || incident.serviceInfo.length === 0) {
      return 'None'
    }
    
    return incident.serviceInfo
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
            <h1 className="text-2xl font-semibold text-gray-900">Incidents</h1>
            <p className="text-gray-600 mt-1">Manage and track all incidents</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('board')}
                className={viewMode === 'board' 
                  ? 'bg-white shadow-sm text-gray-900 hover:bg-gray-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Board
              </Button>
            </div>
            <IncidentImport onImport={handleIncidentImport} />
            <Link href="/incidents/new">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Incident
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PriorityFilter
              value={priorityFilter}
              onChange={setPriorityFilter}
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
            <div className="text-gray-600">Loading incidents...</div>
          </div>
        ) : incidents.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No incidents found</h3>
              <p className="text-gray-600 text-center max-w-sm mb-6">
                Get started by creating your first incident to track and manage issues.
              </p>
              <Link href="/incidents/new">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Incident
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : filteredIncidents.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No incidents match your filters</h3>
              <p className="text-gray-600 text-center max-w-sm mb-6">
                Try adjusting your search terms or filters to find incidents.
              </p>
              <Button variant="outline" onClick={clearAllFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'board' ? (
          <KanbanBoard 
            incidents={filteredIncidents} 
            onIncidentStatusChange={handleIncidentStatusChange}
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Assignee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Customer</th>
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
                {filteredIncidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono text-gray-900">
                        {incident.incident_number || incident.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/incidents/${incident.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                        {incident.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant="outline" 
                        className={`${getPriorityColor(incident.priority)} text-xs`}
                      >
                        {incident.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant="outline" 
                        className={`${getStatusColor(incident.status)} text-xs`}
                      >
                        {incident.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {incident.assignedToName || (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {incident.customer || (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-500">
                        {formatRelativeTime(incident.createdAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Closure Comment Dialog */}
        <ClosureCommentDialog
          isOpen={closureDialog.isOpen}
          onClose={handleClosureCancel}
          onConfirm={handleClosureConfirm}
          incidentTitle={closureDialog.incidentTitle}
          isSubmitting={closureDialog.isSubmitting}
        />
      </div>
    </ClientLayout>
  )
}