import { InfrastructureView } from '@/components/InfrastructureView'
import { ClientLayout } from '@/components/layout/client-layout'
import { HelpCircle } from 'lucide-react'

export default async function InfraPage({ searchParams }: { searchParams: Promise<{ component?: string }> }) {
  const params = await searchParams
  return (
    <ClientLayout>
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">Infrastructure View</h1>
                  <div className="relative group">
                    <HelpCircle className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                    <div className="absolute left-1/2 transform -translate-x-1/2 top-8 w-80 bg-gray-900 text-white text-sm rounded-lg p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 shadow-xl">
                      🔒 Use the lock button to lock your components and nodes within the space required - it is very handy!
                    </div>
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  Design and manage your infrastructure architecture
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <InfrastructureView 
            className="w-full h-full"
            highlightComponentId={params.component}
          />
        </div>
      </div>
    </ClientLayout>
  )
}