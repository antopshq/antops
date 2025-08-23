'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { XCircle, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface ChangeCancelProps {
  changeId: string
  changeTitle: string
  status: 'draft' | 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  userRole: 'owner' | 'admin' | 'manager' | 'member' | 'viewer'
  onStatusChange?: () => void
}

export function ChangeCancel({ changeId, changeTitle, status, userRole, onStatusChange }: ChangeCancelProps) {
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Only managers, admins, and owners can cancel changes
  const canCancel = ['owner', 'admin', 'manager'].includes(userRole)
  
  // Can only cancel changes in draft, pending, or approved status
  const cancellableStatuses = ['draft', 'pending', 'approved']
  const isCancellable = cancellableStatuses.includes(status)

  if (!canCancel || !isCancellable) {
    return null
  }

  const handleCancel = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/changes/${changeId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim() || undefined
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('Change cancelled successfully')
        setReason('')
        setIsDialogOpen(false)
        onStatusChange?.()
      } else {
        setError(data.error || 'Failed to cancel change')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'draft': return 'draft'
      case 'pending': return 'pending approval'
      case 'approved': return 'approved'
      default: return status
    }
  }

  return (
    <>
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-900">
            <AlertTriangle className="w-5 h-5" />
            <span>Cancel Change</span>
          </CardTitle>
          <CardDescription className="text-red-800">
            Cancel this change and prevent it from proceeding. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Change
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span>Cancel Change</span>
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to cancel "{changeTitle}"? This change is currently {getStatusLabel()} and will be moved to cancelled status.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-2 py-4">
                <Label htmlFor="cancel-reason" className="text-sm font-medium">
                  Cancellation Reason (optional)
                </Label>
                <Textarea
                  id="cancel-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide a reason for cancelling this change..."
                  className="border-red-200 focus:border-red-300 focus:ring-red-300"
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={loading}
                >
                  Keep Change
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loading ? 'Cancelling...' : 'Cancel Change'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
    </>
  )
}