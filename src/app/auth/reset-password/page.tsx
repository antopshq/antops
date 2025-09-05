'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

function ResetPasswordContent() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const passwordStrength = (password: string) => {
    if (password.length < 8) return { strength: 'weak', message: 'At least 8 characters required' }
    
    let score = 0
    if (password.match(/[a-z]/)) score++
    if (password.match(/[A-Z]/)) score++
    if (password.match(/[0-9]/)) score++
    if (password.match(/[^a-zA-Z0-9]/)) score++
    
    if (score < 2) return { strength: 'weak', message: 'Too weak' }
    if (score < 3) return { strength: 'medium', message: 'Good' }
    return { strength: 'strong', message: 'Strong' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (!newPassword || !confirmPassword) {
      setError('All fields are required')
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      // Get the code from URL
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      
      if (!code) {
        setError('Invalid or expired reset link. Please request a new password reset.')
        setLoading(false)
        return
      }

      console.log('Exchanging code for session...')
      console.log('Environment variables check:', {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'present' : 'missing',
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'present' : 'missing'
      })
      
      // Create supabase client directly
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      // Exchange the code for a session
      const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Code exchange error:', error)
        setError('Invalid or expired reset link. Please request a new password reset.')
        setLoading(false)
        return
      }

      console.log('Session established, updating password...')

      // Now update the password using the authenticated session
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        console.error('Password update error:', updateError)
        setError('Failed to update password. Please try again.')
        setLoading(false)
        return
      }

      console.log('Password updated successfully!')
      setSuccess(true)
      setTimeout(() => {
        router.push('/auth/signin')
      }, 3000)

    } catch (err) {
      console.error('Reset password error:', err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const togglePasswordVisibility = (field: 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const strength = passwordStrength(newPassword)

  if (success) {
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
            <CardTitle className="text-2xl font-semibold text-center">Password Reset Successful</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Your password has been updated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-green-200 bg-green-50 mb-6">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your password has been reset successfully. You will be redirected to the sign-in page shortly.
              </AlertDescription>
            </Alert>
            
            <Link href="/auth/signin">
              <Button className="w-full">
                Continue to Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
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
          <CardTitle className="text-2xl font-semibold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center text-gray-600">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.new ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {newPassword && (
                <div className="flex items-center space-x-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${
                    strength.strength === 'weak' ? 'bg-red-500' :
                    strength.strength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className={`${
                    strength.strength === 'weak' ? 'text-red-600' :
                    strength.strength === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {strength.message}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-600">Passwords do not match</p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>At least 8 characters long</li>
                <li>Recommended: Include uppercase, lowercase, numbers, and symbols</li>
              </ul>
            </div>

            <Button 
              type="submit" 
              disabled={loading || newPassword !== confirmPassword}
              className="w-full"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <Link href="/auth/signin" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600">
        <Card className="w-full max-w-md border-0 shadow-sm">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}