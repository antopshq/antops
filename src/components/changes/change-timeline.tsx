'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Clock, AlertTriangle, FileText, Zap, X, Ban } from 'lucide-react'

export interface StatusHistoryEntry {
  id: string
  status: 'draft' | 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  changedBy: string
  changedByName?: string
  changedAt: string
  comment?: string
}

interface ChangeTimelineProps {
  statusHistory: StatusHistoryEntry[]
  currentStatus: string
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'draft': return FileText
    case 'pending': return Clock
    case 'approved': return CheckCircle
    case 'in_progress': return Zap
    case 'completed': return CheckCircle
    case 'failed': return AlertTriangle
    case 'cancelled': return Ban
    default: return FileText
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'draft': return 'text-gray-600 bg-gray-100'
    case 'pending': return 'text-blue-600 bg-blue-100'
    case 'approved': return 'text-green-600 bg-green-100'
    case 'in_progress': return 'text-purple-600 bg-purple-100'
    case 'completed': return 'text-emerald-600 bg-emerald-100'
    case 'failed': return 'text-red-600 bg-red-100'
    case 'cancelled': return 'text-gray-600 bg-gray-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

function getStatusBadgeColor(status: string) {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200'
    case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'approved': return 'bg-green-100 text-green-800 border-green-200'
    case 'in_progress': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'failed': return 'bg-red-100 text-red-800 border-red-200'
    case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function formatStatusName(status: string) {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function ChangeTimeline({ statusHistory, currentStatus }: ChangeTimelineProps) {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span>Status History</span>
        </h3>
      </div>
      
      <div className="space-y-4">
        {statusHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No status changes yet
          </div>
        ) : (
          statusHistory.map((entry, index) => {
            const StatusIcon = getStatusIcon(entry.status)
            const isLatest = index === statusHistory.length - 1
            const isFirst = index === 0
            
            return (
              <div key={entry.id} className="relative">
                {/* Timeline line - connect to previous item (never show on first item) */}
                {!isFirst && (
                  <div className="absolute left-3 -top-6 w-0.5 h-6 bg-gray-200 z-0" />
                )}
                
                <div className="flex items-start space-x-3">
                  {/* Status icon */}
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 relative z-10 ${
                    entry.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                    entry.status === 'failed' ? 'bg-red-100 text-red-600' :
                    entry.status === 'approved' ? 'bg-green-100 text-green-600' :
                    entry.status === 'in_progress' ? 'bg-purple-100 text-purple-600' :
                    entry.status === 'pending' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  } ${isLatest ? 'ring-2 ring-blue-200 ring-offset-1' : ''}`}>
                    <StatusIcon className="w-3 h-3" />
                  </div>
                  
                  {/* Status info */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {formatStatusName(entry.status)}
                      </span>
                      {isLatest && (
                        <span className="text-xs text-blue-600 font-medium">Current</span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-1">
                      {new Date(entry.changedAt).toLocaleString()}
                    </p>
                    
                    <p className="text-xs text-gray-600">
                      by {entry.changedByName || 'System'}
                    </p>
                    
                    {entry.comment && (
                      <p className="text-xs text-gray-500 mt-1 italic">
                        {entry.comment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}