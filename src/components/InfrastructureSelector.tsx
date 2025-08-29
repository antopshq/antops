'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Database, Server, Network, Cloud, Shield, HardDrive, Wifi, MonitorSpeaker, Container, Globe, X, Search, RefreshCw, Plus, Activity, BarChart3, Router, Zap, Clock, FileKey, Radio, Cable, Printer, Monitor, Laptop, Tablet, Smartphone, Battery, Cpu, Video, Timer, Power, Refrigerator, Settings, Link, Building, Layers } from 'lucide-react'

interface InfrastructureComponent {
  id: string
  label: string
  type: string
  originalLabel: string
  environment?: { id: string, name: string }
  displayName: string
}

interface Environment {
  id: string
  name: string
  is_default: boolean
}

interface InfrastructureSelectorProps {
  selectedComponents: string[]
  onSelectionChange: (componentIds: string[]) => void
  className?: string
  placeholder?: string
  label?: string
}

export function InfrastructureSelector({
  selectedComponents,
  onSelectionChange,
  className,
  placeholder = "Select affected infrastructure components...",
  label = "Affected Services"
}: InfrastructureSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [components, setComponents] = useState<InfrastructureComponent[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all')
  const [tempSelectedComponents, setTempSelectedComponents] = useState<string[]>([])

  // Get component icon
  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'database': return <Database className="w-4 h-4" />
      case 'server': return <Server className="w-4 h-4" />
      case 'network': return <Network className="w-4 h-4" />
      case 'cloud': return <Cloud className="w-4 h-4" />
      case 'security': return <Shield className="w-4 h-4" />
      case 'storage': return <HardDrive className="w-4 h-4" />
      case 'wifi': return <Wifi className="w-4 h-4" />
      case 'loadbalancer': return <MonitorSpeaker className="w-4 h-4" />
      case 'container': return <Container className="w-4 h-4" />
      case 'api': return <Globe className="w-4 h-4" />
      case 'monitoring': return <Activity className="w-4 h-4" />
      case 'cache': return <Zap className="w-4 h-4" />
      case 'queue': return <BarChart3 className="w-4 h-4" />
      case 'router': return <Router className="w-4 h-4" />
      case 'firewall': return <Shield className="w-4 h-4" />
      case 'switch': return <Settings className="w-4 h-4" />
      case 'gateway': return <Link className="w-4 h-4" />
      case 'proxy': return <Globe className="w-4 h-4" />
      case 'cdn': return <Zap className="w-4 h-4" />
      case 'dns': return <Globe className="w-4 h-4" />
      case 'scheduler': return <Clock className="w-4 h-4" />
      case 'secrets': return <FileKey className="w-4 h-4" />
      case 'messaging': return <Radio className="w-4 h-4" />
      case 'backup': return <HardDrive className="w-4 h-4" />
      case 'analytics': return <BarChart3 className="w-4 h-4" />
      case 'ml': return <Activity className="w-4 h-4" />
      case 'blockchain': return <Link className="w-4 h-4" />
      case 'iot': return <Cable className="w-4 h-4" />
      case 'printer': return <Printer className="w-4 h-4" />
      case 'desktop': return <Monitor className="w-4 h-4" />
      case 'laptop': return <Laptop className="w-4 h-4" />
      case 'tablet': return <Tablet className="w-4 h-4" />
      case 'mobile': return <Smartphone className="w-4 h-4" />
      case 'ups': return <Battery className="w-4 h-4" />
      case 'mainframe': return <Cpu className="w-4 h-4" />
      case 'camera': return <Video className="w-4 h-4" />
      case 'sensor': return <Timer className="w-4 h-4" />
      case 'power': return <Power className="w-4 h-4" />
      case 'hvac': return <Refrigerator className="w-4 h-4" />
      case 'datacenter': return <Building className="w-4 h-4" />
      case 'zone': return <Layers className="w-4 h-4" />
      default: return <div className="w-4 h-4 bg-gray-400 rounded" />
    }
  }

  // Get component color
  const getComponentColor = (type: string) => {
    switch (type) {
      case 'database': return 'bg-green-100 text-green-700 border-green-300'
      case 'server': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'network': return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'cloud': return 'bg-sky-100 text-sky-700 border-sky-300'
      case 'security': return 'bg-red-100 text-red-700 border-red-300'
      case 'storage': return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'wifi': return 'bg-indigo-100 text-indigo-700 border-indigo-300'
      case 'loadbalancer': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'container': return 'bg-teal-100 text-teal-700 border-teal-300'
      case 'api': return 'bg-pink-100 text-pink-700 border-pink-300'
      case 'monitoring': return 'bg-emerald-100 text-emerald-700 border-emerald-300'
      case 'cache': return 'bg-amber-100 text-amber-700 border-amber-300'
      case 'queue': return 'bg-violet-100 text-violet-700 border-violet-300'
      case 'router': return 'bg-cyan-100 text-cyan-700 border-cyan-300'
      case 'firewall': return 'bg-red-100 text-red-700 border-red-300'
      case 'switch': return 'bg-slate-100 text-slate-700 border-slate-300'
      case 'gateway': return 'bg-lime-100 text-lime-700 border-lime-300'
      case 'proxy': return 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300'
      case 'cdn': return 'bg-rose-100 text-rose-700 border-rose-300'
      case 'dns': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'scheduler': return 'bg-indigo-100 text-indigo-700 border-indigo-300'
      case 'secrets': return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'messaging': return 'bg-green-100 text-green-700 border-green-300'
      case 'backup': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'analytics': return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'ml': return 'bg-pink-100 text-pink-700 border-pink-300'
      case 'blockchain': return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'iot': return 'bg-teal-100 text-teal-700 border-teal-300'
      case 'printer': return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'desktop': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'laptop': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'tablet': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'mobile': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'ups': return 'bg-green-100 text-green-700 border-green-300'
      case 'mainframe': return 'bg-red-100 text-red-700 border-red-300'
      case 'camera': return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'sensor': return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'power': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'hvac': return 'bg-cyan-100 text-cyan-700 border-cyan-300'
      case 'datacenter': return 'bg-slate-100 text-slate-700 border-slate-300'
      case 'zone': return 'bg-indigo-100 text-indigo-700 border-indigo-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  // Load components
  const loadComponents = useCallback(async () => {
    try {
      setIsLoading(true)
      const url = new URL('/api/infrastructure/components', window.location.origin)
      if (searchTerm.trim()) url.searchParams.set('search', searchTerm.trim())
      if (selectedEnvironment && selectedEnvironment !== 'all') url.searchParams.set('environment', selectedEnvironment)

      const response = await fetch(url.toString())
      if (response.ok) {
        const data = await response.json()
        setComponents(data.components || [])
        setEnvironments(data.environments || [])
      } else {
        console.error('Failed to load components:', response.status)
      }
    } catch (error) {
      console.error('Error loading components:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, selectedEnvironment])

  // Load components when modal opens or filters change
  useEffect(() => {
    if (isOpen) {
      loadComponents()
    }
  }, [isOpen, loadComponents])

  // Initialize temp selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedComponents([...selectedComponents])
    }
  }, [isOpen, selectedComponents])

  // Handle save selection
  const handleSave = () => {
    onSelectionChange(tempSelectedComponents)
    setIsOpen(false)
  }

  // Handle cancel
  const handleCancel = () => {
    setTempSelectedComponents([...selectedComponents])
    setIsOpen(false)
  }

  // Toggle component selection
  const toggleComponent = (componentId: string) => {
    setTempSelectedComponents(prev => 
      prev.includes(componentId)
        ? prev.filter(id => id !== componentId)
        : [...prev, componentId]
    )
  }

  // Remove selected component
  const removeComponent = (componentId: string) => {
    onSelectionChange(selectedComponents.filter(id => id !== componentId))
  }

  // Get selected component details for display
  const getSelectedComponentsDetails = () => {
    return selectedComponents
      .map(id => components.find(c => c.id === id))
      .filter(Boolean) as InfrastructureComponent[]
  }

  const selectedComponentsDetails = getSelectedComponentsDetails()
  const filteredComponents = components.filter(component => 
    !searchTerm.trim() || 
    (component.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (component.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (component.type || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={className}>
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      
      {/* Selected Components Display */}
      <div className="mt-2 space-y-2">
        {selectedComponentsDetails.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedComponentsDetails.map((component) => (
              <Badge
                key={component.id}
                variant="outline"
                className={`${getComponentColor(component.type)} flex items-center gap-1 pr-1`}
              >
                {getComponentIcon(component.type)}
                <span className="max-w-32 truncate">
                  <span className="capitalize">{component.type}</span>
                  {component.label && component.label !== component.type && (
                    <span> - {component.label}</span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeComponent(component.id)}
                  className="h-4 w-4 p-0 hover:bg-red-100 ml-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic">No infrastructure components selected</div>
        )}
      </div>

      {/* Select Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="mt-2 w-full justify-start gap-2">
            <Plus className="w-4 h-4" />
            {placeholder}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Infrastructure Components</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Filters */}
            <div className="flex gap-3 flex-shrink-0">
              <div className="flex-1">
                <Input
                  placeholder="Search components..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="w-48">
                <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All environments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All environments</SelectItem>
                    {environments.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.name} {env.is_default && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Components List */}
            <div className="flex-1 overflow-auto border rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                  Loading components...
                </div>
              ) : filteredComponents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No infrastructure components found
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {filteredComponents.map((component) => (
                    <label
                      key={component.id}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                        tempSelectedComponents.includes(component.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={tempSelectedComponents.includes(component.id)}
                        onChange={() => toggleComponent(component.id)}
                        className="mr-3"
                      />
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded ${getComponentColor(component.type)}`}>
                          {getComponentIcon(component.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            <span className="capitalize">{component.type}</span>
                            {component.label && component.label !== component.type && (
                              <span className="font-normal text-gray-600"> - {component.label}</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            {component.environment && (
                              <span>{component.environment.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t flex-shrink-0">
            <div className="text-sm text-gray-600">
              {tempSelectedComponents.length} component{tempSelectedComponents.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Select Components
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}