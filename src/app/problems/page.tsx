import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getProblems } from '@/lib/problem-store-multitenant'
import { getIncidents, getChanges } from '@/lib/store-multitenant'
import { Priority, ProblemStatus } from '@/lib/types'
import { Plus, Clock, AlertCircle, GitBranch, List } from 'lucide-react'
import Link from 'next/link'
import { SimpleRelationshipMap } from '@/components/problems/relationship-map-simple'

function getPriorityColor(priority: Priority) {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200'
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getStatusColor(status: ProblemStatus) {
  switch (status) {
    case 'identified': return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'investigating': return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'known_error': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
    case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

function getStatusLabel(status: ProblemStatus) {
  switch (status) {
    case 'known_error': return 'Known Error'
    default: return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    return `${Math.round(diffInHours * 60)} minutes ago`
  } else if (diffInHours < 24) {
    return `${Math.round(diffInHours)} hours ago`
  } else {
    return `${Math.round(diffInHours / 24)} days ago`
  }
}

export default async function ProblemsPage() {
  const problems = await getProblems()
  const incidents = await getIncidents()
  const changes = await getChanges()
  

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Problems</h1>
            <p className="text-gray-600 mt-1">Root cause analysis and relationship mapping</p>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/problems/list">
              <Button variant="outline">
                <List className="w-4 h-4 mr-2" />
                List View
              </Button>
            </Link>
            <Link href="/problems/new">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Problem
              </Button>
            </Link>
          </div>
        </div>

        {problems.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GitBranch className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No problems found</h3>
              <p className="text-gray-600 text-center max-w-sm mb-6">
                Get started by creating your first problem to begin mapping root causes and relationships.
              </p>
              <Link href="/problems/new">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Problem
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <SimpleRelationshipMap problems={problems} incidents={incidents} changes={changes} />
        )}
      </div>
    </DashboardLayout>
  )
}