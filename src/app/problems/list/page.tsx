'use client'

import { useState, useEffect } from 'react'
import { ClientLayout } from '@/components/layout/client-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Priority, ProblemStatus } from '@/lib/types'
import { Plus, Clock, AlertCircle, GitBranch, ArrowLeft, Search, X, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface Problem {
  id: string
  problem_number?: string
  title: string
  description: string
  priority: Priority
  status: ProblemStatus
  assignedToName?: string
  affectedServices: string[]
  rootCause?: string
  workaround?: string
  tags: string[]
  createdAt: string
}

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

export default function ProblemsListPage() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<'priority' | 'created' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch('/api/problems')
        if (response.ok) {
          const data = await response.json()
          setProblems(data)
        }
      } catch (error) {
        console.error('Failed to fetch problems:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProblems()
  }, [])

  // Sorting helper function
  const getPriorityValue = (priority: Priority): number => {
    switch (priority) {
      case 'critical': return 4
      case 'high': return 3
      case 'medium': return 2
      case 'low': return 1
      default: return 0
    }
  }

  const handleSort = (field: 'priority' | 'created') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Filter problems based on search query
  const filteredProblems = problems.filter(problem => {
    const matchesSearch = searchQuery === '' || 
      problem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.problem_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      problem.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    return matchesSearch
  }).sort((a, b) => {
    if (!sortField) return 0
    
    let comparison = 0
    if (sortField === 'priority') {
      comparison = getPriorityValue(a.priority) - getPriorityValue(b.priority)
    } else if (sortField === 'created') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const clearSearch = () => {
    setSearchQuery('')
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Link href="/problems">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Map
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">Problems List</h1>
            <p className="text-gray-600 mt-1">Traditional list view of all problems</p>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/dashboard/problems">
              <Button variant="outline">
                <GitBranch className="w-4 h-4 mr-2" />
                Relationship Map
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

        {/* Search Filter */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          {searchQuery && (
            <div className="text-sm text-gray-600">
              {filteredProblems.length} of {problems.length} problems
            </div>
          )}
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading problems...</div>
            </div>
          ) : problems.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No problems found</h3>
                <p className="text-gray-600 text-center max-w-sm mb-6">
                  Get started by creating your first problem to track root causes and solutions.
                </p>
                <Link href="/problems/new">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Problem
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : filteredProblems.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No problems match your search</h3>
                <p className="text-gray-600 text-center max-w-sm mb-6">
                  Try adjusting your search terms to find problems.
                </p>
                <Button variant="outline" onClick={clearSearch}>
                  <X className="w-4 h-4 mr-2" />
                  Clear search
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Assignee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProblems.map((problem) => (
                    <tr key={problem.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-mono text-gray-900">
                          {problem.problem_number || problem.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/problems/${problem.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                          {problem.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge 
                          variant="outline" 
                          className={`${getPriorityColor(problem.priority)} text-xs`}
                        >
                          {problem.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(problem.status)} text-xs`}
                        >
                          {getStatusLabel(problem.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">
                          {problem.assignedToName || (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-500">
                          {formatRelativeTime(problem.createdAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ClientLayout>
  )
}