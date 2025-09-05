'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function PasswordChangeForm() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
    setSuccess('')

    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required')
      setLoading(false)
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirmation do not match')
      setLoading(false)
      return
    }

    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long')
      setLoading(false)
      return
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(data.message)
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => setSuccess(''), 5000)
      } else {
        setError(data.error || 'Failed to change password')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const strength = passwordStrength(formData.newPassword)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Lock className="w-5 h-5" />
          <span>Change Password</span>
        </CardTitle>
        <CardDescription>
          Update your account password to keep your account secure
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter your current password"
                required
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords.current ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
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
            {formData.newPassword && (
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
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
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
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="text-sm text-red-600">Passwords do not match</p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>At least 8 characters long</li>
              <li>Different from your current password</li>
              <li>Recommended: Include uppercase, lowercase, numbers, and symbols</li>
            </ul>
          </div>

          <Button 
            type="submit" 
            disabled={loading || formData.newPassword !== formData.confirmPassword}
            className="w-full"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}