'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AlertTriangle, Settings, BarChart3, Users, User, LogOut, AlertCircle, ChevronLeft, ChevronRight, Network } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { hasPermission, PERMISSIONS } from '@/lib/rbac'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    permission: PERMISSIONS.VIEW_ANALYTICS
  },
  {
    name: 'Infrastructure',
    href: '/infra',
    icon: Network,
    permission: PERMISSIONS.VIEW_INCIDENTS // Using existing permission for now
  },
  {
    name: 'Incidents',
    href: '/incidents',
    icon: AlertTriangle,
    permission: PERMISSIONS.VIEW_INCIDENTS
  },
  {
    name: 'Problems',
    href: '/problems',
    icon: AlertCircle,
    permission: PERMISSIONS.VIEW_PROBLEMS
  },
  {
    name: 'Changes',
    href: '/changes',
    icon: Settings,
    permission: PERMISSIONS.VIEW_CHANGES
  },
  {
    name: 'Team',
    href: '/team',
    icon: Users,
    permission: PERMISSIONS.VIEW_USERS
  },
]

interface SidebarProps {
  user?: {
    id: string
    name: string
    email: string
  }
}

export function Sidebar({ user: propUser }: SidebarProps) {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // Use authenticated user or fallback to prop user
  const currentUser = user || propUser

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      router.push('/auth/signin')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <div className={`flex flex-col ${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 min-h-screen transition-all duration-300`}>
      {/* Logo section at top */}
      <div className="flex flex-col items-center p-4 border-b border-gray-200">
        <img 
          src="/ANTOPS.png" 
          alt="ANTOPS Logo" 
          className={isCollapsed ? "h-8 w-auto mb-2" : "h-32 w-auto mb-2"}
          onError={(e) => {
            // Fallback if image doesn't exist
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextElementSibling.style.display = 'block'
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-100"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
        <div className="text-xs text-gray-500 hidden">Logo space</div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          
          // Check if user has permission for this navigation item
          if (item.permission && user && !hasPermission(user.role, item.permission)) {
            return null
          }
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isCollapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={`${isCollapsed ? 'w-12 h-12' : 'w-5 h-5'} ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && item.name}
            </Link>
          )
        })}
      </nav>
      
      {/* User details at bottom */}
      <div className="p-4 border-t border-gray-200">
        {currentUser && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg">
              <User className="w-4 h-4 text-gray-600" />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {currentUser.fullName || currentUser.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {currentUser.email}
                  </div>
                  {user && (
                    <div className="text-xs text-gray-400 truncate">
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {!isCollapsed && 'Sign out'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}