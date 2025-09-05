'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import ResetPasswordForm from './reset-password-form'

export default function ResetPasswordHandler() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      const code = searchParams.get('code')
      
      if (!code) {
        setError('No authentication code found in URL')
        setIsLoading(false)
        return
      }

      try {
        console.log('Handling PKCE authentication with code...')
        
        // Call our API to handle the PKCE exchange server-side
        const res = await fetch('/api/auth/exchange-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })

        if (res.ok) {
          console.log('✅ Authentication successful')
          setIsAuthenticated(true)
          // Clean up URL by removing the code parameter
          const newUrl = new URL(window.location.href)
          newUrl.searchParams.delete('code')
          router.replace(newUrl.pathname + newUrl.search)
        } else {
          const data = await res.json()
          console.error('❌ Authentication failed:', data.error)
          setError(data.error || 'Authentication failed')
        }
      } catch (err) {
        console.error('Authentication error:', err)
        setError('Something went wrong during authentication')
      } finally {
        setIsLoading(false)
      }
    }

    handleAuth()
  }, [searchParams, router])

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