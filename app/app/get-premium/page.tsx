// app/checkout/page.tsx
'use client'

import React, { useCallback } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js'
import styles from './page.module.css'

interface CheckoutResponse {
  clientSecret: string
}

const stripePromise: Promise<Stripe | null> = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
)

export default function CheckoutPage() {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('/api/payment/premium/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const data: CheckoutResponse = await response.json()

      if (!data.clientSecret) {
        throw new Error('No client secret received')
      }

      return data.clientSecret
    } catch (error) {
      console.error('Error fetching client secret:', error)
      throw error
    }
  }, [])

  const options = {
    fetchClientSecret,
  }

  return (
    <div className={styles.container}>
      <EmbeddedCheckoutProvider 
        stripe={stripePromise}
        options={options}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  )
}