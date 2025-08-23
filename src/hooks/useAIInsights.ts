import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useDebounce } from './useDebounce'

export interface AIInsight {
  componentId: string
  riskScore: number // 0-100
  confidenceLevel: number // 0-1
  riskCategory: 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[]
  predictedFailures: {
    probability: number
    impact: 'low' | 'medium' | 'high' | 'critical'
    description: string
    timeframe: string
  }[]
  dependencies: {
    componentId: string
    impactScore: number
    relationship: string
  }[]
  lastUpdated: Date
  metadata: {
    analysisType: 'real-time' | 'cached' | 'predicted'
    dataPoints: number
    [key: string]: any
  }
}

export interface AIInsightsOptions {
  enabled?: boolean
  refreshInterval?: number // ms
  cacheTimeout?: number // ms
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive'
  includeFailurePaths?: boolean
  includeDependencyAnalysis?: boolean
}

interface UseAIInsightsReturn {
  insights: AIInsight | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  isStale: boolean
}

// Cache for AI insights to avoid redundant API calls
const insightsCache = new Map<string, { data: AIInsight; timestamp: number }>()

export function useAIInsights(
  componentId: string | null, 
  options: AIInsightsOptions = {}
): UseAIInsightsReturn {
  const {
    enabled = true,
    refreshInterval = 30000, // 30 seconds
    cacheTimeout = 300000, // 5 minutes
    analysisDepth = 'basic',
    includeFailurePaths = false,
    includeDependencyAnalysis = true
  } = options

  const [insights, setInsights] = useState<AIInsight | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce componentId changes to avoid excessive API calls
  const debouncedComponentId = useDebounce(componentId, 500)

  const isStale = useMemo(() => {
    if (!insights || !lastFetch) return false
    return Date.now() - lastFetch > cacheTimeout
  }, [insights, lastFetch, cacheTimeout])

  const fetchInsights = useCallback(async () => {
    if (!debouncedComponentId || !enabled) {
      setInsights(null)
      return
    }

    // Check cache first
    const cacheKey = `${debouncedComponentId}-${analysisDepth}`
    const cached = insightsCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      setInsights(cached.data)
      setLastFetch(cached.timestamp)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/ai/component-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          componentId: debouncedComponentId,
          analysisDepth,
          includeFailurePaths,
          includeDependencyAnalysis,
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.status === 'success' && data.insights) {
        const aiInsights: AIInsight = {
          ...data.insights,
          lastUpdated: new Date(),
          metadata: {
            ...data.insights.metadata,
            analysisType: 'real-time'
          }
        }

        // Cache the result
        insightsCache.set(cacheKey, {
          data: aiInsights,
          timestamp: Date.now()
        })

        setInsights(aiInsights)
        setLastFetch(Date.now())
      } else {
        throw new Error(data.message || 'Failed to analyze component')
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        return // Request was aborted, ignore
      }
      
      console.error('AI Insights error:', err)
      setError(err instanceof Error ? err.message : 'Analysis failed')
      
      // Try to use cached data as fallback
      const cached = insightsCache.get(cacheKey)
      if (cached) {
        setInsights({
          ...cached.data,
          metadata: {
            ...cached.data.metadata,
            analysisType: 'cached'
          }
        })
      }
    } finally {
      setLoading(false)
    }
  }, [debouncedComponentId, enabled, analysisDepth, includeFailurePaths, includeDependencyAnalysis, cacheTimeout])

  // Auto-refresh with interval
  useEffect(() => {
    if (!enabled || !debouncedComponentId) return

    // Initial fetch
    fetchInsights()

    // Set up refresh interval
    if (refreshInterval > 0) {
      timeoutRef.current = setInterval(fetchInsights, refreshInterval)
    }

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchInsights, refreshInterval, enabled, debouncedComponentId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current)
      }
    }
  }, [])

  return {
    insights,
    loading,
    error,
    refetch: fetchInsights,
    isStale
  }
}