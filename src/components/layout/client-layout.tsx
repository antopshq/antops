'use client'

import { Sidebar } from './sidebar'
import { FloatingNotificationButton } from './floating-notification-button'
import { AIAssistant } from '../ai/ai-assistant'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
}

interface ClientLayoutProps {
  children: React.ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated by trying to fetch user info
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/user')
        if (res.ok) {
          const userData = await res.json()
          setUser(userData.user)
        } else {
          router.push('/auth/signin')
          return
        }
      } catch (error) {
        router.push('/auth/signin')
        return
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to signin
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      <FloatingNotificationButton />
      <AIAssistant />
    </div>
  )
}