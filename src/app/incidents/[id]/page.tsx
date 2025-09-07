'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ClientLayout } from '@/components/layout/client-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Info, X, Clock, Wrench, ExternalLink, Tag, Settings, Plus, Trash2, Server, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import { Criticality, Urgency } from '@/lib/types'
import { calculatePriority, getCriticalityColor, getUrgencyColor, getPriorityExplanation } from '@/lib/itil-utils'
import { CommentSection } from '@/components/comments/comment-section'
import { Tooltip } from '@/components/ui/tooltip'
import { ClosureCommentDialog } from '@/components/incidents/closure-comment-dialog'
import { tagsToArray, tagsFromArray } from '@/lib/tag-utils'
import { TagInput } from '@/components/ui/tag-input'
import { TagDisplay } from '@/components/ui/tag-display'
import { InfrastructureSelector } from '@/components/InfrastructureSelector'

interface Incident {
  id: string
  incident_number?: string
  title: string
  description: string
  criticality: Criticality
  urgency: Urgency
  priority: 'low' | 'medium' | 'high' | 'critical'
  autoPriority?: boolean
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  assignedTo?: string
  assignedToName?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  problemId?: string
  customer?: string
  tags: string[]
  affectedServices: string[]
  links?: { title: string; url: string; type?: string }[]
}

interface Problem {
  id: string
  title: string
  priority: string
  status: string
  problem_number?: string
  createdAt: string
  assignedToName?: string
  resolvedAt?: string
}

interface Change {
  id: string
  title: string
  priority: string
  status: string
  change_number?: string
  createdAt: string
  assignedToName?: string
  scheduledFor?: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  fullName?: string
  createdAt: string
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200'
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'open': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'investigating': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
    case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function formatDescription(content: string) {
  if (!content) return ''
  
  // Check if content is already HTML (from Tiptap editor)
  const isHTML = content.includes('<p>') || content.includes('<ul>') || content.includes('<ol>') || content.includes('<h')
  
  if (isHTML) {
    // Content is already proper HTML from Tiptap, return as-is
    return content
  }
  
  // Legacy markdown conversion for old content
  let formatted = content
    // Convert mentions first
    .replace(
      /@\[([^\]]+)\]\(([^)]+)\)/g,
      '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">@$1</span>'
    )
    // Convert bold **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Convert italic *text*
    .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>')
    // Convert underline __text__
    .replace(/__(.*?)__/g, '<u>$1</u>')
    // Convert inline code `text`
    .replace(/`([^`]+)`/g, '<code class="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
    // Convert code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded-lg text-xs font-mono overflow-x-auto"><code>$1</code></pre>')
    // Convert quotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600">$1</blockquote>')
    // Convert bullet lists
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    // Convert numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>')
    // Convert links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 underline" target="_blank" rel="noopener noreferrer">$1</a>')
  
  // Wrap list items in ul/ol tags (simplified)
  if (formatted.includes('<li')) {
    formatted = formatted.replace(/(<li.*?>.*?<\/li>)/g, '<ul>$1</ul>')
  }

  return formatted
}

export default function IncidentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const incidentId = params?.id as string

  const [incident, setIncident] = useState<Incident | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [relatedProblem, setRelatedProblem] = useState<Problem | null>(null)
  const [relatedChanges, setRelatedChanges] = useState<Change[]>([])
  const [newLink, setNewLink] = useState({ title: '', url: '', type: 'other' })
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showClosureDialog, setShowClosureDialog] = useState(false)
  const [pendingClosureStatus, setPendingClosureStatus] = useState<'closed' | null>(null)

  const [editData, setEditData] = useState({
    title: '',
    description: '',
    criticality: 'medium' as Criticality,
    urgency: 'medium' as Urgency,
    autoPriority: true,
    status: 'open' as 'open' | 'investigating' | 'resolved',
    assignedTo: '',
    problemId: '',
    customer: '',
    affectedServices: [] as string[],
    tags: '',
    links: [] as { title: string; url: string; type?: string }[]
  })
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; name: string; size: number; type: string; file?: File; url?: string }[]>([])
  const [componentDetails, setComponentDetails] = useState<Record<string, {name: string, type: string, environment: string}>>({})
  const [slaConfigurations, setSlaConfigurations] = useState<Record<string, number>>({
    'critical': 2,
    'high': 8,
    'medium': 24,
    'low': 72
  })
  const [currentTime, setCurrentTime] = useState(new Date())

  // Calculate priority based on criticality and urgency
  const calculatedPriority = editData.autoPriority 
    ? calculatePriority(editData.criticality, editData.urgency)
    : 'medium'

  // SLO calculation functions
  const calculateSLOStatus = () => {
    if (!incident) return null
    
    const createdAt = new Date(incident.createdAt)
    const sloHours = slaConfigurations[incident.priority] || slaConfigurations['medium']
    
    // For resolved/closed incidents, use the resolution time
    const isResolved = incident.status === 'resolved' || incident.status === 'closed'
    const endTime = isResolved && incident.resolvedAt 
      ? new Date(incident.resolvedAt) 
      : currentTime
    
    const hoursElapsed = (endTime.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    const hoursRemaining = sloHours - hoursElapsed
    
    return {
      hoursElapsed: Math.floor(hoursElapsed),
      hoursRemaining: Math.floor(hoursRemaining),
      isBreached: hoursRemaining <= 0,
      isNearBreach: hoursRemaining > 0 && hoursRemaining <= 2, // Within 2 hours of breach
      isResolved,
      sloHours,
      percentElapsed: Math.min((hoursElapsed / sloHours) * 100, 100)
    }
  }

  const formatSLOTime = (hours: number) => {
    const absHours = Math.abs(hours)
    if (absHours < 24) {
      return `${absHours}h`
    }
    const days = Math.floor(absHours / 24)
    const remainingHours = absHours % 24
    if (remainingHours === 0) {
      return `${days}d`
    }
    return `${days}d ${remainingHours}h`
  }

  const sloStatus = calculateSLOStatus()

  // Fetch incident details and team members
  useEffect(() => {
    if (!incidentId) return

    const fetchData = async () => {
      try {
        // Fetch incident details
        const incidentRes = await fetch(`/api/incidents/${incidentId}`)
        if (incidentRes.ok) {
          const incidentData = await incidentRes.json()
          setIncident(incidentData)
          
          // Initialize edit form with incident data
          setEditData({
            title: incidentData.title,
            description: incidentData.description,
            criticality: incidentData.criticality || 'medium',
            urgency: incidentData.urgency || 'medium',
            autoPriority: incidentData.autoPriority !== false,
            status: incidentData.status,
            assignedTo: incidentData.assignedTo || 'unassigned',
            problemId: incidentData.problemId || 'none',
            customer: incidentData.customer || '',
            affectedServices: incidentData.affectedServices || [],
            tags: tagsFromArray(incidentData.tags || []),
            links: incidentData.links || []
          })

          // Fetch related problem details if there is one
          if (incidentData?.problemId) {
            const problemRes = await fetch(`/api/problems/${incidentData.problemId}`)
            if (problemRes.ok) {
              const problemData = await problemRes.json()
              setRelatedProblem(problemData)
            }
          }
        }

        // Fetch team members
        const teamRes = await fetch('/api/team')
        if (teamRes.ok) {
          const teamData = await teamRes.json()
          setTeamMembers(teamData.teamMembers)
        }

        // Fetch problems
        const problemsRes = await fetch('/api/problems')
        if (problemsRes.ok) {
          const problemsData = await problemsRes.json()
          setProblems(problemsData)
        }

        // Fetch related changes for this incident
        const changesRes = await fetch(`/api/changes?incidentId=${incidentId}`)
        if (changesRes.ok) {
          const changesData = await changesRes.json()
          setRelatedChanges(changesData)
        }

      } catch (error) {
        console.error('Error fetching incident data:', error)
        setError('Failed to load incident details')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [incidentId])

  // Fetch SLO configurations
  useEffect(() => {
    const fetchSLOConfigurations = async () => {
      try {
        const response = await fetch('/api/slo-configurations')
        if (response.ok) {
          const data = await response.json()
          const slaMap: Record<string, number> = {
            'critical': 2,
            'high': 8,
            'medium': 24,
            'low': 72
          }
          
          data.forEach((config: { priority: string; resolution_time_hours: number }) => {
            slaMap[config.priority] = config.resolution_time_hours
          })
          
          setSlaConfigurations(slaMap)
        }
      } catch (error) {
        console.error('Error fetching SLO configurations:', error)
      }
    }

    fetchSLOConfigurations()
  }, [])

  // Real-time SLO updates (refresh every minute, but stop for resolved incidents)
  useEffect(() => {
    if (!incident) return
    
    // Don't run timer for resolved/closed incidents
    if (incident.status === 'resolved' || incident.status === 'closed') return
    
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [incident])

  // Fetch component details when incident is loaded
  useEffect(() => {
    if (!incident?.affectedServices?.length) return

    const fetchComponentDetails = async () => {
      try {
        // Get all infrastructure components to resolve details
        const response = await fetch('/api/infrastructure/components')
        if (response.ok) {
          const data = await response.json()
          const detailsMap: Record<string, {name: string, type: string, environment: string}> = {}
          
          data.components.forEach((component: any) => {
            detailsMap[component.id] = {
              name: component.label || component.displayName || component.id,
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
  }, [incident?.affectedServices])


  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      // Check if there are new files to upload
      const hasNewFiles = attachedFiles.some(file => file.file)
      let res: Response
      
      if (hasNewFiles) {
        // Use FormData for file uploads
        const formData = new FormData()
        formData.append('title', editData.title)
        formData.append('description', editData.description)
        formData.append('criticality', editData.criticality)
        formData.append('urgency', editData.urgency)
        formData.append('priority', calculatedPriority)
        formData.append('status', editData.status)
        formData.append('assignedTo', editData.assignedTo === 'unassigned' ? '' : editData.assignedTo || '')
        formData.append('problemId', editData.problemId === 'none' ? '' : editData.problemId || '')
        formData.append('customer', editData.customer || '')
        formData.append('affectedServices', JSON.stringify(editData.affectedServices))
        formData.append('tags', JSON.stringify(tagsToArray(editData.tags)))
        formData.append('links', JSON.stringify(editData.links))
        
        // Add files to FormData
        attachedFiles.forEach((fileInfo) => {
          if (fileInfo.file) {
            formData.append('files', fileInfo.file)
          }
        })

        res = await fetch(`/api/incidents/${incidentId}`, {
          method: 'PUT',
          body: formData // Don't set Content-Type, let browser set it with boundary
        })
      } else {
        // Use JSON for text-only updates
        res = await fetch(`/api/incidents/${incidentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...editData,
            priority: calculatedPriority,
            assignedTo: editData.assignedTo === 'unassigned' ? null : editData.assignedTo || null,
            problemId: editData.problemId === 'none' ? null : editData.problemId || null,
            customer: editData.customer || null,
            affectedServices: editData.affectedServices,
            tags: tagsToArray(editData.tags),
            links: editData.links
          })
        })
      }

      if (res.ok) {
        const updatedIncident = await res.json()
        
        // Update the incident state with the server response, ensuring tags and links are arrays
        setIncident({
          ...updatedIncident,
          tags: updatedIncident.tags || [],
          links: updatedIncident.links || []
        })
        
        // Also update editData to keep it in sync
        setEditData({
          title: updatedIncident.title,
          description: updatedIncident.description,
          criticality: updatedIncident.criticality || 'medium',
          urgency: updatedIncident.urgency || 'medium',
          autoPriority: updatedIncident.autoPriority !== false,
          status: updatedIncident.status,
          assignedTo: updatedIncident.assignedTo || 'unassigned',
          problemId: updatedIncident.problemId || 'none',
          customer: updatedIncident.customer || '',
          affectedServices: updatedIncident.affectedServices || [],
          tags: tagsFromArray(updatedIncident.tags || []),
          links: updatedIncident.links || []
        })
        
        // Fetch updated related problem details if problem changed
        if (editData.problemId && editData.problemId !== 'none') {
          const problemRes = await fetch(`/api/problems/${editData.problemId}`)
          if (problemRes.ok) {
            const problemData = await problemRes.json()
            setRelatedProblem(problemData)
          }
        } else {
          setRelatedProblem(null)
        }
        
        setIsEditing(false)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update incident')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveComponent = (componentId: string) => {
    setEditData(prev => ({
      ...prev,
      affectedServices: prev.affectedServices.filter(id => id !== componentId)
    }))
  }

  const formatUrl = (url: string) => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return `https://${trimmedUrl}`
    }
    return trimmedUrl
  }

  const handleAddLink = () => {
    if (newLink.title.trim() && newLink.url.trim()) {
      const formattedLink = {
        ...newLink,
        url: formatUrl(newLink.url)
      }
      const updatedLinks = [...editData.links, formattedLink]
      setEditData(prev => ({
        ...prev,
        links: updatedLinks
      }))
      // Also update the incident state to reflect in UI immediately
      setIncident(prev => prev ? {
        ...prev,
        links: updatedLinks
      } : null)
      setNewLink({ title: '', url: '', type: 'other' })
    }
  }

  const handleRemoveLink = (index: number) => {
    const updatedLinks = editData.links.filter((_, i) => i !== index)
    setEditData(prev => ({
      ...prev,
      links: updatedLinks
    }))
    // Also update the incident state to reflect in UI immediately
    setIncident(prev => prev ? {
      ...prev,
      links: updatedLinks
    } : null)
  }

  const handleStatusChange = (newStatus: 'open' | 'investigating' | 'resolved' | 'closed') => {
    if (newStatus === 'closed') {
      // Show closure dialog for closed status
      setPendingClosureStatus('closed')
      setShowClosureDialog(true)
    } else {
      // For other statuses, update directly
      setEditData(prev => ({ ...prev, status: newStatus }))
    }
  }

  const handleClosureConfirm = async (closureReason: string) => {
    if (!pendingClosureStatus) return
    
    try {
      setSaving(true)
      
      // Update the incident status and include closure comment
      // This will trigger the API to create the comment automatically
      const updatedEditData = { 
        ...editData, 
        status: pendingClosureStatus 
      }
      
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedEditData,
          priority: calculatedPriority,
          assignedTo: updatedEditData.assignedTo === 'unassigned' ? null : updatedEditData.assignedTo || null,
          problemId: updatedEditData.problemId === 'none' ? null : updatedEditData.problemId || null,
          affectedServices: updatedEditData.affectedServices,
          tags: tagsToArray(updatedEditData.tags),
          links: updatedEditData.links,
          closureComment: closureReason // This will trigger the comment creation
        })
      })
      
      if (res.ok) {
        const updatedIncident = await res.json()
        
        // Update states
        setIncident({
          ...updatedIncident,
          tags: updatedIncident.tags || [],
          links: updatedIncident.links || []
        })
        
        setEditData({
          title: updatedIncident.title,
          description: updatedIncident.description,
          criticality: updatedIncident.criticality || 'medium',
          urgency: updatedIncident.urgency || 'medium',
          autoPriority: updatedIncident.autoPriority !== false,
          status: updatedIncident.status,
          assignedTo: updatedIncident.assignedTo || 'unassigned',
          problemId: updatedIncident.problemId || 'none',
          customer: updatedIncident.customer || '',
          affectedServices: updatedIncident.affectedServices || [],
          tags: tagsFromArray(updatedIncident.tags || []),
          links: updatedIncident.links || []
        })
        
        setIsEditing(false)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to close incident')
      }
      
      // Close dialog and reset state
      setShowClosureDialog(false)
      setPendingClosureStatus(null)
      
    } catch (error) {
      console.error('Error during closure:', error)
      setError('Failed to close incident')
    } finally {
      setSaving(false)
    }
  }

  const handleClosureCancel = () => {
    setShowClosureDialog(false)
    setPendingClosureStatus(null)
  }



  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading incident details...</div>
        </div>
      </ClientLayout>
    )
  }

  if (!incident) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Incident not found</div>
        </div>
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>
      <div className="max-w-7xl mx-auto">
        {/* Page Header with Edit Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/incidents">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Incidents
              </Button>
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            {/* SLO Alert Clock */}
            {sloStatus && !isEditing && (
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                sloStatus.isResolved
                  ? sloStatus.isBreached
                    ? 'bg-red-50 border-red-200 text-red-700' 
                    : 'bg-green-50 border-green-200 text-green-700'
                  : sloStatus.isBreached 
                  ? 'bg-red-50 border-red-200 text-red-700' 
                  : sloStatus.isNearBreach
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                  : 'bg-green-50 border-green-200 text-green-700'
              }`}>
                <Clock className={`w-4 h-4 ${
                  sloStatus.isResolved
                    ? sloStatus.isBreached
                      ? 'text-red-600'
                      : 'text-green-600'
                    : sloStatus.isBreached 
                    ? 'text-red-600' 
                    : sloStatus.isNearBreach 
                    ? 'text-yellow-600' 
                    : 'text-green-600'
                }`} />
                <div className="flex flex-col">
                  <span className="text-xs font-medium">
                    {sloStatus.isResolved 
                      ? sloStatus.isBreached
                        ? `Resolved late by ${formatSLOTime(Math.abs(sloStatus.hoursRemaining))}`
                        : `Resolved in ${formatSLOTime(sloStatus.hoursElapsed)}`
                      : sloStatus.isBreached 
                      ? `Overdue by ${formatSLOTime(Math.abs(sloStatus.hoursRemaining))}` 
                      : `${formatSLOTime(sloStatus.hoursRemaining)} left`
                    }
                  </span>
                  <span className="text-xs opacity-75">
                    SLO: {formatSLOTime(sloStatus.sloHours)}
                  </span>
                </div>
              </div>
            )}
            
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} className="bg-gray-900 hover:bg-gray-800">
                <Edit className="w-4 h-4 mr-2" />
                Edit Incident
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {isEditing ? (
                  <div className="space-y-2">
                    <Label htmlFor="edit-title" className="text-sm font-medium">Title</Label>
                    <Input
                      id="edit-title"
                      value={editData.title}
                      onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                      className="text-xl font-semibold"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-gray-400 mb-2">
                      {incident.incident_number || ''}
                    </div>
                    <CardTitle className="text-2xl">{incident.title}</CardTitle>
                  </div>
                )}
                <CardDescription className="mt-2">
                  Created {new Date(incident.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {incident.updatedAt !== incident.createdAt && 
                    ` • Updated ${new Date(incident.updatedAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`
                  }
                </CardDescription>
              </div>
              
              {/* Top Right Info - JIRA Style */}
              <div className="ml-6 min-w-0 flex-shrink-0">
                <div className="space-y-3 text-right">
                  {/* Status and Priority Badges */}
                  <div className="flex items-center justify-end space-x-2">
                    <Badge variant="outline" className={getPriorityColor(incident.priority)}>
                      {incident.priority}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(incident.status)}>
                      {incident.status}
                    </Badge>
                  </div>
                  
                  {/* Criticality and Urgency */}
                  <div className="flex items-center justify-end space-x-2">
                    <Badge variant="outline" className={`text-xs ${getCriticalityColor(incident.criticality)}`}>
                      Criticality: {incident.criticality}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${getUrgencyColor(incident.urgency)}`}>
                      Urgency: {incident.urgency}
                    </Badge>
                  </div>
                  
                  {/* Assignee */}
                  <div className="text-sm">
                    <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Assignee</div>
                    {isEditing ? (
                      <Select
                        value={editData.assignedTo}
                        onValueChange={(value: string) => 
                          setEditData(prev => ({ ...prev, assignedTo: value }))
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="font-medium text-gray-900">
                        {incident.assignedToName ? (
                          <Tooltip
                            content={
                              <div className="text-sm">
                                <div className="font-medium">{teamMembers.find(m => m.id === incident.assignedTo)?.fullName || incident.assignedToName}</div>
                                <div className="text-gray-300">{teamMembers.find(m => m.id === incident.assignedTo)?.email}</div>
                                <div className="text-gray-300 mt-1">Role: {teamMembers.find(m => m.id === incident.assignedTo)?.role || 'Member'}</div>
                                <div className="text-gray-300 text-xs mt-1">Joined {teamMembers.find(m => m.id === incident.assignedTo)?.createdAt ? new Date(teamMembers.find(m => m.id === incident.assignedTo)!.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}</div>
                              </div>
                            }
                            side="bottom"
                            align="end"
                          >
                            <span className="cursor-help hover:text-blue-600 transition-colors">
                              {incident.assignedToName}
                            </span>
                          </Tooltip>
                        ) : (
                          'Unassigned'
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Customer */}
                  <div className="text-sm">
                    <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Customer</div>
                    {isEditing ? (
                      <Input
                        value={editData.customer || ''}
                        onChange={(e) => setEditData(prev => ({ ...prev, customer: e.target.value }))}
                        className="w-48 h-8"
                        placeholder="Customer name (optional)"
                      />
                    ) : (
                      <div className="font-medium text-gray-900">
                        {incident.customer || <span className="text-gray-400 italic">None</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">Description</Label>
              {isEditing ? (
                <TiptapEditor
                  value={editData.description}
                  onChange={(value) => setEditData(prev => ({ ...prev, description: value }))}
                  placeholder="📝 Describe the incident in detail..."
                  minHeight="150px"
                  attachedFiles={attachedFiles}
                  onFilesChange={setAttachedFiles}
                  maxFiles={2}
                  maxFileSize={2 * 1024 * 1024}
                />
              ) : (
                <div 
                  className="text-gray-900 bg-gray-50 p-4 rounded-lg prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: formatDescription(incident.description) 
                  }}
                />
              )}
            </div>

            {/* ITIL Criticality and Urgency */}
            {isEditing && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Criticality</Label>
                    <Select
                      value={editData.criticality}
                      onValueChange={(value: Criticality) => 
                        setEditData(prev => ({ ...prev, criticality: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Urgency</Label>
                    <Select
                      value={editData.urgency}
                      onValueChange={(value: Urgency) => 
                        setEditData(prev => ({ ...prev, urgency: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Status</Label>
                    <Select
                      value={editData.status}
                      onValueChange={handleStatusChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Auto-calculated Priority Display */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">ITIL Priority Calculation</h4>
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={getCriticalityColor(editData.criticality)}>
                            Criticality: {editData.criticality}
                          </Badge>
                          <span className="text-gray-400">+</span>
                          <Badge variant="outline" className={getUrgencyColor(editData.urgency)}>
                            Urgency: {editData.urgency}
                          </Badge>
                          <span className="text-gray-400">=</span>
                          <Badge variant="outline" className={getPriorityColor(calculatedPriority)}>
                            Priority: {calculatedPriority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-blue-800">
                        {getPriorityExplanation(editData.criticality, editData.urgency)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}



            {/* Affected Services */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">Affected Infrastructure Components</Label>
              {isEditing ? (
                <div className="space-y-3">
                  {/* Show currently selected components with remove buttons */}
                  {editData.affectedServices.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-2">Currently linked components:</div>
                      <div className="flex flex-wrap gap-2">
                        {editData.affectedServices.map((componentId) => (
                          <div 
                            key={componentId} 
                            className="flex items-center gap-2 pr-1 py-2 px-3 bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 rounded-md"
                          >
                            <div className="mr-1 flex flex-col gap-0.5">
                              <span className="font-medium">{componentDetails[componentId]?.name || componentId}</span>
                              {componentDetails[componentId] && (
                                <div className="text-xs opacity-75">
                                  <span className="capitalize">{componentDetails[componentId].type}</span>
                                  <span className="mx-1">•</span>
                                  <span>{componentDetails[componentId].environment}</span>
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveComponent(componentId)}
                              className="h-4 w-4 p-0 hover:bg-orange-200 rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Infrastructure selector for adding new components */}
                  <div>
                    <div className="text-xs font-medium text-gray-600 mb-2">Add more components:</div>
                    <InfrastructureSelector
                      selectedComponents={editData.affectedServices}
                      onSelectionChange={(componentIds) => 
                        setEditData(prev => ({ ...prev, affectedServices: componentIds }))
                      }
                      placeholder="Select additional infrastructure components..."
                      label=""
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {incident.affectedServices.length > 0 ? (
                    incident.affectedServices.map((componentId) => (
                      <div
                        key={componentId}
                        className="cursor-pointer hover:bg-gray-200 transition-colors border rounded-md px-3 py-2 bg-gray-50"
                        onClick={() => router.push(`/infra?component=${componentId}`)}
                        title="Click to view in Infrastructure page"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-sm">
                            {componentDetails[componentId]?.name || componentId}
                          </span>
                          {componentDetails[componentId] && (
                            <div className="text-xs text-gray-600 flex items-center gap-2">
                              <span className="capitalize bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                {componentDetails[componentId].type}
                              </span>
                              <span className="text-gray-500">
                                {componentDetails[componentId].environment}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 italic">No infrastructure components linked</span>
                  )}
                </div>
              )}
            </div>


            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            {isEditing && (
              <div className="flex items-center space-x-3 pt-6 border-t border-gray-200">
                <Button onClick={handleSave} disabled={saving} className="bg-gray-900 hover:bg-gray-800">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

            {/* Comments Section */}
            <CommentSection 
              itemType="incident" 
              itemId={incidentId}
              className="border-0 shadow-sm"
              teamMembers={teamMembers}
            />
          </div>

          {/* Right Sidebar - Details Box */}
          <div className="lg:col-span-1 space-y-6">
            {/* Related Problems */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <div className="flex items-center">
                    <Wrench className="w-4 h-4 mr-2 text-red-600" />
                    Related Problems
                  </div>
                  {isEditing && (
                    <Link href="/problems/new" target="_blank">
                      <Button size="sm" variant="outline" className="h-6 text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        New
                      </Button>
                    </Link>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isEditing ? (
                  <div className="space-y-3">
                    {/* Problem Selection */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Link to Problem</Label>
                      <Select
                        value={editData.problemId}
                        onValueChange={(value: string) => 
                          setEditData(prev => ({ ...prev, problemId: value }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a problem to link..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No problem linked</SelectItem>
                          {problems.map((problem) => (
                            <SelectItem key={problem.id} value={problem.id}>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">
                                  {problem.problem_number || problem.id.substring(0, 8)}
                                </span>
                                <span className="truncate max-w-[200px]">{problem.title}</span>
                                <Badge variant="outline" className={`${getPriorityColor(problem.priority)} text-xs`}>
                                  {problem.priority}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Show selected problem details */}
                    {editData.problemId && editData.problemId !== 'none' && (
                      <div className="p-2 bg-red-50 rounded border border-red-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            {(() => {
                              const selectedProblem = problems.find(p => p.id === editData.problemId)
                              return selectedProblem ? (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                                    {selectedProblem.problem_number && (
                                      <span className="text-xs text-red-600 font-medium mr-1">
                                        {selectedProblem.problem_number}
                                      </span>
                                    )}
                                    {selectedProblem.title}
                                  </h4>
                                  <div className="flex items-center space-x-1 mt-1">
                                    <Badge variant="outline" className={`${getPriorityColor(selectedProblem.priority)} text-xs px-1 py-0`}>
                                      {selectedProblem.priority}
                                    </Badge>
                                    <Badge variant="outline" className={`${getStatusColor(selectedProblem.status)} text-xs px-1 py-0`}>
                                      {selectedProblem.status}
                                    </Badge>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">Problem not found</div>
                              )
                            })()}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditData(prev => ({ ...prev, problemId: 'none' }))}
                            className="h-6 w-6 p-0 hover:bg-red-200 text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {relatedProblem ? (
                      <div className="p-2 bg-red-50 rounded border border-red-200">
                        <Link href={`/problems/${relatedProblem.id}`}>
                          <h4 className="text-sm font-medium text-gray-900 hover:text-red-600 cursor-pointer mb-1">
                            {relatedProblem.problem_number && (
                              <span className="text-xs text-red-600 font-medium mr-1">
                                {relatedProblem.problem_number}
                              </span>
                            )}
                            {relatedProblem.title}
                          </h4>
                        </Link>
                        <div className="flex items-center space-x-1 mt-1">
                          <Badge variant="outline" className={`${getPriorityColor(relatedProblem.priority)} text-xs px-1 py-0`}>
                            {relatedProblem.priority}
                          </Badge>
                          <Badge variant="outline" className={`${getStatusColor(relatedProblem.status)} text-xs px-1 py-0`}>
                            {relatedProblem.status}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No related problems</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Related Changes */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <div className="flex items-center">
                    <LinkIcon className="w-4 h-4 mr-2 text-purple-600" />
                    Related Changes
                  </div>
                  {isEditing && (
                    <Link href="/changes/new" target="_blank">
                      <Button size="sm" variant="outline" className="h-6 text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        Link
                      </Button>
                    </Link>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {relatedChanges.length > 0 ? (
                  <div className="space-y-1">
                    {relatedChanges.map((change) => (
                      <div key={change.id} className="p-2 bg-purple-50 rounded border border-purple-200">
                        <Link href={`/changes/${change.id}`}>
                          <h4 className="text-sm font-medium text-gray-900 hover:text-purple-600 cursor-pointer mb-1">
                            {change.change_number && (
                              <span className="text-xs text-purple-600 font-medium mr-1">
                                {change.change_number}
                              </span>
                            )}
                            {change.title}
                          </h4>
                        </Link>
                        <div className="flex items-center space-x-1 mt-1">
                          <Badge variant="outline" className={`${getPriorityColor(change.priority)} text-xs px-1 py-0`}>
                            {change.priority}
                          </Badge>
                          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200 text-xs px-1 py-0">
                            {change.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {change.scheduledFor && (
                          <div className="text-xs text-gray-500 mt-1">
                            Scheduled: {new Date(change.scheduledFor).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-2">No related changes</p>
                    {isEditing && (
                      <Link href="/changes/new" target="_blank">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <Plus className="w-3 h-3 mr-1" />
                          Create Change
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>


            {/* Tags */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center">
                  <Tag className="w-4 h-4 mr-2 text-green-600" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isEditing ? (
                  <TagInput
                    value={editData.tags}
                    onChange={(value) => setEditData(prev => ({ ...prev, tags: value }))}
                    context="incident"
                    placeholder="e.g., environment:production, team:backend, category:database"
                    label=""
                  />
                ) : (
                  <TagDisplay tags={incident.tags || []} size="sm" />
                )}
              </CardContent>
            </Card>

            {/* External Links */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center">
                  <ExternalLink className="w-4 h-4 mr-2 text-orange-600" />
                  External Links
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {(incident.links?.length || 0) > 0 ? (
                    (incident.links || []).map((link, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200">
                        <div className="flex-1 min-w-0">
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs truncate block"
                          >
                            {link.title}
                          </a>
                          {link.type && (
                            <Badge variant="outline" className="text-xs px-1 py-0 mt-0.5">
                              {link.type}
                            </Badge>
                          )}
                        </div>
                        <ExternalLink className="w-3 h-3 text-gray-400 ml-1" />
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500">No external links</p>
                  )}
                  
                  {isEditing && (
                    <div className="mt-3 space-y-2 border-t pt-2">
                      <h4 className="text-xs font-medium text-gray-700">Add New Link</h4>
                      <div className="space-y-2">
                        <Input
                          placeholder="Link title"
                          value={newLink.title}
                          onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
                          className="text-xs h-7"
                        />
                        <Input
                          placeholder="URL"
                          value={newLink.url}
                          onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                          className="text-xs h-7"
                        />
                        <Select
                          value={newLink.type}
                          onValueChange={(value) => setNewLink(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger className="text-xs h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="zendesk">Zendesk</SelectItem>
                            <SelectItem value="jira">JIRA</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={handleAddLink}
                          size="sm"
                          className="w-full h-7 text-xs"
                          disabled={!newLink.title.trim() || !newLink.url.trim()}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Link
                        </Button>
                      </div>

                      {incident.links && incident.links.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-xs font-medium text-gray-600">Current Links:</h5>
                          {incident.links.map((link, index) => (
                            <div key={index} className="flex items-center justify-between p-1 bg-gray-50 rounded border">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium truncate">{link.title}</div>
                                <div className="text-xs text-gray-500 truncate">{link.url}</div>
                              </div>
                              <Button
                                onClick={() => handleRemoveLink(index)}
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-800 h-5 w-5 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Closure Comment Dialog */}
      <ClosureCommentDialog
        isOpen={showClosureDialog}
        onClose={handleClosureCancel}
        onConfirm={handleClosureConfirm}
        incidentTitle={incident?.title || ''}
        isSubmitting={saving}
      />
    </ClientLayout>
  )
}