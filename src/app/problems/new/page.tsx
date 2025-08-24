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
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { tagsToArray } from '@/lib/tag-utils'
import { TagInput } from '@/components/ui/tag-input'
import { InfrastructureSelector } from '@/components/InfrastructureSelector'

interface TeamMember {
  id: string
  name: string
  email: string
}

export default function NewProblemPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    assignedTo: '',
    rootCause: '',
    workaround: '',
    solution: '',
    affectedServices: [] as string[],
    tags: ''
  })
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; name: string; size: number; type: string; file?: File }[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Fetch team members on component mount
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const res = await fetch('/api/team')
        if (res.ok) {
          const data = await res.json()
          setTeamMembers(data.teamMembers)
        }
      } catch (error) {
        console.error('Failed to fetch team members:', error)
      }
    }

    fetchTeamMembers()
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
      formDataToSend.append('rootCause', formData.rootCause || '')
      formDataToSend.append('workaround', formData.workaround || '')
      formDataToSend.append('solution', formData.solution || '')
      formDataToSend.append('affectedServices', JSON.stringify(formData.affectedServices))
      formDataToSend.append('tags', JSON.stringify(tagsToArray(formData.tags)))
      
      // Add files to FormData
      attachedFiles.forEach((fileInfo) => {
        if (fileInfo.file) {
          formDataToSend.append('files', fileInfo.file)
        }
      })

      const res = await fetch('/api/problems', {
        method: 'POST',
        body: formDataToSend // Don't set Content-Type, let browser set it with boundary
      })

      if (res.ok) {
        router.push('/problems')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to create problem')
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
          <Link href="/problems">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Problems
            </Button>
          </Link>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-3 h-3 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Create New Problem</h1>
          </div>
          <p className="text-gray-600">Document and track a new problem</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Problem Details</CardTitle>
            <CardDescription>
              Provide information about the problem to help with investigation and resolution
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
                  placeholder="Brief description of the problem"
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
                  placeholder="📝 Detailed description of the problem, symptoms, and any relevant information..."
                  minHeight="120px"
                  attachedFiles={attachedFiles}
                  onFilesChange={setAttachedFiles}
                  maxFiles={2}
                  maxFileSize={2 * 1024 * 1024}
                />
              </div>

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
                <p className="text-xs text-gray-600">
                  Assign this problem to a specific team member for investigation
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="rootCause" className="text-sm font-medium">
                    Root Cause
                  </Label>
                  <Textarea
                    id="rootCause"
                    value={formData.rootCause}
                    onChange={(e) => setFormData(prev => ({ ...prev, rootCause: e.target.value }))}
                    className="min-h-[80px] border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 resize-none"
                    placeholder="Identified root cause of the problem (if known)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workaround" className="text-sm font-medium">
                    Workaround
                  </Label>
                  <Textarea
                    id="workaround"
                    value={formData.workaround}
                    onChange={(e) => setFormData(prev => ({ ...prev, workaround: e.target.value }))}
                    className="min-h-[80px] border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 resize-none"
                    placeholder="Temporary workaround or mitigation steps"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="solution" className="text-sm font-medium">
                    Solution
                  </Label>
                  <Textarea
                    id="solution"
                    value={formData.solution}
                    onChange={(e) => setFormData(prev => ({ ...prev, solution: e.target.value }))}
                    className="min-h-[80px] border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300 resize-none"
                    placeholder="Permanent solution or fix (if available)"
                  />
                </div>
              </div>

              <InfrastructureSelector
                selectedComponents={formData.affectedServices}
                onSelectionChange={(componentIds) => 
                  setFormData(prev => ({ ...prev, affectedServices: componentIds }))
                }
                placeholder="Select infrastructure components affected by this problem..."
                label="Affected Infrastructure Components"
              />

              <TagInput
                value={formData.tags}
                onChange={(value) => setFormData(prev => ({ ...prev, tags: value }))}
                context="problem"
                placeholder="e.g., category:software, component:api, impact:widespread"
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
                  {loading ? 'Creating...' : 'Create Problem'}
                </Button>
                <Link href="/problems">
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