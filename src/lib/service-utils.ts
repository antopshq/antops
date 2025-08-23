import { useState, useEffect } from 'react'

interface ServiceInfo {
  id: string
  label: string
  environment: string
}

// Cache for service information to avoid repeated API calls
const serviceCache = new Map<string, ServiceInfo[]>()

export async function getServiceLabels(serviceIds: string[]): Promise<ServiceInfo[]> {
  if (serviceIds.length === 0) return []

  // Filter out empty/invalid IDs
  const validServiceIds = serviceIds.filter(serviceId => serviceId && serviceId.trim() !== '')
  if (validServiceIds.length === 0) return []

  // Check cache first
  const cacheKey = validServiceIds.sort().join(',')
  if (serviceCache.has(cacheKey)) {
    return serviceCache.get(cacheKey)!
  }

  try {
    // Fetch service information from the simple labels API
    const response = await fetch(`/api/services/labels?ids=${validServiceIds.join(',')}`)
    if (!response.ok) {
      throw new Error('Failed to fetch service information')
    }

    const data = await response.json()
    const services = data.services || []

    // Ensure all requested services are included (with fallbacks if not found)
    const serviceInfo: ServiceInfo[] = validServiceIds.map(serviceId => {
      const foundService = services.find((s: any) => s.id === serviceId)
      if (foundService) {
        return {
          id: foundService.id,
          label: foundService.label || serviceId,
          environment: foundService.environment || 'Unknown Environment'
        }
      }
      // Fallback for services not found
      return {
        id: serviceId,
        label: serviceId,
        environment: 'Unknown Environment'
      }
    })

    // Cache the result
    serviceCache.set(cacheKey, serviceInfo)

    return serviceInfo
  } catch (error) {
    console.error('Error fetching service labels:', error)
    // Fallback: return service IDs as labels with default environment
    return validServiceIds.map(serviceId => ({
      id: serviceId,
      label: serviceId,
      environment: 'Unknown Environment'
    }))
  }
}

export function formatServiceDisplay(serviceInfo: ServiceInfo): string {
  const label = serviceInfo.label || serviceInfo.id || 'Unknown Service'
  const environment = serviceInfo.environment || 'Unknown Environment'
  return `${label} - ${environment}`
}

export function formatServicesArray(serviceInfos: ServiceInfo[]): string[] {
  // Remove duplicates and filter out invalid entries
  const validServices = serviceInfos.filter(service => 
    service && service.id && (service.label || service.id)
  )
  
  const formattedServices = validServices.map(formatServiceDisplay)
  
  // Remove duplicates from the formatted array
  return Array.from(new Set(formattedServices))
}

// For client-side usage with React hook
export function useServiceLabels(serviceIds: string[]) {
  const [services, setServices] = useState<ServiceInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (serviceIds.length === 0) {
      setServices([])
      setLoading(false)
      return
    }

    let isMounted = true
    
    const fetchServices = async () => {
      try {
        setLoading(true)
        const serviceInfo = await getServiceLabels(serviceIds)
        if (isMounted) {
          setServices(serviceInfo)
        }
      } catch (error) {
        console.error('Error in useServiceLabels:', error)
        if (isMounted) {
          setServices([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchServices()

    return () => {
      isMounted = false
    }
  }, [JSON.stringify(serviceIds)]) // Use JSON.stringify for deep comparison

  return { services, loading, formattedServices: formatServicesArray(services) }
}

