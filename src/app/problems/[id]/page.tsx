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
import { ArrowLeft, Edit, AlertCircle, Clock, X, Wrench, AlertTriangle, Plus, Tag } from 'lucide-react'
import Link from 'next/link'
import { CommentSection } from '@/components/comments/comment-section'
import { Tooltip } from '@/components/ui/tooltip'
import { tagsToArray, tagsFromArray } from '@/lib/tag-utils'
import { TagInput } from '@/components/ui/tag-input'
import { TagDisplay } from '@/components/ui/tag-display'
import { InfrastructureSelector } from '@/components/InfrastructureSelector'

interface Problem {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'identified' | 'investigating' | 'known_error' | 'resolved' | 'closed'
  assignedTo?: string
  assignedToName?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  rootCause?: string
  workaround?: string
  solution?: string
  tags: string[]
  affectedServices: string[]
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
  // Handle both problem and incident statuses
  switch (status) {
    // Problem statuses
    case 'identified': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'investigating': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'known_error': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
    case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200'
    // Incident statuses
    case 'open': return 'bg-blue-100 text-blue-800 border-blue-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'known_error': return 'Known Error'
    default: return status.charAt(0).toUpperCase() + status.slice(1)
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

export default function ProblemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const problemId = params?.id as string

  const [problem, setProblem] = useState<Problem | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [relatedIncidents, setRelatedIncidents] = useState<any[]>([])
  const [relatedChanges, setRelatedChanges] = useState<any[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [editData, setEditData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    status: 'identified' as 'identified' | 'investigating' | 'known_error' | 'resolved' | 'closed',
    assignedTo: '',
    rootCause: '',
    workaround: '',
    solution: '',
    affectedServices: [] as string[],
    tags: ''
  })
  const [componentDetails, setComponentDetails] = useState<Record<string, {name: string, type: string, environment: string}>>({})
  
  const [availableIncidents, setAvailableIncidents] = useState<any[]>([])
  const [availableChanges, setAvailableChanges] = useState<any[]>([])

  // Fetch problem details and team members
  useEffect(() => {
    if (!problemId) return

    const fetchData = async () => {
      try {
        // Fetch problem details
        const problemRes = await fetch(`/api/problems/${problemId}`)
        if (problemRes.ok) {
          const problemData = await problemRes.json()
          setProblem(problemData)
          
          // Initialize edit form with problem data
          setEditData({
            title: problemData.title,
            description: problemData.description,
            priority: problemData.priority,
            status: problemData.status,
            assignedTo: problemData.assignedTo || 'unassigned',
            rootCause: problemData.rootCause || '',
            workaround: problemData.workaround || '',
            solution: problemData.solution || '',
            affectedServices: problemData.affectedServices || [],
            tags: tagsFromArray(problemData.tags || [])
          })
        }

        // Fetch team members
        const teamRes = await fetch('/api/team')
        if (teamRes.ok) {
          const teamData = await teamRes.json()
          setTeamMembers(teamData.teamMembers)
        }

        // Fetch related incidents
        if (problemId) {
          const incidentsRes = await fetch(`/api/problems/${problemId}/incidents`)
          if (incidentsRes.ok) {
            const incidents = await incidentsRes.json()
            setRelatedIncidents(incidents)
          }
        }

        // Fetch related changes
        if (problemId) {
          const changesRes = await fetch(`/api/problems/${problemId}/changes`)
          if (changesRes.ok) {
            const changes = await changesRes.json()
            setRelatedChanges(changes)
          }
        }

        // Fetch all available incidents for linking (unlinked to any problem)
        const allIncidentsRes = await fetch('/api/incidents')
        if (allIncidentsRes.ok) {
          const allIncidents = await allIncidentsRes.json()
          const unlinkedIncidents = allIncidents.filter((incident: any) => !incident.problemId)
          setAvailableIncidents(unlinkedIncidents)
        }

        // Fetch all available changes for linking (unlinked to any problem)
        const allChangesRes = await fetch('/api/changes')
        if (allChangesRes.ok) {
          const allChanges = await allChangesRes.json()
          const unlinkedChanges = allChanges.filter((change: any) => !change.problemId)
          setAvailableChanges(unlinkedChanges)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setError('Failed to load problem details')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [problemId])

  // Fetch component details when problem is loaded
  useEffect(() => {
    if (!problem?.affectedServices?.length) return

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
  }, [problem?.affectedServices])

  const handleSave = async () => {
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/problems/${problemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editData,
          assignedTo: editData.assignedTo === 'unassigned' ? null : editData.assignedTo || null,
          rootCause: editData.rootCause || undefined,
          workaround: editData.workaround || undefined,
          solution: editData.solution || undefined,
          affectedServices: editData.affectedServices,
          tags: tagsToArray(editData.tags)
        })
      })

      if (res.ok) {
        const updatedProblem = await res.json()
        setProblem(updatedProblem)
        setIsEditing(false)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update problem')
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

  const handleLinkIncident = async (incidentId: string) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: problemId })
      })

      if (res.ok) {
        // Refresh the related incidents and available incidents
        const incidentsRes = await fetch(`/api/problems/${problemId}/incidents`)
        if (incidentsRes.ok) {
          const incidents = await incidentsRes.json()
          setRelatedIncidents(incidents)
        }

        // Update available incidents
        setAvailableIncidents(prev => prev.filter(incident => incident.id !== incidentId))
      }
    } catch (error) {
      console.error('Failed to link incident:', error)
    }
  }

  const handleUnlinkIncident = async (incidentId: string) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: null })
      })

      if (res.ok) {
        // Refresh the related incidents
        const incidentsRes = await fetch(`/api/problems/${problemId}/incidents`)
        if (incidentsRes.ok) {
          const incidents = await incidentsRes.json()
          setRelatedIncidents(incidents)
        }

        // Add back to available incidents
        const incidentRes = await fetch(`/api/incidents/${incidentId}`)
        if (incidentRes.ok) {
          const incident = await incidentRes.json()
          setAvailableIncidents(prev => [...prev, incident])
        }
      }
    } catch (error) {
      console.error('Failed to unlink incident:', error)
    }
  }

  const handleLinkChange = async (changeId: string) => {
    try {
      const res = await fetch(`/api/changes/${changeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: problemId })
      })

      if (res.ok) {
        // Refresh the related changes and available changes
        const changesRes = await fetch(`/api/problems/${problemId}/changes`)
        if (changesRes.ok) {
          const changes = await changesRes.json()
          setRelatedChanges(changes)
        }

        // Update available changes
        setAvailableChanges(prev => prev.filter(change => change.id !== changeId))
      }
    } catch (error) {
      console.error('Failed to link change:', error)
    }
  }

  const handleUnlinkChange = async (changeId: string) => {
    try {
      const res = await fetch(`/api/changes/${changeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: null })
      })

      if (res.ok) {
        // Refresh the related changes
        const changesRes = await fetch(`/api/problems/${problemId}/changes`)
        if (changesRes.ok) {
          const changes = await changesRes.json()
          setRelatedChanges(changes)
        }

        // Add back to available changes
        const changeRes = await fetch(`/api/changes/${changeId}`)
        if (changeRes.ok) {
          const change = await changeRes.json()
          setAvailableChanges(prev => [...prev, change])
        }
      }
    } catch (error) {
      console.error('Failed to unlink change:', error)
    }
  }

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading problem details...</div>
        </div>
      </ClientLayout>
    )
  }

  if (!problem) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Problem not found</div>
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
            <Link href="/problems">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Problems
              </Button>
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} className="bg-gray-900 hover:bg-gray-800">
                <Edit className="w-4 h-4 mr-2" />
                Edit Problem
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
                      {(problem as any).problem_number || ''}
                    </div>
                    <CardTitle className="text-2xl">{problem.title}</CardTitle>
                  </div>
                )}
                <CardDescription className="mt-2">
                  Created {new Date(problem.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {problem.updatedAt !== problem.createdAt && 
                    ` • Updated ${new Date(problem.updatedAt).toLocaleDateString('en-US', { 
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
                    <Badge variant="outline" className={getPriorityColor(problem.priority)}>
                      {problem.priority}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(problem.status)}>
                      {getStatusLabel(problem.status)}
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
                        {problem.assignedToName ? (
                          <Tooltip
                            content={
                              <div className="text-sm">
                                <div className="font-medium">{teamMembers.find(m => m.id === problem.assignedTo)?.fullName || problem.assignedToName}</div>
                                <div className="text-gray-300">{teamMembers.find(m => m.id === problem.assignedTo)?.email}</div>
                                <div className="text-gray-300 mt-1">Role: {teamMembers.find(m => m.id === problem.assignedTo)?.role || 'Member'}</div>
                                <div className="text-gray-300 text-xs mt-1">Joined {teamMembers.find(m => m.id === problem.assignedTo)?.createdAt ? new Date(teamMembers.find(m => m.id === problem.assignedTo)!.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}</div>
                              </div>
                            }
                            side="bottom"
                            align="end"
                          >
                            <span className="cursor-help hover:text-blue-600 transition-colors">
                              {problem.assignedToName}
                            </span>
                          </Tooltip>
                        ) : (
                          'Unassigned'
                        )}
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
                  placeholder="Describe the problem in detail..."
                  minHeight="150px"
                />
              ) : (
                <div 
                  className="text-gray-900 bg-gray-50 p-4 rounded-lg prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: formatDescription(problem.description) 
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
                    onValueChange={(value: 'identified' | 'investigating' | 'known_error' | 'resolved' | 'closed') => 
                      setEditData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="identified">Identified</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="known_error">Known Error</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}


            {/* Root Cause */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">Root Cause</Label>
              {isEditing ? (
                <TiptapEditor
                  value={editData.rootCause}
                  onChange={(value) => setEditData(prev => ({ ...prev, rootCause: value }))}
                  placeholder="Identify the root cause..."
                  minHeight="120px"
                />
              ) : (
                <div 
                  className="text-gray-900 bg-gray-50 p-4 rounded-lg prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: formatDescription(problem.rootCause || 'Not identified yet') 
                  }}
                />
              )}
            </div>

            {/* Workaround */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">Workaround</Label>
              {isEditing ? (
                <TiptapEditor
                  value={editData.workaround}
                  onChange={(value) => setEditData(prev => ({ ...prev, workaround: value }))}
                  placeholder="Describe the workaround..."
                  minHeight="120px"
                />
              ) : (
                <div 
                  className="text-gray-900 bg-gray-50 p-4 rounded-lg prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: formatDescription(problem.workaround || 'No workaround available') 
                  }}
                />
              )}
            </div>

            {/* Solution */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700">Solution</Label>
              {isEditing ? (
                <TiptapEditor
                  value={editData.solution}
                  onChange={(value) => setEditData(prev => ({ ...prev, solution: value }))}
                  placeholder="Describe the solution..."
                  minHeight="120px"
                />
              ) : (
                <div 
                  className="text-gray-900 bg-gray-50 p-4 rounded-lg prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: formatDescription(problem.solution || 'Solution pending') 
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
                            className="flex items-center gap-2 pr-1 py-2 px-3 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-md"
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
                              className="h-4 w-4 p-0 hover:bg-red-200 rounded-full"
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
                  {problem.affectedServices.length > 0 ? (
                    problem.affectedServices.map((componentId) => (
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


            {/* Manage Related Incidents - Edit Mode Only */}
            {isEditing && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-gray-700">Related Incidents ({relatedIncidents.length})</Label>
                  {availableIncidents.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Select onValueChange={handleLinkIncident}>
                        <SelectTrigger className="w-64 h-8 text-xs">
                          <SelectValue placeholder="+ Link incident" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableIncidents.map((incident) => (
                            <SelectItem key={incident.id} value={incident.id}>
                              <div className="flex items-center justify-between w-full">
                                <span className="truncate">{incident.title}</span>
                                <Badge variant="outline" className={`ml-2 ${getPriorityColor(incident.priority)}`}>
                                  {incident.priority}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                {/* Currently linked incidents - compact view */}
                {relatedIncidents.length > 0 ? (
                  <div className="space-y-1">
                    {relatedIncidents.map((incident) => (
                      <div key={incident.id} className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <AlertTriangle className="w-3 h-3 text-orange-600 flex-shrink-0" />
                          <span className="font-medium truncate">{incident.title}</span>
                          <Badge variant="outline" className={`${getPriorityColor(incident.priority)} text-xs`}>
                            {incident.priority}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnlinkIncident(incident.id)}
                          className="h-6 w-6 p-0 text-orange-600 hover:bg-orange-100 flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-xs text-gray-500">No incidents linked</p>
                  </div>
                )}
              </div>
            )}

            {/* Manage Related Changes - Edit Mode Only */}
            {isEditing && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-gray-700">Related Changes ({relatedChanges.length})</Label>
                  {availableChanges.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Select onValueChange={handleLinkChange}>
                        <SelectTrigger className="w-64 h-8 text-xs">
                          <SelectValue placeholder="+ Link change" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableChanges.map((change) => (
                            <SelectItem key={change.id} value={change.id}>
                              <div className="flex items-center justify-between w-full">
                                <span className="truncate">{change.title}</span>
                                <Badge variant="outline" className={`ml-2 ${getPriorityColor(change.priority)}`}>
                                  {change.priority}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                {/* Currently linked changes - compact view */}
                {relatedChanges.length > 0 ? (
                  <div className="space-y-1">
                    {relatedChanges.map((change) => (
                      <div key={change.id} className="flex items-center justify-between p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Wrench className="w-3 h-3 text-purple-600 flex-shrink-0" />
                          <span className="font-medium truncate">{change.title}</span>
                          <Badge variant="outline" className={`${getPriorityColor(change.priority)} text-xs`}>
                            {change.priority}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUnlinkChange(change.id)}
                          className="h-6 w-6 p-0 text-purple-600 hover:bg-purple-100 flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-xs text-gray-500">No changes linked</p>
                  </div>
                )}
              </div>
            )}


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
              itemType="problem" 
              itemId={problemId}
              className="border-0 shadow-sm"
            />
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Related Incidents */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
                    Related Incidents ({relatedIncidents.length})
                  </div>
                  {isEditing && availableIncidents.length > 0 && (
                    <Select onValueChange={handleLinkIncident}>
                      <SelectTrigger className="w-32 h-6 text-xs">
                        <SelectValue placeholder="+ Link" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableIncidents.map((incident) => (
                          <SelectItem key={incident.id} value={incident.id}>
                            {incident.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {relatedIncidents.length > 0 ? (
                  <div className="space-y-2">
                    {relatedIncidents.map((incident) => (
                      <div key={incident.id} className="p-2 bg-orange-50 rounded border border-orange-200">
                        <div className="flex items-center justify-between">
                          <Link href={`/incidents/${incident.id}`}>
                            <h4 className="text-sm font-medium text-gray-900 hover:text-orange-600 cursor-pointer">
                              {incident.title}
                            </h4>
                          </Link>
                          {isEditing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUnlinkIncident(incident.id)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
                          <Badge variant="outline" className={getPriorityColor(incident.priority)}>
                            {incident.priority}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(incident.status)}>
                            {incident.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No related incidents</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Changes */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <div className="flex items-center">
                    <Wrench className="w-4 h-4 mr-2 text-purple-600" />
                    Related Changes ({relatedChanges.length})
                  </div>
                  {isEditing && availableChanges.length > 0 && (
                    <Select onValueChange={handleLinkChange}>
                      <SelectTrigger className="w-32 h-6 text-xs">
                        <SelectValue placeholder="+ Link" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableChanges.map((change) => (
                          <SelectItem key={change.id} value={change.id}>
                            {change.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {relatedChanges.length > 0 ? (
                  <div className="space-y-2">
                    {relatedChanges.map((change) => (
                      <div key={change.id} className="p-2 bg-purple-50 rounded border border-purple-200">
                        <div className="flex items-center justify-between">
                          <Link href={`/changes/${change.id}`}>
                            <h4 className="text-sm font-medium text-gray-900 hover:text-purple-600 cursor-pointer">
                              {change.title}
                            </h4>
                          </Link>
                          {isEditing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleUnlinkChange(change.id)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
                          <Badge variant="outline" className={getPriorityColor(change.priority)}>
                            {change.priority}
                          </Badge>
                          <Badge variant="outline" className={getStatusColor(change.status)}>
                            {change.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Wrench className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No related changes</p>
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
                    context="problem"
                    placeholder="e.g., category:software, component:api, impact:widespread"
                    label=""
                  />
                ) : (
                  <TagDisplay tags={problem.tags || []} size="sm" />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClientLayout>
  )
}