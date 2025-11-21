'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { Node, Edge } from 'reactflow'
import { 
  parseTerraformFile, 
  mapTerraformToNodes, 
  generateTerraformEdges,
  TerraformResource 
} from '@/lib/infrastructure-utils'

interface TerraformImportProps {
  onImport: (nodes: Node[], edges: Edge[], metadata: any) => void
  onClose: () => void
}

export function TerraformImport({ onImport, onClose }: TerraformImportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [terraformContent, setTerraformContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedResources, setParsedResources] = useState<TerraformResource[]>([])
  const [error, setError] = useState<string | null>(null)
  const [previewNodes, setPreviewNodes] = useState<Node[]>([])
  const [importName, setImportName] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewSectionRef = useRef<HTMLDivElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.tf') && !file.name.endsWith('.tf.json')) {
      setError('Please select a valid Terraform file (.tf or .tf.json)')
      return
    }

    setFileName(file.name)
    setImportName(file.name.replace(/\.(tf|tf\.json)$/, ''))
    setError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setTerraformContent(content)
    }
    reader.readAsText(file)
  }

  const handleContentChange = (content: string) => {
    setTerraformContent(content)
    setError(null)
    setSuccessMessage(null)
  }

  const handleParse = () => {
    if (!terraformContent.trim()) {
      setError('Please provide Terraform content')
      return
    }

    setIsProcessing(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const resources = parseTerraformFile(terraformContent)
      if (resources.length === 0) {
        setError('No valid Terraform resources found in the file')
        setIsProcessing(false)
        return
      }

      setParsedResources(resources)
      const nodes = mapTerraformToNodes(resources)
      setPreviewNodes(nodes)
      setIsProcessing(false)
      
      // Show success message and scroll to preview
      setSuccessMessage(`Successfully parsed ${resources.length} Terraform resources!`)
      setTimeout(() => {
        previewSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
      }, 100)
      
    } catch (err) {
      setError(`Failed to parse Terraform file: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setIsProcessing(false)
    }
  }

  const handleImport = () => {
    if (parsedResources.length === 0) {
      setError('No resources to import')
      return
    }

    const nodes = mapTerraformToNodes(parsedResources)
    const edges = generateTerraformEdges(parsedResources)
    
    const metadata = {
      name: importName || 'Terraform Import',
      description: `Imported from ${fileName || 'Terraform file'}`,
      source: 'terraform',
      resourceCount: parsedResources.length
    }

    onImport(nodes, edges, metadata)
    handleClose()
  }

  const handleClose = () => {
    setIsOpen(false)
    setTerraformContent('')
    setFileName('')
    setParsedResources([])
    setPreviewNodes([])
    setError(null)
    setSuccessMessage(null)
    setImportName('')
    onClose()
  }

  const getResourceTypeColor = (type: string): string => {
    if (type.includes('database') || type.includes('sql') || type.includes('rds')) {
      return 'bg-blue-100 text-blue-800'
    }
    if (type.includes('storage') || type.includes('bucket') || type.includes('s3')) {
      return 'bg-green-100 text-green-800'
    }
    if (type.includes('network') || type.includes('vpc') || type.includes('subnet')) {
      return 'bg-purple-100 text-purple-800'
    }
    if (type.includes('security') || type.includes('firewall')) {
      return 'bg-red-100 text-red-800'
    }
    if (type.includes('instance') || type.includes('server') || type.includes('vm')) {
      return 'bg-orange-100 text-orange-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center space-x-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center space-x-1 px-2 py-1"
          >
            <Upload className="w-4 h-4" />
            <span className="text-xs">.tf</span>
          </Button>
          <span className="text-xs text-orange-600 bg-orange-50 px-1 py-0.5 rounded text-[10px]">BETA</span>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Import Terraform Infrastructure</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Upload Terraform File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select Terraform File (.tf or .tf.json)</Label>
                <Input
                  id="file-upload"
                  type="file"
                  ref={fileInputRef}
                  accept=".tf,.tf.json"
                  onChange={handleFileSelect}
                  className="mt-1"
                />
                {fileName && (
                  <p className="text-sm text-green-600 mt-2 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Selected: {fileName}
                  </p>
                )}
              </div>

              <div className="text-center text-gray-500">or</div>

              <div>
                <Label htmlFor="terraform-content">Paste Terraform Content</Label>
                <Textarea
                  id="terraform-content"
                  value={terraformContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder={`resource "aws_instance" "example" {
  ami           = "ami-0c55b159cbfafe1d0"
  instance_type = "t2.micro"
  
  tags = {
    Name = "HelloWorld"
  }
}`}
                  className="mt-1 font-mono text-sm min-h-[200px]"
                />
              </div>

              <Button 
                onClick={handleParse} 
                disabled={!terraformContent.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Parsing...' : 'Parse Terraform File'}
              </Button>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              {successMessage && (
                <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">{successMessage}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Section */}
          {parsedResources.length > 0 && (
            <Card ref={previewSectionRef}>
              <CardHeader>
                <CardTitle className="text-lg">2. Preview Resources ({parsedResources.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="import-name">Diagram Name</Label>
                  <Input
                    id="import-name"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    placeholder="Enter a name for this infrastructure"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                  {parsedResources.map((resource, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm truncate">{resource.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${getResourceTypeColor(resource.type)}`}>
                          {resource.type.replace('aws_', '').replace('azurerm_', '').replace('google_', '')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        <div>Type: {resource.type}</div>
                        {resource.config.name && (
                          <div>Name: {resource.config.name}</div>
                        )}
                        {Object.keys(resource.config).length > 1 && (
                          <div>{Object.keys(resource.config).length - 1} more properties</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between space-x-3">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleImport} className="bg-blue-600 hover:bg-blue-700">
                    Import {parsedResources.length} Resources
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}