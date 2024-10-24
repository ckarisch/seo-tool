// app/api/checkout/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe with proper typing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-09-30.acacia', // Specify the Stripe API version
})

// Type for the successful response
interface CheckoutResponse {
  clientSecret: string
}

// Type for the error response
interface ErrorResponse {
  error: string
}

// Validate environment variables
function validateEnv(): string {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined')
  }
  if (!process.env.NEXT_PUBLIC_FE_DOMAIN) {
    throw new Error('NEXT_PUBLIC_FE_DOMAIN is not defined')
  }
  if (!process.env.PREMIUM_PRICE_ID) {
    throw new Error('PREMIUM_PRICE_ID is not defined')
  }
  return process.env.NEXT_PUBLIC_FE_DOMAIN
}

export async function POST(): Promise<NextResponse<CheckoutResponse | ErrorResponse>> {
  try {
    // Validate environment variables before proceeding
    const baseUrl = validateEnv()

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: [
        {
          price: process.env.PREMIUM_PRICE_ID, // You might want to make this dynamic
          quantity: 1,
        },
      ],
      mode: 'subscription',
      return_url: `${baseUrl}/app/get-premium/return?session_id={CHECKOUT_SESSION_ID}`,
      automatic_tax: { enabled: true },
    })

    if (!session.client_secret) {
      throw new Error('Failed to create checkout session')
    }

    return NextResponse.json({ clientSecret: session.client_secret })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An unknown error occurred' },
      { status: err instanceof Stripe.errors.StripeError ? err.statusCode : 500 }
    )
  }
}