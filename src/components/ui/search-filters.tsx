'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Filter, X, ChevronDown, Check } from 'lucide-react'
import { Priority, ChangeStatus } from '@/lib/types'

export interface ActiveFilter {
  type: 'search' | 'priority' | 'status' | 'assignee' | 'service'
  value: string
  label: string
  onRemove: () => void
}

export interface SearchFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  showFilters: boolean
  onToggleFilters: () => void
  hasActiveFilters: boolean
  onClearFilters: () => void
  filterCount: number
  activeFilters?: ActiveFilter[]
  children?: React.ReactNode
}

export function SearchFilters({
  searchQuery,
  onSearchChange,
  showFilters,
  onToggleFilters,
  hasActiveFilters,
  onClearFilters,
  filterCount,
  activeFilters = [],
  children
}: SearchFiltersProps) {
  return (
    <>
      {/* Search and Filter Toggle */}
      <div className="flex items-center space-x-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFilters}
          className={showFilters ? 'bg-blue-50 border-blue-200' : ''}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 px-1 text-xs">
              {filterCount}
            </Badge>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, index) => (
            <Badge 
              key={`${filter.type}-${filter.value}-${index}`}
              variant="secondary" 
              className="flex items-center gap-1 bg-blue-100 text-blue-800 hover:bg-blue-200"
            >
              {filter.label}
              <button
                onClick={filter.onRemove}
                className="ml-1 hover:bg-blue-300 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <Card className="border-0 shadow-sm bg-gray-50">
          <CardContent className="pt-6">
            {children}
          </CardContent>
        </Card>
      )}
    </>
  )
}

interface MultiSelectOption {
  value: string
  label: string
  id?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
}

export function MultiSelect({ options, value, onChange, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false)

  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue]
    onChange(newValue)
  }

  const selectedCount = value.length
  const displayText = selectedCount === 0 
    ? placeholder
    : selectedCount === 1
      ? options.find(opt => opt.value === value[0])?.label || placeholder
      : `${selectedCount} selected`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          role="combobox"
          aria-expanded={open}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="max-h-60 overflow-auto">
          {options.map((option, index) => (
            <div
              key={option.id || option.value || `option-${index}`}
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleToggle(option.value)}
            >
              <Checkbox
                checked={value.includes(option.value)}
                onChange={() => {}} // Controlled by parent onClick
              />
              <span className="flex-1">{option.label}</span>
              {value.includes(option.value) && (
                <Check className="h-4 w-4 text-blue-600" />
              )}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export interface PriorityFilterProps {
  value: Priority[]
  onChange: (value: Priority[]) => void
  label?: string
}

export function PriorityFilter({ value, onChange, label = 'Priority' }: PriorityFilterProps) {
  const options = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ]

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <MultiSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder="All priorities"
      />
    </div>
  )
}

export interface AssigneeFilterProps {
  value: string[]
  onChange: (value: string[]) => void
  options: string[]
  label?: string
}

export function AssigneeFilter({ value, onChange, options, label = 'Assignee' }: AssigneeFilterProps) {
  const multiSelectOptions = options
    .filter(option => option !== 'all')
    .map(assignee => ({
      value: assignee,
      label: assignee === 'unassigned' ? 'Unassigned' : assignee
    }))

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <MultiSelect
        options={multiSelectOptions}
        value={value}
        onChange={onChange}
        placeholder="All assignees"
      />
    </div>
  )
}

export interface ServiceFilterProps {
  value: string[]
  onChange: (value: string[]) => void
  options: string[]
  label?: string
}

export function ServiceFilter({ value, onChange, options, label = 'Affected Services' }: ServiceFilterProps) {
  const multiSelectOptions = options
    .filter(option => option && option !== 'all' && option.trim() !== '') // Filter out empty/invalid options
    .map((service, index) => ({
      value: service,
      label: service,
      id: `${service}-${index}` // Add unique id to prevent key conflicts
    }))
    // Remove duplicates based on value
    .filter((option, index, array) => 
      array.findIndex(item => item.value === option.value) === index
    )

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <MultiSelect
        options={multiSelectOptions}
        value={value}
        onChange={onChange}
        placeholder={multiSelectOptions.length === 0 ? "Loading services..." : "All services"}
      />
    </div>
  )
}

export interface StatusFilterProps {
  value: ChangeStatus[]
  onChange: (value: ChangeStatus[]) => void
  label?: string
}

export function StatusFilter({ value, onChange, label = 'Status' }: StatusFilterProps) {
  const options = [
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      <MultiSelect
        options={options}
        value={value}
        onChange={onChange}
        placeholder="All statuses"
      />
    </div>
  )
}

export interface NoResultsProps {
  icon?: React.ReactNode
  title: string
  description: string
  onClearFilters: () => void
}

export function NoResults({ 
  icon = <Search className="w-12 h-12 text-gray-400 mb-4" />, 
  title, 
  description, 
  onClearFilters 
}: NoResultsProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-12">
        {icon}
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-center max-w-sm mb-6">
          {description}
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          <X className="w-4 h-4 mr-2" />
          Clear all filters
        </Button>
      </CardContent>
    </Card>
  )
}