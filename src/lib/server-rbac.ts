/**
 * Server-side RBAC utilities for API routes
 */
import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { hasPermission, Permission } from '@/lib/rbac'
import { UserRole } from '@/lib/types'

export interface AuthenticatedUser {
  id: string
  email: string
  organizationId: string
  role: UserRole
  name?: string
}

/**
 * Check if user has required permission and return user data
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!hasPermission(user.role, permission)) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions',
          required: permission,
          userRole: user.role
        },
        { status: 403 }
      )
    }

    return { user }
  } catch (error) {
    console.error('Permission check failed:', error)
    return NextResponse.json(
      { error: 'Permission check failed' },
      { status: 500 }
    )
  }
}

/**
 * Check if user has any of the required permissions
 */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: Permission[]
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const hasAnyPermission = permissions.some(permission => 
      hasPermission(user.role, permission)
    )

    if (!hasAnyPermission) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions',
          required: permissions,
          userRole: user.role
        },
        { status: 403 }
      )
    }

    return { user }
  } catch (error) {
    console.error('Permission check failed:', error)
    return NextResponse.json(
      { error: 'Permission check failed' },
      { status: 500 }
    )
  }
}

/**
 * Check if user has all required permissions
 */
export async function requireAllPermissions(
  request: NextRequest,
  permissions: Permission[]
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const hasAllPermissions = permissions.every(permission => 
      hasPermission(user.role, permission)
    )

    if (!hasAllPermissions) {
      const missingPermissions = permissions.filter(permission => 
        !hasPermission(user.role, permission)
      )
      
      return NextResponse.json(
        { 
          error: 'Insufficient permissions',
          required: permissions,
          missing: missingPermissions,
          userRole: user.role
        },
        { status: 403 }
      )
    }

    return { user }
  } catch (error) {
    console.error('Permission check failed:', error)
    return NextResponse.json(
      { error: 'Permission check failed' },
      { status: 500 }
    )
  }
}

/**
 * Require specific role (or higher in hierarchy)
 */
export async function requireRole(
  request: NextRequest,
  minimumRole: UserRole
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const roleHierarchy = {
      viewer: 1,
      member: 2,
      manager: 3,
      admin: 4,
      owner: 5,
    }

    if (roleHierarchy[user.role] < roleHierarchy[minimumRole]) {
      return NextResponse.json(
        { 
          error: 'Insufficient role level',
          required: minimumRole,
          userRole: user.role
        },
        { status: 403 }
      )
    }

    return { user }
  } catch (error) {
    console.error('Role check failed:', error)
    return NextResponse.json(
      { error: 'Role check failed' },
      { status: 500 }
    )
  }
}

/**
 * Check if user is owner (for billing and pricing operations)
 */
export async function requireOwner(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  return requireRole(request, 'owner')
}

/**
 * Check if user is admin or above (for user management)
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  return requireRole(request, 'admin')
}

/**
 * Check if user is manager or above (for process validation)
 */
export async function requireManager(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  return requireRole(request, 'manager')
}

/**
 * Check if user is member or above (for creating items)
 */
export async function requireMember(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  return requireRole(request, 'member')
}

/**
 * Just check authentication (all roles including viewer)
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  try {
    const user = await getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return { user }
  } catch (error) {
    console.error('Authentication check failed:', error)
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    )
  }
}

/**
 * Utility to check if response is an error (for type narrowing)
 */
export function isErrorResponse(
  result: { user: AuthenticatedUser } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}

/**
 * Example usage in API routes:
 * 
 * export async function POST(request: NextRequest) {
 *   const authResult = await requirePermission(request, 'create_incidents')
 *   if (isErrorResponse(authResult)) {
 *     return authResult
 *   }
 *   
 *   const { user } = authResult
 *   // ... continue with API logic
 * }
 */