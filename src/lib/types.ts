export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type Criticality = 'low' | 'medium' | 'high' | 'critical'
export type Urgency = 'low' | 'medium' | 'high' | 'critical'
export type Status = 'open' | 'investigating' | 'resolved' | 'closed'
export type ChangeStatus = 'draft' | 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
export type ProblemStatus = 'identified' | 'investigating' | 'known_error' | 'resolved' | 'closed'
export type UserRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer'

export type BillingTier = 'free' | 'pro'

export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  settings: Record<string, any>
  billingTier: BillingTier
  billingExpiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface Profile {
  id: string
  email: string
  fullName?: string
  jobTitle?: string
  avatarUrl?: string
  organizationId: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface ServiceInfo {
  id: string
  label: string
  environment: string
}

export interface ExternalLink {
  title: string
  url: string
  type?: 'zendesk' | 'jira' | 'other'
}

export interface Incident {
  id: string
  organizationId: string
  incident_number?: string
  title: string
  description: string
  criticality: Criticality
  urgency: Urgency
  priority: Priority
  autoPriority?: boolean
  status: Status
  assignedTo?: string
  assignedToName?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  problemId?: string
  problemTitle?: string
  tags: string[]
  affectedServices: string[]
  serviceInfo?: ServiceInfo[]
  links?: ExternalLink[]
  attachments?: CommentAttachment[] // File attachments (max 2, 2MB each)
}

export interface Change {
  id: string
  organizationId: string
  change_number?: string
  title: string
  description: string
  status: ChangeStatus
  priority: Priority
  requestedBy: string
  assignedTo?: string
  assignedToName?: string
  scheduledFor?: string
  estimatedEndTime?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  rollbackPlan: string
  testPlan: string
  tags: string[]
  affectedServices: string[]
  serviceInfo?: ServiceInfo[]
  problemId?: string
  problemTitle?: string
  incidentId?: string
  incidentTitle?: string
  attachments?: CommentAttachment[] // File attachments (max 2, 2MB each)
}

export interface Problem {
  id: string
  organizationId: string
  problem_number?: string
  title: string
  description: string
  criticality: Criticality
  urgency: Urgency
  priority: Priority
  autoPriority?: boolean
  status: ProblemStatus
  assignedTo?: string
  assignedToName?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  rootCause?: string
  workaround?: string
  solution?: string
  tags: string[]
  affectedServices: string[]
  relatedIncidents?: string[]
  attachments?: CommentAttachment[] // File attachments (max 2, 2MB each)
}

export interface CommentAttachment {
  id: string
  name: string
  size: number
  type: string
  url: string
}

export interface Comment {
  id: string
  organizationId: string
  content: string
  authorId: string
  author: {
    id: string
    name: string
    email: string
  }
  mentions: string[] // Array of user IDs mentioned in the comment
  attachments?: CommentAttachment[] // File attachments (max 2, 2MB each)
  createdAt: string
  updatedAt: string
  incidentId?: string
  changeId?: string
  problemId?: string
}

export interface CommentNotification {
  id: string
  commentId: string
  userId: string
  isRead: boolean
  createdAt: string
  comment?: Comment
}

export interface ChangeApproval {
  id: string
  organizationId: string
  changeId: string
  requestedBy: string
  approvedBy?: string
  status: 'pending' | 'approved' | 'rejected'
  comments?: string
  requestedAt: string
  respondedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  organizationId: string
  userId: string
  type: 'change_approval_request' | 'change_approved' | 'change_rejected' | 'change_completion_prompt' | 'change_auto_started'
  title: string
  message: string
  data: Record<string, any>
  read: boolean
  changeId?: string
  incidentId?: string
  problemId?: string
  createdAt: string
  updatedAt: string
}

export interface ChangeCompletionResponse {
  id: string
  organizationId: string
  changeId: string
  respondedBy: string
  outcome: 'completed' | 'failed'
  notes?: string
  respondedAt: string
  createdAt: string
  updatedAt: string
}

export interface ChangeAutomation {
  id: string
  organizationId: string
  changeId: string
  automationType: 'auto_start' | 'completion_prompt'
  scheduledFor: string
  executed: boolean
  executedAt?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}