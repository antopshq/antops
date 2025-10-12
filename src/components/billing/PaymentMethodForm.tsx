'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CreditCard, RefreshCw, Lock, Shield, ExternalLink } from 'lucide-react'

interface PaymentMethodFormProps {
  onSuccess?: () => void
  onError: (error: string) => void
  loading?: boolean
  currency?: string
}

export function PaymentMethodForm({ onSuccess, onError, loading: externalLoading, currency = 'usd' }: PaymentMethodFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)

    try {
      // Create checkout session
      const response = await fetch('/api/integrations/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan_id: 'pro',
          currency: currency
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.checkout_url) {
          // Redirect to Stripe Checkout
          window.location.href = data.checkout_url
        } else {
          throw new Error('No checkout URL received')
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(errorMessage)
      onError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Security badges */}
      <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center space-x-1">
          <Lock className="w-4 h-4" />
          <span>SSL Encrypted</span>
        </div>
        <div className="flex items-center space-x-1">
          <Shield className="w-4 h-4" />
          <span>PCI Compliant</span>
        </div>
        <div className="flex items-center space-x-1">
          <CreditCard className="w-4 h-4" />
          <span>Stripe Secure</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2 text-blue-800 mb-2">
          <CreditCard className="w-4 h-4" />
          <span className="font-medium">Pro Plan Subscription</span>
        </div>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Monthly billing: {currency === 'eur' ? '€9.99' : '$9.99'} per month</p>
          <p>• Billed on organization anniversary date</p>
          <p>• Cancel anytime from billing settings</p>
          <p>• No setup fees or hidden charges</p>
          <p>• Secure payment processing by Stripe</p>
        </div>
      </div>

      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="text-sm text-green-700 space-y-1">
          <p className="font-medium mb-2">✨ Pro Plan Benefits:</p>
          <p>• Unlimited team members</p>
          <p>• Unlimited incidents</p>
          <p>• All integrations included</p>
          <p>• Priority support</p>
          <p>• Advanced reporting & analytics</p>
        </div>
      </div>

      <Button
        onClick={handleCheckout}
        disabled={loading || externalLoading}
        className="w-full bg-blue-600 hover:bg-blue-700"
        size="lg"
      >
        {loading || externalLoading ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Redirecting to checkout...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Subscribe to Pro Plan
            <ExternalLink className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>

      <p className="text-xs text-gray-500 text-center">
        You'll be redirected to Stripe's secure checkout page to enter your payment details.
        By subscribing, you agree to our terms of service.
      </p>
    </div>
  )
}