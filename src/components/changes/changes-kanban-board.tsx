'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChangeStatus, Priority } from '@/lib/types'
import { formatScheduledTimeForCard, getScheduledUrgency } from '@/lib/date-utils'
import { Clock, User, Calendar, AlertTriangle, CheckCircle, GripVertical, FileText, Zap } from 'lucide-react'
import Link from 'next/link'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useDroppable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

interface Change {
  id: string
  organizationId: string
  title: string
  description: string
  status: ChangeStatus
  priority: Priority
  requestedBy: string
  assignedTo?: string
  assignedToName?: string
  scheduledFor?: string
  estimatedEndTime?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  rollbackPlan: string
  testPlan: string
  tags: string[]
  affectedServices: string[]
}

interface ChangesKanbanBoardProps {
  changes: Change[]
  onChangeStatusChange?: (changeId: string, newStatus: ChangeStatus) => void
}

const statusColumns: { 
  status: ChangeStatus
  title: string
  color: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}[] = [
  { 
    status: 'draft', 
    title: 'Draft', 
    color: 'bg-gray-50 border-gray-200',
    icon: FileText,
    description: 'Being planned'
  },
  { 
    status: 'pending', 
    title: 'Pending Review', 
    color: 'bg-yellow-50 border-yellow-200',
    icon: Clock,
    description: 'Awaiting approval'
  },
  { 
    status: 'approved', 
    title: 'Approved', 
    color: 'bg-green-50 border-green-200',
    icon: CheckCircle,
    description: 'Ready to implement'
  },
  { 
    status: 'in_progress', 
    title: 'In Progress', 
    color: 'bg-blue-50 border-blue-200',
    icon: Zap,
    description: 'Currently implementing'
  },
  { 
    status: 'completed', 
    title: 'Completed', 
    color: 'bg-emerald-50 border-emerald-200',
    icon: CheckCircle,
    description: 'Successfully completed'
  },
  { 
    status: 'failed', 
    title: 'Failed', 
    color: 'bg-red-50 border-red-200',
    icon: AlertTriangle,
    description: 'Implementation failed'
  },
  { 
    status: 'cancelled', 
    title: 'Cancelled', 
    color: 'bg-gray-50 border-gray-200',
    icon: FileText,
    description: 'Change cancelled'
  }
]

function getPriorityColor(priority: Priority) {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200'
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    return `${Math.round(diffInHours * 60)}m ago`
  } else if (diffInHours < 24) {
    return `${Math.round(diffInHours)}h ago`
  } else {
    return `${Math.round(diffInHours / 24)}d ago`
  }
}


function KanbanColumn({ 
  column, 
  changes 
}: { 
  column: { status: ChangeStatus; title: string; color: string; icon: React.ComponentType<{ className?: string }>; description: string }
  changes: Change[] 
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.status,
    data: {
      type: 'column',
      status: column.status
    }
  })

  const Icon = column.icon
  
  // Calculate upcoming scheduled changes for this column
  const upcomingCount = changes.filter(change => {
    if (!change.scheduledFor) return false
    const scheduled = new Date(change.scheduledFor)
    const now = new Date()
    const diffInHours = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffInHours > 0 && diffInHours < 24 // Next 24 hours
  }).length

  const urgentCount = changes.filter(change => {
    if (!change.scheduledFor) return false
    const scheduled = new Date(change.scheduledFor)
    const now = new Date()
    const diffInHours = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffInHours > 0 && diffInHours < 4 // Next 4 hours
  }).length
  
  return (
    <div className="flex-shrink-0 w-80">
      <div className={`rounded-lg border-2 border-dashed ${column.color} min-h-[600px] ${isOver ? 'bg-opacity-75 border-solid' : ''}`}>
        <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Icon className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">{column.title}</h3>
            </div>
            <div className="flex items-center space-x-1">
              <Badge variant="secondary" className="bg-gray-100">
                {changes.length}
              </Badge>
              {upcomingCount > 0 && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  {upcomingCount} today
                </Badge>
              )}
              {urgentCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                  {urgentCount} urgent
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500">{column.description}</p>
        </div>
        
        <div ref={setNodeRef} className="p-3 min-h-[500px]">
          <SortableContext 
            items={changes.map(change => change.id)} 
            strategy={verticalListSortingStrategy}
          >
            {changes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No changes in {column.title.toLowerCase()}
              </div>
            ) : (
              changes.map((change) => (
                <SortableChangeCard key={change.id} change={change} />
              ))
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  )
}

function SortableChangeCard({ change }: { change: Change }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: change.id,
    data: {
      type: 'change',
      change
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`mb-3 ${isDragging ? 'opacity-50' : ''}`}
    >
      <ChangeCard change={change} dragHandleProps={listeners} />
    </div>
  )
}

function ChangeCard({ change, dragHandleProps }: { change: Change, dragHandleProps?: Record<string, unknown> }) {
  const scheduledUrgency = getScheduledUrgency(change.scheduledFor)
  const [componentDetails, setComponentDetails] = useState<Record<string, {name: string, type: string, environment: string}>>({})

  // Fetch component details when change is loaded
  useEffect(() => {
    if (!change?.affectedServices?.length) return

    const fetchComponentDetails = async () => {
      try {
        // Get all infrastructure components to resolve details
        const response = await fetch('/api/infrastructure/components')
        if (response.ok) {
          const data = await response.json()
          const detailsMap: Record<string, {name: string, type: string, environment: string}> = {}
          
          data.components.forEach((component: any) => {
            detailsMap[component.id] = {
              name: component.name,
              type: component.type,
              environment: component.environment?.name || 'Unknown'
            }
          })
          
          setComponentDetails(detailsMap)
        }
      } catch (error) {
        console.error('Error fetching component details:', error)
      }
    }

    fetchComponentDetails()
  }, [change?.affectedServices])
  
  return (
    <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow relative group">
      {/* Drag Handle */}
      {dragHandleProps && (
        <div 
          {...dragHandleProps}
          className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
        >
          <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
        </div>
      )}
      
      {/* Scheduled urgency indicator */}
      {change.scheduledFor && (
        <div className={`absolute right-2 top-2 w-2 h-2 rounded-full ${
          scheduledUrgency === 'urgent' ? 'bg-red-500' : 
          scheduledUrgency === 'soon' ? 'bg-orange-500' : 'bg-blue-500'
        }`} />
      )}
      
      <Link href={`/changes/${change.id}`}>
        <div className="cursor-pointer">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm font-medium line-clamp-2 pr-2">
                {change.title}
              </CardTitle>
              <Badge variant="outline" className={getPriorityColor(change.priority)}>
                {change.priority}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {change.description}
            </p>
            
            {/* Scheduled time - prominent for calendar-like view */}
            {change.scheduledFor && (
              <div className={`flex items-center space-x-1 mb-2 text-xs font-medium ${
                scheduledUrgency === 'urgent' ? 'text-red-700' : 
                scheduledUrgency === 'soon' ? 'text-orange-700' : 'text-blue-700'
              }`}>
                <Calendar className="w-3 h-3" />
                <span>{formatScheduledTimeForCard(change.scheduledFor)}</span>
                {change.estimatedEndTime && (
                  <span className="text-gray-500">
                    → {formatScheduledTimeForCard(change.estimatedEndTime)}
                  </span>
                )}
              </div>
            )}
            
            {/* Show estimated end time even if no scheduled start time */}
            {!change.scheduledFor && change.estimatedEndTime && (
              <div className="flex items-center space-x-1 mb-2 text-xs font-medium text-gray-600">
                <Clock className="w-3 h-3" />
                <span>Ends: {formatScheduledTimeForCard(change.estimatedEndTime)}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatRelativeTime(change.createdAt)}</span>
              </div>
              {change.assignedToName && (
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span className="truncate max-w-[80px]">{change.assignedToName}</span>
                </div>
              )}
            </div>

            {/* Affected services - key for quick insight */}
            {change.affectedServices.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {change.affectedServices.slice(0, 2).map((service) => (
                  <div key={service} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1">
                    <div className="font-medium">
                      {componentDetails[service]?.name || service}
                    </div>
                    {componentDetails[service] && (
                      <div className="text-blue-600 opacity-75">
                        {componentDetails[service].type} • {componentDetails[service].environment}
                      </div>
                    )}
                  </div>
                ))}
                {change.affectedServices.length > 2 && (
                  <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    +{change.affectedServices.length - 2}
                  </Badge>
                )}
              </div>
            )}

          </CardContent>
        </div>
      </Link>
    </Card>
  )
}

function TimelineSummary({ changes }: { changes: Change[] }) {
  const now = new Date()
  
  // Get changes happening in next 24 hours
  const upcomingChanges = changes
    .filter(change => {
      if (!change.scheduledFor) return false
      const scheduled = new Date(change.scheduledFor)
      const diffInHours = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60)
      return diffInHours > 0 && diffInHours < 24
    })
    .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime())

  const urgentChanges = upcomingChanges.filter(change => {
    const scheduled = new Date(change.scheduledFor!)
    const diffInHours = (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffInHours < 4 // Next 4 hours
  })

  const inProgressCount = changes.filter(change => change.status === 'in_progress').length
  const pendingApprovalCount = changes.filter(change => change.status === 'pending').length

  if (upcomingChanges.length === 0 && inProgressCount === 0 && pendingApprovalCount === 0) {
    return null
  }

  return (
    <Card className="mb-6 border border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Change Calendar Overview</h3>
          </div>
          <div className="text-xs text-blue-700">
            {new Date().toLocaleDateString(undefined, { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Urgent Timeline */}
          {urgentChanges.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-900 text-sm">Urgent (Next 4h)</span>
              </div>
              {urgentChanges.slice(0, 2).map(change => (
                <div key={change.id} className="text-xs text-red-800 mb-1">
                  <span className="font-medium">{formatScheduledTimeForCard(change.scheduledFor!)}</span> - {change.title}
                </div>
              ))}
              {urgentChanges.length > 2 && (
                <div className="text-xs text-red-700">+{urgentChanges.length - 2} more</div>
              )}
            </div>
          )}

          {/* Upcoming Today */}
          {upcomingChanges.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-900 text-sm">Today ({upcomingChanges.length})</span>
              </div>
              {upcomingChanges.slice(0, 2).map(change => (
                <div key={change.id} className="text-xs text-orange-800 mb-1">
                  <span className="font-medium">{formatScheduledTimeForCard(change.scheduledFor!)}</span> - {change.title}
                </div>
              ))}
              {upcomingChanges.length > 2 && (
                <div className="text-xs text-orange-700">+{upcomingChanges.length - 2} more</div>
              )}
            </div>
          )}

          {/* Active Status */}
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-900 text-sm">Active Pipeline</span>
            </div>
            <div className="space-y-1">
              {inProgressCount > 0 && (
                <div className="text-xs text-green-800">
                  <span className="font-medium">{inProgressCount}</span> in progress
                </div>
              )}
              {pendingApprovalCount > 0 && (
                <div className="text-xs text-green-800">
                  <span className="font-medium">{pendingApprovalCount}</span> pending approval
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ChangesKanbanBoard({ changes, onChangeStatusChange }: ChangesKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || over.data?.current?.type !== 'column') {
      return
    }

    const activeChange = changes.find((change) => change.id === active.id)
    if (!activeChange) return

    const newStatus = over.data?.current?.status || over.id as ChangeStatus
    
    if (activeChange.status !== newStatus && onChangeStatusChange) {
      onChangeStatusChange(activeChange.id, newStatus)
    }
  }

  const activeChange = activeId ? changes.find((change) => change.id === activeId) : null

  return (
    <div className="space-y-6">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex space-x-4 overflow-x-auto pb-6">
          {statusColumns.map((column) => {
            const columnChanges = changes.filter(change => change.status === column.status)
            
            return (
              <KanbanColumn
                key={column.status}
                column={column}
                changes={columnChanges}
              />
            )
          })}
        </div>
        <DragOverlay>
          {activeChange ? (
            <div className="rotate-3 opacity-90">
              <ChangeCard change={activeChange} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}