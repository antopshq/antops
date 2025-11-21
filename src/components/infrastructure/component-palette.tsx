'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Server, 
  Database, 
  Network, 
  Cloud, 
  HardDrive,
  Layers,
  Globe,
  Shield,
  Cpu,
  Monitor
} from 'lucide-react'

interface ComponentPaletteProps {
  onAddNode: (nodeType: string, position: { x: number; y: number }) => void
}

const infraComponents = [
  {
    type: 'server',
    label: 'Server',
    icon: Server,
    color: 'from-blue-500 to-blue-600',
    description: 'Physical or virtual server'
  },
  {
    type: 'database',
    label: 'Database',
    icon: Database,
    color: 'from-green-500 to-green-600',
    description: 'Database server or cluster'
  },
  {
    type: 'loadbalancer',
    label: 'Load Balancer',
    icon: Network,
    color: 'from-purple-500 to-purple-600',
    description: 'Load balancing service'
  },
  {
    type: 'network',
    label: 'Network',
    icon: Globe,
    color: 'from-orange-500 to-orange-600',
    description: 'Network component or switch'
  },
  {
    type: 'cluster',
    label: 'Cluster',
    icon: Layers,
    color: 'from-indigo-500 to-indigo-600',
    description: 'Kubernetes or container cluster'
  },
  {
    type: 'storage',
    label: 'Storage',
    icon: HardDrive,
    color: 'from-yellow-500 to-yellow-600',
    description: 'Storage system or volume'
  },
  {
    type: 'cdn',
    label: 'CDN',
    icon: Cloud,
    color: 'from-cyan-500 to-cyan-600',
    description: 'Content delivery network'
  },
  {
    type: 'firewall',
    label: 'Firewall',
    icon: Shield,
    color: 'from-red-500 to-red-600',
    description: 'Security firewall'
  },
  {
    type: 'compute',
    label: 'Compute',
    icon: Cpu,
    color: 'from-pink-500 to-pink-600',
    description: 'Compute instance or VM'
  },
  {
    type: 'monitoring',
    label: 'Monitoring',
    icon: Monitor,
    color: 'from-teal-500 to-teal-600',
    description: 'Monitoring service'
  }
]

export function ComponentPalette({ onAddNode }: ComponentPaletteProps) {
  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleClick = (nodeType: string) => {
    // Add node at a random position when clicked (fallback for non-drag)
    const position = {
      x: Math.random() * 400 + 50,
      y: Math.random() * 300 + 50
    }
    onAddNode(nodeType, position)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Components</CardTitle>
        <p className="text-sm text-gray-600">
          Drag components to the diagram or click to add
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {infraComponents.map((component) => {
            const IconComponent = component.icon
            return (
              <div
                key={component.type}
                draggable
                onDragStart={(e) => handleDragStart(e, component.type)}
                onClick={() => handleClick(component.type)}
                className="group cursor-move p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                title={component.description}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 bg-gradient-to-r ${component.color} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-blue-700">
                      {component.label}
                    </p>
                    <p className="text-xs text-gray-500 group-hover:text-blue-600">
                      {component.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Instructions</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p>• Drag components to the diagram</p>
            <p>• Click components to add at random position</p>
            <p>• Connect components by dragging between connection points</p>
            <p>• Right-click components for options</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}