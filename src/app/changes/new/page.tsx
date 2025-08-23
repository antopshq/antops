'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClientLayout } from '@/components/layout/client-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { datetimeLocalToISO } from '@/lib/date-utils'
import { ArrowLeft, Wrench } from 'lucide-react'
import Link from 'next/link'
import { tagsToArray } from '@/lib/tag-utils'
import { TagInput } from '@/components/ui/tag-input'
import { InfrastructureSelector } from '@/components/InfrastructureSelector'

interface TeamMember {
  id: string
  name: string
  email: string
}

interface Problem {
  id: string
  title: string
  status: string
  priority: string
}

interface Incident {
  id: string
  incident_number: string
  title: string
  status: string
  priority: string
}

export default function NewChangePage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    assignedTo: 'unassigned',
    scheduledFor: '',
    estimatedEndTime: '',
    rollbackPlan: '',
    testPlan: '',
    affectedServices: [] as string[],
    tags: '',
    problemId: 'none',
    incidentId: 'none'
  })
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; name: string; size: number; type: string; file?: File }[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Fetch team members, problems, and incidents on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
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

        // Fetch incidents
        const incidentsRes = await fetch('/api/incidents')
        if (incidentsRes.ok) {
          const incidentsData = await incidentsRes.json()
          setIncidents(incidentsData)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }

    fetchData()
  }, [])

  // Check for pre-filled data from localStorage
  useEffect(() => {
    try {
      const prefilledData = localStorage.getItem('prefilled-change-data')
      if (prefilledData) {
        const parsedData = JSON.parse(prefilledData)
        
        // Set the form data with pre-filled values
        setFormData(prev => ({
          ...prev,
          title: parsedData.title || '',
          description: parsedData.description || '',
          priority: parsedData.priority || 'medium',
          affectedServices: parsedData.affectedServices || [],
          rollbackPlan: parsedData.rollbackPlan || 'If issues occur:\n1. Revert configuration changes\n2. Restart affected services\n3. Monitor system health\n4. Contact team lead if issues persist',
          testPlan: parsedData.testPlan || 'Testing plan:\n1. Verify configuration changes are applied correctly\n2. Test affected service functionality\n3. Monitor system metrics for abnormalities\n4. Validate all connected services are operational',
          tags: parsedData.tags || 'ai-recommended, infrastructure, maintenance'
        }))
        
        // Clear the pre-filled data after using it
        localStorage.removeItem('prefilled-change-data')
      }
    } catch (error) {
      console.error('Failed to load pre-filled data:', error)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Use FormData for file uploads
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('priority', formData.priority)
      formDataToSend.append('assignedTo', formData.assignedTo === 'unassigned' ? '' : formData.assignedTo || '')
      formDataToSend.append('scheduledFor', formData.scheduledFor ? datetimeLocalToISO(formData.scheduledFor) : '')
      formDataToSend.append('estimatedEndTime', formData.estimatedEndTime ? datetimeLocalToISO(formData.estimatedEndTime) : '')
      formDataToSend.append('rollbackPlan', formData.rollbackPlan)
      formDataToSend.append('testPlan', formData.testPlan)
      formDataToSend.append('affectedServices', JSON.stringify(formData.affectedServices))
      formDataToSend.append('tags', JSON.stringify(tagsToArray(formData.tags)))
      formDataToSend.append('problemId', formData.problemId === 'none' ? '' : formData.problemId || '')
      formDataToSend.append('incidentId', formData.incidentId === 'none' ? '' : formData.incidentId || '')
      
      // Add files to FormData
      attachedFiles.forEach((fileInfo) => {
        if (fileInfo.file) {
          formDataToSend.append('files', fileInfo.file)
        }
      })

      const res = await fetch('/api/changes', {
        method: 'POST',
        body: formDataToSend // Don't set Content-Type, let browser set it with boundary
      })

      if (res.ok) {
        router.push('/changes')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create change')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ClientLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/changes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Changes
            </Button>
          </Link>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <Wrench className="w-3 h-3 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Create New Change</h1>
          </div>
          <p className="text-gray-600">Plan and track a new system change</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Change Details</CardTitle>
            <CardDescription>
              Provide information about the change to help with planning and implementation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
                  placeholder="Brief description of the change"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description <span className="text-red-500">*</span>
                </Label>
                <TiptapEditor
                  value={formData.description}
                  onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                  placeholder="📝 Detailed description of the change, purpose, and expected outcomes..."
                  minHeight="120px"
                  attachedFiles={attachedFiles}
                  onFilesChange={setAttachedFiles}
                  maxFiles={2}
                  maxFileSize={2 * 1024 * 1024}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Priority <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high' | 'critical') => 
                      setFormData(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300">
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
                  <Label className="text-sm font-medium">
                    Assign To
                  </Label>
                  <Select
                    value={formData.assignedTo}
                    onValueChange={(value: string) => 
                      setFormData(prev => ({ ...prev, assignedTo: value }))
                    }
                  >
                    <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300">
                      <SelectValue placeholder="Select team member (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Relationship Fields - Mutual Exclusivity */}
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Change Origin</h4>
                  <p className="text-xs text-blue-800 mb-3">
                    Select what triggered this change: either a specific incident (immediate fix) or a known problem (systematic solution).
                  </p>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Related Problem
                      </Label>
                      <Select
                        value={formData.problemId}
                        onValueChange={(value) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            problemId: value,
                            // Clear incident when problem is selected
                            incidentId: value !== 'none' ? 'none' : prev.incidentId
                          }))
                        }
                        disabled={formData.incidentId !== 'none'}
                      >
                        <SelectTrigger className={`h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 ${formData.incidentId !== 'none' ? 'opacity-50' : ''}`}>
                          <SelectValue placeholder="Link to a problem (optional)">
                            {formData.problemId !== 'none' && formData.problemId ? (
                              <div className="truncate">
                                <span className="text-xs text-blue-600 font-medium mr-1">
                                  {(() => {
                                    const problem = problems.find(p => p.id === formData.problemId)
                                    return problem?.problem_number || ''
                                  })()}
                                </span>
                                <span className="text-sm">
                                  {(() => {
                                    const problem = problems.find(p => p.id === formData.problemId)
                                    return problem?.title || ''
                                  })()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500">Link to a problem (optional)</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-w-[400px]" side="bottom" align="start">
                          <SelectItem value="none">No related problem</SelectItem>
                          {problems.map((problem) => (
                            <SelectItem key={problem.id} value={problem.id} className="max-w-[380px]">
                              <div className="truncate">
                                <span className="text-xs text-blue-600 font-medium mr-2">
                                  {problem.problem_number}
                                </span>
                                <span className="font-medium">{problem.title}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  ({problem.status} - {problem.priority})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-600">
                        Systematic fix for a known problem
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Related Incident
                      </Label>
                      <Select
                        value={formData.incidentId}
                        onValueChange={(value) => 
                          setFormData(prev => ({ 
                            ...prev, 
                            incidentId: value,
                            // Clear problem when incident is selected
                            problemId: value !== 'none' ? 'none' : prev.problemId
                          }))
                        }
                        disabled={formData.problemId !== 'none'}
                      >
                        <SelectTrigger className={`h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 ${formData.problemId !== 'none' ? 'opacity-50' : ''}`}>
                          <SelectValue placeholder="Link to an incident (optional)">
                            {formData.incidentId !== 'none' && formData.incidentId ? (
                              <div className="truncate">
                                <span className="text-xs text-blue-600 font-medium mr-1">
                                  {(() => {
                                    const incident = incidents.find(i => i.id === formData.incidentId)
                                    return incident?.incident_number || ''
                                  })()}
                                </span>
                                <span className="text-sm">
                                  {(() => {
                                    const incident = incidents.find(i => i.id === formData.incidentId)
                                    return incident?.title || ''
                                  })()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500">Link to an incident (optional)</span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-w-[400px]" side="bottom" align="end">
                          <SelectItem value="none">No related incident</SelectItem>
                          {incidents.map((incident) => (
                            <SelectItem key={incident.id} value={incident.id} className="max-w-[380px]">
                              <div className="truncate">
                                <span className="text-xs text-blue-600 font-medium mr-2">
                                  {incident.incident_number}
                                </span>
                                <span className="font-medium">{incident.title}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  ({incident.status})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-600">
                        Immediate fix for a specific incident
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledFor" className="text-sm font-medium">
                    Scheduled For
                  </Label>
                  <Input
                    id="scheduledFor"
                    type="datetime-local"
                    value={formData.scheduledFor}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
                    className="h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
                  />
                  <p className="text-xs text-gray-600">
                    When should this change be implemented?
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimatedEndTime" className="text-sm font-medium">
                    Estimated End Time
                  </Label>
                  <Input
                    id="estimatedEndTime"
                    type="datetime-local"
                    value={formData.estimatedEndTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedEndTime: e.target.value }))}
                    className="h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
                  />
                  <p className="text-xs text-gray-600">
                    When is the maintenance window expected to end?
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rollbackPlan" className="text-sm font-medium">
                  Rollback Plan <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="rollbackPlan"
                  value={formData.rollbackPlan}
                  onChange={(e) => setFormData(prev => ({ ...prev, rollbackPlan: e.target.value }))}
                  className="min-h-[80px] border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 resize-none"
                  placeholder="Steps to rollback this change if something goes wrong"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testPlan" className="text-sm font-medium">
                  Test Plan <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="testPlan"
                  value={formData.testPlan}
                  onChange={(e) => setFormData(prev => ({ ...prev, testPlan: e.target.value }))}
                  className="min-h-[80px] border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 resize-none"
                  placeholder="How will you test this change to ensure it works correctly?"
                  required
                />
              </div>

              <InfrastructureSelector
                selectedComponents={formData.affectedServices}
                onSelectionChange={(componentIds) => 
                  setFormData(prev => ({ ...prev, affectedServices: componentIds }))
                }
                placeholder="Select infrastructure components affected by this change..."
                label="Affected Infrastructure Components"
              />

              <TagInput
                value={formData.tags}
                onChange={(value) => setFormData(prev => ({ ...prev, tags: value }))}
                context="change"
                placeholder="e.g., type:emergency, risk:low, service:web-app"
              />

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {error}
                </div>
              )}

              <div className="flex items-center space-x-3 pt-6 border-t border-gray-200">
                <Button 
                  type="submit" 
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Change'}
                </Button>
                <Link href="/changes">
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  )
}