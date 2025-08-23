import { Organization, BillingTier } from './types'

export interface BillingInfo {
  tier: BillingTier
  isExpired: boolean
  daysRemaining: number
  expiresAt?: string
  status: 'active' | 'expiring' | 'expired'
  displayText: string
  statusColor: string
}

export function getBillingInfo(organization: Organization): BillingInfo {
  const now = new Date()
  const tier = organization.billingTier
  
  if (tier === 'pro') {
    return {
      tier: 'pro',
      isExpired: false,
      daysRemaining: -1, // Unlimited for pro
      expiresAt: undefined,
      status: 'active',
      displayText: 'Pro Plan',
      statusColor: 'text-green-600'
    }
  }

  // Free tier logic
  if (!organization.billingExpiresAt) {
    return {
      tier: 'free',
      isExpired: true,
      daysRemaining: 0,
      expiresAt: undefined,
      status: 'expired',
      displayText: 'Free Trial Expired',
      statusColor: 'text-red-600'
    }
  }

  const expiresAt = new Date(organization.billingExpiresAt)
  const diffTime = expiresAt.getTime() - now.getTime()
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const isExpired = daysRemaining <= 0

  let status: 'active' | 'expiring' | 'expired'
  let displayText: string
  let statusColor: string

  if (isExpired) {
    status = 'expired'
    displayText = 'Free Trial Expired'
    statusColor = 'text-red-600'
  } else if (daysRemaining <= 7) {
    status = 'expiring'
    displayText = `Free Trial (${daysRemaining} days left)`
    statusColor = 'text-orange-600'
  } else {
    status = 'active'
    displayText = `Free Trial (${daysRemaining} days left)`
    statusColor = 'text-blue-600'
  }

  return {
    tier: 'free',
    isExpired,
    daysRemaining,
    expiresAt: organization.billingExpiresAt,
    status,
    displayText,
    statusColor
  }
}

export function formatExpirationDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const BILLING_PLANS = {
  free: {
    name: 'Free Trial',
    description: '2-month pilot phase',
    price: '$0',
    features: [
      'Full ITSM functionality',
      'Unlimited incidents & changes',
      'Team collaboration',
      'Basic reporting'
    ]
  },
  pro: {
    name: 'Pro Plan',
    description: 'Full production access',
    price: 'Contact Sales',
    features: [
      'All Free features',
      'Advanced analytics',
      'Priority support',
      'Custom integrations',
      'SLA management'
    ]
  }
} as const