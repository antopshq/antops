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
    starter: {
      name: 'Starter Plan',
      description: 'Great for growing teams',
      features: ['Up to 25 team members', 'Unlimited incidents', '10GB storage', 'All integrations'],
    },
    professional: {
      name: 'Professional Plan', 
      description: 'Perfect for established teams',
      features: ['Unlimited team members', 'Unlimited incidents', '100GB storage', 'SSO authentication'],
    },
    enterprise: {
      name: 'Enterprise Plan',
      description: 'For large organizations',
      features: ['Unlimited everything', 'Dedicated support', 'Custom workflows', 'SLA guarantees'],
    }
  },
  prices: {
    starter_monthly: {
      amount: 2900, // $29.00 in cents
      currency: 'usd',
      interval: 'month',
      product: 'starter'
    },
    starter_yearly: {
      amount: 29000, // $290.00 in cents (2 months free)
      currency: 'usd', 
      interval: 'year',
      product: 'starter'
    },
    professional_monthly: {
      amount: 9900, // $99.00 in cents
      currency: 'usd',
      interval: 'month',
      product: 'professional'
    },
    professional_yearly: {
      amount: 99000, // $990.00 in cents (2 months free)
      currency: 'usd',
      interval: 'year', 
      product: 'professional'
    },
    enterprise_monthly: {
      amount: 29900, // $299.00 in cents
      currency: 'usd',
      interval: 'month',
      product: 'enterprise'
    },
    enterprise_yearly: {
      amount: 299000, // $2990.00 in cents (2 months free)
      currency: 'usd',
      interval: 'year',
      product: 'enterprise'
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
    if (key.includes('starter')) return 'starter'
    if (key.includes('professional')) return 'professional'  
    if (key.includes('enterprise')) return 'enterprise'
  }
  return null
}