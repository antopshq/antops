import { useState, useEffect } from 'react'
import { UserRole } from '@/lib/types'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  organizationId: string
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          // User is not authenticated
          setUser(null)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return {
    user,
    loading,
    isAuthenticated: !!user
  }
}