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
    pro_weekly_usd: {
      amount: 999, // $9.99 in cents
      currency: 'usd',
      interval: 'week',
      product: 'pro'
    },
    pro_weekly_eur: {
      amount: 999, // €9.99 in cents
      currency: 'eur',
      interval: 'week',
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