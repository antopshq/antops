import { getUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from './sidebar'
import { FloatingNotificationButton } from './floating-notification-button'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/signin')
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
    </div>
  )
}