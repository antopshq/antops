'use client'

import { useState, useEffect } from 'react'
import { ClientLayout } from '@/components/layout/client-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip } from '@/components/ui/tooltip'
import { Users, Mail, UserPlus, Shield, X, Building, Calendar, Crown, Edit3, Trash2, AlertTriangle, Search, Settings, Clock } from 'lucide-react'
import { UserRole, Organization, Profile } from '@/lib/types'
import { getRoleDisplayName, getRoleDescription, getRoleColor, hasPermission, canManageUser, getAvailableRolesForUser, PERMISSIONS } from '@/lib/rbac'
import { useAuth } from '@/hooks/useAuth'
import { ProfileEditModal } from '@/components/profile/profile-edit-modal'
import { SLAConfigurationModal } from '@/components/team/sla-configuration-modal'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'




function getInitials(name: string) {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
}

interface TeamMember extends Profile {
  name: string
  lastActive?: string
}

interface PendingInvitation {
  id: string
  email: string
  role: string
  invitedBy: string
  invitedAt: string
}

export default function TeamPage() {
  const { user } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [organizationStats, setOrganizationStats] = useState({
    totalMembers: 0,
    openIncidents: 0,
    activeProblems: 0,
    activeChanges: 0
  })
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'member' as UserRole
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [slaModalOpen, setSlaModalOpen] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<TeamMember | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const currentUserRole = user?.role || 'viewer'
  const canInviteUsers = hasPermission(currentUserRole, PERMISSIONS.INVITE_USERS)
  const canManageUsers = hasPermission(currentUserRole, PERMISSIONS.MANAGE_USERS)
  const canViewOrgStats = hasPermission(currentUserRole, PERMISSIONS.VIEW_ORGANIZATION_STATS)
  const canConfigureSLO = hasPermission(currentUserRole, PERMISSIONS.MANAGE_ORGANIZATION)
  
  // Get available roles for inviting, with fallback for basic roles
  const getInvitableRoles = (): UserRole[] => {
    if (!user) {
      // If user is not loaded yet, show basic roles
      return ['member', 'viewer']
    }
    
    const availableRoles = getAvailableRolesForUser(currentUserRole)
    
    // If no roles available (like for viewer), at least allow inviting members
    if (availableRoles.length === 0 && canInviteUsers) {
      return ['member']
    }
    
    return availableRoles
  }

  // Fetch team data
  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        // Fetch organization info
        const orgRes = await fetch('/api/organization')
        if (orgRes.ok) {
          const orgData = await orgRes.json()
          setOrganization(orgData.organization)
        }

        // Fetch team members
        const teamRes = await fetch('/api/team')
        if (teamRes.ok) {
          const teamData = await teamRes.json()
          const members = teamData.teamMembers.map((member: any) => ({
            id: member.id,
            name: member.fullName || member.name,
            email: member.email,
            fullName: member.fullName,
            jobTitle: member.jobTitle,
            avatarUrl: member.avatarUrl,
            organizationId: member.organizationId,
            role: member.role || 'member',
            createdAt: member.createdAt,
            updatedAt: member.updatedAt,
            lastActive: 'Recently' // This would come from activity tracking
          }))
          setTeamMembers(members)
          
          // Set current user profile for modal
          const currentMember = members.find((m: any) => m.id === user?.id)
          if (currentMember) {
            setCurrentUserProfile(currentMember)
          }
        }

        // Fetch organization stats
        if (canViewOrgStats) {
          const statsRes = await fetch('/api/organization/stats')
          if (statsRes.ok) {
            const statsData = await statsRes.json()
            setOrganizationStats(statsData)
          }
        }

        // Fetch pending invitations
        if (canInviteUsers) {
          const inviteRes = await fetch('/api/team/invite')
          if (inviteRes.ok) {
            const inviteData = await inviteRes.json()
            setPendingInvitations(inviteData.invitations || [])
          }
        }
      } catch (error) {
        console.error('Failed to fetch team data:', error)
      }
    }

    fetchTeamData()
  }, [canInviteUsers, canViewOrgStats])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData)
      })

      if (res.ok) {
        const data = await res.json()
        setPendingInvitations(prev => [...prev, data.invitation])
        setInviteData({ email: '', role: 'member' })
        setShowInviteForm(false)
        setSuccess('Invitation sent successfully!')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to send invitation')
      }
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    try {
      setError('')
      setSuccess('')
      
      const res = await fetch(`/api/team/${memberId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (res.ok) {
        setTeamMembers(prev => prev.map(member => 
          member.id === memberId ? { ...member, role: newRole } : member
        ))
        setEditingMember(null)
        setSuccess('Role updated successfully!')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update role')
      }
    } catch (err) {
      setError('Something went wrong')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member? This action cannot be undone.')) {
      return
    }

    try {
      setError('')
      setSuccess('')
      
      const res = await fetch(`/api/team/${memberId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setTeamMembers(prev => prev.filter(member => member.id !== memberId))
        setSuccess('Team member removed successfully!')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to remove team member')
      }
    } catch (err) {
      setError('Something went wrong')
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/team/invite?id=${invitationId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error)
    }
  }

  const handleProfileUpdate = (updatedProfile: Partial<Profile>) => {
    // Update the team members list with the new profile data
    setTeamMembers(prev => prev.map(member => 
      member.id === user?.id 
        ? { ...member, ...updatedProfile }
        : member
    ))
    
    // Update current user profile
    if (currentUserProfile && user?.id === currentUserProfile.id) {
      setCurrentUserProfile(prev => prev ? { ...prev, ...updatedProfile } : null)
    }
    
    // Refresh the page data
    window.location.reload()
  }

  const handleSLOSave = async (configurations: Array<{ priority: string; resolution_time_hours: number }>) => {
    try {
      const response = await fetch('/api/slo-configurations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configurations }),
      })

      if (!response.ok) {
        throw new Error('Failed to save SLO configurations')
      }

      setSuccess('SLO configurations updated successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('Error saving SLO configurations:', error)
      setError('Failed to save SLO configurations')
      
      // Clear error message after 5 seconds
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleProfileClick = (member: TeamMember) => {
    // Only allow users to edit their own profile
    if (member.id === user?.id) {
      setCurrentUserProfile(member)
      setProfileModalOpen(true)
    }
  }

  // Filter team members based on search query
  const filteredTeamMembers = teamMembers.filter(member => {
    const query = searchQuery.toLowerCase()
    return (
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.jobTitle?.toLowerCase().includes(query) ||
      getRoleDisplayName(member.role).toLowerCase().includes(query)
    )
  })

  const totalMembers = teamMembers.length
  const roleStats = teamMembers.reduce((acc, member) => {
    acc[member.role] = (acc[member.role] || 0) + 1
    return acc
  }, {} as Record<UserRole, number>)

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
            <p className="text-gray-600 mt-1">Manage team members and permissions</p>
          </div>
          <div className="flex items-center space-x-3">
            {canConfigureSLO && (
              <Button 
                variant="outline"
                onClick={() => setSlaModalOpen(true)} 
              >
                <Clock className="w-4 h-4 mr-2" />
                Configure SLO
              </Button>
            )}
            {canInviteUsers && (
              <Button 
                onClick={() => setShowInviteForm(true)} 
                className="bg-gray-900 hover:bg-gray-800"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Members
              </CardTitle>
              <Users className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalMembers}</div>
              <p className="text-xs text-gray-600 mt-1">Team members</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Invites
              </CardTitle>
              <Mail className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{pendingInvitations.length}</div>
              <p className="text-xs text-gray-600 mt-1">Awaiting response</p>
            </CardContent>
          </Card>

        </div>

        {/* Team Members List */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Team Members</CardTitle>
                <CardDescription>People who have access to this incident management system</CardDescription>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                {searchQuery && (
                  <p className="text-sm text-gray-500">
                    {filteredTeamMembers.length} of {totalMembers} members
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTeamMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? 'No members found' : 'No team members'}
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery 
                      ? 'Try adjusting your search terms to find team members.'
                      : 'Invite team members to get started.'
                    }
                  </p>
                  {searchQuery && (
                    <Button 
                      variant="outline" 
                      onClick={() => setSearchQuery('')}
                      className="mt-4"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                filteredTeamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-12 h-12">
                      {member.avatarUrl ? (
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                      ) : (
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <button
                          onClick={() => handleProfileClick(member)}
                          className={`text-sm font-medium text-gray-900 ${
                            member.id === user?.id 
                              ? 'hover:text-blue-600 cursor-pointer underline decoration-dotted' 
                              : 'cursor-default'
                          }`}
                        >
                          {member.name}
                        </button>
                        {member.role === 'owner' && (
                          <Crown className="w-4 h-4 text-yellow-600" />
                        )}
                        <Tooltip
                          content={
                            <div className="text-sm">
                              <div className="font-medium whitespace-nowrap">{getRoleDisplayName(member.role)}</div>
                              <div className="text-gray-300 mt-2 whitespace-normal leading-relaxed">{getRoleDescription(member.role)}</div>
                            </div>
                          }
                          side="top"
                          className="w-[180px] whitespace-normal px-4 py-3"
                        >
                          <Badge 
                            variant="outline" 
                            className={`${getRoleColor(member.role)} cursor-help`}
                          >
                            {getRoleDisplayName(member.role)}
                          </Badge>
                        </Tooltip>
                      </div>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      {member.jobTitle && (
                        <p className="text-sm text-blue-600 font-medium">{member.jobTitle}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Joined {new Date(member.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })} {member.lastActive && `• Last active ${member.lastActive}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {canManageUsers && canManageUser(currentUserRole, member.role) && member.id !== user?.id && (
                      <>
                        {editingMember === member.id ? (
                          <div className="flex items-center space-x-2">
                            <Select
                              value={member.role}
                              onValueChange={(value: UserRole) => handleUpdateRole(member.id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {getAvailableRolesForUser(currentUserRole).map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {getRoleDisplayName(role)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingMember(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingMember(member.id)}
                            >
                              <Edit3 className="w-3 h-3 mr-1" />
                              Edit Role
                            </Button>
                            {hasPermission(currentUserRole, PERMISSIONS.REMOVE_USERS) && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Remove
                              </Button>
                            )}
                          </>
                        )}
                      </>
                    )}
                    {member.id === user?.id && (
                      <Badge variant="secondary">You</Badge>
                    )}
                  </div>
                </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invite Form */}
        {showInviteForm && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Invite Team Member</CardTitle>
              <CardDescription>Send an invitation to join your team</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteData.email}
                      onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={inviteData.role}
                      onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value as UserRole }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getInvitableRoles().map((role) => (
                          <SelectItem key={role} value={role}>
                            {getRoleDisplayName(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                    {error}
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <Button type="submit" disabled={loading} className="bg-gray-900 hover:bg-gray-800">
                    {loading ? 'Sending...' : 'Send Invitation'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Pending Invitations */}
        {canInviteUsers && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Pending Invitations</span>
                {pendingInvitations.length > 0 && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                    {pendingInvitations.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Team invitations that haven't been accepted yet</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-600">No pending invitations</p>
                    <p className="text-xs text-gray-500 mt-1">Invite team members to get started</p>
                  </div>
                ) : (
                  pendingInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-4 rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
                          <Mail className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                          <div className="flex items-center space-x-3 text-xs text-gray-600 mt-1">
                            <span>Invited {new Date(invitation.invitedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}</span>
                            <span>•</span>
                            <Badge variant="outline" className={getRoleColor(invitation.role as UserRole)}>
                              {getRoleDisplayName(invitation.role as UserRole)}
                            </Badge>
                            <span>•</span>
                            <span>By {invitation.invitedBy}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          Resend
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Edit Modal */}
        {currentUserProfile && (
          <ProfileEditModal
            isOpen={profileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            profile={currentUserProfile}
            onProfileUpdate={handleProfileUpdate}
          />
        )}

        {/* SLO Configuration Modal */}
        <SLAConfigurationModal
          isOpen={slaModalOpen}
          onClose={() => setSlaModalOpen(false)}
          onSave={handleSLOSave}
        />
      </div>
    </ClientLayout>
  )
}