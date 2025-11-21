'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'
import { calculatePriority } from '@/lib/itil-utils'

interface ImportedIncident {
  title: string
  description: string
  criticality: 'low' | 'medium' | 'high' | 'critical'
  urgency: 'low' | 'medium' | 'high' | 'critical'
  priority?: 'low' | 'medium' | 'high' | 'critical' // Optional - will be calculated if not provided
  assignedTo?: string
  problemId?: string
  affectedServices?: string[]
  tags?: string[]
}

interface IncidentImportProps {
  onImport: (incidents: ImportedIncident[]) => void
}

const EXAMPLE_JSON = `[
  {
    "title": "Database connection timeout",
    "description": "Users are experiencing timeouts when connecting to the main database server. This is affecting all web applications that rely on the primary database.",
    "criticality": "high",
    "urgency": "medium",
    "assignedTo": "john.doe@example.com",
    "affectedServices": ["web-app-prod", "api-gateway"],
    "tags": ["database", "timeout", "production"]
  },
  {
    "title": "Login page not loading",
    "description": "The login page is returning a 500 error for all users. This is preventing user access to the platform.",
    "criticality": "critical",
    "urgency": "high",
    "affectedServices": ["authentication-service"],
    "tags": ["login", "500-error", "blocking"]
  },
  {
    "title": "Email notifications delayed",
    "description": "Email notifications are being sent with a delay of 2-3 hours. This affects password resets and system alerts.",
    "criticality": "medium",
    "urgency": "low",
    "assignedTo": "jane.smith@example.com",
    "affectedServices": ["email-service"],
    "tags": ["email", "delay", "notifications"]
  }
]`

export function IncidentImport({ onImport }: IncidentImportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [jsonContent, setJsonContent] = useState('')
  const [parsedIncidents, setParsedIncidents] = useState<ImportedIncident[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/json') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setJsonContent(content)
        parseJson(content)
      }
      reader.readAsText(file)
    }
  }

  const parseJson = (content: string) => {
    try {
      setParseError(null)
      const parsed = JSON.parse(content)
      
      if (!Array.isArray(parsed)) {
        throw new Error('JSON must be an array of incident objects')
      }

      // Validate each incident
      const validatedIncidents = parsed.map((incident, index) => {
        if (!incident.title || !incident.description || !incident.criticality || !incident.urgency) {
          throw new Error(`Incident at index ${index} is missing required fields: title, description, criticality, and urgency`)
        }

        if (!['low', 'medium', 'high', 'critical'].includes(incident.criticality)) {
          throw new Error(`Incident at index ${index} has invalid criticality: ${incident.criticality}`)
        }

        if (!['low', 'medium', 'high', 'critical'].includes(incident.urgency)) {
          throw new Error(`Incident at index ${index} has invalid urgency: ${incident.urgency}`)
        }

        // Calculate priority if not provided
        const calculatedPriority = incident.priority || calculatePriority(incident.criticality, incident.urgency)

        return {
          ...incident,
          priority: calculatedPriority
        } as ImportedIncident
      })

      setParsedIncidents(validatedIncidents)
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Invalid JSON format')
      setParsedIncidents([])
    }
  }

  const handleTextareaChange = (value: string) => {
    setJsonContent(value)
    if (value.trim()) {
      parseJson(value)
    } else {
      setParsedIncidents([])
      setParseError(null)
    }
  }

  const handleImport = async () => {
    if (parsedIncidents.length === 0) return

    setIsImporting(true)
    try {
      await onImport(parsedIncidents)
      setIsOpen(false)
      setJsonContent('')
      setParsedIncidents([])
      setParseError(null)
    } catch (error) {
      console.error('Error importing incidents:', error)
    } finally {
      setIsImporting(false)
    }
  }

  const loadExample = () => {
    setJsonContent(EXAMPLE_JSON)
    parseJson(EXAMPLE_JSON)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          Import JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Incidents from JSON
          </DialogTitle>
          <DialogDescription>
            Upload a JSON file or paste JSON content to import multiple incidents at once.
            Each incident must have at least title, description, and priority fields.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* File Upload */}
          <div>
            <Label className="text-sm font-medium">Upload JSON File</Label>
            <div className="mt-1">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="json-file-upload"
              />
              <label
                htmlFor="json-file-upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose JSON File
              </label>
            </div>
          </div>

          {/* Or Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or paste JSON content</span>
            </div>
          </div>

          {/* JSON Textarea */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">JSON Content</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={loadExample}
                className="text-xs"
              >
                Load Example
              </Button>
            </div>
            <Textarea
              value={jsonContent}
              onChange={(e) => handleTextareaChange(e.target.value)}
              placeholder="Paste your incidents JSON here..."
              className="mt-1 font-mono text-sm min-h-[200px]"
            />
          </div>

          {/* Parse Results */}
          {parseError && (
            <div className="border border-red-200 bg-red-50 p-4 rounded-md flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">{parseError}</div>
            </div>
          )}

          {parsedIncidents.length > 0 && !parseError && (
            <div className="border border-green-200 bg-green-50 p-4 rounded-md flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800">
                Successfully parsed {parsedIncidents.length} incident{parsedIncidents.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Preview */}
          {parsedIncidents.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Preview ({parsedIncidents.length} incidents)</Label>
              <div className="mt-2 max-h-[300px] overflow-auto border border-gray-200 rounded-md">
                <div className="space-y-2 p-3">
                  {parsedIncidents.map((incident, index) => (
                    <div key={index} className="border border-gray-100 rounded-md p-3 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-900">{incident.title}</h4>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{incident.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              incident.priority === 'critical' ? 'bg-red-100 text-red-800' :
                              incident.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              incident.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              Priority: {incident.priority}
                            </span>
                            <span className="text-xs text-gray-500">
                              (C:{incident.criticality}, U:{incident.urgency})
                            </span>
                            {incident.assignedTo && (
                              <span className="text-xs text-gray-500">→ {incident.assignedTo}</span>
                            )}
                            {incident.affectedServices && incident.affectedServices.length > 0 && (
                              <span className="text-xs text-gray-500">
                                {incident.affectedServices.length} service{incident.affectedServices.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* API Format Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-sm text-blue-900 mb-2">Required Fields</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li><code className="bg-blue-100 px-1 rounded">title</code> - Incident title (string)</li>
              <li><code className="bg-blue-100 px-1 rounded">description</code> - Incident description (string)</li>
              <li><code className="bg-blue-100 px-1 rounded">criticality</code> - Business impact: "low", "medium", "high", or "critical"</li>
              <li><code className="bg-blue-100 px-1 rounded">urgency</code> - Time sensitivity: "low", "medium", "high", or "critical"</li>
            </ul>
            <h4 className="font-medium text-sm text-blue-900 mb-2 mt-3">Optional Fields</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li><code className="bg-blue-100 px-1 rounded">priority</code> - Will be calculated from criticality + urgency if not provided</li>
              <li><code className="bg-blue-100 px-1 rounded">assignedTo</code> - Email of assigned user</li>
              <li><code className="bg-blue-100 px-1 rounded">problemId</code> - Related problem ID</li>
              <li><code className="bg-blue-100 px-1 rounded">affectedServices</code> - Array of service IDs</li>
              <li><code className="bg-blue-100 px-1 rounded">tags</code> - Array of tag strings</li>
            </ul>
            <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
              <strong>Note:</strong> Priority is automatically calculated using ITIL matrix based on criticality and urgency. You can override by providing a priority field.
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedIncidents.length === 0 || isImporting}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isImporting ? 'Importing...' : `Import ${parsedIncidents.length} Incident${parsedIncidents.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}