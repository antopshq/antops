import { useState } from 'react'
import { Priority } from '@/lib/types'

export interface UseSearchFiltersOptions {
  initialSearchQuery?: string
  initialPriorityFilter?: Priority[]
  initialAssigneeFilter?: string[]
  initialServiceFilter?: string[]
  initialShowFilters?: boolean
}

export function useSearchFilters(options: UseSearchFiltersOptions = {}) {
  const [searchQuery, setSearchQuery] = useState(options.initialSearchQuery || '')
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>(options.initialPriorityFilter || [])
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>(options.initialAssigneeFilter || [])
  const [serviceFilter, setServiceFilter] = useState<string[]>(options.initialServiceFilter || [])
  const [showFilters, setShowFilters] = useState(options.initialShowFilters || false)

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

  const toggleFilters = () => {
    setShowFilters(!showFilters)
  }

  return {
    // State
    searchQuery,
    priorityFilter,
    assigneeFilter,
    serviceFilter,
    showFilters,
    
    // Setters
    setSearchQuery,
    setPriorityFilter,
    setAssigneeFilter,
    setServiceFilter,
    setShowFilters,
    
    // Computed values
    hasActiveFilters,
    activeFilterCount,
    
    // Actions
    clearAllFilters,
    toggleFilters,
    removePriorityFilter,
    removeAssigneeFilter,
    removeServiceFilter,
    clearSearchQuery
  }
}

export interface FilterableItem {
  id: string
  assignedToName?: string
  affectedServices: string[]
  priority: Priority
}

export function getUniqueAssignees<T extends FilterableItem>(items: T[]): string[] {
  return ['all', 'unassigned', ...new Set(
    items
      .filter(item => item.assignedToName)
      .map(item => item.assignedToName!)
  )]
}

export function getUniqueServices<T extends FilterableItem>(items: T[]): string[] {
  return ['all', ...new Set(
    items.flatMap(item => item.affectedServices)
  )]
}

export function createSearchFilter<T extends { title: string; id: string; incident_number?: string }>(
  searchQuery: string
) {
  return (item: T) => {
    if (searchQuery === '') return true
    
    const query = searchQuery.toLowerCase()
    return (
      item.title.toLowerCase().includes(query) ||
      item.id.toLowerCase().includes(query) ||
      (item.incident_number && item.incident_number.toLowerCase().includes(query))
    )
  }
}

export function createPriorityFilter<T extends { priority: Priority }>(
  priorityFilter: Priority[]
) {
  return (item: T) => priorityFilter.length === 0 || priorityFilter.includes(item.priority)
}

export function createAssigneeFilter<T extends { assignedToName?: string }>(
  assigneeFilter: string[]
) {
  return (item: T) => {
    if (assigneeFilter.length === 0) return true
    
    for (const filter of assigneeFilter) {
      if (filter === 'unassigned' && !item.assignedToName) return true
      if (filter !== 'unassigned' && item.assignedToName === filter) return true
    }
    
    return false
  }
}

export function createServiceFilter<T extends { affectedServices: string[] }>(
  serviceFilter: string[]
) {
  return (item: T) => {
    if (serviceFilter.length === 0) return true
    return serviceFilter.some(filter => item.affectedServices.includes(filter))
  }
}