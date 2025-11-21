'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { TermsOfServiceModal } from '@/components/modals/TermsOfServiceModal'
import { PrivacyPolicyModal } from '@/components/modals/PrivacyPolicyModal'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (res.ok) {
        router.push('/dashboard')
      } else {
        const data = await res.json()
        setError(data.error || 'Sign in failed')
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
          <CardTitle className="text-2xl font-semibold text-center">Sign in</CardTitle>
          <CardDescription className="text-center text-gray-600">
            Enter your email and password to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Enter your password"
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full h-10 bg-gray-900 hover:bg-gray-800"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              <Link href="/auth/forgot-password" className="text-gray-900 hover:text-gray-700 font-medium">
                Forgot password?
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-gray-900 hover:text-gray-700 font-medium">
                Sign up
              </Link>
            </p>
            <p className="text-xs text-gray-500 mt-4">
              Review our{' '}
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