import { createSupabaseServerClient } from './supabase'
import { createHash } from 'crypto'

export interface CacheEntry {
  id: string
  cacheKey: string
  cacheType: string
  inputHash: string
  aiResponse: any
  confidenceScore?: number
  tokenUsage?: any
  cost?: number
  createdAt: string
  expiresAt?: string
  lastAccessed: string
  accessCount: number
}

export interface CacheOptions {
  ttlHours?: number // Time to live in hours
  skipCache?: boolean // Force bypass cache
  updateAccess?: boolean // Update access statistics
}

/**
 * AI Response Caching System
 */
export class AICache {
  
  /**
   * Generate cache key from input parameters
   */
  static generateCacheKey(type: string, params: Record<string, any>): string {
    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(params).sort()
    const normalizedParams = sortedKeys.reduce((acc, key) => {
      acc[key] = params[key]
      return acc
    }, {} as Record<string, any>)
    
    const inputString = `${type}:${JSON.stringify(normalizedParams)}`
    return createHash('sha256').update(inputString).digest('hex')
  }

  /**
   * Generate input hash for validation
   */
  static generateInputHash(data: any): string {
    const inputString = JSON.stringify(data, Object.keys(data).sort())
    return createHash('md5').update(inputString).digest('hex')
  }

  /**
   * Get cached AI response
   */
  static async get(
    organizationId: string,
    cacheType: string,
    inputParams: Record<string, any>,
    options: CacheOptions = {}
  ): Promise<CacheEntry | null> {
    if (options.skipCache) return null

    try {
      const cacheKey = this.generateCacheKey(cacheType, inputParams)
      const supabase = await createSupabaseServerClient()

      const { data, error } = await supabase
        .from('ai_cache')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('cache_type', cacheType)
        .eq('cache_key', cacheKey)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        return null
      }

      // Update access statistics if requested
      if (options.updateAccess !== false) {
        await this.updateAccess(data.id)
      }

      return {
        id: data.id,
        cacheKey: data.cache_key,
        cacheType: data.cache_type,
        inputHash: data.input_hash,
        aiResponse: data.ai_response,
        confidenceScore: data.confidence_score,
        tokenUsage: data.token_usage,
        cost: data.cost,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        lastAccessed: data.last_accessed,
        accessCount: data.access_count
      }
    } catch (error) {
      console.error('AI Cache get error:', error)
      return null
    }
  }

  /**
   * Store AI response in cache
   */
  static async set(
    organizationId: string,
    cacheType: string,
    inputParams: Record<string, any>,
    aiResponse: any,
    metadata: {
      confidenceScore?: number
      tokenUsage?: any
      cost?: number
    } = {},
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const cacheKey = this.generateCacheKey(cacheType, inputParams)
      const inputHash = this.generateInputHash(inputParams)
      const supabase = await createSupabaseServerClient()

      // Calculate expiration time
      let expiresAt: string | null = null
      if (options.ttlHours) {
        const expiration = new Date()
        expiration.setHours(expiration.getHours() + options.ttlHours)
        expiresAt = expiration.toISOString()
      }

      const { error } = await supabase
        .from('ai_cache')
        .insert({
          organization_id: organizationId,
          cache_key: cacheKey,
          cache_type: cacheType,
          input_hash: inputHash,
          ai_response: aiResponse,
          confidence_score: metadata.confidenceScore,
          token_usage: metadata.tokenUsage,
          cost: metadata.cost,
          expires_at: expiresAt
        })

      if (error) {
        console.error('AI Cache set error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('AI Cache set error:', error)
      return false
    }
  }

  /**
   * Update cache access statistics
   */
  static async updateAccess(cacheId: string): Promise<void> {
    try {
      const supabase = await createSupabaseServerClient()
      
      // Use the database function for atomic update
      await supabase.rpc('update_cache_access', { cache_id: cacheId })
    } catch (error) {
      console.error('AI Cache update access error:', error)
    }
  }

  /**
   * Invalidate cache entries by type or pattern
   */
  static async invalidate(
    organizationId: string,
    cacheType?: string,
    keyPattern?: string
  ): Promise<number> {
    try {
      const supabase = await createSupabaseServerClient()
      
      let query = supabase
        .from('ai_cache')
        .delete()
        .eq('organization_id', organizationId)

      if (cacheType) {
        query = query.eq('cache_type', cacheType)
      }

      if (keyPattern) {
        query = query.like('cache_key', `%${keyPattern}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('AI Cache invalidate error:', error)
        return 0
      }

      return Array.isArray(data) ? (data as any[]).length : 0
    } catch (error) {
      console.error('AI Cache invalidate error:', error)
      return 0
    }
  }

  /**
   * Clean expired cache entries
   */
  static async cleanExpired(organizationId?: string): Promise<number> {
    try {
      const supabase = await createSupabaseServerClient()
      
      // Use the database function for efficient cleanup
      const { data, error } = await supabase.rpc('clean_expired_ai_cache')

      if (error) {
        console.error('AI Cache clean expired error:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('AI Cache clean expired error:', error)
      return 0
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(organizationId: string): Promise<{
    totalEntries: number
    hitRate: number
    averageConfidence: number
    totalCost: number
    entriesByType: Record<string, number>
  }> {
    try {
      const supabase = await createSupabaseServerClient()
      
      const { data, error } = await supabase
        .from('ai_cache')
        .select('cache_type, confidence_score, cost, access_count')
        .eq('organization_id', organizationId)

      if (error || !data) {
        return {
          totalEntries: 0,
          hitRate: 0,
          averageConfidence: 0,
          totalCost: 0,
          entriesByType: {}
        }
      }

      const totalEntries = data.length
      const totalAccesses = data.reduce((sum, entry) => sum + entry.access_count, 0)
      const hitRate = totalEntries > 0 ? (totalAccesses - totalEntries) / totalAccesses : 0
      
      const confidenceScores = data
        .filter(entry => entry.confidence_score !== null)
        .map(entry => entry.confidence_score)
      const averageConfidence = confidenceScores.length > 0 
        ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length 
        : 0

      const totalCost = data.reduce((sum, entry) => sum + (entry.cost || 0), 0)

      const entriesByType = data.reduce((acc, entry) => {
        acc[entry.cache_type] = (acc[entry.cache_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        totalEntries,
        hitRate,
        averageConfidence,
        totalCost,
        entriesByType
      }
    } catch (error) {
      console.error('AI Cache get stats error:', error)
      return {
        totalEntries: 0,
        hitRate: 0,
        averageConfidence: 0,
        totalCost: 0,
        entriesByType: {}
      }
    }
  }

  /**
   * Check if input data has changed (cache invalidation helper)
   */
  static async isInputChanged(
    organizationId: string,
    cacheType: string,
    inputParams: Record<string, any>
  ): Promise<boolean> {
    const cached = await this.get(organizationId, cacheType, inputParams, { updateAccess: false })
    
    if (!cached) return true
    
    const currentInputHash = this.generateInputHash(inputParams)
    return cached.inputHash !== currentInputHash
  }

  /**
   * Warm cache with fresh data (background process)
   */
  static async warmCache(
    organizationId: string,
    cacheType: string,
    inputParams: Record<string, any>,
    aiGeneratorFn: () => Promise<any>,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      // Check if cache exists and is fresh
      const existing = await this.get(organizationId, cacheType, inputParams, { updateAccess: false })
      
      // Skip if cache is fresh (less than 1 hour old)
      if (existing && existing.createdAt) {
        const cacheAge = Date.now() - new Date(existing.createdAt).getTime()
        const oneHour = 60 * 60 * 1000
        if (cacheAge < oneHour) return
      }

      // Generate fresh AI response
      const aiResponse = await aiGeneratorFn()
      
      // Store in cache
      await this.set(organizationId, cacheType, inputParams, aiResponse, {}, options)
    } catch (error) {
      console.error('AI Cache warm error:', error)
    }
  }
}