'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ChangeCompletionProps {
  changeId: string
  status: 'draft' | 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  isAssigned: boolean
  estimatedEndTime?: string
  onStatusChange?: () => void
}

export function ChangeCompletion({ changeId, status, isAssigned, estimatedEndTime, onStatusChange }: ChangeCompletionProps) {
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const showCompletionPrompt = status === 'in_progress' && isAssigned

  if (!showCompletionPrompt) {
    return null
  }

  // Check if estimated end time has passed
  const estimatedEndPassed = estimatedEndTime && new Date(estimatedEndTime) <= new Date()

  const handleCompletion = async (outcome: 'completed' | 'failed') => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/changes/${changeId}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome,
          notes: notes.trim() || undefined
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(`Change marked as ${outcome} successfully`)
        setNotes('')
        onStatusChange?.()
      } else {
        setError(data.error || `Failed to mark change as ${outcome}`)
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className={`border-2 ${estimatedEndPassed ? 'border-orange-300 bg-orange-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardHeader>
        <CardTitle className={`flex items-center space-x-2 ${estimatedEndPassed ? 'text-orange-900' : 'text-blue-900'}`}>
          {estimatedEndPassed ? (
            <>
              <AlertTriangle className="w-5 h-5" />
              <span>Change Completion Status Required</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Mark Change Completion</span>
            </>
          )}
        </CardTitle>
        <CardDescription className={estimatedEndPassed ? 'text-orange-800' : 'text-blue-800'}>
          {estimatedEndPassed ? (
            <>
              The estimated end time has passed. Please confirm if the change was completed successfully or if it failed.
              {estimatedEndTime && (
                <div className="mt-1 text-sm font-medium">
                  Estimated end: {new Date(estimatedEndTime).toLocaleString()}
                </div>
              )}
            </>
          ) : (
            'Mark the completion status of this change once implementation is finished.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="completion-notes" className={`text-sm font-medium ${estimatedEndPassed ? 'text-orange-900' : 'text-blue-900'}`}>
            Notes (optional)
          </Label>
          <Textarea
            id="completion-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about the change implementation, issues encountered, or additional details..."
            className={`${estimatedEndPassed ? 'border-orange-200 focus:border-orange-300 focus:ring-orange-300' : 'border-blue-200 focus:border-blue-300 focus:ring-blue-300'}`}
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={() => handleCompletion('completed')}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {loading ? 'Processing...' : 'Mark as Completed'}
          </Button>
          <Button
            onClick={() => handleCompletion('failed')}
            disabled={loading}
            variant="destructive"
          >
            <XCircle className="w-4 h-4 mr-2" />
            {loading ? 'Processing...' : 'Mark as Failed'}
          </Button>
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
      </CardContent>
    </Card>
  )
}