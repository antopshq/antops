'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Grid3X3,
  Eye,
  EyeOff
} from 'lucide-react'

interface NetworkMapControlsProps {
  onRefreshStatus: () => void
  onZoomIn?: () => void
  onZoomOut?: () => void
  onFitView?: () => void
  onToggleGrid?: () => void
  onToggleMinimap?: () => void
}

export function NetworkMapControls({ 
  onRefreshStatus,
  onZoomIn,
  onZoomOut, 
  onFitView,
  onToggleGrid,
  onToggleMinimap
}: NetworkMapControlsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [gridVisible, setGridVisible] = useState(true)
  const [minimapVisible, setMinimapVisible] = useState(true)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onRefreshStatus()
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000) // Show loading for at least 1s
    }
  }

  const handleToggleGrid = () => {
    setGridVisible(!gridVisible)
    onToggleGrid?.()
  }

  const handleToggleMinimap = () => {
    setMinimapVisible(!minimapVisible)
    onToggleMinimap?.()
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Status Refresh */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing}
        title="Refresh component statuses"
        className="hover:bg-blue-50"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>

      {/* View Controls */}
      <div className="flex items-center border border-gray-200 rounded-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          title="Zoom in"
          className="rounded-none border-r border-gray-200 hover:bg-gray-50"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          title="Zoom out"
          className="rounded-none border-r border-gray-200 hover:bg-gray-50"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitView}
          title="Fit to view"
          className="rounded-none hover:bg-gray-50"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Display Options */}
      <div className="flex items-center border border-gray-200 rounded-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleGrid}
          title={gridVisible ? 'Hide grid' : 'Show grid'}
          className={`rounded-none border-r border-gray-200 hover:bg-gray-50 ${
            gridVisible ? 'bg-blue-50 text-blue-600' : ''
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleMinimap}
          title={minimapVisible ? 'Hide minimap' : 'Show minimap'}
          className={`rounded-none hover:bg-gray-50 ${
            minimapVisible ? 'bg-blue-50 text-blue-600' : ''
          }`}
        >
          {minimapVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  )
}