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
                      <div className="font-semibold mb-2">🏗️ How to Build Infrastructure Diagrams</div>
                      <ul className="space-y-1.5 text-xs">
                        <li>• <strong>Add Components:</strong> Click component buttons above to add servers, databases, etc.</li>
                        <li>• <strong>Create Zones:</strong> Use zone dropdown to add VPCs, subnets, security groups</li>
                        <li>• <strong>Drag into Zones:</strong> Drag components into zones to organize them</li>
                        <li>• <strong>Connect Components:</strong> Drag from green dots (source) to blue dots (target)</li>
                        <li>• <strong>Lock Components:</strong> Use lock button to prevent accidental moves</li>
                        <li>• <strong>Edit Names:</strong> Click any component to open details panel</li>
                        <li>• <strong>Link to ITSM:</strong> Connect components to incidents, problems, changes</li>
                      </ul>
                      <div className="mt-2 pt-2 border-t border-gray-700 text-xs opacity-75">
                        💡 Tip: Start with zones, then add components, finally create connections
                      </div>
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