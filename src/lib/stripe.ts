import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
})

// Stripe product and price configuration
export const STRIPE_CONFIG = {
  products: {
    pro: {
      name: 'Pro Plan',
      description: 'Professional features for growing teams',
      features: ['Unlimited team members', 'Unlimited incidents', 'All integrations', 'Priority support'],
    }
  },
  prices: {
    pro_monthly_usd: {
      amount: 999, // $9.99 in cents
      currency: 'usd',
      interval: 'month',
      product: 'pro'
    },
    pro_monthly_eur: {
      amount: 999, // €9.99 in cents
      currency: 'eur',
      interval: 'month',
      product: 'pro'
    }
  }
}

// Helper function to format price
export function formatPrice(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount / 100)
}

// Helper function to get plan from price ID
export function getPlanFromPriceId(priceId: string): string | null {
  for (const [key, price] of Object.entries(STRIPE_CONFIG.prices)) {
    if (key.includes('pro')) return 'pro'
  }
  return null
}

// Helper function to detect user's currency preference
export function getUserCurrency(): 'usd' | 'eur' {
  // Check browser language/locale to determine currency preference
  const locale = typeof window !== 'undefined' ? navigator.language : 'en-US'
  
  // European locales get EUR, others get USD
  const europeanLocales = ['de', 'fr', 'es', 'it', 'nl', 'pt', 'pl', 'sv', 'no', 'dk', 'fi']
  const isEuropean = europeanLocales.some(lang => locale.toLowerCase().startsWith(lang))
  
  return isEuropean || locale.toLowerCase().startsWith('en-gb') ? 'eur' : 'usd'
}

// Helper function to calculate billing cycle anchor based on organization creation date
export function calculateBillingCycleAnchor(orgCreatedAt: string): number {
  const orgCreationDate = new Date(orgCreatedAt)
  const now = new Date()
  
  // Get the day of month when org was created
  const billingDay = orgCreationDate.getDate()
  
  // Calculate next billing date
  const nextBillingDate = new Date(now.getFullYear(), now.getMonth(), billingDay)
  
  // If the billing day has already passed this month, move to next month
  if (nextBillingDate <= now) {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
  }
  
  // Handle edge case where billing day doesn't exist in target month (e.g., Jan 31 -> Feb 31)
  if (nextBillingDate.getDate() !== billingDay) {
    // If the day doesn't exist, use the last day of the month
    nextBillingDate.setDate(0) // Sets to last day of previous month
  }
  
  return Math.floor(nextBillingDate.getTime() / 1000)
}

// Helper function to check if organization's free month has expired
export function hasFreePeriodExpired(orgCreatedAt: string): boolean {
  const orgCreationDate = new Date(orgCreatedAt)
  const now = new Date()
  
  // Add one month to the creation date
  const freeMonthEnd = new Date(orgCreationDate)
  freeMonthEnd.setMonth(freeMonthEnd.getMonth() + 1)
  
  return now >= freeMonthEnd
}

// Helper function to get next billing date for display
export function getNextBillingDate(orgCreatedAt: string): Date {
  return new Date(calculateBillingCycleAnchor(orgCreatedAt) * 1000)
}