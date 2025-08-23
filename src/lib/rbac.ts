import { UserRole } from './types'

// Define permissions
export const PERMISSIONS = {
  // User management
  INVITE_USERS: 'invite_users',
  MANAGE_USERS: 'manage_users',
  VIEW_USERS: 'view_users',
  CHANGE_USER_ROLES: 'change_user_roles',
  REMOVE_USERS: 'remove_users',

  // Organization management
  MANAGE_ORGANIZATION: 'manage_organization',
  VIEW_ORGANIZATION_STATS: 'view_organization_stats',
  UPDATE_ORGANIZATION_SETTINGS: 'update_organization_settings',
  
  // Billing and pricing (Owner only)
  MANAGE_BILLING: 'manage_billing',
  UPGRADE_TIER: 'upgrade_tier',
  VIEW_BILLING: 'view_billing',

  // Incident management
  CREATE_INCIDENTS: 'create_incidents',
  VIEW_INCIDENTS: 'view_incidents',
  UPDATE_INCIDENTS: 'update_incidents',
  DELETE_INCIDENTS: 'delete_incidents',
  ASSIGN_INCIDENTS: 'assign_incidents',
  CLOSE_INCIDENTS: 'close_incidents',

  // Problem management
  CREATE_PROBLEMS: 'create_problems',
  VIEW_PROBLEMS: 'view_problems',
  UPDATE_PROBLEMS: 'update_problems',
  DELETE_PROBLEMS: 'delete_problems',
  ASSIGN_PROBLEMS: 'assign_problems',
  RESOLVE_PROBLEMS: 'resolve_problems',

  // Change management
  CREATE_CHANGES: 'create_changes',
  VIEW_CHANGES: 'view_changes',
  UPDATE_CHANGES: 'update_changes',
  DELETE_CHANGES: 'delete_changes',
  APPROVE_CHANGES: 'approve_changes',
  ASSIGN_CHANGES: 'assign_changes',
  EXECUTE_CHANGES: 'execute_changes',
  CANCEL_CHANGES: 'cancel_changes',
  
  // Process validation (Manager+ only)
  VALIDATE_INCIDENTS: 'validate_incidents',
  VALIDATE_PROBLEMS: 'validate_problems',
  VALIDATE_CHANGES: 'validate_changes',

  // Comments and collaboration
  CREATE_COMMENTS: 'create_comments',
  VIEW_COMMENTS: 'view_comments',
  DELETE_COMMENTS: 'delete_comments',
  MENTION_USERS: 'mention_users',

  // Reporting and analytics
  VIEW_REPORTS: 'view_reports',
  EXPORT_DATA: 'export_data',
  VIEW_ANALYTICS: 'view_analytics',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Role hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 1,
  member: 2,
  manager: 3,
  admin: 4,
  owner: 5,
}

// Define base permissions for each role to avoid circular references
const VIEWER_PERMISSIONS: Permission[] = [
  // Viewer: Read-only access to everything
  PERMISSIONS.VIEW_USERS,
  PERMISSIONS.VIEW_INCIDENTS,
  PERMISSIONS.VIEW_PROBLEMS,
  PERMISSIONS.VIEW_CHANGES,
  PERMISSIONS.VIEW_COMMENTS,
  PERMISSIONS.VIEW_REPORTS,
  PERMISSIONS.VIEW_ANALYTICS,
  PERMISSIONS.VIEW_ORGANIZATION_STATS,
  // Note: Viewers cannot create comments or make any changes
]

const MEMBER_PERMISSIONS: Permission[] = [
  ...VIEWER_PERMISSIONS,
  // Members: Can create and update items, can cancel their own items
  PERMISSIONS.CREATE_COMMENTS,
  PERMISSIONS.CREATE_INCIDENTS,
  PERMISSIONS.UPDATE_INCIDENTS,
  PERMISSIONS.CREATE_PROBLEMS,
  PERMISSIONS.UPDATE_PROBLEMS,
  PERMISSIONS.CREATE_CHANGES,
  PERMISSIONS.UPDATE_CHANGES,
  PERMISSIONS.CANCEL_CHANGES, // Members can cancel changes
  PERMISSIONS.MENTION_USERS,
  // Note: Members cannot validate processes - that's Manager+ only
]

const MANAGER_PERMISSIONS: Permission[] = [
  ...MEMBER_PERMISSIONS,
  // Managers: Can manage processes and validate workflows, but cannot invite/remove users
  PERMISSIONS.ASSIGN_INCIDENTS,
  PERMISSIONS.CLOSE_INCIDENTS,
  PERMISSIONS.ASSIGN_PROBLEMS,
  PERMISSIONS.RESOLVE_PROBLEMS,
  PERMISSIONS.ASSIGN_CHANGES,
  PERMISSIONS.APPROVE_CHANGES,
  PERMISSIONS.EXECUTE_CHANGES,
  PERMISSIONS.DELETE_COMMENTS,
  PERMISSIONS.EXPORT_DATA,
  // Process validation (Manager+ only)
  PERMISSIONS.VALIDATE_INCIDENTS,
  PERMISSIONS.VALIDATE_PROBLEMS,
  PERMISSIONS.VALIDATE_CHANGES,
  // Note: Managers CANNOT invite or remove users - that's Admin+ only
]

const ADMIN_PERMISSIONS: Permission[] = [
  ...MANAGER_PERMISSIONS,
  // Admins: Can do everything except billing and pricing
  PERMISSIONS.INVITE_USERS,
  PERMISSIONS.MANAGE_USERS,
  PERMISSIONS.CHANGE_USER_ROLES,
  PERMISSIONS.REMOVE_USERS,
  PERMISSIONS.DELETE_INCIDENTS,
  PERMISSIONS.DELETE_PROBLEMS,
  PERMISSIONS.DELETE_CHANGES,
  PERMISSIONS.MANAGE_ORGANIZATION,
  PERMISSIONS.UPDATE_ORGANIZATION_SETTINGS,
  // Note: Admins CANNOT manage billing/pricing - that's Owner only
]

const OWNER_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  // Owners: Full access including billing and pricing
  PERMISSIONS.MANAGE_BILLING,
  PERMISSIONS.UPGRADE_TIER,
  PERMISSIONS.VIEW_BILLING,
  // Note: Owners can literally do anything
]

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  viewer: VIEWER_PERMISSIONS,
  member: MEMBER_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  owner: OWNER_PERMISSIONS,
}

// Utility functions
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission))
}

export function canManageUser(currentUserRole: UserRole, targetUserRole: UserRole): boolean {
  // Users can only manage users with lower hierarchy
  return ROLE_HIERARCHY[currentUserRole] > ROLE_HIERARCHY[targetUserRole]
}

export function canChangeRoleTo(currentUserRole: UserRole, targetRole: UserRole): boolean {
  // Users can only assign roles lower than their own
  return ROLE_HIERARCHY[currentUserRole] > ROLE_HIERARCHY[targetRole]
}

export function getAvailableRolesForUser(currentUserRole: UserRole): UserRole[] {
  const currentHierarchy = ROLE_HIERARCHY[currentUserRole]
  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, hierarchy]) => hierarchy < currentHierarchy)
    .map(([role]) => role as UserRole)
}

// Specific role checks for common use cases
export function isViewer(role: UserRole): boolean {
  return role === 'viewer'
}

export function isMember(role: UserRole): boolean {
  return role === 'member'
}

export function isManager(role: UserRole): boolean {
  return role === 'manager'
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}

export function isOwner(role: UserRole): boolean {
  return role === 'owner'
}

// Hierarchical checks
export function isManagerOrAbove(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.manager
}

export function isAdminOrAbove(role: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin
}

export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, PERMISSIONS.INVITE_USERS) && hasPermission(role, PERMISSIONS.REMOVE_USERS)
}

export function canValidateProcesses(role: UserRole): boolean {
  return hasPermission(role, PERMISSIONS.VALIDATE_CHANGES)
}

export function canManageBilling(role: UserRole): boolean {
  return hasPermission(role, PERMISSIONS.MANAGE_BILLING)
}

export function isReadOnly(role: UserRole): boolean {
  return role === 'viewer'
}

export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    viewer: 'Viewer',
    member: 'Member',
    manager: 'Manager',
    admin: 'Administrator',
    owner: 'Owner',
  }
  return roleNames[role]
}

export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    viewer: 'Read-only access to all incidents, problems, changes, and reports. Cannot create or modify anything.',
    member: 'Can create and update incidents, problems, and changes. Can cancel their own changes but cannot validate processes.',
    manager: 'Can assign, manage, and validate all ITIL processes. Cannot invite or remove users from the organization.',
    admin: 'Full management access including user management and organization settings. Cannot manage billing or pricing.',
    owner: 'Complete access to everything including billing, pricing, and tier upgrades. Can literally do anything.',
  }
  return descriptions[role]
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    viewer: 'bg-gray-100 text-gray-800 border-gray-200',
    member: 'bg-blue-100 text-blue-800 border-blue-200',
    manager: 'bg-green-100 text-green-800 border-green-200',
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    owner: 'bg-red-100 text-red-800 border-red-200',
  }
  return colors[role]
}

// Hook for checking permissions (to be used in components)
export function usePermissions(userRole: UserRole) {
  return {
    hasPermission: (permission: Permission) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(userRole, permissions),
    canManageUser: (targetUserRole: UserRole) => canManageUser(userRole, targetUserRole),
    canChangeRoleTo: (targetRole: UserRole) => canChangeRoleTo(userRole, targetRole),
    getAvailableRoles: () => getAvailableRolesForUser(userRole),
  }
}