'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Key, Building2, Bell, Shield, Zap } from 'lucide-react'
import { ClientLayout } from '@/components/layout/client-layout'
import ApiTokensManager from '@/components/settings/api-tokens'
import { PasswordChangeForm } from '@/components/settings/password-change'
import { IntegrationsManager } from '@/components/settings/integrations-manager'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('security')

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account security, API access, and preferences</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="tokens" className="flex items-center space-x-2">
              <Key className="w-4 h-4" />
              <span>API Tokens</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="organization" className="flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span>Organization</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="space-y-6">
            <PasswordChangeForm />
          </TabsContent>

          <TabsContent value="tokens" className="space-y-6">
            <ApiTokensManager />
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <IntegrationsManager />
          </TabsContent>

          <TabsContent value="organization" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Organization Settings</CardTitle>
                <CardDescription>Manage your organization details and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Organization Settings</h3>
                  <p className="text-gray-600">
                    Organization management features are coming soon. Contact support if you need assistance with organization settings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Notification Preferences</CardTitle>
                <CardDescription>Configure how and when you receive notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Notification Settings</h3>
                  <p className="text-gray-600">
                    Notification preferences will be available soon. You'll be able to configure email, Slack, and other notification channels.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  )
}