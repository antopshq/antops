'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ResetPasswordForm from './reset-password-form'

export default function ResetPasswordFormWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const handleHashAuth = async () => {
      console.log('Checking URL for auth hash...')
      
      // Check for hash-based authentication (non-PKCE)
      const hash = window.location.hash
      console.log('Current hash:', hash)
      
      if (hash) {
        // Parse hash parameters for token-based auth
        const params = new URLSearchParams(hash.substring(1))
        const accessToken = params.get('access_token')
        const tokenType = params.get('token_type')
        const type = params.get('type')
        
        console.log('Hash params:', { accessToken: !!accessToken, tokenType, type })
        
        if (accessToken && type === 'recovery') {
          try {
            console.log('Found recovery token, verifying session...')
            
            // Call API to establish session with the token
            const res = await fetch('/api/auth/verify-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                access_token: accessToken,
                token_type: tokenType || 'bearer'
              })
            })
            
            if (res.ok) {
              console.log('✅ Token verification successful')
              setIsAuthenticated(true)
              // Clean up URL by removing the hash
              router.replace('/auth/reset-password')
            } else {
              const data = await res.json()
              console.error('❌ Token verification failed:', data.error)
              setError(data.error || 'Invalid or expired reset link')
            }
          } catch (err) {
            console.error('Token verification error:', err)
            setError('Something went wrong during authentication')
          }
        } else {
          console.log('No valid recovery token found in hash')
          setError('Invalid reset link format')
        }
      } else {
        console.log('No hash found, checking for existing session...')
        
        // Check if user already has a valid session
        try {
          const res = await fetch('/api/auth/session')
          if (res.ok) {
            const data = await res.json()
            if (data.user) {
              console.log('✅ Existing session found')
              setIsAuthenticated(true)
            } else {
              setError('No authentication found. Please request a new password reset link.')
            }
          } else {
            setError('No authentication found. Please request a new password reset link.')
          }
        } catch (err) {
          console.error('Session check error:', err)
          setError('Failed to verify authentication')
        }
      }
      
      setIsLoading(false)
    }

    handleHashAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">Verifying reset link...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex justify-center">
              <img 
                src="/ANTOPS.png" 
                alt="ANTOPS Logo" 
                className="h-20 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-semibold text-center">Authentication Error</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Unable to verify your reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Reset Link Invalid</h3>
              <p className="text-gray-600 mb-6">
                {error}
              </p>
              
              <div className="space-y-3">
                <Link href="/auth/forgot-password">
                  <Button className="w-full">
                    Request New Password Reset
                  </Button>
                </Link>
                
                <Link href="/auth/signin">
                  <Button variant="outline" className="w-full">
                    Back to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isAuthenticated) {
    return <ResetPasswordForm />
  }

  return null
}