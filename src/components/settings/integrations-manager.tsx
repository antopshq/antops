'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Check, Copy, ExternalLink, RefreshCw, Settings, Zap, Webhook, MessageSquare, Mail } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface PagerDutyIntegration {
  id?: string
  enabled: boolean
  webhookUrl: string
  apiKey: string
  routingKey: string
  organizationId: string
  createdAt?: string
  updatedAt?: string
}

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  iconBg: string
  iconColor: string
  enabled: boolean
  category: 'alerting' | 'communication' | 'monitoring'
}

export function IntegrationsManager() {
  const { user } = useAuth()
  const [pagerDutyConfig, setPagerDutyConfig] = useState<PagerDutyIntegration>({
    enabled: false,
    webhookUrl: '',
    apiKey: '',
    routingKey: '',
    organizationId: ''
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [webhookUrlGenerated, setWebhookUrlGenerated] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)

  // Check if user has permission to manage integrations
  const hasIntegrationPermission = user?.role && ['owner', 'admin', 'manager'].includes(user.role)

  // Available integrations
  const availableIntegrations: Integration[] = [
    {
      id: 'pagerduty',
      name: 'PagerDuty',
      description: 'Receive PagerDuty alerts as notifications and auto-create incidents',
      icon: Zap,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      enabled: pagerDutyConfig.enabled,
      category: 'alerting'
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Send incident notifications to Slack channels',
      icon: MessageSquare,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      enabled: false,
      category: 'communication'
    },
    {
      id: 'webhook',
      name: 'Custom Webhook',
      description: 'Send incident data to custom webhook endpoints',
      icon: Webhook,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      enabled: false,
      category: 'monitoring'
    },
    {
      id: 'email',
      name: 'Email Notifications',
      description: 'Send email alerts for incident escalations',
      icon: Mail,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      enabled: false,
      category: 'communication'
    }
  ]

  // Generate webhook URL on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !webhookUrlGenerated) {
      const webhookUrl = `${window.location.origin}/api/webhooks/pagerduty`
      setPagerDutyConfig(prev => ({ ...prev, webhookUrl }))
      setWebhookUrlGenerated(true)
    }
  }, [webhookUrlGenerated])

  // Fetch existing configuration
  useEffect(() => {
    const fetchConfiguration = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/integrations/pagerduty')
        if (response.ok) {
          const data = await response.json()
          if (data.integration) {
            setPagerDutyConfig(data.integration)
            setWebhookUrlGenerated(true)
          }
        }
      } catch (error) {
        console.error('Failed to fetch PagerDuty configuration:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConfiguration()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/integrations/pagerduty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pagerDutyConfig)
      })

      if (response.ok) {
        const data = await response.json()
        setPagerDutyConfig(data.integration)
        setMessage({ type: 'success', text: 'PagerDuty integration saved successfully!' })
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Failed to save configuration' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save configuration' })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTestingConnection(true)
    setMessage(null)

    try {
      const response = await fetch('/api/integrations/pagerduty/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: pagerDutyConfig.apiKey })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'PagerDuty connection test successful!' })
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Connection test failed' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Connection test failed' })
    } finally {
      setTestingConnection(false)
    }
  }

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(pagerDutyConfig.webhookUrl)
      setMessage({ type: 'success', text: 'Webhook URL copied to clipboard!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to copy webhook URL' })
    }
  }

  const renderPagerDutyConfig = () => (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <span>PagerDuty Integration</span>
          </div>
        </DialogTitle>
        <DialogDescription>
          Configure PagerDuty to send alerts as notifications and auto-create incidents
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {message && (
          <div className={`p-3 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* Enable Integration Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="pagerduty-enabled" className="text-sm font-medium">
              Enable PagerDuty Integration
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Allow PagerDuty alerts to create notifications and incidents
            </p>
          </div>
          <Switch
            id="pagerduty-enabled"
            checked={pagerDutyConfig.enabled}
            onCheckedChange={(enabled) => 
              setPagerDutyConfig(prev => ({ ...prev, enabled: enabled as boolean }))
            }
          />
        </div>

        {pagerDutyConfig.enabled && (
          <>
            {/* Webhook URL */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Webhook URL</Label>
              <div className="flex space-x-2">
                <Input
                  value={pagerDutyConfig.webhookUrl}
                  readOnly
                  className="font-mono text-xs bg-gray-50"
                />
                <Tooltip content="Copy webhook URL">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyWebhookUrl}
                    className="px-3"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </Tooltip>
              </div>
              <p className="text-xs text-gray-600">
                Configure this URL in your PagerDuty service webhook settings
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="pagerduty-api-key" className="text-sm font-medium">
                PagerDuty API Key
              </Label>
              <Input
                id="pagerduty-api-key"
                type="password"
                placeholder="Enter your PagerDuty API key"
                value={pagerDutyConfig.apiKey}
                onChange={(e) => 
                  setPagerDutyConfig(prev => ({ ...prev, apiKey: e.target.value }))
                }
              />
              <p className="text-xs text-gray-600">
                Used to validate webhook requests and fetch additional incident data
              </p>
            </div>

            {/* Routing Key */}
            <div className="space-y-2">
              <Label htmlFor="pagerduty-routing-key" className="text-sm font-medium">
                Integration Key (Optional)
              </Label>
              <Input
                id="pagerduty-routing-key"
                placeholder="Enter your PagerDuty integration key"
                value={pagerDutyConfig.routingKey}
                onChange={(e) => 
                  setPagerDutyConfig(prev => ({ ...prev, routingKey: e.target.value }))
                }
              />
              <p className="text-xs text-gray-600">
                Used to filter alerts from specific PagerDuty integrations
              </p>
            </div>
          </>
        )}
      </div>

      <DialogFooter className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => window.open('https://support.pagerduty.com/docs/webhooks', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Documentation
        </Button>
        
        <div className="flex space-x-3">
          {pagerDutyConfig.apiKey && pagerDutyConfig.enabled && (
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testingConnection || loading}
            >
              {testingConnection ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  )

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Integrations</CardTitle>
          <CardDescription>
            Connect external tools and services to automatically create incidents and receive alerts
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Permission Check */}
      {!hasIntegrationPermission && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-orange-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-600">
                Integration settings can only be managed by organization owners, admins, or managers.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Current role: <span className="font-medium">{user?.role || 'member'}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Cards Grid - Only show if user has permission */}
      {hasIntegrationPermission && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableIntegrations.map((integration) => {
            const IconComponent = integration.icon
            return (
              <Dialog key={integration.id} onOpenChange={(open) => {
                if (open) setSelectedIntegration(integration.id)
                else setSelectedIntegration(null)
              }}>
                <DialogTrigger asChild>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 ${integration.iconBg} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform`}>
                            <IconComponent className={`w-6 h-6 ${integration.iconColor}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                              <Badge variant={integration.enabled ? "default" : "secondary"}>
                                {integration.enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
                          </div>
                        </div>
                        <Settings className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                
                {/* Render configuration dialog based on integration type */}
                {integration.id === 'pagerduty' && selectedIntegration === 'pagerduty' && renderPagerDutyConfig()}
                
                {/* Placeholder for other integrations */}
                {integration.id !== 'pagerduty' && selectedIntegration === integration.id && (
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${integration.iconBg} rounded-lg flex items-center justify-center`}>
                          <IconComponent className={`w-5 h-5 ${integration.iconColor}`} />
                        </div>
                        <span>{integration.name} Integration</span>
                      </DialogTitle>
                      <DialogDescription>
                        {integration.description}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                      <div className="text-center py-8 text-gray-500">
                        <IconComponent className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-sm">This integration is coming soon!</p>
                        <p className="text-xs text-gray-400 mt-2">We're working on adding {integration.name} support.</p>
                      </div>
                    </div>
                  </DialogContent>
                )}
              </Dialog>
            )
          })}
        </div>
      )}
    </div>
  )
}