'use client'

import { useState, useEffect } from 'react'
import { ClientLayout } from '@/components/layout/client-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, AlertTriangle, Settings, Wrench, TrendingUp, Activity, RefreshCw, Clock, CheckCircle,
  AlertCircle, Zap, Target, Timer, Shield, BarChart3, Calendar, Server, Gauge, History
} from 'lucide-react'

interface OrganizationStats {
  totalMembers: number
  openIncidents: number
  activeProblems: number
  activeChanges: number
  slaComplianceRate: number
  changeSuccessRate: number
  organizationName?: string
  criticalIncidents: number
  highPriorityIncidents: number
  incidentsResolvedToday: number
  changesScheduledToday: number
  averageResolutionTime: number
  problemBacklog: number
  emergencyChanges: number
  slaBreaches: number
  mttr: number
  mtbf: number
}

interface RecentActivity {
  id: string
  type: 'incident' | 'problem' | 'change'
  title: string
  status: string
  priority?: string
  createdAt: string
  updatedAt: string
  assignedToName?: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<OrganizationStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/organization/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setLastRefresh(new Date())
      } else if (response.status === 403) {
        setError('You do not have permission to view organization statistics')
      } else {
        setError('Failed to load dashboard statistics')
      }
    } catch (err) {
      setError('Failed to load dashboard statistics')
      console.error('Error fetching organization stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const [incidentsRes, problemsRes, changesRes] = await Promise.all([
        fetch('/api/incidents?limit=3'),
        fetch('/api/problems?limit=3'), 
        fetch('/api/changes?limit=3')
      ])

      const activities: RecentActivity[] = []
      
      if (incidentsRes.ok) {
        const incidents = await incidentsRes.json()
        incidents.slice(0, 3).forEach((item: any) => {
          activities.push({
            id: item.id,
            type: 'incident',
            title: item.title,
            status: item.status,
            priority: item.priority,
            createdAt: item.createdAt || item.created_at,
            updatedAt: item.updatedAt || item.updated_at,
            assignedToName: item.assignedToName || item.assigned_to_name
          })
        })
      }

      if (problemsRes.ok) {
        const problems = await problemsRes.json()
        problems.slice(0, 3).forEach((item: any) => {
          activities.push({
            id: item.id,
            type: 'problem',
            title: item.title,
            status: item.status,
            priority: item.priority,
            createdAt: item.createdAt || item.created_at,
            updatedAt: item.updatedAt || item.updated_at,
            assignedToName: item.assignedToName || item.assigned_to_name
          })
        })
      }

      if (changesRes.ok) {
        const changes = await changesRes.json()
        changes.slice(0, 3).forEach((item: any) => {
          activities.push({
            id: item.id,
            type: 'change',
            title: item.title,
            status: item.status,
            priority: item.priority,
            createdAt: item.createdAt || item.created_at,
            updatedAt: item.updatedAt || item.updated_at,
            assignedToName: item.assignedToName || item.assigned_to_name
          })
        })
      }

      // Sort by most recent and take top 6
      activities.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      setRecentActivity(activities.slice(0, 6))
    } catch (err) {
      console.error('Error fetching recent activity:', err)
    } finally {
      setActivityLoading(false)
    }
  }

  const refreshData = async () => {
    setLoading(true)
    setActivityLoading(true)
    await Promise.all([fetchStats(), fetchRecentActivity()])
  }

  useEffect(() => {
    fetchStats()
    fetchRecentActivity()
  }, [])

  if (loading && !stats) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </ClientLayout>
    )
  }

  if (error) {
    return (
      <ClientLayout>
        <div className="max-w-4xl space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of your organization</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600 text-center">{error}</p>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    )
  }

  const formatTime = (hours: number) => {
    if (hours === 0) return '0h'
    if (hours < 24) {
      return `${Math.round(hours)}h`
    }
    const days = Math.floor(hours / 24)
    const remainingHours = Math.round(hours % 24)
    if (remainingHours === 0) {
      return `${days}d`
    }
    return `${days}d ${remainingHours}h`
  }

  return (
    <ClientLayout>
      <div className="w-full max-w-none space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1 text-lg">
              Overview of {stats?.organizationName || 'your organization'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={loading || activityLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading || activityLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Priority Alerts Section */}
        {((stats?.criticalIncidents || 0) > 0 || (stats?.slaBreaches || 0) > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-red-900">Attention Required</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(stats?.criticalIncidents || 0) > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-800">
                    <strong>{stats?.criticalIncidents || 0}</strong> critical incident{(stats?.criticalIncidents || 0) !== 1 ? 's' : ''} require immediate attention
                  </span>
                </div>
              )}
              {(stats?.slaBreaches || 0) > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-600" />
                  <span className="text-red-800">
                    <strong>{stats?.slaBreaches || 0}</strong> SLO breach{(stats?.slaBreaches || 0) !== 1 ? 'es' : ''} detected
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Core ITIL Metrics */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Core Service Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {/* Critical Incidents */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Critical Incidents</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.criticalIncidents || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Highest priority</p>
              </CardContent>
            </Card>

            {/* Total Open Incidents */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Open Incidents</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.openIncidents || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">All open incidents</p>
              </CardContent>
            </Card>

            {/* SLO Compliance */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">SLO Compliance</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  (stats?.slaComplianceRate || 0) >= 90 
                    ? 'text-green-600' 
                    : (stats?.slaComplianceRate || 0) >= 70 
                      ? 'text-yellow-600' 
                      : 'text-red-600'
                }`}>
                  {stats?.slaComplianceRate || 0}%
                </div>
                <p className="text-xs text-gray-600 mt-1">Within SLO targets</p>
              </CardContent>
            </Card>

            {/* MTTR */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">MTTR</CardTitle>
                <Timer className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatTime(stats?.mttr || 0)}
                </div>
                <p className="text-xs text-gray-600 mt-1">Mean time to resolution</p>
              </CardContent>
            </Card>

            {/* Change Success Rate */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Change Success</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  (stats?.changeSuccessRate || 0) >= 95 
                    ? 'text-green-600' 
                    : (stats?.changeSuccessRate || 0) >= 85 
                      ? 'text-yellow-600' 
                      : 'text-red-600'
                }`}>
                  {stats?.changeSuccessRate || 0}%
                </div>
                <p className="text-xs text-gray-600 mt-1">Successful changes</p>
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Team Size</CardTitle>
                <Users className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.totalMembers || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Active members</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional ITIL Metrics */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Activity & Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {/* Incidents Resolved Today */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Resolved Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.incidentsResolvedToday || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Incidents closed</p>
              </CardContent>
            </Card>

            {/* Changes Scheduled Today */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Changes Today</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.changesScheduledToday || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Scheduled changes</p>
              </CardContent>
            </Card>

            {/* SLO Breaches */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">SLO Breaches</CardTitle>
                <Shield className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.slaBreaches || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Missed targets</p>
              </CardContent>
            </Card>

            {/* Emergency Changes */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Emergency Changes</CardTitle>
                <Zap className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats?.emergencyChanges || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Critical priority</p>
              </CardContent>
            </Card>

            {/* MTBF */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">MTBF</CardTitle>
                <History className="h-4 w-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.mtbf ? formatTime(stats.mtbf) : 'N/A'}
                </div>
                <p className="text-xs text-gray-600 mt-1">Mean time between failures</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Service Health & Process Metrics */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Health & Process Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Active Problems */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Problems</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.activeProblems || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Under investigation</p>
              </CardContent>
            </Card>

            {/* Problem Backlog */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Problem Backlog</CardTitle>
                <BarChart3 className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.problemBacklog || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Pending investigation</p>
              </CardContent>
            </Card>

            {/* Active Changes */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Changes</CardTitle>
                <Wrench className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats?.activeChanges || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">In progress</p>
              </CardContent>
            </Card>

            {/* High Priority Incidents */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">High Priority</CardTitle>
                <Gauge className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {stats?.highPriorityIncidents || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">High priority incidents</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-gray-600" />
                System Health Status
              </CardTitle>
              <CardDescription>
                Current status of your ITSM processes and service performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Incident Response
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${
                    (stats?.criticalIncidents || 0) === 0 
                      ? 'text-green-600 border-green-600' 
                      : 'text-red-600 border-red-600'
                  }`}>
                    {(stats?.criticalIncidents || 0)} Critical
                  </Badge>
                  <span className={`text-sm font-medium ${
                    (stats?.openIncidents || 0) === 0 
                      ? 'text-green-600' 
                      : (stats?.openIncidents || 0) <= 3 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                  }`}>
                    {(stats?.openIncidents || 0) === 0 
                      ? 'Healthy' 
                      : (stats?.openIncidents || 0) <= 3 
                        ? 'Attention Needed' 
                        : 'Critical'
                    }
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  SLO Compliance
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${
                    (stats?.slaBreaches || 0) === 0 
                      ? 'text-green-600 border-green-600' 
                      : 'text-red-600 border-red-600'
                  }`}>
                    {stats?.slaBreaches || 0} Breaches
                  </Badge>
                  <span className={`text-sm font-medium ${
                    (stats?.slaComplianceRate || 0) >= 90 
                      ? 'text-green-600' 
                      : (stats?.slaComplianceRate || 0) >= 70 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                  }`}>
                    {(stats?.slaComplianceRate || 0) >= 90 
                      ? 'Excellent' 
                      : (stats?.slaComplianceRate || 0) >= 70 
                        ? 'Good' 
                        : 'Needs Improvement'
                    }
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Change Management
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${
                    (stats?.emergencyChanges || 0) === 0 
                      ? 'text-green-600 border-green-600' 
                      : 'text-orange-600 border-orange-600'
                  }`}>
                    {stats?.emergencyChanges || 0} Emergency
                  </Badge>
                  <span className={`text-sm font-medium ${
                    (stats?.changeSuccessRate || 0) >= 95 
                      ? 'text-green-600' 
                      : (stats?.changeSuccessRate || 0) >= 85 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                  }`}>
                    {(stats?.changeSuccessRate || 0) >= 95 
                      ? 'Excellent' 
                      : (stats?.changeSuccessRate || 0) >= 85 
                        ? 'Good' 
                        : 'Needs Improvement'
                    }
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Problem Management
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${
                    (stats?.problemBacklog || 0) === 0 
                      ? 'text-green-600 border-green-600' 
                      : 'text-yellow-600 border-yellow-600'
                  }`}>
                    {stats?.problemBacklog || 0} Backlog
                  </Badge>
                  <span className={`text-sm font-medium ${
                    (stats?.activeProblems || 0) === 0 
                      ? 'text-green-600' 
                      : 'text-blue-600'
                  }`}>
                    {(stats?.activeProblems || 0) === 0 ? 'Clean' : 'Active Investigation'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  Performance Metrics
                </span>
                <div className="text-sm text-gray-700">
                  MTTR: <span className="font-medium">{formatTime(stats?.mttr || 0)}</span>
                  {stats?.mtbf && (
                    <> • MTBF: <span className="font-medium">{formatTime(stats.mtbf)}</span></>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-gray-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest updates across incidents, problems, and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((item) => {
                    const getTypeIcon = (type: string) => {
                      switch (type) {
                        case 'incident': return <AlertTriangle className="h-4 w-4 text-red-600" />
                        case 'problem': return <AlertCircle className="h-4 w-4 text-red-600" />
                        case 'change': return <Wrench className="h-4 w-4 text-purple-600" />
                        default: return <Activity className="h-4 w-4 text-gray-600" />
                      }
                    }
                    
                    const getTypePath = (type: string) => {
                      switch (type) {
                        case 'incident': return '/incidents'
                        case 'problem': return '/problems'
                        case 'change': return '/changes'
                        default: return '#'
                      }
                    }
                    
                    const formatTime = (dateString: string) => {
                      const date = new Date(dateString)
                      const now = new Date()
                      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
                      
                      if (diffInHours < 1) {
                        return `${Math.round(diffInHours * 60)}m ago`
                      } else if (diffInHours < 24) {
                        return `${Math.round(diffInHours)}h ago`
                      } else {
                        return `${Math.round(diffInHours / 24)}d ago`
                      }
                    }

                    return (
                      <a 
                        key={item.id} 
                        href={`${getTypePath(item.type)}/${item.id}`}
                        className="block p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getTypeIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {item.title}
                              </p>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
                                {item.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500 capitalize">
                                {item.type} • {item.assignedToName ? `Assigned to ${item.assignedToName}` : 'Unassigned'}
                              </p>
                              <span className="text-xs text-gray-400">
                                {formatTime(item.updatedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </a>
                    )
                  })}
                  <div className="pt-2 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-2">
                      <a href="/incidents/new" className="text-center">
                        <div className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                          <AlertTriangle className="h-4 w-4 text-red-600 mx-auto mb-1" />
                          <span className="text-xs font-medium">New Incident</span>
                        </div>
                      </a>
                      <a href="/problems/new" className="text-center">
                        <div className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                          <AlertCircle className="h-4 w-4 text-red-600 mx-auto mb-1" />
                          <span className="text-xs font-medium">New Problem</span>
                        </div>
                      </a>
                      <a href="/changes/new" className="text-center">
                        <div className="p-2 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                          <Wrench className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                          <span className="text-xs font-medium">New Change</span>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientLayout>
  )
}