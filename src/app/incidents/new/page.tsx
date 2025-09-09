'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClientLayout } from '@/components/layout/client-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TiptapEditor } from '@/components/ui/tiptap-editor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Info, AlertTriangle, Bot, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { Criticality, Urgency } from '@/lib/types'
import { calculatePriority, getCriticalityColor, getUrgencyColor, getPriorityExplanation } from '@/lib/itil-utils'
import { tagsToArray } from '@/lib/tag-utils'
import { TagInput } from '@/components/ui/tag-input'
import { InfrastructureSelector } from '@/components/InfrastructureSelector'

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200'
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

interface TeamMember {
  id: string
  name: string
  email: string
}

interface Problem {
  id: string
  title: string
  priority: string
  status: string
}

export default function NewIncidentPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    criticality: 'medium' as Criticality,
    urgency: 'medium' as Urgency,
    autoPriority: true,
    assignedTo: '',
    problemId: '',
    customer: '',
    affectedServices: [] as string[],
    tags: ''
  })
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; name: string; size: number; type: string; file?: File }[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [showAiInsights, setShowAiInsights] = useState(false)
  const [aiInsightsExpanded, setAiInsightsExpanded] = useState(true)
  const router = useRouter()

  // Calculate priority based on criticality and urgency
  const calculatedPriority = formData.autoPriority 
    ? calculatePriority(formData.criticality, formData.urgency)
    : 'medium'

  // Fetch team members and problems on component mount
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
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }

    fetchData()
  }, [])

  // Handle pre-filled data from URL parameters (AI or PagerDuty)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    
    // Handle AI pre-filled data
    if (urlParams.has('ai_title')) {
      const aiData = {
        title: urlParams.get('ai_title') || '',
        description: urlParams.get('ai_description') || '',
        criticality: (urlParams.get('ai_criticality') as Criticality) || 'medium',
        urgency: (urlParams.get('ai_urgency') as Urgency) || 'medium',
        priority: urlParams.get('ai_priority') || 'medium',
        category: urlParams.get('ai_category') || '',
        components: urlParams.get('ai_components')?.split(',').filter(Boolean) || [],
        confidence: parseFloat(urlParams.get('ai_confidence') || '0'),
        analysis: urlParams.get('ai_analysis') ? JSON.parse(urlParams.get('ai_analysis')!) : null,
        isManual: urlParams.get('ai_is_manual') === 'true'
      }

      // Pre-fill form with AI data
      setFormData(prev => ({
        ...prev,
        title: aiData.title,
        description: aiData.description,
        criticality: aiData.criticality,
        urgency: aiData.urgency,
        affectedServices: aiData.components
      }))

      setAiAnalysis(aiData)
      setShowAiInsights(true)

      // Clean URL parameters
      window.history.replaceState({}, '', window.location.pathname)
    }
    // Handle PagerDuty pre-filled data
    else if (urlParams.get('source') === 'pagerduty') {
      const pagerDutyData = {
        title: urlParams.get('title') || '',
        description: urlParams.get('description') || '',
        criticality: (urlParams.get('criticality') as Criticality) || 'medium',
        urgency: (urlParams.get('urgency') as Urgency) || 'medium',
        customer: urlParams.get('customer') || '',
        tags: urlParams.get('tags') || ''
      }

      // Pre-fill form with PagerDuty data
      setFormData(prev => ({
        ...prev,
        title: pagerDutyData.title,
        description: pagerDutyData.description,
        criticality: pagerDutyData.criticality,
        urgency: pagerDutyData.urgency,
        customer: pagerDutyData.customer,
        tags: pagerDutyData.tags
      }))

      // Clean URL parameters
      window.history.replaceState({}, '', window.location.pathname)
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
      formDataToSend.append('criticality', formData.criticality)
      formDataToSend.append('urgency', formData.urgency)
      formDataToSend.append('priority', calculatedPriority)
      formDataToSend.append('assignedTo', formData.assignedTo === 'unassigned' ? '' : formData.assignedTo || '')
      formDataToSend.append('problemId', formData.problemId === 'none' ? '' : formData.problemId || '')
      formDataToSend.append('customer', formData.customer || '')
      formDataToSend.append('affectedServices', JSON.stringify(formData.affectedServices))
      formDataToSend.append('tags', JSON.stringify(tagsToArray(formData.tags)))
      
      // Add files to FormData
      attachedFiles.forEach((fileInfo) => {
        if (fileInfo.file) {
          formDataToSend.append('files', fileInfo.file)
        }
      })

      const res = await fetch('/api/incidents', {
        method: 'POST',
        body: formDataToSend // Don't set Content-Type, let browser set it with boundary
      })

      if (res.ok) {
        router.push('/incidents')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create incident')
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
          <Link href="/incidents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Incidents
            </Button>
          </Link>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-3 h-3 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Create New Incident</h1>
          </div>
          <p className="text-gray-600">Report and track a new incident</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Incident Details</CardTitle>
            <CardDescription>
              Provide information about the incident to help with tracking and resolution
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
                  placeholder="Brief description of the incident"
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
                  placeholder="📝 Detailed description of the incident, impact, and any relevant information..."
                  minHeight="120px"
                  attachedFiles={attachedFiles}
                  onFilesChange={setAttachedFiles}
                  maxFiles={2}
                  maxFileSize={2 * 1024 * 1024}
                />
              </div>

              {/* AI/Manual Analysis Notification */}
              {aiAnalysis && showAiInsights && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm text-purple-800">
                    This incident was pre-filled using {aiAnalysis.isManual ? 'pattern recognition rules' : 'AI analysis'} with {Math.round(aiAnalysis.confidence * 100)}% confidence.
                    {aiAnalysis.isManual && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Rule-based</span>}
                  </p>
                </div>
              )}

              {/* ITIL Criticality and Urgency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Criticality <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.criticality}
                    onValueChange={(value: Criticality) => 
                      setFormData(prev => ({ ...prev, criticality: value }))
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
                  <p className="text-xs text-gray-600">
                    Impact on business operations
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Urgency <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.urgency}
                    onValueChange={(value: Urgency) => 
                      setFormData(prev => ({ ...prev, urgency: value }))
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
                  <p className="text-xs text-gray-600">
                    Speed of resolution required
                  </p>
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
                        <Badge variant="outline" className={getCriticalityColor(formData.criticality)}>
                          Criticality: {formData.criticality}
                        </Badge>
                        <span className="text-gray-400">+</span>
                        <Badge variant="outline" className={getUrgencyColor(formData.urgency)}>
                          Urgency: {formData.urgency}
                        </Badge>
                        <span className="text-gray-400">=</span>
                        <Badge variant="outline" className={getPriorityColor(calculatedPriority)}>
                          Priority: {calculatedPriority}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-blue-800">
                      {getPriorityExplanation(formData.criticality, formData.urgency)}
                    </p>
                  </div>
                </div>
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
                <p className="text-xs text-gray-600">
                  Assign this incident to a specific team member for resolution
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer" className="text-sm font-medium">
                  Customer
                </Label>
                <Input
                  id="customer"
                  value={formData.customer}
                  onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                  className="h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
                  placeholder="Customer name or identifier (optional)"
                />
                <p className="text-xs text-gray-600">
                  Specify the customer affected by this incident
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Related Problem
                </Label>
                <Select
                  value={formData.problemId}
                  onValueChange={(value: string) => 
                    setFormData(prev => ({ ...prev, problemId: value }))
                  }
                >
                  <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300">
                    <SelectValue placeholder="Link to a problem (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No related problem</SelectItem>
                    {problems.map((problem) => (
                      <SelectItem key={problem.id} value={problem.id}>
                        {problem.title} ({problem.priority} - {problem.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-600">
                  Link this incident to an existing problem to track relationships
                </p>
              </div>

              <InfrastructureSelector
                selectedComponents={formData.affectedServices}
                onSelectionChange={(componentIds) => 
                  setFormData(prev => ({ ...prev, affectedServices: componentIds }))
                }
                placeholder="Select infrastructure components affected by this incident..."
                label="Affected Infrastructure Components"
              />

              <TagInput
                value={formData.tags}
                onChange={(value) => setFormData(prev => ({ ...prev, tags: value }))}
                context="incident"
                placeholder="e.g., environment:production, team:backend, category:database"
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
                  {loading ? 'Creating...' : 'Create Incident'}
                </Button>
                <Link href="/incidents">
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