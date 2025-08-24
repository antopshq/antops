'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Clock, Save, RotateCcw } from 'lucide-react'
import { Priority } from '@/lib/types'

interface SLAConfig {
  priority: Priority
  resolution_time_hours: number
}

interface SLAConfigurationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (configurations: SLAConfig[]) => Promise<void>
}

const PRIORITY_LABELS = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800 border-red-200' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  low: { label: 'Low', color: 'bg-green-100 text-green-800 border-green-200' }
}

const DEFAULT_SLAS = {
  critical: 2,
  high: 8,
  medium: 24,
  low: 72
}

export function SLAConfigurationModal({ isOpen, onClose, onSave }: SLAConfigurationModalProps) {
  const [configurations, setConfigurations] = useState<SLAConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchSLAConfigurations()
    }
  }, [isOpen])

  const fetchSLAConfigurations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sla-configurations')
      if (response.ok) {
        const data = await response.json()
        
        // Ensure all priorities are represented
        const allPriorities: Priority[] = ['critical', 'high', 'medium', 'low']
        const configMap = new Map(data.map((config: SLAConfig) => [config.priority, config.resolution_time_hours]))
        
        const fullConfigurations = allPriorities.map(priority => ({
          priority,
          resolution_time_hours: Number(configMap.get(priority) || DEFAULT_SLAS[priority] || 24)
        }))
        
        setConfigurations(fullConfigurations)
      } else {
        setError('Failed to load SLA configurations')
      }
    } catch (err) {
      console.error('Error fetching SLA configurations:', err)
      setError('Failed to load SLA configurations')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      await onSave(configurations)
      onClose()
    } catch (err) {
      console.error('Error saving SLA configurations:', err)
      setError('Failed to save SLA configurations')
    } finally {
      setSaving(false)
    }
  }

  const updateConfiguration = (priority: Priority, hours: number) => {
    setConfigurations(prev => 
      prev.map(config => 
        config.priority === priority 
          ? { ...config, resolution_time_hours: Math.max(1, hours) }
          : config
      )
    )
  }

  const resetToDefaults = () => {
    setConfigurations(prev => 
      prev.map(config => ({
        ...config,
        resolution_time_hours: DEFAULT_SLAS[config.priority]
      }))
    )
  }

  const formatTimeDisplay = (hours: number) => {
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    }
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) {
      return `${days} day${days !== 1 ? 's' : ''}`
    }
    return `${days}d ${remainingHours}h`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            SLA Configuration
          </DialogTitle>
          <DialogDescription>
            Set resolution time targets for each incident priority level. These SLAs will be used to calculate compliance metrics.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-600">Loading SLA configurations...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {configurations.map((config) => (
              <div key={config.priority} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`${PRIORITY_LABELS[config.priority].color} text-sm`}>
                    {PRIORITY_LABELS[config.priority].label}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Target: {formatTimeDisplay(config.resolution_time_hours)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="8760"
                    value={config.resolution_time_hours}
                    onChange={(e) => updateConfiguration(config.priority, parseInt(e.target.value) || 1)}
                    className="w-20 h-8 text-sm text-center"
                  />
                  <Label className="text-sm text-gray-500 min-w-0">hours</Label>
                </div>
              </div>
            ))}
            
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset to Defaults
              </Button>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save SLA Settings
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}