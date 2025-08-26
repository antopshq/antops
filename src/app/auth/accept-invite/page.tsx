'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { TermsOfServiceModal } from '@/components/modals/TermsOfServiceModal'
import { PrivacyPolicyModal } from '@/components/modals/PrivacyPolicyModal'

interface InvitationData {
  id: string
  email: string
  role: string
  inviterName: string
  organizationName: string
  expiresAt: string
  expired: boolean
}

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  
  const [formData, setFormData] = useState({
    fullName: '',
    jobTitle: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    // Fetch invitation details
    fetch(`/api/auth/invitation/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setInvitation(data.invitation)
        }
      })
      .catch(() => {
        setError('Failed to load invitation details')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!invitation || !token) return

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setAccepting(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          fullName: formData.fullName,
          jobTitle: formData.jobTitle,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
      } else {
        const message = data.needsEmailConfirmation 
          ? 'Account created! Please check your email to verify before signing in.'
          : 'Account created successfully. Please sign in.'
        
        setSuccessMessage(message)
        setSuccess(true)
        
        setTimeout(() => {
          router.push(`/auth/signin?message=${encodeURIComponent(message)}`)
        }, 3000)
      }
    } catch (error) {
      setError('Failed to accept invitation. Please try again.')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <CardTitle>Invalid Invitation</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button 
              onClick={() => router.push('/auth/signin')}
              className="w-full"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <CardTitle>Welcome to ANTOPS!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              {successMessage || "Your account has been created successfully. You'll be redirected to sign in shortly."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation) return null

  if (invitation.expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <CardTitle>Invitation Expired</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              This invitation has expired. Please contact your administrator to get a new invitation.
            </p>
            <Button 
              onClick={() => router.push('/auth/signin')}
              className="w-full"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            {invitation.inviterName} has invited you to join <strong>{invitation.organizationName}</strong> as {invitation.role}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAccept} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-gray-100"
              />
            </div>

            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="Enter your job title (optional)"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                placeholder="Create a password (min. 6 characters)"
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                placeholder="Confirm your password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="text-center mb-4">
              <p className="text-xs text-gray-500">
                By accepting this invitation, you agree to our{' '}
                <button 
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-gray-600 hover:text-gray-800 underline"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button 
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-gray-600 hover:text-gray-800 underline"
                >
                  Privacy Policy
                </button>
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Account...
                </>
              ) : (
                'Accept Invitation & Create Account'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => router.push('/auth/signin')}
              >
                Sign in instead
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>

      <TermsOfServiceModal 
        open={showTermsModal} 
        onOpenChange={setShowTermsModal} 
      />
      <PrivacyPolicyModal 
        open={showPrivacyModal} 
        onOpenChange={setShowPrivacyModal} 
      />
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}