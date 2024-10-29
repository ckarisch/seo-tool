// app/get-premium/page.tsx
'use client'

import React, { useCallback, useState } from 'react'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js'
import { Crown, ExternalLink, Receipt, CreditCard } from "lucide-react"
import Link from "next/link"
import styles from './page.module.scss'
import { Alert, AlertDescription, AlertTitle } from '@/components/layout/alert/Alert'
import Section from "@/components/layout/section"
import Background from "@/components/layout/background"

interface CheckoutResponse {
  clientSecret?: string;
  hasPremiumAccess?: boolean;
  accessType?: 'subscription' | 'lifetime' | null;
  subscriptionType?: string | null;
  error?: string;
}

const stripePromise: Promise<Stripe | null> = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
)

export default function GetPremiumPage() {
  const [premiumStatus, setPremiumStatus] = useState<{
    hasPremiumAccess: boolean;
    accessType: 'subscription' | 'lifetime' | null;
    subscriptionType: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      if (data.error) {
        setError(data.error);
        throw new Error(data.error);
      }

      if (data.hasPremiumAccess) {
        setPremiumStatus({
          hasPremiumAccess: true,
          accessType: data.accessType || null,
          subscriptionType: data.subscriptionType || null
        });
        throw new Error('Already has premium access');
      }

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

  if (error) {
    return (
      <main>
        <Background backgroundImage="" backgroundStyle={'mainColor'}>
          <Section>
            <div className={styles.heroContainer}>
              <h1 className={styles.title}>Premium Access</h1>
              <p className={styles.description}>
                Oops! Something went wrong while processing your request.
              </p>
            </div>
          </Section>
        </Background>
        <Section>
          <div className={styles.errorContainer}>
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </Section>
      </main>
    );
  }

  if (premiumStatus?.hasPremiumAccess) {
    return (
      <main>
        <Background backgroundImage="" backgroundStyle={'mainColor'}>
          <Section>
            <div className={styles.heroContainer}>
              <h1 className={styles.title}>Premium Access</h1>
              <p className={styles.description}>
                Manage your subscription and view your billing history
              </p>
            </div>
          </Section>
        </Background>

        <Section>
          <div className={styles.premiumContainer}>
            <div className={styles.statusCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
                  <Crown className={styles.icon} />
                  <span className={styles.statusActive}>Active</span>
                </div>
                <h3 className={styles.cardTitle}>
                  {premiumStatus.subscriptionType || 'Premium'} Access
                </h3>
                <p className={styles.cardDescription}>
                  {premiumStatus.accessType === 'lifetime' 
                    ? `You have lifetime premium access to all features.`
                    : `You have an active subscription with access to all features.`}
                </p>
              </div>

              <div className={styles.divider} />

              <div className={styles.cardActions}>
                <Link href="/app/subscriptions" className={styles.actionButton}>
                  <CreditCard size={18} />
                  Manage Subscription
                  <ExternalLink size={16} />
                </Link>
                <Link href="/app/invoices" className={styles.actionButton}>
                  <Receipt size={18} />
                  View Invoices
                  <ExternalLink size={16} />
                </Link>
              </div>
            </div>
          </div>
        </Section>
      </main>
    );
  }

  return (
    <main>
      <Background backgroundImage="" backgroundStyle={'mainColor'}>
        <Section>
          <div className={styles.heroContainer}>
            <h1 className={styles.title}>Get Premium Access</h1>
            <p className={styles.description}>
              Unlock all features and take your experience to the next level
            </p>
          </div>
        </Section>
      </Background>

      <Section>
        <div className={styles.checkoutContainer}>
          <EmbeddedCheckoutProvider 
            stripe={stripePromise}
            options={options}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </Section>
    </main>
  );
}