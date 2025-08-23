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
import { datetimeLocalToISO, isoToDatetimeLocal, formatScheduledTimeDetailed } from '@/lib/date-utils'
import { ArrowLeft, Edit, X, AlertTriangle, AlertCircle, Clock, Wrench, Tag } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Link from 'next/link'
import { StatusHistoryEntry } from '@/components/changes/change-timeline'
import { CommentSection } from '@/components/comments/comment-section'
import { Tooltip } from '@/components/ui/tooltip'
import { tagsToArray, tagsFromArray } from '@/lib/tag-utils'
import { TagInput } from '@/components/ui/tag-input'
import { TagDisplay } from '@/components/ui/tag-display'
import { InfrastructureSelector } from '@/components/InfrastructureSelector'
import { ChangeApproval } from '@/components/changes/change-approval'
import { ChangeCompletion } from '@/components/changes/change-completion'

interface Change {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'draft' | 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  requestedBy: string
  assignedTo?: string
  assignedToName?: string
  scheduledFor?: string
  estimatedEndTime?: string
  rollbackPlan: string
  testPlan: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  tags: string[]
  affectedServices: string[]
  incidentId?: string
  problemId?: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  fullName?: string
  createdAt: string
}

interface Incident {
  id: string
  title: string
  priority: string
  status: string
  incident_number?: string
  createdAt: string
  assignedToName?: string
  resolvedAt?: string
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

function formatDescription(content: string) {
  if (!content) return ''
  
  // Check if content is already HTML (from Tiptap editor)
  const isHTML = content.includes('<p>') || content.includes('<ul>') || content.includes('<ol>') || content.includes('<h')
  
  if (isHTML) {
    // Content is already proper HTML from Tiptap, return as-is
    return content
  }
  
  // Legacy markdown conversion for old content
  // Convert markdown-style formatting to HTML
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

export default function ChangeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const changeId = params?.id as string

  const [change, setChange] = useState<Change | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [relatedIncident, setRelatedIncident] = useState<Incident | null>(null)
  const [relatedProblem, setRelatedProblem] = useState<Problem | null>(null)
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [error, setError] = useState('')

  const [editData, setEditData] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    status: 'draft' as const,
    assignedTo: 'unassigned',
    scheduledFor: '',
    estimatedEndTime: '',
    rollbackPlan: '',
    testPlan: '',
    affectedServices: [] as string[],
    tags: '',
    incidentId: 'none',
    problemId: 'none'
  })
  const [componentDetails, setComponentDetails] = useState<Record<string, {name: string, type: string, environment: string}>>({})

  // Fetch change details and team members
  useEffect(() => {
    if (!changeId) return

    const fetchData = async () => {
      try {
        // Fetch current user
        const userRes = await fetch('/api/auth/user')
        if (userRes.ok) {
          const userData = await userRes.json()
          setCurrentUser({ id: userData.user.id, role: userData.user.role })
        }

        // Fetch change details
        const changeRes = await fetch(`/api/changes/${changeId}`)
        if (changeRes.ok) {
          const changeData = await changeRes.json()
          setChange(changeData)
          
          // Initialize edit form with change data
          setEditData({
            title: changeData.title,
            description: changeData.description,
            priority: changeData.priority,
            status: changeData.status,
            assignedTo: changeData.assignedTo || 'unassigned',
            scheduledFor: changeData.scheduledFor ? isoToDatetimeLocal(changeData.scheduledFor) : '',
            estimatedEndTime: changeData.estimatedEndTime ? isoToDatetimeLocal(changeData.estimatedEndTime) : '',
            rollbackPlan: changeData.rollbackPlan,
            testPlan: changeData.testPlan,
            affectedServices: changeData.affectedServices || [],
            tags: tagsFromArray(changeData.tags || []),
            incidentId: changeData.incidentId || 'none',
            problemId: changeData.problemId || 'none'
          })

          // Fetch related incident details if there is one
          if (changeData?.incidentId) {
            const incidentRes = await fetch(`/api/incidents/${changeData.incidentId}`)
            if (incidentRes.ok) {
              const incidentData = await incidentRes.json()
              setRelatedIncident(incidentData)
            }
          }

          // Fetch related problem details if there is one
          if (changeData?.problemId) {
            const problemRes = await fetch(`/api/problems/${changeData.problemId}`)
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

        // Fetch incidents
        const incidentsRes = await fetch('/api/incidents')
        if (incidentsRes.ok) {
          const incidentsData = await incidentsRes.json()
          setIncidents(incidentsData.incidents || incidentsData)
        }

        // Fetch problems
        const problemsRes = await fetch('/api/problems')
        if (problemsRes.ok) {
          const problemsData = await problemsRes.json()
          setProblems(problemsData)
        }

        // Fetch status history
        const historyRes = await fetch(`/api/changes/${changeId}/status-history`)
        if (historyRes.ok) {
          const historyData = await historyRes.json()
          setStatusHistory(historyData.statusHistory)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setError('Failed to load change details')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [changeId])

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

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/changes/${changeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editData,
          assignedTo: editData.assignedTo === 'unassigned' ? null : editData.assignedTo || null,
          scheduledFor: editData.scheduledFor ? datetimeLocalToISO(editData.scheduledFor) : null,
          estimatedEndTime: editData.estimatedEndTime ? datetimeLocalToISO(editData.estimatedEndTime) : null,
          affectedServices: editData.affectedServices,
          tags: tagsToArray(editData.tags),
          incidentId: editData.incidentId === 'none' ? null : editData.incidentId || null,
          problemId: editData.problemId === 'none' ? null : editData.problemId || null
        })
      })

      if (res.ok) {
        const updatedChange = await res.json()
        setChange(updatedChange)
        
        // Fetch updated related incident details if incident changed
        if (editData.incidentId && editData.incidentId !== 'none') {
          const incidentRes = await fetch(`/api/incidents/${editData.incidentId}`)
          if (incidentRes.ok) {
            const incidentData = await incidentRes.json()
            setRelatedIncident(incidentData)
          }
        } else {
          setRelatedIncident(null)
        }
        
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
        
        // Refresh status history after update
        const historyRes = await fetch(`/api/changes/${changeId}/status-history`)
        if (historyRes.ok) {
          const historyData = await historyRes.json()
          setStatusHistory(historyData.statusHistory)
        }
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update change')
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

  const handleCancelClick = () => {
    if (!currentUser || !change) return
    
    // Check permissions
    if (!['owner', 'admin', 'manager'].includes(currentUser.role)) {
      setError('Insufficient permissions to cancel changes')
      return
    }

    // Check if change can be cancelled
    const cancellableStatuses = ['draft', 'pending', 'approved']
    if (!cancellableStatuses.includes(change.status)) {
      setError(`Cannot cancel change in ${change.status} status`)
      return
    }

    setShowCancelDialog(true)
  }

  const handleCancelConfirm = async () => {
    if (!currentUser || !change) return

    setCancelling(true)
    setError('')

    try {
      // First, cancel the change
      const res = await fetch(`/api/changes/${changeId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason.trim() || undefined
        })
      })

      const data = await res.json()

      if (res.ok) {
        // Add user's comment with cancel indicator
        const commentContent = cancelReason.trim() || 'Change cancelled without reason.'
        
        await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `❌ **CANCELLED** | ${commentContent}`,
            itemType: 'change',
            itemId: changeId
          })
        })

        // Close dialog and refresh
        setShowCancelDialog(false)
        setCancelReason('')
        window.location.reload()
      } else {
        setError(data.error || 'Failed to cancel change')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading change details...</div>
        </div>
      </ClientLayout>
    )
  }

  if (!change) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Change not found</div>
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
            <Link href="/changes">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Changes
              </Button>
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing && currentUser && ['owner', 'admin', 'manager'].includes(currentUser.role) && ['draft', 'pending', 'approved'].includes(change?.status || '') && (
              <Button 
                onClick={handleCancelClick} 
                disabled={cancelling}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Change
              </Button>
            )}
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} className="bg-gray-900 hover:bg-gray-800">
                <Edit className="w-4 h-4 mr-2" />
                Edit Change
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - left side */}
          <div className="lg:col-span-2">
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
                  <CardTitle className="text-2xl">{change.title}</CardTitle>
                )}
                <CardDescription className="mt-2">
                  Created {new Date(change.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {change.updatedAt !== change.createdAt && (
                    <>
                      <br />
                      Updated {new Date(change.updatedAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </>
                  )}
                </CardDescription>
              </div>
              
              {/* Top Right Info - JIRA Style */}
              <div className="ml-6 min-w-0 flex-shrink-0">
                <div className="space-y-3 text-right">
                  {/* Status and Priority Badges */}
                  <div className="flex items-center justify-end space-x-2">
                    <Badge variant="outline" className={getPriorityColor(change.priority)}>
                      {change.priority}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(change.status)}>
                      {change.status.replace('_', ' ')}
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
                        {change.assignedToName ? (
                          <Tooltip
                            content={
                              <div className="text-sm">
                                <div className="font-medium">{teamMembers.find(m => m.id === change.assignedTo)?.fullName || change.assignedToName}</div>
                                <div className="text-gray-300">{teamMembers.find(m => m.id === change.assignedTo)?.email}</div>
                                <div className="text-gray-300 mt-1">Role: {teamMembers.find(m => m.id === change.assignedTo)?.role || 'Member'}</div>
                                <div className="text-gray-300 text-xs mt-1">Joined {teamMembers.find(m => m.id === change.assignedTo)?.createdAt ? new Date(teamMembers.find(m => m.id === change.assignedTo)!.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}</div>
                              </div>
                            }
                            side="bottom"
                            align="end"
                          >
                            <span className="cursor-help hover:text-blue-600 transition-colors">
                              {change.assignedToName}
                            </span>
                          </Tooltip>
                        ) : (
                          'Unassigned'
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Scheduled Time */}
                  <div className="text-sm">
                    <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Scheduled</div>
                    {isEditing ? (
                      <Input
                        type="datetime-local"
                        value={editData.scheduledFor}
                        onChange={(e) => setEditData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                        className="w-48"
                      />
                    ) : (
                      <div className="font-medium text-gray-900">
                        {change.scheduledFor ? formatScheduledTimeDetailed(change.scheduledFor) : 'Not scheduled'}
                      </div>
                    )}
                  </div>
                  
                  {/* Estimated End Time */}
                  <div className="text-sm">
                    <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Estimated End</div>
                    {isEditing ? (
                      <Input
                        type="datetime-local"
                        value={editData.estimatedEndTime}
                        onChange={(e) => setEditData(prev => ({ ...prev, estimatedEndTime: e.target.value }))}
                        className="w-48"
                      />
                    ) : (
                      <div className="font-medium text-gray-900">
                        {change.estimatedEndTime ? formatScheduledTimeDetailed(change.estimatedEndTime) : 'Not estimated'}
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
                  placeholder="Describe the change in detail..."
                  minHeight="150px"
                />
              ) : (
                <div 
                  className="text-gray-900 bg-gray-50 p-4 rounded-lg prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: formatDescription(change.description) 
                  }}
                />
              )}
            </div>

            {/* Status and Priority */}
            {isEditing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Priority</Label>
                  <Select
                    value={editData.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                      setEditData(prev => ({ ...prev, priority: value }))
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
                    onValueChange={(value: 'draft' | 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'cancelled') => 
                      setEditData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}


            {/* Rollback Plan */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">Rollback Plan</Label>
              {isEditing ? (
                <TiptapEditor
                  value={editData.rollbackPlan}
                  onChange={(value) => setEditData(prev => ({ ...prev, rollbackPlan: value }))}
                  placeholder="Describe the rollback plan..."
                  minHeight="120px"
                />
              ) : (
                <div 
                  className="text-gray-900 bg-gray-50 p-4 rounded-lg prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: formatDescription(change.rollbackPlan) 
                  }}
                />
              )}
            </div>

            {/* Test Plan */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">Test Plan</Label>
              {isEditing ? (
                <TiptapEditor
                  value={editData.testPlan}
                  onChange={(value) => setEditData(prev => ({ ...prev, testPlan: value }))}
                  placeholder="Describe the test plan..."
                  minHeight="120px"
                />
              ) : (
                <div 
                  className="text-gray-900 bg-gray-50 p-4 rounded-lg prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: formatDescription(change.testPlan) 
                  }}
                />
              )}
            </div>


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
                  {change.affectedServices.length > 0 ? (
                    change.affectedServices.map((componentId) => (
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

        {/* Approval Component */}
        {currentUser && (
          <ChangeApproval
            changeId={changeId}
            status={change.status}
            userRole={currentUser.role as 'owner' | 'admin' | 'manager' | 'member' | 'viewer'}
            onStatusChange={() => window.location.reload()}
          />
        )}

        {/* Completion Component */}
        {currentUser && (
          <ChangeCompletion
            changeId={changeId}
            status={change.status}
            isAssigned={currentUser.id === change.assignedTo}
            estimatedEndTime={change.estimatedEndTime}
            onStatusChange={() => window.location.reload()}
          />
        )}


            {/* Comments Section */}
            <CommentSection 
              itemType="change" 
              itemId={changeId}
              className="border-0 shadow-sm"
            />
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Related Incident */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
                  Related Incident
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isEditing ? (
                  <Select
                    value={editData.incidentId}
                    onValueChange={(value: string) => 
                      setEditData(prev => ({ ...prev, incidentId: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Link to incident" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No related incident</SelectItem>
                      {incidents.map((incident) => (
                        <SelectItem key={incident.id} value={incident.id}>
                          {incident.incident_number && `${incident.incident_number} - `}{incident.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div>
                    {relatedIncident ? (
                      <div className="p-2 bg-orange-50 rounded border border-orange-200">
                        <Link href={`/incidents/${relatedIncident.id}`}>
                          <h4 className="text-sm font-medium text-gray-900 hover:text-orange-600 cursor-pointer">
                            {relatedIncident.title}
                          </h4>
                        </Link>
                        <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
                          <Badge variant="outline" className={getPriorityColor(relatedIncident.priority)}>
                            {relatedIncident.priority}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(relatedIncident.status)}>
                            {relatedIncident.status}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No related incident</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Problem */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                  Related Problem
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isEditing ? (
                  <Select
                    value={editData.problemId}
                    onValueChange={(value: string) => 
                      setEditData(prev => ({ ...prev, problemId: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Link to problem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No related problem</SelectItem>
                      {problems.map((problem) => (
                        <SelectItem key={problem.id} value={problem.id}>
                          {problem.problem_number && `${problem.problem_number} - `}{problem.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div>
                    {relatedProblem ? (
                      <div className="p-2 bg-red-50 rounded border border-red-200">
                        <Link href={`/problems/${relatedProblem.id}`}>
                          <h4 className="text-sm font-medium text-gray-900 hover:text-red-600 cursor-pointer">
                            {relatedProblem.title}
                          </h4>
                        </Link>
                        <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
                          <Badge variant="outline" className={getPriorityColor(relatedProblem.priority)}>
                            {relatedProblem.priority}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(relatedProblem.status)}>
                            {relatedProblem.status}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No related problem</p>
                      </div>
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
                    context="change"
                    placeholder="e.g., type:emergency, risk:low, service:web-app"
                    label=""
                  />
                ) : (
                  <TagDisplay tags={change.tags || []} size="sm" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Cancel Change</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel "{change?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            <Label htmlFor="cancel-reason" className="text-sm font-medium">
              Reason for cancellation (optional)
            </Label>
            <textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Provide a reason for cancelling this change..."
              className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              This reason will be posted as a comment on the change.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false)
                setCancelReason('')
              }}
              disabled={cancelling}
            >
              Keep Change
            </Button>
            <Button
              onClick={handleCancelConfirm}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  )
}