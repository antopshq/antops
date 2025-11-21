'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MessageSquare, X } from 'lucide-react'

interface ClosureCommentDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (comment: string) => void
  incidentTitle: string
  isSubmitting?: boolean
}

export function ClosureCommentDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  incidentTitle, 
  isSubmitting = false 
}: ClosureCommentDialogProps) {
  const [comment, setComment] = useState('')

  const handleSubmit = () => {
    if (comment.trim()) {
      onConfirm(comment.trim())
    }
  }

  const handleCancel = () => {
    setComment('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-orange-600" />
            Close Incident
          </DialogTitle>
          <DialogDescription>
            Please provide a reason for closing this incident. This comment will be added to the incident history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Incident Title */}
          <div>
            <Label className="text-sm font-medium text-gray-700">Incident</Label>
            <div className="mt-1 p-2 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-900 line-clamp-2">{incidentTitle}</p>
            </div>
          </div>

          {/* Closure Comment */}
          <div>
            <Label className="text-sm font-medium text-gray-700">
              Closure Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe why this incident is being closed (e.g., 'Issue resolved after restarting the database server', 'False alarm - monitoring alert was incorrect', etc.)"
              className="mt-1 min-h-[100px]"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              This comment will be visible in the incident timeline and comments section.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!comment.trim() || isSubmitting}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isSubmitting ? 'Closing...' : 'Close Incident'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}