'use client'

import { User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

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
    <header className="border-b border-gray-200 h-16 bg-white">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-medium text-gray-800">
            Welcome back, {user?.name || 'User'}
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{user?.email}</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  )
}