'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Check, Copy, ExternalLink, RefreshCw, Settings, Zap, Webhook, MessageSquare, Mail, BarChart3, CreditCard, Plus, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { PaymentMethodForm } from '@/components/billing/PaymentMethodForm'

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

interface GrafanaIntegration {
  id?: string
  enabled: boolean
  webhookUrl: string
  apiKey?: string
  organizationId: string
  autoCreateIncidents: boolean
  createdAt?: string
  updatedAt?: string
}

interface BillingIntegration {
  id?: string
  enabled: boolean
  stripeCustomerId?: string
  subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid' | null
  currentPlan: 'free' | 'pro'
  billingEmail?: string
  organizationId: string
  createdAt?: string
  updatedAt?: string
}

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  created: number
}

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  iconBg: string
  iconColor: string
  enabled: boolean
  category: 'alerting' | 'communication' | 'monitoring' | 'billing'
}

export function IntegrationsManager() {
  const { user, loading: authLoading } = useAuth()
  const [pagerDutyConfig, setPagerDutyConfig] = useState<PagerDutyIntegration>({
    enabled: false,
    webhookUrl: '',
    apiKey: '',
    routingKey: '',
    organizationId: ''
  })
  const [grafanaConfig, setGrafanaConfig] = useState<GrafanaIntegration>({
    enabled: false,
    webhookUrl: '',
    apiKey: '',
    organizationId: '',
    autoCreateIncidents: true
  })
  const [billingConfig, setBillingConfig] = useState<BillingIntegration>({
    enabled: false,
    subscriptionStatus: null,
    currentPlan: 'free',
    organizationId: ''
  })
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [webhookUrlGenerated, setWebhookUrlGenerated] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  // Check if user has permission to manage integrations
  const hasIntegrationPermission = user?.role && ['owner', 'admin', 'manager'].includes(user.role)
  const hasBillingPermission = user?.role && ['owner', 'admin'].includes(user.role)

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
      id: 'grafana',
      name: 'Grafana',
      description: 'Receive Grafana alert notifications and auto-create incidents from dashboards',
      icon: BarChart3,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      enabled: grafanaConfig.enabled,
      category: 'monitoring'
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
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      enabled: false,
      category: 'communication'
    },
    {
      id: 'billing',
      name: 'Billing & Subscription',
      description: 'Manage your subscription plan, billing details, and payment methods',
      icon: CreditCard,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      enabled: billingConfig.subscriptionStatus === 'active',
      category: 'billing'
    }
  ]

  // Generate webhook URLs on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !webhookUrlGenerated) {
      const pagerDutyWebhookUrl = `${window.location.origin}/api/webhooks/pagerduty`
      const grafanaWebhookUrl = `${window.location.origin}/api/webhooks/grafana`
      setPagerDutyConfig(prev => ({ ...prev, webhookUrl: pagerDutyWebhookUrl }))
      setGrafanaConfig(prev => ({ ...prev, webhookUrl: grafanaWebhookUrl }))
      setWebhookUrlGenerated(true)
    }
  }, [webhookUrlGenerated])

  // Check for Stripe checkout success/cancel on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const canceled = urlParams.get('canceled')
    const sessionId = urlParams.get('session_id')

    if (success === 'true') {
      setMessage({ type: 'success', text: 'Payment successful! Your Pro subscription is now active.' })
      // Clean up URL
      window.history.replaceState({}, '', '/settings?tab=integrations')
    } else if (canceled === 'true') {
      setMessage({ type: 'error', text: 'Payment was canceled. You can try again anytime.' })
      // Clean up URL
      window.history.replaceState({}, '', '/settings?tab=integrations')
    }
  }, [])

  // Fetch existing configuration
  useEffect(() => {
    const fetchConfiguration = async () => {
      try {
        setLoading(true)
        
        // Fetch PagerDuty configuration
        const pagerDutyResponse = await fetch('/api/integrations/pagerduty')
        if (pagerDutyResponse.ok) {
          const pagerDutyData = await pagerDutyResponse.json()
          if (pagerDutyData.integration) {
            setPagerDutyConfig(pagerDutyData.integration)
            setWebhookUrlGenerated(true)
          }
        }

        // Fetch Grafana configuration
        const grafanaResponse = await fetch('/api/integrations/grafana')
        if (grafanaResponse.ok) {
          const grafanaData = await grafanaResponse.json()
          if (grafanaData.integration) {
            setGrafanaConfig(grafanaData.integration)
          }
        }

        // Fetch Billing configuration
        const billingResponse = await fetch('/api/integrations/billing')
        if (billingResponse.ok) {
          const billingData = await billingResponse.json()
          if (billingData.integration) {
            setBillingConfig(billingData.integration)
          }
        }

        // Fetch Payment Methods
        const paymentMethodsResponse = await fetch('/api/integrations/billing/payment-methods')
        if (paymentMethodsResponse.ok) {
          const paymentMethodsData = await paymentMethodsResponse.json()
          if (paymentMethodsData.paymentMethods) {
            setPaymentMethods(paymentMethodsData.paymentMethods)
          }
        }
      } catch (error) {
        console.error('Failed to fetch integration configurations:', error)
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

  const copyWebhookUrl = async (webhookUrl: string, integrationName: string) => {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      setMessage({ type: 'success', text: `${integrationName} webhook URL copied to clipboard!` })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to copy webhook URL' })
    }
  }

  const handleGrafanaSave = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/integrations/grafana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grafanaConfig)
      })

      if (response.ok) {
        const data = await response.json()
        setGrafanaConfig(data.integration)
        setMessage({ type: 'success', text: 'Grafana integration saved successfully!' })
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

  const handleBillingSave = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/integrations/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billingConfig)
      })

      if (response.ok) {
        const data = await response.json()
        setBillingConfig(data.integration)
        setMessage({ type: 'success', text: 'Billing configuration saved successfully!' })
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

  const handleCustomerPortal = async () => {
    try {
      const response = await fetch('/api/integrations/billing/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          return_url: `${window.location.origin}/settings?tab=integrations` 
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.open(data.url, '_blank')
        }
        setMessage({ type: 'success', text: data.message || 'Customer portal opened' })
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Failed to open customer portal' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to open customer portal' })
    }
  }

  const handleCheckoutSuccess = () => {
    setShowPaymentForm(false)
    setMessage({ type: 'success', text: 'Redirecting to secure checkout...' })
    // The actual success handling will happen on return from Stripe
  }

  const handlePaymentMethodError = (error: string) => {
    setMessage({ type: 'error', text: error })
  }

  // Helper function to detect user's currency preference
  const getUserCurrency = (): 'usd' | 'eur' => {
    const locale = typeof window !== 'undefined' ? navigator.language : 'en-US'
    const europeanLocales = ['de', 'fr', 'es', 'it', 'nl', 'pt', 'pl', 'sv', 'no', 'dk', 'fi']
    const isEuropean = europeanLocales.some(lang => locale.toLowerCase().startsWith(lang))
    return isEuropean || locale.toLowerCase().startsWith('en-gb') ? 'eur' : 'usd'
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
                    onClick={() => copyWebhookUrl(pagerDutyConfig.webhookUrl, 'PagerDuty')}
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

  const renderBillingConfig = () => (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <span>Billing & Subscription Management</span>
          </div>
        </DialogTitle>
        <DialogDescription>
          Manage your subscription plan, view billing information, and update payment methods
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

        {/* Current Plan Status */}
        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-indigo-900">Current Plan</h3>
              <p className="text-indigo-700 capitalize text-2xl font-bold mt-1">
                {billingConfig.currentPlan}
              </p>
              <p className="text-sm text-indigo-600 mt-1">
                Status: <span className="capitalize font-medium">
                  {billingConfig.subscriptionStatus || 'Free'}
                </span>
              </p>
              {billingConfig.currentPlan === 'pro' && (
                <p className="text-sm text-indigo-600 mt-1">
                  {getUserCurrency() === 'eur' ? '€9.99' : '$9.99'} / month (billed monthly on organization anniversary)
                </p>
              )}
            </div>
            <div className="text-right">
              <Badge 
                variant={billingConfig.subscriptionStatus === 'active' ? "default" : "secondary"}
                className="mb-2"
              >
                {billingConfig.subscriptionStatus === 'active' ? 'Active Subscription' : 'Free Plan'}
              </Badge>
              {billingConfig.billingEmail && (
                <p className="text-sm text-indigo-600">
                  Billing: {billingConfig.billingEmail}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Methods Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Payment Methods</h4>
            {billingConfig.currentPlan === 'free' && !showPaymentForm && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPaymentForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method & Upgrade to Pro
              </Button>
            )}
          </div>

          {/* Payment Method Form */}
          {showPaymentForm && (
            <Card className="p-4 border-2 border-blue-200 bg-blue-50">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-blue-900">Add Payment Method & Upgrade to Pro</h5>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPaymentForm(false)}
                  >
                    ×
                  </Button>
                </div>
                <div className="bg-white p-4 rounded-lg">
                  <PaymentMethodForm
                    onSuccess={handleCheckoutSuccess}
                    onError={handlePaymentMethodError}
                    loading={saving}
                    currency={getUserCurrency()}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Existing Payment Methods */}
          {paymentMethods.length > 0 && (
            <div className="space-y-2">
              {paymentMethods.map((pm) => (
                <Card key={pm.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium capitalize">
                          {pm.brand} **** **** **** {pm.last4}
                        </p>
                        <p className="text-sm text-gray-600">
                          Expires {pm.exp_month.toString().padStart(2, '0')}/{pm.exp_year}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Default</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Customer Portal Link */}
          {billingConfig.stripeCustomerId && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleCustomerPortal}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Manage Billing & Invoices
            </Button>
          )}
        </div>

        {/* Usage & Limits */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Usage & Limits</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {billingConfig.currentPlan === 'free' ? '5' : '∞'}
              </div>
              <div className="text-sm text-gray-600">Team Members</div>
              <div className="text-xs text-gray-500 mt-1">
                {billingConfig.currentPlan === 'free' ? 'Up to 5 members' : 'Unlimited'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {billingConfig.currentPlan === 'free' ? '100' : '∞'}
              </div>
              <div className="text-sm text-gray-600">Incidents/Month</div>
              <div className="text-xs text-gray-500 mt-1">
                {billingConfig.currentPlan === 'free' ? 'Up to 100/month' : 'Unlimited'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {billingConfig.currentPlan === 'free' ? '3' : '∞'}
              </div>
              <div className="text-sm text-gray-600">Integrations</div>
              <div className="text-xs text-gray-500 mt-1">
                {billingConfig.currentPlan === 'free' ? 'Basic integrations' : 'All integrations'}
              </div>
            </div>
          </div>
        </div>

        {/* Billing Information */}
        {hasBillingPermission && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Billing Information</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="billing-email" className="text-sm font-medium">
                  Billing Email
                </Label>
                <Input
                  id="billing-email"
                  type="email"
                  placeholder="Enter billing email address"
                  value={billingConfig.billingEmail || ''}
                  onChange={(e) => 
                    setBillingConfig(prev => ({ ...prev, billingEmail: e.target.value }))
                  }
                />
                <p className="text-xs text-gray-600">
                  Invoices and billing notifications will be sent to this email
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => window.open('https://docs.stripe.com/billing', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Billing Documentation
        </Button>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleCustomerPortal}
            disabled={!billingConfig.stripeCustomerId}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Customer Portal
          </Button>
          
          <Button
            onClick={handleBillingSave}
            disabled={saving || loading}
            className="bg-indigo-600 hover:bg-indigo-700"
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

  const renderGrafanaConfig = () => (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <span>Grafana Integration</span>
          </div>
        </DialogTitle>
        <DialogDescription>
          Configure Grafana to send alert notifications and auto-create incidents from monitoring dashboards
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
            <Label htmlFor="grafana-enabled" className="text-sm font-medium">
              Enable Grafana Integration
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Allow Grafana alerts to create notifications and incidents
            </p>
          </div>
          <Switch
            id="grafana-enabled"
            checked={grafanaConfig.enabled}
            onCheckedChange={(enabled) => 
              setGrafanaConfig(prev => ({ ...prev, enabled: enabled as boolean }))
            }
          />
        </div>

        {grafanaConfig.enabled && (
          <>
            {/* Webhook URL */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Webhook URL</Label>
              <div className="flex space-x-2">
                <Input
                  value={grafanaConfig.webhookUrl}
                  readOnly
                  className="font-mono text-xs bg-gray-50"
                />
                <Tooltip content="Copy webhook URL">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyWebhookUrl(grafanaConfig.webhookUrl, 'Grafana')}
                    className="px-3"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </Tooltip>
              </div>
              <p className="text-xs text-gray-600">
                Configure this URL in your Grafana notification channels
              </p>
            </div>

            {/* Auto Create Incidents */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <Label htmlFor="grafana-auto-create" className="text-sm font-medium">
                  Auto-create Incidents
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Automatically create incidents when users click on Grafana notifications
                </p>
              </div>
              <Switch
                id="grafana-auto-create"
                checked={grafanaConfig.autoCreateIncidents}
                onCheckedChange={(enabled) => 
                  setGrafanaConfig(prev => ({ ...prev, autoCreateIncidents: enabled as boolean }))
                }
              />
            </div>

            {/* Optional API Key */}
            <div className="space-y-2">
              <Label htmlFor="grafana-api-key" className="text-sm font-medium">
                Grafana API Key (Optional)
              </Label>
              <Input
                id="grafana-api-key"
                type="password"
                placeholder="Enter your Grafana API key"
                value={grafanaConfig.apiKey || ''}
                onChange={(e) => 
                  setGrafanaConfig(prev => ({ ...prev, apiKey: e.target.value }))
                }
              />
              <p className="text-xs text-gray-600">
                Used to validate webhook requests and fetch additional dashboard data
              </p>
            </div>
          </>
        )}
      </div>

      <DialogFooter className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => window.open('https://grafana.com/docs/grafana/latest/alerting/manage-notifications/webhook-notifier/', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Documentation
        </Button>
        
        <div className="flex space-x-3">
          <Button
            onClick={handleGrafanaSave}
            disabled={saving || loading}
            className="bg-orange-600 hover:bg-orange-700"
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

      {/* Loading State */}
      {authLoading && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading integrations...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permission Check - Only show if auth has finished loading */}
      {!authLoading && !hasIntegrationPermission && (
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

      {/* Integration Cards Grid - Only show if user has permission and auth has finished loading */}
      {!authLoading && hasIntegrationPermission && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableIntegrations
            .filter(integration => integration.id !== 'billing' || hasBillingPermission)
            .map((integration) => {
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
                {integration.id === 'grafana' && selectedIntegration === 'grafana' && renderGrafanaConfig()}
                {integration.id === 'billing' && selectedIntegration === 'billing' && renderBillingConfig()}
                
                {/* Placeholder for other integrations */}
                {!['pagerduty', 'grafana', 'billing'].includes(integration.id) && selectedIntegration === integration.id && (
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