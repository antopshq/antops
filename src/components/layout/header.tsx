'use client'

import { User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { NotificationBell } from './notification-bell'

interface HeaderProps {
  user?: {
    name: string
    email: string
  }
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      router.push('/auth/signin')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header className="border-b border-gray-200 h-16" style={{backgroundColor: '#fa8c16'}}>
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-medium text-black">
            Welcome back, {user?.name || 'User'}
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <NotificationBell />
          
          <div className="flex items-center space-x-2 text-sm text-black">
            <User className="w-4 h-4" />
            <span>{user?.email}</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-black hover:text-gray-800 hover:bg-orange-600"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  )
}