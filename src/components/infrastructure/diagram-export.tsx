'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Download, FileJson, Copy, CheckCircle2, AlertCircle } from 'lucide-react'
import { Node, Edge } from 'reactflow'
import { exportDiagramToJson, downloadJsonFile } from '@/lib/infrastructure-utils'

interface DiagramExportProps {
  nodes: Node[]
  edges: Edge[]
  currentEnvironment?: any
}

export function DiagramExport({ nodes, edges, currentEnvironment }: DiagramExportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [exportName, setExportName] = useState('')
  const [exportDescription, setExportDescription] = useState('')
  const [jsonContent, setJsonContent] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)

  const generateJson = () => {
    const metadata = {
      name: exportName || 'Infrastructure Diagram',
      description: exportDescription || 'Exported infrastructure diagram',
      environment: currentEnvironment?.name,
      created: new Date().toISOString()
    }

    const json = exportDiagramToJson(nodes, edges, metadata)
    setJsonContent(json)
  }

  const handleExport = () => {
    if (!jsonContent) {
      generateJson()
      return
    }

    const filename = `${exportName || 'infrastructure-diagram'}-${new Date().toISOString().split('T')[0]}.json`
    downloadJsonFile(jsonContent, filename)
  }

  const handleCopyToClipboard = async () => {
    if (!jsonContent) {
      generateJson()
      return
    }

    try {
      await navigator.clipboard.writeText(jsonContent)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const getDiagramStats = () => {
    const componentTypes = nodes.reduce((acc, node) => {
      const type = node.data?.type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      componentTypes
    }
  }

  const stats = getDiagramStats()

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      server: 'bg-orange-100 text-orange-800',
      database: 'bg-blue-100 text-blue-800',
      storage: 'bg-green-100 text-green-800',
      network: 'bg-purple-100 text-purple-800',
      security: 'bg-red-100 text-red-800',
      cloud: 'bg-sky-100 text-sky-800',
      container: 'bg-indigo-100 text-indigo-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="p-2"
          title="Export JSON"
        >
          <Download className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileJson className="w-5 h-5" />
            <span>Export Infrastructure Diagram</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Diagram Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Diagram Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalNodes}</div>
                  <div className="text-sm text-blue-600">Components</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats.totalEdges}</div>
                  <div className="text-sm text-green-600">Connections</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{Object.keys(stats.componentTypes).length}</div>
                  <div className="text-sm text-purple-600">Types</div>
                </div>
              </div>

              {Object.keys(stats.componentTypes).length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Component Types</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(stats.componentTypes).map(([type, count]) => (
                      <span key={type} className={`px-2 py-1 rounded-full text-xs ${getTypeColor(type)}`}>
                        {type}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="export-name">Diagram Name</Label>
                <Input
                  id="export-name"
                  value={exportName}
                  onChange={(e) => setExportName(e.target.value)}
                  placeholder="Enter diagram name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="export-description">Description (Optional)</Label>
                <Textarea
                  id="export-description"
                  value={exportDescription}
                  onChange={(e) => setExportDescription(e.target.value)}
                  placeholder="Describe this infrastructure diagram"
                  className="mt-1"
                  rows={3}
                />
              </div>

              {currentEnvironment && (
                <div className="bg-gray-50 p-3 rounded">
                  <Label className="text-sm font-medium">Environment</Label>
                  <p className="text-sm text-gray-600 mt-1">{currentEnvironment.name}</p>
                  {currentEnvironment.description && (
                    <p className="text-xs text-gray-500 mt-1">{currentEnvironment.description}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview JSON */}
          {jsonContent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">JSON Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={jsonContent}
                  readOnly
                  className="font-mono text-xs min-h-[300px] max-h-[400px]"
                  placeholder="Click 'Generate Preview' to see JSON content"
                />
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between space-x-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            
            <div className="flex space-x-2">
              {!jsonContent ? (
                <Button onClick={generateJson} variant="outline">
                  Generate Preview
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleCopyToClipboard}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    {copySuccess ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copySuccess ? 'Copied!' : 'Copy JSON'}</span>
                  </Button>
                  <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Download File
                  </Button>
                </>
              )}
            </div>
          </div>

          {stats.totalNodes === 0 && (
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">No components found in the current diagram to export.</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}