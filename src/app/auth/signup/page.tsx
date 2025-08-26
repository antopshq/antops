'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

function SignUpContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [hasAccess, setHasAccess] = useState(false)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [jobRole, setJobRole] = useState('')
  const [role, setRole] = useState<'owner' | 'admin' | 'manager' | 'member'>('owner')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if the provided token matches the pilot token
    const checkAccess = async () => {
      try {
        const response = await fetch('/api/auth/check-pilot-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })
        
        const data = await response.json()
        setHasAccess(data.hasAccess || false)
      } catch (error) {
        console.error('Access check failed:', error)
        setHasAccess(false)
      } finally {
        setCheckingAccess(false)
      }
    }

    checkAccess()
  }, [token])

  if (checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
              <p className="text-gray-600">Checking access...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600" style={{background: 'linear-gradient(135deg, #fa8c16 0%, #ff7875 50%, #ffa940 100%)'}}>
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="w-16 h-16 text-orange-600" />
            </div>
            <CardTitle className="text-2xl font-semibold">Access Restricted</CardTitle>
            <CardDescription className="text-gray-600">
              ANTOPS signup is currently in pilot phase. Apply for early access to join our pilot program.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-center">
              <a href="https://docs.google.com/forms/d/e/1FAIpQLSfeDuCy931MGuLJQ_MAttNqKq7ZtnmRhxr-eRq4mrRrlAG0NA/viewform?usp=header" target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-orange-600 hover:bg-orange-700">
                  Apply for Pilot Access
                </Button>
              </a>
              <Link href="/auth/signin">
                <Button variant="outline" className="w-full">
                  Go to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          organizationName,
          jobRole,
          role 
        })
      })

      const data = await res.json()

      if (res.ok) {
        if (data.needsConfirmation) {
          setSuccess(data.message)
        } else {
          router.push('/dashboard')
        }
      } else {
        setError(data.error || 'Sign up failed')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600" style={{background: 'linear-gradient(135deg, #fa8c16 0%, #ff7875 50%, #ffa940 100%)'}}>
      <Card className="w-full max-w-md border-0 shadow-sm">
        <CardHeader className="space-y-4 pb-6">
          <div className="flex justify-center">
            <img 
              src="/ANTOPS.png" 
              alt="ANTOPS Logo" 
              className="h-20 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-semibold text-center">Create Your Organization</CardTitle>
          <CardDescription className="text-center text-gray-600">
            Set up your company account and get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
                placeholder="Enter your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
                placeholder="Enter your email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
                placeholder="Create a password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobRole" className="text-sm font-medium text-gray-700">Job Title</Label>
              <Input
                id="jobRole"
                type="text"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                className="h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
                placeholder="Your job title (optional)"
              />
            </div>

            <div className="border-t pt-4 mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Organization Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="organizationName" className="text-sm font-medium text-gray-700">Organization Name</Label>
                <Input
                  id="organizationName"
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
                  placeholder="Your company or organization name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Your Role</Label>
                <Select
                  value={role}
                  onValueChange={(value: 'owner' | 'admin' | 'manager' | 'member') => setRole(value)}
                >
                  <SelectTrigger className="h-10 border-gray-200 focus:border-gray-300 focus:ring-1 focus:ring-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner - Full control of organization</SelectItem>
                    <SelectItem value="admin">Admin - Manage settings and users</SelectItem>
                    <SelectItem value="manager">Manager - Manage incidents and changes</SelectItem>
                    <SelectItem value="member">Member - Create and work on items</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Choose your role in the organization. You can change this later.
                </p>
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-md p-3">
                {success}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full h-10 bg-gray-900 hover:bg-gray-800"
              disabled={loading}
            >
              {loading ? 'Creating organization...' : 'Create Organization'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-gray-900 hover:text-gray-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignUp() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-600" />
              <p className="text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
}