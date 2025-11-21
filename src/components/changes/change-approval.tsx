'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, Clock, Send } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ChangeApprovalProps {
  changeId: string
  status: 'draft' | 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  userRole: 'owner' | 'admin' | 'manager' | 'member' | 'viewer'
  onStatusChange?: () => void
}

export function ChangeApproval({ changeId, status, userRole, onStatusChange }: ChangeApprovalProps) {
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canRequestApproval = status === 'draft'
  const canApproveReject = status === 'pending' && ['owner', 'admin', 'manager'].includes(userRole)
  const requestSent = status === 'pending'

  const handleRequestApproval = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/changes/${changeId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(`Approval requested successfully. ${data.managersNotified} managers notified.`)
        onStatusChange?.()
      } else {
        setError(data.error || 'Failed to request approval')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleApprovalAction = async (action: 'approve' | 'reject') => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/changes/${changeId}/approval`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          comments: comments.trim() || undefined
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(`Change ${action}d successfully`)
        setComments('')
        onStatusChange?.()
      } else {
        setError(data.error || `Failed to ${action} change`)
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!canRequestApproval && !canApproveReject) {
    return null
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-900">
          {canRequestApproval ? (
            <>
              <Send className="w-5 h-5" />
              <span>Request Approval</span>
            </>
          ) : (
            <>
              <Clock className="w-5 h-5" />
              <span>Approval Required</span>
            </>
          )}
        </CardTitle>
        <CardDescription className="text-blue-800">
          {canRequestApproval 
            ? 'Submit this change for manager approval before implementation.'
            : requestSent 
              ? 'Request has been sent to managers. Waiting for approval...'
              : 'This change is waiting for your approval as a manager.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canApproveReject && (
          <div className="space-y-2">
            <Label htmlFor="approval-comments" className="text-sm font-medium text-blue-900">
              Comments (optional)
            </Label>
            <Textarea
              id="approval-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments about this approval decision..."
              className="border-blue-200 focus:border-blue-300 focus:ring-blue-300"
              rows={3}
            />
          </div>
        )}

        <div className="flex items-center space-x-3">
          {canRequestApproval ? (
            <Button
              onClick={handleRequestApproval}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Requesting...' : 'Request Approval'}
            </Button>
          ) : requestSent ? (
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-3 text-blue-800">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Request sent to managers</span>
              </div>
              <p className="text-sm mt-1">Waiting for manager approval...</p>
            </div>
          ) : (
            <>
              <Button
                onClick={() => handleApprovalAction('approve')}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {loading ? 'Processing...' : 'Approve'}
              </Button>
              <Button
                onClick={() => handleApprovalAction('reject')}
                disabled={loading}
                variant="destructive"
              >
                <XCircle className="w-4 h-4 mr-2" />
                {loading ? 'Processing...' : 'Reject'}
              </Button>
            </>
          )}
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