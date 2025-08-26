'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Copy, Plus, Trash2, Settings, Eye, EyeOff, Calendar, Activity, Key } from 'lucide-react'
import { ApiToken } from '@/lib/api-tokens'

interface GenerateTokenResponse {
  token: string
  tokenData: ApiToken
  message: string
}

export default function ApiTokensManager() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newToken, setNewToken] = useState<GenerateTokenResponse | null>(null)
  const [showToken, setShowToken] = useState(false)
  
  // Form state
  const [tokenName, setTokenName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [permissions, setPermissions] = useState<string[]>(['read', 'write'])
  const [scope, setScope] = useState('full')

  useEffect(() => {
    fetchTokens()
  }, [])

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/auth/tokens')
      if (response.ok) {
        const data = await response.json()
        setTokens(data.tokens)
      }
    } catch (error) {
      console.error('Failed to fetch tokens:', error)
    } finally {
      setLoading(false)
    }
  }

  const createToken = async () => {
    if (!tokenName.trim()) return

    setCreating(true)
    try {
      const response = await fetch('/api/auth/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tokenName.trim(),
          expiresAt: expiresAt || undefined,
          permissions,
          scope
        })
      })

      const data = await response.json()

      if (response.ok) {
        setNewToken(data)
        setTokens(prev => [data.tokenData, ...prev])
        // Reset form
        setTokenName('')
        setExpiresAt('')
        setPermissions(['read', 'write'])
        setScope('full')
        setShowCreateDialog(false)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to create token:', error)
      alert('Failed to create token')
    } finally {
      setCreating(false)
    }
  }

  const revokeToken = async (tokenId: string) => {
    try {
      const response = await fetch('/api/auth/tokens', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke',
          tokenId
        })
      })

      if (response.ok) {
        setTokens(prev => prev.map(token => 
          token.id === tokenId 
            ? { ...token, isActive: false }
            : token
        ))
      } else {
        const data = await response.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to revoke token:', error)
      alert('Failed to revoke token')
    }
  }

  const deleteToken = async (tokenId: string) => {
    try {
      const response = await fetch(`/api/auth/tokens?id=${tokenId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setTokens(prev => prev.filter(token => token.id !== tokenId))
      } else {
        const data = await response.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to delete token:', error)
      alert('Failed to delete token')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Could add a toast notification here
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = (expiresAt: string | undefined) => {
    return expiresAt && new Date(expiresAt) <= new Date()
  }

  if (loading) {
    return <div className="p-4">Loading API tokens...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">API Tokens</h2>
          <p className="text-gray-600 mt-1">
            Manage API tokens for programmatic access to ANTOPS
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Token
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New API Token</DialogTitle>
              <DialogDescription>
                Create a new API token for programmatic access to your ANTOPS account.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="tokenName">Token Name</Label>
                <Input
                  id="tokenName"
                  placeholder="e.g., GitHub Integration, Mobile App"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  maxLength={100}
                />
              </div>
              
              <div>
                <Label htmlFor="permissions">Permissions</Label>
                <Select 
                  value={permissions.join(',')} 
                  onValueChange={(value) => setPermissions(value.split(','))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read Only</SelectItem>
                    <SelectItem value="read,write">Read & Write</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="scope">Scope</Label>
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Access</SelectItem>
                    <SelectItem value="read_only">Read Only</SelectItem>
                    <SelectItem value="incidents_only">Incidents Only</SelectItem>
                    <SelectItem value="changes_only">Changes Only</SelectItem>
                    <SelectItem value="problems_only">Problems Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="expiresAt">Expiration (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty for no expiration. Max: 1 year from now.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                onClick={createToken}
                disabled={!tokenName.trim() || creating}
              >
                {creating ? 'Creating...' : 'Create Token'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* New Token Display */}
      {newToken && (
        <Card className="border-0 shadow-sm border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-green-800">Token Created Successfully!</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNewToken(null)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded border">
                <Label className="text-sm font-medium text-green-800">
                  Your API Token (save this now - it won't be shown again)
                </Label>
                <div className="flex items-center space-x-2 mt-2">
                  <code className="flex-1 p-2 bg-gray-50 rounded text-sm font-mono">
                    {showToken ? newToken.token : '•'.repeat(20) + newToken.token.slice(-8)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(newToken.token)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-green-700">
                <strong>Important:</strong> Store this token securely. You won't be able to see it again.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tokens List */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">API Tokens</CardTitle>
          <CardDescription>Active tokens for API access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tokens.length === 0 ? (
              <div className="text-center py-8">
                <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No API tokens yet</h3>
                <p className="text-gray-600">Create your first token to start using the API</p>
              </div>
            ) : (
              tokens.map((token) => (
                <div key={token.id} className={`flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors ${!token.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Key className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-sm font-medium text-gray-900">{token.name}</h3>
                        <Badge variant={token.isActive ? 'default' : 'secondary'}>
                          {token.isActive ? 'Active' : 'Revoked'}
                        </Badge>
                        {isExpired(token.expiresAt) && (
                          <Badge variant="destructive">Expired</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><strong>Token:</strong> {token.tokenPrefix}</p>
                        <p><strong>Permissions:</strong> {token.permissions.join(', ')}</p>
                        <p><strong>Scope:</strong> {token.scope}</p>
                        {token.expiresAt && (
                          <p className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <strong>Expires:</strong> {formatDate(token.expiresAt)}
                          </p>
                        )}
                        {token.lastUsedAt && (
                          <p className="flex items-center">
                            <Activity className="w-4 h-4 mr-1" />
                            <strong>Last used:</strong> {formatDate(token.lastUsedAt)}
                            {token.usageCount > 0 && ` (${token.usageCount} times)`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {token.isActive && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Revoke
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke API Token</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to revoke "{token.name}"? 
                              This will immediately stop all API requests using this token.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => revokeToken(token.id)}
                              className="bg-orange-600 hover:bg-orange-700"
                            >
                              Revoke Token
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete API Token</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to permanently delete "{token.name}"? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteToken(token.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}