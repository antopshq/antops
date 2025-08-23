'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Status, Priority, Criticality, Urgency } from '@/lib/types'
import { Clock, User, AlertCircle, Hash, GripVertical } from 'lucide-react'
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
}

interface KanbanBoardProps {
  incidents: Incident[]
  onIncidentStatusChange?: (incidentId: string, newStatus: Status) => void
}

const statusColumns: { status: Status; title: string; color: string }[] = [
  { status: 'open', title: 'Open', color: 'bg-blue-50 border-blue-200' },
  { status: 'investigating', title: 'Investigating', color: 'bg-purple-50 border-purple-200' },
  { status: 'resolved', title: 'Resolved', color: 'bg-green-50 border-green-200' },
  { status: 'closed', title: 'Closed', color: 'bg-gray-50 border-gray-200' }
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
  incidents 
}: { 
  column: { status: Status; title: string; color: string }
  incidents: Incident[] 
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.status, // This should be: 'open', 'investigating', 'resolved', 'closed'
    data: {
      type: 'column',
      status: column.status
    }
  })
  
  console.log('🏗️ KanbanColumn created with droppable ID:', column.status)

  return (
    <div className="flex-shrink-0 w-80">
      <div className={`rounded-lg border-2 border-dashed ${column.color} min-h-[600px] ${isOver ? 'bg-opacity-75 border-solid' : ''}`}>
        <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{column.title}</h3>
            <Badge variant="secondary" className="bg-gray-100">
              {incidents.length}
            </Badge>
          </div>
        </div>
        
        <div ref={setNodeRef} className="p-3 min-h-[500px]">
          <SortableContext 
            items={incidents.map(incident => incident.id)} 
            strategy={verticalListSortingStrategy}
          >
            {incidents.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No incidents in {column.title.toLowerCase()}
              </div>
            ) : (
              incidents.map((incident) => (
                <SortableIncidentCard key={incident.id} incident={incident} />
              ))
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  )
}

function SortableIncidentCard({ incident }: { incident: Incident }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: incident.id,
    data: {
      type: 'incident',
      incident
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
      <IncidentCard incident={incident} dragHandleProps={listeners} />
    </div>
  )
}

function IncidentCard({ incident, dragHandleProps }: { incident: Incident, dragHandleProps?: any }) {
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
      
      <Link href={`/incidents/${incident.id}`}>
        <div className="cursor-pointer">
          <CardHeader className="pb-2">
            <div className="text-xs text-gray-400 mb-1">
              {incident.incident_number || ''}
            </div>
            
            <div className="flex items-start justify-between">
              <CardTitle className="text-sm font-medium line-clamp-2 pr-2">
                {incident.title}
              </CardTitle>
              <Badge variant="outline" className={getPriorityColor(incident.priority)}>
                {incident.priority}
              </Badge>
            </div>
        {incident.problemId && incident.problemTitle && (
          <div 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              window.location.href = `/problems/${incident.problemId}`
            }}
          >
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer w-fit">
              <AlertCircle className="w-3 h-3 mr-1" />
              {incident.problemTitle}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTime(incident.createdAt)}</span>
          </div>
          {incident.assignedToName && (
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[80px]">{incident.assignedToName}</span>
            </div>
          )}
        </div>


      </CardContent>
        </div>
      </Link>
    </Card>
  )
}

export function KanbanBoard({ incidents, onIncidentStatusChange }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor))

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    console.log('Drag end event:', { activeId: active.id, overId: over?.id, overData: over?.data?.current })

    if (!over) {
      console.log('No drop target, drag cancelled')
      return
    }

    // Only process drops onto columns, not other incidents
    if (over.data?.current?.type !== 'column') {
      console.log('Drop target is not a column, ignoring. Target type:', over.data?.current?.type)
      return
    }

    const activeIncident = incidents.find((incident) => incident.id === active.id)
    if (!activeIncident) {
      console.log('Active incident not found:', active.id)
      return
    }

    // Extract status from the column data
    const newStatus = over.data?.current?.status || over.id as Status
    
    console.log(`Incident ${activeIncident.id}: current status = "${activeIncident.status}", new status = "${newStatus}"`)
    
    // Only update if the status actually changed
    if (activeIncident.status !== newStatus) {
      if (onIncidentStatusChange) {
        console.log(`✅ Moving incident ${activeIncident.id} from ${activeIncident.status} to ${newStatus}`)
        onIncidentStatusChange(activeIncident.id, newStatus)
      } else {
        console.log('❌ onIncidentStatusChange callback not provided')
      }
    } else {
      console.log(`🔄 Incident ${activeIncident.id} dropped in same column (${activeIncident.status}), no update needed`)
    }
  }

  const activeIncident = activeId ? incidents.find((incident) => incident.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
    <div className="flex space-x-6 overflow-x-auto pb-6">
        {statusColumns.map((column) => {
          const columnIncidents = incidents.filter(incident => incident.status === column.status)
          
          return (
            <KanbanColumn
              key={column.status}
              column={column}
              incidents={columnIncidents}
            />
          )
        })}
      </div>
      <DragOverlay>
        {activeIncident ? (
          <div className="rotate-3 opacity-90">
            <IncidentCard incident={activeIncident} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}