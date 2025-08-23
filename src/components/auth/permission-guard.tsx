'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { hasPermission, hasAnyPermission, hasAllPermissions, Permission } from '@/lib/rbac'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, AlertTriangle } from 'lucide-react'

interface PermissionGuardProps {
  children: ReactNode
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean // For multiple permissions: require all (default) or any
  fallback?: ReactNode
  showError?: boolean
}

export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = true,
  fallback,
  showError = true
}: PermissionGuardProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    if (fallback) return <>{fallback}</>
    
    if (showError) {
      return (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You must be logged in to access this feature.
          </AlertDescription>
        </Alert>
      )
    }

    return null
  }

  let hasRequiredPermission = false

  if (permission) {
    hasRequiredPermission = hasPermission(user.role, permission)
  } else if (permissions && permissions.length > 0) {
    hasRequiredPermission = requireAll 
      ? hasAllPermissions(user.role, permissions)
      : hasAnyPermission(user.role, permissions)
  } else {
    // If no permissions specified, just check if user is authenticated
    hasRequiredPermission = true
  }

  if (!hasRequiredPermission) {
    if (fallback) return <>{fallback}</>
    
    if (showError) {
      return (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this feature. Contact your administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
      )
    }

    return null
  }

  return <>{children}</>
}

// Convenience components for common permission checks
export function OwnerGuard({ children, fallback, showError = true }: { 
  children: ReactNode
  fallback?: ReactNode
  showError?: boolean 
}) {
  return (
    <PermissionGuard 
      permissions={['manage_billing', 'upgrade_tier']} 
      requireAll={false}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGuard>
  )
}

export function AdminGuard({ children, fallback, showError = true }: { 
  children: ReactNode
  fallback?: ReactNode
  showError?: boolean 
}) {
  return (
    <PermissionGuard 
      permissions={['invite_users', 'remove_users']} 
      requireAll={false}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGuard>
  )
}

export function ManagerGuard({ children, fallback, showError = true }: { 
  children: ReactNode
  fallback?: ReactNode
  showError?: boolean 
}) {
  return (
    <PermissionGuard 
      permissions={['validate_incidents', 'validate_problems', 'validate_changes']} 
      requireAll={false}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGuard>
  )
}

export function MemberGuard({ children, fallback, showError = true }: { 
  children: ReactNode
  fallback?: ReactNode
  showError?: boolean 
}) {
  return (
    <PermissionGuard 
      permissions={['create_incidents', 'create_problems', 'create_changes']} 
      requireAll={false}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGuard>
  )
}

export function NotViewerGuard({ children, fallback, showError = true }: { 
  children: ReactNode
  fallback?: ReactNode
  showError?: boolean 
}) {
  return (
    <PermissionGuard 
      permissions={['create_comments']} // Viewers can't even create comments
      requireAll={false}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGuard>
  )
}

export function ProcessValidatorGuard({ children, fallback, showError = true }: { 
  children: ReactNode
  fallback?: ReactNode
  showError?: boolean 
}) {
  return (
    <PermissionGuard 
      permission="validate_changes"
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGuard>
  )
}

export function UserManagerGuard({ children, fallback, showError = true }: { 
  children: ReactNode
  fallback?: ReactNode
  showError?: boolean 
}) {
  return (
    <PermissionGuard 
      permissions={['invite_users', 'remove_users']}
      requireAll={true}
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGuard>
  )
}

export function BillingManagerGuard({ children, fallback, showError = true }: { 
  children: ReactNode
  fallback?: ReactNode
  showError?: boolean 
}) {
  return (
    <PermissionGuard 
      permission="manage_billing"
      fallback={fallback}
      showError={showError}
    >
      {children}
    </PermissionGuard>
  )
}