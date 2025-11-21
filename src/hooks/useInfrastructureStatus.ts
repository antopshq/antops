'use client'

import { useState, useEffect, useCallback } from 'react'

interface StatusMetrics {
  nodeId: string
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  metrics: {
    cpu?: number
    memory?: number
    disk?: number
    network?: number
  }
  lastUpdated: string
}

interface UseInfrastructureStatusProps {
  nodes: Array<{ id: string; data: { nodeType: string } }>
  refreshInterval?: number // in milliseconds
  enabled?: boolean
}

export function useInfrastructureStatus({
  nodes,
  refreshInterval = 30000, // Default: 30 seconds
  enabled = true
}: UseInfrastructureStatusProps) {
  const [statusData, setStatusData] = useState<Map<string, StatusMetrics>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Create a stable reference for nodes to prevent unnecessary re-renders
  const nodeSignature = nodes.map(n => `${n.id}:${n.data.nodeType}`).sort().join('|')

  const fetchStatus = useCallback(async () => {
    if (!enabled || nodes.length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      const nodeIds = nodes.map(node => node.id).join(',')
      const nodeTypes = nodes.map(node => node.data.nodeType).join(',')
      
      const response = await fetch(`/api/infrastructure/status?nodeIds=${nodeIds}&nodeTypes=${nodeTypes}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        const statusMap = new Map<string, StatusMetrics>()
        data.data.forEach((status: StatusMetrics) => {
          statusMap.set(status.nodeId, status)
        })
        setStatusData(statusMap)
        setLastUpdated(new Date())
      } else {
        throw new Error(data.message || 'Failed to fetch status data')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching infrastructure status:', err)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, nodeSignature])

  // Initial fetch
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Set up periodic refresh
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return

    const interval = setInterval(fetchStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchStatus, refreshInterval, enabled])

  const manualRefresh = useCallback(() => {
    fetchStatus()
  }, [fetchStatus])

  const updateNodeStatus = useCallback(async (nodeId: string, status: 'healthy' | 'warning' | 'critical' | 'unknown') => {
    try {
      const response = await fetch('/api/infrastructure/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId,
          status
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Update local state immediately for better UX
      setStatusData(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(nodeId)
        if (existing) {
          newMap.set(nodeId, {
            ...existing,
            status,
            lastUpdated: new Date().toISOString()
          })
        }
        return newMap
      })

      setLastUpdated(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status'
      setError(errorMessage)
      console.error('Error updating node status:', err)
      throw err // Re-throw so caller can handle
    }
  }, [])

  const getNodeStatus = useCallback((nodeId: string): StatusMetrics | null => {
    return statusData.get(nodeId) || null
  }, [statusData])

  const getOverallHealth = useCallback(() => {
    const statuses = Array.from(statusData.values())
    const total = statuses.length
    
    if (total === 0) return { healthy: 0, warning: 0, critical: 0, unknown: 0, total: 0 }

    const counts = statuses.reduce((acc, status) => {
      acc[status.status]++
      return acc
    }, { healthy: 0, warning: 0, critical: 0, unknown: 0 })

    return { ...counts, total }
  }, [statusData])

  return {
    statusData,
    isLoading,
    error,
    lastUpdated,
    manualRefresh,
    updateNodeStatus,
    getNodeStatus,
    getOverallHealth
  }
}